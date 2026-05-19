# Pydantic schemas — all API request/response data shapes live here, nowhere else.


from pydantic import BaseModel


class SessionSchema(BaseModel):
    """A single race/qualifying session returned by /api/sessions."""

    session_key: str
    country_name: str
    event_name: str
    round_number: int
    session_type: str
    session_type_code: str


class DriverSchema(BaseModel):
    """Driver metadata returned by /api/drivers."""

    driver_number: int
    full_name: str
    team_name: str
    name_acronym: str


class LocationPointSchema(BaseModel):
    """Single GPS coordinate with timestamp, returned by /api/location."""

    x: float
    y: float
    date: str | None = None


class TelemetryPointSchema(BaseModel):
    """Single car telemetry sample, returned by /api/telemetry."""

    date: str | None = None
    speed: int
    throttle: int
    brake: int
    n_gear: int
    rpm: int
    drs: int


class PositionSchema(BaseModel):
    """Race position entry for one driver at a given lap, returned by /api/positions."""

    driver_number: int
    position: int
    date: str | None = None


class LapSchema(BaseModel):
    """Lap time and tyre data for a single lap, returned by /api/laps."""

    driver_number: int
    lap_number: int
    lap_time_seconds: float | None = None
    compound: str | None = None
    tyre_life: int | None = None
    stint: int | None = None


class StintSchema(BaseModel):
    """Aggregated tyre stint data per driver, returned by /api/stints."""

    driver_number: int
    stint: int | None = None
    compound: str | None = None
    lap_count: int
    first_lap: int
    last_lap: int


class PitStopSchema(BaseModel):
    """Pit stop event with duration, returned by /api/pitstops."""

    driver_number: int
    lap_number: int
    duration: float | None = None
    compound: str | None = None


class TrackPointSchema(BaseModel):
    """X/Y coordinate for the track outline, returned inside session_init."""

    x: float
    y: float


class SessionInitSchema(BaseModel):
    """Combined session payload: drivers, positions, and track outline."""

    drivers: list[DriverSchema]
    positions: list[PositionSchema]
    track: list[TrackPointSchema]
