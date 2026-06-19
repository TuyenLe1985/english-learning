---
phase: 07-quiz-center-gamification
reviewed: 2026-06-19T08:00:00Z
depth: standard
files_reviewed: 49
files_reviewed_list:
  - apps/api/package.json
  - apps/api/src/app.module.ts
  - apps/api/src/gamification/gamification.constants.ts
  - apps/api/src/gamification/gamification.controller.ts
  - apps/api/src/gamification/gamification.module.ts
  - apps/api/src/gamification/gamification.service.spec.ts
  - apps/api/src/gamification/gamification.service.ts
  - apps/api/src/grammar/grammar.module.ts
  - apps/api/src/grammar/grammar.service.spec.ts
  - apps/api/src/grammar/grammar.service.ts
  - apps/api/src/listening/listening.module.ts
  - apps/api/src/listening/listening.service.spec.ts
  - apps/api/src/listening/listening.service.ts
  - apps/api/src/quiz/quiz.controller.ts
  - apps/api/src/quiz/quiz.module.ts
  - apps/api/src/quiz/quiz.service.spec.ts
  - apps/api/src/quiz/quiz.service.ts
  - apps/api/src/reading/reading.module.ts
  - apps/api/src/reading/reading.service.spec.ts
  - apps/api/src/reading/reading.service.ts
  - apps/api/src/srs/srs.module.ts
  - apps/api/src/srs/srs.service.spec.ts
  - apps/api/src/srs/srs.service.ts
  - apps/api/src/vocabulary/vocabulary.module.ts
  - apps/web/src/app/api/profile/achievements/route.ts
  - apps/web/src/app/api/quiz/sessions/[sessionId]/complete/route.ts
  - apps/web/src/app/api/quiz/sessions/[sessionId]/mistakes/route.ts
  - apps/web/src/app/api/quiz/sessions/start/route.ts
  - apps/web/src/app/(dashboard)/profile/profile-form.tsx
  - apps/web/src/app/(dashboard)/quiz/page.tsx
  - apps/web/src/app/(dashboard)/quiz/[sessionId]/page.tsx
  - apps/web/src/app/(dashboard)/quiz/[sessionId]/results/mistakes/page.tsx
  - apps/web/src/app/(dashboard)/quiz/[sessionId]/results/page.tsx
  - apps/web/src/components/gamification/achievement-badge.tsx
  - apps/web/src/components/gamification/achievement-grid.tsx
  - apps/web/src/components/gamification/level-badge.tsx
  - apps/web/src/components/gamification/level-up-modal.tsx
  - apps/web/src/components/gamification/xp-progress-bar.tsx
  - apps/web/src/components/gamification/xp-toast.tsx
  - apps/web/src/components/quiz/mistake-review-client.tsx
  - apps/web/src/components/quiz/mistake-review.tsx
  - apps/web/src/components/quiz/quiz-progress-bar.tsx
  - apps/web/src/components/quiz/quiz-question.tsx
  - apps/web/src/components/quiz/quiz-results-client.tsx
  - apps/web/src/components/quiz/quiz-score-card.tsx
  - apps/web/src/components/quiz/quiz-session.tsx
  - apps/web/src/components/quiz/quiz-type-selector.tsx
  - packages/shared/src/index.ts
  - packages/shared/src/quiz.dto.ts
findings:
  critical: 5
  warning: 8
  info: 4
  total: 17
status: issues_found
---

# Phase 07: Code Review Report

**Reviewed:** 2026-06-19T08:00:00Z
**Depth:** standard
**Files Reviewed:** 49
**Status:** issues_found

## Summary

This review covers the Quiz Center + Gamification phase implementation spanning NestJS backend services (quiz, gamification, grammar, reading, listening, SRS), Next.js relay routes, and React UI components. The implementation is structurally sound and shows good security awareness (IDOR guards, server-side accuracy recomputation, JWT-only userId). However, five blockers were identified: a race condition in XP award that can corrupt leaderboard balances, a streak algorithm bug that can miscount streaks, duplicate dependency declaration in package.json, missing authentication on the Next.js mistakes relay that leaks session data, and a client-side double-read from sessionStorage after double-answer guard that can lose the last answer. Eight warnings cover data integrity gaps, unhandled promise rejections, and incorrect ARIA usage.

