import httpx
from typing import Optional

BASE_URL = "https://api.open-meteo.com/v1/forecast"


async def fetch_current_weather(lat: float, lon: float) -> Optional[dict]:
    """Fetch current hour weather for given coordinates."""
    params = {
        "latitude": lat,
        "longitude": lon,
        "current": "shortwave_radiation,temperature_2m,cloud_cover,relative_humidity_2m",
        "timezone": "auto",
    }
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(BASE_URL, params=params)
        resp.raise_for_status()
        data = resp.json()

    current = data["current"]
    return {
        "lat": lat,
        "lon": lon,
        "ghi": current["shortwave_radiation"],
        "temperature": current["temperature_2m"],
        "cloud_cover": current["cloud_cover"],
        "relative_humidity": current["relative_humidity_2m"],
        "time": current["time"],
    }


async def fetch_weather_forecast(lat: float, lon: float, days: int = 7) -> Optional[dict]:
    """Fetch hourly weather forecast for next N days."""
    params = {
        "latitude": lat,
        "longitude": lon,
        "hourly": "shortwave_radiation,temperature_2m,cloud_cover,relative_humidity_2m",
        "forecast_days": days,
        "timezone": "auto",
    }
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(BASE_URL, params=params)
        resp.raise_for_status()
        data = resp.json()

    hourly = data["hourly"]
    records = []
    for i in range(len(hourly["time"])):
        records.append({
            "time": hourly["time"][i],
            "ghi": hourly["shortwave_radiation"][i],
            "temperature": hourly["temperature_2m"][i],
            "cloud_cover": hourly["cloud_cover"][i],
            "relative_humidity": hourly["relative_humidity_2m"][i],
        })

    return {"lat": lat, "lon": lon, "hourly": records}


def calculate_expected_wh(ghi: float, area_m2: float, efficiency: float) -> float:
    """
    Expected Output (Wh) = GHI (W/m²) × Panel Area (m²) × Efficiency × 1 hour
    """
    return ghi * area_m2 * efficiency
