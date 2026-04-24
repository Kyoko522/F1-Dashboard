// PlaybackControls — play/pause toggle, speed selector, and seek slider.

const SPEED_OPTIONS = [1, 2, 5, 10]

export default function PlaybackControls({ isPlaying, speed, playbackOffset, sessionBounds, onTogglePlay, onSpeedChange, onSeek }) {
    const maxOffset = sessionBounds ? sessionBounds.end - sessionBounds.start : 0

    const speedButtonStyle = (s) => ({
        background: speed === s ? "#e10600" : "#1a1a2e",
        color: "white",
        border: "1px solid #333",
        padding: "3px 8px",
        borderRadius: "4px",
        cursor: "pointer",
        fontSize: "11px",
        fontFamily: "monospace",
    })

    return (
        <div style={{ marginTop: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <button
                    onClick={onTogglePlay}
                    style={{ background: "#e10600", color: "white", border: "none", padding: "4px 12px", borderRadius: "4px", cursor: "pointer", fontSize: "12px", flexShrink: 0 }}
                >
                    {isPlaying ? "⏸" : "▶"}
                </button>
                <div style={{ display: "flex", gap: "4px" }}>
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
                    style={{ flex: 1, accentColor: "#e10600", cursor: "pointer" }}
                />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "#555", marginTop: "4px" }}>
                <span>START</span>
                <span>END</span>
            </div>
        </div>
    )
}
