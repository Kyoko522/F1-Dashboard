// useSessionData — fetches sessions, session init, driver locations, and telemetry data.

import { useState, useEffect, useRef } from "react"
import { fetchSessions, fetchSessionInit, fetchTelemetry, fetchLocation } from "../services/api"

export default function useSessionData(selectedYear, selectedSession, selectedDrivers, selectedDriver) {
    const [sessions, setSessions] = useState([])
    const [drivers, setDrivers] = useState([])
    const [positions, setPositions] = useState([])
    const [trackData, setTrackData] = useState([])
    const [driverLocations, setDriverLocations] = useState({})
    const [telemetry, setTelemetry] = useState([])
    const [loadingSession, setLoadingSession] = useState(false)
    const [loadingDrivers, setLoadingDrivers] = useState(false)
    const [loadingTelemetry, setLoadingTelemetry] = useState(false)
    const fetchingRef = useRef(new Set())

    useEffect(() => {
        fetchSessions(selectedYear)
            .then(data => setSessions(data.data ?? []))
    }, [selectedYear])

    useEffect(() => {
        if (!selectedSession) return
        setDriverLocations({})
        setTelemetry([])
        fetchingRef.current.clear()
        setLoadingSession(true)
        fetchSessionInit(selectedSession.session_key)
            .then(data => {
                const { drivers: fetchedDrivers, positions: fetchedPositions, track } = data.data
                setDrivers(fetchedDrivers)
                setPositions(fetchedPositions)
                setTrackData((track || []).filter(pt => pt.x !== 0 && pt.y !== 0))
                setLoadingSession(false)
            })
            .catch(() => setLoadingSession(false))
    }, [selectedSession])

    useEffect(() => {
        if (!selectedDriver || !selectedSession) return
        setLoadingTelemetry(true)
        fetchTelemetry(selectedSession.session_key, selectedDriver.driver_number)
            .then(data => {
                setTelemetry(data.data ?? [])
                setLoadingTelemetry(false)
            })
    }, [selectedDriver])

    useEffect(() => {
        if (!selectedSession) return
        const missing = selectedDrivers.filter(
            d => !driverLocations[d.driver_number] && !fetchingRef.current.has(d.driver_number)
        )
        if (!missing.length) return
        missing.forEach(d => fetchingRef.current.add(d.driver_number))

        const loadMissing = async () => {
            setLoadingDrivers(true)
            const results = await Promise.all(
                missing.map(async (driver) => {
                    const data = await fetchLocation(selectedSession.session_key, driver.driver_number)
                    const points = (data.data || [])
                        .filter(p => p.x !== 0 && p.y !== 0)
                        .map(p => ({ ...p, t: new Date(p.date).getTime() }))
                    fetchingRef.current.delete(driver.driver_number)
                    return { driver_number: driver.driver_number, points }
                })
            )
            setDriverLocations(prev => {
                const updated = { ...prev }
                for (const { driver_number, points } of results) updated[driver_number] = points
                return updated
            })
            setLoadingDrivers(false)
        }
        loadMissing()
    }, [selectedDrivers])

    return {
        sessions, drivers, positions, trackData,
        driverLocations, setDriverLocations,
        telemetry, loadingSession, loadingDrivers, loadingTelemetry,
        fetchingRef,
    }
}
