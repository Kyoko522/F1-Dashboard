"""Schema validation tests — pin the response shapes so accidental changes fail fast."""

import pytest
from pydantic import ValidationError

from app.models.schemas import (
    DriverSchema,
    LapSchema,
    LocationPointSchema,
    PitStopSchema,
    PositionSchema,
    SessionSchema,
    StintSchema,
    TelemetryPointSchema,
)


@pytest.mark.unit
def test_session_schema_round_trip():
    payload = {
        "session_key": "2024_1_R",
        "country_name": "Bahrain",
        "event_name": "Bahrain Grand Prix",
        "round_number": 1,
        "session_type": "Race",
        "session_type_code": "R",
    }
    obj = SessionSchema(**payload)
    assert obj.session_key == "2024_1_R"
    assert obj.round_number == 1


@pytest.mark.unit
def test_driver_schema_requires_integer_number():
    with pytest.raises(ValidationError):
        DriverSchema(driver_number="not-an-int", full_name="X", team_name="Y", name_acronym="Z")


@pytest.mark.unit
def test_telemetry_schema_accepts_zeros():
    obj = TelemetryPointSchema(date=None, speed=0, throttle=0, brake=0, n_gear=0, rpm=0, drs=0)
    assert obj.speed == 0


@pytest.mark.unit
def test_location_point_schema_allows_null_date():
    obj = LocationPointSchema(x=1.5, y=2.5, date=None)
    assert obj.date is None


@pytest.mark.unit
def test_position_lap_stint_pitstop_basic_shapes():
    PositionSchema(driver_number=1, position=1, date="2024-01-01T00:00:00")
    LapSchema(driver_number=1, lap_number=5, lap_time_seconds=92.5, compound="MEDIUM", tyre_life=10, stint=2)
    StintSchema(driver_number=1, stint=1, compound="SOFT", lap_count=12, first_lap=1, last_lap=12)
    PitStopSchema(driver_number=1, lap_number=15, duration=2.8, compound="MEDIUM")
