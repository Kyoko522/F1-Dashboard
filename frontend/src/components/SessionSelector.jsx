// SessionSelector — year picker and race session buttons. Years are fetched from the API.

export default function SessionSelector({
    years,
    selectedYear,
    onYearChange,
    sessions,
    selectedSession,
    onSessionChange,
    mobile,
}) {
    const yearBtnStyle = (year) => ({
        background: selectedYear === year ? "#e10600" : "#1a1a2e",
        color: "white",
        border: "1px solid #333",
        borderRadius: "4px",
        cursor: "pointer",
        fontFamily: "monospace",
        // 44px minimum touch target on mobile
        minHeight: mobile ? "44px" : "auto",
        padding: mobile ? "0 16px" : "8px 20px",
        fontSize: mobile ? "13px" : "14px",
        fontWeight: selectedYear === year ? "700" : "400",
    })

    const sessionBtnStyle = (session) => ({
        background: selectedSession?.session_key === session.session_key ? "#e10600" : "#1a1a2e",
        color: "white",
        border: "1px solid #333",
        borderRadius: "4px",
        cursor: "pointer",
        fontFamily: "monospace",
        // 44px minimum touch target on mobile
        minHeight: mobile ? "44px" : "auto",
        padding: mobile ? "0 12px" : "6px 10px",
        fontSize: mobile ? "12px" : "12px",
        fontWeight: selectedSession?.session_key === session.session_key ? "700" : "400",
    })

    return (
        <>
            <div
                style={{
                    display: "flex",
                    gap: mobile ? "6px" : "8px",
                    justifyContent: "center",
                    marginBottom: "10px",
                    flexWrap: "wrap",
                }}
            >
                {years.map((year) => (
                    <button key={year} onClick={() => onYearChange(year)} style={yearBtnStyle(year)}>
                        {year}
                    </button>
                ))}
            </div>
            <div
                style={{
                    display: "flex",
                    gap: "6px",
                    flexWrap: "wrap",
                    marginBottom: mobile ? "12px" : "20px",
                    justifyContent: "center",
                }}
            >
                {sessions.map((session) => (
                    <button
                        key={session.session_key}
                        onClick={() => onSessionChange(session)}
                        style={sessionBtnStyle(session)}
                    >
                        {session.country_name}
                    </button>
                ))}
            </div>
        </>
    )
}
