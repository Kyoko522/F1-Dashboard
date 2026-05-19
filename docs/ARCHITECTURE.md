# Architecture Deep-Dive

A walkthrough of how the F1 Dashboard works end-to-end — the system design, the math behind the race line analyzer, the performance optimizations that keep it at 60fps, and the trade-offs behind each choice.

This document is intentionally long. It's meant as a reference for anyone (including future-me) who wants to understand *why* the code is shaped the way it is, not just *what* it does.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Data Flow End-to-End](#2-data-flow-end-to-end)
3. [Backend Architecture](#3-backend-architecture)
4. [Frontend Architecture](#4-frontend-architecture)
5. [The Math Behind the Racing Line](#5-the-math-behind-the-racing-line)
6. [Performance Engineering](#6-performance-engineering)
7. [Concurrency Model](#7-concurrency-model)
8. [Trade-offs and Decisions](#8-trade-offs-and-decisions)

---

## 1. System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Browser (Client)                            │
│                                                                      │
│   ┌──────────────────┐    ┌──────────────────┐                      │
│   │  React UI Tree    │    │ Single rAF Loop  │  60 fps              │
│   │  (Dashboard.jsx)  │◄──►│ (TrackCanvas)    │  hand-drawn          │
│   └────────┬─────────┘    └──────────────────┘                      │
│            │                                                          │
│            ▼                                                          │
│   ┌──────────────────┐    ┌──────────────────┐                      │
│   │ useSessionData   │    │ usePlayback      │  wall-clock time     │
│   │ (data fetching)  │    │ (currentTime)    │  state machine       │
│   └────────┬─────────┘    └──────────────────┘                      │
│            │                                                          │
│            ▼                                                          │
│   ┌──────────────────────────────────────────┐                      │
│   │  services/api.js — single fetch source    │                      │
│   └──────────────────┬───────────────────────┘                      │
└──────────────────────┼──────────────────────────────────────────────┘
                       │  HTTP REST (JSON)
                       │
┌──────────────────────▼──────────────────────────────────────────────┐
│                      FastAPI Backend                                 │
│                                                                      │
│   ┌────────────────────────────────────────┐                        │
│   │  routes/    (thin async handlers)      │                        │
│   └────────────────┬───────────────────────┘                        │
│                    │                                                 │
│                    ▼                                                 │
│   ┌────────────────────────────────────────┐                        │
│   │  services/fastf1_service.py             │                        │
│   │    • Thread-safe LRU cache (5 sessions) │                        │
│   │    • Load deduplication (Event-based)   │                        │
│   │    • Data extraction & downsampling     │                        │
│   └────────────────┬───────────────────────┘                        │
│                    │                                                 │
│                    ▼                                                 │
│   ┌────────────────────────────────────────┐                        │
│   │  FastF1 library                         │                        │
│   │    • Downloads from official F1 feeds   │                        │
│   │    • Disk cache (FASTF1_CACHE_DIR)      │                        │
│   └────────────────────────────────────────┘                        │
└──────────────────────────────────────────────────────────────────────┘
```

The system has three layers from the data's perspective:

1. **Data source** — official F1 timing feeds, accessed via the [FastF1](https://github.com/theOehrly/Fast-F1) Python library. We never call F1's servers directly.
2. **Backend** — FastAPI service that owns the session cache, parses raw FastF1 dataframes into JSON, and exposes a clean REST API.
3. **Client** — React app that fetches once, animates locally. The backend doesn't stream — the client owns the playback timeline.

---

## 2. Data Flow End-to-End

Here's exactly what happens when a user opens the app, picks a race, and watches the replay:

```
User picks year + race
       │
       ▼
[Frontend] GET /api/session_init/2024_1_R
       │
       ▼
[Backend] fastf1_service._load_session("2024_1_R")
       │
       ├── Cache hit?  ──── yes ───► return cached object  (instant)
       │
       │   no
       ▼
   threading.Lock acquired
       │
       ├── Another thread loading?
       │      yes ──► get its Event, wait()  ──► return from cache when notified
       │
       │      no   ──► register Event, release lock, load it
       ▼
   FastF1: get_session(year, round, type)
       │
       ├── Files on disk?  yes ──► parse them (~2s)
       │
       │   no
       ▼
   Download from F1 servers (~20-30s)
       │
       ▼
   session.load(telemetry=True, laps=True)
       │
       ▼
   Acquire lock, insert into LRU dict
       │
       ├── len(cache) >= 5? ──► evict oldest entry
       │
       ▼
   Notify all waiters via Event.set()
       │
       ▼
   Return session object
       │
       ▼
[Backend] Extract drivers + positions + track outline, serialize to JSON
       │
       ▼
[Frontend] Receives ~200 KB response, parses, sets state
       │
       ▼
[Frontend] Parallel fetches: /api/location/{key}/{driver} × 20 drivers
       │
       ▼
[Frontend] usePlayback computes sessionBounds and race start
       │
       ▼
[Frontend] TrackCanvas starts its rAF loop, draws first frame
       │
       ▼
[Frontend] User sees grid; auto-advances 8 seconds before race start
       │
       ▼
   ── User presses play ──
       │
       ▼
[Frontend] setInterval advances playbackOffset every 50ms
       │
       ▼
[Frontend] currentTime = sessionBounds.start + offset
       │
       ▼
[Frontend] TrackCanvas binary-searches each driver's points, interpolates,
           draws on canvas. Leaderboard recomputes standings from currentTime.
```

The frontend pulls all the heavy data once, then runs the animation entirely client-side. The backend is stateless during playback.

---

## 3. Backend Architecture

### 3.1 Layered structure

The backend follows a strict three-layer pattern:

| Layer | Responsibility | What it doesn't do |
|---|---|---|
| `main.py` | Bootstrap FastAPI, wire middleware and routers | No request handling, no business logic |
| `app/routes/` | Validate request input, call a service, return JSON | No data transformations, no caching, no FastF1 calls |
| `app/services/` | All business logic — session caching, data extraction, transformation | No HTTP concerns (no `Request`, no status codes) |
| `app/models/` | Pydantic response schemas | No methods, no business logic |

This means a route handler is typically 5–10 lines, all error-handling boilerplate, with one line of actual work:

```python
@router.get("/positions/{session_key}")
async def api_get_positions(session_key: str):
    try:
        result = await asyncio.to_thread(get_positions, session_key)
        if result is None:
            raise HTTPException(status_code=503, detail="Failed to fetch positions")
        return {"success": True, "count": len(result), "data": result}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
```

Why so strict? Two reasons:

1. **It's testable.** Services are plain functions — no `Request`, no decorators. Tests don't need a TestClient just to verify business logic.
2. **It's mockable.** Need to test that the route handles a 503 correctly? Just mock the service to return `None`. No need to mock the HTTP layer.

### 3.2 Why `asyncio.to_thread`?

FastF1 is a synchronous library — its calls block the event loop. FastAPI is async-first, so naively calling `get_positions()` inside an async handler would freeze every other request until FastF1 finishes.

`asyncio.to_thread()` shoves the blocking call onto Python's default thread pool, freeing the event loop to handle other requests while FastF1 churns. With 20 concurrent driver-location requests, this is the difference between a 10-second response and a 30+ second one.

### 3.3 Two-tier cache

Session data is *expensive* — first load can take 30 seconds. We cache aggressively:

```
┌──────────────────────────────────────────┐
│ Tier 1: In-memory LRU (Python dict)      │
│   • 5 most recent sessions               │
│   • Live Python objects (no re-parsing)   │
│   • Lost on server restart                │
│   • Lookup: O(1)                          │
└──────────────────────────────────────────┘
                    │
                    │ miss
                    ▼
┌──────────────────────────────────────────┐
│ Tier 2: FastF1 disk cache (Parquet/JSON)  │
│   • Path: FASTF1_CACHE_DIR                │
│   • Persists across restarts              │
│   • Parsed on load (~2 seconds)           │
└──────────────────────────────────────────┘
                    │
                    │ miss
                    ▼
┌──────────────────────────────────────────┐
│ Tier 3: F1 timing servers (HTTPS)         │
│   • Source of truth                       │
│   • 20-30 second download                 │
└──────────────────────────────────────────┘
```

On Railway, the disk cache lives on a mounted volume so it survives deploys.

---

## 4. Frontend Architecture

### 4.1 Component hierarchy

```
<App>
 └─ <Dashboard>
     ├─ <SessionSelector>      (year + race pickers)
     ├─ <DriverSelector>       (driver list with track / TEL toggles)
     ├─ <TrackCanvas>          (60fps canvas — the centerpiece)
     ├─ <PlaybackControls>     (play / pause / speed / scrub)
     ├─ <Leaderboard>          (live standings + lap counter)
     ├─ <TelemetryPanel>       (speed / throttle / brake / gear / RPM / DRS)
     └─ <RacingLineTab>        (AI race line analyzer)
```

### 4.2 State ownership

Three hooks own all state. Components are pure renderers:

| Hook | Owns | Provides |
|---|---|---|
| `useSessionData` | sessions, drivers, locations, telemetry | the data |
| `usePlayback` | playing/paused, speed, offset | `currentTime`, controls |
| `useState` (local) | UI-only state (which tab is open, selected driver) | local concerns |

`currentTime` is the **single source of truth** for the entire UI. The leaderboard, telemetry panel, and track canvas all derive their display from `currentTime`. Change `currentTime` → everything updates consistently.

### 4.3 Why no Redux / Zustand / Context?

For a single-page app where almost all state is driven by `currentTime`, a state management library adds boilerplate without solving anything. Two hooks and prop drilling are cleaner than three libraries pretending they aren't there.

---

## 5. The Math Behind the Racing Line

This is the most interesting piece. The AI Racing Line Analyzer takes the fastest lap of a session and shows you what the ideal line would look like *if you were driving a different car*.

### 5.1 Baseline: extracting the ideal line

Step 1 is straightforward — let FastF1 find the fastest lap and pull its telemetry:

```python
fastest = session.laps.pick_fastest()
tel     = fastest.get_telemetry()    # X, Y, Speed, Throttle, Brake per sample
```

The result is ~500–800 points per lap (depending on circuit length) at roughly 4 samples per meter. We downsample by 4 to keep the visual smooth without overdrawing.

### 5.2 Scaling speed for a different car

The whole point of the analyzer is to ask *"how would my Honda Civic handle this track?"*. We don't simulate the physics from scratch — that would take a real lap simulator. Instead we scale the F1 speed targets using a physics-inspired multiplier:

$$
\text{speed\_mult} \;=\; \underbrace{\left(\frac{P}{1000}\right)^{0.25}}_{\text{power}} \;\times\; \underbrace{\left(\frac{800}{W}\right)^{0.15}}_{\text{weight}} \;\times\; \underbrace{D}_{\text{downforce}} \;\times\; \underbrace{T}_{\text{tire}}
$$

Where:

- $P$ = engine power in HP (F1 baseline: 1000)
- $W$ = car weight in kg (F1 baseline: 800)
- $D$ = downforce factor ∈ { 0.90, 1.00, 1.08 } for { low, medium, high }
- $T$ = tire factor ∈ { 1.05, 1.00, 0.94 } for { soft, medium, hard }

#### Why those exponents?

These aren't pulled from thin air — they approximate the real relationships:

- **Power → speed scales as roughly the fourth root** because at high speed you're fighting drag, and aerodynamic drag grows with $v^2$. Doubling power doesn't double top speed — it raises it by about $\sqrt[4]{2} \approx 1.19$, which matches real-world data on supercars vs. their hypercar counterparts.

- **Weight → speed scales much weaker** ($\sim$0.15 power) because top speed is dominated by drag, not mass. Mass matters far more for acceleration and cornering — but per-corner cornering simulation is out of scope here.

- **Downforce and tires** are flat multipliers because their effect is roughly linear in the regime we care about (street car → race car).

The result is a single scalar `speed_mult`. Every speed value on the ideal line is multiplied by it. So a 320 km/h F1 straight becomes a 95 km/h straight for a Civic with `speed_mult ≈ 0.30`.

### 5.3 Color mapping

Each segment of the line is colored by its (scaled) speed relative to the max speed for that car:

$$
\text{ratio} \;=\; \min\!\left(1,\, \max\!\left(0,\, \frac{v}{v_{\max}}\right)\right)
$$

Then mapped to red → yellow → green:

```
red   = ratio < 0.5  ?  255                 :  (1 - (ratio - 0.5) × 2) × 255
green = ratio < 0.5  ?  ratio × 2 × 255     :  255
blue  = 0
```

At ratio = 0 you get pure red, at 0.5 pure yellow (255, 255, 0), at 1.0 pure green.

### 5.4 Braking zone detection

A braking zone *start* is the first sample in a stretch where the driver is on the brake:

```python
for i in range(1, len(points)):
    if points[i].brake and not points[i-1].brake:
        braking_zones.append({"x": points[i].x, "y": points[i].y})
```

Simple, but it's exactly the moment a driver transitions from accelerating to braking. We mark these on the canvas with red dots so the user can see where each corner begins.

### 5.5 Apex detection

An apex is the point of minimum speed through a corner. We define one as a local speed minimum *while not braking* (the driver has already finished braking and is now turning):

$$
\text{apex}(i) \iff \neg b_i \wedge v_i < v_{i-1} \wedge v_i < v_{i+1} \wedge v_i < v_{i-2} \wedge v_i < v_{i+2}
$$

The two-neighbor check on each side filters out noise — a single dip wouldn't qualify, but a real corner minimum will. These are marked cyan on the canvas.

---

## 6. Performance Engineering

### 6.1 The 60fps canvas

This was the hardest part of the frontend. Naive React animation re-runs every component on every frame and the rAF queue fills up fast. The solution has three parts:

#### a) Refs for live data

The animation loop reads `currentTime`, `selectedDrivers`, and `driverLocations` through refs:

```jsx
const currentTimeRef       = useRef(currentTime)
const selectedDriversRef   = useRef(selectedDrivers)
const driverLocationsRef   = useRef(driverLocations)

useEffect(() => { currentTimeRef.current     = currentTime     }, [currentTime])
useEffect(() => { selectedDriversRef.current = selectedDrivers }, [selectedDrivers])
useEffect(() => { driverLocationsRef.current = driverLocations }, [driverLocations])
```

This way the rAF loop is set up *once* and lives for the entire session. React updates the refs whenever props change, but the loop itself never restarts.

#### b) Offscreen canvas for the track

The track outline doesn't move. There's no reason to redraw it 60 times a second. So we render it once to an offscreen canvas and blit it each frame:

```jsx
ctx.drawImage(offscreen, 0, 0)  // O(1), just a memory copy
// then draw the 20 car dots — 20 small arcs, also O(1)
```

The offscreen canvas is rebuilt only when `trackData` or canvas size changes — not on every frame.

#### c) Linear interpolation between samples

GPS data arrives at ~18Hz from FastF1 but the screen refreshes at 60Hz. To avoid jitter, we binary-search the two nearest points and linearly interpolate `(x, y)` for the exact `currentTime`:

```jsx
function interpolatePosition(points, currentTime) {
    // Binary search for the largest index with points[i].t <= currentTime
    let lo = 0, hi = points.length - 1
    while (lo < hi) {
        const mid = Math.floor((lo + hi + 1) / 2)
        if (points[mid].t <= currentTime) lo = mid; else hi = mid - 1
    }
    const p0 = points[lo]
    if (lo >= points.length - 1) return { x: p0.x, y: p0.y }
    const p1 = points[lo + 1]
    if (p1.t === p0.t) return { x: p0.x, y: p0.y }
    const alpha = Math.min(1, (currentTime - p0.t) / (p1.t - p0.t))
    return {
        x: p0.x + (p1.x - p0.x) * alpha,
        y: p0.y + (p1.y - p0.y) * alpha,
    }
}
```

Cost per car per frame: $O(\log n)$ binary search + 4 multiplications + 4 additions. With 20 cars × 60fps, that's 1200 lookups per second over arrays of ~6000 points each = ~15,600 comparisons per second. Negligible on any modern CPU.

### 6.2 Wall-clock playback engine

The animation runs on **wall-clock time**, not frame counting. A frame-counting loop drifts under load (a dropped frame = one tick lost). A wall-clock loop is self-correcting:

```jsx
const interval = setInterval(() => {
    const elapsed   = (Date.now() - animStartRef.current.wallTime) * speed
    const newOffset = animStartRef.current.offset + elapsed
    setPlaybackOffset(newOffset)
}, 50)
```

Every tick recomputes the offset from scratch based on actual elapsed wall time. Drop 10 frames? The next tick sees the gap and jumps the offset accordingly. The animation might skip a few interpolated positions but it doesn't fall behind.

### 6.3 Race-start detection

The replay would start during the formation grid (minutes of stationary cars). To skip past it, `usePlayback` runs an algorithm on the GPS data the first time it loads:

```
window_ms     = 5000      // sliding window 5 seconds wide
step_ms       = 500       // advance 500ms at a time
threshold_m   = 15        // metres of movement per car per window
scan_horizon  = 30% of session duration

for t in range(start, scan_horizon, step_ms):
    total_movement = 0
    for each driver:
        p0 = position at time t
        p1 = position at time t + window_ms
        total_movement += sqrt((p1.x - p0.x)² + (p1.y - p0.y)²)
    
    avg_per_car = total_movement / n_drivers
    
    if avg_per_car < threshold_m:
        race_start = t + window_ms   // last stationary window
```

The race start ends up being the time of the **last** window where the average driver moved less than 15 metres. Playback auto-seeks to 8 seconds before that point so the user sees the start, not three minutes of grid wait.

### 6.4 Coordinate transform

FastF1 returns positions in real-world coordinates (units of approximately 1/10th of a metre relative to the circuit's reference point). To draw on a canvas we need to fit them to pixels:

```
scale = min(W / (maxX - minX), H / (maxY - minY)) × 0.85    // 0.85 for margin
offX  = (W - (maxX - minX) × scale) / 2
offY  = (H - (maxY - minY) × scale) / 2

canvas_x = (x - minX) × scale + offX
canvas_y = (maxY - y) × scale + offY                         // flip Y for screen coords
```

Computed once when the canvas size changes. Aspect-ratio-preserving, with 15% padding.

### 6.5 Server-side downsampling

We don't ship raw FastF1 data to the browser — that would be megabytes per driver. We downsample at the API layer:

| Endpoint | Raw rate | Sent rate | Reduction |
|---|---|---|---|
| `/api/location` | ~18 Hz | Every 3rd point (~6 Hz) | 67% smaller |
| `/api/telemetry` | ~20 Hz | Every 5th point (~4 Hz) | 80% smaller |

The race replay only needs visual fidelity — 6Hz is more than enough when the interpolator runs at 60fps. Telemetry numbers update every 250ms, which is faster than the eye can read them anyway.

---

## 7. Concurrency Model

### 7.1 The thundering herd

Imagine three users hit `GET /api/session_init/2024_1_R` at the same time, with the session not in cache. Without protection:

- All three threads see an empty cache.
- All three start loading the session in parallel.
- FastF1 downloads the same files three times.
- Memory usage spikes.
- All three threads write to the dict.

That's a thundering herd. Bad in any system that fronts an expensive operation.

### 7.2 Solution: load deduplication via `threading.Event`

```python
_session_cache  = {}          # session_key → loaded session
_session_events = {}          # session_key → Event for in-progress load
_lock           = threading.Lock()

def _load_session(session_key):
    with _lock:
        if session_key in _session_cache:
            return _session_cache[session_key]   # fast path

        if session_key in _session_events:        # someone else loading
            event = _session_events[session_key]
            loader = False
        else:                                     # I'll load it
            event  = threading.Event()
            _session_events[session_key] = event
            loader = True

    if not loader:
        event.wait()                              # block until done
        with _lock:
            return _session_cache[session_key]

    # I am the loader
    try:
        session = fastf1.get_session(...)
        session.load(...)
        with _lock:
            if len(_session_cache) >= 5:
                evicted = next(iter(_session_cache))
                del _session_cache[evicted]
            _session_cache[session_key] = session
        return session
    finally:
        with _lock:
            if session_key in _session_events:
                _session_events[session_key].set()   # wake waiters
                del _session_events[session_key]
```

Three threads, one download, two get a free ride from the cache. The `finally` block is important — if the loader crashes, waiters are still notified (they'll find no cache entry and propagate the error, instead of hanging forever).

### 7.3 LRU eviction policy

A plain Python `dict` preserves insertion order since 3.7. We exploit that:

```python
if len(_session_cache) >= 5:
    evicted = next(iter(_session_cache))    # first inserted = oldest
    del _session_cache[evicted]
_session_cache[session_key] = session       # newly inserted = newest
```

We chose 5 as the cap by measuring memory: each loaded session is roughly 50–80 MB in RAM. Five sessions ≈ 400 MB max, which fits comfortably on Railway's smallest plan.

### 7.4 Async layer

FastAPI handlers are `async def`. They call `asyncio.to_thread(blocking_fn)` to push the synchronous FastF1 work onto Python's default thread pool. This lets the event loop keep handling other requests while one is waiting for I/O.

| Request type | Where the work runs |
|---|---|
| FastAPI route handler | Event loop (async) |
| `_load_session()` | Thread pool worker (sync) |
| FastF1 file I/O | Inside the same thread (sync) |
| `to_thread` itself | Hands work to the pool, awaits the future |

The thread pool is bounded (default: `min(32, cpu_count + 4)`), so we can't accidentally fork hundreds of FastF1 loads.

---

## 8. Trade-offs and Decisions

Every interesting system has a few decisions that aren't obvious until you've lived with them. Here are the ones in this project.

### 8.1 Why not WebSockets?

The replay never streams — once the session is loaded, the frontend has everything it needs. Adding a WebSocket would mean:

- Backend has to hold a live connection per client
- More complex error handling (reconnection, sequence numbers)
- No benefit because there's nothing to push

A simple REST API is the right tool. The animation runs locally; the network is involved exactly twice per session (init + per-driver location).

### 8.2 Why downsample on the server, not the client?

Pushing raw data to the client and downsampling there would waste bandwidth. The downsampling rate is a function of *visual fidelity*, not anything dynamic — the client can't make a better choice than the server can. So we trim on the way out.

### 8.3 Why no charting library?

D3, Chart.js, Recharts — all reasonable choices for graphs. But for the track map and racing line we need:

- Smooth 60fps animation of 20 sprites
- Sub-pixel interpolation
- A custom color gradient per pixel
- Multiple offscreen render targets

A general-purpose charting library would either prevent these or add layers of indirection. Hand-rolling the Canvas API is ~150 lines and does exactly what we need.

### 8.4 Why React 19 if we don't use server components?

React 19 ships with `useDeferredValue`, the new compiler hints, and reduced re-render overhead. Even without server components we benefit from the new scheduler. Vite handles the build, so there's no Next.js-specific lock-in.

### 8.5 Why Railway + Vercel instead of a single platform?

The backend needs a persistent disk for the FastF1 cache and a long-running process. The frontend is static files. Picking the right platform for each is cheaper, faster, and more reliable than forcing both onto one:

| Workload | Best fit | Why |
|---|---|---|
| FastAPI + FastF1 disk cache | Railway | Volume mounts, custom Docker, long-running |
| Static React build | Vercel | Free, global CDN, instant rollback |

Both auto-deploy from `main` after CI passes — different platforms, one pipeline.

### 8.6 Why a 5-session in-memory cache, not 50?

A 50-session cache would memory-pressure the smallest Railway plan and crash on first OOM. A 1-session cache would thrash any time two users disagree on which race they want.

5 is the sweet spot. It covers a single user comparing recent races, or a small group of users on different sessions, without ever risking OOM. If traffic ever justifies more memory, the cap is a one-line change.

---

## Closing Thoughts

The hardest parts of this project weren't the F1 data or the React rendering — those are well-trodden ground. The hardest parts were:

- Making the cache **correct** under concurrent load (thundering herd → deduplication)
- Making the canvas **smooth** under React's reconciliation model (refs + offscreen + rAF)
- Making the playback **honest** about wall time, not frame count (drift-resistant)
- Choosing what **not** to build (no WebSockets, no Redux, no chart library)

The code that ships is the code that survived being torn down twice. Most of the cleverness in here is the cleverness of restraint.
