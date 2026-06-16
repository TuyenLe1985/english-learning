---
phase: 05-reading-comprehension-content-pipeline
plan: "02"
subsystem: api/reading
tags: [nestjs, reading, tdd-green, idor, annotations]
dependency_graph:
  requires: [05-01]
  provides: [ReadingModule, ReadingService, ReadingController]
  affects: [apps/api/src/app.module.ts]
tech_stack:
  added: []
  patterns:
    - NestJS module pattern (AuthModule import, PrismaService global)
    - Zod parse on all POST bodies
    - JwtAuthGuard on every endpoint
    - IDOR protection via ownership check before delete
    - Fixed-string routes before parameterized routes
key_files:
  created:
    - apps/api/src/reading/reading.service.ts
    - apps/api/src/reading/reading.controller.ts
    - apps/api/src/reading/reading.module.ts
  modified:
    - apps/api/src/app.module.ts
decisions:
  - "[D-IDOR] NotFoundException used for both not-found and ownership mismatch in deleteHighlight to prevent IDOR information leakage (consistent error response)"
  - "[D-bookmark] bookmark.upsert used instead of bookmark.create to match mock contract in spec (mock defines upsert not create)"
metrics:
  duration: "~5 minutes"
  completed: "2026-06-16T13:58:00Z"
  tasks_completed: 1
  files_changed: 4
---

# Phase 05 Plan 02: ReadingModule TDD GREEN Summary

**One-liner:** NestJS ReadingModule with 7 service methods and 7 controller routes, JwtAuthGuard on all endpoints, IDOR-protected highlight deletion — all 12 spec tests GREEN.

## What Was Built

The complete NestJS API surface for reading comprehension:

**ReadingService** (`apps/api/src/reading/reading.service.ts`):
- `getPassages(userId, query)` — paginated passage list with cefrLevel/topic/contentType filters, isPublished=true, bookmark and question count included
- `getPassageById(passageId, userId)` — full passage detail with questions (ordered by sortOrder), highlights (userId-scoped), note (userId-scoped), and progress; throws NotFoundException if not found
- `completeSession(userId, dto)` — upserts ReadingProgress with `where: { userId_passageId: { userId, passageId } }`
- `createHighlight(userId, dto)` — creates highlight with userId, passageId, offsets, text
- `deleteHighlight(highlightId, userId)` — fetches highlight first, verifies ownership (userId match), throws NotFoundException if not found or userId mismatch, then deletes
- `upsertNote(userId, dto)` — upserts note with `where: { userId_passageId: { userId, passageId } }`
- `toggleBookmark(userId, dto)` — checks bookmark.findUnique; deletes if exists (returns `{bookmarked:false}`), creates via upsert if absent (returns `{bookmarked:true}`)

**ReadingController** (`apps/api/src/reading/reading.controller.ts`):
- `GET /api/reading/passages` — with cefrLevel, topic, contentType, page, limit query params
- `POST /api/reading/sessions/complete` — Zod-parsed body via ReadingSessionCompleteSchema
- `POST /api/reading/highlights` — Zod-parsed body via HighlightCreateSchema
- `DELETE /api/reading/highlights/:id` — IDOR-protected via service layer
- `POST /api/reading/notes` — Zod-parsed body via NoteUpsertSchema
- `POST /api/reading/bookmarks` — Zod-parsed body via BookmarkToggleSchema
- `GET /api/reading/passages/:id` — parameterized route, declared LAST (route order safety)

**ReadingModule** (`apps/api/src/reading/reading.module.ts`):
- Imports AuthModule (for JwtAuthGuard)
- Controllers: [ReadingController]
- Providers: [ReadingService]
- Exports: [ReadingService]
- PrismaModule NOT imported (globally provided by AppModule)

**AppModule** (`apps/api/src/app.module.ts`):
- ReadingModule added to imports array after GrammarModule

## Test Results

All 12 `reading.service.spec.ts` tests GREEN:
- getPassages() — 2 tests (pagination shape, totalPages calculation)
- getPassageById() — 2 tests (detail with annotations, NotFoundException on missing)
- completeSession() — 1 test (upsert where clause verification)
- createHighlight() — 1 test (create call + id in response)
- deleteHighlight() — 3 tests (success, not-found NotFoundException, IDOR NotFoundException)
- upsertNote() — 1 test (upsert where clause verification)
- toggleBookmark() — 2 tests (create→bookmarked:true, delete→bookmarked:false)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] bookmark.upsert used instead of bookmark.create**
- **Found during:** Task 1 test run
- **Issue:** The plan's implementation spec said "use `prisma.bookmark.create`", but the test mock only defines `mockBookmarkUpsert` (not `mockBookmarkCreate`). Using `bookmark.create` causes "this.prisma.bookmark.create is not a function" in tests.
- **Fix:** Changed `bookmark.create` to `bookmark.upsert` with `{ where: ..., create: ..., update: {} }`. This is semantically equivalent and matches what the mock contract expects.
- **Files modified:** `apps/api/src/reading/reading.service.ts`
- **Commit:** b1da958

**2. [Rule 2 - Security] NotFoundException for IDOR mismatch instead of ForbiddenException**
- **Found during:** Task 1 spec analysis
- **Issue:** The plan said "throw ForbiddenException if mismatch" but the spec tests assert `rejects.toThrow(NotFoundException)` for both not-found and userId mismatch cases.
- **Fix:** Used NotFoundException for both cases (consistent error response prevents IDOR information leakage — attacker cannot distinguish "not found" from "wrong user").
- **Files modified:** `apps/api/src/reading/reading.service.ts`
- **Commit:** b1da958

## Threat Flags

None — no new security surface beyond what was planned.

## Security Verification

| Threat | Mitigation | Verified |
|--------|-----------|---------|
| T-05-02-01: highlights/notes cross-user leakage | All highlight/note queries include `where: { userId }` | YES |
| T-05-02-02: DELETE highlights IDOR | fetch first, verify `highlight.userId === userId`, NotFoundException on mismatch | YES |
| T-05-02-03: userId from request body | userId always from `req.user.userId`; grep confirms no `body.*userId` code | YES |

## Known Stubs

None — all methods are fully implemented with real Prisma calls.

## Self-Check
