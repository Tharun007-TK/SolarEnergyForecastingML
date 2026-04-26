from sqlalchemy import (
    Column, Integer, Float, Text, Boolean, Date, DateTime, ForeignKey,
    create_engine,
)
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from sqlalchemy.sql import func
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./solarsense.db")

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class Panel(Base):
    __tablename__ = "panels"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(Text, nullable=False)
    lat = Column(Float, nullable=False)
    lon = Column(Float, nullable=False)
    area_m2 = Column(Float, nullable=False)
    efficiency = Column(Float, nullable=False)  # e.g. 0.18 for 18%
    electricity_rate = Column(Float, default=8.0)  # ₹ or $ per kWh
    installed_at = Column(Date, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    readings = relationship("Reading", back_populates="panel", cascade="all, delete-orphan")


class Reading(Base):
    __tablename__ = "readings"

    id = Column(Integer, primary_key=True, index=True)
    panel_id = Column(Integer, ForeignKey("panels.id"), nullable=False)
    timestamp = Column(DateTime, nullable=False)
    actual_wh = Column(Float, nullable=False)
    expected_wh = Column(Float, nullable=True)
    performance_ratio = Column(Float, nullable=True)
    ghi = Column(Float, nullable=True)
    temperature = Column(Float, nullable=True)
    cloud_cover = Column(Float, nullable=True)
    is_anomaly = Column(Boolean, default=False)
    anomaly_score = Column(Float, nullable=True)

    panel = relationship("Panel", back_populates="readings")


def init_db():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
