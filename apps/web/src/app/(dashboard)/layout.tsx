/**
 * Dashboard layout — auth-gated.
 *
 * AUTH-06: Server-side auth check — unauthenticated users are redirected to /login.
 * UI-SPEC: Minimal top bar with logo + sign-out button (full nav in Phase 8).
 * D-15: NextAuth owns sign-out; signOut() is called from this layout.
 *
 * This layout wraps all routes in the (dashboard) group:
 * - /dashboard  (fleshed out in Phase 8)
 * - /profile    (Phase 2 Plan 06)
 */

import { redirect } from 'next/navigation';
import { auth, signOut } from '@/auth';

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

  return (
    <div className="min-h-screen bg-background">
      {/* Minimal top bar — logo + sign-out (UI-SPEC Phase 2; full nav in Phase 8) */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-screen-xl items-center justify-between px-4">
          {/* Logo */}
          <a
            href="/"
            className="text-base font-semibold text-foreground hover:opacity-80 transition-opacity"
          >
            English Learning
          </a>

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
      </header>

      {/* Page content */}
      <main className="mx-auto max-w-screen-xl px-4 py-8">
        {children}
      </main>
    </div>
  );
}
