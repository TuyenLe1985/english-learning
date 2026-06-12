---
phase: "02-authentication-user-profile"
plan: "03"
subsystem: "auth"
tags: ["auth", "registration", "email-verification", "rate-limiting", "bcrypt", "resend", "redis"]
dependency_graph:
  requires: ["02-01", "02-02"]
  provides: ["registerUser server action", "sendVerificationEmail", "verifyEmailToken", "checkResendRateLimit", "register page", "verify-email page", "GET /api/verify-email", "POST /api/resend-verification"]
  affects: ["02-04", "02-05", "02-06"]
tech_stack:
  added: ["resend@6.12.4", "ioredis@5.11.1"]
  patterns: ["server action", "TDD RED/GREEN/REFACTOR", "bcrypt 12 rounds", "crypto.randomBytes hex token", "Redis INCR+EXPIRE rate-limit", "Resend SDK error check pattern"]
key_files:
  created:
    - apps/web/src/lib/auth-actions.ts
    - apps/web/src/lib/auth-actions.test.ts
    - apps/web/src/lib/email-templates.tsx
    - apps/web/src/lib/rate-limit.ts
    - apps/web/src/app/(auth)/register/page.tsx
    - apps/web/src/app/(auth)/verify-email/page.tsx
    - apps/web/src/app/api/verify-email/route.ts
    - apps/web/src/app/api/resend-verification/route.ts
  modified:
    - apps/api/src/auth/auth.service.spec.ts
    - apps/web/package.json
    - pnpm-lock.yaml
decisions:
  - "Email template extracted into email-templates.tsx module; auth-actions.ts imports from it (no duplication)"
  - "resendVerificationEmail accepts userId+email (not just email) so Redis rate-limit keys are userId-scoped per D-02"
  - "POST /api/resend-verification added as client-facing route because the verify-email page is a Client Component and cannot call server actions that lookup users directly"
  - "verifyEmailToken uses prisma.verificationToken.findFirst (not findUnique) because the search is by token field which is @unique but using findFirst is clearer semantically"
metrics:
  duration: "8 minutes"
  completed_date: "2026-06-12"
  tasks_completed: 3
  files_created: 8
  files_modified: 3
  tests_added: 20
---

# Phase 02 Plan 03: Email/Password Registration + Verification Gate Summary

Complete email/password registration vertical slice with bcrypt-hashed user creation, Resend-delivered verification email, Redis rate-limited resend, and 24h token validation endpoint — satisfying AUTH-01 and AUTH-02.

## What Was Built

### Server Actions (`apps/web/src/lib/auth-actions.ts`)

- **`registerUser({name, email, password})`** — validates password length (≥8), checks for duplicate email, hashes with bcrypt 12 rounds, creates `User` with `emailVerified=null`. Returns `{ success, userId }` or `{ success: false, error }`.
- **`createVerificationToken(userId, email)`** — generates `crypto.randomBytes(32).toString('hex')` token, stores in `VerificationToken` with `expires = now + 24h`.
- **`sendVerificationEmail(email, token)`** — builds the verify URL, calls Resend SDK, checks `{ error }` destructure (Pitfall 6).
- **`resendVerificationEmail(userId, email)`** — rate-limit gated wrapper; propagates `retryAfter` and `maxReached` to callers.
- **`checkResendRateLimit(userId)`** — Redis `TTL` on cooldown key (60s) + `GET` on hourly key (max 3) + `INCR+EXPIRE` on both keys when allowed.
- **`verifyEmailToken(token)`** — finds `VerificationToken` record, checks expiry, sets `User.emailVerified = new Date()`, deletes token on use (T-02-05).

### Email Templates (`apps/web/src/lib/email-templates.tsx`)

- `verificationEmailHtml({ verifyUrl })` — responsive HTML email template with button + plaintext fallback link.
- `verificationEmailText({ verifyUrl })` — plaintext version for better email client compatibility.

### Rate Limit Module (`apps/web/src/lib/rate-limit.ts`)

- `checkEmailResendRateLimit(userId)` — standalone Redis rate-limit function (exported separately for reuse).
- Key patterns: `email-resend:rate:{userId}` (60s cooldown), `email-resend:hourly:{userId}` (3600s window, max 3).

### API Routes

