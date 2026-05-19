# F1 Dashboard — Frontend

React + Vite frontend that renders the F1 race replay. Talks to the FastAPI backend over a simple REST API and draws all 20 cars onto an HTML canvas at 60fps.

**Stack:** React 19 · Vite 7 · Canvas API · Zero charting libraries · Zero state management libraries

---

## What This Module Owns

Everything you see in the browser:

- The session picker (year + race)
- The track canvas where the cars move
- The live leaderboard and lap counter
- The driver telemetry panel
- The AI Race Line tab
- Playback controls and the scrub bar

It does **not** own any race data — that all lives in the backend's FastF1 session cache. The frontend fetches once per session and animates locally.

---

## Architecture

```
src/
├── App.jsx                  → thin root, renders <Dashboard />
├── main.jsx                 → React entry point
│
├── pages/
│   └── Dashboard.jsx        → top-level layout, coordinates hooks + components
│
├── hooks/
│   ├── useSessionData.js    → fetches sessions, drivers, locations, telemetry
│   └── usePlayback.js       → playback state, race-start detection, currentTime
│
├── services/
│   └── api.js               → ALL fetch() calls live here, nowhere else
│
├── components/              → pure display, receive props, no fetch, no business logic
│   ├── TrackCanvas.jsx      → 60fps canvas renderer (rAF loop via refs)
│   ├── Leaderboard.jsx      → live standings + lap counter
│   ├── TelemetryPanel.jsx   → speed/throttle/brake/gear/RPM/DRS panel
│   ├── PlaybackControls.jsx → play/pause, speed selector, seek slider
│   ├── DriverSelector.jsx   → driver list with track / TEL toggles
│   ├── SessionSelector.jsx  → year and race session pickers
│   ├── RacingLineTab.jsx    → AI Race Line analyzer + car spec form
│   └── Loading.jsx          → animated F1 car spinner
│
└── utils/
    └── teamColors.js        → driver number → team hex color lookup
```

### Architecture rules

| Rule | Why |
|---|---|
| **Only `services/api.js` calls `fetch()`** | Every network call goes through one file. Easy to mock for tests, easy to swap base URLs. |
| **Hooks own all state and side effects** | Components stay pure — receive props, render. Makes them trivially testable. |
| **Components never mutate state directly** | They emit events; hooks decide what to do. Standard one-way data flow. |
| **`utils/` has no React** | Pure functions only. Imported anywhere without coupling to the render tree. |

---

## Key Design Decisions

### 60fps Canvas with zero React re-renders

The track renderer is a single `requestAnimationFrame` loop that reads the latest values through refs. React props update the refs but never restart the loop. The static track outline is pre-rendered to an offscreen canvas and blitted each frame — only the car positions are drawn live. This keeps the animation pinned to 60fps with all 20 cars on screen and no React reconciliation overhead.

See `components/TrackCanvas.jsx`.

### Wall-clock playback engine

A `setInterval` fires every 50ms and computes `elapsed = (Date.now() - start) × speed`. The playback offset advances by that exact amount each tick, so the animation stays synchronized regardless of frame drops or tab throttling. Speed changes mid-playback simply update the multiplier — no re-sync needed.

See `hooks/usePlayback.js`.

### Sub-pixel position interpolation

GPS samples arrive at ~18Hz from FastF1. Between samples, `TrackCanvas` binary-searches the two nearest points and linearly interpolates `(x, y)` for the exact `currentTime`. Cars glide smoothly even at 10× playback speed instead of jumping between sample points.

### Automatic race-start detection

Replays normally start during the grid wait — minutes of stationary cars before lights out. `usePlayback.js` scans the first 30% of GPS data in a sliding 5-second window. The last window where all cars are stationary is treated as the grid; playback auto-seeks to 8 seconds before that point. No backend round-trip, no hardcoded timestamps.

### Combined session-init call

`/api/session_init/{key}` returns drivers, lap positions, and the track outline in one request instead of three. Cuts perceived page-load time from three round-trips to one.

---

## Running Locally

```bash
npm install
npm run dev          # http://localhost:5173
```

The dev server defaults to `http://localhost:8000` for the backend. To point at a different backend, create `frontend/.env`:

```
VITE_API_URL=https://your-backend.example.com
```

---

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | ESLint across the project |
| `npm run format` | Prettier — write |
| `npm run format:check` | Prettier — check only (used by CI) |

---

## Production Build & Deployment

```bash
npm run build
```

Outputs static assets to `dist/`. Deployed on **Vercel** — the root `vercel.json` rewrites all paths to `index.html` for the SPA. Auto-deploys on every push to `main` once CI passes.

---

## What's Notable About This Frontend

- **No charting library.** The track map, leaderboard, telemetry panel, and racing line analyzer are all hand-drawn with the Canvas 2D API.
- **No state management library.** React hooks only — no Redux, Zustand, or Context.
- **No UI component library.** All inline styles, semantic HTML.
- **No `react-router`.** Everything fits in one page.

This is deliberate. The app is fast, the bundle is small (~70 KB gzipped), and there are fewer moving parts to debug.
