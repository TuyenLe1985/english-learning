/**
 * ActivityBarChart — Recharts BarChart of daily exercise count.
 *
 * UI-SPEC: Right column top, min-h-[220px].
 * Color: --chart-1 (warm orange) fill for activity bars.
 * "Activity" heading per Copywriting Contract.
 *
 * Pitfall 6: Explicit height wrapper (h-[220px]) required.
 * Pitfall 7: "use client" required — recharts uses browser APIs.
 */

"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ActivityEntry {
  date: string;
  count: number;
}

interface ActivityBarChartProps {
  data: ActivityEntry[];
}

export function ActivityBarChart({ data }: ActivityBarChartProps) {
  return (
    <Card className="min-h-[220px]">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Pitfall 6: explicit height wrapper */}
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
                  fontSize: "12px",
                }}
                formatter={(value) => [Number(value), "Exercises"]}
              />
              <Bar
                dataKey="count"
                fill="hsl(var(--chart-1))"
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
