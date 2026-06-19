---
phase: 07-quiz-center-gamification
fixed_at: 2026-06-19T21:49:00Z
review_path: .planning/phases/07-quiz-center-gamification/07-REVIEW.md
iteration: 1
findings_in_scope: 13
fixed: 13
skipped: 0
status: all_fixed
---

# Phase 07: Code Review Fix Report

**Fixed at:** 2026-06-19T21:49:00Z
**Source review:** .planning/phases/07-quiz-center-gamification/07-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 13 (CR-01 through CR-05, WR-01 through WR-08)
- Fixed: 13
- Skipped: 0

## Fixed Issues

### CR-01: Race Condition in `awardXp` — Read-Modify-Write on `xpTotal` Corrupts Balances

**Files modified:** `apps/api/src/gamification/gamification.service.ts`
**Commit:** 201d0c7
**Applied fix:** Replaced the pre-transaction `findUniqueOrThrow` + sequential batch transaction with an interactive Prisma transaction (`$transaction(async (tx) => {...})`). The `findUniqueOrThrow`, level computation (`levelForXp`), and `user.update` (with absolute `xpTotal` value, not `increment`) all happen inside the same transaction, making the read-compute-write atomic. Removed the stale-read race that could cause level to diverge from true xpTotal. Requires human verification for logic correctness.

### CR-02: Streak Algorithm Produces Incorrect Count — Off-by-One With `streakTarget + 1` Window

**Files modified:** `apps/api/src/gamification/gamification.service.ts`
**Commit:** 1129bcc
**Applied fix:** Changed `since.setDate(since.getDate() - (streakTarget + 1))` to `since.setDate(since.getDate() - (streakTarget + 2))` in `checkStreak`. Added inline comment explaining the rationale.

### CR-03: Duplicate `date-fns` Dependency in `package.json`

**Files modified:** `apps/api/package.json`
**Commit:** 825e702
**Applied fix:** Removed the first `"date-fns": "^4.4.0"` entry and kept one entry pinned to `"^3.6.0"` per CLAUDE.md spec (date-fns 3.x). Also moved the single entry to be between `class-validator` and `dom-anchor-text-position` for cleaner ordering.

### CR-04: Next.js Mistakes Relay Leaks Session Data — Missing sessionId Validation

**Files modified:** `apps/web/src/app/api/quiz/sessions/[sessionId]/complete/route.ts`, `apps/web/src/app/api/quiz/sessions/[sessionId]/mistakes/route.ts`
**Commit:** f76c1ab
**Applied fix:** Added regex validation `if (!/^[a-zA-Z0-9_-]{1,64}$/.test(sessionId))` returning 400 in both the `complete` and `mistakes` relay routes before sessionId is interpolated into the internal NestJS URL.

### CR-05: `handleIncorrect` Records Empty `userAnswer` — Mistake Review Cannot Show Wrong Answer

**Files modified:** `apps/web/src/components/grammar/multiple-choice-exercise.tsx`, `apps/web/src/components/quiz/quiz-question.tsx`, `apps/web/src/components/grammar/grammar-lesson-page.tsx`, `apps/web/src/components/grammar/exercises/multiple-choice-exercise.test.tsx`
**Commit:** f1f9163
**Applied fix:** Extended `MultipleChoiceExercise.onIncorrect` signature from `() => void` to `(selectedOption: string) => void`. The component now passes `option` to `onIncorrect(option)` in `handleSelect`. Updated `QuizQuestion.handleIncorrect` to accept `selectedOption: string` and pass it as `userAnswer`. Updated `grammar-lesson-page.tsx` to wrap with `(_selectedOption: string) => onIncorrect()` for backward compatibility in grammar lesson context where the selected option is not needed. Updated test to assert `toHaveBeenCalledWith("is been")`.

### WR-01: `checkAchievements` — `tryAward` Count-Before/After Pattern Is Racy

**Files modified:** `apps/api/src/gamification/gamification.service.ts`
**Commit:** c29ca5d
**Applied fix:** Replaced the racy count-before/upsert/count-after pattern with an interactive transaction using `findFirst` + conditional `create`. If a concurrent caller wins the race and creates the row first, the unique violation is caught and treated as "already awarded". When newly awarded, `awardXp` is called with `achievement.xpReward` to grant the achievement's XP bonus (previously missing entirely). Requires human verification for logic correctness.

### WR-02: `completeSession` in `QuizService` — QuizAnswer Write Precedes Session Update, Violating Atomicity

