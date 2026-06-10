# FastF1 service — all session loading, caching, and data extraction logic lives here.
# TODO: This file is 300+ lines. Consider splitting into session_cache.py and extractors.py.

import logging
import os   # TODO: Remove this as this can be automated into python using the lru_cache which is alreayd imported below
import threading    # Allows multiple threads to run concurrently within a single process
from datetime import UTC, datetime # Check the current time and date to match the API so data is available at the right time globally

from functools import lru_cache  # TODO: Use this instead of the manual caching logic with _session_cache and _session_envents

import fastf1
import pandas as pd

logger = logging.getLogger(__name__)

# Store raw F1 data on disk so repeat request don't re-download from the API 
CACHE_DIR = os.environ.get("FASTF1_CACHE_DIR", "/tmp/fastf1_cache")
os.makedirs(CACHE_DIR, exist_ok=True)
fastf1.Cache.enable_cache(CACHE_DIR)

# TODO: Remove this as we automate this caching process using the lru_cache decorator
_session_cache: dict = {}
_session_events: dict = {}  # session_key -> threading.Event while loading
_lock = threading.Lock()

TYPE_MAP = {
    "Race": "R",
    "Qualifying": "Q",
    "Sprint": "S",
    "Practice 1": "FP1",
    "Practice 2": "FP2",
    "Practice 3": "FP3",
    "Sprint Qualifying": "SQ",
}


def _parse_key(session_key: str) -> tuple:
    parts = session_key.split("_")
    return int(parts[0]), int(parts[1]), "_".join(parts[2:])


def _load_session(session_key: str) -> fastf1.core.Session:
    # Fast path: already cached
    with _lock:
        if session_key in _session_cache:
            return _session_cache[session_key]
        # Another thread is already loading this session — get its event to wait on
        if session_key in _session_events:
            event = _session_events[session_key]
            loader = False
        else:
            # This thread will load it
            event = threading.Event()
            _session_events[session_key] = event
            loader = True

    if not loader:
        # Wait for the loading thread to finish
        event.wait()
        with _lock:
            return _session_cache[session_key]

    # This thread is responsible for loading
    try:
        year, round_num, session_type = _parse_key(session_key)
        session = fastf1.get_session(year, round_num, session_type)
        session.load(telemetry=True, laps=True, weather=False, messages=False)
        with _lock:
            if len(_session_cache) >= 5:
                evicted = next(iter(_session_cache))
                del _session_cache[evicted]
                logger.info(f"Evicted session {evicted} from cache")
            _session_cache[session_key] = session
        logger.info(f"Loaded and cached session {session_key}")
        return session
    finally:
        # Always signal waiters, even on error
        with _lock:
            if session_key in _session_events:
                _session_events[session_key].set()
                del _session_events[session_key]


# First method to be ran in the file 
def get_sessions(year: int, session_type: str = "Race") -> list | None:
    try:
        # fastf1.get_event_schedule(year) returns a pandas DataFrame — one row per race weekend.
        #
        # Identity columns:
        #   RoundNumber       — position in the season (1, 2, 3…); 0 = pre-season testing
        #   Country           — e.g. "Bahrain", "Australia"
        #   Location          — city name e.g. "Sakhir", "Melbourne"
        #   OfficialEventName — full name e.g. "Formula 1 Gulf Air Bahrain Grand Prix"
        #   EventName         — short name e.g. "Bahrain Grand Prix"
        #   EventDate         — date of the last session (usually race day)
        #   EventFormat       — "conventional", "sprint_qualifying", etc.
        #
        # Session slots (up to 5 per weekend):
        #   Session1 / Session1Date / Session1DateUtc  — e.g. "Practice 1"
        #   Session2 / Session2Date / Session2DateUtc  — e.g. "Practice 2"
        #   Session3 / Session3Date / Session3DateUtc  — e.g. "Practice 3"
        #   Session4 / Session4Date / Session4DateUtc  — e.g. "Qualifying"
        #   Session5 / Session5Date / Session5DateUtc  — e.g. "Race"
        #
        #   F1ApiSupport — True/False, whether F1's own API has data for this event
        schedule = fastf1.get_event_schedule(year)
        schedule = schedule[schedule["RoundNumber"] > 0]        # Panda filter values strictly greater than 0
        now = pd.Timestamp(datetime.now(UTC))                   # Time in UTC Standard Time Zone 
        results = []
        for _, event in schedule.iterrows():                    # Panda function to loop row by row where _ is a number 0-n and event is the actual row data
            for col in ["Session1", "Session2", "Session3", "Session4", "Session5"]:
                raw_type = event.get(col, "")
                if not raw_type or pd.isna(raw_type):                                           # Check: Does this session slot have anything in it
                    continue
                if raw_type not in TYPE_MAP or raw_type != session_type:                        # Check: Is this the session type we asked for ('race', 'qualifying', etc.)
                    continue
                date_col = f"{col}Date"
                session_date = event.get(date_col)
                if session_date is not None and not pd.isna(session_date):                      # Check: Did this session already happen? And is it complete with a date?
                    ts = pd.Timestamp(session_date)
                    if ts.tzinfo is None:
                        ts = ts.tz_localize("UTC")
                    if ts > now:
                        continue
                type_code = TYPE_MAP[raw_type]
                results.append(
                    {
                        "session_key": f"{year}_{int(event['RoundNumber'])}_{type_code}",
                        "country_name": event["Country"],
                        "location": event["Location"],
                        "event_name": event["EventName"],
                        "round_number": int(event["RoundNumber"]),
                        "session_type": raw_type,
                        "session_type_code": type_code,
                    }
                )
        return results
    except Exception as e:
        logger.error(f"Error fetching sessions for {year}: {e}")
        return None


