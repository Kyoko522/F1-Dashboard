// TrackCanvas — canvas renderer for the live track map. Runs a single 60fps rAF loop.

import { useEffect, useRef, useState } from "react"
import TEAM_COLORS from "../utils/teamColors"

// Linear interpolation between the two GPS points surrounding currentTime.
// Points must have a precomputed `.t` (ms timestamp) field.
function interpolatePosition(points, currentTime) {
    if (!currentTime || !points.length) return null
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
    return { x: p0.x + (p1.x - p0.x) * alpha, y: p0.y + (p1.y - p0.y) * alpha }
}

export default function TrackCanvas({ trackData, driverLocations, selectedDrivers, currentTime }) {
    const canvasRef = useRef(null)
    const containerRef = useRef(null)
    const [size, setSize] = useState({ w: 800, h: 440 })

    // Refs so the rAF loop always reads the latest values without restarting
    const currentTimeRef = useRef(currentTime)
    const selectedDriversRef = useRef(selectedDrivers)
    const driverLocationsRef = useRef(driverLocations)
    const trackCacheRef = useRef(null) // pre-rendered static track + coordinate transform

    useEffect(() => { currentTimeRef.current = currentTime }, [currentTime])
    useEffect(() => { selectedDriversRef.current = selectedDrivers }, [selectedDrivers])
    useEffect(() => { driverLocationsRef.current = driverLocations }, [driverLocations])

    useEffect(() => {
        const observer = new ResizeObserver(entries => {
            const width = Math.round(entries[0].contentRect.width)
            if (width > 0) setSize(prev => prev.w === width ? prev : { w: width, h: Math.round(width * 0.55) })
        })
        if (containerRef.current) observer.observe(containerRef.current)
        return () => observer.disconnect()
    }, [])

    // Pre-render the static track outline to an offscreen canvas.
    // Rebuilt only when trackData or canvas size changes, not on every frame.
    useEffect(() => {
        if (!trackData.length) { trackCacheRef.current = null; return }
        const { w: W, h: H } = size
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
        for (const p of trackData) {
            if (p.x < minX) minX = p.x
            if (p.x > maxX) maxX = p.x
            if (p.y < minY) minY = p.y
            if (p.y > maxY) maxY = p.y
        }
        const scale = Math.min(W / (maxX - minX), H / (maxY - minY)) * 0.85
        const offX = (W - (maxX - minX) * scale) / 2
        const offY = (H - (maxY - minY) * scale) / 2
        const toCanvas = (x, y) => ({
            cx: (x - minX) * scale + offX,
            cy: (maxY - y) * scale + offY,
        })
        const offscreen = document.createElement("canvas")
        offscreen.width = W
        offscreen.height = H
        const ctx = offscreen.getContext("2d")
        ctx.fillStyle = "#0a0a1a"
        ctx.fillRect(0, 0, W, H)
        ctx.beginPath()
        ctx.strokeStyle = "#555"
        ctx.lineWidth = 3
        trackData.forEach((p, i) => {
            const { cx, cy } = toCanvas(p.x, p.y)
            i === 0 ? ctx.moveTo(cx, cy) : ctx.lineTo(cx, cy)
        })
        ctx.stroke()
        trackCacheRef.current = { offscreen, W, H, toCanvas }
    }, [trackData, size])

    // Single rAF loop — reads all live data through refs so it never needs to restart.
    useEffect(() => {
        if (!canvasRef.current) return
        const canvas = canvasRef.current
        const ctx = canvas.getContext("2d")
        let rafId

        const render = () => {
            const cache = trackCacheRef.current
            if (cache) {
                const { offscreen, W, H, toCanvas } = cache
                ctx.clearRect(0, 0, W, H)
                ctx.drawImage(offscreen, 0, 0)

                const ct = currentTimeRef.current
                for (const driver of selectedDriversRef.current) {
                    const pts = driverLocationsRef.current[driver.driver_number]
                    if (!pts || !pts.length) continue
                    const pos = interpolatePosition(pts, ct)
                    if (!pos) continue
                    const { cx, cy } = toCanvas(pos.x, pos.y)
                    const color = TEAM_COLORS[driver.driver_number] || "#ffffff"
                    ctx.beginPath()
                    ctx.arc(cx, cy, 6, 0, Math.PI * 2)
                    ctx.fillStyle = color
                    ctx.fill()
                    ctx.fillStyle = "white"
                    ctx.font = "10px monospace"
                    ctx.fillText(driver.full_name.split(" ").pop(), cx + 8, cy - 8)
                }
            }
            rafId = requestAnimationFrame(render)
        }

        rafId = requestAnimationFrame(render)
        return () => cancelAnimationFrame(rafId)
    }, [])

    return (
        <div ref={containerRef} style={{ width: "100%" }}>
            <canvas
                ref={canvasRef}
                width={size.w}
                height={size.h}
                style={{ width: "100%", height: "auto", background: "#0a0a1a", borderRadius: "8px", display: "block" }}
            />
        </div>
    )
}
