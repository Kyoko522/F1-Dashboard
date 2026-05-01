# Sessions router — handles /api/years and /api/sessions endpoints.

import asyncio
from datetime import datetime
from fastapi import APIRouter, HTTPException
from app.services.fastf1_service import get_sessions

router = APIRouter(prefix="/api", tags=["sessions"])


@router.get("/years")
async def api_get_years():
    """Return available F1 seasons (2018 to current year)."""
    current_year = datetime.now().year
    years = list(range(2018, current_year + 1))
    return {"success": True, "data": years}


@router.get("/sessions")
async def api_get_sessions(year: int, session_type: str = "Race"):
    """Return all sessions for a given year and session type."""
    try:
        result = await asyncio.to_thread(get_sessions, year, session_type)
        if result is None:
            raise HTTPException(status_code=503, detail="Failed to fetch sessions")
        return {"success": True, "count": len(result), "data": result}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