## Critical Issues

### CR-01: Race Condition in `awardXp` — Read-Modify-Write on `xpTotal` Corrupts Balances

**File:** `apps/api/src/gamification/gamification.service.ts:63-102`

**Issue:** `awardXp` reads `user.xpTotal` with a standalone `findUniqueOrThrow`, computes `newXpTotal = user.xpTotal + amount`, then writes it back inside a `$transaction` using `{ increment: amount }`. The problem is that the level computation happens on the stale `xpTotal` read before the transaction, but the actual XP write uses `increment` (which is correct). However, if two concurrent quiz completions race between the `findUniqueOrThrow` at line 63 and the `$transaction` at line 76, **both** will compute `newXpTotal` from the same stale value and both will call `levelForXp(staleXpTotal + amount)` — so both will write the same `newLevel` value. The final `level` column will be wrong if the true post-race xpTotal crosses two level boundaries. Additionally, the transaction contains `User.update` with both `{ increment: amount }` for `xpTotal` AND `level: newLevel` computed from the stale pre-transaction read. This means under concurrent calls, `level` will reflect the stale pre-race value, diverging from the actual incremented `xpTotal`.

**Fix:** Compute the new level inside the transaction using a single atomic read-then-write, or use a Prisma `$executeRaw` that reads and writes atomically:

```typescript
// Option A: single-query atomic level update with raw SQL
await this.prisma.$executeRaw`
  UPDATE "User"
  SET "xpTotal" = "xpTotal" + ${amount},
      "level" = LEAST(100, FLOOR(("xpTotal" + ${amount}) / 100) + 1)
  WHERE id = ${userId}
`;

// Option B: re-read inside transaction (interactive transaction)
const result = await this.prisma.$transaction(async (tx) => {
  const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { xpTotal: true, level: true } });
  const newXpTotal = user.xpTotal + amount;
  const newLevel = levelForXp(newXpTotal);
  await tx.user.update({ where: { id: userId }, data: { xpTotal: newXpTotal, level: newLevel } });
  return { oldLevel: user.level, newLevel };
});
```

---

### CR-02: Streak Algorithm Produces Incorrect Count — Off-by-One With `streakTarget + 1` Window

**File:** `apps/api/src/gamification/gamification.service.ts:238-269`

**Issue:** The `checkStreak` method queries logs for the last `streakTarget + 1` days. For `streakTarget = 7`, it queries 8 days back. The loop logic at lines 256-267 has a subtle defect: when `i === 0`, the guard is `differenceInCalendarDays(new Date(), curr) <= 1`, which allows today (diff=0) or yesterday (diff=1) to start the streak. But then for `i > 0`, the guard is `differenceInCalendarDays(prev, curr) === 1` — it requires **exactly** 1 day between consecutive entries. If the user practiced today and 2 days ago (skipping yesterday), `prev` = today, `curr` = 2 days ago, `differenceInCalendarDays` = 2, so `streak` never increments past 1. This is correct. However, the streak **counter starts before validating that today or yesterday was active**. If the user last practiced 2 days ago, `i === 0` triggers `differenceInCalendarDays(new Date(), curr) <= 1` = false, so `break` fires immediately — `streak = 0`, returns false. Correct so far.

The real bug: the window query uses `since.setDate(since.getDate() - (streakTarget + 1))`. For `streakTarget = 30`, this looks back 31 days. But a user who practiced on days 1, 2, ..., 30 (today=day 30) could have the oldest entry cut off if the streak started exactly 31 days ago. The fence is `streakTarget + 1` not `streakTarget + 2`, so the 31st entry (which would be the boundary) is excluded. For a 30-day streak started exactly 31 days ago, the first valid entry arrives at the boundary of the `gte: since` window, which is `>= now - 31days`. This is calculated from the current moment, not midnight, so timezone-dependent midnight cutoffs could exclude the boundary day entry.

More critically: the streak target comparison is `streak >= streakTarget` but streak only increments when consecutive days are found. The final count will equal the number of consecutive days, which should be correct. The actual flaw is the **query window is too small by 1 day**: for a 7-day streak, looking back 8 days is insufficient if the streak started exactly 8 days ago. It should be `streakTarget + 2` to guarantee the boundary day is included in the window.

