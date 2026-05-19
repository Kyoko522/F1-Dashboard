// API service — all fetch calls to the backend live here. No fetch() calls in components.

const API = import.meta.env.VITE_API_URL ?? "http://localhost:8000"

export const fetchYears = async () => {
    const res = await fetch(`${API}/api/years`)
    return res.json()
}

export const fetchSessions = async (year) => {
    const res = await fetch(`${API}/api/sessions?year=${year}`)
    return res.json()
}

export const fetchSessionInit = async (sessionKey) => {
    const res = await fetch(`${API}/api/session_init/${sessionKey}`)
    return res.json()
}

export const fetchTelemetry = async (sessionKey, driverNumber) => {
    const res = await fetch(`${API}/api/telemetry/${sessionKey}/${driverNumber}`)
    return res.json()
}

export const fetchLocation = async (sessionKey, driverNumber) => {
    const res = await fetch(`${API}/api/location/${sessionKey}/${driverNumber}`)
    return res.json()
}

export const fetchRacingLine = async (
    sessionKey,
    { power_hp = 1000, weight_kg = 800, downforce = "medium", tire = "medium" } = {}
) => {
    const params = new URLSearchParams({ power_hp, weight_kg, downforce, tire })
    const res = await fetch(`${API}/api/racing_line/${sessionKey}?${params}`)
    return res.json()
}
