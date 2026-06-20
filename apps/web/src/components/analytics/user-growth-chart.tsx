/**
 * UserGrowthChart — cumulative user registrations line chart.
 *
 * UI-SPEC Screen 6: Recharts LineChart, --chart-5 (amber) stroke color,
 * "use client" required (Recharts measures DOM client-side — Pitfall 7),
 * explicit-height wrapper div (Pitfall 6).
 *
 * Data: UserGrowthPoint[] { date: string; total: number }
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
import type { UserGrowthPoint } from "@repo/shared";

interface UserGrowthChartProps {
  data: UserGrowthPoint[];
}

export function UserGrowthChart({ data }: UserGrowthChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">User Growth</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-8 text-center text-sm text-muted-foreground">
            No user growth data available yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Format date labels: YYYY-MM-DD → "Jun 20"
  const formatted = data.map((point) => ({
    ...point,
    label: new Date(point.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold">User Growth</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Explicit height wrapper — Pitfall 6: ResponsiveContainer needs parent height */}
        <div style={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={formatted}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <Tooltip
                formatter={(value) => [
                  typeof value === "number"
                    ? value.toLocaleString()
                    : String(value),
                  "Total Users",
                ]}
              />
              <Line
                type="monotone"
                dataKey="total"
                stroke="var(--chart-5, hsl(27, 87%, 67%))"
                strokeWidth={2}
                dot={{ r: 3, fill: "var(--chart-5, hsl(27, 87%, 67%))" }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
