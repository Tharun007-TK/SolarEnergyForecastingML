"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Props {
  value: number | null;
}

export function PRGauge({ value }: Props) {
  const pr = value ?? 0;
  const clamped = Math.min(100, Math.max(0, pr));

  const status = pr >= 80 ? "good" : pr >= 60 ? "fair" : "poor";
  const colorMap = {
    good: { stroke: "text-emerald-500", badge: "bg-emerald-500", label: "Good" },
    fair: { stroke: "text-amber-500", badge: "bg-amber-500", label: "Fair" },
    poor: { stroke: "text-red-500", badge: "bg-red-500", label: "Poor" },
  };
  const c = colorMap[status];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Performance Ratio
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          <div className="relative h-28 w-28 shrink-0">
            <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
              <circle cx="60" cy="60" r="50" fill="none" className="stroke-muted" strokeWidth="10" />
              <circle
                cx="60" cy="60" r="50" fill="none"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${(clamped / 100) * 314} 314`}
                className={`${c.stroke} transition-all duration-700 ease-out`}
                stroke="currentColor"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-2xl font-bold tabular-nums ${c.stroke}`}>
                {pr.toFixed(0)}%
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <Badge className={`${c.badge} text-white border-0`}>{c.label}</Badge>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {status === "good" && "Panel operating normally"}
              {status === "fair" && "Slight underperformance detected"}
              {status === "poor" && "Check panel for potential issues"}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
