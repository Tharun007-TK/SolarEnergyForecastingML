# CLAUDE.md — SolarSense: Solar Panel Monitoring System

> This file is the single source of truth for Claude (or any AI agent) working on this project.
> Read this entirely before writing any code. Do not skip sections.

---

## 🧠 Project Overview

**Project Name:** SolarSense  
**Type:** Full-stack solar panel monitoring web application  
**Owner:** [Your Friend's Name]  
**Built by:** [Your Name]  
**Goal:** Give solar panel owners a real-time dashboard to monitor actual vs expected output, detect anomalies, track performance ratio, and forecast upcoming generation — all without expensive hardware integrations.

---

## 🎯 Problem Statement

Existing solar forecasting tools (like the reference GitHub repo) only predict future irradiance using ML models trained on historical CSV data. They do not:

- Tell the user if their panel is underperforming RIGHT NOW
- Detect faults, soiling, or shading automatically
- Compare actual output against weather-derived expected output
- Run in real-time with live weather data

SolarSense fixes all of this.

---

## 👤 Target User

A homeowner or small business owner with 1–10 solar panels who wants to:
- Know if their panel is working correctly today
- See how much energy and money they've saved
- Get alerted when something seems wrong
- Plan around upcoming cloudy days

They are NOT engineers. The UI must be simple, visual, and jargon-light.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                   React Frontend                     │
│         (Vite + Tailwind CSS + Recharts)             │
└───────────────────┬─────────────────────────────────┘
                    │ REST API calls
┌───────────────────▼─────────────────────────────────┐
│                  FastAPI Backend                     │
│         (Python 3.11+, APScheduler, SQLite)          │
└──────┬────────────────────────┬─────────────────────┘
       │                        │
┌──────▼──────┐        ┌────────▼────────┐
│ Open-Meteo  │        │   ML Models     │
│  Weather    │        │  LightGBM +     │
│    API      │        │ IsolationForest │
└─────────────┘        └─────────────────┘
```

---

## 📁 Project Structure

```
solarsense/
├── CLAUDE.md                  ← You are here
├── backend/
│   ├── main.py                ← FastAPI app entry
│   ├── routers/
│   │   ├── panels.py          ← Panel CRUD
│   │   ├── readings.py        ← Input actual readings
│   │   ├── weather.py         ← Weather fetch endpoints
│   │   ├── forecast.py        ← 7-day forecast
│   │   └── analytics.py       ← PR, anomalies, summary
│   ├── services/
│   │   ├── weather_service.py ← Open-Meteo API wrapper
│   │   ├── ml_service.py      ← LightGBM + IsolationForest
│   │   ├── pr_service.py      ← Performance Ratio logic
│   │   └── scheduler.py       ← APScheduler hourly jobs
│   ├── models/
│   │   ├── database.py        ← SQLite + SQLAlchemy setup
│   │   └── schemas.py         ← Pydantic request/response models
│   ├── ml/
│   │   ├── train.py           ← Training script (run once)
│   │   ├── lgbm_model.pkl     ← Saved LightGBM model
│   │   └── iso_forest.pkl     ← Saved IsolationForest model
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx  ← Main monitoring view
│   │   │   ├── Panels.jsx     ← Panel management
│   │   │   ├── Forecast.jsx   ← 7-day forecast view
│   │   │   └── Analytics.jsx  ← Historical trends
│   │   ├── components/
│   │   │   ├── PRGauge.jsx
│   │   │   ├── OutputChart.jsx
│   │   │   ├── AnomalyBadge.jsx
│   │   │   ├── WeatherCard.jsx
│   │   │   └── EnergySummary.jsx
│   │   └── api/
│   │       └── client.js      ← Axios API client
│   ├── package.json
│   └── vite.config.js
└── docker-compose.yml         ← Optional, for deployment
```

---

## ⚙️ Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | React (Vite) + Tailwind CSS | Fast, component-based |
| Charts | Recharts | Best for time-series in React |
| Backend | FastAPI (Python 3.11) | Fast, typed, async-ready |
| Database | SQLite (dev) / Supabase (prod) | Simple for MVP |
| ML - Expected Output | LightGBM (quantile regression) | Better than LSTM for tabular solar data |
| ML - Anomaly Detection | IsolationForest (scikit-learn) | Lightweight, no labels needed |
| Weather | Open-Meteo API | Free, no API key, real-time |
| Scheduler | APScheduler | Auto-fetch weather hourly |
| Deployment | Render (backend) + Vercel (frontend) | Free tier, easy |

---

## 🔑 Core Features — Detailed Spec

### Feature 1: Panel Registration
- User adds a panel with: name, location (lat/lon via map picker), panel area (m²), efficiency (%), installation date
- Multiple panels supported per user (no auth for MVP — single user mode)
- Stored in `panels` table

### Feature 2: Actual Reading Input
- User manually inputs watt-hour reading for a given hour/day
- OR: simulated mode that auto-generates readings with ±15% noise for demo
- Stored in `readings` table with timestamp and panel_id

### Feature 3: Expected Output Calculation
```
Expected Output (Wh) = GHI (W/m²) × Panel Area (m²) × Efficiency (%) × Hour Duration
```
- GHI fetched from Open-Meteo for the panel's lat/lon
- Calculated and stored hourly via APScheduler

### Feature 4: Performance Ratio (PR) Tracker
```
PR = Actual Output / Expected Output × 100%
```
- Displayed as a gauge (0–100%)
- Color coding: Green (>80%), Yellow (60–80%), Red (<60%)
- Historical PR line chart (last 30 days)

**Thresholds:**
- PR < 60% for 3+ consecutive hours → trigger anomaly alert
- PR < 40% on a clear day → flag as likely fault

### Feature 5: Anomaly Detection
- IsolationForest trained on: PR, GHI, temperature, time_of_day, day_of_week
- Re-trains weekly on accumulated data
- Output: anomaly score per reading, flagged as True/False
- UI: red badge on anomalous readings with possible reason (rule-based):
  - Clear day + low PR → soiling or shading
  - Sudden PR drop → possible inverter fault
  - High temp + low PR → thermal degradation

### Feature 6: 7-Day Forecast
- Fetch next 7 days GHI forecast from Open-Meteo
- Run through LightGBM to predict expected daily kWh
- Display as bar chart: day vs expected kWh
- Show best/worst days for generation

### Feature 7: Energy & Savings Summary
```
Energy (kWh) = sum of actual readings / 1000
Money Saved = Energy × local electricity rate (user sets ₹/kWh or $/kWh)
CO₂ Offset = Energy × 0.82 kg/kWh (India grid factor)
```
- Daily, weekly, monthly views
- Lifetime totals on dashboard hero section

---

## 🔌 API Endpoints

```
POST   /panels/                    → Register panel
GET    /panels/                    → List all panels
GET    /panels/{id}                → Get single panel

POST   /readings/                  → Submit actual reading
GET    /readings/{panel_id}        → Get readings (with date range filter)

GET    /weather/current/{panel_id} → Current weather for panel location
GET    /weather/forecast/{panel_id}→ 7-day weather forecast

GET    /analytics/pr/{panel_id}    → PR history
GET    /analytics/anomalies/{panel_id} → Flagged anomalies
GET    /analytics/summary/{panel_id}   → Energy/savings summary

GET    /forecast/{panel_id}        → 7-day expected generation forecast
```

---

## 🤖 ML Implementation Details

### LightGBM — Expected Output Predictor

**Features:**
- `ghi` — Global Horizontal Irradiance (W/m²)
- `temperature_2m` — Air temperature (°C)
- `cloud_cover` — % cloud cover
- `relative_humidity_2m`
- `hour_sin`, `hour_cos` — Cyclical hour encoding
- `month_sin`, `month_cos` — Cyclical month encoding
- `panel_area` — m²
- `panel_efficiency` — decimal

**Target:** `expected_wh` (watt-hours per hour)

**Training data:** Generate synthetic data using physics formula + noise, or use Open-Meteo historical + panel specs. 3 months of hourly data minimum.

**Mode:** Quantile regression (q=0.1, 0.5, 0.9) to get confidence intervals.

### IsolationForest — Anomaly Detector

**Features:**
- `performance_ratio`
- `ghi`
- `temperature_2m`
- `cloud_cover`
- `hour_of_day`

**Training:** Unsupervised on first 2 weeks of accumulated panel data. Contamination=0.05.

**Output:** `anomaly_score` (float), `is_anomaly` (bool)

---

## 📊 Database Schema

```sql
-- panels
CREATE TABLE panels (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  lat REAL NOT NULL,
  lon REAL NOT NULL,
  area_m2 REAL NOT NULL,
  efficiency REAL NOT NULL,       -- e.g. 0.18 for 18%
  electricity_rate REAL DEFAULT 8.0, -- ₹ or $ per kWh
  installed_at DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- readings (actual output)
CREATE TABLE readings (
  id INTEGER PRIMARY KEY,
  panel_id INTEGER REFERENCES panels(id),
  timestamp TIMESTAMP NOT NULL,
  actual_wh REAL NOT NULL,
  expected_wh REAL,               -- filled by scheduler
  performance_ratio REAL,
  ghi REAL,
  temperature REAL,
  cloud_cover REAL,
  is_anomaly BOOLEAN DEFAULT FALSE,
  anomaly_score REAL
);
```

---

## 🌐 Open-Meteo API Usage

**Base URL:** `https://api.open-meteo.com/v1/forecast`

**Parameters to fetch:**
```
latitude={lat}&longitude={lon}
&hourly=shortwave_radiation,temperature_2m,cloud_cover,relative_humidity_2m
&forecast_days=7
&timezone=auto
```

**Note:** `shortwave_radiation` = GHI in W/m². Free, no API key, 10,000 requests/day limit. More than enough.

---

## 🚀 Build Order (Phases)

### Phase 1 — Backend Core (Week 1)
- [ ] FastAPI setup with SQLite
- [ ] Panel CRUD endpoints
- [ ] Open-Meteo weather service
- [ ] Expected output calculation (physics formula first, ML later)
- [ ] APScheduler: hourly weather + expected output fetch
- [ ] Readings ingestion endpoint
- [ ] PR calculation

### Phase 2 — ML Integration (Week 1–2)
- [ ] Generate/collect training data
- [ ] Train LightGBM model
- [ ] Train IsolationForest
- [ ] Integrate both into ml_service.py
- [ ] Anomaly endpoint working

### Phase 3 — Frontend (Week 2–3)
- [ ] Vite + React + Tailwind setup
- [ ] Dashboard page (PR gauge, actual vs expected chart)
- [ ] Panel management page
- [ ] Forecast page (7-day bar chart)
- [ ] Analytics page (historical PR, anomaly list)
- [ ] Energy summary component

### Phase 4 — Polish + Deploy (Week 3–4)
- [ ] Simulated demo mode (no real panel needed)
- [ ] Responsive design (mobile-friendly)
- [ ] Deploy backend to Render
- [ ] Deploy frontend to Vercel
- [ ] Final testing

---

## ⚠️ What Claude Should NOT Do

- Do not use Flask. Use FastAPI only.
- Do not use LSTM or neural networks for the expected output model. LightGBM is the right call for tabular hourly data.
- Do not add user authentication in Phase 1–3. Single-user mode only for MVP.
- Do not use paid APIs. Open-Meteo is free and sufficient.
- Do not store raw weather JSON blobs in the DB. Extract and store only the needed columns.
- Do not create a new ML model when the existing `lgbm_model.pkl` already exists — load it instead.
- Do not use pandas for simple DB reads — use SQLAlchemy ORM queries.
- Do not hallucinate API endpoints. All frontend API calls must match the exact routes defined in this file.

---

## 🧪 Demo Mode (No Real Panel)

When `DEMO_MODE=true` in `.env`:
- Simulate 3 panels at fixed coordinates (Chennai, Delhi, Bangalore)
- Auto-generate actual readings = expected × random(0.65, 1.05)
- Inject 2 anomalous readings per week (PR < 0.4 on clear day)
- This makes the project fully demonstrable without real hardware

---

## 📦 Environment Variables

```env
# backend/.env
DATABASE_URL=sqlite:///./solarsense.db
DEMO_MODE=true
SCHEDULER_INTERVAL_MINUTES=60
LOG_LEVEL=INFO
```

---

## 📝 Notes for Collaborators

1. Run `backend/ml/train.py` once before starting the server to generate model files
2. The scheduler starts automatically when FastAPI starts — no separate process needed
3. For Supabase migration (prod), replace `DATABASE_URL` with Supabase postgres URL — SQLAlchemy handles the rest
4. All timestamps stored in UTC. Frontend converts to local time using `date-fns`
5. Open-Meteo returns hourly data — match reading timestamps to the nearest hour when calculating PR

---

*Last updated: April 2026*
*Reference repo: github.com/connectashish028/SolarForecastingWithML (used for comparison only)*
