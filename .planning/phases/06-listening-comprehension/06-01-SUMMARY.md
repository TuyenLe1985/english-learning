---
phase: 06-listening-comprehension
plan: "01"
subsystem: listening-comprehension
tags:
  - prisma-schema
  - docker
  - dto
  - tdd
  - red-scaffolds
dependency_graph:
  requires:
    - "05-01: ReadingPassageDtoSchema pattern (reading.dto.ts)"
    - "Prisma 6.x schema and migration tooling"
  provides:
    - "wordTimestamps Json? column in ListeningContent"
    - "whisper-worker Docker service"
    - "listening.dto.ts shared Zod schemas and TypeScript types"
    - "4 RED TDD spec files for Plans 06-02, 06-03, 06-05"
  affects:
    - "packages/database (schema + migration)"
    - "packages/shared (DTOs + barrel export)"
    - "apps/api/src/listening (new spec)"
    - "apps/api/src/pipeline (seed spec)"
    - "apps/web/src/hooks (audio player spec)"
    - "apps/web/src/components/listening (transcript panel spec)"
tech_stack:
  added:
    - "hwdsl2/whisper-server Docker image (CPU-only, port 9002)"
  patterns:
    - "Zod schema + z.infer<> type pattern (mirrors reading.dto.ts)"
    - "Vitest vi.fn() mock PrismaService pattern (mirrors grammar.service.spec.ts)"
    - "RED import-fail pattern for TDD spec scaffolds"
key_files:
  created:
    - packages/shared/src/listening.dto.ts
    - apps/api/src/listening/listening.service.spec.ts
    - apps/api/src/pipeline/listening-seed.service.spec.ts
    - apps/web/src/hooks/use-audio-player.test.ts
    - apps/web/src/components/listening/transcript-panel.test.tsx
  modified:
    - packages/database/prisma/schema.prisma
    - docker-compose.yml
    - .env.example
    - packages/shared/src/index.ts
decisions:
  - "Used prisma db push instead of prisma migrate dev due to DB schema drift from prior phases; wordTimestamps column manually added via ALTER TABLE to ensure DB sync"
  - "whisper-worker uses external port 9002 to avoid MinIO port conflicts (9000 API, 9001 console)"
  - "RED test scaffolds use import-fail pattern — modules don't exist yet so tests fail at import time"
metrics:
  duration: "~20min"
  completed_date: "2026-06-15"
  tasks_completed: 3
  files_created: 5
  files_modified: 4
---

# Phase 6 Plan 01: Listening Foundation — Schema, Docker, DTOs, and RED Scaffolds Summary

**One-liner:** Added `wordTimestamps Json?` to ListeningContent, declared whisper-worker on port 9002, created all Phase 6 Zod DTOs, and scaffolded 4 failing TDD test files covering LIST-01 through LIST-07.

## What Was Built

### Task 1: Prisma Schema Migration (commit 4c9f215)
- Added `wordTimestamps Json?` field to `ListeningContent` model in `schema.prisma`
- Field is nullable (`Json?`) per D-04 — existing rows without a Whisper run remain valid
- Column stores `[{word: String, start: Float, end: Float}]` from Whisper forced alignment
- Applied via `prisma db push` (DB had drift from prior phase work); column confirmed in PostgreSQL
- Prisma client regenerated (v6.19.3)

### Task 2: Docker Infrastructure (commit 22f6f96)
- Added `whisper-worker` service to `docker-compose.yml` after the `minio` service block
- Image: `hwdsl2/whisper-server` (CPU-only, no :cuda tag)
- External port `127.0.0.1:9002:9000` — avoids MinIO conflict on 9000/9001 (T-06-W1-01)
- `WHISPER_WORD_TIMESTAMPS: "true"` enables word-level timestamp output
- `whisper_data:` volume added to top-level volumes block
- `WHISPER_WORKER_URL=http://whisper-worker:9000` added to `.env.example` and `.env`

