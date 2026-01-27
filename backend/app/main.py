from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.services.openf1 import openf1_client


# Creating a fastAPI instance
app = FastAPI(
    title="F1 Racing Dashbiard API",
    description="F1 data visualization dashboard",
    Version = "1.0.0", 
    docs_url="/docs",
    redoc_url="/redoc"
)

# Adding Configure CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "https://127.0.0.1:3000",
        "https://127.0.0.1:5173"
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
            "docs": "/docs"
    }
}

@app.get("/api/drivers")
async def get_drivers(session_key: str = "latest"):
    """
    Get list of F1 drivers for a specific session
    
    Args:
        session_key: Session identifier (default: "latest")
    
    Returns:
        List of driver information dictionaries
    
    Example:
        GET /api/drivers
        GET /api/drivers?session_key=9839

    async def get_drivers(session_key: str = "latest"):
                          └─────────┬─────────┘
                      Query parameter with default value
    """
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
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )
    
@app.get("/api/drivers/{driver_number}")
async def get_driver(driver_number: int, session_key: str = "latest"):
    """
    Get information about a specific driver
    
    Args:
        driver_number: Driver's race number (path parameter)
        session_key: Session identifier (query parameter)
    
    Returns:
        Single driver information dictionary
    
    Example:
        GET /api/drivers/1
        GET /api/drivers/44?session_key=9839

    @app.get("/api/drivers/{driver_number}")
                            └──────┬──────┘
                        Path parameter (part of URL)

async def get_driver(driver_number: int):
                     └──────┬──────┘
                     Automatically extracted from URL
    """
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
        raise  # Re-raise HTTP exceptions
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )
'''
TODO:

# Already have:
✅ GET / (root)
✅ GET /api/drivers
✅ GET /api/drivers/{driver_number}

# Need to add:
1. GET /api/sessions                                       # List races
2. GET /api/location/{session_key}                         # Position data
3. GET /api/telemetry/{session_key}                        # Car data
4. GET /api/laps/{session_key}                            # Lap info
5. GET /api/positions/{session_key}                        # Race positions
6. GET /api/intervals/{session_key}                        # Driver gaps
7. GET /api/stints/{session_key}                          # Tire stints
8. GET /api/pitstops/{session_key}                        # Pit stops

'''

@app.get("/api/sessions")
async def get_sessions(
    year: Optional[int] = None,
    session_type: str = "Race",
    country_name: Optional[str] = None
):
    """
    Get list of F1 sessions (races, qualifying, practice)
    
    Query Parameters:
        year: Filter by year (e.g., 2024)
        session_type: "Race", "Qualifying", "Practice 1", etc. (default: "Race")
        country_name: Filter by country (e.g., "Monaco")
    
    Returns:
        JSON with success status, count, filters applied, and session data
    
    Example URLs:
        GET /api/sessions?year=2024&session_type=Race
        GET /api/sessions?country_name=Monaco
        GET /api/sessions?year=2023
    """
    try:
        # Call the method from openf1_client
        sessions = openf1_client.get_sessions(
            year=year,
            session_type=session_type,
            country_name=country_name
        )
        
        # Check if the request failed
        if sessions is None:
            raise HTTPException(
                status_code=503,
                detail="Failed to fetch sessions from OpenF1 API"
            )
        
        # Return formatted response
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
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        # Handle any other errors
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )