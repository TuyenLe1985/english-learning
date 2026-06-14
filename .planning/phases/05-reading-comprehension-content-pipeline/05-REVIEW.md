---
phase: 05
status: findings
critical: 5
warnings: 6
info: 4
reviewed_files: 17
files_reviewed_list:
  - apps/api/src/reading/reading.service.ts
  - apps/api/src/reading/reading.controller.ts
  - apps/api/src/reading/reading.module.ts
  - apps/api/src/pipeline/crawler.service.ts
  - apps/api/src/pipeline/seed.service.ts
  - apps/api/src/pipeline/pipeline.cli.ts
  - apps/api/src/pipeline/classifier.service.ts
  - apps/api/src/pipeline/pipeline.module.ts
  - apps/web/src/app/(dashboard)/reading/page.tsx
  - apps/web/src/app/(dashboard)/reading/[passageId]/page.tsx
  - apps/web/src/components/reading/passage-renderer.tsx
  - apps/web/src/components/reading/highlight-tooltip.tsx
  - apps/web/src/components/reading/questions-section.tsx
  - apps/web/src/components/reading/notes-panel.tsx
  - apps/web/src/components/reading/word-popover.tsx
  - apps/web/src/components/reading/reading-page-client.tsx
  - packages/shared/src/reading.dto.ts
---

# Phase 05: Code Review Report

**Reviewed:** 2026-06-14T00:00:00Z
**Depth:** standard
**Files Reviewed:** 17
**Status:** issues_found

## Summary

Phase 05 delivers the reading comprehension content pipeline (crawler, CEFR classifier, seed service) and the reading UI (passage list, passage detail, highlights, notes, bookmarks, word popover). The overall structure is sound — auth guards are applied correctly, IDOR protection exists for highlights, and Zod schemas gate all inbound DTOs. However five critical defects were found: an unpublished-passage information leak, a Zod parse exception that returns HTTP 500 instead of 400, a TOCTOU race in bookmark toggle, a stored XSS vector in crawled HTML that bypasses the client-side DOMPurify pass, and a resource-type masquerade in the bookmark endpoint response. Six warnings cover missing input bounds, a misnamed exception, a dead code block, timer ref leakage, and a data-mapping gap.

---

## Critical Issues

### CR-01: Unpublished passages accessible via detail endpoint (information leak)

**File:** `apps/api/src/reading/reading.service.ts:89`
**Issue:** `getPassageById()` fetches any passage by ID with no `isPublished` filter. The list endpoint (line 53) filters `{ isPublished: true }`, so unpublished passages never appear in the grid — but a client that already knows an ID (e.g., from a prior crawl, a guessed UUID) can retrieve full passage content, questions, and the raw crawled HTML. This contradicts the stated publish gate (D-12, PIPE-04).
**Fix:**
```typescript
const passage = await this.prisma.readingPassage.findUnique({
  where: { id, isPublished: true },   // add isPublished guard
  include: {
    questions: { orderBy: { sortOrder: 'asc' } },
  },
});
```

---

### CR-02: Zod `.parse()` in controller throws ZodError — unhandled, returns HTTP 500

**File:** `apps/api/src/reading/reading.controller.ts:93,109,140,156`
**Issue:** All four mutation endpoints call `Schema.parse(body)` directly with no try/catch and no global Zod exception filter. When the client sends a malformed body, `ZodError` propagates uncaught through NestJS, which serialises it as a generic 500 Internal Server Error rather than the semantically correct 400 Bad Request. This leaks a stack trace in non-production builds and breaks client-side error handling that checks for 4xx.
**Fix:** Use `.safeParse()` and throw `BadRequestException`, or register a global `ZodExceptionFilter`:
```typescript
// Option A — inline safeParse (controller)
const result = ReadingSessionCompleteSchema.safeParse(body);
if (!result.success) {
  throw new BadRequestException(result.error.flatten());
}
const dto = result.data;

// Option B — global filter in main.ts
app.useGlobalFilters(new ZodExceptionFilter());
```

---

### CR-03: TOCTOU race in `toggleBookmark()` — duplicate bookmark possible under concurrent requests

**File:** `apps/api/src/reading/reading.service.ts:215-233`
**Issue:** `toggleBookmark()` reads the existing bookmark (line 216), then separately creates or deletes. Between the read and the write, a second concurrent request from the same user passes the same existence check, causing two concurrent "create" paths to both call `upsert` (which is safe), but two concurrent "delete" paths will both find `existing !== null` and both try to delete — the second delete throws a Prisma `RecordNotFoundError` (P2025) which propagates as HTTP 500. Additionally the `upsert` in the "create" branch (line 227) is redundant; a `create` is sufficient because the existence check already confirmed absence.
**Fix:** Replace the read-then-act pattern with a single atomic operation:
```typescript
async toggleBookmark(userId: string, dto: BookmarkToggleDto) {
  try {
    await this.prisma.bookmark.create({
      data: { userId, passageId: dto.passageId },
    });
    return { bookmarked: true };
  } catch (e) {
    // P2002 = unique constraint violation (already exists) → delete it
    if (e?.code === 'P2002') {
      await this.prisma.bookmark.delete({
        where: { userId_passageId: { userId, passageId: dto.passageId } },
      });
      return { bookmarked: false };
    }
    throw e;
  }
}
```

