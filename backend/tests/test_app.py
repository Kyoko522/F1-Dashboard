"""Smoke tests for the FastAPI app: router registration, root endpoint, schemas."""

import pytest


@pytest.mark.unit
def test_root_returns_endpoint_directory(client):
    """The root endpoint should return the API health payload and the endpoint map."""
    resp = client.get("/")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "online"
    assert "endpoints" in body
    assert "sessions" in body["endpoints"]
    assert "telemetry" in body["endpoints"]


@pytest.mark.unit
def test_openapi_schema_is_generated(client):
    """FastAPI should generate a valid OpenAPI doc — guards against router misconfiguration."""
    resp = client.get("/openapi.json")
    assert resp.status_code == 200
    schema = resp.json()
    assert schema["info"]["title"] == "F1 Racing Dashboard API"

    # Spot-check that every router is wired up
    paths = schema["paths"]
    assert "/api/sessions" in paths
    assert "/api/years" in paths


@pytest.mark.unit
def test_years_endpoint_returns_known_range(client):
    """/api/years should return a list starting at 2018."""
    resp = client.get("/api/years")
    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is True
    assert body["data"][0] == 2018
    assert all(isinstance(y, int) for y in body["data"])


@pytest.mark.unit
def test_sessions_endpoint_rejects_missing_year(client):
    """/api/sessions requires the year query param — should 422 without it."""
    resp = client.get("/api/sessions")
    assert resp.status_code == 422
