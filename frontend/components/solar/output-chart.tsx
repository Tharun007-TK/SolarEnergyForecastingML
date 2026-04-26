"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from "recharts";
import { format, parseISO } from "date-fns";
import type { Reading } from "@/lib/api";

interface Props {
  readings: Reading[];
}

export function OutputChart({ readings }: Props) {
  const data = [...readings]
    .reverse()
    .map((r) => ({
      time: format(parseISO(r.timestamp), "MMM dd HH:mm"),
      actual: Number(r.actual_wh.toFixed(1)),
      expected: r.expected_wh ? Number(r.expected_wh.toFixed(1)) : null,
    }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Actual vs Expected Output (Wh)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">No readings yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="time" fontSize={11} className="fill-muted-foreground" />
              <YAxis fontSize={11} className="fill-muted-foreground" />
              <Tooltip
                contentStyle={{
                  borderRadius: "0.5rem",
                  border: "1px solid hsl(var(--border))",
                  background: "hsl(var(--card))",
                  fontSize: "0.8rem",
                }}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: "0.8rem" }} />
              <Line
                type="monotone" dataKey="actual" name="Actual"
                stroke="hsl(217 91% 60%)" strokeWidth={2} dot={false}
                animationDuration={800}
              />
              <Line
                type="monotone" dataKey="expected" name="Expected"
                stroke="hsl(38 92% 50%)" strokeWidth={2} strokeDasharray="6 3"
                dot={false} animationDuration={800}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
