# F1 Dashboard API - Quick Start

## 🚀 Starting the Backend
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload
```

Server runs at: **http://localhost:8000**

---

## 📖 API Documentation

Interactive docs: **http://localhost:8000/docs**

---

## 🔗 Available Endpoints

### Get All Races
```
GET http://localhost:8000/api/sessions?year=2024&session_type=Race
```

### Get Drivers for a Session
```
GET http://localhost:8000/api/drivers?session_key=latest
```

### Get Specific Driver
```
GET http://localhost:8000/api/drivers/1
```

### Get Car Locations (for replay)
```
GET http://localhost:8000/api/location/{session_key}?driver_number=1
```

### Get Telemetry Data
```
GET http://localhost:8000/api/telemetry/{session_key}?driver_number=1
```

### Get Lap Times
```
GET http://localhost:8000/api/laps/{session_key}?driver_number=1
```

### Get Race Positions
```
GET http://localhost:8000/api/positions/{session_key}
```

### Get Driver Gaps
```
GET http://localhost:8000/api/intervals/{session_key}
```

### Get Pit Stops
```
GET http://localhost:8000/api/pitstops/{session_key}
```

### Get Tire Stints
```
GET http://localhost:8000/api/stints/{session_key}
```

---

## 💡 Quick Tips

- Use `/docs` for interactive testing
- `session_key=latest` gets most recent session
- All endpoints return JSON
- Add `?driver_number=X` to filter by driver

---

## 🛠️ Current Status

✅ Backend API with OpenF1 integration  
⏳ Race replay visualization - Coming soon

---

## 📚 Development Pattern (Learning Reference)

All endpoints follow this consistent pattern:

### In `openf1.py` (API Client Methods)
```python
def get_SOMETHING(self, required_param, optional_param=None):
    """
    Docstring explaining what this does
    """
    # Build params dict
    params = {"required": required_param}
    if optional_param:
        params["optional"] = optional_param
    
    # Make request
    return self._make_request("/endpoint", params=params)
```

### In `main.py` (FastAPI Endpoints)
```python
@app.get("/api/something")
async def get_something(required_param: int, optional_param: Optional[str] = None):
    """
    Docstring explaining the endpoint
    """
    try:
        # Call the client method
        data = openf1_client.get_SOMETHING(required_param, optional_param)
        
        # Check for failure
        if data is None:
            raise HTTPException(status_code=503, detail="API failed")
        
        # Return formatted response
        return {
            "success": True,
            "count": len(data),
            "data": data
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

**Pattern used for:** Sessions, Location, Telemetry, Laps, Positions, Intervals, Pit Stops, Stints