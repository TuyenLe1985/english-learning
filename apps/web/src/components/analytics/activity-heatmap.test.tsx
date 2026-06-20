/**
 * ActivityHeatmap component tests — Wave 0 RED scaffolds (Plan 08-01c)
 *
 * ANLT-01: Activity heatmap renders a GitHub-style grid covering 365 days.
 *
 * Tests use Testing Library render/screen (jsdom environment via vitest.config.ts).
 * Pattern mirrors apps/web/src/components/srs/review-card.test.tsx.
 *
 * react-activity-calendar is mocked to avoid SVG/DOM measurement issues in jsdom.
 *
 * These tests FAIL intentionally — ActivityHeatmap component does not exist yet.
 * Plan 08-06 turns these green.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ActivityHeatmap } from "./activity-heatmap";

// Mock react-activity-calendar to avoid canvas/SVG issues in jsdom
// react-activity-calendar v3 uses named export { ActivityCalendar } (not default)
vi.mock("react-activity-calendar", () => ({
  ActivityCalendar: ({
    data,
  }: {
    data: Array<{ date: string; count: number; level: number }>;
  }) => (
    <div
      data-testid="activity-calendar"
      data-activity-count={data.length}
    >
      {data.map((d) => (
        <div
          key={d.date}
          data-testid={`activity-day-${d.date}`}
          data-count={d.count}
          data-level={d.level}
        />
      ))}
    </div>
  ),
}));

// ─── Helper: generate 365 days of activity data ───────────────────────────────

function generateYearActivity(
  year = 2025,
): Array<{ date: string; count: number; level: number }> {
  const data: Array<{ date: string; count: number; level: number }> = [];
  const start = new Date(`${year}-06-20`);
  for (let i = 0; i < 365; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() - (364 - i));
    const dateStr = d.toISOString().split("T")[0];
    const count = i % 7 === 0 ? 5 : i % 3 === 0 ? 2 : 0;
    const level =
      count === 0 ? 0 : count <= 3 ? 1 : count <= 7 ? 2 : count <= 10 ? 3 : 4;
    data.push({ date: dateStr, count, level });
  }
  return data;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ActivityHeatmap", () => {
  // ---------------------------------------------------------------------------
  // ANLT-01 — renders 365 days of activity data
  // ---------------------------------------------------------------------------
  it("ANLT-01: renders ActivityCalendar with exactly 365 days of data", () => {
    const activityData = generateYearActivity();

    render(<ActivityHeatmap activityData={activityData} />);

    const calendar = screen.getByTestId("activity-calendar");
    expect(calendar).toBeTruthy();

    // Component should pass all 365 days to the underlying ActivityCalendar
    const renderedCount = parseInt(
      calendar.getAttribute("data-activity-count") ?? "0",
      10,
    );
    expect(renderedCount).toBe(365);
  });

  it("ANLT-01: accepts activityData prop with date/count/level shape", () => {
    const activityData = generateYearActivity();

    // Should render without throwing
    expect(() => render(<ActivityHeatmap activityData={activityData} />)).not.toThrow();
  });

  it("ANLT-01: renders the activity calendar container", () => {
    const activityData = generateYearActivity();

    render(<ActivityHeatmap activityData={activityData} />);

    expect(screen.getByTestId("activity-calendar")).toBeTruthy();
  });
});
