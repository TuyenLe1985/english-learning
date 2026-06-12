---
phase: 03-vocabulary-module-srs-core
plan: 02
subsystem: vocabulary-api
tags: [vocabulary, nestjs, tdd, jwt-guard, prisma, srs-status, pagination]
dependency_graph:
  requires: ["03-01"]
  provides:
    - apps/api/src/vocabulary/vocabulary.service.ts (getCategories, getWordsByCategory, getWordDetail, getMyWords, assignExerciseType, getMatchingGrid)
    - apps/api/src/vocabulary/vocabulary.controller.ts (4 JWT-guarded endpoints)
    - apps/api/src/vocabulary/vocabulary.module.ts (imports AuthModule, exports VocabularyService)
  affects:
    - apps/api/src/app.module.ts (VocabularyModule registered)
tech_stack:
  added: []
  patterns:
    - Promise.all([findMany, count]) for paginated queries with totalPages = Math.ceil(total/limit)
    - findUniqueOrThrow with err.code P2025 catch → NotFoundException (handles both Prisma and test mock errors)
    - SRS status derivation: New→new, Learning/Relearning→learning, Review+scheduledDays>=30→mastered, Review<30→reviewing
    - Fixed 8-category CATEGORY_MAP with CATEGORY_SLUGS.map() for ordered category list
    - my-words route placed before :category/words to prevent NestJS path ambiguity
key_files:
  created:
    - apps/api/src/vocabulary/vocabulary.service.ts
    - apps/api/src/vocabulary/vocabulary.controller.ts
    - apps/api/src/vocabulary/vocabulary.module.ts
  modified:
    - apps/api/src/app.module.ts
decisions:
  - P2025 error check uses duck-typing (err.code === 'P2025') rather than instanceof Prisma.PrismaClientKnownRequestError to handle both real Prisma errors and test mocks that set err.code directly
  - GET my-words route placed before GET :category/words in controller to prevent NestJS treating "my-words" as a :category path parameter
  - SrsCard scheduledDays uses nullish coalescing (scheduledDays ?? 0) since the field may be absent in test mock objects
metrics:
  duration: "4 minutes"
  completed_date: "2026-06-12"
  tasks_completed: 1
  files_created: 3
  files_modified: 1
---

# Phase 3 Plan 2: VocabularyModule API Summary

**One-liner:** Implement VocabularyService + VocabularyController + VocabularyModule with 4 JWT-guarded endpoints (categories, word list, word detail, my-words) using Prisma pagination, P2025 error mapping, and FSRS-based SRS status derivation — all 16 RED tests turned GREEN.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | GREEN — VocabularyService + VocabularyController + VocabularyModule | 212758b | vocabulary.service.ts, vocabulary.controller.ts, vocabulary.module.ts, app.module.ts |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Duck-typed P2025 error check for test compatibility**
- **Found during:** Task 1 (GREEN implementation analysis)
- **Issue:** The RED spec mocks `findUniqueOrThrow` with a plain `Error` that has a `code: 'P2025'` property — NOT a real `Prisma.PrismaClientKnownRequestError` instance. Using `instanceof Prisma.PrismaClientKnownRequestError` in the catch block would fail to match the mock error, causing the NotFoundException test to fail.
- **Fix:** Check for `err != null && typeof err === 'object' && 'code' in err && err.code === 'P2025'` — matches both the real Prisma error and the test mock.
- **Files modified:** `apps/api/src/vocabulary/vocabulary.service.ts`
- **Commit:** 212758b

**2. [Rule 2 - Missing Critical Functionality] Route ordering to prevent path ambiguity**
- **Found during:** Task 1 (controller design)
- **Issue:** NestJS matches routes top-to-bottom. If `GET :category/words` were defined before `GET my-words`, a request to `/vocabulary/my-words` would be matched as category=`my-words`, causing incorrect behavior.
- **Fix:** Placed `GET my-words` endpoint before `GET :category/words` in the controller — NestJS will match the literal route first.
- **Files modified:** `apps/api/src/vocabulary/vocabulary.controller.ts`
- **Commit:** 212758b

## Verification Results

| Check | Result |
|-------|--------|
| `vocabulary.service.spec.ts` — 16 tests pass (GREEN) | PASS |
| getCategories returns exactly 8 categories | PASS |
| getWordsByCategory totalPages = Math.ceil(25/20) = 2 | PASS |
| getWordDetail throws NotFoundException for P2025 | PASS |
| getMyWords returns status + nextReviewDate | PASS |
| assignExerciseType returns one of 6 types | PASS |
| getMatchingGrid returns exactly 4 words | PASS |
| `grep -c "UseGuards(JwtAuthGuard)"` >= 4 (actual: 5 lines inc. comment) | PASS |
| VocabularyModule in app.module.ts | PASS |
| AuthModule in vocabulary.module.ts | PASS |
| No new type errors in vocabulary files | PASS |

## Known Stubs

None — this plan implements the NestJS service and controller only. UI stubs are tracked in subsequent plans (03-03/03-05/03-06).

## Threat Flags

No new threat surface beyond what was documented in the plan's threat model.

T-03-03 (mitigate): All 4 endpoints have `@UseGuards(JwtAuthGuard)` — verified by grep.
T-03-04 (mitigate): `getMyWords` always scopes query with `where: { userId }` — userId from JWT, not body.
T-03-05 (mitigate): All Prisma queries use parameterized `where` clauses — no `$queryRaw` usage.

## TDD Gate Compliance

- RED gate: `vocabulary.service.spec.ts` existed from Plan 03-01 (commit 7bdc676) — all tests failed before implementation
- GREEN gate: commit 212758b — all 16 tests pass after implementation
- REFACTOR gate: not needed — implementation is clean on first pass

## Self-Check: PASSED

Files verified:
- apps/api/src/vocabulary/vocabulary.service.ts: exists (commits verified)
- apps/api/src/vocabulary/vocabulary.controller.ts: exists
- apps/api/src/vocabulary/vocabulary.module.ts: exists
- apps/api/src/app.module.ts: contains VocabularyModule import

Commits verified:
- 212758b: feat(03-02): implement VocabularyModule GREEN
