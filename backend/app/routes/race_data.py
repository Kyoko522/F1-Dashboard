# Race data router — handles /api/positions, /api/laps, /api/stints, /api/pitstops.

import asyncio

from fastapi import APIRouter, HTTPException

from app.services.fastf1_service import get_laps, get_pit_stops, get_positions, get_stints

router = APIRouter(prefix="/api", tags=["race_data"])


@router.get("/positions/{session_key}")
async def api_get_positions(session_key: str):
    """Return lap-by-lap race positions for all drivers in a session."""
    try:
        result = await asyncio.to_thread(get_positions, session_key)
        if result is None:
            raise HTTPException(status_code=503, detail="Failed to fetch positions")
        return {"success": True, "count": len(result), "data": result}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/laps/{session_key}")
async def api_get_laps(
    session_key: str,
    driver_number: int | None = None,
    lap_number: int | None = None,
):
    """Return lap times with tyre compound and stint info, optionally filtered by driver or lap."""
    try:
        result = await asyncio.to_thread(get_laps, session_key, driver_number, lap_number)
        if result is None:
            raise HTTPException(status_code=503, detail="Failed to fetch laps")
        return {"success": True, "count": len(result), "data": result}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/stints/{session_key}")
async def api_get_stints(session_key: str, driver_number: int | None = None):
    """Return aggregated tyre stint data per driver, optionally filtered by driver."""
    try:
        result = await asyncio.to_thread(get_stints, session_key, driver_number)
        if result is None:
            raise HTTPException(status_code=503, detail="Failed to fetch stints")
        return {"success": True, "count": len(result), "data": result}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/pitstops/{session_key}")
async def api_get_pitstops(session_key: str, driver_number: int | None = None):
    """Return pit stop events with lap number and duration, optionally filtered by driver."""
    try:
        result = await asyncio.to_thread(get_pit_stops, session_key, driver_number)
        if result is None:
            raise HTTPException(status_code=503, detail="Failed to fetch pit stops")
        return {"success": True, "count": len(result), "data": result}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
