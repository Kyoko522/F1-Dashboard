// SessionSelector — year picker and race session buttons at the top of the dashboard.

const YEARS = [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026]

export default function SessionSelector({ selectedYear, onYearChange, sessions, selectedSession, onSessionChange, mobile }) {
    return (
        <>
            <div style={{ display: "flex", gap: "8px", justifyContent: "center", marginBottom: "12px", flexWrap: "wrap" }}>
                {YEARS.map(year => (
                    <button
                        key={year}
                        onClick={() => onYearChange(year)}
                        style={{ background: selectedYear === year ? "#e10600" : "#1a1a2e", color: "white", border: "1px solid #333", padding: "8px 20px", cursor: "pointer", borderRadius: "4px", fontSize: "14px" }}
                    >
                        {year}
                    </button>
                ))}
            </div>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "20px", justifyContent: "center" }}>
                {sessions.map(session => (
                    <button
                        key={session.session_key}
                        onClick={() => onSessionChange(session)}
                        style={{ background: selectedSession?.session_key === session.session_key ? "#e10600" : "#1a1a2e", color: "white", border: "1px solid #333", padding: "6px 10px", cursor: "pointer", borderRadius: "4px", fontSize: mobile ? "11px" : "12px" }}
                    >
                        {session.country_name}
                    </button>
                ))}
            </div>
        </>
    )
}
