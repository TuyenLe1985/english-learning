---
phase: 04-grammar-module
reviewed: 2026-06-14T00:00:00Z
depth: standard
files_reviewed: 15
files_reviewed_list:
  - apps/api/src/grammar/grammar.controller.ts
  - apps/api/src/grammar/grammar.service.ts
  - apps/web/src/app/(dashboard)/grammar/[area]/[topic]/[lesson]/page.tsx
  - apps/web/src/app/(dashboard)/grammar/[area]/[topic]/page.tsx
  - apps/web/src/app/(dashboard)/grammar/page.tsx
  - apps/web/src/app/api/grammar/areas/route.ts
  - apps/web/src/app/api/grammar/lessons/[lessonSlug]/route.ts
  - apps/web/src/app/api/grammar/sessions/complete/route.ts
  - apps/web/src/app/api/grammar/topics/[topicSlug]/weak-questions/route.ts
  - apps/web/src/components/grammar/grammar-lesson-page.tsx
  - apps/web/src/components/grammar/grammar-session-results.tsx
  - apps/web/src/components/grammar/multiple-choice-exercise.tsx
  - apps/web/src/components/grammar/fill-in-the-blank-exercise.tsx
  - apps/web/src/components/grammar/drag-and-drop-exercise.tsx
  - packages/shared/src/grammar.dto.ts
findings:
  critical: 4
  warning: 4
  info: 3
  total: 11
status: issues_found
---

# Phase 04: Grammar Module — Code Review Report

**Reviewed:** 2026-06-14T00:00:00Z
**Depth:** standard
**Files Reviewed:** 15
**Status:** issues_found

## Summary

The grammar module is structurally sound: JWT-gated NestJS controller, Zod-validated session input, Prisma parameterized queries, and a clean three-phase client session. Four blockers were found. The most severe is a mastery scale inconsistency that causes the results screen to display values like "8000%" instead of "80%" — a data rendering bug that will be visible to every user on every session completion. Three other blockers cover: unauthenticated direct-to-NestJS calls in Server Components bypassing the relay auth model, a race condition in the session completion that can corrupt mastery counters under concurrent requests, and a `getSessionToken()` that calls the Next.js 15-async-compatible `cookies()` synchronously, causing a runtime throw in any environment that requires the async form.

---

## Critical Issues

### CR-01: masteryPct scale mismatch — results screen displays 80x inflated values

**File:** `apps/web/src/components/grammar/grammar-session-results.tsx:67-69`

**Issue:** The NestJS service stores `masteryPct` as a decimal fraction (0–1, e.g. 0.80) in `GrammarProgress.masteryPct` (Prisma `Float @default(0)`). The `GrammarSessionResultDto` returns this same 0–1 value. `GrammarSessionResults` then multiplies by 100 again: `value={masteryPct * 100}` and `{Math.round(masteryPct * 100)}%`. A user who answers 8 of 10 correctly gets a displayed mastery of 8000%.

In contrast, the topic page (`[area]/[topic]/page.tsx:114,118`) passes `topic.masteryPct` directly to `<Progress value={topic.masteryPct}>` and renders `{Math.round(topic.masteryPct)}%` — treating it as a 0–100 value. This means the two screens interpret the same field at different scales, so at least one is always wrong.

The service comment (`masteryPct = (existingCorrect + newCorrect) / (existingAttempts + newAttempts)`) confirms a 0–1 result. The `GrammarTopicDtoSchema` returns this value unchanged, so the topic page is also incorrect (passes a 0.8 fraction to `<Progress value={0.8}>` which renders as a nearly empty bar, and displays "1%" instead of "80%").

**Fix — pick one consistent scale.** The simplest fix is to store as 0–100 in the DB and throughout DTOs:

```typescript
// grammar.service.ts — completeSession(), line 238
const newMasteryPct = newAttempts > 0 ? (newCorrect / newAttempts) * 100 : 0;
```

