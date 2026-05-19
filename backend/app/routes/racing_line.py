# racing_line route — ideal racing line + car spec analysis for a session.

import asyncio

from fastapi import APIRouter, HTTPException

from app.services.racing_line_service import get_racing_line

router = APIRouter(prefix="/api", tags=["racing_line"])


@router.get("/racing_line/{session_key}")
async def api_get_racing_line(
    session_key: str,
    power_hp: int = 1000,
    weight_kg: int = 800,
    downforce: str = "medium",
    tire: str = "medium",
):
    result = await asyncio.to_thread(get_racing_line, session_key, power_hp, weight_kg, downforce, tire)
    if result is None:
        raise HTTPException(status_code=503, detail="Could not compute racing line for this session")
    return {"success": True, "data": result}
