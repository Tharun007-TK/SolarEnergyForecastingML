import os
import logging
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

from models.database import init_db
from routers import panels, readings, weather, forecast, analytics
from services.scheduler import start_scheduler, stop_scheduler

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)
logger = logging.getLogger("solarsense")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    init_db()
    logger.info("Database initialized")

    if os.getenv("DEMO_MODE", "false").lower() == "true":
        from services.demo_service import init_demo
        init_demo()

    interval = int(os.getenv("SCHEDULER_INTERVAL_MINUTES", "60"))
    start_scheduler(interval)
    logger.info("SolarSense started")

    yield

    # Shutdown
    stop_scheduler()
    logger.info("SolarSense stopped")


app = FastAPI(
    title="SolarSense API",
    description="Solar panel monitoring and analytics",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(panels.router)
app.include_router(readings.router)
app.include_router(weather.router)
app.include_router(forecast.router)
app.include_router(analytics.router)


@app.get("/")
def root():
    return {"name": "SolarSense API", "version": "1.0.0", "status": "running"}
