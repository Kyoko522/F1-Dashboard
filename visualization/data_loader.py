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
    # def get_weather(self, session_key: int) -> List[Dict]:
    #     response = requests.get(f"{self.base_url}/api/weather/{session_key}")
    #     f"{self.base_url}/api/weather/{session_key}"
        return response.json()["data"]