Then in `grammar-session-results.tsx` use the value directly (no `* 100`):
```tsx
<Progress value={masteryPct} className="h-3" aria-label="Topic mastery" />
<p className="mt-1 text-xs text-muted-foreground">{Math.round(masteryPct)}%</p>
```

And in `[area]/[topic]/page.tsx` — already passes the value directly, so it will be correct once the service stores 0–100.

---

### CR-02: Race condition in completeSession — read-then-write corrupts mastery counters

**File:** `apps/api/src/grammar/grammar.service.ts:232-257`

**Issue:** The method reads existing `GrammarProgress` (step 4, line 232), computes new totals in application code (lines 236–238), then upserts (step 5, line 241). Two concurrent requests for the same `userId + topicId` (e.g. the user double-submits or two tabs finish at the same time) both read the same baseline, compute the same new totals, and both write — the second write discards the first session's attempts. The lost attempts also mean `masteryPct` is permanently understated.

**Fix:** Use a Prisma `$executeRaw` or a single atomic SQL update to increment counters, or serialize the upsert using a DB-level increment:

```typescript
// Replace steps 4+5 with a single atomic upsert using raw SQL increment
await this.prisma.$executeRaw`
  INSERT INTO "GrammarProgress" ("userId", "topicId", "attempts", "correct", "masteryPct", "lastAttemptAt")
  VALUES (${userId}, ${topicId}, ${totalCount}, ${correctCount},
          CASE WHEN ${totalCount} > 0 THEN ${correctCount}::float / ${totalCount} ELSE 0 END,
          NOW())
  ON CONFLICT ("userId", "topicId") DO UPDATE
  SET "attempts"     = "GrammarProgress"."attempts" + ${totalCount},
      "correct"      = "GrammarProgress"."correct"  + ${correctCount},
      "masteryPct"   = ("GrammarProgress"."correct" + ${correctCount})::float
                       / NULLIF("GrammarProgress"."attempts" + ${totalCount}, 0),
      "lastAttemptAt" = NOW()
`;
```

Alternatively, wrap the read-modify-write in a Prisma `$transaction` with serializable isolation.

---

### CR-03: Server Components call NestJS directly, bypassing relay auth — token never sent in practice

**File:** `apps/web/src/app/(dashboard)/grammar/page.tsx:23-28`  
Also: `apps/web/src/app/(dashboard)/grammar/[area]/[topic]/page.tsx:31-38`  
Also: `apps/web/src/app/(dashboard)/grammar/[area]/[topic]/[lesson]/page.tsx:31-43`, `50-61`

**Issue:** The three Server Component pages call `getSessionToken()` and then hit `process.env["NEXT_PUBLIC_API_URL"]` (port 3001, the NestJS backend) directly with a `Bearer` token. `getSessionToken()` calls `cookies()` synchronously — in Next.js 14 this is fine, but `cookies()` returns the raw cookie store without `await`, and the result is the **JWE session cookie value**, not a signed JWT the NestJS `JwtAuthGuard` can verify.

The relay route pattern (used in `apps/web/src/app/api/grammar/…`) extracts the same raw JWE and forwards it as `Authorization: Bearer`. The NestJS guard decodes this using `@auth/core/jwt`. This pattern is consistent, but the Server Components bypass the relay entirely and instead reach out to `NEXT_PUBLIC_API_URL` (the public-facing NestJS URL). In production Docker, `NEXT_PUBLIC_API_URL` is the external hostname — internal server components should use the internal Docker service name (e.g., `http://api:3001`). Requests from Server Components will fail in production if the container cannot reach the public hostname, and if they do reach it, they skip any firewall rules that only permit the relay.

Additionally, `getSessionToken()` is called synchronously but `cookies()` in Next.js 14 must be called inside a request context — if the `fetchAreas()` helper is ever called outside a request (e.g., during static generation), this throws.

**Fix:** Server Components that need NestJS data should either (a) use the relay route via a relative fetch to `/api/grammar/…` (adds a network hop but keeps auth in one place), or (b) call `auth()` and use the session token from the returned object, which is the already-decoded session, and construct the `Authorization` header from the JWT token field:

