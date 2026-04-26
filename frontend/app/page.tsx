"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { PanelSelector } from "@/components/solar/panel-selector";
import { PRGauge } from "@/components/solar/pr-gauge";
import { WeatherCard } from "@/components/solar/weather-card";
import { OutputChart } from "@/components/solar/output-chart";
import { AnomalyBadge } from "@/components/solar/anomaly-badge";
import { EnergySummary } from "@/components/solar/energy-summary";
import { ExportButton } from "@/components/solar/export-button";
import { Loader2, PanelTop } from "lucide-react";
import { format, parseISO } from "date-fns";
import {
  downloadCSV, openPrintableReport, tableHTML, statCardsHTML, prBadgeHTML,
} from "@/lib/export";
import {
  listPanels, getReadings, getCurrentWeather, getAnomalies, getEnergySummary,
  type Panel, type Reading, type CurrentWeather as CW,
  type Anomaly, type EnergySummary as ES,
} from "@/lib/api";

export default function DashboardPage() {
  const [panels, setPanels] = useState<Panel[]>([]);
  const [selected, setSelected] = useState<Panel | null>(null);
  const [readings, setReadings] = useState<Reading[]>([]);
  const [weather, setWeather] = useState<CW | null>(null);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [summary, setSummary] = useState<ES[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listPanels()
      .then((p) => { setPanels(p); if (p.length) setSelected(p[0]); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selected) return;
    const id = selected.id;
    Promise.allSettled([
      getReadings(id),
      getCurrentWeather(id),
      getAnomalies(id),
      getEnergySummary(id),
    ]).then(([r, w, a, s]) => {
      if (r.status === "fulfilled") setReadings(r.value);
      if (w.status === "fulfilled") setWeather(w.value);
      if (a.status === "fulfilled") setAnomalies(a.value);
      if (s.status === "fulfilled") setSummary(s.value);
    });
  }, [selected]);

  const latestPR = readings[0]?.performance_ratio ?? null;
  const PERIOD_LABELS: Record<string, string> = { today: "Today", this_week: "This Week", this_month: "This Month", lifetime: "Lifetime" };

  const handleExportCSV = () => {
    if (!selected) return;
    const headers = ["Timestamp", "Actual (Wh)", "Expected (Wh)", "PR (%)", "GHI", "Temp (°C)", "Cloud (%)", "Anomaly"];
    const rows = readings.map((r) => [
      format(parseISO(r.timestamp), "yyyy-MM-dd HH:mm"),
      r.actual_wh, r.expected_wh, r.performance_ratio?.toFixed(1),
      r.ghi, r.temperature, r.cloud_cover, r.is_anomaly ? "Yes" : "No",
    ]);
    downloadCSV(`solarsense-dashboard-${selected.name}`, headers, rows);
  };

  const handleExportPDF = () => {
    if (!selected) return;
    const sections = [];

    // Energy summary
    if (summary.length) {
      sections.push({
        title: "Energy & Savings Summary",
        content: statCardsHTML(summary.map((s) => ({
          label: PERIOD_LABELS[s.period] ?? s.period,
          value: `${s.total_kwh} kWh`,
          sub: `₹${s.money_saved} saved · ${s.co2_offset_kg} kg CO₂`,
        }))),
      });
    }

    // Current conditions
    sections.push({
      title: "Current Status",
      content: statCardsHTML([
        { label: "Performance Ratio", value: latestPR != null ? `${latestPR.toFixed(1)}%` : "—" },
        ...(weather ? [
          { label: "Temperature", value: `${weather.temperature.toFixed(1)}°C` },
          { label: "GHI", value: `${weather.ghi.toFixed(0)} W/m²` },
          { label: "Cloud Cover", value: `${weather.cloud_cover.toFixed(0)}%` },
        ] : []),
      ]),
    });

    // Readings table
    if (readings.length) {
      sections.push({
        title: `Recent Readings (${readings.length})`,
        content: tableHTML(
          ["Timestamp", "Actual (Wh)", "Expected (Wh)", "PR", "GHI", "Anomaly"],
          readings.slice(0, 50).map((r) => [
            format(parseISO(r.timestamp), "MMM dd HH:mm"),
            r.actual_wh.toFixed(1), r.expected_wh?.toFixed(1),
            prBadgeHTML(r.performance_ratio), r.ghi?.toFixed(0),
            r.is_anomaly ? '<span class="badge badge-red">Yes</span>' : "No",
          ]),
        ),
      });
    }

    // Anomalies
    if (anomalies.length) {
      sections.push({
        title: `Anomalies Detected (${anomalies.length})`,
        content: tableHTML(
          ["Timestamp", "PR", "Actual (Wh)", "Expected (Wh)", "Cause"],
          anomalies.map((a) => [
            format(parseISO(a.timestamp), "MMM dd HH:mm"),
            prBadgeHTML(a.performance_ratio), a.actual_wh.toFixed(0),
            a.expected_wh?.toFixed(0), a.probable_cause ?? "—",
          ]),
        ),
      });
    }

    openPrintableReport({
      title: "SolarSense Dashboard Report",
      panelName: selected.name,
      sections,
    });
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!panels.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <PanelTop className="h-12 w-12 text-muted-foreground/50" />
        <h2 className="text-2xl font-semibold tracking-tight">Welcome to SolarSense</h2>
        <p className="text-muted-foreground max-w-sm">
          Add your first solar panel to start monitoring performance,
          detecting anomalies, and forecasting generation.
        </p>
        <Link href="/panels" className={buttonVariants({ size: "lg" })}>
          Add Panel
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <PanelSelector panels={panels} selected={selected} onSelect={setSelected} />
        <ExportButton onExportCSV={handleExportCSV} onExportPDF={handleExportPDF} disabled={!selected} />
      </div>
      <EnergySummary summary={summary} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <PRGauge value={latestPR} />
        <WeatherCard weather={weather} />
      </div>
      <OutputChart readings={readings} />
      <AnomalyBadge anomalies={anomalies} />
    </div>
  );
}