---

### CR-04: Stored XSS — crawled HTML is not server-sanitized before DB storage; DOMPurify only runs client-side

**File:** `apps/api/src/pipeline/crawler.service.ts:509-520` / `apps/api/src/pipeline/seed.service.ts:95-97`
**Issue:** `extractPassage()` strips `<script>`, `<style>`, `<noscript>`, `<iframe>`, `<object>`, and `<embed>` elements (line 510), but does not whitelist allowed tags — it stores whatever other HTML the crawler extracts (e.g., `<a onclick="…">`, `<img onerror="…">`, `<svg>`, `<form>`, `<input>`, `<details>`). `SeedService.preparePassageData()` runs cheerio on the content only to extract plain text for classification (lines 141-142); it writes the raw `passage.content` directly to the DB (line 161). The comment at the top of the detail page (`T-05-06-01 — content sanitized by isomorphic-dompurify in SeedService`) is factually incorrect — SeedService does not sanitize. The client-side `PassageRenderer` applies DOMPurify on render, but if a future server-side render path, RSS export, email digest, or any non-browser consumer reads `content` from the DB, XSS fires. The correct defence is sanitize-at-storage, not sanitize-at-render.
**Fix:** In `CrawlerService.extractPassage()`, after removing scripts/iframes, call a server-side sanitizer before returning:
```typescript
import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window as unknown as Window);

const ALLOWED_TAGS = ['p','b','i','strong','em','br','ul','ol','li','blockquote','h2','h3'];

// inside extractPassage(), replace:
// const content = bodyEl.html() ?? '';
const rawHtml = bodyEl.html() ?? '';
const content = DOMPurify.sanitize(rawHtml, { ALLOWED_TAGS, ALLOWED_ATTR: [] });
```
Alternatively, use the `sanitize-html` npm package which is designed for Node and does not need JSDOM.

---

### CR-05: `deleteHighlight` throws `NotFoundException` instead of `ForbiddenException` on ownership mismatch — masks IDOR attempts in logs

**File:** `apps/api/src/reading/reading.service.ts:184-186`
**Issue:** The comment on line 172 says "throws ForbiddenException if userId mismatch", and `ForbiddenException` is imported at line 18, but the actual throw at line 185 is `NotFoundException`. This is a logic bug — an attacker probing for other users' highlight IDs receives the same 404 they get for non-existent IDs, making IDOR attempts completely invisible in application monitoring. The correct semantic is 403, which is already imported but never used.
**Fix:**
```typescript
if (highlight.userId !== userId) {
  throw new ForbiddenException(`Highlight ${id} not found`);
}
```

---

## Warnings

### WR-01: `parseInt` on query params passes `NaN` to service — causes Prisma to throw

**File:** `apps/api/src/reading/reading.controller.ts:75-76`
**Issue:** `parseInt('abc', 10)` returns `NaN`. The service does `(page - 1) * limit` with `NaN` which produces `NaN`, and `skip: NaN` causes a Prisma validation error that surfaces as a 500. A malicious or misconfigured client can trigger this trivially with `?page=abc`.
**Fix:**
```typescript
page: page ? (Number.isFinite(parseInt(page, 10)) ? parseInt(page, 10) : 1) : undefined,
limit: limit ? (Number.isFinite(parseInt(limit, 10)) ? parseInt(limit, 10) : 10) : undefined,
```
Or add server-side bounds validation in `getPassages()`:
```typescript
const page = Math.max(1, Number.isFinite(query.page ?? 1) ? (query.page ?? 1) : 1);
const limit = Math.min(100, Math.max(1, Number.isFinite(query.limit ?? 10) ? (query.limit ?? 10) : 10));
```

---

### WR-02: No upper bound on `limit` query parameter — clients can request unbounded result sets

**File:** `apps/api/src/reading/reading.service.ts:50`
**Issue:** `limit` is taken directly from the query with only a null-coalescing default of 10. A client sending `?limit=100000` causes a full table scan with `take: 100000`, which will exhaust DB memory and violate the 300ms API response SLA. There is no validation or cap.
**Fix:**
```typescript
const limit = Math.min(100, Math.max(1, query.limit ?? 10));
```

---

### WR-03: `toggleBookmark` on passage list page is a no-op — click handler calls `e.preventDefault()` only

**File:** `apps/web/src/app/(dashboard)/reading/page.tsx:151`
**Issue:** The bookmark button in the passage card on the list page has `onClick={(e) => e.preventDefault()}`. This silently prevents the bookmark from ever being toggled from the list view. Users who click the bookmark icon see no response. This is either dead UI (remove the button) or an incomplete implementation that should call the bookmark API. The functionality is correctly implemented on the detail page via `ReadingPageClient`.
**Fix:** Either remove the bookmark button from the list cards (server component cannot call the API directly), or convert the card into a client component that calls `POST /api/reading/bookmarks` on click.

---

