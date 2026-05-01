// RacingLineTab — AI racing line analyzer. Derives the ideal line from the fastest F1 lap
// and scales speed/braking zones to the user's car specifications.

import { useState, useEffect, useRef } from "react"
import { fetchRacingLine } from "../services/api"

// Speed → RGB color: red (slow) → yellow → green (fast)
function speedToColor(speed, maxSpeed) {
    const r = Math.min(1, Math.max(0, speed / (maxSpeed || 1)))
    const red   = r < 0.5 ? 255 : Math.round((1 - (r - 0.5) * 2) * 255)
    const green = r < 0.5 ? Math.round(r * 2 * 255) : 255
    return `rgb(${red},${green},0)`
}

function buildTransform(points, W, H) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
    for (const p of points) {
        if (p.x < minX) minX = p.x
        if (p.x > maxX) maxX = p.x
        if (p.y < minY) minY = p.y
        if (p.y > maxY) maxY = p.y
    }
    const scale = Math.min(W / (maxX - minX), H / (maxY - minY)) * 0.85
    const offX = (W - (maxX - minX) * scale) / 2
    const offY = (H - (maxY - minY) * scale) / 2
    return (x, y) => ({
        cx: (x - minX) * scale + offX,
        cy: (maxY - y) * scale + offY,
    })
}

const INPUT_STYLE = {
    background: "#0a0a1a",
    color: "white",
    border: "1px solid #333",
    borderRadius: "4px",
    padding: "6px 10px",
    fontFamily: "monospace",
    fontSize: "13px",
    width: "100%",
    boxSizing: "border-box",
}

const LABEL_STYLE = {
    color: "#aaa",
    fontSize: "11px",
    marginBottom: "4px",
    display: "block",
    letterSpacing: "0.5px",
}

