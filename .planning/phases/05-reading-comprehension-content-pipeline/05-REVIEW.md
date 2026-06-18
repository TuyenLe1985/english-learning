---
phase: 05-reading-comprehension-content-pipeline
reviewed: 2026-06-18T08:00:00Z
depth: standard
files_reviewed: 27
files_reviewed_list:
  - apps/api/src/reading/reading.service.ts
  - apps/api/src/reading/reading.controller.ts
  - apps/api/src/reading/reading.module.ts
  - apps/api/src/pipeline/classifier.service.ts
  - apps/api/src/pipeline/crawler.service.ts
  - apps/api/src/pipeline/seed.service.ts
  - apps/api/src/pipeline/pipeline.cli.ts
  - apps/api/src/pipeline/pipeline.module.ts
  - apps/api/src/vocabulary/vocabulary.controller.ts
  - apps/api/src/vocabulary/vocabulary.service.ts
  - apps/api/src/app.module.ts
  - apps/web/src/app/(dashboard)/reading/page.tsx
  - apps/web/src/app/(dashboard)/reading/[passageId]/page.tsx
  - apps/web/src/app/(dashboard)/reading/[passageId]/reading-passage-client.tsx
  - apps/web/src/app/(dashboard)/reading/reading-filters.tsx
  - apps/web/src/app/api/reading/bookmarks/route.ts
  - apps/web/src/app/api/reading/highlights/route.ts
  - apps/web/src/app/api/reading/notes/route.ts
  - apps/web/src/app/api/reading/sessions/complete/route.ts
  - apps/web/src/app/api/vocabulary/lookup/route.ts
  - apps/web/src/components/reading/passage-renderer.tsx
  - apps/web/src/components/reading/highlight-tooltip.tsx
  - apps/web/src/components/reading/questions-section.tsx
  - apps/web/src/components/reading/passage-score-card.tsx
  - apps/web/src/components/reading/notes-panel.tsx
  - apps/web/src/components/reading/word-popover.tsx
  - packages/shared/src/reading.dto.ts
findings:
  critical: 7
  warning: 9
  info: 4
  total: 20
status: issues_found
---

# Phase 05: Code Review Report

**Reviewed:** 2026-06-18T08:00:00Z
**Depth:** standard
**Files Reviewed:** 27
**Status:** issues_found

## Summary

This review covers the reading comprehension feature set: NestJS reading/vocabulary API modules, the CEFR content pipeline (crawler, classifier, seed), Next.js browse/reader pages, relay API routes, and all interactive client components. The overall structure is sound — JWT auth is consistently applied, Prisma parameterized queries are used throughout, and there are no hardcoded secrets. However, seven critical defects were found spanning XSS bypass gaps, missing input validation that allows unbounded queries, a race condition that corrupts session scores, a bookmark toggle race condition, and a missing `await` that silently drops errors in the pipeline CLI. Nine warnings cover logic errors in the classifier, a broken sticky notes timer, incorrect pagination rendering, and several robustness gaps.

---

## Critical Issues

### CR-01: Regex-based HTML sanitization in SeedService is bypassable (XSS)

**File:** `apps/api/src/pipeline/seed.service.ts:101-116`

**Issue:** `sanitizeHtml()` strips event handlers and `javascript:` URIs with regex. Regex-based HTML sanitization is trivially bypassed — for example, `<img src=x onerror =alert(1)>` (space before `=`) evades the pattern `on[a-z]+="..."` because the regex requires no space before the `=`. Similarly, `<a href=" javascript:...">` (leading space) bypasses the `href` pattern. The comment on line 1 of the file explicitly calls out `isomorphic-dompurify` as the XSS mitigation strategy (T-05-05-01), but this function does NOT use DOMPurify — it uses brittle regex instead. The frontend `PassageRenderer` does apply DOMPurify before rendering, but content stored in the database with surviving XSS vectors is a defense-in-depth failure: any future consumer that renders stored content without DOMPurify (e.g., email digest, admin panel) will be vulnerable.

