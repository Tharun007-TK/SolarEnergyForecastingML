"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PanelSelector } from "@/components/solar/panel-selector";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { format, parseISO } from "date-fns";
import { ExportButton } from "@/components/solar/export-button";
import { Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { downloadCSV, openPrintableReport, tableHTML, statCardsHTML, prBadgeHTML } from "@/lib/export";
import {
  listPanels, getPRHistory, getAnomalies,
  type Panel, type PRHistory, type Anomaly,
} from "@/lib/api";

export default function AnalyticsPage() {
  const [panels, setPanels] = useState<Panel[]>([]);
  const [selected, setSelected] = useState<Panel | null>(null);
  const [prHistory, setPrHistory] = useState<PRHistory[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listPanels()
      .then((p) => { setPanels(p); if (p.length) setSelected(p[0]); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    Promise.allSettled([
      getPRHistory(selected.id, days),
      getAnomalies(selected.id, days),
    ]).then(([prRes, anomRes]) => {
      if (prRes.status === "fulfilled") setPrHistory(prRes.value);
      if (anomRes.status === "fulfilled") setAnomalies(anomRes.value);
      setLoading(false);
    });
  }, [selected, days]);

  const prData = prHistory.map((r) => ({
    time: format(parseISO(r.timestamp), "MMM dd HH:mm"),
    pr: Number(r.performance_ratio.toFixed(1)),
  }));

  const avgPR = prHistory.length
    ? prHistory.reduce((s, r) => s + r.performance_ratio, 0) / prHistory.length
    : 0;

  const prColor = avgPR >= 80 ? "text-emerald-500" : avgPR >= 60 ? "text-amber-500" : "text-red-500";

  const handleExportCSV = () => {
    if (!selected) return;
    const headers = ["Timestamp", "PR (%)", "GHI (W/m²)"];
    const rows = prHistory.map((r) => [
      format(parseISO(r.timestamp), "yyyy-MM-dd HH:mm"),
      r.performance_ratio.toFixed(1), r.ghi,
    ]);
    downloadCSV(`solarsense-analytics-${selected.name}-${days}d`, headers, rows);
  };

  const handleExportPDF = () => {
    if (!selected) return;
    const sections = [];

    sections.push({
      title: `Performance Summary (${days} days)`,
      content: statCardsHTML([
        { label: "Average PR", value: `${avgPR.toFixed(1)}%` },
        { label: "Data Points", value: String(prHistory.length) },
        { label: "Anomalies", value: String(anomalies.length) },
        { label: "Period", value: `${days} days` },
      ]),
    });

    if (prHistory.length) {
      sections.push({
        title: "PR History",
        content: tableHTML(
          ["Timestamp", "PR", "GHI (W/m²)"],
          prHistory.slice(0, 60).map((r) => [
            format(parseISO(r.timestamp), "MMM dd HH:mm"),
            prBadgeHTML(r.performance_ratio), r.ghi?.toFixed(0),
          ]),
        ),
      });
    }

    if (anomalies.length) {
      sections.push({
        title: `Detected Anomalies (${anomalies.length})`,
        content: tableHTML(
          ["Timestamp", "PR", "Actual (Wh)", "Expected (Wh)", "Probable Cause"],
          anomalies.map((a) => [
            format(parseISO(a.timestamp), "MMM dd HH:mm"),
            prBadgeHTML(a.performance_ratio), a.actual_wh.toFixed(0),
            a.expected_wh?.toFixed(0), a.probable_cause ?? "—",
          ]),
        ),
      });
    }

    openPrintableReport({
      title: "SolarSense Analytics Report",
      panelName: selected.name,
      sections,
    });
  };

  if (!panels.length && !loading) {
    return <p className="py-16 text-center text-muted-foreground">Add a panel first to see analytics.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground">Historical performance and anomaly detection</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            {[7, 30, 90].map((d) => (
              <Button
                key={d} size="sm"
                variant={days === d ? "default" : "outline"}
                onClick={() => setDays(d)}
              >
                {d}d
              </Button>
            ))}
          </div>
          <ExportButton onExportCSV={handleExportCSV} onExportPDF={handleExportPDF} disabled={!selected} />
        </div>
      </div>

      <PanelSelector panels={panels} selected={selected} onSelect={setSelected} />

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Average PR */}
          <Card>
            <CardContent className="py-6 text-center">
              <p className="text-sm text-muted-foreground mb-1">
                Average Performance Ratio ({days} days)
              </p>
              <p className={`text-5xl font-bold tabular-nums ${prColor}`}>
                {avgPR.toFixed(1)}%
              </p>
            </CardContent>
          </Card>

          {/* PR History Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Performance Ratio History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {prData.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={prData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="time" fontSize={11} className="fill-muted-foreground" />
                    <YAxis domain={[0, 120]} fontSize={12} className="fill-muted-foreground" />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "0.5rem",
                        border: "1px solid hsl(var(--border))",
                        background: "hsl(var(--card))",
                        fontSize: "0.8rem",
                      }}
                    />
                    <ReferenceLine y={80} stroke="hsl(142 71% 45%)" strokeDasharray="3 3" label={{ value: "Good", fill: "hsl(142 71% 45%)", fontSize: 11 }} />
                    <ReferenceLine y={60} stroke="hsl(38 92% 50%)" strokeDasharray="3 3" label={{ value: "Fair", fill: "hsl(38 92% 50%)", fontSize: 11 }} />
                    <Line
                      type="monotone" dataKey="pr" name="PR %"
                      stroke="hsl(217 91% 60%)" strokeWidth={2} dot={false}
                      animationDuration={800}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  No PR data for this period
                </p>
              )}
            </CardContent>
          </Card>

          {/* Anomaly List */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Detected Anomalies
                </CardTitle>
                <Badge variant={anomalies.length ? "destructive" : "secondary"} className="tabular-nums">
                  {anomalies.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {anomalies.length === 0 ? (
                <div className="flex items-center gap-2 text-emerald-600">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="text-sm font-medium">No anomalies in this period</span>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                  {anomalies.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3 transition-colors hover:bg-destructive/10"
                    >
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                      <div className="space-y-1 text-sm">
                        <p className="font-medium">
                          {format(parseISO(a.timestamp), "MMM dd, yyyy HH:mm")} — PR: {a.performance_ratio?.toFixed(1)}%
                        </p>
                        <p className="text-muted-foreground">
                          Actual: {a.actual_wh?.toFixed(0)} Wh | Expected: {a.expected_wh?.toFixed(0)} Wh
                        </p>
                        {a.probable_cause && (
                          <p className="font-medium text-destructive">{a.probable_cause}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
