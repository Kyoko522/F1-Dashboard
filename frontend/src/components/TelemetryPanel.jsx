// TelemetryPanel — real-time car telemetry metrics. Larger rows on mobile.

import Loading from "./Loading"

const buildMetrics = (point) => [
    { label: "SPEED",    value: `${point.speed} km/h`,              color: "#00ff88" },
    { label: "THROTTLE", value: `${point.throttle}%`,               color: "#00aaff" },
    { label: "BRAKE",    value: point.brake ? "ON" : "OFF",          color: "#ff4444" },
    { label: "GEAR",     value: point.n_gear,                        color: "white"   },
    { label: "RPM",      value: point.rpm,                           color: "white"   },
    { label: "DRS",      value: point.drs > 10 ? "OPEN" : "CLOSED", color: point.drs > 10 ? "#00ff88" : "#888" },
]

export default function TelemetryPanel({ telemetry, currentIndex, selectedDriver, loadingTelemetry, mobile }) {
    return (
        <div style={{ background: "#16213e", padding: "12px", borderRadius: "8px" }}>
            <h3 style={{ color: "#e10600", margin: "0 0 8px 0", fontSize: mobile ? "14px" : "16px" }}>TELEMETRY</h3>
            {selectedDriver && (
                <p style={{ color: "#aaa", margin: "0 0 10px 0", fontSize: mobile ? "13px" : "12px" }}>
                    {selectedDriver.full_name}
                </p>
            )}
            {loadingTelemetry ? (
                <Loading message="Loading telemetry..." />
            ) : telemetry.length > 0 ? (
                <div>
                    {buildMetrics(telemetry[currentIndex]).map(({ label, value, color }) => (
                        <div
                            key={label}
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                // 44px rows on mobile so the content is easy to read while scrolling
                                minHeight: mobile ? "44px" : "auto",
                                fontSize: mobile ? "15px" : "13px",
                                borderBottom: mobile ? "1px solid #1a2a4a" : "none",
                                padding: mobile ? "0 4px" : "0",
                            }}
                        >
                            <span style={{ color: "#666", fontSize: mobile ? "12px" : "11px", letterSpacing: "0.5px" }}>
                                {label}
                            </span>
                            <span style={{ color, fontWeight: "700", fontVariantNumeric: "tabular-nums" }}>
                                {value}
                            </span>
                        </div>
                    ))}
                </div>
            ) : (
                <p style={{ color: "#555", fontSize: mobile ? "14px" : "12px" }}>Select a driver</p>
            )}
        </div>
    )
}
