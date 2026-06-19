---
phase: "07-quiz-center-gamification"
plan: "04"
subsystem: "gamification-module-wiring"
tags: [gamification, xp, achievements, tdd-green, module-wiring, cross-cutting]
dependency_graph:
  requires:
    - apps/api/src/gamification/gamification.service.ts (awardXp, checkAchievements — from 07-02)
    - apps/api/src/gamification/gamification.constants.ts (XP_RATES, calculateXp — from 07-01)
    - apps/api/src/gamification/gamification.module.ts (GamificationModule — from 07-01)
  provides:
    - apps/api/src/grammar/grammar.service.ts (completeSession wired to gamification.awardXp + checkAchievements)
    - apps/api/src/reading/reading.service.ts (completeSession wired to gamification.awardXp + checkAchievements)
    - apps/api/src/listening/listening.service.ts (broken xpEvent.create replaced with gamification.awardXp)
    - apps/api/src/srs/srs.service.ts (submitReview awards 3 flat XP on Good/Easy via gamification)
    - apps/api/src/grammar/grammar.module.ts (imports GamificationModule)
    - apps/api/src/reading/reading.module.ts (imports GamificationModule)
    - apps/api/src/listening/listening.module.ts (imports GamificationModule)
    - apps/api/src/srs/srs.module.ts (imports GamificationModule)
    - apps/api/src/vocabulary/vocabulary.module.ts (imports GamificationModule)
  affects:
    - GAME-01: CEFR-weighted XP now active across grammar/reading/listening/srs
    - GAME-02: User.xpTotal now increments for ALL learning activities (not just quiz)
    - GAME-03/04: listening-complete, reading-complete, grammar-master achievements can now trigger
    - GAME-05: every module award produces XpEvent audit record via GamificationService.$transaction
tech_stack:
  added: []
  patterns:
    - "GamificationService constructor injection — same pattern as PrismaService injection"
    - "User.cefrLevel DB lookup for CEFR-weighted XP (T-07-10 threat mitigation)"
    - "calculateXp(XP_RATES.LESSON_COMPLETE, user.cefrLevel) for CEFR-weighted lesson XP"
    - "XP_RATES.SRS_REVIEW flat 3 on Good/Easy — no CEFR multiplier (D-10)"
    - "gamification.checkAchievements() called inline after awardXp (D-12 synchronous)"
    - "Module GamificationModule import pattern — mirrors AuthModule import pattern"
key_files:
  modified:
    - apps/api/src/grammar/grammar.service.ts (added GamificationService injection + awardXp + checkAchievements in completeSession)
    - apps/api/src/grammar/grammar.module.ts (added GamificationModule import)
    - apps/api/src/reading/reading.service.ts (added GamificationService injection + awardXp + checkAchievements in completeSession)
    - apps/api/src/reading/reading.module.ts (added GamificationModule import)
    - apps/api/src/listening/listening.service.ts (replaced direct prisma.xpEvent.create with gamification.awardXp + checkAchievements)
    - apps/api/src/listening/listening.module.ts (added GamificationModule import)
    - apps/api/src/srs/srs.service.ts (added GamificationService injection, awards 3 flat XP on Good/Easy in submitReview)
    - apps/api/src/srs/srs.module.ts (added GamificationModule import)
    - apps/api/src/vocabulary/vocabulary.module.ts (added GamificationModule import)
    - apps/api/src/grammar/grammar.service.spec.ts (added GamificationService mock, 3 new gamification assertions)
    - apps/api/src/reading/reading.service.spec.ts (added GamificationService mock, 2 new gamification assertions)
    - apps/api/src/listening/listening.service.spec.ts (replaced xpEvent.create assertion with gamification.awardXp assertions)
    - apps/api/src/srs/srs.service.spec.ts (added GamificationService mock, 4 new XP assertions including Good/Easy/Again/Hard)
decisions:
  - "listening.service.ts direct prisma.xpEvent.create removed — was broken (never incremented User.xpTotal, Pitfall 2)"
  - "cefrLevel resolved from User DB lookup in each service (T-07-10: never from request body)"
  - "SRS review XP is flat 3 with no cefrLevel lookup — D-10 decision; word difficulty captured in FSRS ease factor"
  - "ts-fsrs mock extended to include Hard(2) and Easy(4) entries alongside existing Good(3)/Again(1)"
  - "vocabulary.module.ts imports GamificationModule even though VocabularyService itself doesn't inject it — required by D-14 for future completeness"
metrics:
  duration: "15 minutes"
  completed_date: "2026-06-19"
  tasks: 2
  files: 14
---

# Phase 7 Plan 4: Gamification Module Wiring Summary

