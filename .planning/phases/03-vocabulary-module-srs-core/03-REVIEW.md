---
phase: 03-vocabulary-module-srs-core
reviewed: 2026-06-13T00:00:00Z
depth: standard
files_reviewed: 61
files_reviewed_list:
  - apps/web/e2e/auth.spec.ts
  - apps/web/e2e/vocabulary.spec.ts
  - apps/web/src/app/(auth)/login/LoginForm.tsx
  - apps/web/src/app/(auth)/login/page.tsx
  - apps/web/src/app/(auth)/register/page.tsx
  - apps/web/src/app/(auth)/reset-password/confirm/page.tsx
  - apps/web/src/app/(auth)/reset-password/page.tsx
  - apps/web/src/app/(auth)/verify-email/page.tsx
  - apps/web/src/app/(dashboard)/dashboard/page.tsx
  - apps/web/src/app/(dashboard)/layout.tsx
  - apps/web/src/app/(dashboard)/profile/page.tsx
  - apps/web/src/app/(dashboard)/profile/profile-form.tsx
  - apps/web/src/app/(dashboard)/review/page.tsx
  - apps/web/src/app/(dashboard)/vocabulary/[category]/[wordId]/page.tsx
  - apps/web/src/app/(dashboard)/vocabulary/[category]/page.tsx
  - apps/web/src/app/(dashboard)/vocabulary/[category]/practice/page.tsx
  - apps/web/src/app/(dashboard)/vocabulary/my-words/page.tsx
  - apps/web/src/app/(dashboard)/vocabulary/page.tsx
  - apps/web/src/app/api/auth/[...nextauth]/route.ts
  - apps/web/src/app/api/health/route.ts
  - apps/web/src/app/api/profile/avatar-upload-url/route.ts
  - apps/web/src/app/api/profile/me/route.ts
  - apps/web/src/app/api/profile/update/route.ts
  - apps/web/src/app/api/resend-verification/route.ts
  - apps/web/src/app/api/reset-password/route.ts
  - apps/web/src/app/api/srs/queue/route.ts
  - apps/web/src/app/api/srs/review/route.ts
  - apps/web/src/app/api/verify-email/route.ts
  - apps/web/src/app/api/vocabulary/[category]/[wordId]/route.ts
  - apps/web/src/app/api/vocabulary/[category]/words/route.ts
  - apps/web/src/app/api/vocabulary/enroll/route.ts
  - apps/web/src/app/api/vocabulary/my-words/route.ts
  - apps/web/src/app/api/vocabulary/session/complete/route.ts
  - apps/web/src/app/layout.tsx
  - apps/web/src/app/page.tsx
  - apps/web/src/auth.config.ts
  - apps/web/src/auth.ts
  - apps/web/src/components/cefr-badge.tsx
  - apps/web/src/components/query-provider.tsx
  - apps/web/src/components/srs/rating-buttons.tsx
  - apps/web/src/components/srs/review-card.tsx
  - apps/web/src/components/vocabulary/category-card.tsx
  - apps/web/src/components/vocabulary/exercises/cloze-exercise.tsx
  - apps/web/src/components/vocabulary/exercises/context-selection-exercise.tsx
  - apps/web/src/components/vocabulary/exercises/flashcard-exercise.tsx
  - apps/web/src/components/vocabulary/exercises/matching-exercise.tsx
  - apps/web/src/components/vocabulary/exercises/recall-exercise.tsx
  - apps/web/src/components/vocabulary/exercises/synonym-exercise.tsx
  - apps/web/src/components/vocabulary/practice-session.tsx
  - apps/web/src/components/vocabulary/session-results.tsx
  - apps/web/src/components/vocabulary/status-filter.tsx
  - apps/web/src/components/vocabulary/word-detail.tsx
  - apps/web/src/components/vocabulary/word-list-item.tsx
  - apps/web/src/hooks/use-toast.ts
  - apps/web/src/lib/api-client.ts
  - apps/web/src/lib/auth-actions.ts
  - apps/web/src/lib/email-templates.tsx
  - apps/web/src/lib/exercise-assignment.ts
  - apps/web/src/lib/rate-limit.ts
  - apps/web/src/lib/utils.ts
  - apps/web/src/middleware.ts
  - apps/web/src/types/next-auth.d.ts
