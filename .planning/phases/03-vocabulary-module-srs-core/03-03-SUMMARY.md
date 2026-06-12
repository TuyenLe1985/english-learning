---
phase: 03-vocabulary-module-srs-core
plan: 03
subsystem: srs-core
tags: [srs, nestjs, tdd, ts-fsrs, fsrs, jwt-guard, prisma, spaced-repetition, session]
dependency_graph:
  requires: ["03-01", "03-02"]
  provides:
    - apps/api/src/srs/srs.service.ts (enrollWord, getDueQueue, submitReview, completeSession + dbCardToFsrsCard/fsrsCardToDbUpdate mappers)
    - apps/api/src/srs/srs.controller.ts (POST enroll, GET queue, POST review — JWT-guarded)
    - apps/api/src/srs/srs.module.ts (imports AuthModule, declares SrsController + SessionController)
    - apps/api/src/srs/session.controller.ts (POST /vocabulary/session/complete — JWT-guarded)
  affects:
    - apps/api/src/app.module.ts (SrsModule + VocabularyModule registered)
tech_stack:
  added: []
  patterns:
    - dbCardToFsrsCard: camelCase SrsCard → snake_case ts-fsrs Card, learning_steps defaulted to 0, state converted via State[key]
    - fsrsCardToDbUpdate: ts-fsrs Card → camelCase Prisma update, learning_steps intentionally omitted, State[card.state] for numeric→string
    - Grade type cast (not Rating) to index fsrs.repeat() IPreview result — fixes TS7053 for Rating.Manual exclusion
    - enrollWord uses userVocabularyItem.upsert keyed on userId_wordId, then srsCard.findUnique/create for idempotency
    - submitReview uses findFirst { id, userId } for security scoping (T-03-06)
key_files:
  created:
    - apps/api/src/srs/srs.service.ts
    - apps/api/src/srs/srs.controller.ts
    - apps/api/src/srs/srs.module.ts
    - apps/api/src/srs/session.controller.ts
  modified:
    - apps/api/src/app.module.ts (added VocabularyModule + SrsModule imports)
decisions:
  - Grade cast (ts-fsrs type) required to index IPreview result from fsrs.repeat() — Rating enum includes Manual=0 but RecordLog excludes it via Grade=Exclude<Rating,Rating.Manual>; controller-level Zod validation guarantees only Again/Hard/Good/Easy reach service, making the cast safe
  - SessionController declared in SrsModule (not VocabularyModule) to avoid cross-plan file contention — Plan 02 owns vocabulary.module.ts; the /api/vocabulary/session/complete route is correctly registered via @Controller('vocabulary') in SrsModule
  - Vocabulary service/module/controller files co-committed (copied from master) because worktree only had spec files; required for compilation of app.module.ts which references VocabularyModule
metrics:
  duration: "4 minutes"
  completed_date: "2026-06-12"
  tasks_completed: 1
  files_created: 4
  files_modified: 4
---

# Phase 3 Plan 3: SrsModule — FSRS Core Summary

**One-liner:** Implement SrsService with ts-fsrs field mappers (dbCardToFsrsCard/fsrsCardToDbUpdate), idempotent enrollWord, JWT-scoped getDueQueue/submitReview, and practice session result endpoint — turning 11 RED tests GREEN with type-check passing.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | GREEN — SrsService + SrsController + SessionController + SrsModule | 42a4261 | srs.service.ts, srs.controller.ts, session.controller.ts, srs.module.ts, app.module.ts |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Grade type cast to fix TS7053 for Rating.Manual**
- **Found during:** Task 1 (type-check)
- **Issue:** `fsrs().repeat()` returns `IPreview` which is typed as `RecordLog = { [key in Grade]: RecordLogItem }`. `Grade = Exclude<Rating, Rating.Manual>`. Using `Rating` as the index type causes `TS7053: Element implicitly has an 'any' type because expression of type 'Rating' can't be used to index type 'IPreview'`. This is because `Rating.Manual = 0` is excluded from the RecordLog index signature.
- **Fix:** Import `Grade` from ts-fsrs and cast: `const ratingEnum = Rating[rating as keyof typeof Rating] as Grade`. The cast is safe because the controller's Zod `ReviewSubmitSchema` only allows `Again | Hard | Good | Easy` — all valid `Grade` values.
- **Files modified:** `apps/api/src/srs/srs.service.ts`
- **Commit:** 42a4261

