# Application entry point — FastAPI setup, middleware, and router registration only.
# No business logic lives here; all logic is in app/services/ and app/routes/.
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import drivers, race_data, racing_line, sessions, telemetry

# Initialize FastAPI app with metadata and documentation settings, this is shown in the auto-generated docs
app = FastAPI(
    title="F1 Racing Dashboard API",
    description="F1 data visualization dashboard",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Who is allowed to talked to the API (The Gatekeeper) 
# Accepts cross-origin HTTP requests from any client domain
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],        # Accept request from ANY domain
    allow_credentials=False,    # Don't allow cookies or auth headers to be sent cross-origin
    allow_methods=["*"],        # Allow all HTTP methods (GET, POST, DELETE, etc.)
    allow_headers=["*"],        # Allow all headers (Content-Type, Authorization, etc.)
)

# The Map Layout, Basically makes the path for each API url route and FASTAPI will auto sort and direct each request to the appropriate handler
app.include_router(sessions.router)     # Routes for listing and initializing race sessions                 /api/sessions
app.include_router(drivers.router)      # Routes for fetching driver info per session                       /api/drivers/9165
app.include_router(telemetry.router)    # Routes for car, telemetry data (speed, throttle, brake, etc.)     /api/telemetry/9165/44
app.include_router(race_data.router)    # Routes for laps, stints, positions, and pit stops                 /api/laps/9165
app.include_router(racing_line.router)  # Routes for car GPS location/track position data                   /api/location/9165/44


# The Root Endpoint (The Welcome Desk)
@app.get("/")
async def root():
    """API health check and endpoint directory."""
    # Returns a JSON object confirming the API is alive and listing all available routes
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
