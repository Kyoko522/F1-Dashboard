// Dashboard page — main layout. On mobile: track always visible, selectors collapse.

import { useState, useEffect } from "react"
import TrackCanvas from "../components/TrackCanvas"
import Loading from "../components/Loading"
import Leaderboard from "../components/Leaderboard"
import TelemetryPanel from "../components/TelemetryPanel"
import PlaybackControls from "../components/PlaybackControls"
import DriverSelector from "../components/DriverSelector"
import SessionSelector from "../components/SessionSelector"
import useSessionData from "../hooks/useSessionData"
import usePlayback from "../hooks/usePlayback"

const isMobile = () => window.innerWidth < 768

// Tabs for the panel below the always-visible track (mobile only)
const PANEL_TABS = [
    { id: "leaderboard", label: "LEAD"    },
    { id: "telemetry",   label: "TEL"     },
    { id: "drivers",     label: "DRIVERS" },
]

const panelTabStyle = (isActive) => ({
    flex: 1,
    minHeight: "44px",
    background: isActive ? "#e10600" : "#16213e",
    color: "white",
    border: "none",
    borderRight: "1px solid #0a0a1a",
    cursor: "pointer",
    fontSize: "12px",
    fontFamily: "monospace",
    fontWeight: isActive ? "700" : "400",
    letterSpacing: "0.5px",
})