- **`GET /api/verify-email?token=`** — validates token, sets `emailVerified`, redirects to `/login?verified=1` on success; redirects to `/verify-email?error=expired` or `?error=invalid` on failure.
- **`POST /api/resend-verification`** — looks up user by email, calls `resendVerificationEmail`, returns JSON with `{ success, retryAfter, maxReached }`.

### Pages

- **`/register`** (`apps/web/src/app/(auth)/register/page.tsx`) — Client Component with name/email/password/confirm-password fields, inline validation, bcrypt-safe submission via `registerUser` server action, Google OAuth button via `signIn('google')`, redirects to `/verify-email` on success per AUTH-02.
- **`/verify-email`** (`apps/web/src/app/(auth)/verify-email/page.tsx`) — Client Component showing check-inbox copy, resend button with 60s countdown (`"Resend again in {N}s"`), max-reached state, query param handling for `?error=expired|invalid`.

## TDD Gate Compliance

| Gate | Commit | Status |
|------|--------|--------|
| RED | `3505dba` - `test(02-03): failing tests for registration + verify gate` | PASSED |
| GREEN | `f8759c7` - `feat(02-03): email/password registration + verification gate` | PASSED |
| REFACTOR | `282112d` - `refactor(02-03): extract email template to email-templates module` | PASSED |

All 20 tests pass GREEN. No tests failed unexpectedly during RED phase.

## Commits

| Hash | Type | Description |
|------|------|-------------|
| `3505dba` | test | Failing tests for registration + verify gate (RED) |
| `f8759c7` | feat | Email/password registration + verification gate (GREEN) |
| `282112d` | refactor | Extract email template to email-templates module |

## Verification Results

- `pnpm --filter @repo/web exec vitest run` — 20/20 tests GREEN
- `pnpm --filter @repo/web exec tsc --noEmit` — 0 errors

## Security Controls Implemented

| Threat ID | Control | Where |
|-----------|---------|-------|
| T-02-04 | bcrypt 12 rounds; `passwordHash !== plaintext` (verified in tests) | `auth-actions.ts registerUser()` |
| T-02-05 | 24h expiry; token deleted on use; unknown tokens rejected | `auth-actions.ts verifyEmailToken()` |
| T-02-06 | Redis INCR+EXPIRE; 1/60s cooldown + 3/hour max; survives restarts | `auth-actions.ts checkResendRateLimit()` |
| T-02-07 | `signIn` callback in `auth.ts` gates on `emailVerified` (Plan 01) | `apps/web/src/auth.ts` (pre-existing) |

## Deviations from Plan

### Auto-added (Rule 2 — Missing Critical Functionality)

**1. [Rule 2 - Critical] Added POST /api/resend-verification route**
- **Found during:** GREEN implementation
- **Issue:** The `verify-email` page is a `'use client'` Client Component. Calling `resendVerificationEmail` directly from a Client Component would expose the server action import chain including Prisma + Redis. A Next.js API route provides a clean client boundary.
- **Fix:** Added `POST /api/resend-verification` route that accepts `{ email }`, looks up the user, and calls `resendVerificationEmail(userId, email)`.
- **Files modified:** `apps/web/src/app/api/resend-verification/route.ts` (new)

### REFACTOR (plan-driven)

**1. [REFACTOR] Extract email template to separate module**
- **Found during:** REFACTOR pass
- **Issue:** `buildVerificationEmailHtml()` was duplicated inline inside `auth-actions.ts` when `email-templates.tsx` already provides the canonical template.
- **Fix:** Import `verificationEmailHtml` / `verificationEmailText` from `email-templates.tsx`. Added `text` body to Resend call for better email client compatibility.
- **Files modified:** `apps/web/src/lib/auth-actions.ts`

## Known Stubs

None. All functions are wired to real dependencies (Prisma, Redis, Resend). The register and verify-email pages use real server actions. No hardcoded placeholder data flows to UI.

## Threat Flags

None. All files created in this plan operate within the trust boundaries documented in the plan's `<threat_model>`. No new network endpoints were added beyond the two documented in the plan (`GET /api/verify-email`, `POST /api/resend-verification` added as deviation).

## Self-Check: PASSED

- All 8 required files exist on disk
- All 3 commits exist in git log (`3505dba`, `f8759c7`, `282112d`)
- 20/20 tests pass
- TypeScript: 0 errors
