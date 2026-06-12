---
phase: 02-authentication-user-profile
verified: 2026-06-12T12:00:00Z
status: human_needed
score: 14/16 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Sign in with Google OAuth, confirm dashboard landing with no separate registration step, confirm DB user has emailVerified non-null"
    expected: "Google consent screen completes, user lands on /dashboard, User.emailVerified is set in PostgreSQL"
    why_human: "Requires live GOOGLE_CLIENT_ID/SECRET credentials and a real Google account — cannot be tested by grep or static analysis"
  - test: "Register a password account with email X, then Google sign-in with the same email X; confirm 1 User row and 2 Account rows in DB"
    expected: "Single User record with two Account rows (credentials + google) — PrismaAdapter allowDangerousEmailAccountLinking behavior"
    why_human: "Requires live Google OAuth flow and DB inspection — cannot be verified statically"
  - test: "Submit a registered email at /reset-password, confirm the reset email is delivered by Resend, click the link to /reset-password/confirm, set a new password, then sign in with it"
    expected: "Email arrives in inbox, link opens /reset-password/confirm, new password works at /login"
    why_human: "Requires a live RESEND_API_KEY and real email inbox — cannot be verified without running services"
  - test: "Submit an unregistered email at /reset-password and confirm the success copy is identical to the registered-email case"
    expected: "Both cases show 'If that email is registered, a reset link is on its way. Check your inbox.'"
    why_human: "Requires a running Next.js server to exercise the live server action response path"
  - test: "Unauthenticated browser navigation to /dashboard redirects to /login (Playwright E2E)"
    expected: "Browser ends on /login after navigating to /dashboard unauthenticated; /profile similarly redirects"
    why_human: "Playwright E2E requires a running Next.js dev server (baseURL localhost:3000) — not runnable in static verification"
---

# Phase 2: Authentication + User Profile Verification Report

