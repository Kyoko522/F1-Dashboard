// usePlayback — manages play/pause state, playback speed, offset, and derives currentTime.

import { useState, useEffect, useRef, useMemo } from "react"

const WINDOW_MS = 5000      // sliding window width for race-start detection
const STEP_MS = 500         // step size for the scan
const STILL_THRESHOLD = 15  // metres per driver over WINDOW_MS to count as stationary

function ptAtTime(pts, targetTime) {
    let lo = 0, hi = pts.length - 1
    while (lo < hi) {
        const mid = Math.floor((lo + hi + 1) / 2)
        if (pts[mid].t <= targetTime) lo = mid; else hi = mid - 1
    }
    return pts[lo]
}

export default function usePlayback(driverLocations) {
    const [isPlaying, setIsPlaying] = useState(true)
    const [speed, setSpeed] = useState(1)
    const [playbackOffset, setPlaybackOffset] = useState(0)
    const animStartRef = useRef({ wallTime: 0, offset: 0 })

    // Compute session start/end from all loaded driver positions.
    // Race start is detected by finding the last window where all cars are stationary (grid wait).
    const sessionBounds = useMemo(() => {
        const allDrivers = Object.values(driverLocations)
        if (!allDrivers.length) return null
        // Avoid Math.min/max spread — with 20 drivers and thousands of points each
        // the array can exceed JS's argument limit and overflow the call stack.
        let rawStart = Infinity, end = -Infinity
        for (const pts of allDrivers) {
            for (const p of pts) {
                if (p.t < rawStart) rawStart = p.t
                if (p.t > end) end = p.t
            }
        }
        if (!isFinite(rawStart)) return null

        let raceStart = rawStart
        const scanEnd = rawStart + (end - rawStart) * 0.3
        for (let t = rawStart; t < scanEnd - WINDOW_MS; t += STEP_MS) {
            let totalMove = 0, count = 0
            for (const pts of allDrivers) {
                if (!pts.length) continue
                const p0 = ptAtTime(pts, t)
                const p1 = ptAtTime(pts, t + WINDOW_MS)
                const dx = p1.x - p0.x, dy = p1.y - p0.y
                totalMove += Math.sqrt(dx * dx + dy * dy)
                count++
            }
            if (count > 0 && totalMove / count < STILL_THRESHOLD) {
                raceStart = t + WINDOW_MS
            }
        }

        return { start: raceStart, end }
    }, [driverLocations])

    const currentTime = useMemo(() => {
        if (!sessionBounds) return null
        return sessionBounds.start + playbackOffset
    }, [sessionBounds, playbackOffset])

    useEffect(() => {
        if (!sessionBounds || !isPlaying) return
        animStartRef.current = { wallTime: Date.now(), offset: playbackOffset }
        const interval = setInterval(() => {
            const elapsed = (Date.now() - animStartRef.current.wallTime) * speed
            const newOffset = animStartRef.current.offset + elapsed
            const maxOffset = sessionBounds.end - sessionBounds.start
            if (newOffset >= maxOffset) {
                setPlaybackOffset(maxOffset)
                setIsPlaying(false)
            } else {
                setPlaybackOffset(newOffset)
            }
        }, 50)
        return () => clearInterval(interval)
    }, [sessionBounds?.start, sessionBounds?.end, isPlaying, speed])

    const togglePlay = () => setIsPlaying(prev => !prev)

    return {
        isPlaying, setIsPlaying,
        speed, setSpeed,
        playbackOffset, setPlaybackOffset,
        currentTime, sessionBounds,
        togglePlay,
    }
}
