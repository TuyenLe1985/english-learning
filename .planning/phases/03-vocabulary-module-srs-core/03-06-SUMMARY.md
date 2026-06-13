---
phase: 03-vocabulary-module-srs-core
plan: "06"
subsystem: ui
tags: [react-query, srs, framer-motion, next-auth, cookies, vocabulary]

requires:
  - phase: 03-vocabulary-module-srs-core
    provides: SRS queue/review NestJS endpoints (Plans 03-04) and my-words endpoint (Plan 03-02)

provides:
  - SRS review queue page (/review) with card flip, Again/Hard/Good/Easy ratings, React Query cache invalidation
  - Personal vocabulary list page (/vocabulary/my-words) with status filter tabs and next review dates
  - 3 auth-gated Next.js relay routes (srs/queue, srs/review, vocabulary/my-words)
  - ReviewCard, RatingButtons, StatusFilter components
  - review-card Vitest unit tests (10 tests)
  - E2E vocabulary spec with authenticated happy-path SRS review flow
  - Bug fix: server-side vocabulary fetches now pass session token to NestJS (categories, word list, word detail)

affects: [04-grammar-module, 07-quiz-center-gamification, 08-adaptive-engine]

tech-stack:
  added: []
  patterns:
    - React Query useQuery/useMutation for SRS review state with staleTime 0
    - cookies() from next/headers to forward authjs session token in server components
    - Framer Motion card flip mechanic for ReviewCard

key-files:
  created:
    - apps/web/src/app/(dashboard)/review/page.tsx
    - apps/web/src/app/(dashboard)/vocabulary/my-words/page.tsx
    - apps/web/src/app/api/srs/queue/route.ts
    - apps/web/src/app/api/srs/review/route.ts
    - apps/web/src/app/api/vocabulary/my-words/route.ts
    - apps/web/src/components/srs/review-card.tsx
    - apps/web/src/components/srs/rating-buttons.tsx
    - apps/web/src/components/vocabulary/status-filter.tsx
    - apps/web/src/components/srs/review-card.test.tsx
  modified:
    - apps/web/e2e/vocabulary.spec.ts
    - apps/web/src/app/(dashboard)/vocabulary/page.tsx
    - apps/web/src/app/(dashboard)/vocabulary/[category]/page.tsx
    - apps/web/src/app/(dashboard)/vocabulary/[category]/[wordId]/page.tsx

key-decisions:
  - "srs-queue React Query staleTime set to 0 — review queue must always reflect server state"
  - "ReviewCard flip uses Framer Motion rotateY, matching the flashcard pattern from Plan 03-05"
  - "RatingButtons use variant=outline with UI-SPEC text colors (red/orange/green/blue) and 44px min-height for touch targets"
  - "server components extract authjs.session-token via cookies() from next/headers rather than using relay routes"

patterns-established:
  - "Server component auth pattern: import { cookies } from next/headers, extract authjs.session-token, pass as Authorization: Bearer"
  - "SRS review mutation: useMutation POST /api/srs/review then invalidate ['srs-queue'] on success"

requirements-completed: [VOCAB-06, VOCAB-07]

duration: ~60min
completed: 2026-06-13
---

# Plan 03-06: SRS Review Queue + My Words Summary

**SRS review queue (/review) and personal vocabulary list (/vocabulary/my-words) with FSRS rescheduling, plus a bug fix for server-side vocab fetches that were silently 401-ing**

## Performance

- **Duration:** ~60 min
- **Tasks:** 3 (2 auto + 1 human checkpoint)
- **Files modified:** 13

## Accomplishments

- `/review` page: React Query `useQuery(["srs-queue"], staleTime: 0)` + `useMutation` POST to `/api/srs/review` with cache invalidation; Framer Motion ReviewCard flip; Again/Hard/Good/Easy rating buttons with FSRS rescheduling; "All caught up!" empty state
- `/vocabulary/my-words` page: full personal vocabulary list with StatusFilter tabs (All/New/Learning/Review/Mastered), SRS status badges, next review dates, pagination
- 3 auth-gated relay routes for SRS queue, review submission, and my-words
- Bug fix: `/vocabulary`, `/vocabulary/[category]`, and `/vocabulary/[category]/[wordId]` server components were fetching NestJS endpoints without auth — fixed by forwarding `authjs.session-token` via `cookies()` from `next/headers`

## Task Commits

1. **Task 1: SRS + my-words relay routes** — `2e58691` (feat)
2. **Task 2: Review queue page + my-words page + components** — `91dbccb` (feat)
3. **Task 3: Human checkpoint (phase 3 E2E verification)** — approved after bug fix below
4. **Bug fix: vocabulary server-side auth** — `3c0becb` (fix)

## Files Created/Modified

- `apps/web/src/app/api/srs/queue/route.ts` — GET relay: auth gate → NestJS /api/srs/queue
- `apps/web/src/app/api/srs/review/route.ts` — POST relay: auth gate → forwards {cardId, rating}
- `apps/web/src/app/api/vocabulary/my-words/route.ts` — GET relay: auth gate + status/page params
- `apps/web/src/app/(dashboard)/review/page.tsx` — SRS review queue page (React Query)
- `apps/web/src/app/(dashboard)/vocabulary/my-words/page.tsx` — Personal vocab list with filter
- `apps/web/src/components/srs/review-card.tsx` — Framer Motion flip card
- `apps/web/src/components/srs/rating-buttons.tsx` — Again/Hard/Good/Easy (aria-label, 44px)
- `apps/web/src/components/vocabulary/status-filter.tsx` — shadcn Tabs: All/New/Learning/Review/Mastered
- `apps/web/src/components/srs/review-card.test.tsx` — 10 Vitest tests for flip + rating buttons
- `apps/web/e2e/vocabulary.spec.ts` — Authenticated happy-path SRS review E2E
- `apps/web/src/app/(dashboard)/vocabulary/page.tsx` — Fixed: pass session token to NestJS fetch
- `apps/web/src/app/(dashboard)/vocabulary/[category]/page.tsx` — Fixed: pass session token
- `apps/web/src/app/(dashboard)/vocabulary/[category]/[wordId]/page.tsx` — Fixed: pass session token

## Decisions Made

- `staleTime: 0` for `srs-queue` query — review queue must always be fresh from server
- Server components use `cookies()` from `next/headers` rather than relay routes for SSR fetches — simpler, avoids extra network hop

## Deviations from Plan

### Auto-fixed Issues

**1. Bug — Server-side vocabulary fetches returning empty (401 from NestJS)**
- **Found during:** Task 3 human checkpoint (user reported "No categories available")
- **Issue:** All three vocabulary server components fetched NestJS JWT-protected endpoints with no `Authorization` header, getting 401 silently caught as empty array
- **Fix:** Added `getSessionToken()` using `cookies()` from `next/headers` in all three pages; token forwarded as `Bearer` on each fetch
- **Files modified:** vocabulary/page.tsx, vocabulary/[category]/page.tsx, vocabulary/[category]/[wordId]/page.tsx
- **Verification:** User confirmed categories visible after fix
- **Committed in:** `3c0becb`

---

**Total deviations:** 1 auto-fixed (auth header missing on server-side NestJS fetches)
**Impact on plan:** Essential correctness fix — vocabulary browsing was completely broken without it.

## Issues Encountered

None beyond the auth deviation above.

## Next Phase Readiness

- Phase 3 complete: all VOCAB-01..07 requirements satisfied
- Auth token forwarding pattern via `cookies()` established for future server components
- Ready for Phase 04: Grammar Module

---
*Phase: 03-vocabulary-module-srs-core*
*Completed: 2026-06-13*