**One-liner:** Cross-cutting gamification wiring — all five learning modules now route XP through GamificationService.awardXp, replacing listening's broken direct xpEvent.create, and adding XP to grammar/reading/listening lesson completion plus SRS Good/Easy reviews.

## What Was Built

### Task 1: Wire Grammar + Reading + Listening to GamificationService (TDD)

**RED phase:** Updated three spec files to mock GamificationService and assert that:
- `gamification.awardXp` is called with the correct userId, skillArea (GRAMMAR/READING/LISTENING), reason, and sourceRef
- `gamification.checkAchievements` is called with the correct event type
- For listening: the old `xpEvent.create` assertion replaced with `awardXp` assertion

9 new RED tests confirmed failing before implementation.

**GREEN phase:**

`grammar.service.ts` — Added GamificationService to constructor. In `completeSession`:
- Calls `this.prisma.user.findUniqueOrThrow({ where: { id: userId } })` to resolve cefrLevel (T-07-10)
- Computes `xpAmount = calculateXp(XP_RATES.LESSON_COMPLETE, user.cefrLevel ?? 'B1')`
- Calls `gamification.awardXp(userId, xpAmount, 'grammar_lesson', 'GRAMMAR', lessonId)`
- Calls `gamification.checkAchievements(userId, { type: 'LESSON_COMPLETE', metadata: { masteryPct, skillArea: 'GRAMMAR' } })`
- Returns additively: existing fields + `xpEarned`, `levelUp`, `newLevel`, `newAchievements`

`reading.service.ts` — Same pattern in `completeSession`:
- cefrLevel DB lookup, calculateXp, awardXp('reading_session', 'READING', passageId)
- checkAchievements('READING')

`listening.service.ts` — REPLACED the direct `prisma.xpEvent.create` block:
- Was: `prisma.xpEvent.create({ amount: Math.round(score * 10), ... })` — never incremented User.xpTotal
- Now: `gamification.awardXp(userId, xpAmount, 'listening_session', 'LISTENING', contentId)` — atomic $transaction
- checkAchievements('LISTENING') added inline

Module files (grammar, reading, listening) all updated to `imports: [AuthModule, GamificationModule]`.

**42 tests GREEN** (up from 36 baseline before new tests added).

### Task 2: Wire SRS Service to GamificationService (TDD)

**RED phase:** Updated `srs.service.spec.ts` to:
- Inject GamificationService mock as second constructor arg
- Add Rating.Hard(2) and Rating.Easy(4) entries to ts-fsrs mock (only Again/Good existed before)
- Assert `awardXp(userId, 3, 'srs_review', 'VOCABULARY', cardId)` called on Good and Easy
- Assert `awardXp` NOT called on Again and Hard

2 RED tests failing before implementation.

**GREEN phase:**

`srs.service.ts` — Added GamificationService to constructor. In `submitReview`:
- After `prisma.srsCard.update(...)` resolves:
- `if (rating === 'Good' || rating === 'Easy')` → `gamification.awardXp(userId, XP_RATES.SRS_REVIEW, 'srs_review', 'VOCABULARY', cardId)`
- `XP_RATES.SRS_REVIEW = 3` flat — no `calculateXp` / no CEFR multiplier (D-10)

`srs.module.ts` and `vocabulary.module.ts` — both updated to import GamificationModule.

**33 tests GREEN** (15 srs + 18 vocabulary, including 4 new gamification assertions).

## TDD Gate Compliance

| Gate | Status |
|------|--------|
| RED (task 1 — test commit exists before implementation) | PASSED — commit `3c4af33` precedes GREEN `e8393ed` |
| GREEN (task 1 — all 42 tests pass) | PASSED — grammar(17) + reading(14) + listening(11) = 42 |
| RED (task 2 — test commit exists before implementation) | PASSED — commit `e49e18a` precedes GREEN `36205ba` |
| GREEN (task 2 — all 33 tests pass) | PASSED — srs(15) + vocabulary(18) = 33 |
| REFACTOR | N/A — implementations are clean as written |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Worktree missing gamification src directory**
- **Found during:** Task 1 GREEN verification
- **Issue:** `Failed to load url ../gamification/gamification.constants` — the `src/gamification/` directory didn't exist in the worktree filesystem (files were added to main repo by waves 07-01/07-02 before this worktree was created)
- **Fix:** Symlinked `apps/api/src/gamification` and `apps/api/src/quiz` from main repo into worktree `src` directory
- **Files modified:** (symlinks only — no source files changed)
- **Commit:** No separate commit (infrastructure fix)

