# F1 Dashboard — Backend

FastAPI backend serving F1 telemetry, session data, and AI racing line analysis via the FastF1 library.

**Stack:** FastAPI · Uvicorn · FastF1 · pandas · Pydantic v2 · pytest · ruff
**Hosted on:** Railway (Docker)
**Architecture deep-dive:** [`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md)

---

## Quick Start

```bash
cd backend
cp .env.example .env        # set FASTF1_CACHE_DIR and CORS_ORIGIN
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt -r requirements-dev.txt
uvicorn main:app --reload   # runs on http://localhost:8000
```

Or use the convenience script:
```bash
bash start.sh
```

Interactive API docs: **http://localhost:8000/docs**

> The `-r requirements-dev.txt` is only needed if you plan to run tests or linting. Production Docker builds only pull `requirements.txt`.

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

---

## Testing

The test suite uses **pytest** with two markers to separate fast unit tests from slow network-dependent ones.

```bash
pytest                          # everything except integration
pytest -m "not integration"     # what CI runs — no network calls
pytest -m integration           # FastF1 tests (slow, hits real F1 data)
pytest tests/test_app.py -v     # one file, verbose
pytest -k "schema"              # tests matching a substring
```

| File | What it covers |
|---|---|
| `tests/test_app.py` | Smoke tests against the FastAPI app — root endpoint, OpenAPI doc, route registration, 422 on missing query params |
| `tests/test_schemas.py` | Pydantic validation — pins response shapes so accidental schema changes fail loudly |
| `tests/conftest.py` | Shared fixtures (`TestClient` bound to the production `app`) |

### Why the marker split

FastF1 integration tests need real session data, which means hitting F1's servers and waiting 20–30 seconds. Running them in CI on every commit would be slow and brittle (external service outages → red builds). They live under `@pytest.mark.integration` and you can run them manually before any release.

---

## Linting and Formatting

Both handled by **Ruff** (configured in `pyproject.toml`):

```bash
ruff check .              # lint
ruff check --fix .        # lint + auto-fix
ruff format .             # format
ruff format --check .     # check only (used by CI)
```

The ruleset enables:

- `E`, `W` — pycodestyle errors and warnings
- `F` — pyflakes (unused imports, undefined names, etc.)
- `I` — isort (import ordering)
- `B` — flake8-bugbear (likely bugs)
- `UP` — pyupgrade (modern Python idioms)
- `SIM` — flake8-simplify (over-complex constructs)

CI fails on any error. Format check is also enforced in CI.

---

## Performance Characteristics

| Operation | Cold | Warm | Notes |
|---|---|---|---|
| First load of a session | 20–30s | — | FastF1 downloads + parses from F1 servers |
| Repeat load (same session) | — | ~5ms | Served from in-memory LRU cache |
| `/api/session_init` (cold) | 25–35s | ~50ms | Single call returns drivers + positions + track |
| `/api/location` (cold) | 5–10s | ~20ms | Per driver; called 20× in parallel after init |
| `/api/telemetry` (cold) | 3–8s | ~15ms | Per driver; called on demand |
| `/api/racing_line` (cold) | 2–5s | ~30ms | Uses cached session, extracts fastest lap |

**Concurrency model:** the LRU cache is thread-safe with `threading.Event`-based load deduplication. If three users request the same uncached session simultaneously, only one download happens — the other two wait on the event and read from cache. See `app/services/fastf1_service.py:_load_session`.

**Memory footprint:** each loaded session occupies roughly 50–80 MB of RAM. The cache caps at 5 sessions ≈ ~400 MB max, which fits comfortably on Railway's smallest plan.

---

## Architecture Rationale

### Why the strict three-layer split?

Routes are 5–10 lines of HTTP boilerplate around a single service call. Services are plain functions that know nothing about HTTP. Models are dumb shape-only Pydantic classes.

This split exists for two reasons:

1. **Testability** — services have no `Request`, no decorators, no FastAPI imports. A test can call them as plain functions. Routes are tested through `TestClient` purely to verify the HTTP plumbing.
2. **Mockability** — to test that `/api/positions` returns 503 when the data layer fails, you just patch `get_positions` to return `None`. No mocking of FastAPI internals.

### Why `asyncio.to_thread`?

FastF1 is synchronous. Calling it from an `async def` handler would block the event loop and stall every other request. `asyncio.to_thread()` pushes the blocking work onto Python's default thread pool, freeing the event loop to handle other requests. With 20 parallel driver-location requests after session init, this turns a 30-second response into a 5-second one.

### Why cache 5 sessions?

Measured. Each session is 50–80 MB. 5 × 80 MB = 400 MB peak. Below Railway's smallest plan limit, generous enough that a single user comparing two recent races never thrashes, and adjustable in one line if traffic justifies more memory.

### Why downsample every Nth point?

The frontend interpolates between samples, so the visual fidelity tops out around 6Hz for positions and 4Hz for telemetry. Anything denser is wasted bytes. The location endpoint downsamples by 3, telemetry by 5 — saves roughly 70–80% of payload size with no visible difference.

Full details on every decision: [`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md).
