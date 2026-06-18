---
phase: 05-reading-comprehension-content-pipeline
plan: "08"
subsystem: web-frontend
tags:
  - word-popover
  - vocab-08
  - srs-enrollment
  - bookmark-toggle
  - reading-comprehension
dependency_graph:
  requires:
    - 05-06  # passage reader page with PassageRenderer
    - 05-03  # vocabulary service with lookupByWord endpoint
  provides:
    - word-tap-to-srs-popover
    - bookmark-toggle-relay
  affects:
    - apps/web/src/components/reading/
    - apps/web/src/app/(dashboard)/reading/
tech_stack:
  added: []
  patterns:
    - Radix Popover with PopoverAnchor for virtual element positioning
    - Fetch + useState pattern for async vocabulary lookup
    - Optimistic UI for bookmark toggle with error revert
key_files:
  created:
    - apps/web/src/components/reading/word-popover.tsx
    - apps/web/src/app/api/vocabulary/lookup/route.ts
    - apps/web/src/app/api/reading/bookmarks/route.ts
  modified:
    - apps/web/src/app/(dashboard)/reading/[passageId]/reading-passage-client.tsx
    - apps/web/src/components/reading/passage-renderer.tsx
decisions:
  - "PopoverAnchor (Radix primitive) used over custom CSS positioning — lets Radix handle viewport edge flipping automatically"
  - "onWordTap signature updated to include HTMLElement so WordPopover can anchor precisely to the clicked word span"
  - "Vocabulary lookup relay returns 204 No Content when word not found (D-13 graceful no-match)"
  - "/api/vocabulary/enroll relay reused for SRS enrollment from word popover (already existed from Phase 3)"
  - "Bookmark relay route created as missing critical functionality (Rule 2 deviation)"
metrics:
  duration: "6 minutes"
  completed: "2026-06-18T13:35:44Z"
  tasks: 2
  files: 5
---

# Phase 05 Plan 08: WordPopover + Bookmark Toggle Summary

VOCAB-08 word-tap-to-SRS popover and bookmark relay routes for the reading passage reader.

## What Was Built

### Task 1: WordPopover component (VOCAB-08)

`apps/web/src/components/reading/word-popover.tsx` — a `"use client"` shadcn Popover component that:

- Fetches `GET /api/vocabulary/lookup?word={word}` on mount via the new relay route
- Shows 2-line Skeleton while lookup resolves
- Word found: displays word + part of speech (italic muted) + definition + context sentence (target word bolded) + "Add to SRS" button
- Word not found: shows "Definition not yet in our vocabulary library" (italic muted) + disabled "Add to SRS" button (T-05-08-01 — no wordId available, Pitfall 5)
- Post-enrollment: "Add to SRS" replaced with "Added to SRS" + CheckCircle emerald (T-05-08-03 duplicate prevention)
- 409 response handled as "Already in your SRS queue" success case
- Escape key and outside-click dismiss via Radix `onEscapeKeyDown` / `onInteractOutside`
- Uses `PopoverAnchor asChild` with a fixed-position zero-size span at the word span's bounding rect

`apps/web/src/app/api/vocabulary/lookup/route.ts` — Next.js relay that proxies to `NestJS GET /api/vocabulary/lookup?word=`, returns 204 when word not found.

### Task 2: WordPopover wiring + bookmark relay

`apps/web/src/app/(dashboard)/reading/[passageId]/reading-passage-client.tsx` updated:
- Added `activeWord` state: `{ word, contextSentence, anchorEl: HTMLElement } | null`
- `handleWordTap` now receives the `HTMLElement` (the clicked `<span data-word>`) and stores it in `activeWord`
- `WordPopover` rendered when `activeWord` is not null, closed via `handleWordPopoverClose`
- Bookmark toggle (already implemented in 05-07) now has the relay route it calls

`apps/web/src/components/reading/passage-renderer.tsx` updated:
- `onWordTap` signature extended: `(word: string, sentence: string, el: HTMLElement) => void`
- `handleInteraction` passes the `wordSpan` element as the third argument

`apps/web/src/app/api/reading/bookmarks/route.ts` created:
- New relay route proxying `POST /api/reading/bookmarks` to NestJS bookmark toggle

## Deviations from Plan

### Auto-added Missing Critical Functionality

**1. [Rule 2 - Missing relay route] Created /api/reading/bookmarks relay route**
- **Found during:** Task 2 verification
- **Issue:** `reading-passage-client.tsx` calls `POST /api/reading/bookmarks` but this relay route did not exist. The bookmark toggle was wired client-side but would silently fail with a 404 on every toggle.
- **Fix:** Created `apps/web/src/app/api/reading/bookmarks/route.ts` proxying to NestJS `POST /api/reading/bookmarks`
- **Files modified:** `apps/web/src/app/api/reading/bookmarks/route.ts` (new file)

**2. [Rule 2 - Updated contract] Updated onWordTap to include HTMLElement**
- **Found during:** Task 1 implementation
- **Issue:** The plan specified `onWordTap?: (word: string, sentence: string)` but the WordPopover needs the actual DOM element for anchor positioning. Without the element, the popover cannot determine where to render.
- **Fix:** Extended signature to `(word: string, sentence: string, el: HTMLElement)` in both `passage-renderer.tsx` and `reading-passage-client.tsx`

### Structural Deviation: Wired in reading-passage-client.tsx, not page.tsx

The plan specified updating `page.tsx` but all client interaction state lives in `reading-passage-client.tsx` (extracted in plan 05-07). The WordPopover wiring correctly goes into `reading-passage-client.tsx` which is the authoritative orchestrator for client-side state. `page.tsx` itself needed no changes.

## Known Stubs

None. The WordPopover fetches from a real relay route; the relay route proxies to the NestJS vocabulary lookup endpoint. The only expected fallback is the "Definition not yet in our vocabulary library" message for words not in the 200-word vocabulary seed — this is intentional per D-13 and documented in RESEARCH.md.

## Threat Surface Scan

No new network endpoints or auth paths introduced beyond those already in the plan's threat model:
- `GET /api/vocabulary/lookup` relay: proxies to auth-gated NestJS endpoint (T-05-08-02)
- `POST /api/reading/bookmarks` relay: proxies to auth-gated NestJS endpoint (existing READ-06 threat)

## Self-Check

### Created files exist:
- apps/web/src/components/reading/word-popover.tsx — FOUND
- apps/web/src/app/api/vocabulary/lookup/route.ts — FOUND
- apps/web/src/app/api/reading/bookmarks/route.ts — FOUND

### Modified files updated:
- apps/web/src/app/(dashboard)/reading/[passageId]/reading-passage-client.tsx — FOUND (activeWord, WordPopover)
- apps/web/src/components/reading/passage-renderer.tsx — FOUND (onWordTap + HTMLElement)

### Commits exist:
- 88ec620: feat(05-08): WordPopover component (VOCAB-08)
- 506a14c: feat(05-08): wire WordPopover into passage reader + bookmark relay (READ-06)

## Self-Check: PASSED
