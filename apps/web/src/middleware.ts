/**
 * NextAuth route protection middleware — AUTH-06
 *
 * Protects /dashboard and /profile route groups.
 * Unauthenticated requests to these paths are redirected to /login (pages.signIn in auth.ts).
 *
 * RESEARCH Pattern 6: `export { auth as middleware }` is the canonical Next.js 14 pattern.
 * The middleware reads the NextAuth JWT cookie and redirects if no session is found.
 * Note: uses middleware.ts (not proxy.ts) — required for Next.js 14 (not 16+).
 *
 * T-02-08: Elevation of Privilege threat mitigated — unauthenticated users cannot access
 * protected routes; they are always redirected to /login.
 */
export { auth as middleware } from "@/auth";

export const config = {
  // Matcher: protect /dashboard and /profile root paths AND all nested routes (AUTH-06).
  // WR-06 fix: /:path* matches one-or-more segments, so /dashboard (no trailing path)
  // was unprotected. Added exact-path entries to cover the root dashboard/profile pages.
  // Excludes API routes, static files, and public auth pages automatically (Next.js default).
  matcher: [
    "/dashboard",
    "/dashboard/:path*",
    "/profile",
    "/profile/:path*",
    "/vocabulary",
    "/vocabulary/:path*",
    "/review",
    "/review/:path*",
  ],
};
