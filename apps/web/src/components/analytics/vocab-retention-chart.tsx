/**
 * VocabRetentionChart — vocabulary retention rate line chart.
 *
 * ANLT-01: Renders weekly vocabulary retention rate as a line chart.
 * Y-axis shows retention rate as percentage (0–100%).
 * Uses CSS variable --chart-3 for the line color.
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
import type { VocabRetentionPoint } from "@repo/shared";

interface VocabRetentionChartProps {
  data: VocabRetentionPoint[];
}

export function VocabRetentionChart({ data }: VocabRetentionChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">
            Vocabulary Retention
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-8 text-center text-sm text-muted-foreground">
            Review vocabulary cards to see your retention rate here.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Convert 0.0–1.0 to percentage for chart display
  const chartData = data.map((d) => ({
    ...d,
    ratePercent: Math.round(d.rate * 100),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold">
          Vocabulary Retention
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Explicit height wrapper — Pitfall 6 */}
        <div style={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis
                dataKey="week"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={36}
              />
              <Tooltip
                formatter={(value) => [`${value}%`, "Retention"]}
              />
              <Line
                type="monotone"
                dataKey="ratePercent"
                stroke="var(--chart-3, hsl(221, 70%, 55%))"
                strokeWidth={2}
                dot={{ r: 4, fill: "var(--chart-3, hsl(221, 70%, 55%))" }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
