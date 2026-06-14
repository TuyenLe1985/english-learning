---
phase: 05-reading-comprehension-content-pipeline
plan: "02"
subsystem: reading-api
tags: [tdd-green, nestjs, reading, api, prisma]
dependency_graph:
  requires:
    - 05-01 (reading.service.spec.ts TDD RED scaffolds, shared DTOs)
  provides:
    - ReadingService (7 methods)
    - ReadingController (7 routes)
    - ReadingModule (NestJS module)
    - /api/reading/* endpoints live in AppModule
  affects:
    - apps/api/src/app.module.ts (ReadingModule added)
    - packages/database/prisma/schema.prisma (Note @@unique fixed)
tech_stack:
  added: []
  patterns:
    - NestJS Injectable service with PrismaService injection
    - Zod schema validation on all POST bodies
    - JwtAuthGuard on all endpoints
    - Fixed-string routes before parameterized routes (NestJS route order rule)
    - IDOR protection: deleteHighlight fetches and verifies userId before delete
    - upsert pattern for ReadingProgress and Note (idempotent completion)
    - toggle pattern for Bookmark (findUnique → delete or create)
key_files:
  created:
    - apps/api/src/reading/reading.service.ts
    - apps/api/src/reading/reading.controller.ts
    - apps/api/src/reading/reading.module.ts
  modified:
    - apps/api/src/app.module.ts
    - packages/database/prisma/schema.prisma
decisions:
  - "Note model changed from @@index to @@unique([userId, passageId]) to support upsert with compound key — required by spec"
metrics:
  duration: "12 minutes"
  completed: "2026-06-14"
  tasks: 1
  files: 5
---

# Phase 05 Plan 02: ReadingModule GREEN Phase Summary

**One-liner:** NestJS ReadingModule with 7-method service, 7-route controller, and IDOR-protected highlight deletion — making all 12 TDD RED tests GREEN.

## What Was Built

ReadingService, ReadingController, and ReadingModule provide the complete NestJS API surface for reading comprehension:

- `GET /api/reading/passages` — paginated, filterable passage list with bookmark status
- `GET /api/reading/passages/:id` — passage detail with questions, user highlights, note, progress
- `POST /api/reading/sessions/complete` — upserts ReadingProgress (idempotent)
- `POST /api/reading/highlights` — creates highlight for requesting user
- `DELETE /api/reading/highlights/:id` — verifies ownership before delete (IDOR protection)
- `POST /api/reading/notes` — upserts one note per user+passage
- `POST /api/reading/bookmarks` — toggles bookmark (create if absent, delete if present)

ReadingModule registered in AppModule after GrammarModule.

## TDD Gate Compliance

- RED phase: `test(05-01): add TDD RED scaffolds for ReadingService, ClassifierService, lookupByWord` (commit `1828f1f`)
- GREEN phase: `feat(05-02): implement ReadingModule GREEN — service, controller, module` (commit `1fae691`)
- All 12 reading.service.spec.ts tests: PASS

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Note model schema: @@index → @@unique**
- **Found during:** Task 1 implementation — TypeScript type-check failed with `userId_passageId does not exist in type NoteWhereUniqueInput`
- **Issue:** The Prisma schema had `@@index([userId, passageId])` on Note model. Prisma only generates a compound unique key accessor (`userId_passageId`) from `@@unique` constraints, not from `@@index`. The spec test for `upsertNote` asserted `where: { userId_passageId: { userId, passageId } }` which requires a unique constraint.
- **Fix:** Changed `@@index([userId, passageId])` to `@@unique([userId, passageId])` in `packages/database/prisma/schema.prisma`. Ran `prisma generate` to regenerate the client.
- **Files modified:** `packages/database/prisma/schema.prisma`, `packages/database/generated/` (regenerated)
- **Commit:** `1fae691`

## Security Mitigations Applied

| Threat ID | Status | Implementation |
|-----------|--------|----------------|
| T-05-02-01 | Mitigated | `getPassageById` fetches highlights with `where: { passageId: id, userId }` and note with `where: { passageId: id, userId }` |
| T-05-02-02 | Mitigated | `deleteHighlight` fetches highlight first; throws `NotFoundException` if `highlight.userId !== userId` |
| T-05-02-03 | Mitigated | `completeSession` controller extracts userId from `req.user.userId` (JWT); `ReadingSessionCompleteSchema` has no userId field |
| T-05-02-04 | Accepted | Global throttler covers this case |

## Known Stubs

None — all methods implement real Prisma queries. No hardcoded or placeholder data.

## Threat Flags

None — no new network endpoints beyond those in the plan's threat model.

## Self-Check: PASSED

Files created/exist:
- FOUND: apps/api/src/reading/reading.service.ts
- FOUND: apps/api/src/reading/reading.controller.ts
- FOUND: apps/api/src/reading/reading.module.ts
- FOUND: apps/api/src/app.module.ts (modified)

Commits exist:
- FOUND: 1fae691 (feat(05-02): implement ReadingModule GREEN)

Tests: 12/12 passing
TypeScript: reading files type-check clean (pre-existing errors in classifier.service.spec.ts and vocabulary.service.spec.ts from plan 05-01 RED scaffolds are out of scope)