### Task 3: Shared DTOs and TDD RED Scaffolds (commit 957309a)
- Created `packages/shared/src/listening.dto.ts` with 7 Zod schemas:
  - `WordTimestampSchema` — word + start/end seconds
  - `ListeningItemDtoSchema` — browse card with 5 contentType enum values
  - `ListeningQuestionDtoSchema` — MULTIPLE_CHOICE/FILL_MISSING_WORDS/DICTATION
  - `ListeningItemDetailDtoSchema` — extends item with audioUrl, transcriptText, wordTimestamps, questions, progress
  - `ListeningSessionCompleteSchema` — client→server session completion payload
  - `PaginatedListeningItemsDtoSchema` — paginated list response
  - `ListeningSessionResultDtoSchema` — score/accuracy/xpEarned/contentId
- Added `export * from "./listening.dto"` to `packages/shared/src/index.ts`
- Created 4 RED test files (all fail at import — implementations don't exist yet)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Prisma CLI version conflict**
- **Found during:** Task 1
- **Issue:** Global `npx prisma` resolves to v7.8.0 which has breaking changes (datasource URL must be in prisma.config.ts). Project uses Prisma 6.x.
- **Fix:** Used local prisma binary at `packages/database/node_modules/.bin/prisma` (v6.19.3)
- **Files modified:** None — execution approach only
- **Commit:** 4c9f215

**2. [Rule 1 - Bug] DB schema drift prevented migrate dev**
- **Found during:** Task 1
- **Issue:** `prisma migrate dev` detected DB drift (GrammarArea.slug, GrammarLesson.slug, Note.uniqueIndex changes from prior phases not reflected in migration history). Would require DB reset.
- **Fix:** Used `prisma db push --accept-data-loss` as planned fallback, then manually applied `ALTER TABLE "ListeningContent" ADD COLUMN IF NOT EXISTS "wordTimestamps" jsonb` to ensure column was added (db push output said synced but column was missing)
- **Files modified:** None — DB state only
- **Commit:** 4c9f215

**3. [Rule 3 - Blocking] Worktree lacked node_modules for pnpm filter commands**
- **Found during:** Task 3 verification
- **Issue:** Worktree didn't have node_modules installed, so `pnpm --filter @repo/shared build` failed with `tsc: not found`
- **Fix:** Ran `pnpm install --frozen-lockfile` in the worktree to install dependencies
- **Files modified:** node_modules (not tracked by git)
- **Commit:** N/A — dev environment setup

## Known Stubs

None — this plan creates schema, infrastructure, and test scaffolds only. No feature implementation was created.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| No new threats | docker-compose.yml | whisper-worker bound to 127.0.0.1:9002 only — matches T-06-W1-01 mitigation from threat model |

## Self-Check: PASSED

Files verified:
- `packages/database/prisma/schema.prisma` contains `wordTimestamps Json?` — FOUND
- `docker-compose.yml` contains `whisper-worker:` service — FOUND
- `.env.example` contains `WHISPER_WORKER_URL` — FOUND
- `packages/shared/src/listening.dto.ts` exists — FOUND
- `packages/shared/src/index.ts` exports `./listening.dto` — FOUND
- `apps/api/src/listening/listening.service.spec.ts` exists — FOUND
- `apps/api/src/pipeline/listening-seed.service.spec.ts` exists — FOUND
- `apps/web/src/hooks/use-audio-player.test.ts` exists — FOUND
- `apps/web/src/components/listening/transcript-panel.test.tsx` exists — FOUND

Commits verified:
- 4c9f215 (Task 1: schema) — FOUND
- 22f6f96 (Task 2: docker/env) — FOUND
- 957309a (Task 3: DTOs + specs) — FOUND

All 4 RED test files fail at import (ListeningService, ListeningSeedService, useAudioPlayer, TranscriptPanel do not exist yet) — confirmed via test runner.
`pnpm --filter @repo/shared build` exits 0 — confirmed.
