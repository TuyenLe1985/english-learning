---
phase: "07-quiz-center-gamification"
plan: "01"
subsystem: "gamification-foundation"
tags: [quiz, gamification, dtos, constants, tdd-red]
dependency_graph:
  requires: []
  provides:
    - packages/shared/src/quiz.dto.ts (QuizStartSchema, QuizCompleteSchema, QuizAnswerItemSchema, all response interfaces)
    - apps/api/src/gamification/gamification.constants.ts (XP_RATES, CEFR_MULTIPLIERS, calculateXp, levelForXp, ACHIEVEMENT_DEFINITIONS)
    - apps/api/src/gamification/gamification.module.ts (GamificationModule exporting GamificationService)
    - apps/api/src/gamification/gamification.service.ts (stub for 07-02 GREEN)
    - apps/api/src/quiz/quiz.service.ts (stub for 07-03 GREEN)
  affects:
    - All downstream Phase 7 plans that import from @repo/shared quiz DTOs
    - Plans 07-02 (GamificationService GREEN) and 07-03 (QuizService GREEN)
tech_stack:
  added: []
  patterns:
    - Zod schema + z.infer type export (mirrors listening.dto.ts pattern)
    - NestJS @Injectable() stub with throw 'not implemented' for TDD RED gate
    - Direct instantiation spec pattern (no NestJS DI, mirrors listening.service.spec.ts)
    - Pure function exports from constants module (calculateXp, levelForXp)
key_files:
  created:
    - packages/shared/src/quiz.dto.ts
    - apps/api/src/gamification/gamification.constants.ts
    - apps/api/src/gamification/gamification.module.ts
    - apps/api/src/gamification/gamification.service.ts
    - apps/api/src/gamification/gamification.service.spec.ts
    - apps/api/src/quiz/quiz.service.ts
    - apps/api/src/quiz/quiz.service.spec.ts
  modified:
    - packages/shared/src/index.ts (added export * from "./quiz.dto")
decisions:
  - "Constants (XP_RATES, CEFR_MULTIPLIERS, levelForXp) exported from gamification.constants.ts so tests assert against the source of truth, not hardcoded magic numbers"
  - "Quiz service stub created in 07-01 (not deferred to 07-03) so quiz.service.spec.ts compiles and runs in RED state"
  - "Node_modules symlinked from main project into worktree apps/api for vitest to resolve @nestjs/* packages"
metrics:
  duration: "7 minutes"
  completed_date: "2026-06-19"
  tasks: 3
  files: 8
---

# Phase 7 Plan 1: Quiz Center + Gamification Foundation Summary

**One-liner:** Zod quiz DTOs, typed gamification constants (8 achievements, XP rates, CEFR multipliers, level formula), GamificationModule skeleton, and RED test scaffolds for GamificationService and QuizService.

## What Was Built

### Task 1: Shared Quiz DTOs and Barrel Export
Created `packages/shared/src/quiz.dto.ts` exporting:
- `QuizStartSchema` / `QuizStartDto` — accepts quiz type enum (MIXED or 5 topic strings)
- `QuizAnswerItemSchema` / `QuizAnswerItemDto` — per-answer payload with questionRef, skillArea, isCorrect
- `QuizCompleteSchema` / `QuizCompleteDto` — timeTakenSec + answers array (1-10 items)
- Plain TS interfaces: `QuizQuestionDto`, `QuizStartResponseDto`, `AchievementDto`, `QuizCompleteResponseDto`, `QuizMistakesDto`

Added `export * from "./quiz.dto";` to `packages/shared/src/index.ts` after listening DTOs.

Build verification: `pnpm --filter @repo/shared build` exits 0.

### Task 2: Gamification Constants, Module, and Service Stub
Created `apps/api/src/gamification/gamification.constants.ts` with:
- `XP_RATES = { QUIZ_CORRECT: 5, QUIZ_SESSION_BONUS: 10, LESSON_COMPLETE: 20, SRS_REVIEW: 3 }`
- `CEFR_MULTIPLIERS = { B1: 1.0, B2: 1.5, C1: 2.0 }`
- `calculateXp(baseRate, cefrLevel)` — `Math.round(baseRate * multiplier)`, defaults to 1.0 for unknown levels
- `levelForXp(xpTotal)` — `Math.min(100, Math.floor(xpTotal / 100) + 1)` (D-09 formula)
- `ACHIEVEMENT_DEFINITIONS` — all 8 entries: first-lesson, vocab-100, vocab-500, grammar-master, reading-complete, listening-complete, streak-7, streak-30

Created `apps/api/src/gamification/gamification.service.ts` — `@Injectable()` stub with `awardXp`, `checkAchievements`, `seedAchievements` throwing `'not implemented'`.

Created `apps/api/src/gamification/gamification.module.ts` — `@Module({ providers: [GamificationService], exports: [GamificationService] })`.