def get_drivers(session_key: str) -> list | None:
    try:
        session = _load_session(session_key)
        results = session.results
        if results is None or results.empty:
            return []
        return [
            {
                "driver_number": int(row["DriverNumber"]),
                "full_name": row["FullName"],
                "team_name": row["TeamName"],
                "name_acronym": row.get("Abbreviation", ""),
            }
            for _, row in results.iterrows()
        ]
    except Exception as e:
        logger.error(f"Error fetching drivers for {session_key}: {e}")
        return None


def get_location(session_key: str, driver_number: int) -> list | None:
    """Return full-race position data for a driver, downsampled."""
    try:
        session = _load_session(session_key)
        drv_str = str(driver_number)

        if drv_str not in session.pos_data:
            logger.warning(f"No pos_data for driver {driver_number} in {session_key}")
            return []

        pos = session.pos_data[drv_str]
        pos = pos[["X", "Y", "Date"]].dropna(subset=["X", "Y"]).iloc[::3].reset_index(drop=True)
        return [
            {"x": float(r.X), "y": float(r.Y), "date": r.Date.isoformat() if pd.notna(r.Date) else None}
            for r in pos.itertuples(index=False)
        ]
    except Exception as e:
        logger.error(f"Error fetching location for {session_key} driver {driver_number}: {e}")
        return None


def get_telemetry(session_key: str, driver_number: int) -> list | None:
    try:
        session = _load_session(session_key)
        car_data = session.car_data
        key = str(driver_number)
        if key not in car_data:
            logger.warning(f"No car_data for driver {driver_number} in {session_key}")
            return []
        df = car_data[key].iloc[::5][["Date", "Speed", "Throttle", "Brake", "nGear", "RPM", "DRS"]].copy()
        df["date"] = df["Date"].apply(lambda d: d.isoformat() if pd.notna(d) else None)
        df["brake"] = df["Brake"].fillna(False).astype(bool).astype(int) * 100
        df = df.rename(
            columns={"Speed": "speed", "Throttle": "throttle", "nGear": "n_gear", "RPM": "rpm", "DRS": "drs"}
        )
        df[["speed", "throttle", "n_gear", "rpm", "drs"]] = (
            df[["speed", "throttle", "n_gear", "rpm", "drs"]].fillna(0).astype(int)
        )
        return df[["date", "speed", "throttle", "brake", "n_gear", "rpm", "drs"]].to_dict("records")
    except Exception as e:
        logger.error(f"Error fetching telemetry for {session_key} driver {driver_number}: {e}")
        return None


def get_positions(session_key: str) -> list | None:
    try:
        session = _load_session(session_key)
        laps = session.laps
        if laps is None or laps.empty:
            return []
        df = (
            laps[["DriverNumber", "Position", "LapStartDate", "LapNumber"]]
            .dropna(subset=["Position", "LapStartDate"])
            .copy()
        )
        df = df.sort_values("LapStartDate")
        df["driver_number"] = df["DriverNumber"].astype(int)
        df["position"] = df["Position"].astype(int)
        df["lap_number"] = df["LapNumber"].astype(int)
        df["date"] = df["LapStartDate"].apply(lambda d: d.isoformat() if pd.notna(d) else None)
        return df[["driver_number", "position", "lap_number", "date"]].to_dict("records")
    except Exception as e:
        logger.error(f"Error fetching positions for {session_key}: {e}")
        return None


