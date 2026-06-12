---
phase: 2
slug: authentication-user-profile
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-12
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.x |
| **Config file** | `apps/api/vitest.config.ts`, `apps/web/vitest.config.ts` |
| **Quick run command** | `pnpm --filter @repo/api test --run` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter @repo/api test --run`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 2-01-01 | 01 | 1 | AUTH-01 | — | Password hashed with bcrypt, never stored in plaintext | unit | `pnpm --filter @repo/api test --run src/auth` | ❌ W0 | ⬜ pending |
| 2-01-02 | 01 | 1 | AUTH-02 | — | Unverified user redirected to verify-email page | unit | `pnpm --filter @repo/api test --run src/auth` | ❌ W0 | ⬜ pending |
| 2-02-01 | 02 | 2 | AUTH-03 | — | Google OAuth user has emailVerified set on creation | unit | `pnpm --filter @repo/api test --run src/auth` | ❌ W0 | ⬜ pending |
| 2-03-01 | 03 | 3 | AUTH-04 | — | Password reset token expires after 24h | unit | `pnpm --filter @repo/api test --run src/auth` | ❌ W0 | ⬜ pending |
| 2-04-01 | 04 | 3 | AUTH-05 | — | JWT session maxAge is 30 days | unit | `pnpm --filter @repo/api test --run src/auth` | ❌ W0 | ⬜ pending |
| 2-05-01 | 05 | 4 | AUTH-06 | — | Unauthenticated requests to protected routes return 401 | unit | `pnpm --filter @repo/api test --run src/auth` | ❌ W0 | ⬜ pending |
| 2-06-01 | 06 | 4 | PROF-01,PROF-02 | — | GET /api/users/me returns user profile fields | integration | `pnpm --filter @repo/api test --run src/users` | ❌ W0 | ⬜ pending |
| 2-07-01 | 07 | 4 | PROF-02 | — | Avatar upload constraints enforced (2MB, JPEG/PNG/WebP) | unit | `pnpm --filter @repo/api test --run src/profile` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/api/src/auth/auth.service.spec.ts` — stubs for AUTH-01, AUTH-02, AUTH-04
- [ ] `apps/api/src/auth/jwt.guard.spec.ts` — stubs for AUTH-05, AUTH-06
- [ ] `apps/api/src/users/users.service.spec.ts` — stubs for PROF-01, PROF-02
- [ ] `apps/api/src/profile/profile.service.spec.ts` — stubs for PROF-02 (avatar upload)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Google OAuth flow end-to-end | AUTH-03 | Requires browser + Google OAuth consent screen | Sign in with Google, verify dashboard redirect, check DB for emailVerified |
| Email verification link delivery | AUTH-02 | Requires Resend API key and real email | Register, check inbox, click link, verify access |
| Password reset email delivery | AUTH-04 | Requires Resend API key and real email | Request reset, check inbox, click link, set new password |
| CEFR level badge display on profile | PROF-03 | UI-level check | View profile page, verify B1/B2/C1 badge renders correctly |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
