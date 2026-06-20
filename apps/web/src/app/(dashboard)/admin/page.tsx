/**
 * /admin — Admin-only platform overview dashboard.
 *
 * Server Component: auth() → redirect('/login'); ROLE GATE → redirect('/dashboard')
 * when session.user.role !== 'ADMIN' (T-08-16: Elevation of Privilege mitigated).
 *
 * Fetches AdminAnalyticsDto from NestJS via INTERNAL_API_URL (server-side).
 * NestJS RolesGuard provides authoritative enforcement (returns 403 if reached
 * without ADMIN role even if the page redirect were bypassed).
 *
 * UI-SPEC Screen 6: "Platform Overview" heading, sub-heading with lastUpdated relative
 * time, 4 AdminStatCard (DAU/WAU/MAU/Retention) in grid-cols-4, then 2-col grid with
 * UserGrowthChart + TopContentTable, then full-width ModuleCompletionTable (ANLT-02).
 */

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { fetchWithAuth, INTERNAL_API_URL } from "@/lib/api-client";
import { AdminStatCard } from "@/components/analytics/admin-stat-card";
import { UserGrowthChart } from "@/components/analytics/user-growth-chart";
import { TopContentTable } from "@/components/analytics/top-content-table";
import { ModuleCompletionTable } from "@/components/analytics/module-completion-table";
import type { AdminAnalyticsDto } from "@repo/shared";

/** Format ISO timestamp as a relative "N minutes/hours/days ago" string. */
function formatRelativeTime(isoString: string): string {
  try {
    const diff = Date.now() - new Date(isoString).getTime();
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days === 1 ? "" : "s"} ago`;
  } catch {
    return "recently";
  }
}

const EMPTY_DATA: AdminAnalyticsDto = {
  dau: 0,
  wau: 0,
  mau: 0,
  retentionRate: 0,
  topContent: [],
  completionRateByModule: [],
  userGrowth: [],
  lastUpdated: new Date().toISOString(),
};

export default async function AdminPage() {
  const session = await auth();

  // Auth gate — redirect unauthenticated to login
  if (!session) redirect("/login");

  // Role gate — redirect non-ADMIN to dashboard (T-08-16)
  // Use 'ADMIN' literal — Pitfall 3 (not 'USER')
  if (session.user?.role !== "ADMIN") redirect("/dashboard");

  // Fetch admin analytics from NestJS via server-side INTERNAL_API_URL
  const reqHeaders = await headers();
  const cookieHeader = reqHeaders.get("cookie") ?? "";

  let analytics: AdminAnalyticsDto = EMPTY_DATA;
  try {
    const res = await fetchWithAuth(
      cookieHeader,
      `${INTERNAL_API_URL}/api/analytics/admin`,
    );
    if (res.ok) {
      analytics = (await res.json()) as AdminAnalyticsDto;
    }
  } catch {
    // Graceful fallback — render empty state if NestJS is unavailable
  }

  const retentionPct = (analytics.retentionRate * 100).toFixed(1) + "%";
  const lastUpdatedLabel = formatRelativeTime(analytics.lastUpdated);

  return (
    <div className="mx-auto max-w-screen-xl px-4 py-8">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">
          Platform Overview
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Last updated {lastUpdatedLabel}
        </p>
      </div>

      {/* 4 stat cards — grid-cols-2 md:grid-cols-4 gap-4 */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <AdminStatCard
          label="Daily Active Users"
          value={analytics.dau}
          index={0}
        />
        <AdminStatCard
          label="Weekly Active Users"
          value={analytics.wau}
          index={1}
        />
        <AdminStatCard
          label="Monthly Active Users"
          value={analytics.mau}
          index={2}
        />
        <AdminStatCard
          label="Week-2 Retention Rate"
          value={retentionPct}
          index={3}
        />
      </div>

      {/* Charts + top content table — 2-col grid */}
      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <UserGrowthChart data={analytics.userGrowth} />
        <TopContentTable data={analytics.topContent} />
      </div>

      {/* ANLT-02: Module Completion Rates — full width below charts */}
      <ModuleCompletionTable data={analytics.completionRateByModule} />
    </div>
  );
}
