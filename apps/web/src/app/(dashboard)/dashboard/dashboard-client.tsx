/**
 * DashboardClient — client component for the dashboard page.
 *
 * Fetches dashboard data via React Query from the /api/adaptive/dashboard relay route.
 * Shows Skeleton placeholders while loading; renders all dashboard widgets on success.
 * Interaction Contract: all data fetched client-side via useQuery.
 *
 * Layout (UI-SPEC Screen 1):
 *   - DashboardHero: full-width (mb-6)
 *   - Two-column grid: grid-cols-1 md:grid-cols-2 gap-6
 *     Left: SkillScoresCard + SkillRadarChart
 *     Right: ActivityBarChart + ContinueLearningWidget
 *   - Horizontal rows: mt-6 gap-6
 *     RecentlyViewedRow + BookmarkedRow
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardHero } from "@/components/dashboard/dashboard-hero";
import { SkillScoresCard } from "@/components/dashboard/skill-scores-card";
import { SkillRadarChart } from "@/components/dashboard/skill-radar-chart";
import { ActivityBarChart } from "@/components/dashboard/activity-bar-chart";
import { ContinueLearningWidget } from "@/components/dashboard/continue-learning-widget";
import { RecentlyViewedRow } from "@/components/dashboard/recently-viewed-row";
import { BookmarkedRow } from "@/components/dashboard/bookmarked-row";
import type { DashboardDto, ContinueLearningDto } from "@repo/shared";

async function fetchDashboardData(): Promise<DashboardDto> {
  const res = await fetch("/api/adaptive/dashboard", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch dashboard data");
  return res.json() as Promise<DashboardDto>;
}

// Generate last 7 days of activity labels with real zero counts.
// WR-02: The previous implementation fabricated a non-zero count for today
// (Math.round(lessonsCompleted / days)) which was incorrect — lessonsCompleted
// is a cumulative total, not today's activity. Until a dedicated per-day activity
// endpoint exists, we show real zeros rather than misleading fabricated data.
function buildActivityData() {
  const days = 7;
  const today = new Date();
  return Array.from({ length: days }, (_, i) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (days - 1 - i));
    const label = date.toLocaleDateString("en-US", { weekday: "short" });
    return { date: label, count: 0 };
  });
}

// Default Continue Learning recommendation for pre-threshold state
const DEFAULT_RECOMMENDATION: ContinueLearningDto = {
  preThreshold: true,
  recommendedModule: "READING",
};

export function DashboardClient() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard"],
    queryFn: fetchDashboardData,
    staleTime: 60_000, // 1 minute
    retry: 2,
  });

  // Loading state — Skeleton placeholders per UI-SPEC
  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Hero skeleton */}
        <Skeleton className="h-[120px] w-full rounded-lg" />

        {/* Two-column grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Skeleton className="h-[240px] rounded-lg" />
            <Skeleton className="h-[220px] rounded-lg" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-[220px] rounded-lg" />
            <Skeleton className="h-[120px] rounded-lg" />
          </div>
        </div>

        {/* Horizontal rows skeleton */}
        <div className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <div className="flex gap-4">
              <Skeleton className="h-[120px] w-[200px] flex-shrink-0 rounded-lg" />
              <Skeleton className="h-[120px] w-[200px] flex-shrink-0 rounded-lg" />
              <Skeleton className="h-[120px] w-[200px] flex-shrink-0 rounded-lg" />
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-5 w-24" />
            <div className="flex gap-4">
              <Skeleton className="h-[120px] w-[200px] flex-shrink-0 rounded-lg" />
              <Skeleton className="h-[120px] w-[200px] flex-shrink-0 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (isError || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <p className="text-base font-semibold text-foreground mb-2">
          Could not load dashboard data
        </p>
        <p className="text-sm text-muted-foreground">
          Check your connection and refresh the page.
        </p>
      </div>
    );
  }

  const activityData = buildActivityData();
  const recommendation = data.recommendation ?? DEFAULT_RECOMMENDATION;

  return (
    <div>
      {/* Hero — full width */}
      <DashboardHero user={data.user} />

      {/* Two-column grid (UI-SPEC Screen 1 D-02) */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left column: Skill Scores + Radar */}
        <div className="flex flex-col gap-6">
          <SkillScoresCard skillScores={data.skillScores} />
          <SkillRadarChart skillScores={data.skillScores} />
        </div>

        {/* Right column: Activity + Continue Learning */}
        <div className="flex flex-col gap-6">
          <ActivityBarChart data={activityData} />
          <ContinueLearningWidget recommendation={recommendation} />
        </div>
      </div>

      {/* Horizontal scroll rows (UI-SPEC Screen 1 D-04) */}
      <div className="mt-6 flex flex-col gap-6">
        <RecentlyViewedRow items={data.recentlyViewed} />
        <BookmarkedRow items={data.bookmarked} />
      </div>
    </div>
  );
}
