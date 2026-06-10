# Sessions router — handles /api/years and /api/sessions endpoints.
# This file will be the first thing to run when the application is open it will ask user to input a year giving them a list of years (sessions)

import asyncio                                  # Need to use async and await commands for easy execution and management
from datetime import datetime

from fastapi import APIRouter, HTTPException

from app.services.fastf1_service import get_sessions

router = APIRouter(prefix="/api", tags=["sessions", "years"])

# Return available F1 seasons (2018 to current year of system).
@router.get("/years")
async def api_get_years():
    current_year = datetime.now().year
    years = list(range(2018, current_year + 1))
    return {"success": True, "data": years}

# Return all sessions for a given year and session type. Default session is Race 
@router.get("/sessions")
async def api_get_sessions(year: int, session_type: str = "Race"):
    try:
        result = await asyncio.to_thread(get_sessions, year, session_type)      # asyncio.to_thread says run task in the background thread so main server stays free
                                                                                # get_sessions is where the infromation is going from state in the import statement
        if result is None:
            raise HTTPException(status_code=503, detail="No Data to Display")
        return {"success": True, "count": len(result), "data": result}
    except HTTPException:
        raise HTTPException(status_code=503, detail="Failed to fetch sessions")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


# Note: session.py is just a middleman, it reads the URL, delegates to the service, and returns the result. All the real work happens in the service folder