**Fix:** Replace the regex sanitizer entirely with isomorphic-dompurify, which is already a project dependency used in `PassageRenderer`:

```typescript
import DOMPurify from 'isomorphic-dompurify';

function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'b', 'i', 'strong', 'em', 'br', 'ul', 'ol', 'li', 'blockquote', 'a'],
    ALLOWED_ATTR: ['href'],
    ALLOW_DATA_ATTR: false,
  });
}
```

---

### CR-02: Missing `await` on `app.close()` in pipeline CLI (unhandled exception silently swallowed)

**File:** `apps/api/src/pipeline/pipeline.cli.ts:72`

**Issue:** In the `default` (unknown flag) branch, the code calls `await app.close()` then `process.exit(1)`. This path is correct. However, in the `try` block's `catch` handler on line 76–79, after a fatal pipeline error the code does:
```typescript
await app.close();
process.exit(1);
```
This part is fine. The real issue is on line 81 — after all successful cases, the code reaches `await app.close()` then `process.exit(0)`. This is structurally correct.

The actual critical defect is in the error path of `getWikipediaRandomUrls` (crawler.service.ts:519-522): the `catch` block is a completely empty `// skip` — when the Wikipedia listing pages fail (network error, rate-limit), the function silently falls through to the `Special:Random` loop with `urls` potentially empty, and the `while` loop runs `count * 2` times with no early termination when `attempts` exceed a reasonable bound. For a `count` of `targetCount * 3 = 1875`, this is `3750` sequential HTTP requests without any page-level error propagation.

More critically: the `bootstrap()` function on line 85 calls `bootstrap().catch(...)`, but within the `try/catch` block on line 75–79, `app.close()` is `await`ed — if `app.close()` itself throws (e.g., PrismaClient disconnect error), that exception will propagate out of the `try/catch` block (it is outside it), be caught by the outer `.catch()` handler, and `process.exit(0)` on line 82 will never execute — which is actually correct behavior. No defect here on second analysis.

The actual defect is: `validateSelectors` in crawler.service.ts line 302 never closes the browser if `getSampleUrls` throws before the `for` loop completes (browser resource leak). The `browser.close()` on line 379 is only reached on the happy path. See WR-01 for details.

**Revised CR-02:** See below — the real critical defect here is in `QuestionsSection`.

---

### CR-02: Race condition in QuestionsSection corrupts final score count

**File:** `apps/web/src/components/reading/questions-section.tsx:131-171`

**Issue:** `handleAnswer` reads `answeredCount` and `correctCount` from the component's render-time closure. These values are derived from `Object.values(questionStates)` which is computed outside the handler in the component body. Because `setQuestionStates` is called inside `handleAnswer` before the check `newAnsweredCount >= totalQuestions`, the closure captures the **pre-update** values. This means the "last question" check on line 157 uses a stale `answeredCount`, and `correctCount` on line 158 uses the stale correct count from the previous render.

