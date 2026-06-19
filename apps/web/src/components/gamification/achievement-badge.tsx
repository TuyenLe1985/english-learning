/**
 * AchievementBadge — single achievement tile for the profile achievement grid (GAME-04).
 *
 * Locked state (earnedAt === null):
 *   - border-border bg-muted opacity-60
 *   - Lock icon from lucide-react
 *   - "Locked" text in muted color
 *
 * Earned state (earnedAt !== null):
 *   - border-emerald-200 bg-emerald-50 (full opacity)
 *   - Trophy emoji or iconUrl image
 *   - Earned date in text-xs text-muted-foreground
 *
 * Accessibility: role="img" aria-label describes locked/unlocked state.
 */

"use client";

import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface AchievementBadgeProps {
  slug: string;
  name: string;
  description: string;
  iconUrl: string | null;
  earnedAt: Date | string | null; // Date | null (earnedAt from API)
  className?: string;
}

export function AchievementBadge({
  name,
  description,
  iconUrl,
  earnedAt,
  className,
}: AchievementBadgeProps) {
  const isUnlocked = earnedAt !== null && earnedAt !== undefined;

  const earnedDate = isUnlocked
    ? new Date(earnedAt as string | Date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div
      role="img"
      aria-label={
        isUnlocked
          ? `Achievement: ${name} — ${description}`
          : `Locked achievement: ${name}`
      }
      title={description}
      className={cn(
        "flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center transition-colors",
        isUnlocked
          ? "border-emerald-200 bg-emerald-50"
          : "border-border bg-muted opacity-60",
        className,
      )}
    >
      {/* Icon */}
      <div className="flex h-8 w-8 items-center justify-center">
        {iconUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={iconUrl} alt="" className="h-8 w-8 object-contain" />
        ) : isUnlocked ? (
          <span className="text-2xl" role="img" aria-hidden="true">
            🏆
          </span>
        ) : (
          <Lock className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        )}
      </div>

      {/* Name */}
      <p className="text-xs font-medium text-foreground leading-tight">{name}</p>

      {/* Earned date or Locked */}
      {isUnlocked && earnedDate ? (
        <p className="text-[10px] text-muted-foreground">{earnedDate}</p>
      ) : (
        <p className="text-[10px] text-muted-foreground">Locked</p>
      )}
    </div>
  );
}