### Task 3: RED Test Scaffolds (TDD Gate)
Created `apps/api/src/gamification/gamification.service.spec.ts` with 17 tests:
- Constant verification tests (pass — testing pure functions directly)
- `calculateXp()` CEFR multiplier tests (B1=5, B2=8, C1=10)
- `levelForXp()` formula tests (0→1, 100→2, 9900→100, 99999→100)
- `awardXp()` transaction test (RED — throws 'not implemented')
- `awardXp()` level-up boundary test (RED)
- `checkAchievements()` first-lesson award test (RED)
- `checkAchievements()` idempotency test (RED)

Created `apps/api/src/quiz/quiz.service.spec.ts` with 8 tests (all RED):
- `startSession('MIXED')` returns 10 questions 3+3+2+2 split
- Each question has `questionRef` in `'{type}:{id}'` format
- `startSession('technology')` filters by topic
- `completeSession` recomputes accuracy server-side
- `completeSession` calls `gamification.awardXp` and `gamification.checkAchievements`
- `completeSession` throws `BadRequestException` on already-completed session
- `completeSession` throws `NotFoundException` on IDOR null guard
- `getMistakes` returns incorrect answers with prompt + explanation

Created `apps/api/src/quiz/quiz.service.ts` — stub so spec compiles.

**RED state verified:** Both spec files run showing 12 failing tests (service method tests) and 13 passing (pure constant/function tests). Services throw "not implemented".

## TDD Gate Compliance

| Gate | Status |
|------|--------|
| RED (test/ commits exist before implementation) | PASSED — test commit `22482df` precedes any GREEN |
| GREEN | Deferred to 07-02 (GamificationService) and 07-03 (QuizService) |
| REFACTOR | N/A (no implementation yet) |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Node_modules symlink for worktree test execution**
- **Found during:** Task 3 verification
- **Issue:** Worktree's `apps/api/node_modules` was empty; vitest from worktree couldn't resolve `@nestjs/common`
- **Fix:** Symlinked `apps/api/node_modules → /home/tuyen/Desktop/Apps/english-learning/apps/api/node_modules` to make pnpm workspace packages accessible from worktree context
- **Files modified:** (symlink only — no source files changed)
- **Commit:** No separate commit (infrastructure fix, not code)

### Plan Followed Exactly Otherwise

- Quiz DTOs exactly match PATTERNS.md §quiz.dto.ts section
- ACHIEVEMENT_DEFINITIONS match PATTERNS.md lines 403-411 exactly
- XP_RATES match D-10 locked decisions
- levelForXp formula matches D-09 exactly
- GamificationModule pattern matches PATTERNS.md §gamification.module.ts
- Spec patterns mirror listening.service.spec.ts (direct instantiation, no NestJS DI)

## Known Stubs

| Stub | File | Line | Reason |
|------|------|------|--------|
| `awardXp` throws 'not implemented' | gamification.service.ts | 29 | Intentional TDD RED — GREEN in 07-02 |
| `checkAchievements` throws 'not implemented' | gamification.service.ts | 36 | Intentional TDD RED — GREEN in 07-02 |
| `seedAchievements` throws 'not implemented' | gamification.service.ts | 41 | Intentional TDD RED — GREEN in 07-02 |
| `startSession` throws 'not implemented' | quiz.service.ts | 30 | Intentional TDD RED — GREEN in 07-03 |
| `completeSession` throws 'not implemented' | quiz.service.ts | 38 | Intentional TDD RED — GREEN in 07-03 |
| `getMistakes` throws 'not implemented' | quiz.service.ts | 45 | Intentional TDD RED — GREEN in 07-03 |

All stubs are intentional TDD scaffolds. They do not prevent this plan's goal (establishing contracts and RED tests). Future plans (07-02, 07-03) resolve them.

## Threat Flags

None. This plan creates server-side contracts and tests only — no runtime endpoints or untrusted input handling introduced.

## Self-Check

### Files Created/Modified

- [x] `packages/shared/src/quiz.dto.ts` — FOUND
- [x] `packages/shared/src/index.ts` — MODIFIED (barrel export added)
- [x] `apps/api/src/gamification/gamification.constants.ts` — FOUND
- [x] `apps/api/src/gamification/gamification.module.ts` — FOUND
- [x] `apps/api/src/gamification/gamification.service.ts` — FOUND
- [x] `apps/api/src/gamification/gamification.service.spec.ts` — FOUND
- [x] `apps/api/src/quiz/quiz.service.ts` — FOUND
- [x] `apps/api/src/quiz/quiz.service.spec.ts` — FOUND

### Commits Verified

- [x] `c1392d0` — feat(07-01): add shared quiz DTOs and barrel export
- [x] `829fc1f` — feat(07-01): create gamification constants, module skeleton, and service stub
- [x] `22482df` — test(07-01): add RED test scaffolds for GamificationService and QuizService

### Build Verification

- [x] `pnpm --filter @repo/shared build` exits 0
- [x] Both spec files run and report failing tests (RED state confirmed)
- [x] gamification.constants.ts contains all 8 achievement slugs
- [x] gamification.module.ts contains `exports: [GamificationService]`
- [x] packages/shared/src/index.ts contains `export * from "./quiz.dto"`

## Self-Check: PASSED
