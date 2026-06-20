/**
 * Dashboard layout — auth-gated with full navigation chrome (Phase 8).
 *
 * AUTH-06: Server-side auth check — unauthenticated users are redirected to /login.
 * D-15: Sidebar required; Admin link rendered only when session.user.role === 'ADMIN'.
 * UI-SPEC Screen 3 + Updated Dashboard Layout Navigation:
 *   - Top bar (sticky h-14): logo | TopNavSearch (center max-w-[320px]) | right cluster
 *   - Right cluster: LevelBadge sm | Sign out
 *   - Left column: Sidebar nav (w-56) with module links + role-gated Admin link
 *   - Main content: shifted right by sidebar width on md+ screens
 *
 * This layout wraps all routes in the (dashboard) group:
 * - /dashboard, /profile, /reading, /listening, /grammar, /vocabulary, /quiz, /review,
 *   /analytics, /search, /admin
 */

import { redirect } from 'next/navigation';
import { auth, signOut } from '@/auth';
import { QueryProvider } from '@/components/query-provider';
import { Sidebar } from '@/components/navigation/sidebar';
import { TopNavSearch } from '@/components/search/top-nav-search';
import { LevelBadge } from '@/components/gamification/level-badge';
import Link from 'next/link';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // AUTH-06: Server-side session check
  const session = await auth();
  if (!session) {
    redirect('/login');
  }

  const userRole = session.user?.role ?? null;
  const userLevel = (session.user as { level?: number })?.level ?? 1;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top bar — sticky, full width */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center justify-between gap-4 px-4">
          {/* Logo */}
          <Link
            href="/dashboard"
            className="shrink-0 text-base font-semibold text-foreground hover:opacity-80 transition-opacity"
          >
            English Learning
          </Link>

          {/* Center: TopNavSearch */}
          <div className="flex flex-1 items-center justify-center">
            <TopNavSearch />
          </div>

          {/* Right cluster: LevelBadge + Sign out */}
          <div className="flex shrink-0 items-center gap-3">
            <Link href="/profile" aria-label="View profile">
              <LevelBadge level={userLevel} size="sm" />
            </Link>

            {/* Sign out — server action via form (no client component needed) */}
            <form
              action={async () => {
                'use server';
                await signOut({ redirectTo: '/login' });
              }}
            >
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Body: Sidebar (left) + Main content (right) */}
      <div className="flex flex-1">
        {/* D-15 REQUIRED: Sidebar nav with module links + role-gated Admin link */}
        <div className="hidden md:block sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto">
          <Sidebar role={userRole} />
        </div>

        {/* Page content — wrapped with QueryProvider for React Query */}
        <main className="flex-1 overflow-auto px-4 py-8">
          <QueryProvider>
            {children}
          </QueryProvider>
        </main>
      </div>
    </div>
  );
}
