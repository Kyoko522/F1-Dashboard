import requests
from typing import Optional, Dict, List

class F1DataLoader:    
    def __init__(self, api_base_url: str = "http://localhost:8000"):
        self.base_url = api_base_url
    
    def get_sessions(self, year: int = 2023, session_type: str = "Race") -> List[Dict]:
        response = requests.get(
            f"{self.base_url}/api/sessions",
            params={"year": year, "session_type": session_type}
        )
        return response.json()["data"]
    
    def get_drivers(self, session_key: int) -> List[Dict]:
        response = requests.get(
            f"{self.base_url}/api/drivers",
            params={"session_key": session_key}
        )
        return response.json()["data"]
    
    def get_location_data(self, session_key: int, driver_number: int) -> List[Dict]:
        response = requests.get(
            f"{self.base_url}/api/location/{session_key}",
            params={"driver_number": driver_number}
        )
        return response.json()["data"]
    
    def get_positions(self, session_key: int) -> List[Dict]:
        response = requests.get(f"{self.base_url}/api/positions/{session_key}")
        return response.json()["data"]
    
    def get_telemetry(self, session_key: int, driver_number: int) -> List[Dict]:
        response = requests.get(
            f"{self.base_url}/api/telemetry/{session_key}",
            params={"driver_number": driver_number}
        )
        return response.json()["data"]

    def get_intervals(self, session_key: int) -> List[Dict]:
        response = requests.get(f"{self.base_url}/api/intervals/{session_key}")
        return response.json()["data"]
    
    def get_pit_stops(self, session_key: int) -> List[Dict]:
        response = requests.get(f"{self.base_url}/api/pitstops/{session_key}")
        return response.json()["data"]
    
    def get_laps(self, session_key: int, driver_number: Optional[int] = None) -> List[Dict]:
        params = {"driver_number": driver_number} if driver_number else {}
        response = requests.get(
            f"{self.base_url}/api/laps/{session_key}",
            params=params
        )
        return response.json()["data"]
    
    def get_stints(self, session_key: int, driver_number: Optional[int] = None) -> List[Dict]:
        params = {"driver_number": driver_number} if driver_number else {}
        response = requests.get(
            f"{self.base_url}/api/stints/{session_key}",
            params=params
        )
        return response.json()["data"]