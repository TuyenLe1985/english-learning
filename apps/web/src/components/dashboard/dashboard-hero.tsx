/**
 * DashboardHero — full-width hero card for the dashboard.
 *
 * DASH-01: Renders XP progress bar, level badge, CEFR badge, streak flame.
 * UI-SPEC Screen 1 (Hero section D-01):
 *   Row 1: "Welcome back, {name}" + LevelBadge + CefrBadge
 *   Row 2: XP progress bar (inline, not using XpProgressBar component to avoid duplicate level text)
 *   Row 3: Flame icon (orange-500) + "{n} day streak" + "Keep it up!"
 *
 * Animation: framer-motion opacity + translateY entrance (duration 0.3, easeOut).
 * XP formula (D-09): xpIntoLevel = xpTotal % 100, toward 100.
 */

"use client";

import { motion } from "framer-motion";
import { Flame } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { LevelBadge } from "@/components/gamification/level-badge";
import { CefrBadge, type CefrLevel } from "@/components/cefr-badge";

interface DashboardHeroProps {
  user: {
    name: string;
    xpTotal: number;
    level: number;
    cefrLevel: CefrLevel;
    streak: number;
  };
}

export function DashboardHero({ user }: DashboardHeroProps) {
  // D-09 formula: progress within current level
  const xpIntoLevel = user.xpTotal % 100;
  const xpForNext = 100;
  const progressPct = (xpIntoLevel / xpForNext) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <Card className="w-full">
        <CardContent className="p-6">
          {/* Row 1: Greeting + LevelBadge + CefrBadge */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <h1 className="text-xl font-semibold text-foreground">
              Welcome back, {user.name}
            </h1>
            <LevelBadge level={user.level} size="md" />
            <CefrBadge level={user.cefrLevel} />
          </div>

          {/* Row 2: XP progress bar (inline — avoids duplicate "Level N" text from XpProgressBar) */}
          <div className="mb-4 w-full">
            <div className="mb-1.5 flex items-center justify-between text-sm text-muted-foreground">
              <span>{user.xpTotal} XP total</span>
              <span className="text-xs">
                {xpIntoLevel} / {xpForNext} to next level
              </span>
            </div>
            <Progress
              value={progressPct}
              className="h-2"
              aria-label={`XP progress: ${xpIntoLevel} of ${xpForNext} toward next level`}
            />
          </div>

          {/* Row 3: Streak flame + count + encouragement */}
          <div className="flex items-center gap-2 text-sm">
            <Flame className="h-[18px] w-[18px] text-orange-500" aria-hidden="true" />
            <span className="font-semibold text-foreground">{user.streak} day streak</span>
            <span className="text-muted-foreground">Keep it up!</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
