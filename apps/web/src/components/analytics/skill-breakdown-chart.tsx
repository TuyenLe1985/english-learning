/**
 * SkillBreakdownChart — per-skill accuracy card (ANLT-01 "skill breakdown").
 *
 * Renders accuracy bars for Grammar/Vocabulary/Reading/Listening skills from
 * AnalyticsDto.skillBreakdown[]. isWeak skills are flagged with text-destructive.
 *
 * Reuses the SkillScoresCard structure from 08-05. Shows each skill as an
 * accuracy bar with percentage label. Weak skills highlighted with destructive color.
 *
 * "use client" required — interactive bar rendering.
 */

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { SkillScoreDto } from "@repo/shared";

const SKILL_LABELS: Record<string, string> = {
  GRAMMAR: "Grammar",
  VOCABULARY: "Vocabulary",
  READING: "Reading",
  LISTENING: "Listening",
  MIXED: "Mixed",
};

interface SkillBreakdownChartProps {
  data: SkillScoreDto[];
}

export function SkillBreakdownChart({ data }: SkillBreakdownChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">
            Skill Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-8 text-center text-sm text-muted-foreground">
            Complete skill exercises to see your skill breakdown here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold">Skill Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.map((skill) => {
          const accuracyPct = Math.round(skill.accuracy * 100);
          return (
            <div
              key={skill.skillArea}
              aria-label={`${SKILL_LABELS[skill.skillArea] ?? skill.skillArea}: ${accuracyPct}% accuracy`}
              className={cn(
                "rounded-md p-2",
                skill.isWeak && "bg-destructive/10",
              )}
            >
              <div className="mb-1 flex items-center justify-between">
                <span
                  className={cn(
                    "text-sm font-medium",
                    skill.isWeak
                      ? "text-destructive"
                      : "text-foreground",
                  )}
                >
                  {SKILL_LABELS[skill.skillArea] ?? skill.skillArea}
                  {skill.isWeak && (
                    <span className="ml-2 text-xs font-normal">
                      Needs work
                    </span>
                  )}
                </span>
                <span
                  className={cn(
                    "text-sm font-semibold",
                    skill.isWeak ? "text-destructive" : "text-foreground",
                  )}
                >
                  {accuracyPct}%
                </span>
              </div>
              {/* Accuracy bar */}
              <div className="h-2 w-full rounded-full bg-muted">
                <div
                  className={cn(
                    "h-2 rounded-full transition-all",
                    skill.isWeak ? "bg-destructive" : "bg-primary",
                  )}
                  style={{ width: `${accuracyPct}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
