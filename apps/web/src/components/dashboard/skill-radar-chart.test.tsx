/**
 * SkillRadarChart component tests — Wave 0 RED scaffolds (Plan 08-01c)
 *
 * DASH-03: Skill radar chart renders 4 skill data points (Grammar, Vocabulary, Reading, Listening).
 *
 * Tests use Testing Library render/screen (jsdom environment via vitest.config.ts).
 * Pattern mirrors apps/web/src/components/srs/review-card.test.tsx.
 *
 * Recharts is mocked to avoid canvas/DOM measurement issues in jsdom.
 *
 * These tests FAIL intentionally — SkillRadarChart component does not exist yet.
 * Plan 08-05 turns these green.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SkillRadarChart } from "./skill-radar-chart";

// Mock recharts to avoid ResizeObserver / canvas issues in jsdom
vi.mock("recharts", () => ({
  ResponsiveContainer: ({
    children,
  }: {
    children: React.ReactNode;
  }) => <div data-testid="responsive-container">{children}</div>,
  RadarChart: ({
    children,
    data,
  }: {
    children: React.ReactNode;
    data: Array<{ skill: string; accuracy: number }>;
  }) => (
    <div data-testid="radar-chart">
      {data.map((d) => (
        <span key={d.skill} data-testid={`radar-point-${d.skill.toLowerCase()}`}>
          {d.skill}: {d.accuracy}
        </span>
      ))}
      {children}
    </div>
  ),
  PolarGrid: () => <div data-testid="polar-grid" />,
  PolarAngleAxis: () => <div data-testid="polar-angle-axis" />,
  PolarRadiusAxis: () => <div data-testid="polar-radius-axis" />,
  Radar: () => <div data-testid="radar" />,
  Tooltip: () => <div data-testid="tooltip" />,
}));

// ─── Test props ───────────────────────────────────────────────────────────────

const fourSkillData = [
  { skillArea: "GRAMMAR", accuracy: 0.72, isWeak: false },
  { skillArea: "VOCABULARY", accuracy: 0.85, isWeak: false },
  { skillArea: "READING", accuracy: 0.55, isWeak: true },
  { skillArea: "LISTENING", accuracy: 0.45, isWeak: true },
];

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("SkillRadarChart", () => {
  // ---------------------------------------------------------------------------
  // DASH-03 — 4 skill data points rendered
  // ---------------------------------------------------------------------------
  it("DASH-03: renders a RadarChart with 4 skill data points", () => {
    render(<SkillRadarChart skillScores={fourSkillData} />);

    // Assert the chart container renders
    const chart = screen.getByTestId("radar-chart");
    expect(chart).toBeTruthy();

    // Assert all 4 skill points are present in the chart data
    expect(screen.getByTestId("radar-point-grammar")).toBeTruthy();
    expect(screen.getByTestId("radar-point-vocabulary")).toBeTruthy();
    expect(screen.getByTestId("radar-point-reading")).toBeTruthy();
    expect(screen.getByTestId("radar-point-listening")).toBeTruthy();
  });

  it("DASH-03: renders ResponsiveContainer wrapper", () => {
    render(<SkillRadarChart skillScores={fourSkillData} />);
    expect(screen.getByTestId("responsive-container")).toBeTruthy();
  });

  it("DASH-03: displays accuracy as percentage values for each skill", () => {
    render(<SkillRadarChart skillScores={fourSkillData} />);

    // Grammar accuracy 0.72 → should show 72 as percentage
    const grammarPoint = screen.getByTestId("radar-point-grammar");
    expect(grammarPoint.textContent).toContain("72");
  });
});
