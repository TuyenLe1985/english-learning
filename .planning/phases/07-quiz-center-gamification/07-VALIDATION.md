---
phase: 7
slug: quiz-center-gamification
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-18
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.x |
| **Config file** | `vitest.config.ts` (per CLAUDE.md) |
| **Quick run command** | `pnpm --filter api test -- --run gamification.service` |
| **Full suite command** | `turbo test --filter=api` |
| **Estimated runtime** | ~30 seconds (quick), ~90 seconds (full) |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter api test -- --run gamification.service`
- **After every plan wave:** Run `turbo test --filter=api`
- **Before `/gsd:verify-work`:** Full suite must be green (`turbo test`)
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | QUIZ-01 | T-07-01 | userId from JWT only | unit | `vitest run apps/api/src/quiz/quiz.service.spec.ts` | ❌ W0 | ⬜ pending |
| 07-01-02 | 01 | 1 | QUIZ-02 | T-07-01 | userId from JWT only | unit | `vitest run apps/api/src/quiz/quiz.service.spec.ts` | ❌ W0 | ⬜ pending |
| 07-01-03 | 01 | 1 | QUIZ-03 | T-07-01 | userId from JWT only | integration | `vitest run apps/api/src/quiz/quiz.service.spec.ts` | ❌ W0 | ⬜ pending |
| 07-01-04 | 01 | 1 | QUIZ-04 | T-07-01 | userId from JWT only | integration | `vitest run apps/api/src/quiz/quiz.service.spec.ts` | ❌ W0 | ⬜ pending |
| 07-01-05 | 01 | 1 | QUIZ-05 | T-07-01 | userId from JWT only | unit | `vitest run apps/api/src/quiz/quiz.service.spec.ts` | ❌ W0 | ⬜ pending |
| 07-02-01 | 02 | 1 | GAME-01 | T-07-02 | XP manipulation not possible via request body | unit | `vitest run apps/api/src/gamification/gamification.service.spec.ts` | ❌ W0 | ⬜ pending |
| 07-02-02 | 02 | 1 | GAME-02 | T-07-02 | Atomic transaction; no partial XP | unit | `vitest run apps/api/src/gamification/gamification.service.spec.ts` | ❌ W0 | ⬜ pending |
| 07-02-03 | 02 | 1 | GAME-03 | T-07-02 | Achievement idempotent; no double-award | unit | `vitest run apps/api/src/gamification/gamification.service.spec.ts` | ❌ W0 | ⬜ pending |
| 07-02-04 | 02 | 2 | GAME-04 | T-07-02 | userId from JWT only | integration | `vitest run apps/api/src/profile/` | ❌ W0 | ⬜ pending |
| 07-02-05 | 02 | 1 | GAME-05 | T-07-02 | One XpEvent per call (no duplicates) | unit | `vitest run apps/api/src/gamification/gamification.service.spec.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/api/src/quiz/quiz.service.spec.ts` — stubs for QUIZ-01 through QUIZ-05
- [ ] `apps/api/src/gamification/gamification.service.spec.ts` — stubs for GAME-01 through GAME-05
- [ ] `packages/shared/src/quiz.dto.ts` — Zod schemas for quiz DTOs (referenced by spec files)

*No framework install needed — Vitest already configured.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| XP toast appears after quiz completion | GAME-01 | UI animation, no API assertion | Complete a quiz session in browser; verify `+{N} XP` toast appears bottom-right |
| Level-up modal appears at level boundary | GAME-02 | UI state transition | Earn enough XP to cross a level boundary; verify modal with `Level {N}!` headline appears |
| Achievement badge renders on profile | GAME-04 | UI rendering | Trigger first-lesson milestone; navigate to profile; verify badge with earned date |
| Mistake review shows explanation text | QUIZ-04 | UI rendering | Complete quiz with ≥1 incorrect; navigate to mistake review; verify explanation text visible |
