const BASE = "/api";

async function fetcher<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, init);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `API ${res.status} on ${init?.method ?? "GET"} ${url}${body ? ` — ${body.slice(0, 300)}` : ""}`
    );
  }
  return res.json();
}

// ── Types ───────────────────────────────────────────
export interface Panel {
  id: number;
  name: string;
  lat: number;
  lon: number;
  area_m2: number;
  efficiency: number;
  electricity_rate: number;
  installed_at: string | null;
  created_at: string;
}

export interface PanelCreate {
  name: string;
  lat: number;
  lon: number;
  area_m2: number;
  efficiency: number;
  electricity_rate: number;
  installed_at?: string | null;
}

export interface Reading {
  id: number;
  panel_id: number;
  timestamp: string;
  actual_wh: number;
  expected_wh: number | null;
  performance_ratio: number | null;
  ghi: number | null;
  temperature: number | null;
  cloud_cover: number | null;
  is_anomaly: boolean;
  anomaly_score: number | null;
}

export interface CurrentWeather {
  lat: number;
  lon: number;
  ghi: number;
  temperature: number;
  cloud_cover: number;
  relative_humidity: number;
  time: string;
}

export interface EnergySummary {
  period: string;
  total_kwh: number;
  money_saved: number;
  co2_offset_kg: number;
}

export interface PRHistory {
  timestamp: string;
  performance_ratio: number;
  ghi: number | null;
}

export interface Anomaly {
  id: number;
  timestamp: string;
  actual_wh: number;
  expected_wh: number | null;
  performance_ratio: number | null;
  anomaly_score: number | null;
  probable_cause: string | null;
}

export interface DailyForecast {
  date: string;
  expected_kwh: number;
  ghi_avg: number;
  temperature_avg: number;
  cloud_cover_avg: number;
}

// ── API functions ───────────────────────────────────
export const listPanels = () => fetcher<Panel[]>("/panels/");
export const getPanel = (id: number) => fetcher<Panel>(`/panels/${id}`);
export const createPanel = (data: PanelCreate) =>
  fetcher<Panel>("/panels/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
export const deletePanel = (id: number) =>
  fetch(`${BASE}/panels/${id}`, { method: "DELETE" });

export const getReadings = (panelId: number) =>
  fetcher<Reading[]>(`/readings/${panelId}`);

export const getCurrentWeather = (panelId: number) =>
  fetcher<CurrentWeather>(`/weather/current/${panelId}`);

export const getEnergySummary = (panelId: number) =>
  fetcher<EnergySummary[]>(`/analytics/summary/${panelId}`);

export const getPRHistory = (panelId: number, days = 30) =>
  fetcher<PRHistory[]>(`/analytics/pr/${panelId}?days=${days}`);

export const getAnomalies = (panelId: number, days = 30) =>
  fetcher<Anomaly[]>(`/analytics/anomalies/${panelId}?days=${days}`);

export const getGenerationForecast = (panelId: number) =>
  fetcher<DailyForecast[]>(`/forecast/${panelId}`);