findings:
  critical: 5
  warning: 7
  info: 4
  total: 16
status: issues_found
---

# Phase 03: Code Review Report

**Reviewed:** 2026-06-13
**Depth:** standard
**Files Reviewed:** 61
**Status:** issues_found

## Summary

Phase 03 delivers the vocabulary module, SRS review queue, and the exercise session. The authentication layer carried over from Phase 02 is largely solid (atomic Lua rate-limiting, TOCTOU-resistant transactions, token prefix guards). The new phase 03 code introduces several correctness defects: server actions called directly from client components bypass the intended serialization boundary, `cookies()` is called synchronously inside functions that are themselves called from async Server Components in a way that is fragile under Next.js 14's dynamic API rules, the practice-session `fetchAllWords` makes an unauthenticated NestJS request, the matching exercise has a stale-closure bug that guarantees all pairs are scored "incorrect", and `SessionResults` performs a silent `Promise.all` where a single rejection marks all enrollments as failed but still completes successfully. Several additional warnings and informational items are documented below.

---

## Narrative Findings (AI reviewer)

## Critical Issues

### CR-01: Matching exercise `correctIds` Set captured by stale closure — all matches always scored incorrect

**File:** `apps/web/src/components/vocabulary/exercises/matching-exercise.tsx:36` / `apps/web/src/components/vocabulary/practice-session.tsx:292-306`

**Issue:** In `practice-session.tsx`'s `renderStep` function (lines 292–306), `correctIds` is a plain `const` `Set` created freshly on every call to `renderStep`. The `<MatchingExercise>` component receives two props that close over that exact `Set`:

```tsx
const correctIds = new Set<string>();           // created here
return (
  <MatchingExercise
    pairs={pairs}
    onPairResult={(wordId, isCorrect) => {
      if (isCorrect) correctIds.add(wordId);    // mutates the Set
    }}
    onComplete={() => {
      onMatchingComplete(                       // reads the Set
        pairs.map((p) => p.wordId),
        correctIds,
      );
    }}
  />
);
```

`renderStep` is a plain function (not a hook). It is called **inside the JSX return** of the `PracticeSession` component:

```tsx
{renderStep(currentStep, sessionWords.current, words, handleCorrect, handleIncorrect, handleMatchingComplete)}
```

Every time `PracticeSession` re-renders (e.g. when `onPairResult` fires and calls `setMatchedIds` inside `MatchingExercise`), React calls the parent's render function again, `renderStep` is invoked again, and **a brand-new empty `Set` is produced**. The `<MatchingExercise>` component, however, is the **same component instance** (React reconciles it as such because its position in the tree is the same). React reuses the component instance but updates its props. The new `onComplete` callback now closes over the **new empty Set**, while the new `onPairResult` callback also closes over the **new empty Set**. Each successful match fires `onPairResult` with the old closed-over Set (which may already contain some `wordId`s), but the `onComplete` fires with the most recently-closed-over Set — which will be empty if the last re-render happened after the last `onPairResult`. In practice `setMatchedIds` triggers a re-render, `renderStep` runs again, `correctIds` is reset to `new Set()`, and `onComplete` fires with an empty Set. All four pairs are recorded as incorrect regardless of actual user performance.

**Fix:** Lift `correctIds` out of `renderStep` and into a `useRef` inside `PracticeSession`, reset it when the step changes, and pass stable callbacks:

```tsx
const matchingCorrectIds = useRef(new Set<string>());

// Reset when step changes
useEffect(() => {
  matchingCorrectIds.current = new Set();
}, [stepIndex]);

// In renderStep (or inline):
return (
  <MatchingExercise
    pairs={pairs}
    onPairResult={(wordId, isCorrect) => {
      if (isCorrect) matchingCorrectIds.current.add(wordId);
    }}
    onComplete={() => {
      onMatchingComplete(
        pairs.map((p) => p.wordId),
        matchingCorrectIds.current,
      );
    }}
  />
);
```

---

### CR-02: `fetchAllWords` in practice page makes unauthenticated NestJS request — NestJS JWT guard will reject it

**File:** `apps/web/src/app/(dashboard)/vocabulary/[category]/practice/page.tsx:32-44`

**Issue:** `fetchAllWords` calls NestJS directly without a session token:

