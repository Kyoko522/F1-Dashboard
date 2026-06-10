# F1 Dashboard

[![CI](https://github.com/Kyoko522/f1-dashboard/actions/workflows/ci.yml/badge.svg)](https://github.com/Kyoko522/f1-dashboard/actions/workflows/ci.yml)
[![Python 3.11](https://img.shields.io/badge/python-3.11-blue.svg)](https://www.python.org/downloads/)
[![React 19](https://img.shields.io/badge/react-19-61dafb.svg)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-005571.svg)](https://fastapi.tiangolo.com/)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

A full-stack Formula 1 telemetry replay dashboard. Watch any race from 2018 onward with live driver positions on the track, real-time telemetry, a live leaderboard, and an AI-powered racing line analyzer — all synced to a scrubbable playback timeline.

**Live demo:** [f1-dashboard-production.up.railway.app](https://f1-dashboard-production.up.railway.app)
**Data source:** [FastF1](https://github.com/theOehrly/Fast-F1) — official F1 timing and telemetry feeds
**Architecture deep-dive:** [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — math, system design, and the why behind every decision

---

## Why I Built This

I've been a motorsport fan for as long as I can remember, and I've always wanted to understand a race the way an engineer on the pit wall does — not as a TV spectator. When I found FastF1 (the open-source library that exposes the same telemetry F1 teams use), I knew I wanted to build something on top of it.

The goal was twofold:

1. **Build something I'd genuinely use.** Every feature exists because I wanted it as a fan — a smooth replay, a live leaderboard that updates as the cars move, an analyzer that asks "what would my own car look like on this circuit?"
2. **Push my engineering across the full stack.** Not just gluing libraries together — actually engineering the hard parts: a 60fps canvas renderer, a thread-safe LRU cache with load deduplication, race-start detection from raw GPS, a physics-inspired speed scaling model for the racing line.

This isn't a tutorial project. Every piece of architecture is there for a reason that's documented either in code comments or in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

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

## Technical Highlights

A few pieces I'm proud of — full write-ups with code and math are in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

### 60fps Canvas Renderer With Zero React Re-renders
A single `requestAnimationFrame` loop reads live state through refs. The static track outline is pre-rendered to an offscreen canvas and blitted each frame — only the 20 car positions are drawn live. Sub-pixel linear interpolation between GPS samples keeps the cars smooth at any playback speed.

### Thread-safe LRU Cache with Load Deduplication
The backend uses a `threading.Event` per session key. If three users hit the same uncached session simultaneously, exactly one thread downloads; the other two wait on the event and read from cache. Prevents the thundering-herd problem on a 30-second cold load.

### Physics-Inspired Racing Line Scaling
The AI Race Line analyzer takes the fastest lap and scales its speed targets to your own car's specs using a closed-form multiplier:

$$\text{speed\_mult} = \left(\frac{P}{1000}\right)^{0.25} \cdot \left(\frac{800}{W}\right)^{0.15} \cdot D_{\text{downforce}} \cdot T_{\text{tire}}$$

The exponents approximate real drag-dominated relationships (drag $\propto v^2$, so top speed scales with the fourth root of power). The full derivation is in the architecture doc.

### Automatic Race-Start Detection
Replays would otherwise begin during the formation grid — minutes of stationary cars. A sliding-window algorithm in `usePlayback.js` scans the first 30% of GPS data, finds the last 5-second window where average car movement drops below 15 metres, and auto-seeks 8 seconds before that point. Runs client-side with no backend round-trip.

### Wall-clock Playback Engine
Playback uses real elapsed time, not frame counting. Drop a frame → next tick recomputes the offset from `Date.now()` and self-corrects. The animation stays accurate under tab throttling, GC pauses, and mid-playback speed changes.

---

## Skills Demonstrated

This project exercises the kind of engineering I want to do professionally — from system design through implementation to deployment.

| Area | What this project shows |
|---|---|
| **Full-stack engineering** | FastAPI + React + Docker + cloud deployment, all built and operated end-to-end |
| **System design** | Layered backend, two-tier cache, load deduplication, single-source-of-truth state model |
| **Performance** | 60fps canvas with 20 animated agents, server-side downsampling, offscreen rendering, $O(\log n)$ binary-search interpolation |
| **Concurrency** | Thread-safe cache, async route + sync service via `asyncio.to_thread`, event-based load deduplication |
| **Math & algorithms** | Race-start detection (sliding window), linear interpolation, apex detection (local minima), physics-inspired speed scaling |
| **API design** | REST API with auto-generated OpenAPI docs, combined endpoints to cut round-trips, downsampling for bandwidth |
| **Frontend craft** | Custom Canvas 2D rendering (no charting library), zero state management library, sub-70KB gzipped bundle |
| **DevOps / CI/CD** | GitHub Actions pipeline (lint + test + build + Docker), pre-commit hooks, automated deploys to Railway + Vercel |
| **Code quality** | Ruff + Prettier + ESLint enforced in CI, pytest suite, PR template, contributing guide |
| **Documentation** | Architecture deep-dive, contributing guide, inline rationale for every non-obvious decision |

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

### Request Lifecycle

What happens chronologically when a user picks a race — including the cache-miss branch and the lock acquisition that prevents the thundering herd.

```
User picks "2024 Bahrain GP"
   │
   ▼
Dashboard.handleSessionChange()                          [pages/Dashboard.jsx]
   │  resets driver locations, playback offset, fetch refs
   ▼
useSessionData → fetchSessionInit("2024_1_R")            [hooks/useSessionData.js]
   │
   ▼  HTTP GET /api/session_init/2024_1_R
FastAPI route handler                                    [routes/drivers.py]
   │
   ▼
fastf1_service.get_session_init()                        [services/fastf1_service.py]
   │
   ├─ acquire _lock ────────────────────────────────┐
   │                                                │
   │   cache HIT?  ── yes ──► return cached session │
   │       │                                        │
   │       no                                       │
   │       │                                        │
   │   another thread loading?                      │
   │       │                                        │
   │       ├─ yes ─► register as waiter             │
   │       │         release _lock                  │
   │       │         event.wait()        ← blocks   │
   │       │         re-acquire _lock               │
   │       │         return cached session          │
   │       │                                        │
   │       └─ no  ─► create threading.Event         │
   │                 release _lock                  │
   │                                                │
   │                 fastf1.get_session().load()    │   ← 10–30s (cold)
   │                 acquire _lock                  │
   │                 evict LRU if cache full        │
   │                 store in _session_cache        │
   │                 event.set()  ← wake waiters    │
   │                 release _lock                  │
   │                                                │
   ├────────────────────────────────────────────────┘
   │
   ▼
extract drivers + positions + track outline (one fastest lap)
   │
   ▼  JSON response
useSessionData setState                                  [hooks/useSessionData.js]
   │  drivers, positions, trackData populate React state
   ▼
TrackCanvas re-renders                                   [components/TrackCanvas.jsx]
   │  pre-renders static track outline to offscreen canvas
   │  starts requestAnimationFrame loop (reads via refs, never restarts)
   ▼
usePlayback computes sessionBounds                       [hooks/usePlayback.js]
   │  scans first 30% of GPS data for grid stationary window
   │  sets race start = last-still-window + 8s buffer
   ▼
Leaderboard + TelemetryPanel derive state from currentTime
   │
   ▼
60fps canvas animation begins
```

Key properties this sequence guarantees:

- **At most one downloader per session key** — the `_lock` + `threading.Event` pair makes concurrent requests for the same cold session share a single load.
- **Lock is never held during slow I/O** — the actual `fastf1.load()` runs *outside* the lock so other sessions can be served in parallel.
- **One round-trip, three datasets** — `/api/session_init` returns drivers, positions, and the track outline together. Saves two RTTs over fetching them separately.
- **Render loop never restarts** — `TrackCanvas` reads `currentTime`, `selectedDrivers`, and `driverLocations` through refs, so React state changes update the next frame without tearing down the rAF loop.

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

---

## CI / CD

Every push and pull request runs the [`CI` workflow](.github/workflows/ci.yml) on GitHub Actions. Three jobs run in parallel:

| Job | What it does |
|---|---|
| `backend` | Ruff lint + format check, then `pytest` (skips integration tests that hit FastF1) |
| `frontend` | ESLint, Prettier check, then `vite build` |
| `docker` | Builds the production Docker image to verify the Dockerfile still works |

Deployment is **continuous** — once CI passes on `main`, Railway and Vercel each auto-deploy from the same commit. There is no separate deploy workflow; the platforms watch the main branch directly.

### Running the checks locally

```bash
# Backend
cd backend
pip install -r requirements-dev.txt
ruff check . && ruff format --check . && pytest

# Frontend
cd frontend
npm ci
npm run lint && npm run format:check && npm run build
```

### Pre-commit hooks

Optional but recommended — runs the same checks before each commit so CI never has to catch a formatting issue.

```bash
pip install pre-commit
pre-commit install
```

Skip a single commit with `git commit --no-verify`. Run against the whole repo with `pre-commit run --all-files`.

### Pull request template

A [PR template](.github/PULL_REQUEST_TEMPLATE.md) is auto-loaded into every PR description, with a checklist that mirrors the CI jobs so reviewers know what's been verified.

---

## What's Next

Things I'd build next if I kept investing time:

- **Sector timing overlay** — colored sectors on the track showing where each driver is gaining or losing time relative to the leader's best lap. Requires resampling each sector to a common time base and computing per-sector deltas.
- **Head-to-head comparison mode** — pick two drivers, see their delta time visualized as a moving graph while the replay plays. Conceptually a second `usePlayback`-driven derivation, mathematically a running integral of speed differential.
- **Per-corner racing line overlay** — overlay every driver's actual line through a selected corner on the ideal line, so you can see where each driver took different cornering paths. Pure client-side once corner detection runs offline.
- **Frontend test suite** — add Vitest + React Testing Library for the hooks and the API service. The canvas-heavy components are harder to test cleanly but the data flow can be locked down.
- **Server-Sent Events for live races** — during a live grand prix weekend, push leaderboard deltas instead of requiring page reload. The cache architecture is already in place for this; just needs an SSE endpoint and a frontend hook.

---

## What I Learned Building This

A short, honest list:

- **Canvas + React is a delicate dance.** My first pass re-rendered React on every frame and dropped to 15fps. The refs-and-rAF pattern in `TrackCanvas` is the third rewrite; the first two taught me why.
- **Caches are easy. Cache *correctness* under concurrency is not.** The first version of the session cache had a textbook thundering-herd bug — three identical downloads firing in parallel. The `threading.Event` pattern is the fix and it's now my default for any expensive lazy load.
- **Wall-clock playback beats frame-counting playback every time.** I started with a frame counter and watched the animation drift seconds out of sync after a few minutes of tab-switching. Recomputing from `Date.now()` every tick was the simple fix I should have done from day one.
- **Server-side downsampling is free bandwidth.** Cutting telemetry samples by 5× at the API layer dropped initial load time noticeably without any visual difference. Trim where you serialize, not where you render.
- **Hand-rolled Canvas is sometimes the right call.** I evaluated D3 and Recharts before writing the renderer. They're great for what they do — but they're optimized for charts, not 20-agent realtime animation. Sometimes a charting library is more friction than it saves.
- **The boring infrastructure matters.** Setting up CI, pre-commit hooks, and a PR template took an afternoon and pays off forever. Skipping that work in earlier projects always cost me more than it saved.

---

## Project Documentation

| Doc | What's in it |
|---|---|
| [README.md](README.md) | This file — overview, features, setup, API reference |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Deep-dive: math, system design, concurrency, performance |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Dev setup, code style, PR workflow |
| [backend/README.md](backend/README.md) | Backend-specific: endpoints, schemas, caching |
| [frontend/README.md](frontend/README.md) | Frontend-specific: components, hooks, design decisions |
| [LICENSE](LICENSE) | MIT |

---

## Backend Source Code Reference

A file-by-file guide to every backend module. Written for someone reading the code for the first time — what each file does, what every endpoint accepts and returns, how the request travels from browser URL to data source and back, and why the code is shaped the way it is.

---

### Entry Point — `main.py`

**Single responsibility:** create the FastAPI app, configure middleware, and register the five route modules. No business logic lives here.

This file is intentionally a few lines of wiring. If you're looking for endpoint handlers or data processing, it's not here. Any PR that adds logic to `main.py` is wrong by definition.

**What it does:**
- Creates the `FastAPI()` app with title, description, and version — these appear at `/docs`
- Adds `CORSMiddleware` with wide-open settings (any origin, any method, any header)
- Registers five routers: `sessions`, `drivers`, `telemetry`, `race_data`, `racing_line`

**Health check**

```
GET /
```

Returns a JSON object confirming the API is alive and listing all registered endpoints. Useful for uptime monitoring and as a discoverable route directory.

```json
{
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
    "docs": "/docs"
  }
}
```

**Design note — CORS:** `allow_origins=["*"]` is intentionally permissive for a public portfolio demo. The `allow_credentials=False` setting is meaningful even with a wildcard origin — browsers will refuse to attach cookies or auth headers cross-origin, which is a real security boundary. In a production app with authenticated users you would lock `allow_origins` to the exact frontend domain.

---

## User Journey & Function Call Map

Each step below depends on data returned by the previous one. You cannot call `/api/telemetry` without a `session_key`. You cannot get a `session_key` without first calling `/api/sessions`. You cannot call `/api/sessions` without a year. Every user action unlocks the next.

---

**① User opens the app**

```
→ GET /api/years
→ sessions.py → api_get_years()
→ No service call — year list computed directly from datetime.now().year
→ Returns [2018, 2019, 2020, ..., 2026]
→ Frontend: year dropdown populates in SessionSelector
```

No network call to FastF1, no caching needed. The range starts at 2018 (earliest year FastF1 supports) and the upper bound updates on January 1 automatically.

---

**② User clicks a year (e.g. 2024)**

```
→ GET /api/sessions?year=2024&session_type=Race
→ sessions.py → api_get_sessions() → fastf1_service.get_sessions()
→ FastF1 fetches the full event schedule for 2024
→ Filters to completed Race sessions only (future dates are excluded)
→ Returns a list of sessions, each with a session_key like "2024_1_R"
→ Frontend: race list appears in SessionSelector
```

The `session_key` returned here — `"2024_1_R"`, `"2024_5_Q"`, etc. — is the dependency token that every subsequent call requires. Without completing this step the user has no key to pass forward.

`session_type` filters by event category, not a specific session slot. Valid values: `Race`, `Qualifying`, `Sprint`, `Practice 1`, `Practice 2`, `Practice 3`, `Sprint Qualifying`. Passing `session_type=Sprint` returns only the sprint race rounds, not every round on the calendar.

---

**③ User clicks a race (e.g. Bahrain 2024)**

```
→ GET /api/session_init/2024_1_R
→ drivers.py → api_session_init() → fastf1_service.get_session_init()
→ get_session_init() internally calls three functions against the same loaded session:
     get_drivers()        → reads session.results    → driver list
     get_positions()      → reads session.laps        → lap-by-lap standings
     get_track_outline()  → reads session.pos_data    → track shape from fastest lap
→ All three bundled into one response — one HTTP request instead of three
→ Returns { drivers: [...], positions: [...], track: [...] }
→ Frontend: TrackCanvas renders the track outline
            driver list populates in DriverSelector
            usePlayback detects race start and begins replay
```

Cold load: 10–30 seconds (FastF1 downloads from F1's official timing servers and writes to disk cache).
Warm load: ~50 ms (session already in the in-memory LRU cache).

---

**④ User picks a driver (e.g. Hamilton — #44)**

Two requests fire simultaneously:

```
→ GET /api/telemetry/2024_1_R/44
→ telemetry.py → api_get_telemetry() → fastf1_service.get_telemetry()
→ Reads session.car_data for driver 44, downsamples every 5th point
→ Returns speed, throttle, brake (0/100), gear, RPM, DRS
→ Frontend: TelemetryPanel renders all six channels synced to playback position

→ GET /api/location/2024_1_R/44
→ telemetry.py → api_get_location() → fastf1_service.get_location()
→ Reads session.pos_data for driver 44, downsamples every 3rd point
→ Returns X/Y coordinates with timestamps across the full session
→ Frontend: TrackCanvas adds the driver's moving dot to the 60fps animation
```

Both calls hit the same cached session — the second lookup costs ~5 ms from the LRU. Both use `asyncio.to_thread()` so they run concurrently and complete in parallel rather than sequentially.

---

**⑤ User views race breakdown (laps / stints / pit stops)**

Three requests fire:

```
→ GET /api/laps/2024_1_R
→ race_data.py → api_get_laps() → fastf1_service.get_laps()
→ Returns every lap time with tyre compound and stint number for every driver
   Optional filters: ?driver_number=44 or ?driver_number=44&lap_number=14

→ GET /api/stints/2024_1_R
→ race_data.py → api_get_stints() → fastf1_service.get_stints()
→ Groups laps by driver + compound, returns aggregated stint summary
   (compound, lap count, first lap, last lap per stint per driver)
   Optional filter: ?driver_number=44

→ GET /api/pitstops/2024_1_R
→ race_data.py → api_get_pitstops() → fastf1_service.get_pit_stops()
→ Filters laps where PitInTime is not null, computes duration in seconds
   Optional filter: ?driver_number=44
```

All three read the same cached session. Responses can arrive in any order; the frontend renders each independently.

---

**⑥ User switches to the AI Race Line tab**

```
→ GET /api/racing_line/2024_1_R
   (or with car specs: ?power_hp=300&weight_kg=1400&downforce=medium&tire=soft)
→ racing_line.py → api_get_racing_line() → racing_line_service.get_racing_line()
→ Calls _load_session() (hits LRU cache — no extra download)
→ Calls session.laps.pick_fastest() to identify the single fastest lap
→ Calls fastest.get_telemetry() to get per-point X/Y, speed, throttle, brake
→ Downsamples every 4th point, applies car-spec speed multiplier
→ Detects braking zone starts and apex points
→ Returns { line, braking_zones, apex_points, max_speed, speed_mult }
→ Frontend: RacingLineTab renders the speed-color-coded line with markers
```

Defaults are the F1 car baseline (1000 hp / 800 kg / medium / medium), giving `speed_mult=1.0` and unscaled real speeds. Entering your own car specs scales every speed value so you can see how your car would perform through the same corners.

---

### Dependency Chain

```
GET /api/years
    ↓  returns a year e.g. 2024
GET /api/sessions?year=2024
    ↓  returns a session_key e.g. "2024_1_R"
GET /api/session_init/2024_1_R
    ↓  loads session into cache, returns drivers + positions + track
    ↓  also unlocks all endpoints below — they require a valid session_key

GET /api/location/2024_1_R/44      needs session_key + driver_number
GET /api/telemetry/2024_1_R/44     needs session_key + driver_number
GET /api/laps/2024_1_R             needs session_key
GET /api/stints/2024_1_R           needs session_key
GET /api/pitstops/2024_1_R         needs session_key
GET /api/racing_line/2024_1_R      needs session_key
```

Calling any endpoint below session_init with a `session_key` the server has never loaded will trigger a cold 10–30 second load (or a 503 if the key is invalid). Calling with an invalid format (e.g. missing round number) returns a FastAPI 422 before any service code runs.

---

### Routes

All five route files follow the same pattern. Each handler:
1. Receives URL path and query parameters
2. Calls a service function inside `asyncio.to_thread()` so the blocking FastF1 call doesn't stall the event loop
3. Returns 503 if the service returns `None`, 500 if an unexpected exception escapes
4. Otherwise wraps the result in `{ "success": true, "count": N, "data": [...] }` and returns it

There is no data processing in any route file — if you see a `pandas` import in a route, something has gone wrong.

**Why `asyncio.to_thread`?** FastF1 is a synchronous library. Calling it directly inside an `async def` handler would block the ASGI event loop and stall every other in-flight request. `asyncio.to_thread()` pushes the blocking work onto a thread pool worker. With 20 parallel `/api/location` calls after session init, this turns a theoretical 600-second serial chain into a ~5-second parallel fan-out.

---

#### `app/routes/sessions.py`

Handles year listing and session filtering. Two endpoints, no service call for years.

---

**Years**
URL: `GET /api/years`
Required: none
Optional: none
Returns: `{ "success": true, "data": [2018, 2019, ..., 2026] }`
Errors: cannot fail under normal conditions
Chain: `browser → sessions.py:api_get_years → datetime.now() → return`

The year list is computed directly in the handler from the current system clock — no service call, no database. FastF1 has data from 2018 onward, so the range starts there. The upper bound is always the current year, meaning new seasons appear on January 1 automatically.

---

**Sessions**
URL: `GET /api/sessions?year=2024&session_type=Race`
Required: `year` — integer, the season (e.g. `2024`)
Optional: `session_type` — string, default `"Race"` — the event category to return
Returns: `{ "success": true, "count": 24, "data": [...] }`
Errors: `422` if `year` is missing or not an integer; `503` if FastF1 throws; `500` on unexpected crash
Chain: `browser → sessions.py:api_get_sessions → get_sessions() → fastf1.get_event_schedule(year) → return`

```json
{
  "success": true,
  "count": 24,
  "data": [
    {
      "session_key": "2024_1_R",
      "country_name": "Bahrain",
      "location": "Sakhir",
      "event_name": "Bahrain Grand Prix",
      "round_number": 1,
      "session_type": "Race",
      "session_type_code": "R"
    }
  ]
}
```

**What `session_type` means:** this is a filter by event category, not a slot label. Valid values are `Race`, `Qualifying`, `Sprint`, `Practice 1`, `Practice 2`, `Practice 3`, and `Sprint Qualifying`. The service scans the `Session1`–`Session5` columns of the FastF1 schedule and includes a round only if one of its slots matches the requested type. On a sprint weekend, `session_type=Sprint` returns only the sprint rounds — not all rounds.

**Future sessions are automatically excluded.** The service compares each session date against the current UTC time and silently skips any that haven't happened yet. The list for the current year grows as the season progresses.

---

#### `app/routes/drivers.py`

Handles the combined session-init call and the standalone driver list. Two endpoints.

---

**Session Init**
URL: `GET /api/session_init/2024_1_R`
Required: `session_key` — path param (see Session Key Format above)
Optional: none
Returns: `{ "success": true, "data": { drivers, positions, track } }`
Errors: `503` if session fails to load or data is missing; `500` on unexpected crash
Chain: `browser → drivers.py:api_session_init → get_session_init() → _load_session() → FastF1 → return`

```json
{
  "success": true,
  "data": {
    "drivers": [
      {
        "driver_number": 1,
        "full_name": "Max Verstappen",
        "team_name": "Red Bull Racing",
        "name_acronym": "VER"
      }
    ],
    "positions": [
      {
        "driver_number": 1,
        "position": 1,
        "lap_number": 1,
        "date": "2024-03-02T15:02:14.000000"
      }
    ],
    "track": [
      { "x": 263.5, "y": -1040.2 }
    ]
  }
}
```

This is the most important — and most expensive — endpoint in the backend. It triggers the session load (10–30s cold, ~50ms warm) and returns three datasets in one response, saving two round-trips. Everything the frontend needs to render the initial view arrives in this single call.

---

**Drivers**
URL: `GET /api/drivers/2024_1_R`
Required: `session_key`
Optional: none
Returns: `{ "success": true, "count": 20, "data": [...] }`
Errors: `503` if data unavailable; `500` on crash
Chain: `browser → drivers.py:api_get_drivers → get_drivers() → _load_session() → session.results → return`

The frontend does not call this in normal operation — driver data arrives via `session_init`. This endpoint exists for debugging or for consumers that need driver metadata without loading position data.

---

#### `app/routes/telemetry.py`

Handles GPS position and car telemetry per driver. Two endpoints.

---

**Location**
URL: `GET /api/location/2024_1_R/44`
Required: `session_key` (path), `driver_number` (integer path param)
Optional: none
Returns: `{ "success": true, "count": 12847, "data": [...] }`
Errors: `503` if driver not found in session; `500` on crash
Chain: `browser → telemetry.py:api_get_location → get_location() → _load_session() → session.pos_data → return`

```json
{
  "success": true,
  "count": 12847,
  "data": [
    { "x": 263.5, "y": -1040.2, "date": "2024-03-02T15:02:14.123456" }
  ]
}
```

Returns the driver's X/Y position sampled across the entire session. Data is downsampled to every 3rd point — reduces payload by ~67% with no visible loss because the frontend linearly interpolates between samples. The coordinate system is the F1 car reference frame: X/Y in metres relative to an arbitrary track origin, consistent across all endpoints.

---

**Telemetry**
URL: `GET /api/telemetry/2024_1_R/44`
Required: `session_key` (path), `driver_number` (integer path param)
Optional: none
Returns: `{ "success": true, "count": 9432, "data": [...] }`
Errors: `503` if driver not found in session; `500` on crash
Chain: `browser → telemetry.py:api_get_telemetry → get_telemetry() → _load_session() → session.car_data → return`

```json
{
  "success": true,
  "count": 9432,
  "data": [
    {
      "date": "2024-03-02T15:02:14.123456",
      "speed": 287,
      "throttle": 98,
      "brake": 0,
      "n_gear": 7,
      "rpm": 11234,
      "drs": 10
    }
  ]
}
```

Car telemetry sampled every 5th point (~4 Hz). `brake` is stored as `0` or `100` — the raw FastF1 value is a boolean, multiplied by 100 so the telemetry panel can render it as a percentage bar without special-casing. `drs` is the DRS status code from the F1 timing system: `10` = active, `8` = eligible but not deployed, `0` = off. The frontend treats any non-zero value as DRS on.

---

#### `app/routes/race_data.py`

Handles race-specific data: standings, lap times, tyre stints, and pit stops. Four endpoints. All accept an optional `driver_number` query param to filter to one driver.

---

**Positions**
URL: `GET /api/positions/2024_1_R`
Required: `session_key`
Optional: none
Returns: `{ "success": true, "count": 1092, "data": [...] }`
Errors: `503` if data unavailable; `500` on crash
Chain: `browser → race_data.py → get_positions() → _load_session() → session.laps → return`

```json
{
  "success": true,
  "count": 1092,
  "data": [
    {
      "driver_number": 1,
      "position": 1,
      "lap_number": 1,
      "date": "2024-03-02T15:02:14.000000"
    }
  ]
}
```

One entry per lap per driver, sorted by timestamp. The `date` field is the lap start time — the leaderboard binary-searches this to find each driver's latest recorded position at `currentTime`. `lap_number` drives the live lap counter displayed above the standings.

---

**Laps**
URL: `GET /api/laps/2024_1_R`
URL with filter: `GET /api/laps/2024_1_R?driver_number=1&lap_number=14`
Required: `session_key`
Optional: `driver_number` (integer, filter to one driver), `lap_number` (integer, filter to one lap)
Returns: `{ "success": true, "count": 1140, "data": [...] }`
Errors: `503` if data unavailable; `500` on crash
Chain: `browser → race_data.py → get_laps() → _load_session() → session.laps → return`

```json
{
  "success": true,
  "count": 1140,
  "data": [
    {
      "driver_number": 1,
      "lap_number": 14,
      "lap_time_seconds": 95.341,
      "compound": "SOFT",
      "tyre_life": 14,
      "stint": 1
    }
  ]
}
```

`compound` comes directly from FastF1: `"SOFT"`, `"MEDIUM"`, `"HARD"`, `"INTERMEDIATE"`, `"WET"`, or `null` if unavailable. Laps with no recorded `LapTime` are excluded from the response.

---

**Stints**
URL: `GET /api/stints/2024_1_R`
URL with filter: `GET /api/stints/2024_1_R?driver_number=1`
Required: `session_key`
Optional: `driver_number` (integer)
Returns: `{ "success": true, "count": 40, "data": [...] }`
Errors: `503` if data unavailable; `500` on crash
Chain: `browser → race_data.py → get_stints() → _load_session() → session.laps (grouped) → return`

```json
{
  "success": true,
  "count": 40,
  "data": [
    {
      "driver_number": 1,
      "stint": 1,
      "compound": "SOFT",
      "lap_count": 14,
      "first_lap": 1,
      "last_lap": 14
    }
  ]
}
```

A stint is a continuous run on one set of tyres. This endpoint aggregates the lap-level data — groups by driver + stint number + compound and counts laps. Each row represents one tyre stint for one driver.

---

**Pit Stops**
URL: `GET /api/pitstops/2024_1_R`
URL with filter: `GET /api/pitstops/2024_1_R?driver_number=44`
Required: `session_key`
Optional: `driver_number` (integer)
Returns: `{ "success": true, "count": 40, "data": [...] }`
Errors: `503` if data unavailable; `500` on crash
Chain: `browser → race_data.py → get_pit_stops() → _load_session() → session.laps → return`

```json
{
  "success": true,
  "count": 40,
  "data": [
    {
      "driver_number": 1,
      "lap_number": 14,
      "duration": 24.315,
      "compound": "MEDIUM"
    }
  ]
}
```

`duration` is `PitOutTime - PitInTime` in seconds. `compound` is the tyre fitted during this stop. If either time is missing from the raw data, `duration` is `null`.

---

#### `app/routes/racing_line.py`

Handles the AI racing line analyzer. Single endpoint.

---

**Racing Line**
URL: `GET /api/racing_line/2024_1_R`
URL with car specs: `GET /api/racing_line/2024_1_R?power_hp=300&weight_kg=1400&downforce=medium&tire=soft`
Required: `session_key`
Optional: `power_hp` (default `1000`), `weight_kg` (default `800`), `downforce` (default `"medium"`), `tire` (default `"medium"`)
Returns: `{ "success": true, "data": { line, braking_zones, apex_points, max_speed, speed_mult } }`
Errors: `503` if no fastest lap found or telemetry is missing; `500` on crash
Chain: `browser → racing_line.py → get_racing_line() → _load_session() → fastest lap telemetry → return`

```json
{
  "success": true,
  "data": {
    "line": [
      { "x": 263.5, "y": -1040.2, "speed": 284.3, "throttle": 98.0, "brake": false }
    ],
    "braking_zones": [{ "x": 512.1, "y": -890.3 }],
    "apex_points": [{ "x": 490.5, "y": -910.1, "speed": 72.1 }],
    "max_speed": 321.5,
    "speed_mult": 1.0
  }
}
```

At the default car spec (1000 hp / 800 kg / medium / medium), `speed_mult` is exactly `1.0` and speeds match the real fastest lap. Entering your own car's specs scales all speed values by the computed multiplier so you can see how a 200 hp road car would compare through the same corners.

Note: unlike the other route handlers, this one does not wrap the call in a `try/except` — if `get_racing_line()` returns `None` a 503 is raised, but unhandled exceptions propagate as FastAPI 500s directly.

---

### Services

Services are plain Python functions — no FastAPI imports, no HTTP concepts. Each one calls `_load_session()` to get a cached session, extracts the relevant DataFrame, and returns a list of dicts. They can be called from tests directly without a running server.

---

#### `app/services/fastf1_service.py`

**Single responsibility:** manage the session cache (load, evict, deduplicate concurrent requests) and extract data from loaded sessions.

This is the largest file in the backend at 300+ lines. The session loading and data extraction share it because they're tightly coupled — every extractor calls `_load_session()`, and splitting them across files would require importing a private function across module boundaries. The file comments note a potential future split into `session_cache.py` and `extractors.py`.

---

##### Three-Layer Caching

Every data request flows through `_load_session()`. Understanding this function is the key to understanding the whole backend's performance model.

```
Browser request arrives
        ↓
Layer 1: In-memory LRU (_session_cache dict, up to 5 sessions)
        ↓ miss
Layer 2: FastF1 disk cache (FASTF1_CACHE_DIR)
        ↓ miss
Layer 3: Download from F1's official timing servers (10–30s)
        ↓
Parsed session written to disk (layer 2) and memory (layer 1)
Next request for the same session: served in ~5 ms from layer 1
```

**Layer 1 — in-memory LRU (`_session_cache`)**

A plain Python `dict` holding up to 5 live `fastf1.core.Session` objects. Reading from this layer is instant — a dict lookup returns an object already in RAM. When a 6th session is loaded, the oldest entry (by insertion order) is evicted. All reads and writes are guarded by `_lock`.

**Layer 2 — FastF1 disk cache (`FASTF1_CACHE_DIR`)**

FastF1's own caching layer. On first load it downloads raw timing files from F1's servers and writes parsed files to disk. On repeat loads (even after a server restart) it reads from disk instead — this turns a 20–30 second network download into a 2–5 second disk read. Set via `FASTF1_CACHE_DIR` (default `/tmp/fastf1_cache`). On Railway a volume mount at this path keeps the cache alive across deploys.

**Layer 3 — F1 timing servers**

Only reached on the very first load of a session when the disk cache is empty. FastF1 fetches from F1's official timing feed. This is the 10–30 second cold load that users occasionally see.

**Load deduplication with `threading.Event`**

Without deduplication, three users requesting the same cold session simultaneously would trigger three parallel 30-second downloads. The fix is a second dict, `_session_events`, that maps session keys to `threading.Event` objects while loading is in progress.

The protocol:
1. Thread A acquires `_lock`, finds no cache hit and no event → creates an event, stores it in `_session_events`, releases `_lock`, starts downloading.
2. Thread B acquires `_lock`, finds the event → grabs a reference, sets `loader=False`, releases `_lock`, calls `event.wait()` and blocks.
3. Thread A finishes → acquires `_lock`, writes session to `_session_cache`, calls `event.set()` to wake all waiters, removes the event from `_session_events`.
4. Thread B wakes → acquires `_lock`, reads the session from `_session_cache`, returns it.

The actual FastF1 download happens outside the lock. The lock is only held during brief dict reads and writes, so other sessions can load in parallel while this one is downloading.

---

##### `_parse_key(session_key)`

Splits a session key string into `(year, round_number, session_type)`.

```
"2024_1_R"                 → (2024, 1, "R")
"2024_5_FP1"               → (2024, 5, "FP1")
"2024_6_Sprint_Qualifying" → (2024, 6, "Sprint_Qualifying")
```

Implementation: `parts = key.split("_"); return int(parts[0]), int(parts[1]), "_".join(parts[2:])`.

The `"_".join(parts[2:])` handles multi-word session types correctly. For `"2024_6_Sprint_Qualifying"`, splitting on `_` gives `["2024", "6", "Sprint", "Qualifying"]`, and rejoining `parts[2:]` gives back `"Sprint_Qualifying"` — exactly what FastF1 expects as the session identifier.

---

##### FastF1 Schedule Columns: Used vs Available

`fastf1.get_event_schedule(year)` returns a DataFrame with all of these columns. The service only reads a subset.

| Column | Used | Notes |
|---|---|---|
| `RoundNumber` | Yes | Filters out round 0 (pre-season testing), builds the session key |
| `Country` | Yes | Returned in the session list response |
| `Location` | Yes | City name, returned in the session list response |
| `EventName` | Yes | Short event name, returned in the session list response |
| `Session1`–`Session5` | Yes | Find which slot holds the requested `session_type` |
| `Session1Date`–`Session5Date` | Yes | Filter out sessions that haven't happened yet |
| `OfficialEventName` | Not used | Full official name e.g. `"Formula 1 Gulf Air Bahrain Grand Prix"` — could replace `EventName` for more formal display |
| `EventFormat` | Not used | `"conventional"` vs `"sprint_qualifying"` — could be forwarded to the frontend to show a sprint badge on those rounds |
| `EventDate` | Not used | Date of the last session (typically race day) — useful as a single display date alongside the event name |
| `Session1DateUtc`–`Session5DateUtc` | Not used | UTC dates for each session slot. The code uses `Session1Date` and calls `.tz_localize("UTC")` manually — switching to the UTC columns directly would simplify this |
| `F1ApiSupport` | **Not used** | **True/False — whether F1's own API has telemetry data for this event.** Older events and some test sessions have `F1ApiSupport=False`, meaning FastF1 will return empty or incomplete data. Today the frontend just gets a slow 503 with no explanation. Checking this column before loading and returning a warning field in the session list response would let the frontend show a "limited data" label instead. |

---

##### `get_sessions(year, session_type="Race")`

Calls `fastf1.get_event_schedule(year)`, drops round 0, then walks every `Session1`–`Session5` slot across all event rows. For each slot it checks: does the name match `session_type`? Is the date in the past? If both pass, it appends a result dict with the session key, country, location, event name, round number, session type, and type code. Returns `None` on exception.

---

##### `get_drivers(session_key)`

Calls `_load_session()`, reads `session.results` (the race results DataFrame from FastF1), and returns a list of driver dicts. Returns an empty list if the DataFrame is empty, `None` on exception.

---

##### `get_location(session_key, driver_number)`

Calls `_load_session()`, reads `session.pos_data[str(driver_number)]`, keeps only `X`, `Y`, and `Date`, drops rows with missing coordinates, takes every 3rd row, and returns `{x, y, date}` dicts. A full race has ~38,000 GPS samples per driver; keeping every 3rd gives ~12,700, which is enough for smooth interpolation at any playback speed.

---

##### `get_telemetry(session_key, driver_number)`

Calls `_load_session()`, reads `session.car_data[str(driver_number)]`, takes every 5th row, and extracts speed, throttle, brake, gear, RPM, and DRS. `brake` is cast from boolean to `int * 100` so the frontend can render it as a 0–100 value alongside throttle without special-casing. Returns `None` on exception.

---

##### `get_track_outline(session_key)`

Finds the single fastest lap across all drivers (excluding lap 1 to avoid formation-lap noise), then slices `session.pos_data` for that driver between the lap's start and end timestamps. Returns `{x, y}` points. Choosing lap 2+ avoids the zigzag GPS trace from cars queuing on the formation grid.

---

##### `get_session_init(session_key)`

Calls `get_drivers()`, `get_positions()`, and `get_track_outline()` in sequence, bundles the results, and returns them as `{ drivers, positions, track }`. All three calls hit `_load_session()`, but because the session is already in the LRU cache after the first call, no additional loading happens. This function exists purely to eliminate two round-trips — the frontend gets everything needed for the initial view in one HTTP call.

---

##### `get_positions(session_key)`

Reads `session.laps`, keeps `DriverNumber`, `Position`, `LapStartDate`, and `LapNumber`, drops rows with missing position or date, sorts by timestamp, and returns a list of dicts. Each row represents one driver's position at the start of one lap.

---

##### `get_laps(session_key, driver_number=None, lap_number=None)`

Reads `session.laps`, optionally filters by driver and/or lap number, drops laps with no recorded `LapTime`, and returns lap time, compound, tyre life, and stint number per lap.

---

##### `get_stints(session_key, driver_number=None)`

Groups `session.laps` by driver + stint number + compound and aggregates lap count, first lap, and last lap. Each row in the result represents one continuous tyre stint for one driver.

---

##### `get_pit_stops(session_key, driver_number=None)`

Filters `session.laps` to rows where `PitInTime` is not null. Duration is computed as `PitOutTime - PitInTime` in seconds. If `PitOutTime` is missing, duration is `null`.

---

#### `app/services/racing_line_service.py`

**Single responsibility:** extract the ideal racing line from the session's fastest lap and scale its speed values to match user-provided car specifications.

---

##### `get_racing_line(session_key, power_hp=1000, weight_kg=800, downforce="medium", tire="medium")`

1. Calls `_load_session()` to get the cached session — no extra download if `session_init` was already called.
2. Calls `session.laps.pick_fastest()` to identify the single fastest lap.
3. Calls `fastest.get_telemetry()` to get per-point X/Y position, speed, throttle, and brake.
4. Downsamples every 4th point — roughly 4–5 metres at race speeds, enough for a smooth visual trace.
5. Computes `speed_mult` from the car specs:

```
speed_mult = (power_hp / 1000)^0.25
           × (800 / weight_kg)^0.15
           × downforce_factor    [low=0.90, medium=1.0, high=1.08]
           × tire_factor         [soft=1.05, medium=1.0, hard=0.94]
```

The 0.25 exponent on power approximates the real drag relationship: aerodynamic drag scales with velocity squared, so top speed scales with roughly the fourth root of power. These are approximations tuned to give realistic-feeling results for typical road cars.

6. Detects braking zone starts: any point where `brake=True` and the previous point had `brake=False`.
7. Detects apex points: local speed minima — a point where speed is lower than its two nearest neighbours on each side, while not currently braking.
8. Returns the full point list, braking zone markers, apex markers, peak speed, and the computed `speed_mult`.

Returns `None` if there is no fastest lap, the lap has no telemetry, or an exception is raised.

**Important:** the racing line is not ML-generated or predicted. It is the actual GPS trace of the fastest lap driven in that session. The car-spec scaling is a physics-inspired formula applied to those real speed values. The "AI Race Line Analyzer" name is a product label, not a technical claim.

---

## Author

**Sheel Patel** — Computer Science graduate, Toronto Metropolitan University.
[Portfolio](https://sheelportfolio.vercel.app/) · [GitHub](https://github.com/Kyoko522)
