from turtle import position
import requests
from typing import Optional, List, Dict, Any
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class OpenF1Client:
    """
    Client for interacting with OpenF1 API
    Handles all requests to api.openf1.org
    """

    def __init__(self):
        """Initialize the client with base URL"""
        self.base_url = "https://api.openf1.org/v1"
        self.timeout = 10

        # Create a session for connection pooling (faster repeated requests)
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "F1-Dashboard/1.0"
        })
        
        logger.info("OpenF1Client initialized")
    
    def _make_request(self, endpoint: str, params: Optional[Dict] = None) -> Optional[List[Dict[Any, Any]]]:
        """
        Private method to make HTTP requests with error handling
        
        Args:
            endpoint: API endpoint (e.g., "/drivers")
            params: Optional query parameters (e.g., {"session_key": "latest"})
        
        Returns:
            List of dictionaries with data, or None if request fails
        """
        url = f"{self.base_url}{endpoint}"
        
        try:
            logger.info(f"Making request to: {url}")
            response = self.session.get(url, params=params, timeout=self.timeout)
            
            # Check status code
            response.raise_for_status()  # Raises exception for 4xx/5xx errors
            
            # Parse JSON
            data = response.json()
            logger.info(f"Successfully retrieved {len(data)} records")
            return data
            
        except requests.exceptions.Timeout:
            logger.error(f"Request timeout for {url}")
            return None
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Request failed: {str(e)}")
            return None
            
        except ValueError as e:
            logger.error(f"Invalid JSON response: {str(e)}")
            return None
    
    def get_drivers(self, session_key: str = "latest") -> Optional[List[Dict[Any, Any]]]:
        """
        Get list of drivers for a session
        
        Args:
            session_key: Session identifier (default: "latest")
        
        Returns:
            List of driver dictionaries
        """
        params = {"session_key": session_key}
        return self._make_request("/drivers", params=params)
    
    def get_driver_by_number(self, driver_number: int, session_key: str = "latest") -> Optional[Dict[Any, Any]]:
        """
        Get specific driver information
        
        Args:
            driver_number: Driver's race number
            session_key: Session identifier
        
        Returns:
            Single driver dictionary or None
        """
        drivers = self.get_drivers(session_key)
        
        if drivers:
            for driver in drivers:
                if driver.get("driver_number") == driver_number:
                    return driver
        
        return None
    
    def get_sessions(self, year: Optional[int] = None, session_type: Optional[str] = None, country_name: Optional[str] = None) -> Optional[List[Dict[Any, Any]]]:
        """
        Get sessions (races, qualifying, practice, etc.)
        
        Args:
            year: Filter by year (e.g., 2024)
            session_type: Filter by type ("Race", "Qualifying", "Practice 1", etc.)
            country_name: Filter by country (e.g., "Monaco")
        
        Returns:
            List of session dictionaries or None if request fails
        
        Example:
            # Get all 2024 races
            sessions = client.get_sessions(year=2024, session_type="Race")
            
            # Get Monaco GP sessions
            sessions = client.get_sessions(country_name="Monaco")
        """
        # Build query parameters
        params = {}
        if year:
            params["year"] = year
        if session_type:
            params["session_type"] = session_type
        if country_name:
            params["country_name"] = country_name
        
        # Use the _make_request helper method
        return self._make_request("/sessions", params=params)
    
    def get_location_data(self, session_key: int, driver_number: Optional[int] = None, date: Optional[str] = None) -> Optional[List[Dict[Any, Any]]]:
        """
        Get location data (X, Y, Z coordinates) for cars during a session.
        
        Args:
            session_key: Session identifier (int, not string)
            driver_number: Optional - filter by specific driver
            date: Optional - filter by timestamp
        
        Returns:
            List of location records with X, Y, Z coordinates
            
        Example:
            # Get all car positions for a session
            locations = client.get_location_data(session_key=9161)
            
            # Get positions for driver #1 only
            locations = client.get_location_data(session_key=9161, driver_number=1)
        
        Warning:
            Without driver_number filter, this returns 100,000+ records!
        """
        # Build query parameters
        params = {"session_key": session_key}
        
        if driver_number:
            params["driver_number"] = driver_number
        
        if date:
            params["date"] = date
        
        return self._make_request("/location", params=params)

    def get_car_data(
        self, 
        session_key: int, 
        driver_number: Optional[int] = None, 
        speed: Optional[int] = None,
        throttle: Optional[int] = None,
        brake: Optional[int] = None,
        drs: Optional[int] = None,
        rpm: Optional[int] = None,
        n_gear: Optional[int] = None
    ) -> Optional[List[Dict[Any, Any]]]:
        """
        Get car telemetry data (speed, throttle, brake, gear, RPM, DRS)
        
        Args:
            session_key: Session identifier (required)
            driver_number: Optional - filter by specific driver
            speed: Optional - filter by minimum speed (km/h)
            throttle: Optional - filter by minimum throttle (%)
            brake: Optional - filter by minimum brake pressure
            drs: Optional - filter by DRS status
            rpm: Optional - filter by minimum RPM
            n_gear: Optional - filter by specific gear
        
        Returns:
            List of telemetry records with car data
            
        Data includes:
            - speed: Velocity in km/h
            - throttle: Throttle percentage (0-100)
            - brake: Brake status (0=off, 100=on)
            - n_gear: Current gear (0-8, 0=neutral)
            - rpm: Engine revolutions per minute
            - drs: DRS status (0-14, see OpenF1 docs for mapping)
        """
        # Build query parameters
        params = {"session_key": session_key}
        
        if driver_number:
            params["driver_number"] = driver_number
        
        if speed:
            params["speed"] = f">={speed}"
        
        if throttle:
            params["throttle"] = f">={throttle}"
        
        if brake:
            params["brake"] = f">={brake}"
        
        if drs:
            params["drs"] = drs  # DRS is exact match, not >=
        
        if rpm:
            params["rpm"] = f">={rpm}"
        
        if n_gear:
            params["n_gear"] = n_gear  # Gear is exact match
        
        return self._make_request("/car_data", params=params)

    def get_laps_data(self, session_key: int, driver_number: Optional[int] = None, lap_number: Optional[int] = None) -> Optional[List[Dict[Any, Any]]]:
        """
        Get lap data for drivers in a session.
        
        Args:
            session_key: Session identifier (required)
            driver_number: Optional - filter by specific driver
            lap_number: Optional - filter by specific lap
        
        Returns:
            List of lap records with timing data
        """
        # Build query parameters
        params = {"session_key": session_key}
        
        if driver_number:
            params["driver_number"] = driver_number
        
        if lap_number:
            params["lap_number"] = lap_number
        
        return self._make_request("/laps", params=params)

    def get_position_data(self, session_key: int, driver_number: Optional[int] = None, position: Optional[int] = None) -> Optional[List[Dict[Any, Any]]]:
        """
        Get position data for drivers in a session.
        
        Args:
            session_key: Session identifier (required)
            driver_number: Optional - filter by specific driver
            position: Optional - filter by specific position (e.g., position=1 for P1)
        
        Returns:
            List of position records showing driver positions throughout session
            
        Example:
            # Get all position changes
            positions = client.get_position_data(session_key=9161)
            
            # Get position changes for driver #63
            positions = client.get_position_data(session_key=9161, driver_number=63)
            
            # Get all times any driver was in P1
            positions = client.get_position_data(session_key=9161, position=1)
        
        Data includes:
            - position: Current race position (1, 2, 3, etc.)
            - driver_number: Driver's race number
            - date: Timestamp of position change
        """
        # Build query parameters
        params = {"session_key": session_key}
        
        if driver_number:
            params["driver_number"] = driver_number
        
        if position:
            params["position"] = position 
        
        return self._make_request("/position", params=params)

    def get_intervals(self, session_key: int, driver_number: Optional[int] = None) -> Optional[List[Dict[Any, Any]]]:
        """
        Get interval data for drivers in a session.
        
        Args:
            session_key: Session identifier (required)
            driver_number: Optional - filter by specific driver
        
        Returns:
            List of interval records showing time gaps between drivers
        """
        # Build query parameters
        params = {"session_key": session_key}
        
        if driver_number:
            params["driver_number"] = driver_number
        
        return self._make_request("/intervals", params=params)

# Create singleton instance AFTER the class definition
openf1_client = OpenF1Client()