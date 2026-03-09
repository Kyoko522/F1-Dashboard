import f1car from "./assets/f1car.png"

export default function Loading({ message = "Loading..." }) {
    return (
        <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "200px",
            gap: "20px"
        }}>
            <div style={{ position: "relative", width: "120px", height: "120px" }}>
                <img
                    src={f1car}
                    alt="loading"
                    style={{
                        width: "60px",
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        marginTop: "-30px",
                        marginLeft: "-30px",
                        transformOrigin: "30px 60px",
                        animation: "orbit 1.2s linear infinite"
                    }}
                />
            </div>
            <p style={{ color: "#888", fontSize: "12px" }}>{message}</p>
            <style>{`
                @keyframes orbit {
                    from { transform: rotate(360deg); }
                    to { transform: rotate(0deg); }
                }
            `}</style>
        </div>
    )
}