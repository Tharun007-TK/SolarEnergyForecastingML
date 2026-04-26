from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from models.database import get_db, Panel
from models.schemas import CurrentWeather, WeatherForecastOut
from services.weather_service import fetch_current_weather, fetch_weather_forecast

router = APIRouter(prefix="/weather", tags=["weather"])


@router.get("/current/{panel_id}", response_model=CurrentWeather)
async def get_current_weather(panel_id: int, db: Session = Depends(get_db)):
    panel = db.query(Panel).filter(Panel.id == panel_id).first()
    if not panel:
        raise HTTPException(status_code=404, detail="Panel not found")

    data = await fetch_current_weather(panel.lat, panel.lon)
    if not data:
        raise HTTPException(status_code=502, detail="Weather service unavailable")
    return data


@router.get("/forecast/{panel_id}", response_model=WeatherForecastOut)
async def get_weather_forecast(panel_id: int, db: Session = Depends(get_db)):
    panel = db.query(Panel).filter(Panel.id == panel_id).first()
    if not panel:
        raise HTTPException(status_code=404, detail="Panel not found")

    data = await fetch_weather_forecast(panel.lat, panel.lon)
    if not data:
        raise HTTPException(status_code=502, detail="Weather service unavailable")
    return data
