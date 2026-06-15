---
phase: 06-listening-comprehension
plan: "04"
subsystem: listening-comprehension
tags:
  - next-js
  - server-component
  - browse-page
  - detail-page
  - relay-route
  - list-01
  - list-06
dependency_graph:
  requires:
    - "06-01: ListeningItemDto, PaginatedListeningItemsDto, ListeningItemDetailDto from packages/shared"
    - "06-02: NestJS ListeningModule (GET /api/listening/items, GET /api/listening/items/:id, POST /api/listening/sessions/complete)"
    - "06-03: Slider UI component at apps/web/src/components/ui/slider.tsx"
  provides:
    - "GET /listening Server Component browse page with CEFR filters, topic select, content type select, item grid, empty state, pagination"
    - "GET /listening/[itemId] Server Component detail page with back link, title, metadata, ListeningItemClient stub"
    - "POST /api/listening/sessions/complete Next.js relay route forwarding to NestJS"
    - "ListeningItemCard client component with CefrBadge, content type label, duration, exercise count"
    - "ListeningFilters client component with useRouter URL-based filter updates"
    - "ListeningItemClient stub placeholder for Plan 06 audio player + exercises"
  affects:
    - "06-06: ListeningItemClient stub will be replaced with full AudioPlayer + TranscriptPanel + exercise carousel"
tech_stack:
  added: []
  patterns:
    - "Server Component page with fetchWithAuth + INTERNAL_API_URL (mirrors grammar/page.tsx pattern exactly)"
    - "URL-driven filtering: CEFR tabs use Link href, topic/type use client useRouter.push with URLSearchParams"
    - "Next.js relay route: auth() + headers() + fetchWithAuth to INTERNAL_API_URL (mirrors grammar relay pattern)"
key_files:
  created:
    - apps/web/src/app/(dashboard)/listening/page.tsx
    - apps/web/src/app/(dashboard)/listening/[itemId]/page.tsx
    - apps/web/src/app/api/listening/sessions/complete/route.ts
    - apps/web/src/components/listening/listening-item-card.tsx
    - apps/web/src/components/listening/listening-filters.tsx
    - apps/web/src/components/listening/listening-item-client.tsx
  modified: []
decisions:
  - "CEFR level tabs implemented as Link components (server-side navigation) rather than client-side Tabs — Tabs is a client component requiring 'use client', but the browse page is a Server Component; Link-based tabs trigger re-fetch without adding a client boundary"
  - "ListeningFilters extracted as a separate client component — topic/type selects need useRouter and useState which require 'use client', but the parent browse page must stay a Server Component for SSR data fetching"
  - "Topics list derived from current page's items — avoids an extra API call for a topics endpoint that doesn't exist yet; Plan 06 can add a dedicated /api/listening/topics endpoint if needed"
  - "ListeningItemClient stub rendered in detail page rather than inlining audio/transcript directly — clean separation of concerns; Plan 06 fills in the full client implementation"
  - "Relay route uses INTERNAL_API_URL (not API_URL) to match container-internal routing pattern established in grammar relay routes"
metrics:
  duration: "~4min"
  completed_date: "2026-06-15"
  tasks_completed: 2
  files_created: 6
  files_modified: 0
---

# Phase 6 Plan 04: Next.js Listening Pages and Relay Route Summary

**Server Component browse page with CEFR/topic/type filters, ListeningItemCard, detail page shell with metadata header, and session completion relay route**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-06-15T14:16:04Z
- **Completed:** 2026-06-15T14:20:00Z
- **Tasks:** 2
- **Files created:** 6

## Accomplishments

### Task 1: Browse page + ListeningItemCard (commit 03c5fd7)

- Created `/listening` Server Component browse page mirroring grammar/page.tsx pattern (auth check → headers → fetchWithAuth → render)
- CEFR level filter tabs (All/B1/B2/C1) implemented as Link-based navigation (no client boundary needed)
- ListeningFilters client component handles topic and content type selects with useRouter URL updates
- Responsive grid: 1 col mobile → 2 col md → 3 col xl, gap-6
- Empty state: "No listening items match your filters" with helpful sub-text
- Pagination with prev/next links when totalPages > 1
- ListeningItemCard renders CefrBadge, content type label (NEWS_REPORT→"News Report"), formatted duration, exercise count
- All ListeningItemDto types from `@repo/shared` — no inline type definitions

