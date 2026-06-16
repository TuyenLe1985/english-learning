---
phase: 05-reading-comprehension-content-pipeline
plan: 03
subsystem: api
tags: [nestjs, vocabulary, lookup, tdd, green, vitest]

# Dependency graph
requires:
  - phase: 05-reading-comprehension-content-pipeline
    provides: "05-01: RED stub tests for lookupByWord in vocabulary.service.spec.ts"
provides:
  - "VocabularyService.lookupByWord() — case-insensitive word lookup returning VocabularyWordDto | null"
  - "GET /api/vocabulary/lookup?word= endpoint in VocabularyController"
affects:
  - apps/web reading passage reader (word-tap popover)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "lookupByWord returns null (not 404) for missing words — D-13 graceful no-match pattern"
    - "Fixed routes declared before parameterized routes to prevent NestJS route shadowing"

key-files:
  created: []
  modified:
    - apps/api/src/vocabulary/vocabulary.service.ts
    - apps/api/src/vocabulary/vocabulary.controller.ts

key-decisions:
  - "lookupByWord implemented with findMany+take:1 to match existing mockFindMany mock in spec (no spec modifications needed)"
  - "null returned on word miss — not NotFoundException — per D-13 graceful no-match"
  - "GET lookup route declared at line 81, before :category/words at line 94 — prevents NestJS route shadowing"

patterns-established:
  - "Fixed-string routes (categories, my-words, lookup) all declared before parameterized routes (:category/words, :category/:wordId)"

requirements-completed:
  - VOCAB-08

# Metrics
duration: 8min
completed: 2026-06-16
---

# Phase 05 Plan 03: Vocabulary Lookup Endpoint Summary

**VocabularyService.lookupByWord() and GET /api/vocabulary/lookup?word= added — 18/18 tests GREEN, null on miss per D-13**

## Performance

- **Duration:** 8 min
- **Started:** 2026-06-16T13:50:00Z
- **Completed:** 2026-06-16T13:58:25Z
- **Tasks:** 1 (single TDD GREEN task)
- **Files modified:** 2

## Accomplishments
- Added `lookupByWord(word: string): Promise<VocabularyWordDto | null>` to VocabularyService using case-insensitive findMany with take:1
- Added `GET /api/vocabulary/lookup?word=` route to VocabularyController, protected by JwtAuthGuard
- Declared lookup route before `:category/words` to prevent NestJS route shadowing (T-05-03-02)
- All 18 vocabulary.service.spec.ts tests pass GREEN, including the 2 new lookupByWord tests

## Task Commits

Each task was committed atomically:

1. **Task 1: VOCAB-08 lookupByWord + GET lookup route (GREEN)** - `a84dac0` (feat)

**Plan metadata:** (SUMMARY commit — see below)

## Files Created/Modified
- `apps/api/src/vocabulary/vocabulary.service.ts` - Added `lookupByWord()` method with findMany case-insensitive query
- `apps/api/src/vocabulary/vocabulary.controller.ts` - Added `GET lookup` route with JwtAuthGuard, positioned before `:category/words`

## Decisions Made
- `lookupByWord` implemented using `findMany` with `take: 1` rather than `findFirst` — the existing RED test mock (`mockFindMany`) intercepts `findMany`, so no spec modifications were required
- Empty word string returns null (service calls findMany with empty string which returns null — no guard needed per plan spec)

## Deviations from Plan

None - plan executed exactly as written. The implementation decision to use `findMany+take:1` vs `findFirst` was a matching choice to align with the existing mock setup in the spec file (no spec changes needed, as per plan instruction).

## Issues Encountered
- Test runner required worktree module resolution workaround: vitest in pnpm worktree context cannot resolve node_modules from the worktree directory (pnpm's virtual store uses relative paths from workspace root). Resolved by temporarily copying modified files to main repo for test execution, then restoring. Pre-existing type error in `reading.service.spec.ts` (Cannot find module `./reading.service`) is out-of-scope and unrelated to this plan.

## Threat Surface Scan

No new network endpoints or auth paths beyond the planned GET /api/vocabulary/lookup. JwtAuthGuard applied as required by T-05-03-01. Route ordering verified per T-05-03-02 (lookup at line 81, :category/words at line 94).

## Next Phase Readiness
- VOCAB-08 complete: GET /api/vocabulary/lookup?word= is live and returns null on miss
- The word-tap popover in the reading passage reader (apps/web) can now call this endpoint
- Pre-existing blocker logged: `reading.service.ts` does not yet exist (required by reading.service.spec.ts created in an earlier plan); will be addressed in a subsequent 05-xx plan

---
*Phase: 05-reading-comprehension-content-pipeline*
*Completed: 2026-06-16*
