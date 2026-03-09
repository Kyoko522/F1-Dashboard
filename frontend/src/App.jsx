import { useState, useEffect } from "react"

const API = "http://localhost:8000"

function App() {
    const [sessions, setSessions] = useState([])
    const [selectedSession, setSelectedSession] = useState(null)
    const [drivers, setDrivers] = useState([])
    const [selectedDriver, setSelectedDriver] = useState(null)
    const [telemetry, setTelemetry] = useState([])
    const [currentIndex, setCurrentIndex] = useState(0)

    useEffect(() => {
        fetch(`${API}/api/sessions?year=2024`)
            .then(res => res.json())
            .then(data => setSessions(data.data))
    }, [])

    useEffect(() => {
        if (!selectedSession) return
        fetch(`${API}/api/drivers?session_key=${selectedSession.session_key}`)
            .then(res => res.json())
            .then(data => setDrivers(data.data))
    }, [selectedSession])

    useEffect(() => {
      if (telemetry.length === 0) return
      console.log("telemetry loaded", telemetry.length, "first record:", telemetry[0])
      console.log("starting interval")
      const interval = setInterval(() => {
        setCurrentIndex(prev => {
          console.log("index:", prev)
          if (prev >= telemetry.length - 1) {
            clearInterval(interval)
            return prev
          }
          return prev + 1
        })
      }, 100)
      return () => clearInterval(interval)
    }, [telemetry])

    useEffect(() => {
      if (!selectedDriver || !selectedSession) return
      setCurrentIndex(0)
      fetch(`${API}/api/telemetry/${selectedSession.session_key}?driver_number=${selectedDriver.driver_number}`)
        .then(res => res.json())
        .then(data => {
          const middle = Math.floor(data.data.length / 2)
          setTelemetry(data.data.slice(middle, middle + 500))
        })
    }, [selectedDriver])

    useEffect(() => {
      if (telemetry.length === 0) return
      const interval = setInterval(() => {
        setCurrentIndex(prev => {
          if (prev >= telemetry.length - 1) {
            clearInterval(interval)
            return prev
          }
          return prev + 1
        })
      }, 100)
      return () => clearInterval(interval)
    }, [telemetry])

    return (
        <div>
            <h1>F1 Dashboard</h1>

            <ul>
                {sessions.map(session => ( //loop or maps each race and make a li element for each
                    <li
                        key={session.session_key} //make a unique id for each one
                        onClick={() => setSelectedSession(session)} // save the clicked race in the state
                        style={{cursor: "pointer"}}
                    >
                        {session.country_name} - {session.session_key}
                    </li>
                ))}
            </ul>

            {selectedSession && (
                <div>
                    <h2>Selected: {selectedSession.country_name} ({selectedSession.session_key})</h2>

                    <ul>
                        {drivers.map(driver => (// loop through all driver and make a li element for each
                            <li
                                key={driver.driver_number}
                                onClick={() => setSelectedDriver(driver)}
                                style={{cursor: 'pointer'}}
                            >
                                #{driver.driver_number} {driver.full_name}
                            </li>
                        ))}
                    </ul>

                    {selectedDriver && (
                      <div>
                        <h3>Selected Driver: {selectedDriver.full_name}</h3>
                        <p>Telemetry records: {telemetry.length}</p>
                          {telemetry.length > 0 && (
                          <div>
                            <p>Speed: {telemetry[currentIndex].speed} km/h</p>
                            <p>Throttle: {telemetry[currentIndex].throttle}%</p>
                            <p>Brake: {telemetry[currentIndex].brake}</p>
                            <p>Gear: {telemetry[currentIndex].n_gear}</p>
                            <p>RPM: {telemetry[currentIndex].rpm}</p>
                            <p>DRS: {telemetry[currentIndex].drs}</p>
                          </div>
                        )}
                      </div>
                    )}
                </div>
            )}
        </div>
    )
}
export default App