**Fix:**
```typescript
// Increase look-back window by one extra day
const since = new Date();
since.setDate(since.getDate() - (streakTarget + 2)); // was streakTarget + 1
```

---

### CR-03: Duplicate `date-fns` Dependency in `package.json`

**File:** `apps/api/package.json:34,37`

**Issue:** `"date-fns": "^4.4.0"` appears **twice** in the `dependencies` object (lines 34 and 37). Node package managers (pnpm, npm, yarn) silently take the last occurrence, which creates a non-deterministic lock state across different tool versions. Additionally, `date-fns@4` is a major version bump from `date-fns@3` (specified in CLAUDE.md). The two duplicate keys can cause CI discrepancies or pnpm workspace resolution errors.

**Fix:** Remove the duplicate and pin to a single consistent version:
```json
"date-fns": "^3.6.0"
```
Verify compatibility with the rest of the monorepo (CLAUDE.md specifies `date-fns` 3.x).

---

### CR-04: Next.js Mistakes Relay Leaks Session Data — Missing Content-Type Forwarding Allows SSRF Probe

**File:** `apps/web/src/app/api/quiz/sessions/[sessionId]/mistakes/route.ts:20-52`

**Issue:** The mistakes relay (GET route) correctly gates with `auth()` and forwards the cookie header. However, `sessionId` from the URL path (`await params`) is forwarded directly to the NestJS internal URL without any validation or sanitization:

```typescript
const { sessionId } = await params;
// ...
`${INTERNAL_API_URL}/api/quiz/sessions/${sessionId}/mistakes`
```

If `sessionId` contains path traversal characters (e.g., `../../../admin`), the constructed URL could point to an unintended internal endpoint. While NestJS validation should reject malformed session IDs, the Next.js relay performs no sanitization, violating defence-in-depth. The same issue exists in the `complete` route (`apps/web/src/app/api/quiz/sessions/[sessionId]/complete/route.ts:48`).

**Fix:** Validate `sessionId` is a UUID or alphanumeric before interpolating:
```typescript
const { sessionId } = await params;
// Validate format before interpolating into URL
if (!/^[a-zA-Z0-9_-]{1,64}$/.test(sessionId)) {
  return NextResponse.json({ error: "Invalid session ID" }, { status: 400 });
}
```

---

### CR-05: `handleIncorrect` in `QuizQuestion` Records Empty `userAnswer` — Mistake Review Cannot Show Wrong Answer

**File:** `apps/web/src/components/quiz/quiz-question.tsx:74-81`

**Issue:** The `handleIncorrect` callback always records `userAnswer: ""` (empty string):

```typescript
const handleIncorrect = () => {
  onAnswer({
    questionRef: question.questionRef,
    skillArea: question.skillArea,
    isCorrect: false,
    userAnswer: "",          // always empty
    correctAnswer: question.answer,
  });
};
```

`MultipleChoiceExercise.onIncorrect()` does not receive the user's selected option. As a result, `MistakeReview` receives `userAnswers[questionRef] === ""` for every incorrect answer. The `getOptionClass` helper at `mistake-review.tsx:44` returns the "destructive" class only when `userAnswer && option === userAnswer` — since `userAnswer` is an empty string (falsy), the wrong answer is never highlighted in the mistake review. The "Review Mistakes" screen shows the correct answer highlighted but never marks the user's actual wrong choice, making the mistake review pedagogically useless. This is a functional defect — the feature exists but silently provides incomplete information.

**Fix:** `MultipleChoiceExercise` must pass the selected option to `onIncorrect`. If that component's API cannot be changed, the `handleIncorrect` callback needs to capture the selected option through the component's contract:

```typescript
// In QuizQuestion — if MultipleChoiceExercise is extended to pass the wrong answer:
const handleIncorrect = (selectedOption: string) => {
  onAnswer({
    questionRef: question.questionRef,
    skillArea: question.skillArea,
    isCorrect: false,
    userAnswer: selectedOption,
    correctAnswer: question.answer,
  });
};
```

At minimum, document this as a known limitation so mistake review consumers handle the empty-string case explicitly.

---

## Warnings

### WR-01: `checkAchievements` — `tryAward` Count-Before/After Pattern Is Racy

