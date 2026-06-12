---
status: partial
phase: 02-authentication-user-profile
source: [02-VERIFICATION.md]
started: 2026-06-12T00:00:00Z
updated: 2026-06-12T00:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Google OAuth sign-in (AUTH-03)
expected: Click "Continue with Google" on /login with live GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET configured → land on /dashboard → User.emailVerified is non-null in the database
result: [pending]

### 2. Google account linking (D-09)
expected: Register a password account with email X, then sign in with Google using the same email X → confirm 1 User row + 2 Account rows (credentials + google) in the database
result: [pending]

### 3. Password reset email delivery (AUTH-04)
expected: Submit a registered email at /reset-password → Resend delivers the email → click the reset link → set a new password → sign in with the new password successfully
result: [pending]

### 4. Enumeration-safe reset response (T-02-11)
expected: Submit an unregistered email at /reset-password → response copy is identical to the registered case ("If that email is registered, a reset link is on its way. Check your inbox.")
result: [pending]

### 5. Route protection E2E (AUTH-06)
expected: Open a fresh browser (no session), navigate to /dashboard → redirected to /login. Playwright test exists at apps/web/e2e/auth.spec.ts for automated coverage.
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
