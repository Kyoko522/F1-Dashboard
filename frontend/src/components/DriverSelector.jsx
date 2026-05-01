// DriverSelector — driver list with track toggle and telemetry selection. 44px rows on mobile.

import TEAM_COLORS from "../utils/teamColors"

export default function DriverSelector({ drivers, selectedDrivers, onToggleDriver, onSelectAll, onSelectTelemetry, mobile }) {
    const allSelected = selectedDrivers.length === drivers.length

    return (
        <div style={{ background: "#16213e", padding: "12px", borderRadius: "8px" }}>
            {/* Header row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <h3 style={{ color: "#e10600", margin: 0, fontSize: mobile ? "14px" : "16px" }}>DRIVERS</h3>
                {/* ALL/CLEAR — 44px touch target on mobile */}
                <button
                    onClick={onSelectAll}
                    style={{
                        background: allSelected ? "#e10600" : "#1a1a2e",
                        color: "white",
                        border: "1px solid #333",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontFamily: "monospace",
                        fontSize: mobile ? "12px" : "10px",
                        minHeight: mobile ? "44px" : "auto",
                        minWidth: mobile ? "64px" : "auto",
                        padding: mobile ? "0 12px" : "2px 6px",
                    }}
                >
                    {allSelected ? "CLEAR" : "ALL"}
                </button>
            </div>

            {!mobile && (
                <p style={{ color: "#555", fontSize: "11px", margin: "0 0 8px 0" }}>
                    Click to track. TEL for telemetry.
                </p>
            )}

            {drivers.map(driver => {
                const isSelected = !!selectedDrivers.find(d => d.driver_number === driver.driver_number)
                const color = TEAM_COLORS[driver.driver_number] || "#ffffff"
                return (
                    <div
                        key={driver.driver_number}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            // 44px minimum row height on mobile
                            minHeight: mobile ? "44px" : "auto",
                            padding: mobile ? "0 8px" : "5px",
                            background: isSelected ? "#e10600" : "transparent",
                            borderRadius: "4px",
                            marginBottom: mobile ? "2px" : "2px",
                            borderBottom: mobile ? "1px solid #1a1a2e" : "none",
                        }}
                    >
                        {/* Driver name — full width tap area */}
                        <button
                            onClick={() => onToggleDriver(driver)}
                            style={{
                                background: "none",
                                border: "none",
                                color,
                                cursor: "pointer",
                                fontFamily: "monospace",
                                fontSize: mobile ? "14px" : "12px",
                                textAlign: "left",
                                flex: 1,
                                minWidth: 0,
                                minHeight: mobile ? "44px" : "auto",
                                padding: 0,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                            }}
                        >
                            <span style={{ color: "#aaa", marginRight: "6px", fontSize: mobile ? "12px" : "11px" }}>
                                #{driver.driver_number}
                            </span>
                            {driver.full_name}
                        </button>

                        {/* TEL button — 44x44px touch target on mobile */}
                        <button
                            onClick={() => onSelectTelemetry(driver)}
                            style={{
                                background: "#0a0a1a",
                                border: "1px solid #333",
                                color: "#888",
                                cursor: "pointer",
                                fontFamily: "monospace",
                                fontSize: mobile ? "11px" : "10px",
                                borderRadius: "4px",
                                minHeight: mobile ? "44px" : "auto",
                                minWidth: mobile ? "44px" : "auto",
                                padding: mobile ? "0 8px" : "2px 6px",
                            }}
                        >
                            TEL
                        </button>
                    </div>
                )
            })}
        </div>
    )
}