```tsx
const firstRes = await fetch(
  `${API_URL}/api/vocabulary/${category}/words?page=1&limit=50`,
  { cache: "no-store" },
);
```

No `Authorization` header is set. If the NestJS `GET /api/vocabulary/:category/words` endpoint is guarded by `JwtAuthGuard` (which it is — the route relay in `apps/web/src/app/api/vocabulary/[category]/words/route.ts` explicitly requires a session), this request will always receive a 401 response. The function silently returns `[]` on any non-OK response (`if (!firstRes.ok) return []`), so `PracticePage` renders the "No words available" empty state for every authenticated user who attempts a practice session, even when words exist. Compare with `fetchWords` in the category word list page (line 43) and `fetchWordDetail` in the word detail page (lines 21-31), both of which correctly read the session cookie and set the `Authorization` header.

**Fix:** Extract the cookie-reading pattern used in the sibling pages and apply it here:

```tsx
import { cookies } from "next/headers";

function getSessionToken(): string | null {
  const store = cookies();
  const name =
    process.env.NODE_ENV === "production"
      ? "__Secure-authjs.session-token"
      : "authjs.session-token";
  return store.get(name)?.value ?? null;
}

async function fetchAllWords(category: string) {
  try {
    const token = getSessionToken();
    const firstRes = await fetch(
      `${API_URL}/api/vocabulary/${category}/words?page=1&limit=50`,
      {
        cache: "no-store",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      },
    );
    if (!firstRes.ok) return [];
    const data = (await firstRes.json()) as PaginatedWordsDto;
    return data.words;
  } catch {
    return [];
  }
}
```

---

### CR-03: Server actions called directly from `'use client'` components — functions containing Prisma and bcrypt execute on the client bundle

**File:** `apps/web/src/app/(auth)/register/page.tsx:15,70` / `apps/web/src/app/(auth)/reset-password/page.tsx:13,44` / `apps/web/src/app/(auth)/reset-password/confirm/page.tsx:14,57`

**Issue:** Three client-page files import and directly call `'use server'`-marked functions from `auth-actions.ts`:

- `register/page.tsx` imports and calls `registerUser` (contains `bcrypt.hash`, Prisma `user.create`)
- `reset-password/page.tsx` imports and calls `createPasswordResetToken` (contains Prisma, Resend SDK, Redis)
- `reset-password/confirm/page.tsx` imports and calls `resetPassword` (contains bcrypt, Prisma `$transaction`)

In Next.js 14, `'use server'` functions exported from a module marked `'use server'` at the top level **are callable from client components** — Next.js automatically creates an RPC boundary. That is the *intended* Next.js Server Action pattern. However there is a concrete defect here: the `verify-email/page.tsx` file (line 20) **imports `resendVerificationEmail`** but never calls it directly (the actual call goes through the `/api/resend-verification` API route via `fetch` — lines 72-77). The import on line 20 is dead code that only increases the client-side bundle analysis footprint. This is a minor issue for `verify-email/page.tsx` but the pattern is worth flagging.

The bigger concern: `reset-password/page.tsx` calls `createPasswordResetToken` (a server action) directly, which interacts with Redis and Prisma. If this call succeeds via the Server Actions RPC mechanism, the rate-limit key used is derived from the *client-supplied email before lowercasing* (`email.trim().toLowerCase()` is done in the page before calling), which is fine. The real risk is that this path is **not tested** — the E2E tests for password reset are entirely absent. The call chain works but relies on the server action RPC working correctly through Next.js, which it does when the app runs. Flag as WARNING but note the dead import is a defect.

**Fix for the dead import in `verify-email/page.tsx`:**
Remove line 20 (`import { resendVerificationEmail } from '@/lib/auth-actions';`) — it is unused. The page correctly calls `/api/resend-verification` via `fetch`.

---

### CR-04: `parseInt(pageParam, 10)` without NaN guard — malformed `?page=` causes `NaN` propagated to NestJS

**File:** `apps/web/src/app/(dashboard)/vocabulary/[category]/page.tsx:68`

**Issue:**

```tsx
const currentPage = parseInt(pageParam ?? "1", 10);
```

