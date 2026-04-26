"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import type { Anomaly } from "@/lib/api";

interface Props {
  anomalies: Anomaly[];
}

export function AnomalyBadge({ anomalies }: Props) {
  if (!anomalies.length) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Anomalies</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-emerald-600">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-sm font-medium">No anomalies detected</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-destructive/30">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-destructive">Anomalies</CardTitle>
          <Badge variant="destructive" className="tabular-nums">{anomalies.length}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
          {anomalies.map((a) => (
            <div
              key={a.id}
              className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3 transition-colors hover:bg-destructive/10"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <div className="space-y-1 text-sm">
                <p className="font-medium">
                  PR: {a.performance_ratio?.toFixed(1)}% &middot; Actual: {a.actual_wh?.toFixed(0)} Wh
                </p>
                {a.probable_cause && (
                  <p className="text-destructive">{a.probable_cause}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {format(parseISO(a.timestamp), "MMM dd, yyyy HH:mm")}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
