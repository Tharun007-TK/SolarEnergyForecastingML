"""
Training script for SolarSense ML models.
Run once: python -m ml.train
Generates: ml/lgbm_model.pkl, ml/iso_forest.pkl
"""

import math
import random
import numpy as np
import joblib
import lightgbm as lgb
from sklearn.ensemble import IsolationForest
from pathlib import Path

ML_DIR = Path(__file__).parent
LGBM_PATH = ML_DIR / "lgbm_model.pkl"
ISO_FOREST_PATH = ML_DIR / "iso_forest.pkl"

random.seed(42)
np.random.seed(42)


def generate_synthetic_data(n_days: int = 90) -> tuple[np.ndarray, np.ndarray]:
    """
    Generate synthetic hourly solar data for training.
    Simulates 3 months of data for panels of various sizes/efficiencies.
    """
    features = []
    targets = []

    panel_configs = [
        (2.0, 0.18),   # 2 m², 18% eff
        (1.6, 0.20),   # 1.6 m², 20% eff
        (3.0, 0.16),   # 3 m², 16% eff
        (2.5, 0.19),   # 2.5 m², 19% eff
        (1.8, 0.21),   # 1.8 m², 21% eff
    ]

    for day in range(n_days):
        month = (day // 30) % 12 + 1
        for hour in range(24):
            for area, eff in panel_configs:
                # Simulate GHI: bell curve peaking at noon, 0 at night
                if 6 <= hour <= 18:
                    solar_angle = math.sin(math.pi * (hour - 6) / 12)
                    base_ghi = 800 * solar_angle
                    # Seasonal variation
                    seasonal = 1.0 + 0.2 * math.sin(2 * math.pi * (month - 3) / 12)
                    ghi = max(0, base_ghi * seasonal + np.random.normal(0, 50))
                else:
                    ghi = 0.0

                # Temperature: warmer midday, seasonal
                temp_base = 25 + 10 * math.sin(2 * math.pi * (month - 1) / 12)
                temp = temp_base + 5 * math.sin(math.pi * (hour - 6) / 12) + np.random.normal(0, 2)

                # Cloud cover: random, higher in monsoon months
                cloud_base = 30 if month in [6, 7, 8, 9] else 20
                cloud_cover = np.clip(cloud_base + np.random.normal(0, 20), 0, 100)

                # Humidity
                humidity = np.clip(50 + 20 * (cloud_cover / 100) + np.random.normal(0, 10), 10, 100)

                # Expected output (physics + noise)
                cloud_factor = 1 - 0.005 * cloud_cover  # cloud reduces output
                temp_factor = 1 - 0.004 * max(0, temp - 25)  # high temp reduces output
                expected_wh = ghi * area * eff * cloud_factor * temp_factor
                expected_wh = max(0, expected_wh + np.random.normal(0, expected_wh * 0.05))

                # Cyclical encodings
                hour_sin = math.sin(2 * math.pi * hour / 24)
                hour_cos = math.cos(2 * math.pi * hour / 24)
                month_sin = math.sin(2 * math.pi * month / 12)
                month_cos = math.cos(2 * math.pi * month / 12)

                features.append([
                    ghi, temp, cloud_cover, humidity,
                    hour_sin, hour_cos, month_sin, month_cos,
                    area, eff,
                ])
                targets.append(expected_wh)

    return np.array(features), np.array(targets)


def train_lgbm(X: np.ndarray, y: np.ndarray):
    """Train LightGBM quantile regression model."""
    print(f"Training LightGBM on {len(X)} samples...")

    params = {
        "objective": "quantile",
        "alpha": 0.5,  # median
        "metric": "quantile",
        "n_estimators": 300,
        "learning_rate": 0.05,
        "max_depth": 8,
        "num_leaves": 64,
        "min_child_samples": 20,
        "subsample": 0.8,
        "colsample_bytree": 0.8,
        "verbose": -1,
    }

    model = lgb.LGBMRegressor(**params)
    model.fit(X, y)

    # Quick eval
    preds = model.predict(X)
    mae = np.mean(np.abs(y - preds))
    print(f"LightGBM trained — MAE: {mae:.2f} Wh")

    joblib.dump(model, LGBM_PATH)
    print(f"Saved to {LGBM_PATH}")
    return model


def generate_anomaly_data(n_samples: int = 5000) -> np.ndarray:
    """Generate PR + weather features for anomaly detection training."""
    data = []
    for _ in range(n_samples):
        hour = random.randint(6, 18)
        ghi = random.uniform(100, 900)
        temp = random.uniform(20, 45)
        cloud = random.uniform(0, 100)
        # Normal PR: 70-105% with some variance
        pr = random.gauss(85, 12)
        pr = max(0, min(150, pr))
        data.append([pr, ghi, temp, cloud, hour])
    return np.array(data)


def train_isolation_forest(X: np.ndarray):
    """Train IsolationForest for anomaly detection."""
    print(f"Training IsolationForest on {len(X)} samples...")

    model = IsolationForest(
        contamination=0.05,
        n_estimators=200,
        max_samples="auto",
        random_state=42,
    )
    model.fit(X)

    preds = model.predict(X)
    n_anomalies = (preds == -1).sum()
    print(f"IsolationForest trained — {n_anomalies} anomalies in training data ({n_anomalies/len(X)*100:.1f}%)")

    joblib.dump(model, ISO_FOREST_PATH)
    print(f"Saved to {ISO_FOREST_PATH}")
    return model


def main():
    print("=" * 50)
    print("SolarSense ML Training")
    print("=" * 50)

    # LightGBM
    X, y = generate_synthetic_data(n_days=90)
    train_lgbm(X, y)

    print()

    # IsolationForest
    X_anomaly = generate_anomaly_data(n_samples=5000)
    train_isolation_forest(X_anomaly)

    print()
    print("All models trained successfully!")


if __name__ == "__main__":
    main()