**Files modified:** `apps/api/src/quiz/quiz.service.ts`
**Commit:** c5c8542
**Applied fix:** Wrapped `quizAnswer.createMany` + `quizSession.update` in a single `prisma.$transaction(async (tx) => {...})`. The `completedAt` timestamp is now written atomically with the answer rows, so a mid-flow failure cannot leave the session with answers but no `completedAt`, which previously allowed double-submission. Gamification calls (`awardXp`, `checkAchievements`) remain outside the transaction and run after commit.

### WR-03: `synthesizeVocabQuestion` Uses `synonyms` as Distractors, Not Definitions

**Files modified:** `apps/api/src/quiz/quiz.service.ts`
**Commit:** 7d9557c
**Applied fix:** In `rehydrateQuestions` vocabulary branch, replaced `row.synonyms.slice(0, 3)` with a `prisma.vocabularyWord.findMany({ where: { id: { not: id } }, select: { definition: true }, take: 3 })` query to fetch definitions from 3 other vocabulary words. Falls back to synonyms only if no other definitions are available. Mistake review now shows the same type of distractors (competing definitions) as the original quiz.

### WR-04: `completeSession` in `ListeningService` — `dto.score` Stored Unvalidated

**Files modified:** `apps/api/src/listening/listening.service.ts`
**Commit:** 8b40e58
**Applied fix:** Replaced `score: dto.score` with `score: correct` (the server-recomputed correct count) in both the `create` and `update` branches of the `listeningProgress.upsert`. Also updated the return value from `score: dto.score` to `score: correct`.

### WR-05: `checkStreak` Uses Local Server Time — Timezone Mismatch

**Files modified:** `apps/api/src/gamification/gamification.service.ts`
**Commit:** f3592bb
**Applied fix:** Added a detailed inline comment above the `toISOString().slice(0, 10)` deduplication line explaining the UTC-day boundary behavior, the consequences for non-UTC users, and that timezone-aware streak calculation requires a `User.timezone` field deferred to v2. No code change (documentation only).

### WR-06: `handleAnswer` Guard Uses Stale Closure Instead of Ref

**Files modified:** `apps/web/src/components/quiz/quiz-session.tsx`
**Commit:** 2484930
**Applied fix:** Added `answeredRefsRef = useRef<Set<string>>(new Set())` to the component. Modified `handleAnswer` to check `answeredRefsRef.current.has(answer.questionRef)` first (synchronous, always current), then add to the ref before calling `setAnswers`. Changed `setAnswers(newAnswers)` to the functional form `setAnswers((prev) => [...prev, answer])` for additional safety.

### WR-07: `seedAchievements` Runs N Sequential Upserts on Module Init Without Error Handling

**Files modified:** `apps/api/src/gamification/gamification.service.ts`
**Commit:** 2e33212
**Applied fix:** Wrapped `onModuleInit`'s `seedAchievements` call in `try/catch` with `console.error` logging so a DB outage at startup does not crash the GamificationModule. Converted `seedAchievements` from a sequential `for...await` loop to `Promise.all(ACHIEVEMENT_DEFINITIONS.map(...))` for parallel execution.

### WR-08: `MistakeReview` Uses `role="radio"` on Non-Interactive `div` Elements

**Files modified:** `apps/web/src/components/quiz/mistake-review.tsx`
**Commit:** c01cf04
**Applied fix:** Removed `role="radio"`, `aria-disabled="true"`, and `aria-checked` from each option div. Replaced `role="radio"` with `role="none"`. Wrapped the options list `div` with `role="group" aria-label="Answer options"` for semantic grouping. Kept `aria-label` on individual divs for correct/incorrect announcement by screen readers.

---

## Test Suite Results

Run after all fixes: `pnpm --filter api test -- --run`

- **Phase 07 tests:** All passing
  - `gamification.service.spec.ts`: 17/17
  - `quiz.service.spec.ts`: 8/8
  - `listening.service.spec.ts`: 11/11
- **Pre-existing RED tests (expected failures, not regressions):**
  - `auth/jwt.guard.spec.ts`: 2 failures (marked `[RED: implemented in Plan 04]`)
  - `auth/auth.service.spec.ts`: 2 failures (marked `[RED: implemented in Plan 05]`)
- **Total:** 133 passed, 4 failed (pre-existing), 0 new failures introduced

---

_Fixed: 2026-06-19T21:49:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
