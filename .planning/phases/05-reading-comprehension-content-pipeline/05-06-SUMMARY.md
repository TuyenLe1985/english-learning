---
phase: 05-reading-comprehension-content-pipeline
plan: "06"
subsystem: ui
tags: [next.js, server-component, reading, cefr, filter, url-state]

# Dependency graph
requires:
  - phase: 05-02
    provides: Reading DTOs (ReadingPassageDto, ReadingPassageDetailDto) in @repo/shared and NestJS reading API endpoints
provides:
  - "Reading browse Server Component at /reading — auth-gated, URL-driven filters, passage card grid"
  - "Passage detail Server Component at /reading/[passageId] — fetches full passage, renders header + body + questions placeholder"
  - "ReadingFilters client component — CEFR level Tabs, topic Select, content type Select with URL push navigation"
affects:
  - 05-07 (PassageRenderer and QuestionsSection client components will replace placeholders in the detail page)
  - phase-07-gamification (reading session completion flows from this page)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "URL-driven filter state: ReadingFilters 'use client' component pushes searchParams updates, Server Component receives via searchParams prop"
    - "Server Component → NestJS API: fetchWithAuth(cookieHeader, INTERNAL_API_URL/api/reading/passages) pattern"
    - "Temporary dangerouslySetInnerHTML fallback for content not yet wrapped by PassageRenderer"

key-files:
  created:
    - apps/web/src/app/(dashboard)/reading/page.tsx
    - apps/web/src/app/(dashboard)/reading/reading-filters.tsx
    - apps/web/src/app/(dashboard)/reading/[passageId]/page.tsx
  modified: []

key-decisions:
  - "ReadingFilters split as separate 'use client' component — Tabs and Select are Radix/client components, cannot be used directly in Server Components"
  - "Pagination rendered server-side with Link components preserving all filter URL params on page change"
  - "Bookmark toggle button on browse cards calls e.preventDefault() to block navigation — client interactivity wired in 05-07"
  - "dangerouslySetInnerHTML used as temporary fallback for passage content; PassageRenderer (05-07) will add client-side DOMPurify second pass"

patterns-established:
  - "URL filter state pattern: client component calls router.push(buildUrl({key: value})) with URLSearchParams composition preserving other params"
  - "Filter reset-to-page-1: buildUrl() always deletes 'page' param on any filter change"

requirements-completed:
  - READ-01
  - READ-06

# Metrics
duration: 4min
completed: 2026-06-16
---

# Phase 5 Plan 06: Reading Browse and Passage Detail Server Components

**Next.js Server Component routes for reading browse (/reading) and passage detail (/reading/[passageId]) with URL-driven CEFR/topic/type filters and passage header rendering**

## Performance

- **Duration:** 4 min
- **Started:** 2026-06-16T14:20:54Z
- **Completed:** 2026-06-16T14:24:54Z
- **Tasks:** 2
- **Files modified:** 3 created

## Accomplishments

- Reading browse page: responsive 3-column passage card grid with CEFR badge, bookmark icon, title (line-clamp-2), topic badge, and word count; filter bar (CEFR Tabs + topic Select + content type Select) with URL-driven navigation
- Filter state round-trips via URL search params (?level=B2&topic=technology&type=ARTICLE); browser Back works correctly because Server Component reads from searchParams
- Passage detail page: passage header with back link, title, CefrBadge, topic badge, word count, content type; action row with timer placeholder, bookmark toggle, notes toggle; temporary dangerouslySetInnerHTML content body; questions section placeholder
- Both pages auth-gated with `auth()` + `redirect("/login")` before any data fetch
- Both pages call fetchWithAuth to INTERNAL_API_URL following established grammar page pattern

## Task Commits

1. **Task 1: Reading browse page Server Component (/reading)** - `a497aab` (feat)
2. **Task 2: Passage detail Server Component (/reading/[passageId])** - `537ee59` (feat)

## Files Created/Modified

- `apps/web/src/app/(dashboard)/reading/page.tsx` - ReadingPage async Server Component: auth check, fetchPassages(), filter bar, 3-column passage card grid, pagination, empty state
- `apps/web/src/app/(dashboard)/reading/reading-filters.tsx` - ReadingFilters "use client" component: CEFR Tabs, topic Select, content type Select with router.push() URL updates
- `apps/web/src/app/(dashboard)/reading/[passageId]/page.tsx` - ReadingPassagePage async Server Component: auth check, fetchPassageDetail(), passage header (back link + title + metadata + action row), dangerouslySetInnerHTML body placeholder, questions section placeholder

## Deviations from Plan

None - plan executed exactly as written.

The `ReadingFilters` co-located client component was explicitly called for in the plan task action ("Create a minimal ReadingFilters 'use client' component in the same file or as a co-located file for the filter bar controls"). Created as a co-located file per the plan direction.

## Known Stubs

- **Reading timer** (`/reading/[passageId]/page.tsx` action row): hardcoded "0m 0s" — timer starts client-side in PassageRenderer (plan 05-07)
- **Bookmark toggle** (both pages): renders `isBookmarked` state from server but onClick handlers are placeholders — client interaction wired in 05-07
- **Notes toggle** (`/reading/[passageId]/page.tsx`): button renders but panel is not yet implemented — notes panel wired in 05-07
- **dangerouslySetInnerHTML** (`/reading/[passageId]/page.tsx`): temporary content rendering until PassageRenderer client component replaces it in plan 05-07
- **Questions section** (`/reading/[passageId]/page.tsx`): shows heading and count only — QuestionsSection interactive client component built in plan 05-07

These stubs are intentional as the plan explicitly scopes PassageRenderer and QuestionsSection client components to plan 05-07. The page shells are fully functional for navigation and server-side rendering.

## Threat Flags

No new threat surface introduced beyond what was already in the threat model:
- T-05-06-01 (XSS via dangerouslySetInnerHTML) — mitigation confirmed: content sanitized by isomorphic-dompurify in SeedService at DB storage time; comment in code documents this; PassageRenderer (05-07) adds second DOMPurify pass
- T-05-06-02 (unauthenticated access) — mitigated: `auth()` check + `redirect("/login")` present on both Server Components before any data fetch

## Self-Check: PASSED

Files confirmed to exist:
- `/home/tuyen/Desktop/Apps/english-learning/.claude/worktrees/agent-ae05c968a8de9381a/apps/web/src/app/(dashboard)/reading/page.tsx` - FOUND
- `/home/tuyen/Desktop/Apps/english-learning/.claude/worktrees/agent-ae05c968a8de9381a/apps/web/src/app/(dashboard)/reading/reading-filters.tsx` - FOUND
- `/home/tuyen/Desktop/Apps/english-learning/.claude/worktrees/agent-ae05c968a8de9381a/apps/web/src/app/(dashboard)/reading/[passageId]/page.tsx` - FOUND

Commits confirmed:
- a497aab (Task 1: reading browse page)
- 537ee59 (Task 2: passage detail page)