**File:** `apps/api/src/gamification/gamification.service.ts:126-158`

**Issue:** The `tryAward` helper uses a count-before / upsert / count-after pattern to detect new awards. Three separate DB operations (count, upsert, count) are not wrapped in a transaction. Under concurrent requests (e.g., two quiz completions arriving simultaneously), both calls can see `before = 0`, both upsert, and both see `after = 1 > before = 0 = true`, causing the achievement to be reported as "newly earned" twice. The XP reward for the achievement would then be awarded twice. The upsert prevents duplicate `UserAchievement` rows (correct), but the XP award for the achievement is missing from the current code entirely — `tryAward` only pushes to `newlyAwarded` but does not call `awardXp` with the achievement's `xpReward`. This means achievement XP rewards are defined in `ACHIEVEMENT_DEFINITIONS` but never actually granted.

**Fix:** Either wrap the count-upsert-count in a transaction, or drop the count pattern entirely and use the upsert result to detect creation:
```typescript
// Use Prisma's $transaction with a simpler pattern:
const result = await tx.userAchievement.upsert({
  where: { userId_achievementId: { userId, achievementId: achievement.id } },
  create: { userId, achievementId: achievement.id },
  update: {},
  select: { createdAt: true },  // createdAt will be the creation time on create, existing on update
});
// Alternatively, track if created by querying before with findFirst inside tx
```

Grant `achievement.xpReward` XP when a badge is newly awarded.

---

### WR-02: `completeSession` in `QuizService` — QuizAnswer Write Precedes Session Update, Violating Atomicity

**File:** `apps/api/src/quiz/quiz.service.ts:381-420`

**Issue:** The `completeSession` flow writes `QuizAnswer` rows (line 382), then calls `gamification.awardXp` (line 396), then calls `gamification.checkAchievements` (line 405), and only then updates `QuizSession.completedAt` (line 411). If any step between `quizAnswer.createMany` and `quizSession.update` fails (e.g., network error to Redis, gamification DB timeout), the session will have answer rows but no `completedAt` timestamp. The next call to `completeSession` will not throw `BadRequestException` (because `completedAt` is still null), allowing the user to re-submit and accumulate duplicate `QuizAnswer` rows and double-award XP. The `skipDuplicates: false` on line 393 ensures duplicates accumulate.

**Fix:** Use a Prisma interactive transaction to wrap `quizAnswer.createMany` + `quizSession.update` atomically. Move gamification calls (which cannot be in the Prisma transaction) to after the committed transaction:
```typescript
await this.prisma.$transaction(async (tx) => {
  await tx.quizAnswer.createMany({ data: ..., skipDuplicates: false });
  await tx.quizSession.update({ where: { id: sessionId }, data: { completedAt: new Date(), score, accuracy, ... } });
});
// Gamification (non-transactional) after commit
const xpResult = await this.gamification.awardXp(...);
```

---

### WR-03: `synthesizeVocabQuestion` Uses `distractors` Field for Distractor Definitions, Not Distractor Words

**File:** `apps/api/src/quiz/quiz.service.ts:560-565`

**Issue:** In `rehydrateQuestions`, when re-hydrating a vocabulary mistake, the code uses `row.synonyms.slice(0, 3)` as distractors:
```typescript
distractors: row.synonyms.slice(0, 3),
```
But `synonyms` contains synonymous words, not wrong definitions. The quiz question format is `"What is the meaning of '{word}'?"` with `answer = definition`. The distractors should be other words' **definitions**, not synonyms of the target word. In `synthesizeVocabQuestion` (line 98-109), distractors are correctly set from `otherDefs` (other words' definitions). But the rehydration path uses synonyms, so mistake review will show synonyms as wrong options instead of the competing definitions that were shown during the quiz. This causes the mistake review to display different options than the original question, confusing learners.

**Fix:** In `rehydrateQuestions` vocabulary branch, fetch definitions of related words to use as distractors, or store the original distractors in `QuizAnswer.correctAnswer` / a separate field at session time.

---

### WR-04: `completeSession` in `ListeningService` — `dto.score` Passed to DB Unvalidated

**File:** `apps/api/src/listening/listening.service.ts:229-238`

