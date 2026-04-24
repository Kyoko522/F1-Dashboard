# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Backend
```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload   # entry point is backend/main.py, runs on http://localhost:8000
```
Or use the convenience script:
```bash
cd backend && bash start.sh
```

### Frontend
```bash
cd frontend
npm run dev      # dev server (Vite)
npm run build    # production build
npm run lint     # ESLint
npm run preview  # preview production build
```

## Architecture

This is a full-stack F1 telemetry replay dashboard.

**Data flow:** FastF1 (Python library) → FastAPI backend → React frontend

### Backend (`backend/`)

```
backend/
├── main.py              ← FastAPI app setup, middleware, router registration ONLY
└── app/
    ├── models/
    │   └── schemas.py   ← Pydantic response models for all endpoints
    ├── routes/
    │   ├── sessions.py  ← GET /api/sessions
    │   ├── drivers.py   ← GET /api/drivers, /api/session_init
    │   ├── telemetry.py ← GET /api/location, /api/telemetry
    │   └── race_data.py ← GET /api/positions, /api/laps, /api/stints, /api/pitstops
    ├── services/
    │   └── fastf1_service.py ← All FastF1 session loading, caching, data extraction
    └── ml/
        ├── data_loader.py   ← ML training data fetching only
        └── predictor.py     ← Race winner, lap time, pit strategy, championship models
```

- **`main.py`** — No business logic. Only: `FastAPI()`, `add_middleware()`, `include_router()`.
- **`services/fastf1_service.py`** — Thread-safe LRU cache of up to 5 sessions. Loading is slow (10–30s). Session keys: `{year}_{round}_{type_code}` (e.g. `2024_1_R`).

Key endpoints:
| Endpoint | Purpose |
|---|---|
| `GET /api/sessions?year=` | List sessions for a year |
| `GET /api/session_init/{session_key}` | Combined: drivers + positions + track outline |
| `GET /api/location/{session_key}/{driver_number}` | Full position time-series (downsampled) |
| `GET /api/telemetry/{session_key}/{driver_number}` | Car telemetry (speed, throttle, brake, gear, RPM, DRS) |

### Frontend (`frontend/src/`)

```
frontend/src/
├── services/api.js          ← ALL fetch() calls live here, nowhere else
├── hooks/
│   ├── useSessionData.js    ← Data fetching: sessions, drivers, locations, telemetry
│   └── usePlayback.js       ← Playback state, sessionBounds, currentTime
├── components/
│   ├── TrackCanvas.jsx      ← Canvas renderer (60fps rAF loop via refs)
│   ├── Leaderboard.jsx      ← Live standings panel
│   ├── TelemetryPanel.jsx   ← Speed/throttle/brake/gear/RPM/DRS panel
│   ├── PlaybackControls.jsx ← Play/pause, speed, seek slider
│   ├── DriverSelector.jsx   ← Driver list with track/TEL toggles
│   ├── SessionSelector.jsx  ← Year and race session pickers
│   └── Loading.jsx          ← Animated F1 car spinner
├── pages/Dashboard.jsx      ← Main layout, coordinates hooks and components
├── utils/teamColors.js      ← Driver number → team hex color lookup
└── App.jsx                  ← Thin root: just renders <Dashboard />
```

### Playback System

Animation uses wall-clock time (not frame counting), implemented in `usePlayback.js`:
- `playbackOffset` (ms) tracks how far into the session we are
- `sessionBounds` useMemo computes start/end timestamps from all loaded driver locations
- Race start is auto-detected by scanning the first 30% for the last stationary window (grid wait)
- `currentTime = sessionBounds.start + playbackOffset` (absolute ms)
- A `setInterval` every 50ms advances offset by `elapsed_wall_time × speed`
- TrackCanvas, TelemetryPanel, and Leaderboard all derive their state from `currentTime`

### Environment Variables

Copy `backend/.env.example` to `backend/.env` and fill in values. Never commit `.env`.

### Deployment

- Development: backend on `localhost:8000`, frontend Vite dev server
- Set `VITE_API_URL` in the frontend `.env` to switch between local and production
- Production: Docker + Railway (`https://f1-dashboard-production.up.railway.app`)
