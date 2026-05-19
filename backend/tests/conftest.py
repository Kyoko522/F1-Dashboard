"""Shared pytest fixtures for the F1 Dashboard backend test suite."""

import pytest
from fastapi.testclient import TestClient

from main import app


@pytest.fixture(scope="session")
def client() -> TestClient:
    """A FastAPI TestClient bound to the production app instance."""
    return TestClient(app)
