import { useState, useEffect } from "react"
import TrackCanvas from "./TrackCanvas.jsx"
import Loading from "./Loading.jsx"

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
        fetch(`${API}/api/telemetry/${selectedSession.session_key}?driver_number=${selectedDriver.driver_number}`)
            .then(res => res.json())
            .then(data => {
                const middle = Math.floor(data.data.length / 2)
                setTelemetry(data.data.slice(middle, middle + 500))
            })
    }, [selectedDriver])

    useEffect(() => {
        if (telemetry.length === 0) return
        const interval = setInterval(() => {
            setCurrentIndex(prev => {
                if (prev >= telemetry.length - 1) {
                    clearInterval(interval)
                    return prev
                }
                return prev + 1
            })
        }, 100)
        return () => clearInterval(interval)
    }, [telemetry])

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
        if (selectedDrivers.length === 0 || !selectedSession) return

        // Find which driver was just added
        const newDriver = selectedDrivers.find(d => !driverLocations[d.driver_number])
        if (!newDriver) return  // driver was removed, don't refetch

        const fetchNew = async () => {
            setLoadingDrivers(true)
            const res = await fetch(`${API}/api/location/${selectedSession.session_key}?driver_number=${newDriver.driver_number}`)
            const data = await res.json()
            const points = data.data.filter(p => p.x !== 0 && p.y !== 0)

            setDriverLocations(prev => ({
                ...prev,
                [newDriver.driver_number]: points
            }))
            setLoadingDrivers(false)
        }
        fetchNew()
    }, [selectedDrivers])

    useEffect(() => {
        if (Object.keys(driverLocations).length === 0) return
        const interval = setInterval(() => {
            setAnimIndex(prev => prev + 1)
        }, 100)
        return () => clearInterval(interval)
    }, [driverLocations])

    const toggleDriver = (driver) => {
        setSelectedDrivers(prev => {
            const exists = prev.find(d => d.driver_number === driver.driver_number)
            if (exists) return prev.filter(d => d.driver_number !== driver.driver_number)
            return [...prev, driver]
        })
    }
    useEffect(() => {
        if (selectedDrivers.length === 0 || !selectedSession) return
        const fetchAll = async () => {
            setLoadingDrivers(true)
            const result = {}
            for (const driver of selectedDrivers) {
                const res = await fetch(`${API}/api/location/${selectedSession.session_key}?driver_number=${driver.driver_number}`)
                const data = await res.json()
                const points = data.data.filter(p => p.x !== 0 && p.y !== 0)
                result[driver.driver_number] = points
            }
            setDriverLocations(result)
            setAnimIndex(raceStartIndex)
            setLoadingDrivers(false)
        }
        fetchAll()
    }, [selectedDrivers])

    return (
        <div style={{ background: "#0a0a1a", minHeight: "100vh", color: "white", padding: "20px", fontFamily: "monospace" }}>
            <h1 style={{ color: "#e10600", textAlign: "center", marginBottom: "20px" }}>F1 DASHBOARD</h1>

            <div style={{ display: "flex", gap: "8px", justifyContent: "center", marginBottom: "12px" }}>
                {/*{[2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025].map(year => (*/}
                {[2023, 2024, 2025].map(year => (
                    <button
                        key={year}
                        onClick={() => {
                            setSelectedYear(year)
                            setSelectedSession(null)
                            setDrivers([])
                            setSelectedDrivers([])
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
                        onClick={() => setSelectedSession(session)}
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
                        {positions.slice(0, 20).map((p, i) => {
                            const driver = drivers.find(d => d.driver_number === p.driver_number)
                            return (
                                <div key={i} style={{
                                    display: "flex",
                                    gap: "8px",
                                    padding: "4px 0",
                                    borderBottom: "1px solid #222",
                                    fontSize: "13px"
                                }}>
                                    <span style={{ color: "#888", width: "30px" }}>P{p.position}</span>
                                    <span style={{ color: "white" }}>{driver ? driver.full_name.split(" ").pop() : `#${p.driver_number}`}</span>
                                </div>
                            )
                        })}
                    </div>

                    <div style={{ flex: 1, background: "#16213e", borderRadius: "8px", padding: "12px" }}>
                        <h3 style={{ color: "#e10600", margin: "0 0 12px 0" }}>RACE TRACK - {selectedSession.country_name}</h3>
                        {loadingDrivers ? (
                            <Loading message="Loading positions..." />
                        ) : (
                            <TrackCanvas
                                trackData={trackData}
                                driverLocations={driverLocations}
                                selectedDrivers={selectedDrivers}
                                animIndex={animIndex}
                                drivers={drivers}
                            />
                        )}
                    </div>

                    {/* RIGHT - Telemetry + Drivers */}
                    <div style={{ width: "220px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "12px" }}>

                        <div style={{ background: "#16213e", padding: "12px", borderRadius: "8px" }}>
                            <h3 style={{ color: "#e10600", margin: "0 0 12px 0" }}>TELEMETRY</h3>
                            {selectedDriver && <p style={{ color: "#888", margin: "0 0 8px 0", fontSize: "12px" }}>{selectedDriver.full_name}</p>}
                            {telemetry.length > 0 ? (
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
                            <p style={{ color: "#555", fontSize: "11px", margin: "0 0 8px 0" }}>Click to track on map (max 4). Click name for telemetry.</p>
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
                                        onClick={() => setSelectedDriver(driver)}
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