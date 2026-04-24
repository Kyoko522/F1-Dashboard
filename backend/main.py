# Application entry point — FastAPI setup, middleware, and router registration only.
# No business logic lives here; all logic is in app/services/ and app/routes/.

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import sessions, drivers, telemetry, race_data

app = FastAPI(
    title="F1 Racing Dashboard API",
    description="F1 data visualization dashboard",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sessions.router)
app.include_router(drivers.router)
app.include_router(telemetry.router)
app.include_router(race_data.router)


@app.get("/")
async def root():
    """API health check and endpoint directory."""
    return {
        "message": "F1 Racing Dashboard API",
        "status": "online",
        "version": "2.0.0",
        "endpoints": {
            "sessions": "/api/sessions",
            "session_init": "/api/session_init/{session_key}",
            "drivers": "/api/drivers/{session_key}",
            "location": "/api/location/{session_key}/{driver_number}",
            "telemetry": "/api/telemetry/{session_key}/{driver_number}",
            "positions": "/api/positions/{session_key}",
            "laps": "/api/laps/{session_key}",
            "stints": "/api/stints/{session_key}",
            "pitstops": "/api/pitstops/{session_key}",
            "docs": "/docs",
        },
    }
