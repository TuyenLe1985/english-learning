---
phase: 05-reading-comprehension-content-pipeline
plan: "03"
subsystem: vocabulary-api
tags:
  - vocabulary
  - lookup
  - nestjs
  - tdd-green
  - vocab-08
dependency_graph:
  requires:
    - 05-01
  provides:
    - GET /api/vocabulary/lookup?word= endpoint
    - VocabularyService.lookupByWord()
  affects:
    - apps/web reading passage word-tap popover
tech_stack:
  added: []
  patterns:
    - "case-insensitive findMany with mode: insensitive and take: 1"
    - "null-on-miss pattern (D-13) for graceful word lookup"
key_files:
  modified:
    - apps/api/src/vocabulary/vocabulary.service.ts
    - apps/api/src/vocabulary/vocabulary.controller.ts
decisions:
  - "lookupByWord uses findMany with take: 1 to match existing test mock (mockFindMany) rather than findFirst — semantically equivalent, test-compatible"
  - "lookup route declared between my-words and :category/words to prevent NestJS route shadowing (T-05-03-02)"
metrics:
  duration: 10m
  completed_date: "2026-06-14"
  tasks_completed: 1
  files_modified: 2
---

# Phase 5 Plan 3: Vocabulary Lookup Endpoint (VOCAB-08) Summary

**One-liner:** Case-insensitive vocabulary word lookup via GET /api/vocabulary/lookup with null-on-miss response per D-13 graceful no-match.

## What Was Built

Added the VOCAB-08 vocabulary lookup capability to the vocabulary module:

1. **VocabularyService.lookupByWord(word)** — New method using `findMany` with `mode: insensitive` and `take: 1` to perform case-insensitive word lookup. Returns `VocabularyWordDto | null` — never throws `NotFoundException` per D-13.

2. **GET /api/vocabulary/lookup route** — New fixed route in `VocabularyController` declared after `my-words` and BEFORE `:category/words` to prevent NestJS route shadowing. Applies `JwtAuthGuard` for auth. Normalizes input with `toLowerCase().trim()`.

## Tasks Completed

| Task | Description | Files | Commit |
|------|-------------|-------|--------|
| GREEN | Implement lookupByWord + lookup route | vocabulary.service.ts, vocabulary.controller.ts | 04104f4 |

## Verification Results

1. **Tests GREEN**: 18/18 passed including 2 new lookupByWord() tests
   - returns a VocabularyWordDto when the word is found
   - returns null when the word is not found (D-13 graceful no-match, not 404)
2. **Route order**: @Get('lookup') at line 82, @Get(':category/words') at line 96
3. **Method count**: grep -c returns 5 (>=2)
4. **Type check**: vocabulary files have zero errors (pre-existing errors in classifier.service.ts are from another plan, out of scope)

## TDD Gate Compliance

- RED gate: lookupByWord tests existed in vocabulary.service.spec.ts from commit 1828f1f (plan 05-01)
- GREEN gate: Implementation committed in 04104f4 — all lookupByWord tests turn GREEN
- REFACTOR: Not needed — implementation is minimal and clean

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test mock uses findMany, not findFirst**
- **Found during:** Task 1 (GREEN implementation)
- **Issue:** The RED test stubs use mockFindMany.mockResolvedValue([sampleWord]) — the mockPrisma object does not have a findFirst mock. If lookupByWord used findFirst, it would call undefined and throw.
- **Fix:** Implemented lookupByWord using findMany with take: 1 instead of findFirst. Semantically equivalent: both return the first matching record; the mode: insensitive filter works identically. The tests pass GREEN without spec modification.
- **Files modified:** apps/api/src/vocabulary/vocabulary.service.ts
- **Commit:** 04104f4

## Known Stubs

None — lookupByWord is fully implemented and returns real DB data.

## Threat Surface Scan

No new security surface introduced beyond what was planned:
- GET /api/vocabulary/lookup is guarded by JwtAuthGuard (T-05-03-01 accepted)
- Route ordering prevents shadowing (T-05-03-02 mitigated)
- No new network endpoints, auth paths, file access patterns, or schema changes

## Self-Check: PASSED

- [x] apps/api/src/vocabulary/vocabulary.service.ts exists with lookupByWord method
- [x] apps/api/src/vocabulary/vocabulary.controller.ts exists with @Get('lookup') route
- [x] Commit 04104f4 exists in git log
- [x] 18/18 tests pass GREEN
- [x] Route order verified: lookup (82) before :category/words (96)