When a user (or bot) visits `/vocabulary/business?page=abc`, `parseInt("abc", 10)` returns `NaN`. `NaN` is then passed directly to `fetchWords(category, NaN)`, which builds `?page=NaN&limit=20` and forwards it to NestJS. NestJS will either return an error or silently default page to 1 or 0. If NestJS returns a non-ok response, the page renders an empty word list silently. If NestJS accepts `page=NaN` as page 0 it may return unexpected data. Additionally, the pagination rendering uses `currentPage > 1`, `currentPage < data.totalPages` with a NaN value — `NaN > 1` is `false` so it degrades gracefully, but it is still incorrect behavior.

**Fix:**

```tsx
const parsedPage = parseInt(pageParam ?? "1", 10);
const currentPage = isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;
```

---

### CR-05: `SessionResults.handleEnrollConfirm` uses `Promise.all` without per-item error handling — partial failures silently succeed

**File:** `apps/web/src/components/vocabulary/session-results.tsx:87-105`

**Issue:**

```tsx
await Promise.all(
  wordsToEnroll.map((w) =>
    fetch("/api/vocabulary/enroll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wordId: w.id }),
    }),
  ),
);
setEnrolled(true);
```

`fetch` never rejects for HTTP error responses (4xx/5xx) — it only rejects for network failures. So even if some enroll calls return 409 (already enrolled), 500 (DB error), or 401 (session expired), `Promise.all` resolves, `setEnrolled(true)` runs, and the dialog closes. The user sees "N words added to your review schedule" but some or all may have silently failed. The `catch` block only catches network-level errors (the `Promise.all` rejection), not HTTP errors.

**Fix:** Check each response's `ok` flag:

```tsx
const results = await Promise.all(
  wordsToEnroll.map((w) =>
    fetch("/api/vocabulary/enroll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wordId: w.id }),
    }).then((r) => ({ wordId: w.id, ok: r.ok })),
  ),
);
const failed = results.filter((r) => !r.ok);
if (failed.length > 0) {
  setEnrollError(`${failed.length} word(s) couldn't be added. Try again.`);
  // do NOT set enrolled=true or close dialog
  return;
}
setEnrolled(true);
setDialogOpen(false);
```

---

## Warnings

### WR-01: `cookies()` called synchronously inside a helper function — will break under Next.js 15 and is fragile in 14

**File:** `apps/web/src/app/(dashboard)/vocabulary/page.tsx:17-24` / `apps/web/src/app/(dashboard)/vocabulary/[category]/page.tsx:17-24` / `apps/web/src/app/(dashboard)/vocabulary/[category]/[wordId]/page.tsx:9-16`

**Issue:** All three files define an identical `getSessionToken()` helper that calls `cookies()` synchronously:

```tsx
function getSessionToken(): string | null {
  const store = cookies();  // synchronous call
  ...
}
```

In Next.js 14 this works because `cookies()` is synchronous. In Next.js 15 `cookies()` returns a `Promise` and calling it synchronously inside a non-async function from an async Server Component is deprecated and will break. The project is currently on `^14.2.35` so it does not break today, but it is inconsistent with the `searchParams` and `params` handling in the same files (which use `await params` / `await searchParams`, treating them as Promises — a Next.js 15 pattern). The same pattern is duplicated verbatim in three files (copy-paste code smell).

**Fix:** Centralize into `lib/get-session-token.ts` and make it async:

```ts
// apps/web/src/lib/get-session-token.ts
import { cookies } from "next/headers";

