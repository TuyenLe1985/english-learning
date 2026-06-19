/**
 * XpProgressBar — shows user's XP progress toward next level (GAME-02).
 *
 * D-09 level formula: xpIntoLevel = xpTotal % 100, toward 100.
 * Label: "Level {n} · {current} / {next} XP" per UI-SPEC Copywriting Contract.
 *
 * Uses shadcn Progress component. min-h-[8px] bar height per UI-SPEC Screen 5.
 */

"use client";

import { Progress } from "@/components/ui/progress";

interface XpProgressBarProps {
  xpTotal: number; // raw total from User.xpTotal
  level: number; // current level (1-100)
}

export function XpProgressBar({ xpTotal, level }: XpProgressBarProps) {
  // D-09 formula: progress within current level
  const xpIntoLevel = xpTotal % 100;
  const xpForNext = 100;
  const progressPct = (xpIntoLevel / xpForNext) * 100;
  const nextLevel = Math.min(100, level + 1);

  return (
    <div className="w-full">
      <div className="mb-1.5 flex items-center justify-between text-sm text-muted-foreground">
        <span>Level {level}</span>
        <span className="text-xs">
          {xpIntoLevel} / {xpForNext} XP to Level {nextLevel}
        </span>
      </div>
      {/* shadcn Progress — mirrors grammar-session-results.tsx Progress pattern */}
      <Progress
        value={progressPct}
        className="h-2"
        aria-label={`XP progress: ${xpIntoLevel} of ${xpForNext} XP toward Level ${nextLevel}`}
      />
    </div>
  );
}
