from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.services.openf1 import openf1_client
from typing import Optional

# Creating a FastAPI instance
app = FastAPI(
    title="F1 Racing Dashboard API",
    description="F1 data visualization dashboard",
    version="1.0.0", 
    docs_url="/docs",
    redoc_url="/redoc"
)

# Adding Configure CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {
        "message": "F1 Racing Dashboard API",
        "status": "online",
        "version": "1.0.0",
        "endpoints": {
            "drivers": "/api/drivers",
            "driver_by_number": "/api/drivers/{driver_number}",
            "sessions": "/api/sessions",
            "location": "/api/location/{session_key}",
            "telemetry": "/api/telemetry/{session_key}",
            "laps": "/api/laps/{session_key}",
            "positions": "/api/positions/{session_key}",
            "intervals": "/api/intervals/{session_key}",
            "stints": "/api/stints/{session_key}",
            "pitstops": "/api/pitstops/{session_key}",
            "docs": "/docs"
        }
    }

@app.get("/api/drivers")
async def get_drivers(session_key: str = "latest"):
    try:
        drivers = openf1_client.get_drivers(session_key=session_key)
        
        if drivers is None:
            raise HTTPException(
                status_code=503,
                detail="Failed to fetch data from OpenF1 API"
            )
        
        return {
            "success": True,
            "count": len(drivers),
            "session_key": session_key,
            "data": drivers
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )
    
@app.get("/api/drivers/{driver_number}")
async def get_driver(driver_number: int, session_key: str = "latest"):
    try:
        driver = openf1_client.get_driver_by_number(
            driver_number=driver_number,
            session_key=session_key
        )
        
        if driver is None:
            raise HTTPException(
                status_code=404,
                detail=f"Driver #{driver_number} not found in session {session_key}"
            )
        
        return {
            "success": True,
            "session_key": session_key,
            "data": driver
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )

@app.get("/api/sessions")
async def get_sessions(
    year: Optional[int] = None,
    session_type: str = "Race",
    country_name: Optional[str] = None
):
    try:
        sessions = openf1_client.get_sessions(
            year=year,
            session_type=session_type,
            country_name=country_name
        )
        
        if sessions is None:
            raise HTTPException(
                status_code=503,
                detail="Failed to fetch sessions from OpenF1 API"
            )
        
        return {
            "success": True,
            "count": len(sessions),
            "filters": {
                "year": year,
                "session_type": session_type,
                "country_name": country_name
            },
            "data": sessions
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )
    
@app.get("/api/location/{session_key}")
async def get_location_data(
    session_key: int,
    driver_number: Optional[int] = None,
    date: Optional[str] = None
):
    try:
        location_data = openf1_client.get_location_data(
            session_key=session_key,
            driver_number=driver_number,
            date=date
        )
        
        if location_data is None:
            raise HTTPException(
                status_code=503,
                detail="Failed to fetch location data from OpenF1 API"
            )
        
        return {
            "success": True,
            "session_key": session_key,
            "driver_number": driver_number,
            "record_count": len(location_data),
            "data": location_data
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )
    
@app.get("/api/telemetry/{session_key}")
async def get_telemetry(
    session_key: int,
    driver_number: Optional[int] = None,
    speed: Optional[int] = None,
    throttle: Optional[int] = None,
    brake: Optional[int] = None,
    drs: Optional[int] = None,
    rpm: Optional[int] = None,
    n_gear: Optional[int] = None
):
    try:
        telemetry_data = openf1_client.get_car_data(
            session_key=session_key,
            driver_number=driver_number,
            speed=speed,
            throttle=throttle,
            brake=brake,
            drs=drs,
            rpm=rpm,
            n_gear=n_gear
        )
        
        if telemetry_data is None:
            raise HTTPException(
                status_code=503,
                detail="Failed to fetch telemetry data from OpenF1 API"
            )
        
        return {
            "success": True,
            "session_key": session_key,
            "driver_number": driver_number,
            "filters": {
                "speed": speed,
                "throttle": throttle,
                "brake": brake,
                "drs": drs,
                "rpm": rpm,
                "n_gear": n_gear
            },
            "record_count": len(telemetry_data),
            "data": telemetry_data
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )

@app.get("/api/laps/{session_key}")
async def get_laps(
    session_key: int,
    driver_number: Optional[int] = None,
    lap_number: Optional[int] = None
):
    try:
        laps_data = openf1_client.get_laps_data(
            session_key=session_key,
            driver_number=driver_number,
            lap_number=lap_number
        )
        
        if laps_data is None:
            raise HTTPException(
                status_code=503,
                detail="Failed to fetch lap data from OpenF1 API"
            )
        
        return {
            "success": True,
            "session_key": session_key,
            "driver_number": driver_number,
            "lap_number": lap_number,
            "record_count": len(laps_data),
            "data": laps_data
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )
    
@app.get("/api/positions/{session_key}")
async def get_positions(
    session_key: int,
    driver_number: Optional[int] = None,
    position: Optional[int] = None
):
    try:
        position_data = openf1_client.get_position_data(
            session_key=session_key,
            driver_number=driver_number,
            position=position
        )
        
        if position_data is None:
            raise HTTPException(
                status_code=503,
                detail="Failed to fetch position data from OpenF1 API"
            )
        
        return {
            "success": True,
            "session_key": session_key,
            "driver_number": driver_number,
            "position_filter": position, 
            "record_count": len(position_data),
            "data": position_data
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )
    
@app.get("/api/intervals/{session_key}")
async def get_intervals(
    session_key: int,
    driver_number: Optional[int] = None
):
    try:
        interval_data = openf1_client.get_intervals(
            session_key=session_key,
            driver_number=driver_number
        )

        if interval_data is None:
            raise HTTPException(
                status_code=503,
                detail="Failed to fetch interval data from OpenF1 API"
            )
        
        return {
            "success": True,
            "session_key": session_key,
            "driver_number": driver_number,
            "record_count": len(interval_data),
            "data": interval_data
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )

@app.get("/api/stints/{session_key}")
async def get_stints(
    session_key: int,
    driver_number: Optional[int] = None
):
    try:
        stint_data = openf1_client.get_stints(
            session_key=session_key,
            driver_number=driver_number
        )

        if stint_data is None:
            raise HTTPException(
                status_code=503,
                detail="Failed to fetch stint data from OpenF1 API"
            )
        
        return {
            "success": True,
            "session_key": session_key,
            "driver_number": driver_number,
            "record_count": len(stint_data),
            "data": stint_data
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )
            
@app.get("/api/pitstops/{session_key}")
async def get_pitstops(
    session_key: int,
    driver_number: Optional[int] = None
):
    try: 
        pitstop_data = openf1_client.get_pit_stops(
            session_key=session_key,
            driver_number=driver_number
        )
        
        if pitstop_data is None:
            raise HTTPException(
                status_code=503,
                detail="Failed to fetch pit stop data from OpenF1 API"
            )
        
        return {
            "success": True,
            "session_key": session_key,
            "driver_number": driver_number,
            "record_count": len(pitstop_data),
            "data": pitstop_data
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )
