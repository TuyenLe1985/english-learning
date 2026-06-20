---
phase: 08-adaptive-engine-dashboard-search-analytics
plan: 01a
subsystem: database-foundation
tags: [prisma, migrations, shadcn, dependencies, gin-indexes, cefr-history]
dependency_graph:
  requires: []
  provides: [CefrHistory model, GIN FTS indexes, ioredis in api, recharts in web, react-activity-calendar in web, scroll-area component]
  affects: [08-02, 08-03, 08-04, 08-05, 08-06, 08-07]
tech_stack:
  added: [ioredis@5.x (apps/api), recharts@3.x (apps/web), react-activity-calendar@3.x (apps/web)]
  patterns: [Prisma manual migration with raw SQL for GIN indexes, shadcn component installation via dlx]
key_files:
  created:
    - packages/database/prisma/migrations/20260620083512_phase_08_cefr_history_and_gin/migration.sql
    - apps/web/src/components/ui/scroll-area.tsx
  modified:
    - apps/api/package.json
    - apps/web/package.json
    - packages/database/prisma/schema.prisma
    - pnpm-lock.yaml
decisions:
  - Migration applied via direct psql due to DB drift from prior db:push usage
  - GIN indexes use functional expression on raw columns (not generated column)
  - GrammarLesson GIN uses explanation not content (Pitfall 1 fix)
  - ListeningContent GIN uses quoted transcriptText (Pitfall 2 fix)
  - Task 1 commit landed on master (748467d); schema and migration commits on worktree branch
metrics:
  duration: 8m
  completed: 2026-06-20T08:39:00Z
  tasks_completed: 3
  files_created: 2
  files_modified: 4
---

# Phase 8 Plan 01a: Foundation Dependencies + Schema + Migration Summary

**One-liner:** Installed ioredis/recharts/react-activity-calendar and scroll-area shadcn component, added CefrHistory model to Prisma schema, applied migration with 4 GIN full-text search indexes.

## What Was Built

### Task 1: Install dependencies + shadcn components

- Added ioredis@^5.11.1 to apps/api/package.json (admin stats Redis caching, Pitfall 8 fix)
- Added recharts@^3.x and react-activity-calendar@^3.x to apps/web/package.json
- Added scroll-area.tsx shadcn component (required by D-04 horizontal scroll rows)
- tabs.tsx and tooltip.tsx were already present; only scroll-area was missing

### Task 2: Add CefrHistory model to schema

- Added model CefrHistory with id, userId, cefrLevel, recordedAt fields
- Added @@index([userId, recordedAt]) for time-series query performance
- Added cefrHistory CefrHistory[] relation to User model
- prisma validate passes

### Task 3: Prisma migration + GIN indexes

- Created migration 20260620083512_phase_08_cefr_history_and_gin
- CefrHistory table with foreign key to User (cascade delete)
- VocabularyWord_fts_idx: GIN on word and definition
- GrammarLesson_fts_idx: GIN on title and explanation (Pitfall 1: explanation not content)
- ReadingPassage_fts_idx: GIN on title and content
- ListeningContent_fts_idx: GIN on title and transcriptText (Pitfall 2: quoted camelCase)
- Applied via direct psql due to DB drift from prior db:push
- Registered in _prisma_migrations table

## Deviations from Plan

**[Rule 3 - Blocking] DB drift prevented prisma migrate dev**
- Found during: Task 3
- Issue: DB had extra columns from prior db:push (GrammarArea.slug, GrammarLesson.slug, ListeningContent.wordTimestamps)
- Fix: Applied migration SQL directly via docker compose exec postgres psql; registered in _prisma_migrations
- Commit: 60a5607

**[Deviation] Task 1 commit landed on master**
- Issue: First git commit (748467d) ran from main repo directory, committing to master not worktree branch
- Impact: Package.json changes on master; schema+migration on worktree branch. Orchestrator merge combines both.

## Commits

| Task | Commit | Branch | Description |
|------|--------|--------|-------------|
| 1 | 748467d | master | chore(08-01a): install Phase 8 deps + add scroll-area shadcn component |
| 2 | 851b80d | worktree-agent-a84e61cf435772ff7 | feat(08-01a): add CefrHistory model to Prisma schema |
| 3 | 60a5607 | worktree-agent-a84e61cf435772ff7 | feat(08-01a): add Prisma migration for CefrHistory + 4 GIN FTS indexes |

## Known Stubs

None - this plan installs dependencies and runs migrations only.

## Threat Flags

None - migration SQL is author-controlled static content. All packages pre-approved in RESEARCH.md.

## Self-Check: PASSED

- CefrHistory table exists in live DB (verified)
- All 4 _fts_idx GIN indexes exist in PostgreSQL (verified)
- GrammarLesson_fts_idx uses explanation column (not content)
- ListeningContent_fts_idx uses quoted transcriptText column
- CefrHistory model and cefrHistory relation in schema.prisma (worktree)
- Migration SQL committed (60a5607)
- prisma validate passes
