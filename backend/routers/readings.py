from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from models.database import get_db, Panel, Reading
from models.schemas import ReadingCreate, ReadingOut
from services.weather_service import fetch_current_weather
from services.pr_service import calculate_pr
from services.ml_service import predict_expected_wh, detect_anomaly

router = APIRouter(prefix="/readings", tags=["readings"])


@router.post("/", response_model=ReadingOut, status_code=201)
async def submit_reading(reading: ReadingCreate, db: Session = Depends(get_db)):
    panel = db.query(Panel).filter(Panel.id == reading.panel_id).first()
    if not panel:
        raise HTTPException(status_code=404, detail="Panel not found")

    db_reading = Reading(
        panel_id=reading.panel_id,
        timestamp=reading.timestamp,
        actual_wh=reading.actual_wh,
    )

    # Try to enrich with weather data and expected output
    try:
        weather = await fetch_current_weather(panel.lat, panel.lon)
        if weather:
            hour = reading.timestamp.hour
            month = reading.timestamp.month
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
            db_reading.expected_wh = expected
            db_reading.ghi = weather["ghi"]
            db_reading.temperature = weather["temperature"]
            db_reading.cloud_cover = weather["cloud_cover"]

            pr = calculate_pr(reading.actual_wh, expected)
            db_reading.performance_ratio = pr

            if pr is not None:
                is_anomaly, score = detect_anomaly(
                    pr, weather["ghi"], weather["temperature"],
                    weather["cloud_cover"], hour,
                )
                db_reading.is_anomaly = is_anomaly
                db_reading.anomaly_score = score
    except Exception:
        pass  # Weather fetch failure shouldn't block reading submission

    db.add(db_reading)
    db.commit()
    db.refresh(db_reading)
    return db_reading


@router.get("/{panel_id}", response_model=list[ReadingOut])
def get_readings(
    panel_id: int,
    start: Optional[datetime] = Query(None),
    end: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
):
    panel = db.query(Panel).filter(Panel.id == panel_id).first()
    if not panel:
        raise HTTPException(status_code=404, detail="Panel not found")

    query = db.query(Reading).filter(Reading.panel_id == panel_id)
    if start:
        query = query.filter(Reading.timestamp >= start)
    if end:
        query = query.filter(Reading.timestamp <= end)

    return query.order_by(Reading.timestamp.desc()).all()
