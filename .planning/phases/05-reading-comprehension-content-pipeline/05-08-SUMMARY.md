---
phase: 05-reading-comprehension-content-pipeline
plan: "08"
subsystem: reading-client-components
tags: [nextjs, client-component, reading, vocab-08, read-06, word-popover, bookmark, srs]
dependency_graph:
  requires:
    - 05-03 (GET /api/vocabulary/lookup?word= endpoint)
    - 05-06 (PassageRenderer with onWordTap prop stub)
    - 05-07 (ReadingPageClient coordinator, PassageRenderer with word-span wrapping)
  provides:
    - WordPopover client component (word tap → lookup → SRS enroll)
    - Bookmark toggle in ReadingPageClient (optimistic UI, Toast confirmation)
    - GET /api/vocabulary/lookup relay route (Next.js → NestJS)
    - POST /api/reading/bookmarks relay route (Next.js → NestJS)
    - DELETE /api/reading/bookmarks relay route (Next.js → NestJS)
  affects:
    - apps/web/src/components/reading/reading-page-client.tsx (added word popover + bookmark toggle wiring)
    - apps/web/src/components/reading/passage-renderer.tsx (updated onWordTap signature to include anchorEl)
tech_stack:
  added: []
  patterns:
    - Absolute-positioned floating popover anchored to clicked word span (no Radix virtual anchor needed)
    - Optimistic UI for bookmark toggle with revert on error
    - Escape + outside-click dismiss via native DOM event listeners
    - LookupState union type: "loading" | VocabularyWordDto | null for three-state UI
    - Enrollment guard: disabled button when lookupResult === null (T-05-08-01, Pitfall 5)
    - Enrolled state boolean prevents duplicate SRS enrollment (T-05-08-03)
key_files:
  created:
    - apps/web/src/components/reading/word-popover.tsx
    - apps/web/src/app/api/vocabulary/lookup/route.ts
    - apps/web/src/app/api/reading/bookmarks/route.ts
  modified:
    - apps/web/src/components/reading/reading-page-client.tsx
    - apps/web/src/components/reading/passage-renderer.tsx
decisions:
  - "WordPopover uses absolute CSS positioning near anchorEl.getBoundingClientRect() rather than Radix PopoverAnchor virtual element — avoids complexity of Radix controlled mode with external DOM anchor; positions above word by default, flips below if near viewport top"
  - "onWordTap signature updated to include anchorEl: HTMLElement — click handler passes wordSpan, keyboard handler passes the passage container (acceptable fallback for rare keyboard path)"
  - "Bookmark toggle uses POST /api/reading/bookmarks for both add and remove (server determines action via upsert/delete); client tracks isBookmarked state optimistically"
  - "Vocabulary lookup uses /api/vocabulary/lookup relay (not /api/srs/* path) — relay proxies to NestJS vocabulary module, not SRS module"
  - "SRS enrollment reuses existing /api/vocabulary/enroll relay route (already exists from Phase 3, proxies to NestJS POST /api/srs/enroll)"
metrics:
  duration: "15 minutes"
  completed: "2026-06-14"
  tasks: 2
  files: 5
---

# Phase 05 Plan 08: Word-Tap Popover + Bookmark Toggle Summary

**One-liner:** WordPopover client component delivers VOCAB-08 tap-to-SRS flow (vocabulary lookup → definition display → SRS enrollment with sentence context), plus READ-06 bookmark toggle with optimistic UI and BookmarkCheck icon in ReadingPageClient.

## What Was Built

**WordPopover** (`apps/web/src/components/reading/word-popover.tsx`):
- "use client" component; opens via `activeWord` state in ReadingPageClient when a word span is clicked
- Fetches `GET /api/vocabulary/lookup?word={word}` on mount (using new relay route)
- Three-state `LookupState` union: `"loading"` → skeleton, `VocabularyWordDto` → definition UI, `null` → graceful fallback
- Loading state: two `Skeleton` lines while lookup resolves
- Word found: word (font-semibold) + partOfSpeech (italic muted) + definition (text-sm) + context sentence (bg-muted block, target word bolded) + Separator + "Add to SRS" button (primary, min-h-[44px] w-full)
- Word not found: word (font-semibold) + "Definition not yet in our vocabulary library" (italic muted) + context sentence + "Add to SRS" button **disabled** with `aria-disabled="true"` (T-05-08-01, Pitfall 5 — no wordId means no enrollment)
- After successful SRS enrollment: "Added to SRS" + CheckCircle emerald icon; button disabled (T-05-08-03)
- 409 Conflict from NestJS treated as already-enrolled (idempotent success)
- Error toast on enrollment failure: "Could not add to SRS. Try again." (destructive variant)
- Dismiss: Escape key (keydown listener) + outside click (mousedown listener)
- Absolute CSS positioning near anchorEl's `getBoundingClientRect()` — prefers above word, flips below if near viewport top; clamps to viewport width

