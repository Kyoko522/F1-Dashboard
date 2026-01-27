import requests
from typing import Optional, List, Dict, Any
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class OpenF1Client:  # ✅ Fixed name
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


'''
TODO: 
# Already have:
GET / (root)
GET /api/drivers
GET /api/drivers/{driver_number}
GET /api/sessions                                       # List races

# Need to add:
1. 
2. GET /api/location/{session_key}                         # Position data
3. GET /api/telemetry/{session_key}                        # Car data
4. GET /api/laps/{session_key}                            # Lap info
5. GET /api/positions/{session_key}                        # Race positions
6. GET /api/intervals/{session_key}                        # Driver gaps
7. GET /api/stints/{session_key}                          # Tire stints
8. GET /api/pitstops/{session_key}                        # Pit stops
'''


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

openf1_client = OpenF1Client() 