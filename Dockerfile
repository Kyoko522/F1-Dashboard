# Dockerfile — builds the FastAPI backend for production deployment.

FROM python:3.11-slim

# System dependencies needed by FastF1 (matplotlib font rendering, git for data fetch)
RUN apt-get update && apt-get install -y \
    curl \
    git \
    fonts-dejavu-core \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Work inside the backend directory so `uvicorn main:app` resolves correctly
WORKDIR /app/backend

# Install Python dependencies from the pinned requirements file
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the full project (routes, services, ml, etc.)
COPY backend/ .

# FastF1 cache — persisted via a Railway volume mount at runtime
ENV FASTF1_CACHE_DIR=/tmp/fastf1_cache
RUN mkdir -p /tmp/fastf1_cache

# Required for matplotlib on headless servers (no display)
ENV MPLBACKEND=Agg

EXPOSE 8000

# Use shell form so Railway's injected $PORT env var is expanded at runtime
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