def get_track_outline(session_key: str) -> list:
    """Return X/Y points for one clean lap using timestamp-sliced pos_data."""
    session = _load_session(session_key)
    try:
        # Find the fastest lap across all drivers (exclude lap 1 = formation lap)
        laps = session.laps.dropna(subset=["LapTime", "LapStartDate", "DriverNumber"])
        valid = laps[laps["LapNumber"] > 1]
        if valid.empty:
            valid = laps
        fastest = valid.loc[valid["LapTime"].idxmin()]
        drv = str(fastest["DriverNumber"])
        lap_start = fastest["LapStartDate"]
        lap_end = lap_start + fastest["LapTime"]

        if drv not in session.pos_data:
            raise ValueError(f"driver {drv} not in pos_data")

        pos = session.pos_data[drv]
        one_lap = pos[(pos["Date"] >= lap_start) & (pos["Date"] <= lap_end)][["X", "Y"]].dropna()

        if one_lap.empty:
            raise ValueError("empty one-lap slice")

        return [{"x": float(r.X), "y": float(r.Y)} for r in one_lap.itertuples(index=False)]
    except Exception as e:
        logger.error(f"Track outline failed for {session_key}: {e}")
        return []

# Load session once and return drivers, positions, and track outline in one call.
# This will run when a user has clicked on a session for the first time, so we can pre-load all the data we need
def get_session_init(session_key: str) -> dict | None:
    try:
        drivers = get_drivers(session_key)
        positions = get_positions(session_key)
        track = get_track_outline(session_key)
        return {"drivers": drivers, "positions": positions, "track": track}
    except Exception as e:
        logger.error(f"Error in get_session_init for {session_key}: {e}")
        return None


def get_laps(
    session_key: str, driver_number: int | None = None, lap_number: int | None = None
) -> list | None:
    try:
        session = _load_session(session_key)
        laps = session.laps
        if laps is None or laps.empty:
            return []
        if driver_number is not None:
            laps = laps[laps["DriverNumber"] == str(driver_number)]
        if lap_number is not None:
            laps = laps[laps["LapNumber"] == lap_number]
        laps = laps.dropna(subset=["LapTime"])
        return [
            {
                "driver_number": int(row["DriverNumber"]),
                "lap_number": int(row["LapNumber"]),
                "lap_time_seconds": row["LapTime"].total_seconds() if pd.notna(row["LapTime"]) else None,
                "compound": row.get("Compound", None),
                "tyre_life": int(row["TyreLife"]) if pd.notna(row.get("TyreLife")) else None,
                "stint": int(row["Stint"]) if pd.notna(row.get("Stint")) else None,
            }
            for _, row in laps.iterrows()
        ]
    except Exception as e:
        logger.error(f"Error fetching laps for {session_key}: {e}")
        return None


def get_stints(session_key: str, driver_number: int | None = None) -> list | None:
    try:
        session = _load_session(session_key)
        laps = session.laps
        if laps is None or laps.empty:
            return []
        if driver_number is not None:
            laps = laps[laps["DriverNumber"] == str(driver_number)]
        group_cols = [c for c in ["DriverNumber", "Stint", "Compound"] if c in laps.columns]
        grouped = (
            laps.groupby(group_cols)
            .agg(
                lap_count=("LapNumber", "count"),
                first_lap=("LapNumber", "min"),
                last_lap=("LapNumber", "max"),
            )
            .reset_index()
        )
        return [
            {
                "driver_number": int(row["DriverNumber"]),
                "stint": int(row["Stint"]) if "Stint" in row else None,
                "compound": row.get("Compound", None),
                "lap_count": int(row["lap_count"]),
                "first_lap": int(row["first_lap"]),
                "last_lap": int(row["last_lap"]),
            }
            for _, row in grouped.iterrows()
        ]
    except Exception as e:
        logger.error(f"Error fetching stints for {session_key}: {e}")
        return None


def get_pit_stops(session_key: str, driver_number: int | None = None) -> list | None:
    try:
        session = _load_session(session_key)
        laps = session.laps
        if laps is None or laps.empty:
            return []
        if driver_number is not None:
            laps = laps[laps["DriverNumber"] == str(driver_number)]
        if "PitInTime" not in laps.columns:
            return []
        pit_laps = laps[laps["PitInTime"].notna()]
        return [
            {
                "driver_number": int(row["DriverNumber"]),
                "lap_number": int(row["LapNumber"]),
                "duration": (row["PitOutTime"] - row["PitInTime"]).total_seconds()
                if pd.notna(row.get("PitInTime")) and pd.notna(row.get("PitOutTime"))
                else None,
                "compound": row.get("Compound", None),
            }
            for _, row in pit_laps.iterrows()
        ]
    except Exception as e:
        logger.error(f"Error fetching pit stops for {session_key}: {e}")
        return None
