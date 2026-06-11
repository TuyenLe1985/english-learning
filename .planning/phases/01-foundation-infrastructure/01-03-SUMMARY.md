---
phase: 01-foundation-infrastructure
plan: 03
subsystem: database
tags: [prisma, postgresql, schema, migration, fsrs, srs]
dependency_graph:
  requires:
    - 01-01  # monorepo scaffold and @repo/database package created
  provides:
    - packages/database/prisma/schema.prisma  # full schema for all 8 phases
    - packages/database/prisma/migrations/20260611140626_init/migration.sql  # applied migration SQL
  affects:
    - all future phases  # every feature phase reads/writes these tables
tech_stack:
  added:
    - "prisma@6.19.3 (CLI) + @prisma/client@6.19.3 (runtime)"
    - "PostgreSQL 16 (docker container: el_postgres)"
  patterns:
    - "FSRS-aligned SrsCard model — fields match ts-fsrs Card interface exactly"
    - "audioStorageKey as R2 storage key string, not URL (D-10)"
    - "contentHash @unique for crawl deduplication"
    - "onDelete: Cascade on all user-owned models"
key_files:
  created:
    - packages/database/prisma/migrations/20260611140626_init/migration.sql
    - packages/database/prisma/migrations/migration_lock.toml
  modified:
    - packages/database/prisma/schema.prisma  # reviewed — matches RESEARCH.md Pattern 4 exactly, no changes needed
    - packages/database/package.json  # included in this worktree branch for completeness
    - packages/database/src/index.ts  # included in this worktree branch for completeness
decisions:
  - "Schema reviewed and confirmed complete — matches RESEARCH.md Pattern 4 exactly; no modifications needed"
  - "FSRS fields confirmed: due, stability, difficulty, elapsedDays, scheduledDays, reps, lapses, state, lastReview — all match ts-fsrs Card interface"
  - "Prisma pinned to 6.19.3 — npm latest resolves to 7.8.0; explicit pin required"
  - "Migration ran against Docker PostgreSQL 16 (el_postgres) — 29 tables created successfully"
  - ".env created locally (gitignored) with devpassword123 credentials for Docker Compose"
metrics:
  duration: "~8 minutes"
  completed: "2026-06-11"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 2
  files_created: 2
---

# Phase 1 Plan 3: Prisma Schema + Initial Migration Summary

Full Prisma schema validated and initial migration applied — 29 tables + 6 enums created in PostgreSQL 16 using prisma@6.19.3 with FSRS-aligned SrsCard fields matching ts-fsrs Card interface exactly.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Write full Prisma schema (all 8 phases) | 85b5932 | packages/database/prisma/schema.prisma, packages/database/package.json, packages/database/src/index.ts |
| 2 | Run initial database migration | f7b0b27 | packages/database/prisma/migrations/20260611140626_init/migration.sql, packages/database/prisma/migrations/migration_lock.toml |

## Verification Evidence

All success criteria confirmed:

1. `prisma validate` exits 0: "The schema at packages/database/prisma/schema.prisma is valid"
2. Migration folder exists: `packages/database/prisma/migrations/20260611140626_init/migration.sql` (703 lines)
3. Prisma client generated: `packages/database/generated/client/` (index.js, index.d.ts, etc.)
4. Table count: 30 rows in `information_schema.tables` (29 user tables + `_prisma_migrations`)
5. Key tables confirmed via `\dt`: User, SrsCard, VocabularyWord, ReadingPassage, ListeningContent, QuizSession — all present
6. Prisma version: 6.19.3 (pinned, NOT 7.x)
7. `audioStorageKey` count: 2 (VocabularyWord + ListeningContent)

## Schema Overview

### Enums (6)
- `CefrLevel`: B1, B2, C1
- `CardState`: New, Learning, Review, Relearning
- `UserRole`: STUDENT, ADMIN
- `ContentType`: ARTICLE, NEWS, BLOG_POST, ACADEMIC, STORY, OPINION, CONVERSATION, INTERVIEW, PODCAST, LECTURE, NEWS_REPORT
- `ExerciseType`: MULTIPLE_CHOICE, FILL_IN_THE_BLANK, SENTENCE_TRANSFORMATION, ERROR_CORRECTION, DRAG_AND_DROP, FLASHCARD, MATCHING, CONTEXT_SELECTION, CLOZE, SYNONYM_ID, RECALL, DICTATION, FILL_MISSING_WORDS, SPEAKER_INTENTION, SEQUENCE_ORDERING, NOTE_TAKING
- `SkillArea`: GRAMMAR, VOCABULARY, READING, LISTENING, MIXED

### Models (29, by phase)

