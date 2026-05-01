// Dashboard page — main layout. On mobile: track always visible, selectors collapse.

import { useState, useEffect, useMemo } from "react"
import TrackCanvas from "../components/TrackCanvas"
import Loading from "../components/Loading"
import Leaderboard from "../components/Leaderboard"
import TelemetryPanel from "../components/TelemetryPanel"
import PlaybackControls from "../components/PlaybackControls"
import DriverSelector from "../components/DriverSelector"
import SessionSelector from "../components/SessionSelector"
import RacingLineTab from "../components/RacingLineTab"
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
    const [appView, setAppView] = useState("replay") // "replay" | "raceline"
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

    const lapInfo = useMemo(() => {
        if (!positions.length) return { currentLap: null, totalLaps: null }
        const total = Math.max(...positions.map(p => p.lap_number || 0))
        if (!currentTime || !total) return { currentLap: null, totalLaps: total || null }
        const byDriver = {}
        for (const entry of positions) {
            if (!byDriver[entry.driver_number]) byDriver[entry.driver_number] = []
            byDriver[entry.driver_number].push(entry)
        }
        let leaderNum = null, bestPos = Infinity
        for (const [driverNum, pts] of Object.entries(byDriver)) {
            let snap = pts[0]
            for (const p of pts) {
                if (new Date(p.date).getTime() <= currentTime) snap = p
                else break
            }
            if (snap.position < bestPos) { bestPos = snap.position; leaderNum = parseInt(driverNum) }
        }
        if (!leaderNum) return { currentLap: null, totalLaps: total }
        let lap = 0
        for (const p of byDriver[leaderNum]) {
            if (new Date(p.date).getTime() <= currentTime) lap = p.lap_number || 0
            else break
        }
        return { currentLap: lap, totalLaps: total }
    }, [positions, currentTime])

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

    // ── View toggle bar (shared between desktop and mobile) ────────────────
    const viewToggle = (
        <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginBottom: "16px" }}>
            {[["replay", "REPLAY"], ["raceline", "AI RACE LINE"]].map(([id, label]) => (
                <button key={id} onClick={() => setAppView(id)} style={{
                    background: appView === id ? "#e10600" : "#16213e",
                    color: "white",
                    border: "1px solid #333",
                    borderRadius: "4px",
                    padding: "8px 20px",
                    fontFamily: "monospace",
                    fontSize: "13px",
                    fontWeight: appView === id ? "700" : "400",
                    cursor: "pointer",
                    letterSpacing: "1px",
                }}>
                    {label}
                </button>
            ))}
        </div>
    )

    // ── Desktop layout ──────────────────────────────────────────────────────
    if (!mobile) {
        const leaderboard = <Leaderboard positions={positions} currentTime={currentTime} drivers={drivers} mobile={false} currentLap={lapInfo.currentLap} totalLaps={lapInfo.totalLaps} />
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
                <h1 style={{ color: "#e10600", textAlign: "center", marginBottom: "16px", fontSize: "28px" }}>F1 DASHBOARD</h1>
                {viewToggle}
                <SessionSelector years={years} selectedYear={selectedYear} onYearChange={handleYearChange} sessions={sessions} selectedSession={selectedSession} onSessionChange={handleSessionChange} mobile={false} />
                {appView === "replay" && selectedSession && (
                    <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
                        <div style={{ width: "220px", flexShrink: 0 }}>{leaderboard}</div>
                        <div style={{ flex: 1 }}>{trackPanel}</div>
                        <div style={{ width: "220px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "12px" }}>
                            <TelemetryPanel telemetry={telemetry} currentIndex={currentIndex} selectedDriver={selectedDriver} loadingTelemetry={loadingTelemetry} mobile={false} />
                            <DriverSelector drivers={drivers} selectedDrivers={selectedDrivers} onToggleDriver={toggleDriver} onSelectAll={selectAll} onSelectTelemetry={selectTelemetry} mobile={false} />
                        </div>
                    </div>
                )}
                {appView === "raceline" && (
                    <div style={{ background: "#16213e", borderRadius: "8px", padding: "16px" }}>
                        <RacingLineTab selectedSession={selectedSession} trackData={trackData} mobile={false} />
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

            {/* View toggle */}
            <div style={{ padding: "10px 12px 0" }}>{viewToggle}</div>

            {/* Collapsed summary or open selector */}
            {selectedSession ? summaryBar : null}
            {!selectedSession && selectorOpen && (
                <div style={{ padding: "12px" }}>
                    <SessionSelector years={years} selectedYear={selectedYear} onYearChange={handleYearChange} sessions={sessions} selectedSession={selectedSession} onSessionChange={handleSessionChange} mobile={true} />
                </div>
            )}
            {selectedSession && selectorPanel}

            {appView === "replay" && (
                <>
                    {/* Track — always visible once a session is chosen */}
                    {selectedSession && trackSection}

                    {/* Panel tabs */}
                    {panelTabBar}

                    {/* Tab content */}
                    {selectedSession && (
                        <div style={{ padding: "12px" }}>
                            {activeTab === "leaderboard" && <Leaderboard positions={positions} currentTime={currentTime} drivers={drivers} mobile={true} currentLap={lapInfo.currentLap} totalLaps={lapInfo.totalLaps} />}
                            {activeTab === "telemetry"   && <TelemetryPanel telemetry={telemetry} currentIndex={currentIndex} selectedDriver={selectedDriver} loadingTelemetry={loadingTelemetry} mobile={true} />}
                            {activeTab === "drivers"     && <DriverSelector drivers={drivers} selectedDrivers={selectedDrivers} onToggleDriver={toggleDriver} onSelectAll={selectAll} onSelectTelemetry={selectTelemetry} mobile={true} />}
                        </div>
                    )}
                </>
            )}

            {appView === "raceline" && (
                <div style={{ padding: "12px" }}>
                    <RacingLineTab selectedSession={selectedSession} trackData={trackData} mobile={true} />
                </div>
            )}
        </div>
    )
}
