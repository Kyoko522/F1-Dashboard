import logging
from typing import Any

import requests

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
        self.session.headers.update({"User-Agent": "F1-Dashboard/1.0"})

        logger.info("OpenF1Client initialized")

    def _make_request(self, endpoint: str, params: dict | None = None) -> list[dict[Any, Any]] | None:
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

    def get_drivers(self, session_key: str = "latest") -> list[dict[Any, Any]] | None:
        params = {"session_key": session_key}
        return self._make_request("/drivers", params=params)

    def get_driver_by_number(self, driver_number: int, session_key: str = "latest") -> dict[Any, Any] | None:
        drivers = self.get_drivers(session_key)

        if drivers:
            for driver in drivers:
                if driver.get("driver_number") == driver_number:
                    return driver

        return None

    def get_sessions(
        self, year: int | None = None, session_type: str | None = None, country_name: str | None = None
    ) -> list[dict[Any, Any]] | None:
        params = {}
        if year:
            params["year"] = year
        if session_type:
            params["session_type"] = session_type
        if country_name:
            params["country_name"] = country_name

        # Use the _make_request helper method
        return self._make_request("/sessions", params=params)

    def get_location_data(
        self, session_key: int, driver_number: int | None = None, date: str | None = None
    ) -> list[dict[Any, Any]] | None:
        params = {"session_key": session_key}

        if driver_number:
            params["driver_number"] = driver_number

        if date:
            params["date"] = date

        return self._make_request("/location", params=params)

    def get_car_data(
        self,
        session_key: int,
        driver_number: int | None = None,
        speed: int | None = None,
        throttle: int | None = None,
        brake: int | None = None,
        drs: int | None = None,
        rpm: int | None = None,
        n_gear: int | None = None,
    ) -> list[dict[Any, Any]] | None:
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
            params["drs"] = drs

        if rpm:
            params["rpm"] = f">={rpm}"

        if n_gear:
            params["n_gear"] = n_gear  # Gear is exact match

        return self._make_request("/car_data", params=params)

    def get_laps_data(
        self, session_key: int, driver_number: int | None = None, lap_number: int | None = None
    ) -> list[dict[Any, Any]] | None:
        params = {"session_key": session_key}

        if driver_number:
            params["driver_number"] = driver_number

        if lap_number:
            params["lap_number"] = lap_number

        return self._make_request("/laps", params=params)

    def get_position_data(
        self, session_key: int, driver_number: int | None = None, position: int | None = None
    ) -> list[dict[Any, Any]] | None:
        params = {"session_key": session_key}

        if driver_number:
            params["driver_number"] = driver_number

        if position:
            params["position"] = position

        return self._make_request("/position", params=params)

    def get_intervals(
        self, session_key: int, driver_number: int | None = None
    ) -> list[dict[Any, Any]] | None:
        params = {"session_key": session_key}

        if driver_number:
            params["driver_number"] = driver_number

        return self._make_request("/intervals", params=params)

    def get_stints(self, session_key: int, driver_number: int | None = None) -> list[dict[Any, Any]] | None:
        params = {"session_key": session_key}

        if driver_number:
            params["driver_number"] = driver_number

        return self._make_request("/stints", params=params)

    def get_pit_stops(
        self, session_key: int, driver_number: int | None = None
    ) -> list[dict[Any, Any]] | None:
        params = {"session_key": session_key}

        if driver_number:
            params["driver_number"] = driver_number

        return self._make_request("/pit", params=params)

    def get_weather(self, session_key: int) -> list[dict[Any, Any]] | None:
        pass

    def get_driver_championship(
        self,
        session_key: int,
        points_current: int | None = None,
        points_start: int | None = None,
        position_current: int | None = None,
        position_start: int | None = None,
    ) -> list[dict[Any, Any]] | None:
        params = {"session_key": session_key}

        if position_current:
            params["position_current"] = position_current

        if points_start:
            params["points_start"] = points_start

        if points_current:
            params["points_current"] = points_current

        if position_start:
            params["position_start"] = position_start

        return self._make_request("/championship_drivers", params=params)


openf1_client = OpenF1Client()
