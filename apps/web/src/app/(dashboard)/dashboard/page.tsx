/**
 * Dashboard page — /dashboard (Phase 8: replaces placeholder)
 *
 * DASH-01..04: Full personalized dashboard with XP/level/streak hero, per-skill scores,
 * skill radar chart, daily activity chart, Continue Learning widget, recently viewed
 * and bookmarked content rows — all from real user data via NestJS adaptive endpoint.
 *
 * Server Component: auth-gated; redirects to /login if no session.
 * Data strategy: React Query client-side fetch from relay routes (Interaction Contract).
 * Initial SSR render shows Skeleton placeholders; client hydrates with real data.
 *
 * Page title: "Dashboard — English Learning" (Copywriting Contract).
 */

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardClient } from "./dashboard-client";

export const metadata: Metadata = {
  title: "Dashboard — English Learning",
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }

  return <DashboardClient />;
}
