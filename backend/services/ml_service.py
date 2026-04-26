import os
import math
import joblib
import numpy as np
from pathlib import Path

ML_DIR = Path(__file__).parent.parent / "ml"
LGBM_PATH = ML_DIR / "lgbm_model.pkl"
ISO_FOREST_PATH = ML_DIR / "iso_forest.pkl"


def _load_model(path: Path):
    if path.exists():
        return joblib.load(path)
    return None


lgbm_model = _load_model(LGBM_PATH)
iso_forest_model = _load_model(ISO_FOREST_PATH)


def reload_models():
    global lgbm_model, iso_forest_model
    lgbm_model = _load_model(LGBM_PATH)
    iso_forest_model = _load_model(ISO_FOREST_PATH)


def predict_expected_wh(
    ghi: float,
    temperature: float,
    cloud_cover: float,
    relative_humidity: float,
    hour: int,
    month: int,
    panel_area: float,
    panel_efficiency: float,
) -> float:
    """Predict expected Wh using LightGBM if available, else physics formula."""
    if lgbm_model is not None:
        hour_sin = math.sin(2 * math.pi * hour / 24)
        hour_cos = math.cos(2 * math.pi * hour / 24)
        month_sin = math.sin(2 * math.pi * month / 12)
        month_cos = math.cos(2 * math.pi * month / 12)

        features = np.array([[
            ghi, temperature, cloud_cover, relative_humidity,
            hour_sin, hour_cos, month_sin, month_cos,
            panel_area, panel_efficiency,
        ]])
        return float(lgbm_model.predict(features)[0])

    # Fallback: physics formula
    return ghi * panel_area * panel_efficiency


def detect_anomaly(
    performance_ratio: float,
    ghi: float,
    temperature: float,
    cloud_cover: float,
    hour_of_day: int,
) -> tuple[bool, float]:
    """Detect anomaly using IsolationForest if available. Returns (is_anomaly, score)."""
    if iso_forest_model is not None:
        features = np.array([[
            performance_ratio, ghi, temperature, cloud_cover, hour_of_day,
        ]])
        score = float(iso_forest_model.decision_function(features)[0])
        is_anomaly = bool(iso_forest_model.predict(features)[0] == -1)
        return is_anomaly, score

    # Fallback: simple threshold
    is_anomaly = performance_ratio < 50
    score = -1.0 if is_anomaly else 1.0
    return is_anomaly, score
