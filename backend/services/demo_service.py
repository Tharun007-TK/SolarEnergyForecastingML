"""
Demo mode: creates 3 sample panels, generates simulated readings.
Activated when DEMO_MODE=true in .env.
"""

import logging
import random
import math
from datetime import datetime, timedelta, timezone, date

from models.database import SessionLocal, Panel, Reading
from services.weather_service import calculate_expected_wh
from services.pr_service import calculate_pr
from services.ml_service import detect_anomaly

logger = logging.getLogger("solarsense.demo")

DEMO_PANELS = [
    {"name": "Chennai Rooftop", "lat": 13.08, "lon": 80.27, "area_m2": 2.0, "efficiency": 0.18, "electricity_rate": 8.0},
    {"name": "Delhi Office", "lat": 28.61, "lon": 77.23, "area_m2": 1.6, "efficiency": 0.20, "electricity_rate": 7.5},
    {"name": "Bangalore Home", "lat": 12.97, "lon": 77.59, "area_m2": 3.0, "efficiency": 0.16, "electricity_rate": 6.5},
]


def seed_demo_panels():
    """Create demo panels if none exist."""
    db = SessionLocal()
    try:
        count = db.query(Panel).count()
        if count > 0:
            logger.info(f"Panels already exist ({count}), skipping demo seed")
            return

        for config in DEMO_PANELS:
            panel = Panel(
                **config,
                installed_at=date(2025, 1, 15),
            )
            db.add(panel)

        db.commit()
        logger.info(f"Seeded {len(DEMO_PANELS)} demo panels")
    finally:
        db.close()


def generate_demo_readings(days: int = 14):
    """Generate simulated readings for all demo panels."""
    db = SessionLocal()
    try:
        panels = db.query(Panel).all()
        if not panels:
            return

        # Check if readings already exist
        existing = db.query(Reading).count()
        if existing > 0:
            logger.info(f"Readings already exist ({existing}), skipping demo generation")
            return

        now = datetime.now(timezone.utc)
        total = 0
        anomaly_count = 0

        for panel in panels:
            for day_offset in range(days, -1, -1):
                day_dt = now - timedelta(days=day_offset)
                is_today = day_offset == 0
                is_anomaly_day = random.random() < 0.15  # ~2 anomaly days per 14 days

                # For today, only simulate up to the current hour (no future readings)
                end_hour = min(now.hour, 18) if is_today else 18
                if end_hour < 6:
                    continue

                for hour in range(6, end_hour + 1):  # Daylight hours only
                    ts = day_dt.replace(hour=hour, minute=0, second=0, microsecond=0)
                    month = ts.month

                    # Simulate GHI: bell curve
                    solar_angle = math.sin(math.pi * (hour - 6) / 12)
                    seasonal = 1.0 + 0.15 * math.sin(2 * math.pi * (month - 3) / 12)
                    base_ghi = 750 * solar_angle * seasonal
                    ghi = max(0, base_ghi + random.gauss(0, 40))

                    # Simulate weather
                    temperature = 28 + 8 * solar_angle + random.gauss(0, 2)
                    cloud_cover = max(0, min(100, random.gauss(25, 15)))

                    # Expected output
                    expected_wh = calculate_expected_wh(ghi, panel.area_m2, panel.efficiency)

                    # Actual = expected * noise factor
                    if is_anomaly_day and hour in [10, 11, 12]:
                        # Inject anomaly: very low output on clear day
                        noise = random.uniform(0.20, 0.38)
                        anomaly_count += 1
                    else:
                        noise = random.uniform(0.70, 1.05)

                    actual_wh = max(0, expected_wh * noise)
                    pr = calculate_pr(actual_wh, expected_wh) if expected_wh > 0 else None

                    is_anomaly = False
                    anomaly_score = 0.0
                    if pr is not None:
                        is_anomaly, anomaly_score = detect_anomaly(pr, ghi, temperature, cloud_cover, hour)

                    reading = Reading(
                        panel_id=panel.id,
                        timestamp=ts,
                        actual_wh=round(actual_wh, 2),
                        expected_wh=round(expected_wh, 2),
                        performance_ratio=round(pr, 2) if pr else None,
                        ghi=round(ghi, 1),
                        temperature=round(temperature, 1),
                        cloud_cover=round(cloud_cover, 1),
                        is_anomaly=is_anomaly,
                        anomaly_score=round(anomaly_score, 4),
                    )
                    db.add(reading)
                    total += 1

        db.commit()
        logger.info(f"Generated {total} demo readings ({anomaly_count} anomalous)")
    finally:
        db.close()


def init_demo():
    """Full demo initialization."""
    logger.info("Demo mode: initializing...")
    seed_demo_panels()
    generate_demo_readings()
    logger.info("Demo mode: ready")
