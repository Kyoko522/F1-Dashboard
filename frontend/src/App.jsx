import { useState, useEffect } from "react"

const API = "http://localhost:8000"

function App() {
  const [sessions, setSessions] = useState([])
  const [selectedSession, setSelectedSession] = useState(null)
  const [drivers, setDrivers] = useState([])
  const [selectedDriver, setSelectedDriver] = useState(null)

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
  },[selectedSession])

  return (
      <div>
        <h1>F1 Dashboard</h1>

        <ul>
          {sessions.map(session => ( //loop or maps each race and make a li element for each
            <li
              key={session.session_key} //make a unique id for each one
              onClick={() => setSelectedSession(session)} // save the clicked race in the state
              style={{ cursor: "pointer" }}
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
                  style={{ cursor: 'pointer' }}
                >
                  #{driver.driver_number} {driver.full_name}
                </li>
              ))}
            </ul>

            {selectedDriver && (
              <h3>Selected Driver: {selectedDriver.full_name}</h3>
            )}
          </div>
        )}
      </div>
    )
}

export default App