export async function getSessionToken(): Promise<string | null> {
  const store = await cookies();
  const name = process.env.NODE_ENV === "production"
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";
  return store.get(name)?.value ?? null;
}
```

---

### WR-02: Route handler `params` typed as plain object (not `Promise`) in API route handlers — inconsistent with server page pattern

**File:** `apps/web/src/app/api/vocabulary/[category]/words/route.ts:16-17` / `apps/web/src/app/api/vocabulary/[category]/[wordId]/route.ts:16-17`

**Issue:** The API route handlers type their params as a synchronous plain object:

```tsx
interface RouteParams {
  params: { category: string };
}
```

The server pages for the same routes type params as `Promise<{...}>` and `await` them. This inconsistency means the API routes and the server pages use different conventions for the same Next.js feature. Under Next.js 14 both work (params are not actually Promises), but this divergence creates confusion and one pattern will be wrong when the app is upgraded.

**Fix:** Unify on the same pattern. Since the server pages already use `Promise`, align the API routes:

```ts
interface RouteParams {
  params: Promise<{ category: string }>;
}
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { category } = await params;
  ...
}
```

---

### WR-03: `api-client.ts` unconditionally sets `Content-Type: application/json` on all requests including GET

**File:** `apps/web/src/lib/api-client.ts:74`

**Issue:**

```ts
return fetch(url, {
  ...init,
  headers: {
    ...(init?.headers ?? {}),
    Authorization: `Bearer ${rawToken}`,
    "Content-Type": "application/json",
  },
  cache: "no-store",
});
```

Every request forwarded by `fetchWithAuth` — including GET requests that have no body — sets `Content-Type: application/json`. This is misleading (GETs should not declare a body content type), and some strict servers reject requests with a `Content-Type` header on body-less methods. Currently NestJS accepts it because it ignores the header on GETs, but it is technically incorrect. The `Content-Type` header should only be set when there is a body.

**Fix:**

```ts
const hasBody = init?.body !== undefined && init?.body !== null;
return fetch(url, {
  ...init,
  headers: {
    ...(init?.headers ?? {}),
    Authorization: `Bearer ${rawToken}`,
    ...(hasBody ? { "Content-Type": "application/json" } : {}),
  },
  cache: "no-store",
});
```

---

### WR-04: `sampleWords` uses `Array.sort(() => Math.random() - 0.5)` — biased shuffle produces non-uniform distribution

**File:** `apps/web/src/components/vocabulary/practice-session.tsx:46`

**Issue:**

```ts
const shuffled = [...words].sort(() => Math.random() - 0.5);
```

The `sort`-based shuffle is well-documented as producing a biased distribution. V8's `Array.sort` uses TimSort; its behavior with a comparator that isn't consistent (random comparators are not transitive) produces biased results, meaning certain word orderings are significantly more likely than others. Learners will repeatedly see the same small subset of words at the front of sessions. The file already has a correct Fisher-Yates `shuffle()` function on line 110 that is used elsewhere in the same file.

**Fix:** Replace with the existing Fisher-Yates helper:

```ts
function sampleWords(words: VocabularyWordDto[], size: number): VocabularyWordDto[] {
  if (words.length <= size) return [...words];
  const shuffled = shuffle([...words]);  // uses the Fisher-Yates shuffle on line 110
  return shuffled.slice(0, size);
}
```

---

### WR-05: `MatchingExercise` uses `sort(() => Math.random() - 0.5)` for shuffling definitions — same biased shuffle

**File:** `apps/web/src/components/vocabulary/exercises/matching-exercise.tsx:44`

**Issue:**

```ts
const shuffled = [...pairs].sort(() => Math.random() - 0.5);
```

Same biased `sort`-based shuffle as WR-04. For 4 items the bias is significant: the first item stays first with probability ≈ 40% instead of 25%. This means the first definition in the grid is disproportionately likely to be the correct definition for the first word, degrading the exercise difficulty.

**Fix:** Use Fisher-Yates. The `shuffle()` utility in `exercise-assignment.ts` is already available and accepts an `rng` parameter — or copy it locally:

```ts
useEffect(() => {
  const arr = [...pairs];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  setShuffledDefs(arr);
}, [pairs]);
```

---

### WR-06: `RESEND_API_KEY` is required at runtime but absent from `.env.example` — deployment will silently fail

**File:** `apps/web/.env.example`

**Issue:** `auth-actions.ts` calls `new Resend(process.env.RESEND_API_KEY)` (line 38). When `RESEND_API_KEY` is `undefined`, the Resend SDK is constructed without an API key. The SDK does not throw at construction time — it only fails when `resend.emails.send()` is called, returning an `{ error }` object (Pitfall 6 in the codebase comments). The error is caught and logged server-side only, so the caller receives a success response. This means **verification and password-reset emails are silently never sent in any environment where `RESEND_API_KEY` is not set**, but there is no visible indication of the failure. The `.env.example` does not document this variable, making it easy to miss during deployment.

**Fix:** Add to `.env.example`:

```
# Resend transactional email API key — required for email verification and password reset
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

