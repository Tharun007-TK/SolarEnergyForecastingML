from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from collections import defaultdict

from models.database import get_db, Panel
from models.schemas import DailyForecast
from services.weather_service import fetch_weather_forecast
from services.ml_service import predict_expected_wh

router = APIRouter(prefix="/forecast", tags=["forecast"])


@router.get("/{panel_id}", response_model=list[DailyForecast])
async def get_generation_forecast(panel_id: int, db: Session = Depends(get_db)):
    panel = db.query(Panel).filter(Panel.id == panel_id).first()
    if not panel:
        raise HTTPException(status_code=404, detail="Panel not found")

    weather = await fetch_weather_forecast(panel.lat, panel.lon)
    if not weather:
        raise HTTPException(status_code=502, detail="Weather service unavailable")

    # Aggregate hourly data into daily buckets
    daily: dict[str, list] = defaultdict(list)
    for entry in weather["hourly"]:
        date_str = entry["time"][:10]  # "2024-04-26T14:00" → "2024-04-26"
        daily[date_str].append(entry)

    forecasts = []
    for date_str, hours in sorted(daily.items()):
        total_wh = 0
        ghi_vals = []
        temp_vals = []
        cloud_vals = []

        for h in hours:
            hour_int = int(h["time"][11:13])
            month_int = int(h["time"][5:7])
            wh = predict_expected_wh(
                ghi=h["ghi"],
                temperature=h["temperature"],
                cloud_cover=h["cloud_cover"],
                relative_humidity=h["relative_humidity"],
                hour=hour_int,
                month=month_int,
                panel_area=panel.area_m2,
                panel_efficiency=panel.efficiency,
            )
            total_wh += max(wh, 0)
            ghi_vals.append(h["ghi"])
            temp_vals.append(h["temperature"])
            cloud_vals.append(h["cloud_cover"])

        forecasts.append(DailyForecast(
            date=date_str,
            expected_kwh=round(total_wh / 1000, 2),
            ghi_avg=round(sum(ghi_vals) / len(ghi_vals), 1),
            temperature_avg=round(sum(temp_vals) / len(temp_vals), 1),
            cloud_cover_avg=round(sum(cloud_vals) / len(cloud_vals), 1),
        ))

    return forecasts
