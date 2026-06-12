/**
 * CefrBadge — reusable CEFR level badge for the English Learning Platform.
 *
 * PROF-03: Displays the user's CEFR level (B1/B2/C1) with a color-coded badge
 * throughout the app. This component is used in the profile page and will be
 * reused in content cards, nav, and lesson pages in later phases.
 *
 * UI-SPEC labels:
 *   B1 → "B1 Intermediate"   (blue)
 *   B2 → "B2 Upper Intermediate" (emerald)
 *   C1 → "C1 Advanced"       (violet)
 *
 * Accessibility: includes aria-label "CEFR level: {full label}" for screen readers.
 */

"use client";

import { cn } from "@/lib/utils";

export type CefrLevel = "B1" | "B2" | "C1";

interface CefrBadgeProps {
  level: CefrLevel;
  /** Additional CSS classes to merge */
  className?: string;
}

const CEFR_CONFIG: Record<
  CefrLevel,
  { label: string; classes: string }
> = {
  B1: {
    label: "B1 Intermediate",
    classes: "bg-blue-100 text-blue-700 border-blue-200",
  },
  B2: {
    label: "B2 Upper Intermediate",
    classes: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  C1: {
    label: "C1 Advanced",
    classes: "bg-violet-100 text-violet-800 border-violet-200",
  },
};

/**
 * Reusable CEFR level badge.
 * Renders with accessible aria-label and consistent color coding per UI-SPEC.
 *
 * @example
 * <CefrBadge level="B2" />
 * // renders: "B2 Upper Intermediate" in emerald colors
 */
export function CefrBadge({ level, className }: CefrBadgeProps) {
  const config = CEFR_CONFIG[level];

  return (
    <span
      role="img"
      aria-label={`CEFR level: ${config.label}`}
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
        config.classes,
        className,
      )}
    >
      {config.label}
    </span>
  );
}