```typescript
// grammar/page.tsx — inside GrammarPage()
const session = await auth();
if (!session) redirect("/login");
// session.accessToken or encode a JWT from session data as needed
// Prefer the relay route to keep auth logic centralized
const res = await fetch(`/api/grammar/areas`, { cache: "no-store" });
```

---

### CR-04: `getSessionToken()` calls `cookies()` synchronously — throws in Next.js async context

**File:** `apps/web/src/lib/get-session-token.ts:10`

**Issue:** `cookies()` from `next/headers` returns a synchronous `ReadonlyRequestCookies` in Next.js 14 but the function signature is synchronous (`function getSessionToken(): string | null`). In Next.js 15 the API became async and calling `cookies()` without `await` throws. The project pins to Next.js 14 per CLAUDE.md, but the relay routes in this same phase (`areas/route.ts`, `lessons/[lessonSlug]/route.ts`, `weak-questions/route.ts`) all call `await headers()` — following the async pattern. The inconsistency means that if the project is ever upgraded to Next.js 15, all three Server Component pages silently return `null` tokens (requests to NestJS go out unauthenticated) before the bug is caught.

**Fix:** Make `getSessionToken` async to be forward-compatible, and await the call sites:

```typescript
// get-session-token.ts
export async function getSessionToken(): Promise<string | null> {
  const store = await cookies();
  ...
}

// call sites — add await
const token = await getSessionToken();
```

---

## Warnings

### WR-01: completeSession — no validation that `questionId` values belong to the claimed `lessonId`

**File:** `apps/api/src/grammar/grammar.service.ts:217-225`

**Issue:** The controller validates the request shape via `GrammarSessionCompleteSchema.parse(body)` (Zod), but the service inserts `GrammarAttempt` rows for any `questionId` supplied by the client — it does not verify these questions actually belong to `lessonId`. An authenticated user can record attempts (including `isCorrect: true`) for questions from other lessons or topics, inflating their mastery on topics they have never studied. This is an authorization gap — not SQL injection (Prisma parameterizes), but fabricated progress data.

**Fix:** Add an existence check before the bulk insert:

```typescript
const questionIds = attempts.map((a) => a.questionId);
const validQuestions = await this.prisma.grammarQuestion.findMany({
  where: { id: { in: questionIds }, lesson: { id: lessonId } },
  select: { id: true },
});
if (validQuestions.length !== questionIds.length) {
  throw new BadRequestException('One or more question IDs do not belong to this lesson');
}
```

---

### WR-02: Multiple-choice shuffle is a no-op — options always in insertion order

**File:** `apps/web/src/components/grammar/multiple-choice-exercise.tsx:31`

**Issue:** The shuffle is `all.slice().sort(() => 0)`. A comparator that always returns `0` signals "equal" for every pair — browsers are not required to permute the array, and in practice V8's TimSort does not permute elements with a constant-zero comparator. Options will always appear in insertion order: `[answer, distractors[0], distractors[1], ...]`. The correct answer is always the first option, making the exercise trivially solvable by always picking the first button.

**Fix:** Use a proper Fisher-Yates shuffle:

```typescript
const [options] = useState<string[]>(() => {
  const all = [answer, ...distractors];
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j]!, all[i]!];
  }
  return all;
});
```

---

### WR-03: submitSession swallows errors silently — user sees "results" with no score on network failure

**File:** `apps/web/src/components/grammar/grammar-lesson-page.tsx:194-199`

**Issue:** The `catch` block in `submitSession` is empty. When the POST to `/api/grammar/sessions/complete` fails (network error, 5xx, timeout), `setSubmitting(false)` and `setPhase("results")` still run in `finally`, but `sessionResult` remains `null`. The results screen renders the "Could not save your progress" banner but still shows `score` and `total` computed locally. The silent catch means no error is logged, no retry is offered, and progress is permanently lost without any user-actionable path.

**Fix:** At minimum, log the error and consider a retry mechanism:

