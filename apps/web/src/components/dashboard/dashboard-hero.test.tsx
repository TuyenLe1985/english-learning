/**
 * DashboardHero component tests — Wave 0 RED scaffolds (Plan 08-01c)
 *
 * DASH-01: Dashboard hero renders XP bar toward next level, level badge, CEFR badge, streak flame.
 *
 * Tests use Testing Library render/screen (jsdom environment via vitest.config.ts).
 * Pattern mirrors apps/web/src/components/srs/review-card.test.tsx.
 *
 * These tests FAIL intentionally — DashboardHero component does not exist yet.
 * Plan 08-05 turns these green.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DashboardHero } from "./dashboard-hero";

// Mock framer-motion to avoid animation issues in tests
vi.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      ...props
    }: React.ComponentProps<"div">) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

// ─── Test props ───────────────────────────────────────────────────────────────

const defaultProps = {
  user: {
    name: "Alice",
    xpTotal: 350,
    level: 4,
    cefrLevel: "B2" as const,
    streak: 7,
  },
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("DashboardHero", () => {
  // ---------------------------------------------------------------------------
  // DASH-01 — XP bar, level badge, CEFR badge, streak
  // ---------------------------------------------------------------------------
  it("DASH-01: renders level badge with correct level number", () => {
    render(<DashboardHero {...defaultProps} />);
    // Level badge must display the level number
    expect(screen.getByText(/4/)).toBeTruthy();
  });

  it("DASH-01: renders CEFR level badge (B2)", () => {
    render(<DashboardHero {...defaultProps} />);
    // CEFR badge must display the CEFR level
    expect(screen.getByText(/B2/)).toBeTruthy();
  });

  it("DASH-01: renders XP total or XP progress indicator", () => {
    render(<DashboardHero {...defaultProps} />);
    // XP value should appear in the hero (either 350 XP or xpTotal rendering)
    expect(screen.getByText(/350|XP/i)).toBeTruthy();
  });

  it("DASH-01: renders streak count (7)", () => {
    render(<DashboardHero {...defaultProps} />);
    // Streak count must be visible
    expect(screen.getByText(/7/)).toBeTruthy();
  });

  it("DASH-01: renders user name", () => {
    render(<DashboardHero {...defaultProps} />);
    expect(screen.getByText(/Alice/)).toBeTruthy();
  });
});
