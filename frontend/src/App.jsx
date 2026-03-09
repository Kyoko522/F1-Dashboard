import { useState, useEffect, useMemo, useRef } from "react"
import TrackCanvas from "./TrackCanvas.jsx"
import Loading from "./Loading.jsx"
import TEAM_COLORS from "./teamColors.js"

const API = "http://localhost:8000"

function App() {
    const [selectedYear, setSelectedYear] = useState(2024)
    const [sessions, setSessions] = useState([])
    const [selectedSession, setSelectedSession] = useState(null)
    const [drivers, setDrivers] = useState([])
    const [selectedDriver, setSelectedDriver] = useState(null)
    const [selectedDrivers, setSelectedDrivers] = useState([])
    const [telemetry, setTelemetry] = useState([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [positions, setPositions] = useState([])
    const [trackData, setTrackData] = useState([])
    const [raceStartIndex, setRaceStartIndex] = useState(0)
    const [driverLocations, setDriverLocations] = useState({})
    const [animIndex, setAnimIndex] = useState(0)
    const [loadingDrivers, setLoadingDrivers] = useState(false)
    const [loadingTelemetry, setLoadingTelemetry] = useState(false)
    const [isPlaying, setIsPlaying] = useState(true)
    const fetchingRef = useRef(new Set())

    useEffect(() => {
        fetch(`${API}/api/sessions?year=${selectedYear}`)
            .then(res => res.json())
            .then(data => setSessions(data.data))
    }, [selectedYear])

    useEffect(() => {
        if (!selectedSession) return
        fetch(`${API}/api/drivers?session_key=${selectedSession.session_key}`)
            .then(res => res.json())
            .then(data => setDrivers(data.data))
    }, [selectedSession])

    useEffect(() => {
        if (!selectedDriver || !selectedSession) return
        setCurrentIndex(0)
        setLoadingTelemetry(true)
        fetch(`${API}/api/telemetry/${selectedSession.session_key}?driver_number=${selectedDriver.driver_number}`)
            .then(res => res.json())
            .then(data => {
                setTelemetry(data.data)
                setLoadingTelemetry(false)
            })
    }, [selectedDriver])

    useEffect(() => {
        if (!telemetry.length || !selectedDriver) return
        const locationPoints = driverLocations[selectedDriver.driver_number]
        if (!locationPoints || !locationPoints.length) return

        const currentPoint = locationPoints[Math.min(animIndex, locationPoints.length - 1)]
        if (!currentPoint?.date) return

        const currentTime = new Date(currentPoint.date).getTime()

        let closest = 0
        let minDiff = Infinity
        for (let i = 0; i < telemetry.length; i++) {
            const diff = Math.abs(new Date(telemetry[i].date).getTime() - currentTime)
            if (diff < minDiff) {
                minDiff = diff
                closest = i
            } else {
                break
            }
        }
        setCurrentIndex(closest)
    }, [animIndex])

    useEffect(() => {
        if (!selectedSession) return
        fetch(`${API}/api/positions/${selectedSession.session_key}`)
            .then(res => res.json())
            .then(data => setPositions(data.data))
    }, [selectedSession])

    useEffect(() => {
        if (!selectedSession) return
        fetch(`${API}/api/location/${selectedSession.session_key}?driver_number=1`)
            .then(res => res.json())
            .then(data => {
                const points = data.data.filter(p => p.x !== 0 && p.y !== 0)
                let startIndex = 0
                for (let i = 1; i < points.length; i++) {
                    const dx = Math.abs(points[i].x - points[i-1].x)
                    const dy = Math.abs(points[i].y - points[i-1].y)
                    if (dx + dy > 10) {
                        startIndex = Math.max(0, i - 5)
                        break
                    }
                }
                setRaceStartIndex(startIndex)
                setTrackData(points)
            })
    }, [selectedSession])

    useEffect(() => {
        if (!selectedSession) return

        const missing = selectedDrivers.filter(d =>
            !driverLocations[d.driver_number] && !fetchingRef.current.has(d.driver_number)
        )
        if (missing.length === 0) return

        missing.forEach(d => fetchingRef.current.add(d.driver_number))

        const fetchAll = async () => {
            setLoadingDrivers(true)
            const results = await Promise.all(
                missing.map(async (driver) => {
                    const res = await fetch(`${API}/api/location/${selectedSession.session_key}?driver_number=${driver.driver_number}`)
                    const data = await res.json()
                    const points = data.data.filter(p => p.x !== 0 && p.y !== 0)
                    fetchingRef.current.delete(driver.driver_number)
                    return { driver_number: driver.driver_number, points }
                })
            )
            setDriverLocations(prev => {
                const updated = { ...prev }
                for (const { driver_number, points } of results) {
                    updated[driver_number] = points
                }
                return updated
            })
            setLoadingDrivers(false)
        }
        fetchAll()
    }, [selectedDrivers])

    useEffect(() => {
        if (Object.keys(driverLocations).length === 0) return
        if (!isPlaying) return
        const interval = setInterval(() => {
            setAnimIndex(prev => prev + 1)
        }, 100)
        return () => clearInterval(interval)
    }, [Object.keys(driverLocations).length, isPlaying])

    const currentTime = useMemo(() => {
        const firstDriver = selectedDrivers[0]
        if (!firstDriver) return null
        const points = driverLocations[firstDriver.driver_number]
        if (!points || !points.length) return null
        const point = points[Math.min(animIndex, points.length - 1)]
        return point?.date ? new Date(point.date).getTime() : null
    }, [animIndex, driverLocations, selectedDrivers])

    const liveLeaderboard = useMemo(() => {
        if (!positions.length) return []

        const byDriver = {}
        for (const p of positions) {
            if (!byDriver[p.driver_number]) byDriver[p.driver_number] = []
            byDriver[p.driver_number].push(p)
        }

        const snapshot = Object.entries(byDriver).map(([driverNum, pts]) => {
            let best = pts[0]
            if (currentTime) {
                for (const p of pts) {
                    if (new Date(p.date).getTime() <= currentTime) {
                        best = p
                    } else {
                        break
                    }
                }
            }
            return { driver_number: parseInt(driverNum), position: best.position }
        })

        return snapshot.sort((a, b) => a.position - b.position)
    }, [positions, currentTime])

    const toggleDriver = (driver) => {
        setSelectedDrivers(prev => {
            const exists = prev.find(d => d.driver_number === driver.driver_number)
            if (exists) return prev.filter(d => d.driver_number !== driver.driver_number)
            return [...prev, driver]
        })
    }

    const selectAll = () => {
        if (selectedDrivers.length === drivers.length) {
            setSelectedDrivers([])
            setDriverLocations({})
            fetchingRef.current.clear()
        } else {
            setSelectedDrivers(drivers)
        }
    }

    return (
        <div style={{ background: "#0a0a1a", minHeight: "100vh", color: "white", padding: "20px", fontFamily: "monospace" }}>
            <h1 style={{ color: "#e10600", textAlign: "center", marginBottom: "20px" }}>F1 DASHBOARD</h1>

            <div style={{ display: "flex", gap: "8px", justifyContent: "center", marginBottom: "12px" }}>
                {[2023, 2024, 2025].map(year => (
                    <button
                        key={year}
                        onClick={() => {
                            setSelectedYear(year)
                            setSelectedSession(null)
                            setDrivers([])
                            setSelectedDrivers([])
                            setDriverLocations({})
                            fetchingRef.current.clear()
                        }}
                        style={{
                            background: selectedYear === year ? "#e10600" : "#1a1a2e",
                            color: "white",
                            border: "1px solid #333",
                            padding: "8px 20px",
                            cursor: "pointer",
                            borderRadius: "4px",
                            fontSize: "14px"
                        }}
                    >
                        {year}
                    </button>
                ))}
            </div>

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "20px", justifyContent: "center" }}>
                {sessions.map(session => (
                    <button
                        key={session.session_key}
                        onClick={() => {
                            setSelectedSession(session)
                            setSelectedDrivers([])
                            setDriverLocations({})
                            setAnimIndex(0)
                            setSelectedDriver(null)
                            setTelemetry([])
                            setIsPlaying(true)
                            fetchingRef.current.clear()
                        }}
                        style={{
                            background: selectedSession?.session_key === session.session_key ? "#e10600" : "#1a1a2e",
                            color: "white",
                            border: "1px solid #333",
                            padding: "6px 12px",
                            cursor: "pointer",
                            borderRadius: "4px",
                            fontSize: "12px"
                        }}
                    >
                        {session.country_name}
                    </button>
                ))}
            </div>

            {selectedSession && (
                <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>

                    {/* LEFT - Leaderboard */}
                    <div style={{ width: "220px", background: "#16213e", padding: "12px", borderRadius: "8px", flexShrink: 0 }}>
                        <h3 style={{ color: "#e10600", margin: "0 0 12px 0" }}>LEADERBOARD</h3>
                        {(liveLeaderboard.length > 0 ? liveLeaderboard : positions).slice(0, 20).map((p, i) => {
                            const driver = drivers.find(d => d.driver_number === p.driver_number)
                            const color = TEAM_COLORS[p.driver_number] || "#ffffff"
                            return (
                                <div key={i} style={{
                                    display: "flex",
                                    gap: "8px",
                                    padding: "4px 0",
                                    borderBottom: "1px solid #222",
                                    fontSize: "13px"
                                }}>
                                    <span style={{ color: "#888", width: "30px" }}>P{p.position}</span>
                                    <span style={{ color: color }}>
                                        {driver ? driver.full_name.split(" ").pop() : `#${p.driver_number}`}
                                    </span>
                                </div>
                            )
                        })}
                    </div>

                    {/* CENTER - Track */}
                    <div style={{ flex: 1, background: "#16213e", borderRadius: "8px", padding: "12px" }}>
                        <h3 style={{ color: "#e10600", margin: "0 0 12px 0" }}>RACE TRACK - {selectedSession.country_name}</h3>
                        {loadingDrivers ? (
                            <Loading message="Loading driver positions..." />
                        ) : (
                            <TrackCanvas
                                trackData={trackData}
                                driverLocations={driverLocations}
                                selectedDrivers={selectedDrivers}
                                animIndex={animIndex}
                                drivers={drivers}
                            />
                        )}

                        {/* Timeline */}
                        {Object.keys(driverLocations).length > 0 && (
                            <div style={{ marginTop: "12px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                    <button
                                        onClick={() => setIsPlaying(prev => !prev)}
                                        style={{
                                            background: "#e10600",
                                            color: "white",
                                            border: "none",
                                            padding: "4px 12px",
                                            borderRadius: "4px",
                                            cursor: "pointer",
                                            fontSize: "12px",
                                            flexShrink: 0
                                        }}
                                    >
                                        {isPlaying ? "⏸" : "▶"}
                                    </button>
                                    <input
                                        type="range"
                                        min={0}
                                        max={Math.max(...Object.values(driverLocations).map(pts => pts.length)) - 1}
                                        value={animIndex}
                                        onChange={e => {
                                            setIsPlaying(false)
                                            setAnimIndex(Number(e.target.value))
                                        }}
                                        style={{ flex: 1, accentColor: "#e10600", cursor: "pointer" }}
                                    />
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "#555", marginTop: "4px" }}>
                                    <span>START</span>
                                    <span>END</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* RIGHT - Telemetry + Drivers */}
                    <div style={{ width: "220px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "12px" }}>

                        <div style={{ background: "#16213e", padding: "12px", borderRadius: "8px" }}>
                            <h3 style={{ color: "#e10600", margin: "0 0 12px 0" }}>TELEMETRY</h3>
                            {selectedDriver && <p style={{ color: "#888", margin: "0 0 8px 0", fontSize: "12px" }}>{selectedDriver.full_name}</p>}
                            {loadingTelemetry ? (
                                <Loading message="Loading telemetry..." />
                            ) : telemetry.length > 0 ? (
                                <div style={{ fontSize: "13px", lineHeight: "2" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                                        <span style={{ color: "#888" }}>SPEED</span>
                                        <span style={{ color: "#00ff88" }}>{telemetry[currentIndex].speed} km/h</span>
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                                        <span style={{ color: "#888" }}>THROTTLE</span>
                                        <span style={{ color: "#00aaff" }}>{telemetry[currentIndex].throttle}%</span>
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                                        <span style={{ color: "#888" }}>BRAKE</span>
                                        <span style={{ color: "#ff4444" }}>{telemetry[currentIndex].brake ? "ON" : "OFF"}</span>
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                                        <span style={{ color: "#888" }}>GEAR</span>
                                        <span style={{ color: "white" }}>{telemetry[currentIndex].n_gear}</span>
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                                        <span style={{ color: "#888" }}>RPM</span>
                                        <span style={{ color: "white" }}>{telemetry[currentIndex].rpm}</span>
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                                        <span style={{ color: "#888" }}>DRS</span>
                                        <span style={{ color: telemetry[currentIndex].drs > 10 ? "#00ff88" : "#888" }}>
                                            {telemetry[currentIndex].drs > 10 ? "OPEN" : "CLOSED"}
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <p style={{ color: "#555", fontSize: "12px" }}>Select a driver</p>
                            )}
                        </div>

                        <div style={{ background: "#16213e", padding: "12px", borderRadius: "8px" }}>
                            <h3 style={{ color: "#e10600", margin: "0 0 4px 0" }}>DRIVERS</h3>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                                <p style={{ color: "#555", fontSize: "11px", margin: 0 }}>Click to track. TEL for telemetry.</p>
                                <button
                                    onClick={selectAll}
                                    style={{
                                        background: selectedDrivers.length === drivers.length ? "#e10600" : "#1a1a2e",
                                        color: "white",
                                        border: "1px solid #333",
                                        padding: "2px 6px",
                                        borderRadius: "4px",
                                        cursor: "pointer",
                                        fontSize: "10px",
                                        flexShrink: 0
                                    }}
                                >
                                    {selectedDrivers.length === drivers.length ? "CLEAR" : "ALL"}
                                </button>
                            </div>
                            {drivers.map(driver => (
                                <div
                                    key={driver.driver_number}
                                    style={{
                                        padding: "5px",
                                        cursor: "pointer",
                                        background: selectedDrivers.find(d => d.driver_number === driver.driver_number) ? "#e10600" : "transparent",
                                        borderRadius: "4px",
                                        marginBottom: "2px",
                                        fontSize: "12px",
                                        display: "flex",
                                        justifyContent: "space-between"
                                    }}
                                >
                                    <span onClick={() => toggleDriver(driver)}>
                                        #{driver.driver_number} {driver.full_name}
                                    </span>
                                    <span
                                        onClick={() => {
                                            setSelectedDriver(driver)
                                            setSelectedDrivers(prev => {
                                                const exists = prev.find(d => d.driver_number === driver.driver_number)
                                                if (exists) return prev
                                                return [...prev, driver]
                                            })
                                        }}
                                        style={{ color: "#888", fontSize: "10px" }}
                                    >
                                        TEL
                                    </span>
                                </div>
                            ))}
                        </div>

                    </div>
                </div>
            )}
        </div>
    )
}
export default App