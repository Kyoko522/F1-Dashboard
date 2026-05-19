# racing_line_service.py — extract ideal racing line from the fastest F1 lap and adjust for car specs.

import logging

import pandas as pd

from app.services.fastf1_service import _load_session

logger = logging.getLogger(__name__)

DOWNFORCE_FACTORS = {"low": 0.90, "medium": 1.0, "high": 1.08}
TIRE_FACTORS = {"soft": 1.05, "medium": 1.0, "hard": 0.94}


def _speed_color_ratio(speed: float, max_speed: float) -> float:
    """0.0 = slowest (red), 1.0 = fastest (green)"""
    if max_speed == 0:
        return 0.0
    return min(1.0, max(0.0, speed / max_speed))


def get_racing_line(
    session_key: str,
    power_hp: int = 1000,
    weight_kg: int = 800,
    downforce: str = "medium",
    tire: str = "medium",
) -> dict | None:
    """
    Return the ideal racing line for a session derived from the fastest lap,
    with speed values scaled to the provided car specifications.
    """
    try:
        session = _load_session(session_key)
        fastest = session.laps.pick_fastest()
        if fastest is None or fastest.empty:
            logger.warning(f"No fastest lap for {session_key}")
            return None

        tel = fastest.get_telemetry()
        if tel is None or tel.empty:
            logger.warning(f"No telemetry for fastest lap in {session_key}")
            return None

        # Downsample — every 4th point is ~4-5m at race speeds, enough for visuals
        tel = tel.iloc[::4].reset_index(drop=True)

        # Speed multiplier from car specs relative to F1 baseline (1000 hp / 800 kg)
        power_factor = (power_hp / 1000) ** 0.25
        weight_factor = (800 / max(weight_kg, 1)) ** 0.15
        downforce_factor = DOWNFORCE_FACTORS.get(downforce, 1.0)
        tire_factor = TIRE_FACTORS.get(tire, 1.0)
        speed_mult = power_factor * weight_factor * downforce_factor * tire_factor

        points = []
        for _, row in tel.iterrows():
            x = row.get("X", 0)
            y = row.get("Y", 0)
            if pd.isna(x) or pd.isna(y):
                continue
            x, y = float(x), float(y)
            if x == 0 and y == 0:
                continue

            raw_speed = float(row.get("Speed", 0) or 0)
            throttle = float(row.get("Throttle", 0) or 0)

            brake_raw = row.get("Brake", False)
            if isinstance(brake_raw, bool):
                is_brake = brake_raw
            elif pd.isna(brake_raw):
                is_brake = False
            else:
                is_brake = bool(brake_raw)

            points.append(
                {
                    "x": x,
                    "y": y,
                    "speed": round(raw_speed * speed_mult, 1),
                    "throttle": round(throttle, 1),
                    "brake": is_brake,
                }
            )

        if not points:
            return None

        max_speed = max(p["speed"] for p in points)

        # Braking zone starts: transition from no-brake → brake
        braking_zones = []
        for i in range(1, len(points)):
            if points[i]["brake"] and not points[i - 1]["brake"]:
                braking_zones.append({"x": points[i]["x"], "y": points[i]["y"]})

        # Apex: local speed minima (not currently braking, speed lower than neighbours)
        apex_points = []
        speeds = [p["speed"] for p in points]
        for i in range(3, len(points) - 3):
            if (
                not points[i]["brake"]
                and speeds[i] < speeds[i - 1]
                and speeds[i] < speeds[i + 1]
                and speeds[i] < speeds[i - 2]
                and speeds[i] < speeds[i + 2]
            ):
                apex_points.append(
                    {
                        "x": points[i]["x"],
                        "y": points[i]["y"],
                        "speed": speeds[i],
                    }
                )

        return {
            "line": points,
            "braking_zones": braking_zones,
            "apex_points": apex_points,
            "max_speed": round(max_speed, 1),
            "speed_mult": round(speed_mult, 3),
        }

    except Exception as e:
        logger.error(f"Error computing racing line for {session_key}: {e}")
        return None
