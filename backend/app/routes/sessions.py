# Sessions router — handles /api/sessions endpoint only.

import asyncio
from fastapi import APIRouter, HTTPException
from app.services.fastf1_service import get_sessions

router = APIRouter(prefix="/api", tags=["sessions"])


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