**Phase Goal:** Users can securely create accounts, sign in via email/password or Google OAuth, manage their sessions, and view their profile
**Verified:** 2026-06-12T12:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | NextAuth issues a JWT session whose maxAge is 30 days | VERIFIED | `apps/web/src/auth.ts:44` — `session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 }` |
| 2 | NestJS can decrypt an Auth.js v5 JWE session token and reject missing/invalid Bearer token with 401 | VERIFIED | `jwt-auth.guard.ts` implements `CanActivate`, calls `decode()` from `@auth/core/jwt`, throws `UnauthorizedException` on null result or error; env-aware salt with `__Secure-authjs.session-token` branch |
| 3 | Shared DTOs and the JwtPayload type are importable from @repo/shared | VERIFIED | `packages/shared/src/auth.types.ts` exports `JwtPayload` + `JwtPayloadSchema`; `user.dto.ts` exports `UserProfileDtoSchema`, `UpdateProfileDtoSchema`, `AvatarUploadUrlRequestSchema` |
| 4 | User model has a passwordHash field and the migration is applied | VERIFIED | `schema.prisma:87` — `passwordHash String?`; migration `20260612021834_add_user_password_hash` exists under `packages/database/prisma/migrations/` |
| 5 | A new user can register with email + password; password stored only as bcrypt hash | VERIFIED | `auth-actions.ts:97` — `bcrypt.hash(password, 12)`; `emailVerified: null` at creation; duplicate email rejected |
| 6 | After registration user is sent a verification email and cannot reach dashboard until verified | VERIFIED | `auth.ts:54-56` — `signIn` callback gates Credentials users on `emailVerified`; `/api/verify-email` route sets `emailVerified`; rate-limited resend via Redis |
| 7 | Clicking verification link within 24h sets emailVerified; expired link shows error | VERIFIED | `auth-actions.ts:385-430` — transaction-wrapped lookup, expiry check, atomic delete, `emailVerified = new Date()` on success; `expired: true` signal returned |
| 8 | Resend button rate-limited 1/60s and max 3/hour per user via Redis | VERIFIED | `rate-limit.ts` — atomic Lua script (CR-04 fix) on `email-resend:rate:{userId}` (60s) and `email-resend:hourly:{userId}` (3600s, max 3) |
| 9 | User can sign in with Google OAuth (AUTH-03) | UNCERTAIN | Code path exists: Google provider registered in `auth.ts`, `allowDangerousEmailAccountLinking: true`, `emailVerified` set on first Google sign-in in jwt callback. Runtime verification requires live credentials — see human verification item 1. |
| 10 | User can request a password-reset link, receive it by email, and set a new password (AUTH-04) | UNCERTAIN | Code path exists: `createPasswordResetToken`, `resetPassword` server actions in `auth-actions.ts`; `POST /api/reset-password` route; reset-password pages present and substantive (192 + 390 lines). Runtime delivery requires live RESEND_API_KEY — see human verification item 3. |
| 11 | Authenticated session persists across browser refresh and new tab (30-day JWT cookie) | VERIFIED | Auth.js JWT strategy configured in `auth.ts:44`; HttpOnly cookie managed by Auth.js; `maxAge` prevents expiry within session window |
| 12 | Unauthenticated users visiting /dashboard or /profile are redirected to /login | VERIFIED | `middleware.ts` — `export { auth as middleware }` with `matcher: ["/dashboard", "/dashboard/:path*", "/profile", "/profile/:path*"]` (WR-06 fix applied). Static code verified; live E2E requires running server — human item 5. |
| 13 | GET /api/users/me returns authenticated user profile fields (PROF-01) | VERIFIED | `users.controller.ts:48-59` — `@UseGuards(JwtAuthGuard)`, `@Get('me')`, `usersService.getMe(userId)`; service queries `prisma.user.findUnique`; returns all required fields including `avatarUrl` and `image` |
| 14 | PATCH /api/users/me updates display name and avatar key (PROF-02) | VERIFIED | `users.controller.ts:67-84` — `@UseGuards(JwtAuthGuard)`, `@Patch('me')`; `UpdateProfileDtoSchema.parse(body)`; CR-06 fix: `avatarKey` must start with `avatars/${userId}/` |
| 15 | Avatar upload uses presigned PUT URL; requests over 2MB or with disallowed MIME type rejected | VERIFIED | `profile.service.ts:73-84` — MIME allow-list check + `sizeBytes > MAX_SIZE_BYTES` check before `getSignedUrl`; `@UseGuards(JwtAuthGuard)` on controller |
| 16 | Profile page shows CEFR badge, avatar precedence, and editable name/avatar (PROF-03) | VERIFIED | `cefr-badge.tsx` — reusable, B1/B2/C1 colors + labels, `aria-label`; `profile-form.tsx:269` uses `CefrBadge`; avatar precedence `avatarUrl ?? image ?? boring-avatars beam`; edit flow wired via relay routes to NestJS |

**Score:** 14/16 truths verified (2 UNCERTAIN — require human with live credentials)

---

### Deferred Items

