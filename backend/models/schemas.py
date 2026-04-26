from pydantic import BaseModel, Field
from datetime import date, datetime
from typing import Optional


# ── Panel ──────────────────────────────────────────────

class PanelCreate(BaseModel):
    name: str
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)
    area_m2: float = Field(gt=0)
    efficiency: float = Field(gt=0, le=1)
    electricity_rate: float = Field(default=8.0, gt=0)
    installed_at: Optional[date] = None


class PanelOut(BaseModel):
    id: int
    name: str
    lat: float
    lon: float
    area_m2: float
    efficiency: float
    electricity_rate: float
    installed_at: Optional[date]
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Reading ────────────────────────────────────────────

class ReadingCreate(BaseModel):
    panel_id: int
    timestamp: datetime
    actual_wh: float = Field(ge=0)


class ReadingOut(BaseModel):
    id: int
    panel_id: int
    timestamp: datetime
    actual_wh: float
    expected_wh: Optional[float]
    performance_ratio: Optional[float]
    ghi: Optional[float]
    temperature: Optional[float]
    cloud_cover: Optional[float]
    is_anomaly: bool
    anomaly_score: Optional[float]

    model_config = {"from_attributes": True}


# ── Weather ────────────────────────────────────────────

class CurrentWeather(BaseModel):
    lat: float
    lon: float
    ghi: float
    temperature: float
    cloud_cover: float
    relative_humidity: float
    time: str


class HourlyForecast(BaseModel):
    time: str
    ghi: float
    temperature: float
    cloud_cover: float
    relative_humidity: float


class WeatherForecastOut(BaseModel):
    lat: float
    lon: float
    hourly: list[HourlyForecast]


# ── Analytics ──────────────────────────────────────────

class PRHistory(BaseModel):
    timestamp: datetime
    performance_ratio: float
    ghi: Optional[float]


class AnomalyOut(BaseModel):
    id: int
    timestamp: datetime
    actual_wh: float
    expected_wh: Optional[float]
    performance_ratio: Optional[float]
    anomaly_score: Optional[float]
    probable_cause: Optional[str] = None

    model_config = {"from_attributes": True}


class EnergySummary(BaseModel):
    period: str
    total_kwh: float
    money_saved: float
    co2_offset_kg: float


# ── Forecast ───────────────────────────────────────────

class DailyForecast(BaseModel):
    date: str
    expected_kwh: float
    ghi_avg: float
    temperature_avg: float
    cloud_cover_avg: float
