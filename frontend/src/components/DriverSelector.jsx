// DriverSelector — driver list with track toggle (click) and telemetry selection (TEL button).

import TEAM_COLORS from "../utils/teamColors"

export default function DriverSelector({ drivers, selectedDrivers, onToggleDriver, onSelectAll, onSelectTelemetry }) {
    const allSelected = selectedDrivers.length === drivers.length

    return (
        <div style={{ background: "#16213e", padding: "12px", borderRadius: "8px" }}>
            <h3 style={{ color: "#e10600", margin: "0 0 4px 0" }}>DRIVERS</h3>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <p style={{ color: "#555", fontSize: "11px", margin: 0 }}>Click to track. TEL for telemetry.</p>
                <button
                    onClick={onSelectAll}
                    style={{ background: allSelected ? "#e10600" : "#1a1a2e", color: "white", border: "1px solid #333", padding: "2px 6px", borderRadius: "4px", cursor: "pointer", fontSize: "10px" }}
                >
                    {allSelected ? "CLEAR" : "ALL"}
                </button>
            </div>
            {drivers.map(driver => {
                const isSelected = !!selectedDrivers.find(d => d.driver_number === driver.driver_number)
                const color = TEAM_COLORS[driver.driver_number] || "#ffffff"
                return (
                    <div
                        key={driver.driver_number}
                        style={{ padding: "5px", background: isSelected ? "#e10600" : "transparent", borderRadius: "4px", marginBottom: "2px", fontSize: "12px", display: "flex", justifyContent: "space-between" }}
                    >
                        <span onClick={() => onToggleDriver(driver)} style={{ cursor: "pointer", color }}>
                            #{driver.driver_number} {driver.full_name}
                        </span>
                        <span
                            onClick={() => onSelectTelemetry(driver)}
                            style={{ color: "#888", fontSize: "10px", cursor: "pointer" }}
                        >
                            TEL
                        </span>
                    </div>
                )
            })}
        </div>
    )
}