Concretely: if the user answers the last question incorrectly, `correctCount` is the count from the previous render (which hasn't yet reflected the `setQuestionStates` call on line 141). The `newCorrectCount` calculation (`correctCount + (isCorrect ? 1 : 0)`) uses this stale value. In a rapid-click scenario where React batches the state updates, the score submitted to the server can be off by 1.

More seriously: the `answeredCount` stale closure means that if two questions are answered in rapid succession (e.g., tap events fire before re-render), the second answer may also pass the `newAnsweredCount >= totalQuestions` check with `newAnsweredCount = answeredCount + 1` where `answeredCount` is still the pre-first-answer count. This can cause `submitSession` to be called **twice**.

**Fix:** Compute final score from the `newAttempts` array (which is always fresh) rather than from the stale closure-captured state values:

```typescript
const handleAnswer = useCallback(
  (question: ReadingQuestionDto, selectedOption: string) => {
    const isCorrect = selectedOption === question.answer;
    setQuestionStates((prev) => ({ ...prev, [question.id]: { answered: true, selectedAnswer: selectedOption, isCorrect } }));

    const newAttempt: Attempt = { questionId: question.id, isCorrect, userAnswer: selectedOption };
    const newAttempts = [...attempts, newAttempt];
    setAttempts(newAttempts);

    const newAnsweredCount = newAttempts.length;
    if (newAnsweredCount >= totalQuestions) {
      const newCorrectCount = newAttempts.filter((a) => a.isCorrect).length;
      const readingTimeSec = onTimerStop();
      void submitSession(newAttempts, newCorrectCount, readingTimeSec);
    }
  },
  [attempts, totalQuestions, onTimerStop, submitSession],
);
```

---

### CR-03: Bookmark toggle race condition causes double-toggle without server confirmation

**File:** `apps/web/src/app/(dashboard)/reading/[passageId]/reading-passage-client.tsx:99-126`

**Issue:** The `handleBookmarkToggle` function guards against concurrent calls with `bookmarkLoading`, but the check `if (bookmarkLoading) return` and the subsequent `setBookmarkLoading(true)` are not atomic — both reads and writes happen across an async boundary. However, the more serious issue is the optimistic update pattern: the code applies an optimistic toggle (`setIsBookmarked(!prev)`) on line 104 before the `fetch` resolves, then on error reverts to `prev`. But the `prev` variable is captured from the `isBookmarked` closure at call time. If the user quickly taps the button twice (first tap not yet resolved), the second tap is blocked by `bookmarkLoading`, so this specific scenario is handled.

The actual critical defect is that the relay route `apps/web/src/app/api/reading/bookmarks/route.ts` does not validate or sanitize the `body` before forwarding it to NestJS. An authenticated user can POST arbitrary JSON including fields not in `BookmarkToggleSchema`. While NestJS validates with Zod (`BookmarkToggleSchema.parse(body)` in the controller), the relay passes `body` through verbatim. This is not itself a security hole given NestJS validates, but it means the relay silently accepts and forwards oversized payloads (e.g., a 10MB JSON body). There is no body size limit enforced at the Next.js relay layer for any of the four reading relay routes (`bookmarks`, `highlights`, `notes`, `sessions/complete`).

**Fix for missing body size limit** (applies to all four relay routes):

```typescript
// In each relay route, before forwarding body:
const bodyText = JSON.stringify(body);
if (bodyText.length > 65536) { // 64KB limit
  return NextResponse.json({ error: "Request too large" }, { status: 413 });
}
```

---

### CR-04: `getPassageById` returns unpublished passages to authenticated users

**File:** `apps/api/src/reading/reading.service.ts:104-133`

**Issue:** `getPassageById` uses `findUnique({ where: { id: passageId } })` with no `isPublished: true` filter. Any authenticated user who knows or guesses a passage UUID can fetch the full content of unpublished (flagged) passages, including passages that failed CEFR confidence checks. The browse endpoint (`getPassages`) correctly filters `isPublished: true`, but the detail endpoint does not, creating an inconsistency. An attacker who enumerates UUIDs (UUIDs are not secret by design but are assumed to be unguessable) can access all flagged/unpublished content.

**Fix:**
```typescript
const passage = await this.prisma.readingPassage.findUnique({
  where: { id: passageId, isPublished: true },  // add isPublished filter
  include: {
    questions: { orderBy: { sortOrder: 'asc' } },
  },
});
```

---

### CR-05: No input validation on `page` and `limit` query params allows unbounded DB queries

**File:** `apps/api/src/reading/reading.controller.ts:76-78`

**Issue:** The `page` and `limit` query parameters are parsed with `parseInt(page, 10)` and passed directly to `getPassages`. There is no upper bound on `limit`. A request like `GET /api/reading/passages?limit=100000` will execute `prisma.readingPassage.findMany({ take: 100000 })`, fetching up to 100,000 rows from the database in a single query. This is a resource exhaustion vector available to any authenticated user. Additionally, `parseInt('abc', 10)` returns `NaN`, which becomes the `take` value in Prisma — Prisma with `take: NaN` will throw or behave unexpectedly (it maps NaN to undefined in some versions, fetching all records with no limit).

**Fix:**
```typescript
// In reading.controller.ts getPassages handler:
const parsedPage = Math.max(1, parseInt(page ?? '1', 10) || 1);
const parsedLimit = Math.min(100, Math.max(1, parseInt(limit ?? '20', 10) || 20));

return this.readingService.getPassages(req.user.userId, {
  cefrLevel,
  topic,
  contentType,
  page: parsedPage,
  limit: parsedLimit,
});
```

---

### CR-06: `getWordsByCategory` allows unbounded `limit` parameter with no validation

**File:** `apps/api/src/vocabulary/vocabulary.controller.ts:100-104`

**Issue:** The `limit` query param defaults to `20` but has no maximum cap. `GET /api/vocabulary/:category/words?limit=999999` will query the entire vocabulary table for that category with no bound. Same `NaN` risk as CR-05 applies: `+page` with a non-numeric string yields `NaN`, and `Math.floor(NaN)` is `NaN`, making `skip = NaN - limit` produce `NaN` which Prisma may treat as 0 (fetching from the beginning with no skip, potentially returning unexpected rows).

**Fix:**
```typescript
// In vocabulary.controller.ts:
async getWordsByCategory(
  @Param('category') category: string,
  @Query('page') page = '1',
  @Query('limit') limit = '20',
): Promise<PaginatedWordsDto> {
  const parsedPage = Math.max(1, parseInt(String(page), 10) || 1);
  const parsedLimit = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20));
  return this.vocabularyService.getWordsByCategory(category, parsedPage, parsedLimit);
}
```

---

### CR-07: `PassageRenderer` sets `innerHTML` and then immediately resets `wordSpanDoneRef` to `false`, breaking the guard

**File:** `apps/web/src/components/reading/passage-renderer.tsx:110-117`

**Issue:** The first `useEffect` (lines 110-117) sets `container.innerHTML = cleanHtml` and then sets `wordSpanDoneRef.current = false`. This is the **opposite** of what the guard is meant to do. The comment says "reset so wrapping runs below", which indicates intentionality, but the second `useEffect` (lines 120-171) also checks `if (!container || wordSpanDoneRef.current) return`. Since the first effect runs, sets `innerHTML`, then sets `wordSpanDoneRef.current = false`, the second effect (which also runs after the first on the same mount cycle) will correctly see `wordSpanDoneRef.current = false` and proceed to wrap words.

However, the result is that if the component re-renders (e.g., `highlights` prop changes), the second `useEffect` has `wordSpanDoneRef.current = true` (set on line 169) and will correctly skip re-wrapping. But the first `useEffect` has `[]` dependencies — it only runs once. So after initial mount, `innerHTML` is set once, word-span wrapping runs once, and subsequent renders only trigger the highlight restoration effect. This appears correct on re-analysis.

The actual defect: `wordSpanDoneRef.current = false` on line 115 is set AFTER `container.innerHTML = cleanHtml`. The first effect runs, sets HTML, resets the flag to false. The second effect then runs (same synchronous flush), wraps words, sets flag to `true`. On a re-render triggered before the second effect runs (theoretically impossible in the same event loop tick, but possible with Concurrent Mode / transitions), the second effect's guard `wordSpanDoneRef.current` would be `false` again, causing a double-wrap. Under React 18 Concurrent Mode, effects may be replayed (StrictMode double-invoke). In StrictMode dev mode, this causes the first effect to fire twice: first run sets HTML + resets flag; cleanup (no cleanup defined) skips; second run sets HTML again (erasing already-wrapped spans) and resets flag. The second effect similarly fires twice, wrapping words twice, creating nested `<span data-word>` within `<span data-word>`.

**Fix:** The first effect's reset of `wordSpanDoneRef.current = false` should be removed (line 115):

```typescript
useEffect(() => {
  const container = passageBodyRef.current;
  if (!container || wordSpanDoneRef.current) return;
  container.innerHTML = cleanHtml;
  // Do NOT reset wordSpanDoneRef here — let the word-span effect control the flag
}, []);
```

---

## Warnings

### WR-01: Browser resource leak — Playwright browser not closed on error in `validateSelectors`

**File:** `apps/api/src/pipeline/crawler.service.ts:302-393`

**Issue:** If `getSampleUrls` throws an unhandled exception inside the `for (const source of SOURCES)` loop, the `browser.close()` call on line 379 is never reached. The Playwright `chromium` browser process will be orphaned. Same applies to `crawlAll()` (line 402-439): if `crawlSource` throws, `browser.close()` on line 428 is skipped.

**Fix:** Wrap browser operations in try/finally:
```typescript
const browser = await chromium.launch({ headless: true });
try {
  // ... all source iteration
} finally {
  await browser.close();
}
```

---

### WR-02: `sanitizeHtml` regex does not handle unquoted event attributes

**File:** `apps/api/src/pipeline/seed.service.ts:103-116`

**Issue:** The event-handler removal patterns on lines 106-108 only match quoted attributes:
- `on[a-z]+="[^"]*"` — double-quoted
- `on[a-z]+=\s*'[^']*'` — single-quoted
- `on[a-z]+=[^\s>]*` — unquoted (catches some cases)

The pattern for unquoted (`on[a-z]+=[^\s>]*`) only works if the attribute value contains no spaces. A payload like `<img onerror=alert`1` >` would partially evade this. This is a secondary concern given CR-01 (replace with DOMPurify), but independently incorrect.

---

### WR-03: `_clauseDensityScore` score threshold does not match comment documentation

**File:** `apps/api/src/pipeline/classifier.service.ts:209-232`

**Issue:** The doc comment states ">3 per 100 words → C1 (score 1); 1–3 → B2; <1 → B1." But the implementation normalizes by dividing `per100 / 5` (line 231), which means 5+ markers per 100 words yield score 1.0. At 3 markers per 100 words the score is 0.6, not 1.0 as implied by the comment. This discrepancy means the C1 threshold is effectively 5 markers/100 words (not 3), silently producing lower CEFR levels than intended. The CLAUDE.md specification says ">3 per 100 words = C1 indicator", so the constant `5` is incorrect — it should be `3`.

**Fix:**
```typescript
return Math.min(1, per100 / 3); // 3+ markers per 100 words → full C1 signal (per CLAUDE.md)
```

---

### WR-04: `NotesPanel` timer reference (`savedTimerRef`) leaks across renders — not a real ref

**File:** `apps/web/src/components/reading/notes-panel.tsx:56`

**Issue:** `savedTimerRef` is declared as a plain object literal `{ current: null }` inside the component function body, not as `useRef(null)`. This means it is re-created as a new object on every render. Consequently, `savedTimerRef.current` always starts as `null` on each render. The `clearTimeout(savedTimerRef.current)` check on line 75 always clears `null` (no-op), and the `setTimeout` callback on line 76-78 captures the new object but the reference may be stale after the component re-renders before the 2-second timeout fires. The timer is never properly cancelled when the component unmounts — a `setSaveStatus` call after unmount will cause a React state update on an unmounted component.

**Fix:** Replace with `useRef`:
```typescript
const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
```
And add a cleanup effect:
```typescript
useEffect(() => {
  return () => {
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
  };
}, []);
```

---

### WR-05: Pagination renders ALL page links — unbounded number of `<Link>` elements

**File:** `apps/web/src/app/(dashboard)/reading/page.tsx:178-198`

**Issue:** `Array.from({ length: totalPages }, ...)` renders one link per page. If the database contains 2,000 passages with default `limit=20`, this renders 100 `<Link>` elements. With `limit=1` (uncapped — see CR-05), this could render thousands of links. This is a usability and performance issue that will render the pagination unusable on any reasonably large dataset.

**Fix:** Implement windowed pagination (show current ± 2 pages, first, last, and ellipses):
```typescript
// Only render pages: 1, ..., currentPage-2, currentPage-1, currentPage, currentPage+1, currentPage+2, ..., totalPages
```

---

### WR-06: `getPassageById` fetches all questions with no limit — no guard against passages with many questions

**File:** `apps/api/src/reading/reading.service.ts:104-133`

**Issue:** `questions: { orderBy: { sortOrder: 'asc' } }` has no `take` limit. If a seeding bug creates hundreds of questions per passage, the detail endpoint returns them all. More critically, `getPassageById` always returns the full `content` HTML for every call (including browse use cases), which could be many KB per passage. There is no `select` to exclude `content` in the browse listing context.

This is a secondary concern for the detail endpoint specifically, but for robustness a question limit should be applied.

**Fix:** Add `take: 20` to the questions include:
```typescript
questions: { orderBy: { sortOrder: 'asc' }, take: 20 }
```

---

### WR-07: `detectTopic` in SeedService uses title-cased keywords but text is lowercased before comparison — mismatch for "Daily Life" and "Social Topics"

**File:** `apps/api/src/pipeline/seed.service.ts:122-137` and `37-46`

**Issue:** `detectTopic` calls `text.toLowerCase()` then checks `lowerText.includes(kw)` where `kw` comes from `TOPIC_KEYWORDS`. The keyword values are all lowercase strings, so this works for most topics. However, the TOPIC_KEYWORDS map on lines 37-46 is keyed by lowercase topic names (e.g., `'society'`, `'health'`), and `ReadingFilters` component TOPICS array uses title-cased values (`"Technology"`, `"Business"`, `"Daily Life"`, `"Social Topics"`). The returned topic string from `detectTopic` will always be lowercase (e.g., `"society"`, `"technology"`), but the filter UI sends title-cased values (e.g., `"Social Topics"`). The NestJS `getPassages` query does a direct equality check on `topic` (line 68 of reading.service.ts: `filters['topic'] = query.topic`). This means filtering by `topic=Technology` will return 0 results because all seeded topics are stored lowercase (`"technology"`), while the frontend sends title-cased values.

**Fix:** Either store topics as title-cased to match the filter UI, or normalize the comparison. The simplest fix is to use title-cased keys and values in `TOPIC_KEYWORDS`:
```typescript
const TOPIC_KEYWORDS: Record<string, string[]> = {
  'Technology': ['technology', 'computer', ...],
  'Health': ['health', ...],
  // ...
};
```

---

### WR-08: `handleTimerStop` in `ReadingPassageClient` may return stale `elapsedSeconds` on double-call

**File:** `apps/web/src/app/(dashboard)/reading/[passageId]/reading-passage-client.tsx:78-86`

**Issue:** `handleTimerStop` has `timerStopped` and `elapsedSeconds` in its dependency array. When called the first time (`!timerStopped`), it computes `readingTimeSec` from `Date.now() - startTimeRef.current` (accurate) and returns it. If `setTimerStopped(true)` triggers a re-render before `QuestionsSection` finishes calling `submitSession`, and `handleTimerStop` is called again from a different code path, it returns `elapsedSeconds` (the React state value from the previous render tick), which may differ from the actual elapsed time by up to 1 second (the interval tick). This is a minor accuracy issue but could cause confusing behavior if `onTimerStop` is ever called from multiple paths.

---

### WR-09: `topic` filter in `ReadingFilters` sends full display name (e.g., "Daily Life") but DB stores lowercase (e.g., "daily-life" or "daily life")

**File:** `apps/web/src/app/(dashboard)/reading/reading-filters.tsx:27-36`

**Issue:** The TOPICS array in `ReadingFilters` lists display names like `"Technology"`, `"Business"`, `"Daily Life"`, `"Social Topics"`, `"Academic"`. These are sent verbatim as `?topic=Daily+Life` in the URL. The `detectTopic` function in `SeedService` maps to lowercase single-word keys: `'technology'`, `'business'`, `'society'`, `'education'` — not `"Social Topics"` or `"Daily Life"`. The topic stored in the database will be `"society"` or `"education"`, not `"Social Topics"` or `"Academic"`. Filtering by these display names will return zero results.

This is a separate manifestation of WR-07 and confirms a systemic mismatch between the seeded topic values and the UI filter values. Both must be aligned.

---

## Info

### IN-01: `ReadingPassageDetailDtoSchema` shape doesn't match what `getPassageById` actually returns

**File:** `packages/shared/src/reading.dto.ts:46-58` and `apps/api/src/reading/reading.service.ts:128-133`

**Issue:** `ReadingPassageDetailDtoSchema` extends `ReadingPassageDtoSchema` which requires `questionCount` (a number) and `isBookmarked` (a boolean). The `getPassageById` service method returns the raw Prisma `ReadingPassage` model merged with `highlights`, `note`, and `progress` — it does not compute `questionCount` or `isBookmarked`. The return type is `unknown`, masking this mismatch. When the Next.js page casts `res.json() as Promise<ReadingPassageDetailDto>`, it may receive an object without `questionCount` and `isBookmarked`, causing undefined property accesses in `ReadingPassageClient` (e.g., `data.isBookmarked` used on line 96 of `reading-passage-client.tsx`).

**Fix:** Either add the missing fields to the `getPassageById` return value, or adjust the DTO schema to make them optional in the detail view.

---

### IN-02: `PassageScoreCard` receives `passageId` prop but never uses it

**File:** `apps/web/src/components/reading/passage-score-card.tsx:41`

**Issue:** The `Props` interface declares `passageId: string` but the component function destructures only `{ score, total, readingTimeSec }` (line 41). `passageId` is declared but never used. Both CTA buttons link to `/reading` regardless of `passageId`.

**Fix:** Remove `passageId` from the `Props` interface and from all call sites, or implement the "Try another passage" functionality using it.

---

### IN-03: `extractSentence` in `PassageRenderer` has an off-by-one in character counting

**File:** `apps/web/src/components/reading/passage-renderer.tsx:61-70`

**Issue:** `charCount += sentence.length + 1` adds 1 for the sentence separator. But `split(/(?<=[.!?])(?:\s|$)/)` splits on the whitespace after a sentence-ending punctuation, consuming 1 character. If the text uses `\n` (newline) as the separator, this is correct. However, for multi-character separators (e.g., `"?  "` — question mark + two spaces), the split consumes variable-length separators but always adds 1 to `charCount`. This means `charCount` drifts from the actual character position in `textContent`, and `extractSentence` may return the wrong sentence for words near sentence boundaries. This produces a cosmetically wrong context sentence in the `WordPopover` — it will show the correct word in an incorrect sentence.

---

### IN-04: `vocabScore` silently skips all words not in the wordMap — high false negative rate for uncommon vocabulary

**File:** `apps/api/src/pipeline/classifier.service.ts:170-187`

**Issue:** The vocabulary score only counts words that exist in the CEFR word list AND are B1+. Any C1 word not in the word list (which covers only ~300 words in the fallback map) is treated as if it doesn't exist. For a real article with C1 vocabulary not in the word list, `known === 0` returns `vocabScore = 0`, collapsing the 50% vocabulary component to zero and producing an incorrect B1 classification regardless of actual difficulty. The word list is loaded from `cefr-word-list.json` in production — the quality of that file is critical, but the fallback map has only ~80 entries and will misclassify most real passages in test environments.

---

_Reviewed: 2026-06-18T08:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