**2. [Rule 3 - Blocking] Vocabulary module files co-committed for compilation**
- **Found during:** Task 1 (compilation analysis)
- **Issue:** This worktree was spawned from Wave 0 base (commit 37cd741). Plan 02 (VocabularyModule) ran in a separate worktree and was merged to master. This worktree's `app.module.ts` needed to import both VocabularyModule and SrsModule, but the vocabulary module files (`vocabulary.service.ts`, `vocabulary.controller.ts`, `vocabulary.module.ts`) were absent in this worktree — causing a compile error on VocabularyModule import.
- **Fix:** Retrieved vocabulary files from master branch via `git show master:...` and staged them alongside the SRS files. These files are identical to Plan 02's output — no logic changes.
- **Files committed:** `apps/api/src/vocabulary/vocabulary.{service,controller,module}.ts`
- **Commit:** 42a4261

## Verification Results

| Check | Result |
|-------|--------|
| `srs.service.spec.ts` — 11 tests pass (GREEN) | PASS |
| enrollWord — idempotent (second call returns existing card, no mockCreate) | PASS |
| enrollWord — stores contextSentence on first enroll | PASS |
| submitReview — findFirst called with { id, userId } (security scope) | PASS |
| submitReview — update payload uses camelCase (elapsedDays, scheduledDays) | PASS |
| submitReview — state written as string ('Review', not numeric 2) | PASS |
| getDueQueue — take: 20, orderBy { due: 'asc' }, where due lte now | PASS |
| `grep -c "UseGuards(JwtAuthGuard)" srs.controller.ts` = 4 (>= 3) | PASS |
| `grep -q "SrsModule" app.module.ts` | PASS |
| `grep -q "VocabularyModule" app.module.ts` | PASS |
| `grep -q "learning_steps: 0" srs.service.ts` | PASS |
| Write mapper does NOT include learning_steps/learningSteps key | PASS |
| `pnpm --filter @repo/api type-check` passes | PASS |

## Known Stubs

None — this plan implements NestJS backend logic only. No UI components, no placeholder data.

`completeSession` does not write to a dedicated DB table (no `PracticeSession` model in Phase 3 schema). It computes and returns the `SessionResultDto` in-process. This is intentional per the plan objective — the schema is read-only in Phase 3. A future phase can add a `PracticeSession` table if persistence is needed.

## Threat Flags

No new threat surface beyond what was documented in the plan's threat model.

- T-03-06 (mitigate): `submitReview` uses `findFirst { id: cardId, userId }` — cross-user card access impossible.
- T-03-07 (mitigate): `ReviewSubmitSchema` (Zod) enforces `rating: Again|Hard|Good|Easy` — overposting rejected.
- T-03-08 (mitigate): `enrollWord` is idempotent via upsert — repeated calls cannot mass-create cards.
- T-03-09 (mitigate): `@UseGuards(JwtAuthGuard)` on all 4 endpoints (enroll, queue, review, session/complete).

## TDD Gate Compliance

- RED gate: `srs.service.spec.ts` from Plan 03-01 (commit 7bdc676) — all 11 tests failed before implementation
- GREEN gate: commit 42a4261 — all 11 tests pass after implementation
- REFACTOR gate: not needed — implementation is clean on first pass

## Self-Check: PASSED

Files verified:
- apps/api/src/srs/srs.service.ts: exists
- apps/api/src/srs/srs.controller.ts: exists
- apps/api/src/srs/srs.module.ts: exists
- apps/api/src/srs/session.controller.ts: exists
- apps/api/src/app.module.ts: contains SrsModule + VocabularyModule

Commits verified:
- 42a4261: feat(03-03): implement SrsModule GREEN — service, controllers, module, app registration
