# F1 Dashboard — Backend

FastAPI backend serving F1 telemetry and session data via the FastF1 library.

---

## Quick Start

```bash
cd backend
cp .env.example .env        # set FASTF1_CACHE_DIR and CORS_ORIGIN
source venv/bin/activate
uvicorn main:app --reload   # runs on http://localhost:8000
```

Or use the convenience script:
```bash
bash start.sh
```

Interactive API docs: **http://localhost:8000/docs**

---

## Structure

```
backend/
├── main.py               ← Entry point: app setup, middleware, router registration ONLY
├── .env.example          ← Copy to .env and fill in values (never commit .env)
├── requirements.txt
├── start.sh
└── app/
    ├── models/
    │   └── schemas.py    ← All Pydantic response models live here
    ├── routes/
    │   ├── sessions.py   ← GET /api/sessions
    │   ├── drivers.py    ← GET /api/drivers, /api/session_init
    │   ├── telemetry.py  ← GET /api/location, /api/telemetry
    │   └── race_data.py  ← GET /api/positions, /api/laps, /api/stints, /api/pitstops
    ├── services/
    │   └── fastf1_service.py  ← Business logic: session cache + all data extraction
    └── ml/
        ├── data_loader.py     ← Fetches raw race data for ML training
        └── predictor.py       ← Race winner, lap time, pit strategy, championship models
```

**Architecture rules:**
- `main.py` — only `FastAPI()`, `add_middleware()`, `include_router()`. No logic.
- `routes/` — thin handlers: validate input → call service → return response.
- `services/` — all business logic and data transformation.
- `models/` — all Pydantic schemas. No logic, data shapes only.

---

## API Reference

### Sessions
```
GET /api/sessions?year=2024&session_type=Race
```
Returns all races for a year. `session_type` can be: `Race`, `Qualifying`, `Sprint`, `Practice 1–3`.

### Session Init (combined call)
```
GET /api/session_init/2024_1_R
```
Returns drivers, positions, and track outline in one request. Use this instead of calling each separately.

### Drivers
```
GET /api/drivers/2024_1_R
```

### GPS Location (track replay)
```
GET /api/location/2024_1_R/1
```
Returns downsampled X/Y position time-series for driver #1.

### Telemetry
```
GET /api/telemetry/2024_1_R/1
```
Returns speed, throttle, brake, gear, RPM, DRS sampled every 5th point.

### Race Positions
```
GET /api/positions/2024_1_R
```

### Laps
```
GET /api/laps/2024_1_R
GET /api/laps/2024_1_R?driver_number=1
GET /api/laps/2024_1_R?driver_number=1&lap_number=10
```

### Stints
```
GET /api/stints/2024_1_R
GET /api/stints/2024_1_R?driver_number=1
```

### Pit Stops
```
GET /api/pitstops/2024_1_R
GET /api/pitstops/2024_1_R?driver_number=1
```

---

## Session Key Format

`{year}_{round_number}_{session_type_code}`

| Code | Session |
|---|---|
| `R` | Race |
| `Q` | Qualifying |
| `S` | Sprint |
| `FP1` / `FP2` / `FP3` | Practice sessions |
| `SQ` | Sprint Qualifying |

**Example:** `2024_1_R` = 2024 Bahrain Grand Prix Race

---

## Session Caching

The service maintains a thread-safe LRU cache of up to 5 loaded sessions in memory.

- **First load:** 10–30 seconds (FastF1 downloads from official F1 timing feeds and writes to `FASTF1_CACHE_DIR`)
- **Repeat load (same session):** instant (served from the in-memory cache)
- **On-disk cache:** persists across server restarts via `FASTF1_CACHE_DIR`

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `FASTF1_CACHE_DIR` | `/tmp/fastf1_cache` | Where FastF1 stores downloaded session files |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed frontend origin |

Copy `.env.example` → `.env` and set values. `.env` is in `.gitignore` and must never be committed.
