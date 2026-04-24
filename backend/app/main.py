# Compatibility shim — entry point moved to backend/main.py.
# This re-export lets the old command (uvicorn app.main:app) keep working.

from main import app  # noqa: F401