export default function RacingLineTab({ selectedSession, trackData, mobile }) {
    const canvasRef  = useRef(null)
    const containerRef = useRef(null)
    const [canvasW, setCanvasW] = useState(700)

    const [carSpecs, setCarSpecs] = useState({
        power_hp: 300,
        weight_kg: 1400,
        downforce: "medium",
        tire: "medium",
        car_name: "",
    })
    const [racingLine, setRacingLine] = useState(null)
    const [loading, setLoading]       = useState(false)
    const [error, setError]           = useState(null)

    useEffect(() => {
        const observer = new ResizeObserver(entries => {
            const w = Math.round(entries[0].contentRect.width)
            if (w > 0) setCanvasW(w)
        })
        if (containerRef.current) observer.observe(containerRef.current)
        return () => observer.disconnect()
    }, [])

    // Redraw canvas whenever data or size changes
    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas || !racingLine) return
        const { line, braking_zones, apex_points, max_speed } = racingLine
        if (!line.length) return

        const W = canvasW
        const H = Math.round(W * 0.55)
        canvas.width  = W
        canvas.height = H
        const ctx = canvas.getContext("2d")
        ctx.fillStyle = "#0a0a1a"
        ctx.fillRect(0, 0, W, H)

        const toCanvas = buildTransform(line, W, H)

        // Draw track outline (gray) if available
        if (trackData && trackData.length > 1) {
            ctx.beginPath()
            ctx.strokeStyle = "#333"
            ctx.lineWidth = 8
            trackData.forEach((p, i) => {
                const { cx, cy } = toCanvas(p.x, p.y)
                i === 0 ? ctx.moveTo(cx, cy) : ctx.lineTo(cx, cy)
            })
            ctx.stroke()
        }

        // Draw racing line segments colored by speed
        for (let i = 1; i < line.length; i++) {
            const p0 = toCanvas(line[i - 1].x, line[i - 1].y)
            const p1 = toCanvas(line[i].x, line[i].y)
            ctx.beginPath()
            ctx.strokeStyle = speedToColor(line[i].speed, max_speed)
            ctx.lineWidth = 3
            ctx.moveTo(p0.cx, p0.cy)
            ctx.lineTo(p1.cx, p1.cy)
            ctx.stroke()
        }

        // Braking zone markers (red circles)
        for (const bz of braking_zones) {
            const { cx, cy } = toCanvas(bz.x, bz.y)
            ctx.beginPath()
            ctx.arc(cx, cy, 5, 0, Math.PI * 2)
            ctx.fillStyle = "#ff2200"
            ctx.fill()
        }

        // Apex markers (cyan circles)
        for (const ap of apex_points) {
            const { cx, cy } = toCanvas(ap.x, ap.y)
            ctx.beginPath()
            ctx.arc(cx, cy, 4, 0, Math.PI * 2)
            ctx.fillStyle = "#00cfff"
            ctx.fill()
        }
    }, [racingLine, canvasW, trackData])

    const analyze = async () => {
        if (!selectedSession) return
        setLoading(true)
        setError(null)
        try {
            const data = await fetchRacingLine(selectedSession.session_key, {
                power_hp:  carSpecs.power_hp,
                weight_kg: carSpecs.weight_kg,
                downforce: carSpecs.downforce,
                tire:      carSpecs.tire,
            })
            if (data?.data) setRacingLine(data.data)
            else setError("No racing line data returned. The session may still be loading.")
        } catch {
            setError("Failed to reach the backend. Is the server running?")
        } finally {
            setLoading(false)
        }
    }

    const spec = (key, value) => setCarSpecs(prev => ({ ...prev, [key]: value }))

    const canvasH = Math.round(canvasW * 0.55)

    return (
        <div style={{ color: "white", fontFamily: "monospace" }}>

            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                <h3 style={{ color: "#e10600", margin: 0, fontSize: mobile ? "14px" : "18px", letterSpacing: "2px" }}>
                    AI RACE LINE ANALYZER
                </h3>
                {racingLine && (
                    <span style={{ fontSize: "11px", color: "#555" }}>
                        speed ×{racingLine.speed_mult} vs F1 baseline
                    </span>
                )}
            </div>

            {!selectedSession && (
                <div style={{ color: "#555", textAlign: "center", padding: "40px 0", fontSize: "14px" }}>
                    Select a race session above to analyze its racing line.
                </div>
            )}

            {selectedSession && (
                <div style={{ display: "flex", gap: "16px", flexDirection: mobile ? "column" : "row" }}>

                    {/* ── Car spec form ─────────────────────────────────── */}
                    <div style={{ width: mobile ? "100%" : "220px", flexShrink: 0, background: "#16213e", borderRadius: "8px", padding: "14px" }}>
                        <div style={{ color: "#e10600", fontSize: "12px", letterSpacing: "1px", marginBottom: "14px", fontWeight: "700" }}>
                            CAR SPECIFICATIONS
                        </div>

                        <div style={{ marginBottom: "12px" }}>
                            <label style={LABEL_STYLE}>CAR NAME (optional)</label>
                            <input
                                style={INPUT_STYLE}
                                placeholder="e.g. Honda Civic"
                                value={carSpecs.car_name}
                                onChange={e => spec("car_name", e.target.value)}
                            />
                        </div>

                        <div style={{ marginBottom: "12px" }}>
                            <label style={LABEL_STYLE}>POWER — {carSpecs.power_hp} HP</label>
                            <input
                                type="range" min="80" max="1200" step="10"
                                value={carSpecs.power_hp}
                                onChange={e => spec("power_hp", parseInt(e.target.value))}
                                style={{ width: "100%", accentColor: "#e10600" }}
                            />
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "#555" }}>
                                <span>80 hp</span><span>1200 hp</span>
                            </div>
                        </div>

                        <div style={{ marginBottom: "12px" }}>
                            <label style={LABEL_STYLE}>WEIGHT — {carSpecs.weight_kg} kg</label>
                            <input
                                type="range" min="400" max="2500" step="25"
                                value={carSpecs.weight_kg}
                                onChange={e => spec("weight_kg", parseInt(e.target.value))}
                                style={{ width: "100%", accentColor: "#e10600" }}
                            />
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "#555" }}>
                                <span>400 kg</span><span>2500 kg</span>
                            </div>
                        </div>

                        <div style={{ marginBottom: "12px" }}>
                            <label style={LABEL_STYLE}>DOWNFORCE LEVEL</label>
                            <select
                                style={INPUT_STYLE}
                                value={carSpecs.downforce}
                                onChange={e => spec("downforce", e.target.value)}
                            >
                                <option value="low">Low (street car / drag strip)</option>
                                <option value="medium">Medium (GT / track day)</option>
                                <option value="high">High (F1 / formula car)</option>
                            </select>
                        </div>

                        <div style={{ marginBottom: "16px" }}>
                            <label style={LABEL_STYLE}>TIRE COMPOUND</label>
                            <select
                                style={INPUT_STYLE}
                                value={carSpecs.tire}
                                onChange={e => spec("tire", e.target.value)}
                            >
                                <option value="soft">Soft (slick / race tire)</option>
                                <option value="medium">Medium (semi-slick)</option>
                                <option value="hard">Hard (street / all-season)</option>
                            </select>
                        </div>

                        <button
                            onClick={analyze}
                            disabled={loading}
                            style={{
                                width: "100%",
                                padding: "10px",
                                background: loading ? "#333" : "#e10600",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                cursor: loading ? "not-allowed" : "pointer",
                                fontFamily: "monospace",
                                fontWeight: "700",
                                fontSize: "13px",
                                letterSpacing: "1px",
                            }}
                        >
                            {loading ? "ANALYZING..." : "ANALYZE LINE"}
                        </button>

                        {error && (
                            <div style={{ marginTop: "10px", color: "#ff6666", fontSize: "11px" }}>{error}</div>
                        )}

                        {/* Legend */}
                        {racingLine && (
                            <div style={{ marginTop: "16px", borderTop: "1px solid #333", paddingTop: "12px" }}>
                                <div style={{ fontSize: "11px", color: "#aaa", marginBottom: "8px", letterSpacing: "0.5px" }}>LEGEND</div>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                                    <div style={{ width: "32px", height: "4px", background: "linear-gradient(to right, #ff0000, #ffff00, #00ff00)", borderRadius: "2px" }} />
                                    <span style={{ fontSize: "11px", color: "#aaa" }}>Speed (slow → fast)</span>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                                    <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#ff2200", flexShrink: 0 }} />
                                    <span style={{ fontSize: "11px", color: "#aaa" }}>Braking zone start</span>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#00cfff", flexShrink: 0 }} />
                                    <span style={{ fontSize: "11px", color: "#aaa" }}>Apex (min speed)</span>
                                </div>
                                <div style={{ marginTop: "10px", fontSize: "11px", color: "#555" }}>
                                    Max speed: <span style={{ color: "#00ff00" }}>{racingLine.max_speed} km/h</span>
                                </div>
                                <div style={{ fontSize: "11px", color: "#555" }}>
                                    Braking zones: <span style={{ color: "#ff2200" }}>{racingLine.braking_zones.length}</span>
                                </div>
                                <div style={{ fontSize: "11px", color: "#555" }}>
                                    Apex points: <span style={{ color: "#00cfff" }}>{racingLine.apex_points.length}</span>
                                </div>
                            </div>
                        )}

                        {/* Custom track image — coming soon */}
                        <div style={{ marginTop: "16px", borderTop: "1px solid #333", paddingTop: "12px" }}>
                            <div style={{ fontSize: "11px", color: "#aaa", marginBottom: "6px", letterSpacing: "0.5px" }}>CUSTOM TRACK IMAGE</div>
                            <div style={{
                                border: "1px dashed #333",
                                borderRadius: "4px",
                                padding: "12px",
                                textAlign: "center",
                                color: "#555",
                                fontSize: "11px",
                            }}>
                                Upload your own track map<br />
                                <span style={{ color: "#333" }}>— coming soon —</span>
                            </div>
                        </div>
                    </div>

                    {/* ── Canvas ──────────────────────────────────────────── */}
                    <div ref={containerRef} style={{ flex: 1, background: "#16213e", borderRadius: "8px", padding: "12px" }}>
                        <div style={{ color: "#aaa", fontSize: "12px", marginBottom: "8px" }}>
                            {selectedSession.event_name} — fastest lap racing line
                            {carSpecs.car_name && <span style={{ color: "#e10600" }}> · {carSpecs.car_name}</span>}
                        </div>

                        {!racingLine && !loading && (
                            <div style={{
                                width: "100%",
                                height: `${canvasH}px`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                background: "#0a0a1a",
                                borderRadius: "8px",
                                color: "#333",
                                fontSize: "13px",
                            }}>
                                Set your car specs and click ANALYZE LINE
                            </div>
                        )}

                        {loading && (
                            <div style={{
                                width: "100%",
                                height: `${canvasH}px`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                background: "#0a0a1a",
                                borderRadius: "8px",
                                color: "#e10600",
                                fontSize: "13px",
                            }}>
                                Computing racing line from F1 telemetry...
                            </div>
                        )}

                        <canvas
                            ref={canvasRef}
                            style={{
                                width: "100%",
                                height: "auto",
                                display: racingLine && !loading ? "block" : "none",
                                borderRadius: "8px",
                                background: "#0a0a1a",
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    )
}