export default function Dashboard() {
    const [selectedYear, setSelectedYear] = useState(2024)
    const [selectedSession, setSelectedSession] = useState(null)
    const [selectedDriver, setSelectedDriver] = useState(null)
    const [selectedDrivers, setSelectedDrivers] = useState([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [mobile, setMobile] = useState(isMobile())
    const [activeTab, setActiveTab] = useState("leaderboard")
    // Controls whether the year/session picker is expanded or collapsed (mobile)
    const [selectorOpen, setSelectorOpen] = useState(true)

    useEffect(() => {
        const handleResize = () => setMobile(isMobile())
        window.addEventListener("resize", handleResize)
        return () => window.removeEventListener("resize", handleResize)
    }, [])

    const {
        years, sessions, drivers, positions, trackData,
        driverLocations, setDriverLocations,
        telemetry, loadingSession, loadingDrivers, loadingTelemetry,
        fetchingRef,
    } = useSessionData(selectedYear, selectedSession, selectedDrivers, selectedDriver)

    const {
        isPlaying, setIsPlaying, speed, setSpeed,
        playbackOffset, setPlaybackOffset,
        currentTime, sessionBounds, togglePlay,
    } = usePlayback(driverLocations)

    useEffect(() => {
        if (!telemetry.length || !selectedDriver || currentTime == null) return
        let closest = 0, minDiff = Infinity
        for (let i = 0; i < telemetry.length; i++) {
            const diff = Math.abs(new Date(telemetry[i].date).getTime() - currentTime)
            if (diff < minDiff) { minDiff = diff; closest = i }
            else break
        }
        setCurrentIndex(closest)
    }, [currentTime])

    const handleYearChange = (year) => {
        setSelectedYear(year)
        setSelectedSession(null)
        setSelectedDrivers([])
        setDriverLocations({})
        fetchingRef.current.clear()
    }

    const handleSessionChange = (session) => {
        setSelectedSession(session)
        setSelectedDrivers([])
        setSelectedDriver(null)
        setPlaybackOffset(0)
        setIsPlaying(true)
        setSpeed(1)
        setActiveTab("leaderboard")
        fetchingRef.current.clear()
        // Collapse the selector once a race is picked
        if (mobile) setSelectorOpen(false)
    }

    const toggleDriver = (driver) => {
        setSelectedDrivers(prev => {
            const exists = prev.find(d => d.driver_number === driver.driver_number)
            return exists
                ? prev.filter(d => d.driver_number !== driver.driver_number)
                : [...prev, driver]
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

    const selectTelemetry = (driver) => {
        setSelectedDriver(driver)
        setSelectedDrivers(prev => prev.find(d => d.driver_number === driver.driver_number) ? prev : [...prev, driver])
        if (mobile) setActiveTab("telemetry")
    }

    const handleSeek = (value) => {
        setIsPlaying(false)
        setPlaybackOffset(value)
    }

    // ── Desktop layout (unchanged) ──────────────────────────────────────────
    if (!mobile) {
        const leaderboard = <Leaderboard positions={positions} currentTime={currentTime} drivers={drivers} mobile={false} />
        const trackPanel = (
            <div style={{ background: "#16213e", borderRadius: "8px", padding: "12px" }}>
                <h3 style={{ color: "#e10600", margin: "0 0 12px 0" }}>
                    RACE TRACK — {selectedSession?.country_name}
                </h3>
                {loadingSession ? <Loading message="Loading session data..." /> :
                 loadingDrivers ? <Loading message="Loading driver positions..." /> : (
                    <TrackCanvas trackData={trackData} driverLocations={driverLocations} selectedDrivers={selectedDrivers} currentTime={currentTime} />
                )}
                {Object.keys(driverLocations).length > 0 && (
                    <PlaybackControls isPlaying={isPlaying} speed={speed} playbackOffset={playbackOffset} sessionBounds={sessionBounds} onTogglePlay={togglePlay} onSpeedChange={setSpeed} onSeek={handleSeek} mobile={false} />
                )}
            </div>
        )
        return (
            <div style={{ background: "#0a0a1a", minHeight: "100vh", color: "white", padding: "20px", fontFamily: "monospace" }}>
                <h1 style={{ color: "#e10600", textAlign: "center", marginBottom: "20px", fontSize: "28px" }}>F1 DASHBOARD</h1>
                <SessionSelector years={years} selectedYear={selectedYear} onYearChange={handleYearChange} sessions={sessions} selectedSession={selectedSession} onSessionChange={handleSessionChange} mobile={false} />
                {selectedSession && (
                    <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
                        <div style={{ width: "220px", flexShrink: 0 }}>{leaderboard}</div>
                        <div style={{ flex: 1 }}>{trackPanel}</div>
                        <div style={{ width: "220px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "12px" }}>
                            <TelemetryPanel telemetry={telemetry} currentIndex={currentIndex} selectedDriver={selectedDriver} loadingTelemetry={loadingTelemetry} mobile={false} />
                            <DriverSelector drivers={drivers} selectedDrivers={selectedDrivers} onToggleDriver={toggleDriver} onSelectAll={selectAll} onSelectTelemetry={selectTelemetry} mobile={false} />
                        </div>
                    </div>
                )}
            </div>
        )
    }

    // ── Mobile layout ────────────────────────────────────────────────────────
    // Collapsed summary bar shown when a session is selected
    const summaryBar = selectedSession && (
        <button
            onClick={() => setSelectorOpen(prev => !prev)}
            style={{
                width: "100%",
                minHeight: "44px",
                background: "#16213e",
                color: "white",
                border: "none",
                borderBottom: "1px solid #333",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 16px",
                cursor: "pointer",
                fontFamily: "monospace",
                fontSize: "13px",
            }}
        >
            <span>
                <span style={{ color: "#e10600", fontWeight: "700" }}>{selectedYear}</span>
                <span style={{ color: "#555", margin: "0 8px" }}>•</span>
                <span>{selectedSession.country_name}</span>
            </span>
            <span style={{ color: "#555", fontSize: "16px" }}>{selectorOpen ? "▲" : "▼"}</span>
        </button>
    )

    // Expandable year + session picker
    const selectorPanel = selectorOpen && (
        <div style={{ background: "#0d0d22", borderBottom: "1px solid #333", padding: "10px 12px" }}>
            <SessionSelector
                years={years}
                selectedYear={selectedYear}
                onYearChange={handleYearChange}
                sessions={sessions}
                selectedSession={selectedSession}
                onSessionChange={handleSessionChange}
                mobile={true}
            />
        </div>
    )

    // Always-visible track panel
    const trackSection = (
        <div style={{ background: "#16213e", padding: "10px 12px" }}>
            {loadingSession ? <Loading message="Loading session data..." /> :
             loadingDrivers ? <Loading message="Loading driver positions..." /> : (
                <TrackCanvas trackData={trackData} driverLocations={driverLocations} selectedDrivers={selectedDrivers} currentTime={currentTime} />
            )}
            {Object.keys(driverLocations).length > 0 && (
                <PlaybackControls isPlaying={isPlaying} speed={speed} playbackOffset={playbackOffset} sessionBounds={sessionBounds} onTogglePlay={togglePlay} onSpeedChange={setSpeed} onSeek={handleSeek} mobile={true} />
            )}
        </div>
    )

    // Panel tabs for leaderboard / telemetry / drivers below the map
    const panelTabBar = selectedSession && (
        <div style={{ display: "flex", borderTop: "1px solid #333", borderBottom: "1px solid #333" }}>
            {PANEL_TABS.map(({ id, label }) => (
                <button key={id} onClick={() => setActiveTab(id)} style={panelTabStyle(activeTab === id)}>
                    {label}
                </button>
            ))}
        </div>
    )

    return (
        <div style={{ background: "#0a0a1a", minHeight: "100vh", color: "white", fontFamily: "monospace" }}>
            {/* App title */}
            <div style={{ background: "#0d0d22", borderBottom: "1px solid #222", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <h1 style={{ color: "#e10600", margin: 0, fontSize: "18px", letterSpacing: "3px" }}>F1 DASHBOARD</h1>
            </div>

            {/* Collapsed summary or open selector */}
            {selectedSession ? summaryBar : null}
            {!selectedSession && selectorOpen && (
                <div style={{ padding: "12px" }}>
                    <SessionSelector years={years} selectedYear={selectedYear} onYearChange={handleYearChange} sessions={sessions} selectedSession={selectedSession} onSessionChange={handleSessionChange} mobile={true} />
                </div>
            )}
            {selectedSession && selectorPanel}

            {/* Track — always visible once a session is chosen */}
            {selectedSession && trackSection}

            {/* Panel tabs */}
            {panelTabBar}

            {/* Tab content */}
            {selectedSession && (
                <div style={{ padding: "12px" }}>
                    {activeTab === "leaderboard" && <Leaderboard positions={positions} currentTime={currentTime} drivers={drivers} mobile={true} />}
                    {activeTab === "telemetry"   && <TelemetryPanel telemetry={telemetry} currentIndex={currentIndex} selectedDriver={selectedDriver} loadingTelemetry={loadingTelemetry} mobile={true} />}
                    {activeTab === "drivers"     && <DriverSelector drivers={drivers} selectedDrivers={selectedDrivers} onToggleDriver={toggleDriver} onSelectAll={selectAll} onSelectTelemetry={selectTelemetry} mobile={true} />}
                </div>
            )}
        </div>
    )
}