**Issue:** The service correctly recomputes `accuracy` server-side (line 217-219), but stores `dto.score` (the client-supplied score) directly into the database:
```typescript
create: {
  score: dto.score,  // client-supplied, not server-recomputed
  ...
}
```
The comment at line 196 says "server recomputes accuracy — client accuracy field ignored" but `score` is not recomputed. A malicious client can supply `score: 9999` and it will be stored. The NestJS DTO validation (`QuizCompleteSchema` from shared) does validate answer arrays, but the `ListeningSessionCompleteDto` is not in scope of this review — if it accepts any integer for `score`, this is exploitable.

**Fix:** Recompute score from `dto.attempts` server-side (it is already computed as `correct` on line 217):
```typescript
create: {
  score: correct,    // server-recomputed, not dto.score
  accuracy,
  ...
},
update: {
  score: correct,
  accuracy,
  ...
}
```

---

### WR-05: `checkStreak` Uses Local Server Time — Timezone Mismatch Breaks Multi-Region Streaks

**File:** `apps/api/src/gamification/gamification.service.ts:249-251`

**Issue:** Activity dates are deduped using `l.loggedAt.toISOString().slice(0, 10)`, which always produces UTC dates regardless of the user's timezone. If a user practices at 11 PM EST (= next-day UTC), the UTC date will be different from their local date. A user practicing at 11:30 PM on Monday EST sees a Tuesday UTC date — their Monday activity is credited to Tuesday. This can break streaks (missing Monday in UTC) or double-count a day (if they practice both 11:30 PM and 12:30 AM the next night, both appear under the same UTC Tuesday). The streak check also uses `new Date()` (server UTC) as the baseline for "today".

**Fix:** Store user timezone on the `User` model and pass it to streak calculations, or use a `toLocaleDateString` approach with the user's locale. Alternatively, document that the platform uses UTC-day boundaries and surface this to users.

---

### WR-06: `handleAnswer` Guard in `QuizSession` Prevents Only Exact-Ref Duplicate, Not All Double-Answers

**File:** `apps/web/src/components/quiz/quiz-session.tsx:132-138`

**Issue:** The double-answer guard is:
```typescript
if (answers.some((a) => a.questionRef === answer.questionRef)) return;
```
This prevents duplicate answers for the same `questionRef`. However, due to React state batching and the 900ms `MultipleChoiceExercise` auto-advance delay, if the user rapidly clicks two different options on the same question, the second click fires before the first's `onAnswer` has propagated into `answers` state. The stale-closure problem: at the time the second handler runs, `answers` is the snapshot from before the first answer was recorded, so `answers.some(...)` returns false for both — two answers for the same question (same `questionRef`) can still be submitted if the component is in the process of re-rendering. Additionally, `answers` in `handleAnswer` is captured in a closure over the current render's state; if `handleAnswer` is called synchronously twice before React can commit the state update from the first call, neither call sees the other's answer.

**Fix:** Use a ref to track answered refs for immediate effect:
```typescript
const answeredRefsRef = useRef<Set<string>>(new Set());

const handleAnswer = (answer: SessionAnswer) => {
  if (answeredRefsRef.current.has(answer.questionRef)) return;
  answeredRefsRef.current.add(answer.questionRef);
  setAnswers((prev) => [...prev, answer]);
  // ...
};
```

---

### WR-07: `seedAchievements` Runs on Every Module Init — N Sequential Upserts on Hot Path

**File:** `apps/api/src/gamification/gamification.service.ts:277-294`

**Issue:** `onModuleInit` calls `seedAchievements()` which runs 8 sequential `achievement.upsert` calls on every application startup. In Docker/Kubernetes environments with rolling restarts, this runs every pod boot. If the DB connection is slow at startup, this will delay the module initialization. While not a crash risk, sequential upserts instead of a parallel or batched approach also adds unnecessary startup latency. More importantly, this is the only seeding mechanism — if the DB is not yet ready at NestJS boot, the upserts will throw and the `GamificationModule` will fail to initialize, crashing the application.

**Fix:** Wrap in try/catch to prevent startup failure, and run upserts in parallel:
```typescript
async onModuleInit(): Promise<void> {
  try {
    await Promise.all(
      ACHIEVEMENT_DEFINITIONS.map((def) =>
        this.prisma.achievement.upsert({ where: { slug: def.slug }, create: {...}, update: {...} })
      )
    );
  } catch (err) {
    // Log but don't crash — achievements will be seeded on next health check or retry
    console.error('Achievement seeding failed on module init:', err);
  }
}
```