| Phase | Models |
|-------|--------|
| Phase 2 (Auth) | User, Account, Session, VerificationToken |
| Phase 3 (Vocabulary + SRS) | VocabularyWord, UserVocabularyItem, SrsCard |
| Phase 4 (Grammar) | GrammarArea, GrammarTopic, GrammarLesson, GrammarQuestion, GrammarAttempt, GrammarProgress |
| Phase 5 (Reading) | ReadingPassage, ReadingQuestion, ReadingProgress, Highlight, Note, Bookmark |
| Phase 6 (Listening) | ListeningContent, ListeningQuestion, ListeningProgress |
| Phase 7 (Quiz + Gamification) | QuizSession, QuizAnswer, XpEvent, Achievement, UserAchievement |
| Phase 8 (Analytics) | SkillScore, ActivityLog |

### FSRS Fields on SrsCard (D-09)

All 9 fields match ts-fsrs Card interface:
- `due DateTime` — next review date
- `stability Float` — memory strength in days
- `difficulty Float` — inherent difficulty 1–10
- `elapsedDays Int` — days since last review
- `scheduledDays Int` — scheduled interval in days
- `reps Int` — total successful reviews
- `lapses Int` — times forgotten
- `state CardState` — New/Learning/Review/Relearning
- `lastReview DateTime?` — last review timestamp

Indexes: `@@index([userId, due])` + `@@index([userId, state])`

## Decisions Made

1. **Schema confirmed complete without modification**: The schema from Plan 01-01 was reviewed against RESEARCH.md Pattern 4 and CONTEXT.md decisions. It matched exactly — no fields missing, no incorrect types. No changes required.

2. **Prisma 6 pinned to 6.19.3**: npm `latest` tag currently resolves to Prisma 7.8.0 (breaking changes: new config file, different output). The package.json explicitly pins `^6.19.3` for both CLI and client.

3. **Migration ran against Docker PostgreSQL 16**: The `el_postgres` container was started fresh (no prior data). Migration `20260611140626_init` applied cleanly with zero errors.

4. **Generated client not committed**: `packages/database/generated/client/` is gitignored (as expected for generated artifacts). Consumers must run `pnpm --filter @repo/database run db:generate` after cloning.

## Deviations from Plan

**1. [Rule 3 - Blocking] Worktree branch started from pre-code state**
- **Found during**: Task 1 setup
- **Issue**: This worktree branch (`worktree-agent-ad0800eed9ebc01d8`) was created from commit `cdb1259` — a planning-only state before any project code was committed. The project files (packages, apps, etc.) only existed on `master`.
- **Fix**: Used `git checkout master -- packages/database/...` to bring the schema and package files into the worktree's working tree. Migration then ran against the main repo's Docker services (shared filesystem).
- **Files affected**: packages/database/prisma/schema.prisma, packages/database/package.json, packages/database/src/index.ts
- **Commits**: 85b5932 (schema), f7b0b27 (migration)

**2. [Rule 2 - Missing] .env file needed for Docker Postgres**
- **Found during**: Task 2 setup
- **Issue**: No `.env` file existed in the main repo; `docker compose up postgres` requires `POSTGRES_PASSWORD` from `.env`.
- **Fix**: Created `/home/tuyen/Desktop/Apps/english-learning/.env` with local development credentials. File is gitignored per D-13 and was NOT committed.
- **Impact**: None — `.env` is gitignored by design. `.env.example` already existed with the correct template.

## Known Stubs

None — the schema has no placeholder data or stub content. All fields have correct types and defaults.

## Threat Surface Scan

No new security surface introduced beyond what was already in the threat model:

| Threat | Disposition | Evidence |
|--------|-------------|----------|
| T-1-07: DATABASE_URL in .env | Mitigated | `.env` created locally, gitignored, not committed |
| T-1-08: Prisma version mismatch | Mitigated | `packages/database/package.json` pins `prisma@^6.19.3`; migration ran with 6.19.3 |
| T-1-09: Missing cascade deletes | Accepted as mitigated | All user-owned models verified with `onDelete: Cascade` |

## Self-Check: PASSED

- [x] `packages/database/prisma/schema.prisma` exists in worktree: FOUND
- [x] `packages/database/prisma/migrations/20260611140626_init/migration.sql` exists: FOUND (703 lines)
- [x] `packages/database/prisma/migrations/migration_lock.toml` exists: FOUND
- [x] Commit 85b5932 exists: FOUND
- [x] Commit f7b0b27 exists: FOUND
- [x] 29 tables verified in PostgreSQL via `docker exec el_postgres psql \dt`
- [x] `prisma validate` exits 0: CONFIRMED
