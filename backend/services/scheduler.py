import logging
from datetime import datetime, timezone

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from models.database import SessionLocal, Panel, Reading
from services.weather_service import fetch_current_weather, calculate_expected_wh
from services.pr_service import calculate_pr
from services.ml_service import predict_expected_wh, detect_anomaly

logger = logging.getLogger("solarsense.scheduler")

scheduler = AsyncIOScheduler()


async def hourly_weather_job():
    """Fetch current weather for all panels and update readings with expected output."""
    logger.info("Running hourly weather job")
    db = SessionLocal()
    try:
        panels = db.query(Panel).all()
        for panel in panels:
            try:
                weather = await fetch_current_weather(panel.lat, panel.lon)
                if not weather:
                    continue

                now = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
                hour = now.hour
                month = now.month

                expected = predict_expected_wh(
                    ghi=weather["ghi"],
                    temperature=weather["temperature"],
                    cloud_cover=weather["cloud_cover"],
                    relative_humidity=weather["relative_humidity"],
                    hour=hour,
                    month=month,
                    panel_area=panel.area_m2,
                    panel_efficiency=panel.efficiency,
                )

                # Update any readings for this panel in the current hour
                readings = (
                    db.query(Reading)
                    .filter(
                        Reading.panel_id == panel.id,
                        Reading.timestamp >= now,
                        Reading.expected_wh.is_(None),
                    )
                    .all()
                )

                for reading in readings:
                    reading.expected_wh = expected
                    reading.ghi = weather["ghi"]
                    reading.temperature = weather["temperature"]
                    reading.cloud_cover = weather["cloud_cover"]
                    pr = calculate_pr(reading.actual_wh, expected)
                    reading.performance_ratio = pr

                    if pr is not None:
                        is_anomaly, score = detect_anomaly(
                            pr, weather["ghi"], weather["temperature"],
                            weather["cloud_cover"], hour,
                        )
                        reading.is_anomaly = is_anomaly
                        reading.anomaly_score = score

                db.commit()
                logger.info(f"Updated panel '{panel.name}' — GHI={weather['ghi']}, expected={expected:.1f}Wh")

            except Exception:
                logger.exception(f"Error processing panel {panel.id}")

    finally:
        db.close()


def start_scheduler(interval_minutes: int = 60):
    scheduler.add_job(hourly_weather_job, "interval", minutes=interval_minutes, id="hourly_weather")
    scheduler.start()
    logger.info(f"Scheduler started — interval={interval_minutes}min")


def stop_scheduler():
    scheduler.shutdown(wait=False)
