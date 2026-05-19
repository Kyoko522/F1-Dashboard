# Drivers router — handles /api/session_init and /api/drivers endpoints only.

import asyncio

from fastapi import APIRouter, HTTPException

from app.services.fastf1_service import get_drivers, get_session_init

router = APIRouter(prefix="/api", tags=["drivers"])


@router.get("/session_init/{session_key}")
async def api_session_init(session_key: str):
    """Load a session once and return drivers, positions, and track outline in a single call."""
    try:
        result = await asyncio.to_thread(get_session_init, session_key)
        if result is None:
            raise HTTPException(status_code=503, detail="Failed to load session")
        return {"success": True, "data": result}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/drivers/{session_key}")
async def api_get_drivers(session_key: str):
    """Return the list of drivers and their metadata for a session."""
    try:
        result = await asyncio.to_thread(get_drivers, session_key)
        if result is None:
            raise HTTPException(status_code=503, detail="Failed to fetch drivers")
        return {"success": True, "count": len(result), "data": result}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
