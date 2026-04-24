# Telemetry router — handles /api/location and /api/telemetry endpoints only.

import asyncio
from fastapi import APIRouter, HTTPException
from app.services.fastf1_service import get_location, get_telemetry

router = APIRouter(prefix="/api", tags=["telemetry"])


@router.get("/location/{session_key}/{driver_number}")
async def api_get_location(session_key: str, driver_number: int):
    """Return the full-race GPS position time-series for a single driver (downsampled)."""
    try:
        result = await asyncio.to_thread(get_location, session_key, driver_number)
        if result is None:
            raise HTTPException(status_code=503, detail="Failed to fetch location")
        return {"success": True, "count": len(result), "data": result}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/telemetry/{session_key}/{driver_number}")
async def api_get_telemetry(session_key: str, driver_number: int):
    """Return car telemetry (speed, throttle, brake, gear, RPM, DRS) for a single driver."""
    try:
        result = await asyncio.to_thread(get_telemetry, session_key, driver_number)
        if result is None:
            raise HTTPException(status_code=503, detail="Failed to fetch telemetry")
        return {"success": True, "count": len(result), "data": result}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
