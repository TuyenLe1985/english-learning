---
phase: 06-listening-comprehension
plan: "02"
subsystem: listening-comprehension
tags:
  - nestjs
  - tdd
  - s3-presigned-urls
  - prisma
  - jwt-auth
dependency_graph:
  requires:
    - "06-01: listening.service.spec.ts RED scaffolds (ListeningService test suite)"
    - "06-01: listening.dto.ts Zod schemas (ListeningItemDto, ListeningSessionCompleteDto, etc.)"
    - "06-01: Prisma schema with ListeningContent, ListeningProgress, XpEvent models"
    - "04-xx: GrammarModule pattern (controller + service + module template)"
  provides:
    - "GET /api/listening/items — paginated list filtered by cefrLevel/topic/contentType"
    - "GET /api/listening/items/:id — item detail with presigned audio URL and wordTimestamps"
    - "POST /api/listening/sessions/complete — upserts ListeningProgress + XpEvent LISTENING"
    - "ListeningModule registered in AppModule"
  affects:
    - "06-03: ListeningSeedService (depends on ListeningModule being wired)"
    - "06-05: Audio player hook tests (depend on presigned URL API)"
    - "06-06: Next.js page (calls these endpoints)"
tech_stack:
  added:
    - "@aws-sdk/client-s3 (already installed) — GetObjectCommand for presigned URLs"
    - "@aws-sdk/s3-request-presigner (already installed) — getSignedUrl()"
  patterns:
    - "GrammarModule pattern: module imports AuthModule, NO PrismaModule (global via AppModule)"
    - "AuthenticatedRequest interface: user.userId from JWT, never from request body"
    - "Fixed-string routes before parameterized: POST sessions/complete declared before GET items/:id"
    - "S3 presigned URL with 3600s expiry, empty string fallback when audioStorageKey is null"
    - "Server-recomputed accuracy: client accuracy field ignored, computed from attempts[]"
key_files:
  created:
    - apps/api/src/listening/listening.service.ts
    - apps/api/src/listening/listening.controller.ts
    - apps/api/src/listening/listening.module.ts
  modified:
    - apps/api/src/app.module.ts
key-decisions:
  - "ListeningService constructor takes only PrismaService (no ConfigService) — S3 client reads process.env directly to match test instantiation pattern new ListeningService(mockPrisma)"
  - "progress array guard: (item.progress ?? [])[0] — mocked PrismaClient returns object without progress relation, guard prevents runtime crash"
  - "T-06-04 validation: fetch content._count.questions before upsert — BadRequestException if attempts.length exceeds question count"
  - "S3 getSignedUrl wrapped in try/catch — returns empty string on presigner error (service degradation rather than 500)"

patterns-established:
  - "Listening API routes follow GrammarModule pattern exactly (controller, service, module)"
  - "Session completion accuracy is always server-computed from attempts[].isCorrect, never trusted from client"

requirements-completed:
  - LIST-01
  - LIST-03
  - LIST-07

duration: ~6min
completed: 2026-06-15
---

# Phase 6 Plan 02: NestJS ListeningModule Summary

**TDD GREEN: ListeningService + ListeningController + ListeningModule wired into AppModule, delivering 3 REST endpoints with JWT auth, presigned S3 audio URLs, and server-computed session accuracy**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-06-15T21:03:00Z
- **Completed:** 2026-06-15T21:09:00Z
- **Tasks:** 1 (single GREEN commit, TDD plan)
- **Files modified:** 4

## Accomplishments

- All 10 tests in `listening.service.spec.ts` pass GREEN (was: failing at import — ListeningService did not exist)
- `ListeningService.getItems()` builds dynamic Prisma where clause from cefrLevel/topic/contentType filters, runs Promise.all([findMany, count]), returns paginated shape
- `ListeningService.getItemById()` generates presigned S3 URL with 1-hour expiry; gracefully returns empty string when audioStorageKey is null
- `ListeningService.completeSession()` validates attempts.length against question count (T-06-04), recomputes accuracy server-side (T-06-03), upserts ListeningProgress with compound key, creates XpEvent with skillArea LISTENING
- Controller route order correct: GET items → POST sessions/complete → GET items/:id (Pitfall 7 mitigation)
- ListeningModule registered in AppModule after GrammarModule

