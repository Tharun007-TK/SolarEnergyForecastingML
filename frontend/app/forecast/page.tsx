"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PanelSelector } from "@/components/solar/panel-selector";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { ExportButton } from "@/components/solar/export-button";
import { Loader2, TrendingUp, TrendingDown } from "lucide-react";
import { downloadCSV, openPrintableReport, tableHTML, statCardsHTML } from "@/lib/export";
import { listPanels, getGenerationForecast, type Panel, type DailyForecast } from "@/lib/api";

export default function ForecastPage() {
  const [panels, setPanels] = useState<Panel[]>([]);
  const [selected, setSelected] = useState<Panel | null>(null);
  const [forecast, setForecast] = useState<DailyForecast[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listPanels()
      .then((p) => { setPanels(p); if (p.length) setSelected(p[0]); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    getGenerationForecast(selected.id)
      .then(setForecast)
      .catch(() => setForecast([]))
      .finally(() => setLoading(false));
  }, [selected]);

  const maxKwh = Math.max(...forecast.map((d) => d.expected_kwh), 0);
  const best = forecast.reduce<DailyForecast | null>(
    (b, d) => (d.expected_kwh > (b?.expected_kwh ?? 0) ? d : b), null
  );
  const worst = forecast.reduce<DailyForecast | null>(
    (w, d) => (d.expected_kwh < (w?.expected_kwh ?? Infinity) ? d : w), null
  );

  const handleExportCSV = () => {
    if (!selected) return;
    downloadCSV(`solarsense-forecast-${selected.name}`,
      ["Date", "Expected kWh", "Avg GHI (W/m²)", "Avg Temp (°C)", "Cloud (%)"],
      forecast.map((d) => [d.date, d.expected_kwh, d.ghi_avg, d.temperature_avg, d.cloud_cover_avg]),
    );
  };

  const handleExportPDF = () => {
    if (!selected) return;
    const totalKwh = forecast.reduce((s, d) => s + d.expected_kwh, 0);
    openPrintableReport({
      title: "SolarSense 7-Day Forecast Report",
      panelName: selected.name,
      sections: [
        {
          title: "Forecast Summary",
          content: statCardsHTML([
            { label: "Total Expected", value: `${totalKwh.toFixed(1)} kWh` },
            ...(best ? [{ label: "Best Day", value: best.date, sub: `${best.expected_kwh} kWh` }] : []),
            ...(worst ? [{ label: "Worst Day", value: worst.date, sub: `${worst.expected_kwh} kWh` }] : []),
            { label: "Days", value: String(forecast.length) },
          ]),
        },
        {
          title: "Daily Forecast",
          content: tableHTML(
            ["Date", "Expected kWh", "Avg GHI (W/m²)", "Avg Temp (°C)", "Cloud (%)"],
            forecast.map((d) => [d.date, d.expected_kwh, d.ghi_avg, d.temperature_avg, `${d.cloud_cover_avg}%`]),
          ),
        },
      ],
    });
  };

  if (!panels.length && !loading) {
    return <p className="py-16 text-center text-muted-foreground">Add a panel first to see forecasts.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">7-Day Forecast</h1>
          <p className="text-sm text-muted-foreground">Expected generation based on weather predictions</p>
        </div>
        <ExportButton onExportCSV={handleExportCSV} onExportPDF={handleExportPDF} disabled={!selected || !forecast.length} />
      </div>

      <PanelSelector panels={panels} selected={selected} onSelect={setSelected} />

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Best / Worst */}
          <div className="grid grid-cols-2 gap-4">
            {best && (
              <Card className="border-emerald-200/50 bg-emerald-50/50 dark:border-emerald-800/30 dark:bg-emerald-950/20">
                <CardContent className="flex items-center gap-3 py-4">
                  <TrendingUp className="h-8 w-8 text-emerald-600" />
                  <div>
                    <p className="text-xs font-medium text-emerald-600">Best Day</p>
                    <p className="text-lg font-bold">{best.date}</p>
                    <p className="text-sm text-emerald-600 font-semibold tabular-nums">{best.expected_kwh} kWh</p>
                  </div>
                </CardContent>
              </Card>
            )}
            {worst && (
              <Card className="border-orange-200/50 bg-orange-50/50 dark:border-orange-800/30 dark:bg-orange-950/20">
                <CardContent className="flex items-center gap-3 py-4">
                  <TrendingDown className="h-8 w-8 text-orange-600" />
                  <div>
                    <p className="text-xs font-medium text-orange-600">Worst Day</p>
                    <p className="text-lg font-bold">{worst.date}</p>
                    <p className="text-sm text-orange-600 font-semibold tabular-nums">{worst.expected_kwh} kWh</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Bar Chart */}
          <Card>
            <CardContent className="pt-6">
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={forecast}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" fontSize={12} className="fill-muted-foreground" />
                  <YAxis fontSize={12} className="fill-muted-foreground"
                    label={{ value: "kWh", angle: -90, position: "insideLeft", className: "fill-muted-foreground" }} />
                  <Tooltip
                    formatter={(val) => [`${val} kWh`, "Expected"]}
                    contentStyle={{
                      borderRadius: "0.5rem",
                      border: "1px solid hsl(var(--border))",
                      background: "hsl(var(--card))",
                      fontSize: "0.8rem",
                    }}
                  />
                  <Bar dataKey="expected_kwh" radius={[6, 6, 0, 0]} animationDuration={600}>
                    {forecast.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.expected_kwh === maxKwh ? "hsl(142 71% 45%)" : "hsl(217 91% 60%)"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Data Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Expected kWh</TableHead>
                    <TableHead className="text-right">Avg GHI</TableHead>
                    <TableHead className="text-right">Avg Temp</TableHead>
                    <TableHead className="text-right">Cloud %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {forecast.map((d) => (
                    <TableRow key={d.date}>
                      <TableCell className="font-medium">{d.date}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary" className="tabular-nums font-semibold">
                          {d.expected_kwh}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground tabular-nums">{d.ghi_avg} W/m²</TableCell>
                      <TableCell className="text-right text-muted-foreground tabular-nums">{d.temperature_avg}°C</TableCell>
                      <TableCell className="text-right text-muted-foreground tabular-nums">{d.cloud_cover_avg}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