None. All must-haves are either VERIFIED or UNCERTAIN (requiring human testing with live external services).

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/database/prisma/schema.prisma` | `passwordHash String?` on User model | VERIFIED | Line 87; migration `20260612021834_add_user_password_hash` applied |
| `packages/shared/src/auth.types.ts` | `JwtPayload`, `JwtPayloadSchema` exports | VERIFIED | Both exported; zod schema with userId, role, cefrLevel, optional email |
| `packages/shared/src/user.dto.ts` | `UserProfileDtoSchema`, `UpdateProfileDtoSchema`, `AvatarUploadUrlRequestSchema` | VERIFIED | All three exported; includes `image` field for Google OAuth avatar |
| `apps/web/src/auth.ts` | NextAuth with maxAge 30 days, Credentials+Google, PrismaAdapter | VERIFIED | 117 lines; `maxAge: 30 * 24 * 60 * 60`; both providers; `PrismaAdapter(prisma)`; CR-07 role-refresh logic present |
| `apps/api/src/auth/jwt-auth.guard.ts` | JwtAuthGuard using `@auth/core/jwt` decode | VERIFIED | 55 lines; `decode` imported from `@auth/core/jwt`; env-aware salt; `UnauthorizedException` on missing/invalid token |
| `apps/web/src/middleware.ts` | Route protection for /dashboard and /profile | VERIFIED | 22 lines; `export { auth as middleware }`; matcher covers root paths AND nested (WR-06 fix) |
| `apps/web/src/app/(auth)/register/page.tsx` | Registration form | VERIFIED | 361 lines; bcrypt hash via server action; Google button; redirects to /verify-email |
| `apps/web/src/app/(auth)/login/LoginForm.tsx` | Login form with Google button | VERIFIED | 319 lines; `signIn('credentials')` + `signIn('google')`; destructive Alert on failure; "Forgot password?" link |
| `apps/web/src/app/(auth)/verify-email/page.tsx` | Email verification page with resend | VERIFIED | 205 lines; rate-limited resend, 60s countdown, max-reached state |
| `apps/web/src/app/(auth)/reset-password/page.tsx` | Password reset request form | VERIFIED | 192 lines; enumeration-safe success copy; server action wired |
| `apps/web/src/app/(auth)/reset-password/confirm/page.tsx` | Password reset confirm form | VERIFIED | 390 lines; expired-token alert; success state; single-use token delete |
| `apps/api/src/users/users.controller.ts` | GET/PATCH /api/users/me | VERIFIED | Both endpoints behind `@UseGuards(JwtAuthGuard)`; userId from JWT only |
| `apps/api/src/profile/profile.controller.ts` | POST /api/profile/avatar/upload-url | VERIFIED | `@UseGuards(JwtAuthGuard)`; delegates to `ProfileService.generateAvatarUploadUrl` |
| `apps/web/src/app/(dashboard)/profile/page.tsx` | Profile page | VERIFIED | 63 lines (server component); delegates interactive logic to `ProfileForm` (353 lines); `CefrBadge` used |
| `apps/web/src/components/cefr-badge.tsx` | CEFR badge component | VERIFIED | 70 lines; B1/B2/C1 colors per UI-SPEC; `aria-label="CEFR level: {full label}"` |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `apps/api/src/auth/jwt-auth.guard.ts` | `NEXTAUTH_SECRET` | `ConfigService.get` + `@auth/core/jwt` decode salt | VERIFIED | `ConfigService.get('NEXTAUTH_SECRET')` + `'__Secure-authjs.session-token'` / `'authjs.session-token'` salt |
| `apps/web/src/auth.ts` | `@repo/database` prisma | `PrismaAdapter(prisma)` | VERIFIED | `import { prisma } from "@repo/database"` + `adapter: PrismaAdapter(prisma)` |
| `apps/web/src/lib/auth-actions.ts` | VerificationToken table | `prisma.verificationToken` create/find | VERIFIED | `createVerificationToken`, `verifyEmailToken`, `createPasswordResetToken` all query `prisma.verificationToken` |
| `apps/web/src/lib/rate-limit.ts` | Redis cache instance | `ioredis` Lua eval on `email-resend:rate:{userId}` | VERIFIED | `rate-limit.ts:8-9` uses `email-resend:rate:` key pattern; atomic Lua script (CR-04 fix) |
| `apps/web/src/lib/auth-actions.ts` | Resend API | `resend.emails.send` | VERIFIED | `auth-actions.ts:18` — `import { Resend } from 'resend'`; SDK error check pattern applied |
| `apps/web/src/middleware.ts` | `apps/web/src/auth.ts` | `export { auth as middleware }` | VERIFIED | `middleware.ts:14` — `export { auth as middleware } from "@/auth"` |
| `apps/web/src/app/(auth)/login/LoginForm.tsx` | signIn credentials | `next-auth signIn('credentials')` | VERIFIED | `LoginForm.tsx` calls `signIn('credentials', { redirect: false, ... })` |
| `apps/web/src/app/(dashboard)/profile/page.tsx` | `GET /api/users/me` | relay via `/api/profile/me` → `fetchWithAuth` → NestJS | VERIFIED | `profile-form.tsx:60` — `fetch("/api/profile/me")`; relay route `api/profile/me/route.ts` uses `fetchWithAuth(cookieHeader, ...)` with raw JWE token (CR-01 fix) |
| `apps/api/src/users/users.controller.ts` | `apps/api/src/auth/jwt-auth.guard.ts` | `@UseGuards(JwtAuthGuard)` | VERIFIED | Both `@Get('me')` and `@Patch('me')` decorated with `@UseGuards(JwtAuthGuard)` |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `profile-form.tsx` | `profile` state | `fetch("/api/profile/me")` → `/api/profile/me` relay → `fetchWithAuth` → NestJS `GET /api/users/me` → `usersService.getMe` → `prisma.user.findUnique` | Yes — DB query | FLOWING |
| `cefr-badge.tsx` | `level` prop | Passed from `profile-form.tsx:269` as `profile?.cefrLevel ?? session.user.cefrLevel ?? "B1"` | Yes — from profile API or session | FLOWING |
| `apps/api/src/users/users.service.ts` `getMe()` | DB result | `prisma.user.findUnique({ where: { id: userId }, select: PROFILE_SELECT })` | Yes — direct DB query | FLOWING |

---

### Behavioral Spot-Checks

Step 7b: SKIPPED — all entry points (NestJS API, Next.js dev server) require running Docker services (PostgreSQL, Redis, MinIO). Static code analysis above provides sufficient evidence for non-runtime truths.

---

### Probe Execution

No probe scripts (`scripts/*/tests/probe-*.sh`) were declared or found for this phase.

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| AUTH-01 | 02-03 | User can register with email and password | SATISFIED | `registerUser` server action; bcrypt hash; `auth-actions.test.ts` tests pass |
| AUTH-02 | 02-03 | User receives verification email and must verify before accessing content | SATISFIED | `signIn` callback gates on `emailVerified`; `/api/verify-email` route; verify-email page |
| AUTH-03 | 02-05 | User can sign in with Google OAuth | NEEDS HUMAN | Google provider configured; code path exists; runtime requires live credentials |
| AUTH-04 | 02-05 | User can request a password-reset link sent to email | NEEDS HUMAN | `createPasswordResetToken` + `resetPassword` implemented; runtime email delivery requires live Resend key |
| AUTH-05 | 02-01, 02-04 | User session persists across browser refresh (NextAuth JWT) | SATISFIED | `maxAge: 30 * 24 * 60 * 60`; JWT strategy in `auth.ts` |
| AUTH-06 | 02-04 | User redirected to login on protected routes while unauthenticated | SATISFIED (code) / NEEDS HUMAN (E2E) | `middleware.ts` correct; Playwright E2E test exists at `e2e/auth.spec.ts`; live run requires running server |
| PROF-01 | 02-06 | User has a profile storing name, email, avatar, CEFR level, XP, dates | SATISFIED | `GET /api/users/me` returns all required fields; `UserProfileDtoSchema` covers all fields |
| PROF-02 | 02-06 | User can update display name and avatar | SATISFIED | `PATCH /api/users/me`; presigned upload flow; `profile-form.tsx` edit flow wired |
| PROF-03 | 02-06 | User's CEFR level displayed throughout app via reusable badge | SATISFIED | `CefrBadge` component (B1/B2/C1 with correct labels + colors + accessibility); used in `profile-form.tsx` |

**Note:** `REQUIREMENTS.md` traceability table marks AUTH-03 and AUTH-06 as "Pending" while AUTH-01, AUTH-02, AUTH-04, AUTH-05, PROF-01, PROF-02, PROF-03 are marked "Complete". This matches verification findings — AUTH-03 awaits human OAuth confirmation and AUTH-06 code is correct but E2E confirmation is pending a running server.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `apps/web/src/app/(dashboard)/profile/profile-form.tsx` | ~68 | `getAuthHeaders` function constructs `Bearer ${session.user.userId}` (a UUID, not a JWT) — dead code (never called) | Warning (WR-05) | No live impact — relay routes bypass this function; misleading if copied |
| `apps/web/src/app/(dashboard)/profile/page.tsx` | 30-40 | `fetchProfile` function defined but never called — dead code (IN-03) | Info | No functional impact |
| `apps/web/src/app/api/resend-verification/route.ts` | ~53 | Dead ternary `result.maxReached ? 429 : 429` — both branches return same status (WR-03) | Warning | No security impact; clarification would improve API semantics |

No `TBD`, `FIXME`, or `XXX` debt markers found in any Phase 2 files.

**Review findings addressed (CR-01 through CR-08 all verified):**

| Review Item | Fix Applied | Verified In |
|-------------|------------|-------------|
| CR-01: Bearer token was JSON object not raw JWE | `api-client.ts` now extracts raw cookie value | `api-client.ts:31-43` |
| CR-02: Upsert WHERE clause always missed | `deleteMany + create` pattern replaces upsert | `auth-actions.ts:257` |
| CR-03: TOCTOU race in `verifyEmailToken` and `resetPassword` | Prisma `$transaction` with atomic delete | `auth-actions.ts:314-430` |
| CR-04: Non-atomic rate-limit check-then-set | Lua script atomic check + increment | `rate-limit.ts:45-98` |
| CR-05: No rate limit on password-reset endpoint | `checkPasswordResetRateLimit` applied before DB lookup | `auth-actions.ts:236` |
| CR-06: Unvalidated avatarKey path traversal | `startsWith(`avatars/${userId}/`)` check in `updateMe` | `users.service.ts:86-89` |
| CR-07: JWT role/cefrLevel never refreshed | Hourly DB refresh via `roleRefreshedAt` timestamp | `auth.ts:79-95` |
| CR-08: Token type identifier collision | `startsWith('password-reset:')` guard in both functions | `auth-actions.ts:329, 400` |

---

### Human Verification Required

#### 1. Google OAuth Sign-In Flow (AUTH-03)

**Test:** With `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` set in `.env.local`, click "Continue with Google" on `/login`, complete the Google consent screen, and confirm you land on `/dashboard`.
**Expected:** User lands on `/dashboard` with no separate registration step. In the database, `User.emailVerified` is non-null.
**Why human:** Requires a live Google OAuth application with valid credentials and a real Google account — cannot be exercised by static code analysis or grep.

#### 2. Google Account Linking (D-09)

**Test:** Register a password account with email X via `/register`. Then, on a different browser session or after sign-out, click "Continue with Google" on `/login` using a Google account with the same email X.
**Expected:** A single `User` row in the database with two `Account` rows (one with `provider = "credentials"`, one with `provider = "google"`).
**Why human:** Requires live Google OAuth credentials and DB inspection — cannot be verified statically.

#### 3. Password Reset Email Delivery (AUTH-04)

**Test:** Submit a registered email at `/reset-password`. Confirm the reset email arrives via Resend in your inbox. Click the link (goes to `/reset-password/confirm?token=...`). Enter and submit a new password. Sign in at `/login` with the new password.
**Expected:** Email delivered via Resend, new password accepted at login. Old password no longer works.
**Why human:** Requires a live `RESEND_API_KEY` and a real email inbox to verify delivery.

#### 4. Enumeration-Safe Password Reset Response (T-02-11)

**Test:** Submit an unregistered (random) email at `/reset-password`.
**Expected:** The success copy shown is identical to the registered-email case: "If that email is registered, a reset link is on its way. Check your inbox."
**Why human:** Requires a running Next.js server to exercise the server action response path and visually confirm copy.

#### 5. Route Protection E2E — Unauthenticated Redirect (AUTH-06)

**Test:** With `pnpm dev` running (both Next.js and NestJS), open a fresh browser (no session) and navigate to `http://localhost:3000/dashboard`.
**Expected:** Browser is redirected to `/login`. Similarly, navigating to `/profile` redirects to `/login`.
**Why human:** Playwright E2E test exists at `apps/web/e2e/auth.spec.ts` and is correctly written, but requires a running Next.js dev server at `localhost:3000` — cannot be executed in static verification.

---

### Gaps Summary

No gaps blocking phase goal achievement. All 9 requirements are either fully implemented in code (AUTH-01, AUTH-02, AUTH-04 code path, AUTH-05, AUTH-06 code path, PROF-01, PROF-02, PROF-03) or pending human verification with live external credentials (AUTH-03, AUTH-04 email delivery, AUTH-06 E2E).

The REQUIREMENTS.md traceability table already flags AUTH-03 and AUTH-06 as "Pending" — consistent with the code being complete but unconfirmed by live credential testing.

**Known stub documented by Plan 06:** The `getAuthHeaders` function in `profile-form.tsx` (WR-05) is dead code that constructs an incorrect Bearer token but is never called. This does not affect any live code path. All NestJS API calls go through relay routes that use `fetchWithAuth` with the correct raw JWE token.

---

_Verified: 2026-06-12T12:00:00Z_
_Verifier: Claude (gsd-verifier)_