```typescript
} catch (err) {
  console.error('[GrammarSession] Failed to submit session:', err);
  // sessionResult stays null — the UI already shows the save-failed banner
} finally {
```

---

### WR-04: `parsePrompt` emits empty text segments, causing spurious `<span>` elements

**File:** `apps/web/src/components/grammar/drag-and-drop-exercise.tsx:92-102`

**Issue:** `parsePrompt` skips empty `part` values (`if (part) { ... }`), but `Array.prototype.split` on a string that starts with `___` (e.g. `"___ is correct"`) produces `["", " is correct"]`. The first element is falsy and is skipped correctly. However, a prompt ending with `___` produces a trailing empty string that is also falsy and skipped. This is correct by accident. More critically, `seg.index` is assigned as `blankIndex++` but the `index` field is only set on `blank` segments — text segments get `index: undefined`. The render code guards with `seg.index ?? 0`, which means if a text segment is somehow rendered as a blank (impossible today but fragile), it would silently target blank 0. Low impact now but a latent logic error.

A more concrete issue: when the prompt has **no `___`** (malformed seed data), `blankCount` is 0, `answerParts` may still contain values, and the `Check` button is permanently disabled (`hasUnfilledBlanks` is false only when `Object.keys(blankFills).length >= blankCount` — with `blankCount = 0` this is always true so the button is always enabled). The `handleCheck` loop runs 0 iterations, sets `allCorrect = true`, and calls `onCorrect()` — any drag-and-drop question with a missing `___` in its prompt awards a free correct answer.

**Fix:** Add a guard in `handleCheck` or in the parent's `renderExercise` fallback:

```typescript
if (blankCount === 0) {
  // Malformed question — treat as incorrect rather than auto-correct
  onIncorrect();
  return;
}
```

---

## Info

### IN-01: `GrammarSessionCompleteSchema` does not cap `attempts` array length

**File:** `packages/shared/src/grammar.dto.ts:82-90`

**Issue:** `attempts` is `z.array(...)` with no `.max()`. A client can POST thousands of attempt records in one request. This reaches `prisma.grammarAttempt.createMany` unbounded. While not an immediate crash, it is an easy way for an authenticated user to fill the `GrammarAttempt` table.

**Fix:** Add a reasonable upper bound:
```typescript
attempts: z.array(z.object({ ... })).min(1).max(200),
```

---

### IN-02: `timeTakenMs` from `grammar-lesson-page.tsx` is computed at render time, not at submit time

**File:** `apps/web/src/components/grammar/grammar-lesson-page.tsx:216`

**Issue:** `const timeTakenMs = Date.now() - startTime.current;` is computed at the top of the render function (outside all phase guards), so it is recomputed on every render during the results phase. The value passed to `GrammarSessionResults` grows with each re-render of the parent. The accurate time is captured inside `submitSession` (line 179) but that value is not stored in state — it's a local variable.

**Fix:** Store `timeTakenMs` in a ref or state when `submitSession` is called:

```typescript
const timeTakenMsRef = useRef<number>(0);

const submitSession = async (finalAttempts: Attempt[]) => {
  timeTakenMsRef.current = Date.now() - startTime.current;
  ...
};

// In results phase:
<GrammarSessionResults timeTakenMs={timeTakenMsRef.current} ... />
```

---

### IN-03: `GrammarLessonDtoSchema` does not include `questionCount` — extension is inline and not exported

**File:** `packages/shared/src/grammar.dto.ts:70-75`

**Issue:** `GrammarTopicDetailDtoSchema` extends `GrammarLessonDtoSchema` inline with `.extend({ questionCount: z.number() })` but the extended schema is anonymous (not exported). Consumer code that wants to validate a lesson-with-count must either re-derive it or use the parent `GrammarTopicDetailDtoSchema`. This is a minor discoverability issue, not a runtime bug.

**Fix:** Export the extended schema:
```typescript
export const GrammarLessonWithCountDtoSchema = GrammarLessonDtoSchema.extend({
  questionCount: z.number(),
});
```

---

_Reviewed: 2026-06-14T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