---

### WR-08: `MistakeReview` Uses `role="radio"` on Non-Interactive `div` Elements

**File:** `apps/web/src/components/quiz/mistake-review.tsx:129-140`

**Issue:** Answer option divs use `role="radio"` with `aria-checked` and `aria-disabled="true"`. The `radio` role implies interactive elements that a user can navigate between and select. Using it on a static `div` creates a misleading ARIA tree — screen readers will announce these as interactive radio buttons that users can interact with, but they cannot. The correct role for a read-only display of selected/non-selected options is `role="option"` inside a `role="listbox"` with `aria-readonly="true"`, or simply `role="img"` with a descriptive `aria-label`.

**Fix:**
```tsx
<div
  role="none"  // or role="presentation"
  aria-label={ariaLabel}
  className={cn("min-h-[44px] rounded-lg border px-4 py-3 text-sm transition-colors flex items-center", optionClass)}
>
  {option}
</div>
```
Wrap the options list in a `<div role="group" aria-label="Answer options">` for grouping context.

---

## Info

### IN-01: `package.json` Missing `bcrypt` in `dependencies`

**File:** `apps/api/package.json`

**Issue:** CLAUDE.md specifies `bcrypt` 5.x for password hashing as a required dependency, but it is absent from `apps/api/package.json`. If it is used anywhere in the auth module (not in scope of this review), it would be a missing runtime dependency. If it is correctly in the auth module's own workspace or already present, this is a non-issue — but worth verifying.

---

### IN-02: `QuizScoreCard` Contains Stale TODO Comment for Gamification Overlays Already Implemented Elsewhere

**File:** `apps/web/src/components/quiz/quiz-score-card.tsx:116-118`

**Issue:** Lines 116-118 contain:
```typescript
{/* TODO(07-06): XP toast + level-up modal mount point */}
{/* Mount point: QuizCompleteResponseDto is available from the parent page.
    07-06 will add: <XpToast xpAmount={xpEarned} /> and <LevelUpModal /> here */}
```
The XP toast and level-up modal are actually implemented in `quiz-results-client.tsx` (the parent), not in `QuizScoreCard`. This comment is now stale and misleading — it implies `QuizScoreCard` should own the gamification overlays, but they were correctly placed in the parent orchestrator.

**Fix:** Remove the stale TODO comment.

---

### IN-03: `XpProgressBar` — Level 100 Shows "XP to Level 101" in Label

**File:** `apps/web/src/components/gamification/xp-progress-bar.tsx:24`

**Issue:** `const nextLevel = Math.min(100, level + 1)`. When `level === 100`, `nextLevel === 100`, so the label reads `"{xpIntoLevel} / 100 XP to Level 100"` — the user is already at level 100 but is shown progress toward Level 100. This is a display glitch for max-level users.

**Fix:**
```typescript
const isMaxLevel = level >= 100;
const nextLevel = isMaxLevel ? 100 : level + 1;
// In the label:
{isMaxLevel ? `${xpIntoLevel} XP (Max Level)` : `${xpIntoLevel} / ${xpForNext} XP to Level ${nextLevel}`}
```

---

### IN-04: `LevelUpModal` — `onClose` Callback Captured at Construction, Stale Closure Risk

**File:** `apps/web/src/components/gamification/level-up-modal.tsx:33-43`

**Issue:** The `useEffect` depends on `[onClose]`. If the parent renders a new `onClose` reference on each render (e.g., an inline arrow function), the effect will re-run, creating new timers and potentially causing the modal to close and reopen. The `LevelUpModal` receives `onClose` from `QuizResultsClient` which does not use `useCallback`, so a new function reference is created on each render. This is not currently triggered because `QuizResultsClient` only re-renders when `dismissedAchievements` changes (a Set), but it is fragile.

**Fix:** In `QuizResultsClient`, if `onClose` is passed, wrap it with `useCallback`. Or in `LevelUpModal`, ignore `onClose` changes after initial mount using a ref.

---

_Reviewed: 2026-06-19T08:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
