#!/bin/bash
# Convenience script — activates the venv and starts the FastAPI dev server.
source venv/bin/activate
uvicorn main:app --reload
