/**
 * LevelBadge — circular/pill badge showing user level number.
 *
 * Color tiers mirror CefrBadge:
 *   Levels 1-33  → blue (beginner)
 *   Levels 34-66 → emerald (intermediate)
 *   Levels 67-100 → violet (advanced)
 *
 * Sizes: sm (xs text), md (sm text, default), lg (lg text, for level-up modal).
 */

"use client";

import { cn } from "@/lib/utils";

interface LevelBadgeProps {
  level: number; // 1–100
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function LevelBadge({ level, size = "md", className }: LevelBadgeProps) {
  // Color tiers: 1-33 blue, 34-66 emerald, 67-100 violet (mirrors CefrBadge color scheme)
  const tierClass =
    level <= 33
      ? "bg-blue-100 text-blue-700 border-blue-200"
      : level <= 66
        ? "bg-emerald-100 text-emerald-800 border-emerald-200"
        : "bg-violet-100 text-violet-800 border-violet-200";

  return (
    <span
      role="img"
      aria-label={`Level ${level}`}
      className={cn(
        "inline-flex items-center rounded-full border font-semibold transition-colors",
        size === "sm"
          ? "px-2 py-0.5 text-xs"
          : size === "lg"
            ? "px-4 py-1 text-lg"
            : "px-2.5 py-0.5 text-sm",
        tierClass,
        className,
      )}
    >
      Lv. {level}
    </span>
  );
}