**2. [Rule 1 - Bug] ts-fsrs mock missing Hard and Easy rating entries**
- **Found during:** Task 2 RED test writing
- **Issue:** Original srs.service.spec.ts mock only had entries for Rating.Again(1) and Rating.Good(3). Tests for Rating.Easy and Rating.Hard would crash with `TypeError: Cannot read properties of undefined (reading 'card')` before reaching the assertion
- **Fix:** Added `2` (Hard) and `4` (Easy) entries to the `fsrs().repeat()` mock return value
- **Files modified:** `apps/api/src/srs/srs.service.spec.ts`
- **Commit:** e49e18a (included in RED test commit)

### Plan Followed Exactly Otherwise

- All five modules import GamificationModule exactly as plan required
- cefrLevel resolved from DB in grammar/reading/listening (T-07-10 mitigated)
- SRS XP uses XP_RATES.SRS_REVIEW flat (no calculateXp call, D-10 honored)
- listening.service.ts direct prisma.xpEvent.create removed (Pitfall 2 resolved)
- Return objects extended additively — no breaking changes to existing fields

## Verification

- `pnpm --filter api test -- --run grammar.service reading.service listening.service srs.service vocabulary.service` → **75/75 GREEN**
- `grep "await this.prisma.xpEvent" apps/api/src/listening/listening.service.ts` → **0 results** (clean)
- All 5 module files contain `GamificationModule` import
- All 5 service files contain `gamification.awardXp` call
- Grammar/reading/listening services contain `gamification.checkAchievements` call

## Known Stubs

None. All gamification wiring is fully implemented and tested.

## Threat Flags

None. All mitigations from the plan's threat model were applied:

| Threat | Mitigation Applied |
|--------|--------------------|
| T-07-10: Body-supplied CEFR level | Services resolve User.cefrLevel from DB via findUniqueOrThrow |
| T-07-11: XP to foreign user | userId always from req.user.userId (JWT); service params never from body |
| T-07-12: XP without audit trail | awardXp creates XpEvent + ActivityLog via $transaction (from GamificationService) |

## Self-Check

### Files Created/Modified

- [x] `apps/api/src/grammar/grammar.service.ts` — MODIFIED (gamification.awardXp + checkAchievements added)
- [x] `apps/api/src/grammar/grammar.module.ts` — MODIFIED (GamificationModule import added)
- [x] `apps/api/src/reading/reading.service.ts` — MODIFIED (gamification.awardXp + checkAchievements added)
- [x] `apps/api/src/reading/reading.module.ts` — MODIFIED (GamificationModule import added)
- [x] `apps/api/src/listening/listening.service.ts` — MODIFIED (direct xpEvent.create replaced)
- [x] `apps/api/src/listening/listening.module.ts` — MODIFIED (GamificationModule import added)
- [x] `apps/api/src/srs/srs.service.ts` — MODIFIED (gamification.awardXp on Good/Easy)
- [x] `apps/api/src/srs/srs.module.ts` — MODIFIED (GamificationModule import added)
- [x] `apps/api/src/vocabulary/vocabulary.module.ts` — MODIFIED (GamificationModule import added)
- [x] `apps/api/src/grammar/grammar.service.spec.ts` — MODIFIED (gamification mock + 3 assertions)
- [x] `apps/api/src/reading/reading.service.spec.ts` — MODIFIED (gamification mock + 2 assertions)
- [x] `apps/api/src/listening/listening.service.spec.ts` — MODIFIED (gamification mock replaces xpEvent mock)
- [x] `apps/api/src/srs/srs.service.spec.ts` — MODIFIED (gamification mock + 4 assertions, ts-fsrs mock extended)

### Commits Verified

- [x] `3c4af33` — test(07-04): add RED gamification wiring tests for grammar/reading/listening services
- [x] `e8393ed` — feat(07-04): wire grammar/reading/listening services to GamificationService
- [x] `e49e18a` — test(07-04): add RED gamification XP tests for SRS service
- [x] `36205ba` — feat(07-04): wire SRS service to GamificationService, update vocabulary/srs modules

### Acceptance Criteria Verified

- [x] grammar.service.ts contains `gamification.awardXp` and `gamification.checkAchievements`
- [x] reading.service.ts contains `gamification.awardXp` and `gamification.checkAchievements`
- [x] listening.service.ts contains `gamification.awardXp` and `gamification.checkAchievements`
- [x] listening.service.ts does NOT contain `await this.prisma.xpEvent` (grep count = 0)
- [x] srs.service.ts calls `gamification.awardXp` with `XP_RATES.SRS_REVIEW` on Good/Easy
- [x] grammar.module.ts imports `GamificationModule`
- [x] reading.module.ts imports `GamificationModule`
- [x] listening.module.ts imports `GamificationModule`
- [x] srs.module.ts imports `GamificationModule`
- [x] vocabulary.module.ts imports `GamificationModule`
- [x] srs.service.spec.ts asserts no XP award on Again/Hard
- [x] All 75 service spec tests GREEN

## Self-Check: PASSED
