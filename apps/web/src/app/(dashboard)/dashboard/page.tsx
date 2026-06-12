/**
 * Dashboard page — /dashboard
 *
 * Placeholder page — the redirect target for authenticated users.
 * Full dashboard experience (XP, streak, learning modules) is delivered in Phase 8.
 *
 * This page exists now so the middleware redirect target is valid and Playwright
 * E2E tests can confirm unauthenticated requests end at /login.
 */

export default function DashboardPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
      <h1 className="text-2xl font-semibold text-foreground mb-3">Dashboard</h1>
      <p className="text-muted-foreground text-base">
        Your learning dashboard is on its way — fleshed out in Phase 8.
      </p>
    </div>
  );
}