### Task 2: Detail page + relay route + ListeningItemClient stub (commit 010f7c0)

- Created `/listening/[itemId]` Server Component detail page
- Null-item error state renders "Could not load this item. Try refreshing." with back link
- Item header: ChevronLeft back link, 20px title, CefrBadge + content type badge + duration + exercise count metadata row
- ListeningItemClient stub placeholder (renders "Audio player and exercises coming in Plan 06")
- POST `/api/listening/sessions/complete` relay route: auth() gate + body parse + fetchWithAuth to INTERNAL_API_URL/api/listening/sessions/complete (mirrors grammar relay pattern)
- T-06-09 mitigation: relay does not inject userId — NestJS derives it from JWT
- shadcn Slider confirmed already present from Plan 03

## Task Commits

1. **Task 1: Listening browse page + ListeningItemCard + ListeningFilters** - `03c5fd7` (feat)
2. **Task 2: Detail page + relay route + ListeningItemClient stub** - `010f7c0` (feat)

## Files Created

- `apps/web/src/app/(dashboard)/listening/page.tsx` — Server Component browse page
- `apps/web/src/app/(dashboard)/listening/[itemId]/page.tsx` — Server Component detail page
- `apps/web/src/app/api/listening/sessions/complete/route.ts` — Next.js POST relay route
- `apps/web/src/components/listening/listening-item-card.tsx` — Browse grid card component
- `apps/web/src/components/listening/listening-filters.tsx` — Client filter selects component
- `apps/web/src/components/listening/listening-item-client.tsx` — Client orchestrator stub

## Decisions Made

- **CEFR tabs as Link components**: Tabs is a client component; using Link keeps the browse page as a Server Component for SSR data fetching
- **Separate ListeningFilters client component**: topic/type selects need `useRouter` (client-only); extracted to keep parent Server Component pure
- **Topics derived from current items**: avoids an extra API call; adequate for current use case
- **INTERNAL_API_URL in relay route**: matches container-internal routing (same as grammar relay)

## Deviations from Plan

None — plan executed exactly as written. All acceptance criteria met on first implementation.

## Known Stubs

| Stub | File | Reason |
|------|------|--------|
| ListeningItemClient renders placeholder text | `apps/web/src/components/listening/listening-item-client.tsx` | Full audio player + transcript + exercise implementation deferred to Plan 06 per plan spec |

The stub is intentional per the plan spec: "Create a minimal stub that renders `<div>Player coming in Plan 06</div>`". Plan 06 will replace `listening-item-client.tsx` with the full AudioPlayer + TranscriptPanel + exercise carousel.

## Threat Flags

No new threat surface introduced beyond what the plan's threat model anticipated:
- T-06-09: relay does not inject userId — implemented as specified
- T-06-10: audioUrl from ListeningItemDetailDto is passed to ListeningItemClient stub only — not exposed in page metadata or logs

## Self-Check: PASSED

Files verified:
- `apps/web/src/app/(dashboard)/listening/page.tsx` exists, contains `fetchWithAuth`, `redirect("/login")` — FOUND
- `apps/web/src/app/(dashboard)/listening/[itemId]/page.tsx` exists, contains `ListeningItemDetailDto`, `ChevronLeft`, "Could not load this item" — FOUND
- `apps/web/src/app/api/listening/sessions/complete/route.ts` exists, exports `POST`, calls `INTERNAL_API_URL/api/listening/sessions/complete` — FOUND
- `apps/web/src/components/listening/listening-item-card.tsx` exists, contains `CefrBadge`, `NEWS_REPORT: "News Report"` — FOUND
- `apps/web/src/components/listening/listening-filters.tsx` exists — FOUND
- `apps/web/src/components/listening/listening-item-client.tsx` exists — FOUND
- `apps/web/src/components/ui/slider.tsx` exists (from Plan 03) — FOUND

Commits verified:
- 03c5fd7 (Task 1: browse page + card + filters) — FOUND
- 010f7c0 (Task 2: detail page + relay + stub) — FOUND

TypeScript: `pnpm --filter @repo/web exec tsc --noEmit` — no errors in listening files; pre-existing errors in auth-actions.test.ts and database generated client are out of scope.
