---
phase: 05-reading-comprehension-content-pipeline
plan: "06"
subsystem: reading-web-pages
tags: [nextjs, server-component, reading, browse, detail, auth-gated]
dependency_graph:
  requires:
    - 05-02 (ReadingModule endpoints: GET /api/reading/passages, GET /api/reading/passages/:id)
  provides:
    - Reading browse Server Component (GET /reading)
    - Passage detail Server Component (GET /reading/[passageId])
  affects:
    - apps/web/src/app/(dashboard)/reading/page.tsx (new)
    - apps/web/src/app/(dashboard)/reading/[passageId]/page.tsx (new)
    - apps/web/src/app/(dashboard)/reading/reading-filters.tsx (new, co-located client component)
    - apps/web/src/app/(dashboard)/reading/reading-pagination.tsx (new, co-located client component)
tech_stack:
  added: []
  patterns:
    - Next.js 14 App Router async Server Components with Promise<params> and Promise<searchParams>
    - fetchWithAuth + INTERNAL_API_URL pattern for Server Component → NestJS API calls
    - Auth check + redirect pattern (auth() → redirect("/login"))
    - URL-driven filter state (searchParams round-trip for browser Back correctness)
    - Co-located "use client" components for interactive filter bar and pagination
    - dangerouslySetInnerHTML temporary fallback (replaced by PassageRenderer in 05-07)
key_files:
  created:
    - apps/web/src/app/(dashboard)/reading/page.tsx
    - apps/web/src/app/(dashboard)/reading/reading-filters.tsx
    - apps/web/src/app/(dashboard)/reading/reading-pagination.tsx
    - apps/web/src/app/(dashboard)/reading/[passageId]/page.tsx
  modified: []
decisions:
  - "Co-located reading-filters.tsx and reading-pagination.tsx client components keep filter interactivity client-side while data fetch stays server-side"
  - "dangerouslySetInnerHTML used as temporary fallback in passage detail; content was sanitized by SeedService before DB storage; PassageRenderer in 05-07 adds client-side DOMPurify"
  - "Bookmark button in browse cards uses onClick e.preventDefault() to prevent Link navigation — bookmark interactivity (POST /api/reading/bookmarks) wired in 05-07"
metrics:
  duration: "15 minutes"
  completed: "2026-06-14"
  tasks: 2
  files: 4
---

# Phase 05 Plan 06: Reading Browse + Detail Server Components Summary

**One-liner:** Next.js 14 Server Component reading browse page with URL-driven CEFR/topic/type filters and passage detail page with header, temporary body fallback, and questions placeholder.

## What Was Built

Two auth-gated Server Components that deliver the navigable reading module:

**Reading Browse Page (`/reading`):**
- Async Server Component — auth check, fetchPassages() to `GET /api/reading/passages` with cefrLevel/topic/contentType/page query params
- Responsive passage card grid (1/2/3 cols) — each card is a `<Link>` with `CefrBadge`, title (`line-clamp-2`), topic `Badge`, word count, content type label, and Bookmark icon
- `ReadingFilters` "use client" component — shadcn `Tabs` for CEFR (All/B1/B2/C1) and `Select` for topic and content type; all updates via `router.push()` with updated URL search params
- `ReadingPagination` "use client" component — URL-driven pagination with previous/next/page numbers
- Empty state: "No passages match your filters" with descriptive body copy
- 20 passages per page

**Passage Detail Page (`/reading/[passageId]`):**
- Async Server Component — auth check, `params` await (Next.js 14 Promise params), fetchPassageDetail() to `GET /api/reading/passages/:id`
- Null/error state: "Could not load this passage. Try refreshing the page." (UI-SPEC copywriting)
- Passage header: `ChevronLeft` + "Back to Reading" link, title (20px semibold), metadata row (`CefrBadge` + topic `Badge` + word count + content type), action row (Clock timer placeholder at 0m 0s + Bookmark toggle button)
- Passage body: `dangerouslySetInnerHTML` temporary fallback (content sanitized by SeedService before DB storage; `PassageRenderer` client component replaces in 05-07)
- `Separator` between passage body and questions section
- Questions section: static "Comprehension Questions (N questions)" heading placeholder (full `QuestionsSection` client component in 05-07)

## Deviations from Plan

None — plan executed exactly as written.

## Security Mitigations Applied

| Threat ID | Status | Implementation |
|-----------|--------|----------------|
| T-05-06-01 | Mitigated (partial — full mitigation in 05-07) | Content served via `dangerouslySetInnerHTML` was sanitized by `isomorphic-dompurify` in `SeedService` before DB storage; 05-07 `PassageRenderer` adds client-side DOMPurify second pass |
| T-05-06-02 | Mitigated | `auth()` check + `redirect("/login")` on both Server Components before any data fetch |
| T-05-06-SC | N/A | No new packages installed in this plan |

## Known Stubs

- **Timer display** (`apps/web/src/app/(dashboard)/reading/[passageId]/page.tsx`, action row): shows static "0m 0s" — timer starts client-side in `PassageRenderer` (05-07)
- **Bookmark toggle** (both pages): icon renders based on `isBookmarked` from API response; POST /api/reading/bookmarks toggle wired in `PassageRenderer` / browse card client component (05-07)
- **Questions section** (detail page): static heading placeholder; full interactive `QuestionsSection` client component in 05-07

These stubs are intentional — plan 05-06 delivers the Server Component data-fetch shell; 05-07 adds all client-side interactivity.

## Threat Flags

None — no new network endpoints or auth paths beyond those in the plan's threat model.

## Self-Check: PASSED

Files created/exist:
- FOUND: apps/web/src/app/(dashboard)/reading/page.tsx
- FOUND: apps/web/src/app/(dashboard)/reading/reading-filters.tsx
- FOUND: apps/web/src/app/(dashboard)/reading/reading-pagination.tsx
- FOUND: apps/web/src/app/(dashboard)/reading/[passageId]/page.tsx

Commits exist:
- FOUND: b38c2d0 (feat(05-06): Reading browse page Server Component with CEFR filter tabs)
- FOUND: fd1e98d (feat(05-06): Passage detail Server Component with header, body, and questions placeholder)

Auth check present on browse page: 2 occurrences (auth() call + redirect)
Auth check present on detail page: 3 occurrences (auth() call + redirect + re-check)
API route /api/reading/passages present in browse page: 1 occurrence
TypeScript: no new errors introduced (pre-existing auth-actions.test.ts errors are out of scope)
