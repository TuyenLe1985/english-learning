/**
 * SkillRadarChart — Recharts RadarChart of 4 skill scores.
 *
 * DASH-03: Renders given skill data points on a radar chart.
 * UI-SPEC: Left column below SkillScoresCard, min-h-[220px].
 *
 * Pitfall 6: Explicit height wrapper div (h-[220px]) required — ResponsiveContainer
 *   needs a parent with non-zero height to render correctly.
 * Pitfall 7: "use client" required — recharts uses browser APIs (ResizeObserver).
 *
 * Data: skillScores[].accuracy is 0.0–1.0; converted to 0–100 for chart domain.
 */

"use client";

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SkillScore {
  skillArea: string;
  accuracy: number;
  isWeak: boolean;
}

interface SkillRadarChartProps {
  skillScores: SkillScore[];
}

const SKILL_LABELS: Record<string, string> = {
  GRAMMAR: "Grammar",
  VOCABULARY: "Vocabulary",
  READING: "Reading",
  LISTENING: "Listening",
  MIXED: "Mixed",
};

export function SkillRadarChart({ skillScores }: SkillRadarChartProps) {
  // Convert 0.0–1.0 accuracy to 0–100 percentage for chart domain
  const chartData = skillScores.map((s) => ({
    skill: SKILL_LABELS[s.skillArea] ?? s.skillArea,
    accuracy: Math.round(s.accuracy * 100),
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Skill Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Pitfall 6: explicit height wrapper — ResponsiveContainer requires non-zero parent height */}
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={chartData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="skill" tick={{ fontSize: 12 }} />
              <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
              <Radar
                dataKey="accuracy"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary))"
                fillOpacity={0.2}
              />
              <Tooltip
                formatter={(value) => [`${Number(value)}%`, "Accuracy"]}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
