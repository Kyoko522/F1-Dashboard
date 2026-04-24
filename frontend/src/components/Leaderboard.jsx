// Leaderboard — displays live race standings sorted by current position at playback time.

import { useMemo } from "react"
import TEAM_COLORS from "../utils/teamColors"

export default function Leaderboard({ positions, currentTime, drivers }) {
    const liveLeaderboard = useMemo(() => {
        if (!positions.length) return []
        const byDriver = {}
        for (const entry of positions) {
            if (!byDriver[entry.driver_number]) byDriver[entry.driver_number] = []
            byDriver[entry.driver_number].push(entry)
        }
        const snapshot = Object.entries(byDriver).map(([driverNum, pts]) => {
            let best = pts[0]
            if (currentTime) {
                for (const p of pts) {
                    if (new Date(p.date).getTime() <= currentTime) best = p
                    else break
                }
            }
            return { driver_number: parseInt(driverNum), position: best.position }
        })
        return snapshot.sort((a, b) => a.position - b.position)
    }, [positions, currentTime])

    const entries = liveLeaderboard.length > 0 ? liveLeaderboard : positions

    return (
        <div style={{ background: "#16213e", padding: "12px", borderRadius: "8px" }}>
            <h3 style={{ color: "#e10600", margin: "0 0 12px 0" }}>LEADERBOARD</h3>
            {entries.slice(0, 20).map((entry, i) => {
                const driver = drivers.find(d => d.driver_number === entry.driver_number)
                const color = TEAM_COLORS[entry.driver_number] || "#ffffff"
                return (
                    <div key={i} style={{ display: "flex", gap: "8px", padding: "4px 0", borderBottom: "1px solid #222", fontSize: "13px" }}>
                        <span style={{ color: "#888", width: "30px" }}>P{entry.position}</span>
                        <span style={{ color }}>
                            {driver ? driver.full_name.split(" ").pop() : `#${entry.driver_number}`}
                        </span>
                    </div>
                )
            })}
        </div>
    )
}
