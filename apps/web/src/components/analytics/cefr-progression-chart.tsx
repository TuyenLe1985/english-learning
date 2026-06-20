/**
 * CefrProgressionChart — CEFR level progression line chart.
 *
 * ANLT-01: Renders monthly CEFR level history as a line chart.
 * Y-axis maps 1/2/3 → B1/B2/C1 via tickFormatter.
 * Uses CSS variable --chart-2 for the line color.
 *
 * "use client" required — Recharts measures DOM width client-side (Pitfall 7).
 * Wrapper div with explicit height is required — Pitfall 6.
 */

"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CefrProgressionPoint } from "@repo/shared";

const LEVEL_LABELS: Record<number, string> = {
  1: "B1",
  2: "B2",
  3: "C1",
};

interface CefrProgressionChartProps {
  data: CefrProgressionPoint[];
}

export function CefrProgressionChart({ data }: CefrProgressionChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">
            CEFR Progression
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-8 text-center text-sm text-muted-foreground">
            Complete more lessons to track your CEFR level progression.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold">
          CEFR Progression
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Explicit height wrapper — Pitfall 6: ResponsiveContainer needs parent height */}
        <div style={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={[1, 3]}
                ticks={[1, 2, 3]}
                tickFormatter={(v) => LEVEL_LABELS[v as number] ?? String(v)}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={30}
              />
              <Tooltip
                formatter={(value) => [
                  LEVEL_LABELS[value as number] ?? String(value),
                  "Level",
                ]}
              />
              <Line
                type="monotone"
                dataKey="level"
                stroke="var(--chart-2, hsl(142, 70%, 45%))"
                strokeWidth={2}
                dot={{ r: 4, fill: "var(--chart-2, hsl(142, 70%, 45%))" }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
