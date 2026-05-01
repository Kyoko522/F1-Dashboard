// PlaybackControls — play/pause, speed selector, and seek slider. 44px targets on mobile.

const SPEED_OPTIONS = [1, 2, 5, 10]

export default function PlaybackControls({ isPlaying, speed, playbackOffset, sessionBounds, onTogglePlay, onSpeedChange, onSeek, mobile }) {
    const maxOffset = sessionBounds ? sessionBounds.end - sessionBounds.start : 0

    const speedButtonStyle = (s) => ({
        background: speed === s ? "#e10600" : "#1a1a2e",
        color: "white",
        border: "1px solid #333",
        borderRadius: "4px",
        cursor: "pointer",
        fontFamily: "monospace",
        fontSize: mobile ? "13px" : "11px",
        // 44px minimum touch target on mobile
        minHeight: mobile ? "44px" : "auto",
        minWidth: mobile ? "44px" : "auto",
        padding: mobile ? "0" : "3px 8px",
    })

    const playPauseStyle = {
        background: "#e10600",
        color: "white",
        border: "none",
        borderRadius: "4px",
        cursor: "pointer",
        fontSize: mobile ? "18px" : "14px",
        // 44x44px minimum on mobile
        minHeight: mobile ? "44px" : "auto",
        minWidth: mobile ? "44px" : "auto",
        padding: mobile ? "0" : "4px 12px",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    }

    return (
        <div style={{ marginTop: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: mobile ? "8px" : "10px" }}>
                <button onClick={onTogglePlay} style={playPauseStyle}>
                    {isPlaying ? "⏸" : "▶"}
                </button>
                <div style={{ display: "flex", gap: mobile ? "6px" : "4px" }}>
                    {SPEED_OPTIONS.map(s => (
                        <button key={s} onClick={() => onSpeedChange(s)} style={speedButtonStyle(s)}>
                            {s}x
                        </button>
                    ))}
                </div>
                <input
                    type="range"
                    min={0}
                    max={maxOffset}
                    value={playbackOffset}
                    onChange={e => onSeek(Number(e.target.value))}
                    style={{ flex: 1, accentColor: "#e10600", cursor: "pointer", height: mobile ? "20px" : "auto" }}
                />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "#555", marginTop: "4px" }}>
                <span>START</span>
                <span>END</span>
            </div>
        </div>
    )
}
