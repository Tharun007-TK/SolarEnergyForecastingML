"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, IndianRupee, Leaf } from "lucide-react";
import type { EnergySummary as EnergySummaryType } from "@/lib/api";

interface Props {
  summary: EnergySummaryType[];
}

const LABELS: Record<string, string> = {
  today: "Today",
  this_week: "This Week",
  this_month: "This Month",
  lifetime: "Lifetime",
};

export function EnergySummary({ summary }: Props) {
  if (!summary.length) return null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {summary.map((s) => (
        <Card key={s.period} className="relative overflow-hidden">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {LABELS[s.period] ?? s.period}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            <div className="flex items-baseline gap-1">
              <Zap className="h-4 w-4 text-amber-500" />
              <span className="text-xl font-bold tabular-nums">{s.total_kwh}</span>
              <span className="text-xs text-muted-foreground">kWh</span>
            </div>
            <div className="flex items-center gap-1 text-emerald-600">
              <IndianRupee className="h-3 w-3" />
              <span className="text-sm font-semibold tabular-nums">{s.money_saved}</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Leaf className="h-3 w-3" />
              <span className="text-xs tabular-nums">{s.co2_offset_kg} kg CO₂</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
