/**
 * LearningTimeChart — daily/weekly/monthly learning time bar chart.
 *
 * ANLT-01: Renders learning time history as a bar chart with
 * Daily/Weekly/Monthly time-range selector (local state, default Weekly).
 * Uses CSS variable --chart-4 for bar color.
 *
 * "use client" required — Recharts measures DOM width client-side (Pitfall 7).
 * Wrapper div with explicit height is required — Pitfall 6.
 */

"use client";

import { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { LearningTimePoint } from "@repo/shared";

type TimeRange = "daily" | "weekly" | "monthly";

interface LearningTimeChartProps {
  data: LearningTimePoint[];
}

function aggregateWeekly(
  data: LearningTimePoint[],
): { label: string; minutes: number }[] {
  const weeks: Record<string, number> = {};
  for (const d of data) {
    const date = new Date(d.date);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    const key = weekStart.toISOString().slice(0, 10);
    weeks[key] = (weeks[key] ?? 0) + d.minutes;
  }
  return Object.entries(weeks)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, minutes]) => ({
      label: new Date(date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      minutes,
    }));
}

function aggregateMonthly(
  data: LearningTimePoint[],
): { label: string; minutes: number }[] {
  const months: Record<string, number> = {};
  for (const d of data) {
    const key = d.date.slice(0, 7); // YYYY-MM
    months[key] = (months[key] ?? 0) + d.minutes;
  }
  return Object.entries(months)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, minutes]) => {
      const [year, month] = key.split("-");
      const date = new Date(Number(year), Number(month) - 1);
      return {
        label: date.toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        }),
        minutes,
      };
    });
}

export function LearningTimeChart({ data }: LearningTimeChartProps) {
  // Default to Weekly per UI-SPEC
  const [timeRange, setTimeRange] = useState<TimeRange>("weekly");

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    switch (timeRange) {
      case "daily":
        return data
          .slice(-30)
          .map((d) => ({
            label: new Date(d.date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            }),
            minutes: d.minutes,
          }));
      case "weekly":
        return aggregateWeekly(data);
      case "monthly":
        return aggregateMonthly(data);
    }
  }, [data, timeRange]);

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold">Learning Time</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-8 text-center text-sm text-muted-foreground">
            Start learning to track your study time here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold">Learning Time</CardTitle>
        <Select
          value={timeRange}
          onValueChange={(v) => setTimeRange(v as TimeRange)}
        >
          <SelectTrigger className="h-7 w-[100px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {/* Explicit height wrapper — Pitfall 6 */}
        <div style={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tickFormatter={(v) => `${v}m`}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={36}
              />
              <Tooltip formatter={(value) => [`${value} min`, "Study time"]} />
              <Bar
                dataKey="minutes"
                fill="var(--chart-4, hsl(280, 65%, 60%))"
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
