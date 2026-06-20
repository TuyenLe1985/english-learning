/**
 * ActivityHeatmap — GitHub-style activity heatmap using react-activity-calendar.
 *
 * ANLT-01: Renders a full-year heatmap of learning activity.
 *
 * Data: Activity[] {date, count, level} from AnalyticsDto.activityHeatmap
 * D-16 level mapping: 0=none, 1-3=1(low), 4-7=2(medium), 8-10=3(medium-high), 11+=4(high)
 *
 * "use client" required — react-activity-calendar uses DOM SVG measurement.
 */

"use client";

import { ActivityCalendar } from "react-activity-calendar";

interface ActivityPoint {
  date: string;
  count: number;
  level: number;
}

interface ActivityHeatmapProps {
  activityData: ActivityPoint[];
}

/**
 * ActivityHeatmap renders a 365-day GitHub-style calendar heatmap.
 *
 * @param activityData - Array of {date, count, level} entries (ANLT-01)
 */
export function ActivityHeatmap({ activityData }: ActivityHeatmapProps) {
  return (
    <div
      className="w-full overflow-x-auto"
      role="grid"
      aria-label="Learning activity heatmap"
    >
      <ActivityCalendar
        data={activityData}
        theme={{
          // D-16 heatmap color scale: level 0–4
          // 0=empty, 1=light green, 2=medium green, 3=strong green, 4=darkest
          light: [
            "hsl(240 4.8% 95.9%)",
            "#bbf7d0",
            "#4ade80",
            "#16a34a",
            "#14532d",
          ],
        }}
        showWeekdayLabels
        labels={{
          tooltip: "<strong>{{count}} activities</strong> on {{date}}",
        }}
      />
    </div>
  );
}
