FROM python:3.12-slim

# LightGBM needs OpenMP at runtime; the slim image doesn't include it.
RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Trained model pickles ship in the repo (ml/lgbm_model.pkl, ml/iso_forest.pkl),
# so no training step at build time. To retrain, run `python -m ml.train` locally
# and commit the updated pickles, or add it as a CMD override.

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
