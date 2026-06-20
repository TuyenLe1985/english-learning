/**
 * /analytics — Student analytics page (Server Component).
 *
 * ANLT-01: Displays CEFR progression, vocabulary retention, learning time,
 * skill breakdown (per-skill accuracy), and a GitHub-style activity heatmap.
 *
 * Server Component: fetches from NestJS via INTERNAL_API_URL with forwarded
 * JWE cookie. Auth-gated: redirects to /login if no session.
 * Data is fetched server-side and passed as props to client chart components.
 *
 * UI-SPEC: Screen 5 — analytics layout, chart sizing, empty states.
 * Copywriting Contract: "Your Analytics" heading.
 */

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { fetchWithAuth, INTERNAL_API_URL } from "@/lib/api-client";
import { CefrProgressionChart } from "@/components/analytics/cefr-progression-chart";
import { VocabRetentionChart } from "@/components/analytics/vocab-retention-chart";
import { LearningTimeChart } from "@/components/analytics/learning-time-chart";
import { SkillBreakdownChart } from "@/components/analytics/skill-breakdown-chart";
import { ActivityHeatmap } from "@/components/analytics/activity-heatmap";
import type { AnalyticsDto } from "@repo/shared";

export const metadata: Metadata = {
  title: "Analytics — English Learning",
};

async function fetchAnalytics(
  cookieHeader: string,
): Promise<AnalyticsDto | null> {
  try {
    const res = await fetchWithAuth(
      cookieHeader,
      `${INTERNAL_API_URL}/api/analytics/me`,
    );
    if (!res.ok) return null;
    return res.json() as Promise<AnalyticsDto>;
  } catch {
    return null;
  }
}

const EMPTY_ANALYTICS: AnalyticsDto = {
  cefrProgression: [],
  vocabRetention: [],
  learningTime: [],
  activityHeatmap: [],
  skillBreakdown: [],
};

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const reqHeaders = await headers();
  const cookieHeader = reqHeaders.get("cookie") ?? "";

  const analytics = (await fetchAnalytics(cookieHeader)) ?? EMPTY_ANALYTICS;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-foreground">
          Your Analytics
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track your learning progress across all skill areas.
        </p>
      </div>

      {/* 2-column chart grid */}
      <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* CEFR Progression — line chart */}
        <CefrProgressionChart data={analytics.cefrProgression} />

        {/* Vocabulary Retention — line chart */}
        <VocabRetentionChart data={analytics.vocabRetention} />

        {/* Learning Time — bar chart with time range selector */}
        <LearningTimeChart data={analytics.learningTime} />

        {/* Skill Breakdown — per-skill accuracy bars (ANLT-01) */}
        <SkillBreakdownChart data={analytics.skillBreakdown} />
      </div>

      {/* Activity heatmap — full width */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-foreground">
          Activity
        </h2>
        {analytics.activityHeatmap.length > 0 ? (
          <ActivityHeatmap activityData={analytics.activityHeatmap} />
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Start learning to track your daily activity here.
          </p>
        )}
      </div>
    </div>
  );
}