### WR-04: `NotesPanel` — timer `savedTimerRef` not cleared on unmount, risks state-update-on-unmounted-component

**File:** `apps/web/src/components/reading/notes-panel.tsx:84-85`
**Issue:** `savedTimerRef.current = setTimeout(() => setSaveStatus("idle"), 2000)` is set on successful save, but the cleanup `useEffect` at line 66 only runs `setSaveStatus("idle")` — it does not clear the timer. If the component unmounts within 2 seconds of a successful save (e.g., user navigates away), the `setTimeout` fires and calls `setSaveStatus` on the unmounted component. React 18 suppresses the warning but the underlying issue is a timer leak.
**Fix:** Clear the timer in the cleanup return:
```typescript
useEffect(() => {
  return () => {
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
  };
}, []);
```

---

### WR-05: `getPassages()` response shape does not match `ReadingPassageDto` — `questionCount` and `isBookmarked` are unmapped

**File:** `apps/api/src/reading/reading.service.ts:58-78`
**Issue:** The `ReadingPassageDtoSchema` (shared/src/reading.dto.ts:17-18) declares `questionCount: z.number()` and `isBookmarked: z.boolean()`. The Prisma query returns `_count.questions` (a nested object) and `bookmarks` (an array). The service returns these raw Prisma shapes directly without mapping them to the DTO fields. The frontend types expect `passage.questionCount` (number) and `passage.isBookmarked` (boolean) but receives `passage._count.questions` and `passage.bookmarks`. This will cause `undefined` values in the UI for question counts and bookmark state.
**Fix:** Map the response before returning:
```typescript
return {
  passages: passages.map((p) => ({
    id: p.id,
    title: p.title,
    contentType: p.contentType,
    cefrLevel: p.cefrLevel,
    cefrConfidence: p.cefrConfidence,
    topic: p.topic,
    wordCount: p.wordCount,
    questionCount: p._count.questions,
    isBookmarked: p.bookmarks.length > 0,
  })),
  total,
  page,
  limit,
  totalPages: Math.ceil(total / limit),
};
```

---

### WR-06: `crawlAll()` writes output file relative to `process.cwd()` which is non-deterministic in Docker/monorepo context

**File:** `apps/api/src/pipeline/crawler.service.ts:228`
**Issue:** `path.resolve(process.cwd(), './crawled-passages.json')` resolves relative to wherever the Node process was started from. In a Turborepo monorepo with Docker, `cwd` may be the monorepo root, `apps/api`, or the container `/app` directory depending on how the CLI is invoked. The CLI hardcodes the same relative path `'./crawled-passages.json'` (pipeline.cli.ts line 22). If crawler writes to one cwd and seeder reads from another, the seed step fails with "file not found". This is not a crash in the happy path but it is an operationally silent failure mode during first-deploy.
**Fix:** Use `__dirname`-relative resolution (same pattern as `ClassifierService.loadWordMap()`), or accept the output path as a CLI argument, or document the required working directory explicitly.

---

## Info

### IN-01: `ForbiddenException` import is unused

**File:** `apps/api/src/reading/reading.service.ts:18`
**Issue:** `ForbiddenException` is imported but (due to CR-05) never thrown. This is dead import.
**Fix:** After fixing CR-05 to throw `ForbiddenException`, this import becomes used. No separate action needed beyond fixing CR-05.

---

### IN-02: `console.log` for validation summary in `validateSelectors()` mixes logger styles

**File:** `apps/api/src/pipeline/crawler.service.ts:185-191`
**Issue:** The service uses `this.logger` (NestJS Logger) throughout, but the validation summary at lines 185-191 uses raw `console.log`. In production this bypasses log aggregation/filtering.
**Fix:** Replace with `this.logger.log(...)` calls.

---

### IN-03: Pagination comment block in `collectArticleUrls()` is dead code

**File:** `apps/api/src/pipeline/crawler.service.ts:416-419`
**Issue:** Lines 416-419 detect a "next page" link but the comment reads "handled by re-running via listingUrls in next iteration" and does nothing with it. The `nextPage` variable is computed but never used. This is dead code that misleads future maintainers into thinking pagination is implemented.
**Fix:** Either implement pagination follow-through, or delete the block.

---

### IN-04: `ReadingPassageDetailDto` extends `ReadingPassageDtoSchema` and inherits `isBookmarked`; detail endpoint does not compute it

**File:** `apps/api/src/reading/reading.service.ts:89-119` / `packages/shared/src/reading.dto.ts:46`
**Issue:** `ReadingPassageDetailDtoSchema` extends `ReadingPassageDtoSchema` which requires `isBookmarked: boolean`. `getPassageById()` spreads the raw Prisma passage object which does not have an `isBookmarked` field — it has a `bookmarks` array only if explicitly included (it is not included in the detail query). The frontend receives `isBookmarked: undefined`, TypeScript type is `boolean`. Same root cause as WR-05 but for the detail endpoint.
**Fix:** Add a bookmarks include to the detail query and map `isBookmarked` in the response, similar to the fix for WR-05.

---

_Reviewed: 2026-06-14T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
