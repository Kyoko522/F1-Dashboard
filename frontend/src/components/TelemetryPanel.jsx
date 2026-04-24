// TelemetryPanel — shows real-time car telemetry metrics for the selected driver.

import Loading from "./Loading"

const buildMetrics = (point) => [
    { label: "SPEED",    value: `${point.speed} km/h`,              color: "#00ff88" },
    { label: "THROTTLE", value: `${point.throttle}%`,               color: "#00aaff" },
    { label: "BRAKE",    value: point.brake ? "ON" : "OFF",          color: "#ff4444" },
    { label: "GEAR",     value: point.n_gear,                        color: "white"   },
    { label: "RPM",      value: point.rpm,                           color: "white"   },
    { label: "DRS",      value: point.drs > 10 ? "OPEN" : "CLOSED", color: point.drs > 10 ? "#00ff88" : "#888" },
]

export default function TelemetryPanel({ telemetry, currentIndex, selectedDriver, loadingTelemetry }) {
    return (
        <div style={{ background: "#16213e", padding: "12px", borderRadius: "8px" }}>
            <h3 style={{ color: "#e10600", margin: "0 0 12px 0" }}>TELEMETRY</h3>
            {selectedDriver && (
                <p style={{ color: "#888", margin: "0 0 8px 0", fontSize: "12px" }}>
                    {selectedDriver.full_name}
                </p>
            )}
            {loadingTelemetry ? (
                <Loading message="Loading telemetry..." />
            ) : telemetry.length > 0 ? (
                <div style={{ fontSize: "13px", lineHeight: "2" }}>
                    {buildMetrics(telemetry[currentIndex]).map(({ label, value, color }) => (
                        <div key={label} style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: "#888" }}>{label}</span>
                            <span style={{ color }}>{value}</span>
                        </div>
                    ))}
                </div>
            ) : (
                <p style={{ color: "#555", fontSize: "12px" }}>Select a driver</p>
            )}
        </div>
    )
}
