// Leaderboard — live race standings sorted by current position. Larger rows on mobile.

import { useMemo } from "react"
import TEAM_COLORS from "../utils/teamColors"

export default function Leaderboard({ positions, currentTime, drivers, mobile, currentLap, totalLaps }) {
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
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "10px",
                }}
            >
                <h3 style={{ color: "#e10600", margin: 0, fontSize: mobile ? "14px" : "16px" }}>
                    LEADERBOARD
                </h3>
                {currentLap != null && totalLaps != null && currentLap > 0 && (
                    <span
                        style={{
                            color: "#ffffff",
                            fontSize: mobile ? "13px" : "14px",
                            fontWeight: "700",
                            padding: "2px 8px",
                            borderRadius: "4px",
                            letterSpacing: "1px",
                        }}
                    >
                        {currentLap}
                        <span style={{ color: "#555" }}>/{totalLaps}</span>
                    </span>
                )}
            </div>
            {entries.slice(0, 20).map((entry, i) => {
                const driver = drivers.find((d) => d.driver_number === entry.driver_number)
                const color = TEAM_COLORS[entry.driver_number] || "#ffffff"
                // Top 3 get gold / silver / bronze position labels
                const posColor =
                    entry.position === 1
                        ? "#FFD700"
                        : entry.position === 2
                          ? "#C0C0C0"
                          : entry.position === 3
                            ? "#CD7F32"
                            : "#555"
                return (
                    <div
                        key={i}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            minHeight: mobile ? "44px" : "auto",
                            padding: mobile ? "0 4px" : "4px 0",
                            borderBottom: "1px solid #1a2a4a",
                            fontSize: mobile ? "14px" : "13px",
                        }}
                    >
                        <span style={{ color: posColor, width: "32px", fontWeight: "700", flexShrink: 0 }}>
                            P{entry.position}
                        </span>
                        <span style={{ color }}>
                            {driver ? driver.full_name.split(" ").pop() : `#${entry.driver_number}`}
                        </span>
                    </div>
                )
            })}
        </div>
    )
}
