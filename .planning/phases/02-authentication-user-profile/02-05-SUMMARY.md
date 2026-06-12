---
phase: 02-authentication-user-profile
plan: 05
subsystem: auth
status: checkpoint-pending
tags: [auth, password-reset, oauth, tdd, security]
dependency_graph:
  requires: ["02-03", "02-04"]
  provides: ["createPasswordResetToken", "resetPassword", "reset-password-pages"]
  affects: ["02-06"]
tech_stack:
  added: []
  patterns:
    - "VerificationToken reuse for password-reset tokens (identifier: password-reset:{userId})"
    - "Enumeration-safe response for password reset requests (T-02-11)"
    - "Single-use token delete on reset success (T-02-12)"
    - "24h token expiry with expired:true signal for UI (D-03)"
key_files:
  created:
    - apps/web/src/app/(auth)/reset-password/page.tsx
    - apps/web/src/app/(auth)/reset-password/confirm/page.tsx
    - apps/web/src/app/api/reset-password/route.ts
  modified:
    - apps/web/src/lib/auth-actions.ts
    - apps/web/src/lib/auth-actions.test.ts
    - apps/web/src/lib/email-templates.tsx
decisions:
  - "Upsert pattern used for reset tokens so re-requests replace stale tokens atomically"
  - "Resend email send errors logged server-side only; caller always sees success (T-02-11)"
  - "REFACTOR skipped — token-expiry check is one-liner; extraction adds abstraction without clarity benefit"
  - "POST /api/reset-password returns 410 Gone for expired tokens (semantic HTTP status)"
metrics:
  duration: "~20m"
  completed: "2026-06-12"
  tasks_completed: 3
  tasks_total: 4
  files_changed: 6
---

# Phase 02 Plan 05: Google OAuth Verification + Password Reset Summary

**One-liner:** Password reset flow with enumeration-safe response, 24h single-use tokens, and reset-password request/confirm pages using existing VerificationToken table.

## What Was Built

### TDD RED (test commit)
Wrote 10 failing tests covering `createPasswordResetToken` and `resetPassword` behaviors:
- Enumeration-safe response for non-existent emails (T-02-11)
- Token upsert with `password-reset:{userId}` identifier pattern
- 24h expiry on reset tokens (D-03)
- Cryptographically random hex token generation
- Resend email called after token creation
- Password length validation
- Unknown token rejection
- Expired token with `expired: true` signal (D-03, T-02-12)
- bcrypt hash on password update
- Single-use token deletion (T-02-12)

### TDD GREEN (feat commit)

**`apps/web/src/lib/auth-actions.ts`** — Added two new server actions:
- `createPasswordResetToken(email)`: looks up user, generates 32-byte hex token, upserts `VerificationToken` with `identifier = "password-reset:{userId}"` and 24h expiry, sends reset email via Resend. Returns the same `{ success: true }` shape for existing and non-existing emails (T-02-11 no enumeration).
- `resetPassword(token, newPassword)`: validates password length, finds token, checks expiry (returns `expired: true` signal for expired tokens), extracts `userId` from identifier, bcrypt-hashes the new password (12 rounds), updates `User.passwordHash`, and deletes the token (single-use, T-02-12).

**`apps/web/src/lib/email-templates.tsx`** — Added `passwordResetEmailHtml` and `passwordResetEmailText` templates.

**`apps/web/src/app/(auth)/reset-password/page.tsx`** — Email-only form that shows the enumeration-safe success copy "If that email is registered, a reset link is on its way." regardless of whether the email is registered.

**`apps/web/src/app/(auth)/reset-password/confirm/page.tsx`** — New + confirm password form with:
- Expired-token destructive alert with "Request new reset link" link
- Success state: "Your password has been updated. Sign in with your new password." + "Go to sign in" button
- Missing-token guard redirects to /reset-password

**`apps/web/src/app/api/reset-password/route.ts`** — `POST /api/reset-password` route: validates token+password, delegates to `resetPassword` action, returns 410 Gone for expired tokens.

## Automated Verification Results

- `pnpm --filter @repo/web exec vitest run`: 38/38 tests PASS (3 test files)
- `pnpm --filter @repo/web exec tsc --noEmit`: CLEAN (no errors)

## TDD Gate Compliance

| Gate | Commit | Status |
|------|--------|--------|
| RED | `7c31119` — `test(02-05): failing tests for OAuth verify + password reset` | PASS |
| GREEN | `2ce7127` — `feat(02-05): google oauth verification + password reset flow` | PASS |
| REFACTOR | N/A — skipped (no meaningful cleanup identified) | N/A |

## Checkpoint Status

This plan has a `checkpoint:human-verify` task that requires external credential verification.

The automated implementation is complete. Human verification of the following is pending:

1. **Google OAuth (AUTH-03, D-10):** Click "Continue with Google" on /login, confirm dashboard landing, confirm `emailVerified` is non-null in DB.
2. **Account linking (D-09):** Register password account with email X, then Google sign-in with same email X. Confirm 1 User row + 2 Account rows.
3. **Password reset (AUTH-04):** Submit registered email at /reset-password, confirm Resend email delivery, click link to /reset-password/confirm, set new password, sign in with it.
4. **Enumeration safety (T-02-11):** Submit unregistered email at /reset-password, confirm identical response copy.

## Deviations from Plan

None — plan executed exactly as written. REFACTOR step skipped (the plan marks it as optional "if needed").

## Known Stubs

None — all server actions are fully implemented against real Prisma + Resend.

## Threat Flags

No new security-relevant surface beyond what is documented in the plan's threat model.

## Self-Check

- [x] `apps/web/src/lib/auth-actions.ts` — modified, exports `createPasswordResetToken` and `resetPassword`
- [x] `apps/web/src/app/(auth)/reset-password/page.tsx` — created, 149 lines
- [x] `apps/web/src/app/(auth)/reset-password/confirm/page.tsx` — created, 283 lines
- [x] `apps/web/src/app/api/reset-password/route.ts` — created, 43 lines
- [x] Commits: `7c31119` (RED), `2ce7127` (GREEN) — both present in git log
- [x] 38 tests pass, TypeScript clean
