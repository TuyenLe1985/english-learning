/**
 * SkillScoresCard — 4 skill rows showing accuracy % with isWeak indicators.
 *
 * DASH-02: Renders Grammar / Vocabulary / Reading / Listening skill rows.
 * UI-SPEC:
 *   - min-h-[240px] left column card
 *   - isWeak rows: text-destructive + bg-destructive/10 + "Needs work" badge
 *   - Accessibility: aria-label on each isWeak row
 *
 * "Skill Scores" heading per Copywriting Contract.
 */

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface SkillScore {
  skillArea: string;
  accuracy: number;
  isWeak: boolean;
}

interface SkillScoresCardProps {
  skillScores: SkillScore[];
}

const SKILL_LABELS: Record<string, string> = {
  GRAMMAR: "Grammar",
  VOCABULARY: "Vocabulary",
  READING: "Reading",
  LISTENING: "Listening",
  MIXED: "Mixed",
};

// The 4 canonical skill areas in display order
const CANONICAL_SKILLS = ["GRAMMAR", "VOCABULARY", "READING", "LISTENING"];

export function SkillScoresCard({ skillScores }: SkillScoresCardProps) {
  // Build a lookup map for fast access
  const scoreMap = new Map(skillScores.map((s) => [s.skillArea, s]));

  return (
    <Card className="min-h-[240px]">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Skill Scores</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {CANONICAL_SKILLS.map((skillArea) => {
          const score = scoreMap.get(skillArea);
          const label = SKILL_LABELS[skillArea] ?? skillArea;
          const accuracy = score ? Math.round(score.accuracy * 100) : null;
          const isWeak = score?.isWeak ?? false;

          return (
            <div
              key={skillArea}
              className={cn(
                "rounded-md px-3 py-2 min-h-[44px] flex flex-col justify-center",
                isWeak ? "bg-destructive/10" : "bg-transparent",
              )}
              aria-label={
                isWeak
                  ? `${label}: ${accuracy}% — needs improvement`
                  : `${label}: ${accuracy !== null ? `${accuracy}%` : "No data yet"}`
              }
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={cn(
                    "text-sm font-medium",
                    isWeak ? "text-destructive" : "text-foreground",
                  )}
                >
                  {label}
                </span>
                <div className="flex items-center gap-2">
                  {isWeak && (
                    <span className="text-xs text-destructive font-medium">
                      Needs work
                    </span>
                  )}
                  <span
                    className={cn(
                      "text-sm font-semibold",
                      isWeak ? "text-destructive" : "text-foreground",
                    )}
                  >
                    {accuracy !== null ? `${accuracy}%` : "—"}
                  </span>
                </div>
              </div>
              <Progress
                value={accuracy ?? 0}
                className="h-1.5"
                aria-hidden="true"
              />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