## Task Commits

1. **GREEN: ListeningService + ListeningController + ListeningModule** - `0fddcc3` (feat)

## Files Created/Modified

- `apps/api/src/listening/listening.service.ts` — Full ListeningService with getItems(), getItemById(), completeSession()
- `apps/api/src/listening/listening.controller.ts` — Controller with JWT guards, correct route order
- `apps/api/src/listening/listening.module.ts` — Module registration mirroring GrammarModule
- `apps/api/src/app.module.ts` — Added ListeningModule import and registration

## Decisions Made

- `ListeningService` constructor takes only `PrismaService` (no `ConfigService`) — S3 client reads `process.env` directly. This matches the test instantiation pattern `new ListeningService(mockPrisma)` which passes only one argument.
- `(item.progress ?? [])[0]` guard used instead of `item.progress[0]` — the mocked PrismaClient in tests returns objects without the `progress` relation included, causing a runtime crash without the guard.
- `getSignedUrl` wrapped in try/catch returning empty string — audio URL generation failure degrades gracefully rather than throwing a 500 for the entire item detail request.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed `item.progress[0]` crash when progress relation is absent from mock**
- **Found during:** GREEN phase — `getItemById() returns item detail` test failure
- **Issue:** Test mock for `listeningContent.findUnique` did not include a `progress` array (only `questions`), causing `item.progress[0]` to throw `Cannot read properties of undefined (reading '0')`
- **Fix:** Changed to `(item.progress ?? [])[0] ?? null` — defensive array access handles both mock (undefined) and production (empty array) scenarios
- **Files modified:** `apps/api/src/listening/listening.service.ts` line 151
- **Verification:** All 10 tests pass after fix
- **Committed in:** 0fddcc3 (part of GREEN commit)

**2. [Rule 3 - Blocking] Prisma client not generated in worktree (pre-commit build check)**
- **Found during:** Build verification step
- **Issue:** `packages/database/generated/` is in `.gitignore` and not present in the worktree, causing TypeScript compilation errors on all Prisma model property accesses
- **Fix:** Ran `/home/tuyen/Desktop/Apps/english-learning/packages/database/node_modules/.bin/prisma generate` to generate the client in the worktree
- **Files modified:** `packages/database/generated/` (gitignored, not committed)
- **Verification:** Prisma property access errors in listening.service.ts resolved
- **Committed in:** N/A — generated files are gitignored

---

**Total deviations:** 2 auto-fixed (1 bug fix, 1 blocking resolution)
**Impact on plan:** Both fixes essential for test passage and build environment. No scope creep.

## Issues Encountered

- `pnpm turbo build` exits non-zero due to pre-existing RED test scaffolds from Plans 06-01 and prior phases (listening-seed.service.spec.ts, reading.service.spec.ts) — these import modules not yet implemented. This is an expected build state; NestJS `tsc` includes `**/*.spec.ts` files. The build was failing before Plan 06-02 and continues to fail on unrelated RED scaffolds. All listening module TypeScript errors were resolved after Prisma client generation.

## TDD Gate Compliance

- RED gate: Plan 06-01 created the failing test file (commit 957309a) — RED scaffold confirmed
- GREEN gate: Plan 06-02 creates implementation making all 10 tests pass (commit 0fddcc3) — GREEN gate met
- REFACTOR gate: Not needed — implementation is clean without refactoring required

## Known Stubs

None — all three service methods are fully implemented and wired.

## Threat Flags

No new threat surface introduced. All T-06-02 through T-06-05 mitigations applied as specified in the plan's threat model.

## Self-Check: PASSED

Files verified:
- `apps/api/src/listening/listening.service.ts` — FOUND
- `apps/api/src/listening/listening.controller.ts` — FOUND
- `apps/api/src/listening/listening.module.ts` — FOUND
- `apps/api/src/app.module.ts` contains `ListeningModule` — FOUND

Commits verified:
- 0fddcc3 (feat: GREEN implementation) — FOUND

Tests verified:
- `pnpm --filter @repo/api test -- listening.service.spec` → 10 passed (10) — CONFIRMED
