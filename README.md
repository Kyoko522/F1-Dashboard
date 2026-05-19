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

## Author

**Sheel Patel** — Computer Science graduate, Toronto Metropolitan University.
[Portfolio](https://sheelportfolio.vercel.app/) · [GitHub](https://github.com/Kyoko522)