**Vocabulary Lookup Relay** (`apps/web/src/app/api/vocabulary/lookup/route.ts`):
- GET handler; auth-gated via `auth()`; proxies to NestJS `GET /api/vocabulary/lookup?word={word}`
- D-13: NestJS returns 200 + null on word not found — relay passes null body through

**Bookmark Relay** (`apps/web/src/app/api/reading/bookmarks/route.ts`):
- POST handler for bookmark add; auth-gated; proxies to NestJS `POST /api/reading/bookmarks`
- DELETE handler for bookmark remove; auth-gated; proxies to NestJS `DELETE /api/reading/bookmarks/:passageId`

**ReadingPageClient updates** (`apps/web/src/components/reading/reading-page-client.tsx`):
- Added `activeWord: ActiveWord | null` state — set on word tap, cleared on popover close
- Added `handleWordTap(word, sentence, el)` callback — sets `activeWord`; closes popover if same word tapped twice
- Added `isBookmarked` state (initial from `data.isBookmarked`) + `bookmarkLoading` flag
- Added `toggleBookmark()` handler: optimistic toggle → POST /api/reading/bookmarks → Toast on success; revert + error toast on failure
- Bookmark icon: `BookmarkCheck` (text-amber-400) when bookmarked, `Bookmark` (text-muted-foreground) when not
- Label: "Bookmarked" / "Bookmark" per UI-SPEC Copywriting Contract
- Toast messages: "Passage bookmarked." / "Bookmark removed." (Screen 3 spec)
- Wrapped return in `<div className="relative">` so WordPopover's absolute position resolves correctly
- Passes `onWordTap` to PassageRenderer

**PassageRenderer updates** (`apps/web/src/components/reading/passage-renderer.tsx`):
- Updated `onWordTap` prop signature: `(word: string, sentence: string, anchorEl: HTMLElement) => void`
- Click handler (`handleClick`) passes `wordSpan` as `anchorEl` — gives WordPopover the exact word element to position near
- Keyboard handler in `tokenizeNode` passes container as element (fallback for keyboard path)

## Tasks Completed

| Task | Description | Files | Commit |
|------|-------------|-------|--------|
| 1 | WordPopover component + vocabulary lookup + bookmark relay routes | word-popover.tsx, vocabulary/lookup/route.ts, reading/bookmarks/route.ts | a1f0794 |
| 2 | Wire WordPopover + bookmark toggle into ReadingPageClient | reading-page-client.tsx, passage-renderer.tsx | 3ef9714 |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing] Vocabulary lookup relay route needed**
- **Found during:** Task 1 implementation
- **Issue:** Plan says to "fetch GET /api/vocabulary/lookup?word={word}" but no relay route existed in the web app. The VocabularyController endpoint is on NestJS (port 3001 internal), not directly accessible from browser in production Docker setup. A Next.js relay route is required to forward the request with auth cookies — exactly the same pattern used for all other NestJS API calls in this project.
- **Fix:** Created `apps/web/src/app/api/vocabulary/lookup/route.ts` as a GET relay; uses `fetchWithAuth + INTERNAL_API_URL` pattern identical to existing relay routes.
- **Files:** `apps/web/src/app/api/vocabulary/lookup/route.ts`
- **Commit:** a1f0794

**2. [Rule 2 - Missing] Bookmark relay route needed**
- **Found during:** Task 2 implementation
- **Issue:** The bookmark toggle calls `POST /api/reading/bookmarks` but no relay route existed. Same Docker network issue as above.
- **Fix:** Created `apps/web/src/app/api/reading/bookmarks/route.ts` with POST and DELETE handlers.
- **Files:** `apps/web/src/app/api/reading/bookmarks/route.ts`
- **Commit:** a1f0794

