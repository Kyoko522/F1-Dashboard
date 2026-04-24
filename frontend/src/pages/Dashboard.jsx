// Dashboard page — main layout combining all panels. Holds top-level state and coordinates hooks.

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

const TABS = [
    { id: "track",       label: "TRACK"   },
    { id: "leaderboard", label: "LEAD"    },
    { id: "telemetry",   label: "TEL"     },
    { id: "drivers",     label: "DRIVERS" },
]

const tabButtonStyle = (isActive) => ({
    flex: 1,
    minHeight: "44px",       // mobile touch target minimum
    background: isActive ? "#e10600" : "#1a1a2e",
    color: "white",
    border: "none",
    borderRight: "1px solid #333",
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
    const [activeTab, setActiveTab] = useState("track")

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
        setActiveTab("track")
        fetchingRef.current.clear()
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

    const leaderboard = (
        <Leaderboard
            positions={positions}
            currentTime={currentTime}
            drivers={drivers}
            mobile={mobile}
        />
    )

    const trackPanel = (
        <div style={{ background: "#16213e", borderRadius: mobile ? "0" : "8px", padding: mobile ? "12px" : "12px" }}>
            <h3 style={{ color: "#e10600", margin: "0 0 12px 0", fontSize: mobile ? "14px" : "16px" }}>
                RACE TRACK — {selectedSession?.country_name}
            </h3>
            {loadingSession ? <Loading message="Loading session data..." /> :
             loadingDrivers ? <Loading message="Loading driver positions..." /> : (
                <TrackCanvas
                    trackData={trackData}
                    driverLocations={driverLocations}
                    selectedDrivers={selectedDrivers}
                    currentTime={currentTime}
                />
            )}
            {Object.keys(driverLocations).length > 0 && (
                <PlaybackControls
                    isPlaying={isPlaying}
                    speed={speed}
                    playbackOffset={playbackOffset}
                    sessionBounds={sessionBounds}
                    onTogglePlay={togglePlay}
                    onSpeedChange={setSpeed}
                    onSeek={handleSeek}
                    mobile={mobile}
                />
            )}
        </div>
    )

    const telemetryPanel = (
        <TelemetryPanel
            telemetry={telemetry}
            currentIndex={currentIndex}
            selectedDriver={selectedDriver}
            loadingTelemetry={loadingTelemetry}
            mobile={mobile}
        />
    )

    const driverSelector = (
        <DriverSelector
            drivers={drivers}
            selectedDrivers={selectedDrivers}
            onToggleDriver={toggleDriver}
            onSelectAll={selectAll}
            onSelectTelemetry={selectTelemetry}
            mobile={mobile}
        />
    )

    return (
        <div style={{ background: "#0a0a1a", minHeight: "100vh", color: "white", padding: mobile ? "0" : "20px", fontFamily: "monospace" }}>
            <h1 style={{ color: "#e10600", textAlign: "center", margin: mobile ? "0" : "0 0 20px 0", padding: mobile ? "16px 12px 12px" : "0", fontSize: mobile ? "18px" : "28px", letterSpacing: "2px" }}>
                F1 DASHBOARD
            </h1>

            <div style={{ padding: mobile ? "0 12px" : "0" }}>
                <SessionSelector
                    years={years}
                    selectedYear={selectedYear}
                    onYearChange={handleYearChange}
                    sessions={sessions}
                    selectedSession={selectedSession}
                    onSessionChange={handleSessionChange}
                    mobile={mobile}
                />
            </div>

            {selectedSession && (
                mobile ? (
                    <div style={{ display: "flex", flexDirection: "column" }}>
                        {/* Tab bar — sticky so it stays in view while scrolling content */}
                        <div style={{ display: "flex", position: "sticky", top: 0, zIndex: 10, borderTop: "1px solid #333", borderBottom: "1px solid #333" }}>
                            {TABS.map(({ id, label }) => (
                                <button key={id} onClick={() => setActiveTab(id)} style={tabButtonStyle(activeTab === id)}>
                                    {label}
                                </button>
                            ))}
                        </div>
                        <div style={{ padding: "12px" }}>
                            {activeTab === "track"       && trackPanel}
                            {activeTab === "leaderboard" && leaderboard}
                            {activeTab === "telemetry"   && telemetryPanel}
                            {activeTab === "drivers"     && driverSelector}
                        </div>
                    </div>
                ) : (
                    <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
                        <div style={{ width: "220px", flexShrink: 0 }}>{leaderboard}</div>
                        <div style={{ flex: 1 }}>{trackPanel}</div>
                        <div style={{ width: "220px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "12px" }}>
                            {telemetryPanel}
                            {driverSelector}
                        </div>
                    </div>
                )
            )}
        </div>
    )
}
