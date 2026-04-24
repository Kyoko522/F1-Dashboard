FROM python:3.11-slim

RUN apt-get update && apt-get install -y \
    python3-tk \
    tk-dev \
    libgl1 \
    libglib2.0-0 \
    fonts-dejavu-core \
    curl \
    git \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN pip install --no-cache-dir \
    fastf1==3.3.9 \
    xgboost==2.0.3 \
    shap==0.44.1 \
    scikit-learn==1.4.2 \
    pandas==2.2.1 \
    numpy==1.26.4 \
    joblib==1.3.2 \
    matplotlib==3.8.3

RUN pip install --no-cache-dir \
    fastapi==0.110.0 \
    "uvicorn[standard]==0.28.0" \
    requests==2.31.0 \
    httpx==0.27.0 \
    pydantic==2.6.3

COPY . .

RUN mkdir -p ai_engine/fastf1_cache ai_engine/models

ENV MPLBACKEND=TkAgg

EXPOSE 8000

CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]