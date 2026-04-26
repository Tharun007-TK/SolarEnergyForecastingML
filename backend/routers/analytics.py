from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from models.database import get_db, Panel, Reading
from models.schemas import PRHistory, AnomalyOut, EnergySummary
from services.pr_service import diagnose_anomaly

router = APIRouter(prefix="/analytics", tags=["analytics"])

CO2_FACTOR = 0.82  # kg CO₂ per kWh (India grid)


@router.get("/pr/{panel_id}", response_model=list[PRHistory])
def get_pr_history(
    panel_id: int,
    days: int = Query(default=30, ge=1, le=365),
    db: Session = Depends(get_db),
):
    panel = db.query(Panel).filter(Panel.id == panel_id).first()
    if not panel:
        raise HTTPException(status_code=404, detail="Panel not found")

    since = datetime.now(timezone.utc) - timedelta(days=days)
    readings = (
        db.query(Reading)
        .filter(
            Reading.panel_id == panel_id,
            Reading.performance_ratio.isnot(None),
            Reading.timestamp >= since,
        )
        .order_by(Reading.timestamp)
        .all()
    )

    return [
        PRHistory(
            timestamp=r.timestamp,
            performance_ratio=r.performance_ratio,
            ghi=r.ghi,
        )
        for r in readings
    ]


@router.get("/anomalies/{panel_id}", response_model=list[AnomalyOut])
def get_anomalies(
    panel_id: int,
    days: int = Query(default=30, ge=1, le=365),
    db: Session = Depends(get_db),
):
    panel = db.query(Panel).filter(Panel.id == panel_id).first()
    if not panel:
        raise HTTPException(status_code=404, detail="Panel not found")

    since = datetime.now(timezone.utc) - timedelta(days=days)
    readings = (
        db.query(Reading)
        .filter(
            Reading.panel_id == panel_id,
            Reading.is_anomaly == True,
            Reading.timestamp >= since,
        )
        .order_by(Reading.timestamp.desc())
        .all()
    )

    results = []
    for r in readings:
        cause = None
        if r.performance_ratio is not None and r.ghi is not None:
            cause = diagnose_anomaly(
                r.performance_ratio, r.ghi,
                r.temperature or 25, r.cloud_cover or 50,
            )
        results.append(
            AnomalyOut(
                id=r.id,
                timestamp=r.timestamp,
                actual_wh=r.actual_wh,
                expected_wh=r.expected_wh,
                performance_ratio=r.performance_ratio,
                anomaly_score=r.anomaly_score,
                probable_cause=cause,
            )
        )
    return results


@router.get("/summary/{panel_id}", response_model=list[EnergySummary])
def get_energy_summary(panel_id: int, db: Session = Depends(get_db)):
    panel = db.query(Panel).filter(Panel.id == panel_id).first()
    if not panel:
        raise HTTPException(status_code=404, detail="Panel not found")

    now = datetime.now(timezone.utc)
    periods = {
        "today": now.replace(hour=0, minute=0, second=0, microsecond=0),
        "this_week": now - timedelta(days=now.weekday()),
        "this_month": now.replace(day=1, hour=0, minute=0, second=0, microsecond=0),
        "lifetime": datetime.min,
    }

    results = []
    for period_name, start_dt in periods.items():
        total_wh = (
            db.query(func.sum(Reading.actual_wh))
            .filter(Reading.panel_id == panel_id, Reading.timestamp >= start_dt)
            .scalar()
        ) or 0.0

        total_kwh = total_wh / 1000
        money = total_kwh * panel.electricity_rate
        co2 = total_kwh * CO2_FACTOR

        results.append(EnergySummary(
            period=period_name,
            total_kwh=round(total_kwh, 2),
            money_saved=round(money, 2),
            co2_offset_kg=round(co2, 2),
        ))

    return results
