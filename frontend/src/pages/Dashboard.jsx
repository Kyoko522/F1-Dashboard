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

const TAB_BUTTON_STYLE = (isActive) => ({
    flex: 1,
    background: isActive ? "#e10600" : "#1a1a2e",
    color: "white",
    border: "1px solid #333",
    padding: "8px",
    cursor: "pointer",
    fontSize: "12px",
    fontFamily: "monospace",
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
        sessions, drivers, positions, trackData,
        driverLocations, setDriverLocations,
        telemetry, loadingSession, loadingDrivers, loadingTelemetry,
        fetchingRef,
    } = useSessionData(selectedYear, selectedSession, selectedDrivers, selectedDriver)

    const {
        isPlaying, setIsPlaying, speed, setSpeed,
        playbackOffset, setPlaybackOffset,
        currentTime, sessionBounds, togglePlay,
    } = usePlayback(driverLocations)

    // Keep telemetry index in sync with playback position
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

    const leaderboard = <Leaderboard positions={positions} currentTime={currentTime} drivers={drivers} />

    const trackPanel = (
        <div style={{ background: "#16213e", borderRadius: "8px", padding: "12px" }}>
            <h3 style={{ color: "#e10600", margin: "0 0 12px 0" }}>
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
        />
    )

    const driverSelector = (
        <DriverSelector
            drivers={drivers}
            selectedDrivers={selectedDrivers}
            onToggleDriver={toggleDriver}
            onSelectAll={selectAll}
            onSelectTelemetry={selectTelemetry}
        />
    )

    return (
        <div style={{ background: "#0a0a1a", minHeight: "100vh", color: "white", padding: mobile ? "12px" : "20px", fontFamily: "monospace" }}>
            <h1 style={{ color: "#e10600", textAlign: "center", marginBottom: "20px", fontSize: mobile ? "20px" : "28px" }}>
                F1 DASHBOARD
            </h1>

            <SessionSelector
                selectedYear={selectedYear}
                onYearChange={handleYearChange}
                sessions={sessions}
                selectedSession={selectedSession}
                onSessionChange={handleSessionChange}
                mobile={mobile}
            />

            {selectedSession && (
                mobile ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        <div style={{ display: "flex", borderRadius: "8px", overflow: "hidden", border: "1px solid #333" }}>
                            {["track", "leaderboard", "telemetry", "drivers"].map((tab, i) => (
                                <button key={tab} onClick={() => setActiveTab(tab)} style={TAB_BUTTON_STYLE(activeTab === tab)}>
                                    {["TRACK", "LEAD", "TEL", "DRIVERS"][i]}
                                </button>
                            ))}
                        </div>
                        {activeTab === "track"       && trackPanel}
                        {activeTab === "leaderboard" && leaderboard}
                        {activeTab === "telemetry"   && telemetryPanel}
                        {activeTab === "drivers"     && driverSelector}
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
