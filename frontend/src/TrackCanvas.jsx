import { useEffect, useRef, useState } from "react"

const TEAM_COLORS = {
    1: "#3671C6", 11: "#3671C6",
    16: "#E8002D", 55: "#E8002D",
    44: "#27F4D2", 63: "#27F4D2",
    4: "#FF8000", 81: "#FF8000",
    14: "#358C75", 18: "#358C75",
    10: "#0093CC", 31: "#0093CC",
    23: "#64C4FF", 2: "#64C4FF",
    22: "#6692FF", 3: "#6692FF",
    77: "#C92D4B", 24: "#C92D4B",
    20: "#B6BABD", 27: "#B6BABD",
}

export default function TrackCanvas({ trackData, driverLocations, selectedDrivers, animIndex, drivers }) {
    const canvasRef = useRef(null)
    const containerRef = useRef(null)
    const [size, setSize] = useState({ w: 600, h: 330 })

    useEffect(() => {
        let timeout
        const observer = new ResizeObserver(entries => {
            for (const entry of entries) {
                const w = Math.round(entry.contentRect.width)
                clearTimeout(timeout)
                timeout = setTimeout(() => {
                    setSize(prev => {
                        if (prev.w === w) return prev
                        return { w, h: Math.round(w * 0.55) }
                    })
                }, 100)
            }
        })
        if (containerRef.current) observer.observe(containerRef.current)
        return () => { observer.disconnect(); clearTimeout(timeout) }
    }, [])

    useEffect(() => {
        if (!trackData.length || !canvasRef.current) return

        const canvas = canvasRef.current
        const ctx = canvas.getContext("2d")
        const W = size.w
        const H = size.h

        const xs = trackData.map(p => p.x)
        const ys = trackData.map(p => p.y)
        const minX = Math.min(...xs), maxX = Math.max(...xs)
        const minY = Math.min(...ys), maxY = Math.max(...ys)

        const scale = Math.min(W / (maxX - minX), H / (maxY - minY)) * 0.85
        const offsetX = (W - (maxX - minX) * scale) / 2
        const offsetY = (H - (maxY - minY) * scale) / 2

        const toCanvas = (x, y) => ({
            cx: (x - minX) * scale + offsetX,
            cy: (y - minY) * scale + offsetY
        })

        ctx.clearRect(0, 0, W, H)

        // Draw track
        ctx.beginPath()
        ctx.strokeStyle = "#555"
        ctx.lineWidth = 3
        trackData.forEach((p, i) => {
            const { cx, cy } = toCanvas(p.x, p.y)
            i === 0 ? ctx.moveTo(cx, cy) : ctx.lineTo(cx, cy)
        })
        ctx.stroke()

        // Draw driver dots
        selectedDrivers.forEach((driver) => {
            const points = driverLocations[driver.driver_number]
            if (!points || points.length === 0) return
            const idx = Math.min(animIndex, points.length - 1)
            const point = points[idx]
            if (!point) return
            const { cx, cy } = toCanvas(point.x, point.y)
            const color = TEAM_COLORS[driver.driver_number] || "#ffffff"

            ctx.beginPath()
            ctx.arc(cx, cy, 6, 0, Math.PI * 2)
            ctx.fillStyle = color
            ctx.fill()

            ctx.fillStyle = "white"
            ctx.font = "10px monospace"
            ctx.fillText(driver.full_name.split(" ").pop(), cx + 8, cy - 8)
        })

    }, [trackData, driverLocations, animIndex, selectedDrivers, size])

    return (
        <div ref={containerRef} style={{ width: "100%" }}>
            <canvas
                ref={canvasRef}
                width={size.w}
                height={size.h}
                style={{ background: "#0a0a1a", borderRadius: "8px", width: "100%", display: "block" }}
            />
        </div>
    )
}