**3. [Rule 1 - Bug] PassageRenderer onWordTap missing anchorEl parameter**
- **Found during:** Task 2 wiring
- **Issue:** WordPopover requires an `anchorEl: HTMLElement` to position itself near the tapped word. The existing `onWordTap?: (word: string, sentence: string) => void` signature didn't pass the DOM element.
- **Fix:** Updated PassageRenderer's `onWordTap` prop signature to `(word: string, sentence: string, anchorEl: HTMLElement) => void`. Click handler passes `wordSpan` (the actual word span element). Keyboard handler in `tokenizeNode` passes the passage container as fallback.
- **Files:** `apps/web/src/components/reading/passage-renderer.tsx`
- **Commit:** 3ef9714

**4. [Rule 1 - Bug] ReadingPageClient returned `<>...</>` fragment instead of div — WordPopover absolute positioning broken**
- **Found during:** Task 2 implementation
- **Issue:** WordPopover uses `position: absolute` which requires a `position: relative` ancestor. The ReadingPageClient previously returned a React fragment (`<>...</>`), so there was no positioned ancestor for the popover.
- **Fix:** Changed the return wrapper from `<>` to `<div className="relative">` so the absolute-positioned popover resolves within the reading layout.
- **Files:** `apps/web/src/components/reading/reading-page-client.tsx`
- **Commit:** 3ef9714

**5. [Rule 1 - Architecture] Used CSS absolute positioning instead of Radix PopoverAnchor**
- **Found during:** Task 1 design
- **Issue:** Plan mentioned using Radix Popover's `anchor` prop or PopoverAnchor virtual element. Checking the shadcn popover.tsx, `PopoverAnchor` is exported but virtual anchor (via a ref or DOM element not in the React tree) requires the Radix `PopoverPrimitive.Anchor` `asChild` pattern — which means the anchor element must be a child of `Popover`. The word spans are deep in the passage DOM and not children of the WordPopover. This would require significant restructuring.
- **Fix:** Used CSS absolute positioning anchored to `anchorEl.getBoundingClientRect()` + `window.scrollY/scrollX`. This is the correct approach for external anchor elements (same pattern used by many production tooltip libraries). No Radix Popover root needed.
- **Not a deviation from plan intent** — plan explicitly says "If Radix doesn't support virtual anchor directly in the shadcn wrapper, position the popover content using a CSS absolute/fixed strategy near the anchorEl's getBoundingClientRect()"

## Security Mitigations Applied

| Threat ID | Status | Implementation |
|-----------|--------|----------------|
| T-05-08-01 | Mitigated | "Add to SRS" button `disabled={lookupResult === null}` and `aria-disabled="true"` — client never sends enrollment request without a valid `wordId` |
| T-05-08-02 | Accepted | VocabularyWord data is non-sensitive educational content; auth-gated relay route (requires valid NextAuth session) |
| T-05-08-03 | Mitigated | `enrolled` boolean state disables button after first successful enrollment; 409 Conflict from NestJS treated as already-enrolled (idempotent) |
| T-05-08-SC | Confirmed | No new npm packages installed in this plan |

## Known Stubs

None — all functionality is wired to real NestJS endpoints via relay routes. No hardcoded data or placeholder content flows to UI rendering.

## Threat Flags

None — all new network endpoints (vocabulary lookup relay, bookmark relay) are auth-gated and covered by the plan's threat model. No new security surface beyond what was planned.

## Self-Check: PASSED

Files created/exist:
- FOUND: apps/web/src/components/reading/word-popover.tsx
- FOUND: apps/web/src/app/api/vocabulary/lookup/route.ts
- FOUND: apps/web/src/app/api/reading/bookmarks/route.ts

Files modified/exist:
- FOUND: apps/web/src/components/reading/reading-page-client.tsx
- FOUND: apps/web/src/components/reading/passage-renderer.tsx

Commits exist:
- FOUND: a1f0794 (feat(05-08): WordPopover component + vocabulary lookup and bookmark relay routes)
- FOUND: 3ef9714 (feat(05-08): Wire WordPopover into ReadingPageClient + bookmark toggle)

Verification criteria:
- vocabulary/lookup + srs/enroll in word-popover.tsx: 3 occurrences (≥2 ✓)
- disabled when no wordId in word-popover.tsx: 2 occurrences (≥1 ✓)
- BookmarkCheck + toggleBookmark + "Passage bookmarked" in reading-page-client.tsx: 6 occurrences (≥2 ✓)
- WordPopover + BookmarkCheck + activeWord + toggleBookmark + isBookmarked in reading-page-client.tsx: 21 occurrences (≥1 ✓)

TypeScript: exits with only 4 pre-existing Phase 4 RED stub errors in auth-actions.test.ts (documented in context_notes as safe to ignore)
