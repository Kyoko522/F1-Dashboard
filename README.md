# F1 Dashboard

A full-stack Formula 1 telemetry replay dashboard. Watch any race from 2018 onward with live driver positions on the track, real-time telemetry, a live leaderboard, and an AI-powered racing line analyzer — all synced to a scrubbable playback timeline.

**Live demo:** [f1-dashboard-production.up.railway.app](https://f1-dashboard-production.up.railway.app)  
**Data source:** [FastF1](https://github.com/theOehrly/Fast-F1) — official F1 timing and telemetry feeds

---

## What It Does

You pick a year and a race. The backend downloads that session's data from the official F1 timing feed (via FastF1), caches it, and streams position + telemetry data to the frontend. The frontend renders all 20 cars moving around the track in a 60fps canvas animation, synced to a playback timeline you can scrub, pause, and fast-forward. A second tab shows the ideal racing line from the fastest lap, color-coded by speed, with braking zones and apex points marked — and lets you enter your own car specs to see how the speed targets scale.

---

## Features

### Race Replay
- Select any season (2018–present) and race — only completed races with available data are shown
- All 20 cars animated on the track at up to 10× speed
- Playback auto-starts 8 seconds before the race so you see drivers on the formation grid
- Scrub to any point with the seek slider

### Live Leaderboard
- Race standings update in real time as replay plays
- Live lap counter (`36 / 72`) tracks the leader's current lap
- Top 3 highlighted in gold / silver / bronze

### Driver Telemetry
- Select any driver to open their telemetry panel: speed, throttle %, brake, gear, RPM, DRS
- Syncs frame-accurately with the playback position

### AI Race Line Analyzer
- Switch to the **AI RACE LINE** tab to visualize the ideal racing line for any loaded session
- Derived from the actual telemetry of the session's fastest lap
- Color-coded by speed: red (slow/braking) → yellow → green (fast)
- Braking zone starts and apex points marked on the canvas
- Enter your own car specs to see scaled speed targets:
  - Engine power (HP)
  - Weight (kg)
  - Downforce level (Low / Medium / High)
  - Tire compound (Soft / Medium / Hard)

### Mobile Support
- Fully responsive — no horizontal scrolling
- Touch-friendly 44px minimum tap targets
- Playback controls stack into two rows on small screens
- Collapsible session selector to maximize track area

---

## System Design

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                              │
│                                                             │
│   SessionSelector → Dashboard → TrackCanvas (60fps rAF)    │
│                             ↓                               │
│            useSessionData (fetch)  usePlayback (timer)      │
│                             ↓                               │
│                     services/api.js                         │
└───────────────────────────┬─────────────────────────────────┘
                            │  HTTP REST (JSON)
┌───────────────────────────▼─────────────────────────────────┐
│                    FastAPI Backend                           │
│                                                             │
│   routes/ (thin handlers)                                   │
│       ↓                                                     │
│   services/fastf1_service.py  (thread-safe LRU cache)       │
│   services/racing_line_service.py                           │
│       ↓                                                     │
│   FastF1 library → official F1 timing feeds (download once) │
│       ↓                                                     │
│   Disk cache (FASTF1_CACHE_DIR)                             │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
FastF1 library
  │  Downloads telemetry from official F1 timing servers (first load only)
  │  Writes parsed files to FASTF1_CACHE_DIR on disk
  ↓
fastf1_service.py
  │  Thread-safe LRU cache — up to 5 sessions in memory
  │  Concurrent requests for the same session share one loading thread
  │  Subsequent requests: served instantly from memory
  ↓
app/routes/  (thin FastAPI handlers — validate input, call service, return JSON)
  │
  ↓ HTTP
services/api.js  (all fetch() calls — single source of truth in the frontend)
  ↓
hooks/useSessionData.js  (React state: sessions list, driver list, locations, telemetry)
hooks/usePlayback.js     (playback offset, currentTime, race-start detection)
  ↓
components/  (pure display — receive props, render)
  TrackCanvas.jsx   → 60fps canvas animation via requestAnimationFrame
  Leaderboard.jsx   → live standings derived from currentTime
  TelemetryPanel.jsx → telemetry slice at currentTime
```

### Session Loading & Caching

Session data is expensive to fetch — 10–30 seconds on first load because FastF1 downloads and parses timing files from F1's official servers. The backend solves this with two layers:

1. **Disk cache** (`FASTF1_CACHE_DIR`) — FastF1 writes parsed files here. Survives server restarts.
2. **In-memory LRU cache** (up to 5 sessions) — held as live Python objects. Requests for a cached session return immediately.

Concurrent requests for the same uncached session block on a `threading.Event` — only one thread downloads; others wait, then get the result from cache.

### Race-Start Detection

`usePlayback.js` scans the first 30% of GPS data using a sliding window (5 seconds wide, 500ms steps). At each step it measures how far each car moved. When the average movement per car drops below 15 metres, the cars are considered stationary (formation grid). The last such window is taken as the race start. Playback begins 8 seconds before that point.

### Playback Engine

The animation runs on wall-clock time, not frame counting:

- A `setInterval` fires every 50ms
- Each tick computes `elapsed = (now - lastWallTime) * speed` and advances `playbackOffset`
- `currentTime = sessionBounds.start + playbackOffset`
- TrackCanvas, Leaderboard, and TelemetryPanel all derive their state from `currentTime`
- TrackCanvas uses `requestAnimationFrame` for the actual drawing, independent of the interval

This means playback stays accurate under frame drops and tab throttling.

### AI Racing Line Analyzer

The racing line is not ML-predicted — it is extracted directly from the actual telemetry of the session's fastest lap. Speed values are then scaled by a physics-inspired multiplier:

```
speed_mult = (power_hp / 1000)^0.25  ×  (800 / weight_kg)^0.15
           ×  downforce_factor  ×  tire_factor
```

Braking zones are detected as transitions from `brake=False` → `brake=True`. Apex points are local speed minima (lower than two neighbours on each side) while not braking.

---

## Technology Stack

### Backend

| Tool | Version | Role |
|---|---|---|
| **Python** | 3.11 | Runtime |
| **FastAPI** | Latest | REST API framework — async, auto-docs at `/docs` |
| **Uvicorn** | Latest | ASGI server |
| **FastF1** | Latest | Official F1 timing and telemetry data library |
| **Pandas** | Latest | Data processing, downsampling, transformation |
| **Pydantic** | v2 | Request/response schema validation |

### Frontend

| Tool | Version | Role |
|---|---|---|
| **React** | 19 | UI framework |
| **Vite** | Latest | Build tool and dev server (HMR) |
| **Canvas API** | Browser native | 60fps track and racing line renderer |
| **ESLint** | Latest | Linting |

### Infrastructure

| Tool | Role |
|---|---|
| **Docker** | Container image for the backend |
| **Railway** | Backend hosting (injects `$PORT` at runtime) |
| **Vercel** | Frontend hosting (static Vite build) |
| **Docker Compose** | Local multi-service dev environment |

---

## Project Structure

```
F1-Dashboard/
├── Dockerfile                       ← Backend container image
├── docker-compose.yml               ← Local dev: backend + visualization + AI training
├── vercel.json                      ← Vercel routing config for SPA
│
├── backend/
│   ├── main.py                      ← FastAPI app: setup, middleware, router registration ONLY
│   ├── .env.example                 ← Environment variable template
│   ├── requirements.txt
│   ├── start.sh                     ← Convenience: activate venv + uvicorn
│   └── app/
│       ├── models/
│       │   └── schemas.py           ← All Pydantic response models (no logic)
│       ├── routes/
│       │   ├── sessions.py          ← GET /api/years, /api/sessions
│       │   ├── drivers.py           ← GET /api/drivers, /api/session_init
│       │   ├── telemetry.py         ← GET /api/location, /api/telemetry
│       │   ├── race_data.py         ← GET /api/positions, /api/laps, /api/stints, /api/pitstops
│       │   └── racing_line.py       ← GET /api/racing_line
│       └── services/
│           ├── fastf1_service.py    ← Thread-safe LRU session cache + all data extraction
│           └── racing_line_service.py ← Fastest lap extraction + car spec speed scaling
│
└── frontend/
    └── src/
        ├── services/api.js          ← All fetch() calls — single source of truth
        ├── hooks/
        │   ├── useSessionData.js    ← Fetches sessions, drivers, locations, telemetry
        │   └── usePlayback.js       ← Playback offset, race-start detection, currentTime
        ├── components/
        │   ├── TrackCanvas.jsx      ← 60fps canvas renderer (rAF loop via refs)
        │   ├── Leaderboard.jsx      ← Live standings + lap counter
        │   ├── TelemetryPanel.jsx   ← Speed / throttle / brake / gear / RPM / DRS
        │   ├── PlaybackControls.jsx ← Play/pause, speed selector, seek slider
        │   ├── DriverSelector.jsx   ← Driver list with track / TEL toggles
        │   ├── SessionSelector.jsx  ← Year and race session pickers
        │   ├── RacingLineTab.jsx    ← AI race line analyzer tab + car spec form
        │   └── Loading.jsx          ← Animated F1 car spinner
        ├── pages/Dashboard.jsx      ← Main layout — coordinates hooks and components
        ├── utils/teamColors.js      ← Driver number → team hex color lookup
        └── App.jsx                  ← Root — renders Dashboard
```

### Backend Architecture Rules

- **`main.py`** — No business logic. Only `FastAPI()`, `add_middleware()`, `include_router()`.
- **`routes/`** — Thin handlers: validate input → call service → return response. No data logic.
- **`services/`** — All business logic, session loading, data transformation.
- **`models/`** — Pydantic schemas only. No logic.

### Frontend Architecture Rules

- **`services/api.js`** — The only file that calls `fetch()`. All other files import from here.
- **`hooks/`** — All state and data fetching. Components receive props only.
- **`components/`** — Pure display. No `fetch()`, no direct state mutation.

---

## API Reference

Interactive docs at **http://localhost:8000/docs** (auto-generated by FastAPI).

### Session Key Format

`{year}_{round_number}_{session_type_code}`

| Code | Session |
|---|---|
| `R` | Race |
| `Q` | Qualifying |
| `S` | Sprint |
| `FP1` / `FP2` / `FP3` | Practice |
| `SQ` | Sprint Qualifying |

**Example:** `2024_1_R` = 2024 Bahrain Grand Prix Race

### Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/years` | Available seasons (2018 → current year) |
| GET | `/api/sessions?year=2024` | Completed races for a year (future sessions excluded) |
| GET | `/api/session_init/{key}` | Combined: drivers + positions + track outline in one request |
| GET | `/api/drivers/{key}` | Driver list for a session |
| GET | `/api/location/{key}/{driver_number}` | GPS position time-series (downsampled every 2nd point) |
| GET | `/api/telemetry/{key}/{driver_number}` | Speed, throttle, brake, gear, RPM, DRS (every 5th point) |
| GET | `/api/positions/{key}` | Lap-by-lap race standings with lap numbers |
| GET | `/api/laps/{key}` | Lap times with tyre compound |
| GET | `/api/stints/{key}` | Tyre stint summary per driver |
| GET | `/api/pitstops/{key}` | Pit stop events with durations |
| GET | `/api/racing_line/{key}` | Ideal racing line from fastest lap + car spec scaling |

### Racing Line Parameters

```
GET /api/racing_line/2024_1_R?power_hp=300&weight_kg=1400&downforce=medium&tire=soft
```

| Param | Default | Description |
|---|---|---|
| `power_hp` | `1000` | Engine power (F1 baseline = 1000 hp) |
| `weight_kg` | `800` | Car weight (F1 baseline = 800 kg) |
| `downforce` | `medium` | `low` / `medium` / `high` |
| `tire` | `medium` | `soft` / `medium` / `hard` |

**Response:**
```json
{
  "line": [{ "x": 0, "y": 0, "speed": 284.3, "throttle": 98.0, "brake": false }],
  "braking_zones": [{ "x": 512, "y": 310 }],
  "apex_points": [{ "x": 490, "y": 340, "speed": 72.1 }],
  "max_speed": 321.5,
  "speed_mult": 0.847
}
```

---

## Quick Start

### Backend

```bash
cd backend
cp .env.example .env               # set FASTF1_CACHE_DIR and CORS_ORIGIN
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload          # http://localhost:8000
```

Or use the convenience script:
```bash
cd backend && bash start.sh
```

### Frontend

```bash
cd frontend
npm install
npm run dev                        # http://localhost:5173
```

> To point the frontend at a different backend, set `VITE_API_URL` in `frontend/.env`.

### Docker (full stack)

```bash
docker-compose up --build
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Default | Description |
|---|---|---|
| `FASTF1_CACHE_DIR` | `/tmp/fastf1_cache` | Where FastF1 stores downloaded session files |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed frontend origin |
| `MPLBACKEND` | `Agg` | Set in Docker — required for headless matplotlib |
| `PORT` | `8000` | Server port — Railway injects this at runtime |

### Frontend (`frontend/.env`)

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `http://localhost:8000` | Backend base URL |

**Never commit `.env` files.** Both are in `.gitignore`.

---

## Deployment

### Production Stack

| Service | Platform | Notes |
|---|---|---|
| Backend | Railway | Docker image, Railway injects `$PORT`, volume mount for FastF1 disk cache |
| Frontend | Vercel | Static Vite build, `vercel.json` routes all paths to `index.html` for SPA |

### Steps

1. Push the repo to GitHub
2. Railway: create a new project → deploy from GitHub → set env vars (`FASTF1_CACHE_DIR`, `CORS_ORIGIN`)
3. Vercel: import the repo → set root directory to `frontend` → add `VITE_API_URL` pointing at the Railway URL

### Performance Note

The first request to any session takes 10–30 seconds — FastF1 fetches and parses data from F1's timing servers. All subsequent requests for that session are instant (served from the in-memory LRU cache). On Railway the disk cache persists across deploys via a volume mount, so restarts don't require re-downloading.
