# F1 Dashboard — Backend

FastAPI backend serving F1 telemetry, session data, and AI racing line analysis via the FastF1 library.

---

## Quick Start

```bash
cd backend
cp .env.example .env        # set FASTF1_CACHE_DIR and CORS_ORIGIN
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
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
├── main.py                      ← Entry point: app setup, middleware, router registration ONLY
├── .env.example                 ← Copy to .env and fill in values (never commit .env)
├── requirements.txt
├── start.sh
└── app/
    ├── models/
    │   └── schemas.py           ← All Pydantic response models live here
    ├── routes/
    │   ├── sessions.py          ← GET /api/years, /api/sessions
    │   ├── drivers.py           ← GET /api/drivers, /api/session_init
    │   ├── telemetry.py         ← GET /api/location, /api/telemetry
    │   ├── race_data.py         ← GET /api/positions, /api/laps, /api/stints, /api/pitstops
    │   └── racing_line.py       ← GET /api/racing_line
    └── services/
        ├── fastf1_service.py    ← Business logic: session cache + all data extraction
        └── racing_line_service.py ← Fastest lap line extraction + car spec speed scaling
```

**Architecture rules:**
- `main.py` — only `FastAPI()`, `add_middleware()`, `include_router()`. No logic.
- `routes/` — thin handlers: validate input → call service → return response.
- `services/` — all business logic and data transformation.
- `models/` — all Pydantic schemas. No logic, data shapes only.

---

## API Reference

### Years
```
GET /api/years
```
Returns available seasons (2018 to current year). Used to populate the year selector.

### Sessions
```
GET /api/sessions?year=2024&session_type=Race
```
Returns completed races for a year. Future sessions (date > now) are automatically excluded. `session_type` options: `Race`, `Qualifying`, `Sprint`, `Practice 1–3`.

The sessions list auto-refreshes on the frontend every 30 minutes for the current year so newly completed races appear without a page reload.

### Session Init (combined call)
```
GET /api/session_init/2024_1_R
```
Returns drivers, lap-by-lap positions (with lap numbers), and track outline in one request.

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
Returns lap-by-lap standings including `lap_number` for each entry. Used to drive the live leaderboard and lap counter.

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

### Racing Line (AI Analyzer)
```
GET /api/racing_line/2024_1_R
GET /api/racing_line/2024_1_R?power_hp=300&weight_kg=1400&downforce=medium&tire=soft
```
Extracts the ideal racing line from the session's fastest lap telemetry and scales speed values to match the provided car specifications.

| Param | Default | Description |
|---|---|---|
| `power_hp` | `1000` | Engine power (F1 baseline = 1000 hp) |
| `weight_kg` | `800` | Car weight (F1 baseline = 800 kg) |
| `downforce` | `medium` | `low` / `medium` / `high` |
| `tire` | `medium` | `soft` / `medium` / `hard` |

**Response includes:**
- `line` — array of `{x, y, speed, throttle, brake}` points along the fastest lap
- `braking_zones` — coordinates where braking begins
- `apex_points` — local speed minima (corner apexes)
- `max_speed` — peak speed in km/h (adjusted for car specs)
- `speed_mult` — combined multiplier applied relative to F1 baseline

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
| `MPLBACKEND` | `Agg` | Set automatically in Docker — required for headless matplotlib |
| `PORT` | `8000` | Server port — Railway injects this automatically at runtime |

Copy `.env.example` → `.env` and set values. `.env` is in `.gitignore` and must never be committed.