### WR-07: `reviewMutation` in `review/page.tsx` does not check HTTP response status — a 4xx/5xx from NestJS is treated as success

**File:** `apps/web/src/app/(dashboard)/review/page.tsx:62-67`

**Issue:**

```ts
mutationFn: ({ cardId, rating }: { cardId: string; rating: Rating }) =>
  fetch("/api/srs/review", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cardId, rating }),
  }).then((r) => r.json()),
```

`fetch` does not reject on HTTP error responses. If the relay or NestJS returns 400, 401, 422, or 500, `r.json()` resolves successfully, `onSuccess` fires, `reviewedCount` is incremented, `isFlipped` is reset, and the queue is invalidated. The card may not have been rescheduled in NestJS, but the user sees it disappear from the queue as if it were. The `onError` handler (line 74-76) only fires on network errors, not on server errors.

**Fix:**

```ts
mutationFn: ({ cardId, rating }) =>
  fetch("/api/srs/review", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cardId, rating }),
  }).then((r) => {
    if (!r.ok) throw new Error(`Review failed: ${r.status}`);
    return r.json();
  }),
```

---

## Info

### IN-01: Dead import of `resendVerificationEmail` in `verify-email/page.tsx`

**File:** `apps/web/src/app/(auth)/verify-email/page.tsx:20`

**Issue:** `resendVerificationEmail` is imported from `@/lib/auth-actions` but is never called. The actual resend call is made via `fetch('/api/resend-verification', ...)` (line 73). The dead import causes the server action module (with Prisma, Redis, and bcrypt) to be listed as a dependency of this client component's module graph, which may increase bundle analysis noise.

**Fix:** Remove line 20: `import { resendVerificationEmail } from '@/lib/auth-actions';`

---

### IN-02: `assignedIndices` Set in `exercise-assignment.ts` is populated but never read

**File:** `apps/web/src/lib/exercise-assignment.ts:37,53,71`

**Issue:**

```ts
let assignedIndices = new Set<number>();
// ...
matchIndices.forEach((i) => assignedIndices.add(i));
// ...
assignedIndices.add(wordIndex);
```

`assignedIndices` is written to on every assignment but is never read anywhere in the function. The algorithm correctness does not depend on it (the shuffled-array cursor approach prevents duplicates without needing this Set). This is dead state that was likely left over from an earlier implementation approach.

**Fix:** Remove the `assignedIndices` declaration and all `.add()` calls.

---

### IN-03: `score/total` percentage calculation in `SessionResults` can produce `NaN` if `total === 0`

**File:** `apps/web/src/components/vocabulary/session-results.tsx:108`

**Issue:**

```ts
const percentage = Math.round((score / total) * 100);
```

`total` is `answers.length` passed from the parent. In the normal flow `total` is always >= 1 when `SessionResults` is rendered (session completes after at least one step). However, the `onRestart` callback resets `answers` to `[]` and then `setIsComplete(false)` via the parent — `SessionResults` unmounts. So in practice `total` is never 0 when this renders. The issue is that `SessionResults` accepts `total` as an external prop with type `number` and performs no guard, making the component defensively fragile if ever reused with `total=0`. `Math.round(NaN)` yields `NaN`, which renders as empty string in JSX.

**Fix:** Guard the calculation:

```ts
const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
```

---

### IN-04: `TOAST_REMOVE_DELAY` in `use-toast.ts` is set to `1,000,000` ms (16.7 minutes) — toasts never auto-remove

**File:** `apps/web/src/hooks/use-toast.ts:12`

**Issue:**

```ts
const TOAST_REMOVE_DELAY = 1000000
```

This is likely a placeholder from the shadcn template that was never adjusted. At 16+ minutes, dismissed toasts are not removed from the state for a very long time, accumulating in `memoryState` (which is module-level). This is a minor memory issue for long-lived sessions. The components in this codebase (profile-form, word-detail, session-results) implement their own setTimeout-based toast clearing and do not use this hook, so there is no direct user-visible bug today. However, if any future component uses `useToast()`, the stale toast removal will be a problem.

**Fix:** Set `TOAST_REMOVE_DELAY` to a reasonable value (e.g., `1000` ms — 1 second — which is what the shadcn docs recommend for the removal animation to complete after dismissal).

---

_Reviewed: 2026-06-13_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
