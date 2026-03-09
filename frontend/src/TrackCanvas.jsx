import { useEffect, useRef } from "react"

const COLORS = ["#e10600", "#00aaff", "#00ff88", "#ffcc00"]

export default function TrackCanvas({ trackData, driverLocations, selectedDrivers, animIndex, drivers }) {
    const canvasRef = useRef(null)

    useEffect(() => {
        if (!trackData.length || !canvasRef.current) return

        const canvas = canvasRef.current
        const ctx = canvas.getContext("2d")
        const W = canvas.width
        const H = canvas.height

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
        selectedDrivers.forEach((driver, colorIndex) => {
            const points = driverLocations[driver.driver_number]
            if (!points || points.length === 0) return

            const idx = Math.min(animIndex, points.length - 1)
            const point = points[idx]
            if (!point) return

            const { cx, cy } = toCanvas(point.x, point.y)
            const color = COLORS[colorIndex % COLORS.length]

            // Dot
            ctx.beginPath()
            ctx.arc(cx, cy, 6, 0, Math.PI * 2)
            ctx.fillStyle = color
            ctx.fill()

            // Label
            ctx.fillStyle = "white"
            ctx.font = "10px monospace"
            ctx.fillText(driver.full_name.split(" ").pop(), cx + 8, cy - 8)
        })

    }, [trackData, driverLocations, animIndex, selectedDrivers])

    return (
        <canvas
            ref={canvasRef}
            width={1530}
            height={800}
            style={{ background: "#0a0a1a", borderRadius: "8px" }}
        />
    )
}