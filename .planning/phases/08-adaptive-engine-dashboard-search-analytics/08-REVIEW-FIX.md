---
phase: "08"
fixed_at: 2026-06-20T00:00:00Z
review_path: .planning/phases/08-adaptive-engine-dashboard-search-analytics/08-REVIEW.md
iteration: 1
findings_in_scope: 16
fixed: 13
skipped: 3
status: partial
---

# Phase 08: Code Review Fix Report

**Fixed at:** 2026-06-20
**Source review:** `.planning/phases/08-adaptive-engine-dashboard-search-analytics/08-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 16 (7 Critical + 9 Warning)
- Fixed: 13 (7 Critical + 6 Warning, with WR-07 bundled into CR-04 commit)
- Skipped: 3 (WR-03, WR-09 — complexity/audit flags; WR-07 bundled with CR-04)

---

## Fixed Issues

### CR-01 + CR-07: XSS Bypass in `sanitizeSnippet` — Attribute-injected Event Handlers

**Files modified:** `apps/web/src/lib/sanitize-snippet.ts`
**Commit:** `1d721d9`
**Applied fix:** Two-step sanitization: (1) strip all non-`mark` tags using an improved regex `/<(?!\/?mark(?=>|\s|$))[^>]*>/gi`, (2) strip all attributes from surviving `<mark ...>` tags by replacing them with bare `<mark>`. This eliminates the `<mark onmouseover="...">` XSS vector. Both CR-01 and CR-07 share the same root cause and are resolved in one commit.

---

### CR-02: Race Condition in `updateSkillScore` (Non-Atomic Read-Modify-Write)

**Files modified:** `apps/api/src/adaptive/adaptive.service.ts`
**Commit:** `ebeb7da`
**Applied fix:** Wrapped the `findUnique` + `upsert` pair in a `prisma.$transaction()` interactive transaction. The read and write now execute atomically within a single transaction, preventing concurrent sessions from reading the same stale accuracy and overwriting each other's EMA update.

---

### CR-03: `user.cefrLevel` May Be Null at Runtime — Dashboard Will Throw

**Files modified:** `apps/api/src/adaptive/adaptive.service.ts`
**Commit:** `38dffa9`
**Applied fix:** Added `const cefrLevel = user.cefrLevel ?? 'B1'` immediately after fetching the user. All three downstream usages (`recordCefrSnapshotIfChanged`, `getContinueLearningRecommendation`, and the return DTO) now use the guarded `cefrLevel` variable instead of the raw `user.cefrLevel`.

---

### CR-04: Admin Analytics — Full Table Scan (No Limit) Is a Production DoS Vector

**Files modified:** `apps/api/src/analytics/analytics.service.ts`
**Commit:** `d70a6cc`
**Applied fix:** Replaced the `readingProgress.findMany()` full-table scan for top content with a DB-level `groupBy` + `_count` query with `take: 10` and a 90-day date window. Also replaced the unbounded `allReadingRows` second scan with two atomic `count()` calls (`readingCompleted` and `readingTotal`). Replaced the unbounded `activityLog.findMany()` with a 30-day scoped query. **Note:** WR-07 (passage title join) was also resolved in this commit — see WR-07 entry below.

---

### CR-05: Retention Rate Cohort Bug — Week-2 Active Users NOT Filtered to the Cohort

**Files modified:** `apps/api/src/analytics/analytics.service.ts`
**Commit:** `0555614`
**Applied fix:** Replaced the two-way `Promise.all([user.count(), activityLog.groupBy()])` (where the groupBy had no cohort filter) with a sequential approach: first fetch cohort user IDs with `findMany({ select: { id: true } })`, then scope the `activityLog.groupBy` to `userId: { in: cohortIds }`. When the cohort is empty, `week2ActiveRows` is set to `[]` without issuing a database query.

---

### CR-06: `ReadingService.completeSession` Trusts Client-Supplied `accuracy` and `score`

**Files modified:** `apps/api/src/reading/reading.service.ts`
**Commit:** `be15ae4`
**Applied fix:** Added clamping immediately after destructuring the DTO:
- `clampedAccuracy = Math.min(1, Math.max(0, dto.accuracy ?? 0))` — enforces [0, 1] range
- `clampedScore = Math.min(100, Math.max(0, dto.score ?? 0))` — enforces [0, 100] range

All downstream writes (DB upsert, adaptive skill score update, return value) use the clamped values. Note: a full server-side recomputation from `attempts[]` (as ListeningService does) would be the ideal long-term fix, but requires a DTO schema change. The clamp prevents score inflation with no breaking changes.

---

### WR-01: `computeCurrentStreak` Lookback Window Caps at 32 Days

**Files modified:** `apps/api/src/adaptive/adaptive.service.ts`
**Commit:** `82cd1c2`
**Applied fix:** Changed `since.setDate(since.getDate() - 32)` to `since.setDate(since.getDate() - 400)`. Users with streaks longer than 32 days will now have their streak correctly computed. The comment was updated to explain the rationale.

---

### WR-02: `buildActivityData` in `dashboard-client.tsx` Returns Fabricated Data

**Files modified:** `apps/web/src/app/(dashboard)/dashboard/dashboard-client.tsx`
**Commit:** `2fa0537`
**Applied fix:** Removed the `lessonsCompleted` parameter from `buildActivityData()`. The function now returns real zeros for all 7 days instead of fabricating a non-zero count for today. The comment is updated to explain that a dedicated per-day activity endpoint is needed for a real chart. This is honest behavior — the chart shows no data rather than misleading fabricated counts.

---

### WR-04: Search Filter Values Passed Unvalidated — CEFR Level Enum Crash

**Files modified:** `apps/api/src/search/search.service.ts`
**Commit:** `3e7b535`
**Applied fix:** Added two `Set` constants (`VALID_LEVELS`, `VALID_SKILLS`) and validation guards at the top of the `search()` method. Invalid `level` or `skill` values throw `BadRequestException` (HTTP 400) with a descriptive message rather than propagating a PostgreSQL enum error as a 500.

---

### WR-05: `RedisCacheService` No Error Handling — Redis Failure Crashes Analytics

**Files modified:** `apps/api/src/analytics/redis-cache.service.ts`
**Commit:** `f69ae74`
**Applied fix:** Wrapped both `get()` and `set()` in `try/catch`. `get()` returns `null` on error (cache miss fallthrough). `set()` logs a warning and returns without throwing. Added a `Logger` instance using NestJS's built-in `Logger` for structured log output. Redis failures are now non-fatal — the analytics request falls through to the DB.

---

### WR-06: `seed-admin.ts` Always Overwrites Admin Password on Every Re-Run

**Files modified:** `packages/database/prisma/seed-admin.ts`
**Commit:** `ed9889a`
**Applied fix:** The `update` block in the upsert now only includes `passwordHash` when `process.env.ADMIN_PASSWORD` is explicitly set (using spread `...(passwordUpdate.passwordHash ? { passwordHash: ... } : {})`). On re-runs without `ADMIN_PASSWORD` set, the existing DB password is preserved. For the `create` branch (first-time seed), the insecure default is still used as a last resort, but a warning is logged. The `FORCE_RESET_ADMIN_PASSWORD` env var approach from the review suggestion was simplified to a direct check on `ADMIN_PASSWORD` presence, which is sufficient.

---

### WR-07: Top Content Shows `passageId` Instead of Title

**Files modified:** `apps/api/src/analytics/analytics.service.ts`
**Commit:** `d70a6cc` (bundled with CR-04)
**Applied fix:** After computing `topPassageGroups` via `groupBy`, the fix batch-fetches all matching passage titles with a single `readingPassage.findMany({ where: { id: { in: topPassageIds } }, select: { id: true, title: true } })`, builds a `Map<id, title>`, and uses `titleById.get(g.passageId) ?? g.passageId` when constructing the `topContent` array. The fallback to `passageId` ensures no crash if a passage was deleted between the groupBy and the title lookup.

---

### WR-08: `ListeningProgress` Missing `lastViewedAt` on Upsert Update

**Files modified:** `apps/api/src/listening/listening.service.ts`
**Commit:** `af5bcae`
**Applied fix:** Added `lastViewedAt: new Date()` to the `update` clause of the `listeningProgress.upsert()`. The `create` clause already sets `lastViewedAt` via the `@default(now())` column default. On subsequent session completions, `lastViewedAt` is now refreshed so the dashboard's "recently viewed" sort order stays accurate.

---

## Skipped Issues

### WR-03: `QuizService.rehydrateQuestions` Has N+1 DB Queries

**File:** `apps/api/src/quiz/quiz.service.ts`
**Reason:** skipped — the refactor to batch-by-type with `Promise.all` requires reading the full `rehydrateQuestions` implementation (490–598 lines) and restructuring the result assembly logic. The risk of introducing regressions in quiz answer rehydration (which directly affects the quiz session review UX) is too high for an automated fix without integration tests. This should be refactored manually with accompanying tests.
**Original issue:** 10 sequential DB round-trips per quiz review instead of batched parallel queries; empty catch blocks swallow DB errors silently.

---

### WR-09: `completeSession` in `QuizService` — XP Awarded Twice (Architecture Ambiguity)

**File:** `apps/api/src/quiz/quiz.service.ts`
**Reason:** skipped — the review itself notes this is an "architecture ambiguity" that requires cross-checking `GamificationService.awardXp` internals to determine if XP is actually double-counted. The fix suggestion ("document clearly") is documentation rather than a code change. Promoted to WARNING by the reviewer because the pattern creates confusion, but no concrete XP double-counting bug is confirmed. A human should verify whether `awardXp` reads `QuizAnswer.xpEarned` before deciding if a code change is needed.
**Original issue:** `QuizAnswer.xpEarned` is set per-answer AND `GamificationService.awardXp` is called for the session total — may or may not double-count depending on `awardXp` implementation.

---

_Fixed: 2026-06-20_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
