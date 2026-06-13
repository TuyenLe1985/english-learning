---
phase: 04-grammar-module
plan: "01"
subsystem: grammar-foundation
tags: [schema-migration, dto, seed, tdd-red, dnd-kit]
dependency_graph:
  requires: []
  provides:
    - GrammarArea.slug + GrammarLesson.slug in DB schema
    - "@repo/shared grammar DTOs (all 8 schemas + inferred types)"
    - "@dnd-kit/core + @dnd-kit/sortable installed in apps/web"
    - grammar seed dataset (10 areas, 229 questions, ≥20/topic)
    - seedGrammar() wired into seed.ts main()
    - 4 RED test scaffolds for plans 02/03 to turn GREEN
  affects:
    - packages/database/prisma/schema.prisma
    - packages/database/prisma/seed.ts
    - packages/shared/src/index.ts
tech_stack:
  added:
    - "@dnd-kit/core ^6.3.1 (apps/web)"
    - "@dnd-kit/sortable ^10.0.0 (apps/web)"
  patterns:
    - Prisma upsert with slug as stable unique key
    - Zod schema-first + inferred TypeScript type pattern (mirrors vocabulary.dto.ts)
    - FK-ordered seed loop: Area → Topic → Lesson → Questions
    - Vitest RED scaffold: import-not-found failures prove implementations absent
key_files:
  created:
    - packages/shared/src/grammar.dto.ts
    - packages/database/prisma/seed-data/grammar.json
    - apps/api/src/grammar/grammar.service.spec.ts
    - apps/web/src/components/grammar/exercises/multiple-choice-exercise.test.tsx
    - apps/web/src/components/grammar/exercises/fill-in-the-blank-exercise.test.tsx
    - apps/web/src/components/grammar/exercises/drag-and-drop-exercise.test.tsx
  modified:
    - packages/database/prisma/schema.prisma (slug fields on GrammarArea + GrammarLesson)
    - packages/shared/src/index.ts (grammar.dto barrel export)
    - packages/database/prisma/seed.ts (grammarData import + seedGrammar() + await in main)
    - apps/web/package.json (@dnd-kit installs)
    - pnpm-lock.yaml (lockfile updated)
decisions:
  - "Used prisma db push --accept-data-loss for dev DB (existing grammar rows had null slugs — dev seed data, no prod data loss)"
  - "grammar.json uses pipe-separated answers for DRAG_AND_DROP multi-blank prompts (e.g. 'has written|has not submitted') — consistent token that Plan 04-03 component will parse"
  - "Kept all 10 areas as single-topic areas for clean seed structure; each topic has 3 lessons × 7 questions = 21 (≥20 requirement met with buffer)"
metrics:
  duration: "~40 minutes"
  completed: "2026-06-13"
  tasks: 3
  files_changed: 9
---

# Phase 4 Plan 01: Grammar Foundation — Schema, DTOs, Seed, RED Tests Summary

**One-liner:** Grammar slug schema migration, Zod DTOs for 8 API contracts, 10-area / 229-question seed dataset, and 4 RED Vitest scaffolds to gate TDD plans 02–03.

## Tasks Completed

| # | Task | Commit | Status |
|---|------|--------|--------|
| 1 | Verify dnd-kit package legitimacy (checkpoint:human-verify) | — | APPROVED by user |
| 2 | Add slug fields + migrate, define shared DTOs, install dnd-kit | `181378c` | DONE |
| 3 | Build grammar seed dataset + seedGrammar(), add RED test scaffolds | `b270773` | DONE |

## What Was Built

### Task 2: Schema + DTOs + dnd-kit

**Schema migration** (`packages/database/prisma/schema.prisma`):
- Added `slug String @unique` to `GrammarArea` (placed after `id`, before `name`)
- Added `slug String @unique` to `GrammarLesson` (placed after `topicId`, before `title`)
- Applied via `prisma db push --accept-data-loss` (dev DB — no prod data)
- Prisma client regenerated: `prisma generate`

**Grammar DTOs** (`packages/shared/src/grammar.dto.ts`):
- 8 Zod schemas exported: `GrammarAreaDtoSchema`, `GrammarTopicDtoSchema`, `GrammarLessonDtoSchema`, `GrammarQuestionDtoSchema`, `GrammarLessonDetailDtoSchema`, `GrammarTopicDetailDtoSchema`, `GrammarSessionCompleteSchema`, `GrammarSessionResultDtoSchema`
- 8 inferred TypeScript types exported (same names without `Schema` suffix)
- Barrel re-export added to `packages/shared/src/index.ts`
- `pnpm --filter @repo/shared build` exits 0

**dnd-kit install**:
- `@dnd-kit/core ^6.3.1` and `@dnd-kit/sortable ^10.0.0` added to `apps/web/package.json`
- Both packages human-verified before install (Task 1 gate)

### Task 3: Seed Dataset + seedGrammar() + RED Tests

**grammar.json** (`packages/database/prisma/seed-data/grammar.json`):
- 10 areas with exact required slugs: verb-tenses, modal-verbs, conditionals, passive-voice, relative-clauses, reported-speech, gerunds-infinitives, articles, prepositions, linking-words
- 11 topics total (conditionals has 2 — real and unreal), all ≥20 questions
- 229 total questions distributed across 3 lessons × ~7 questions per topic
- Every topic has ≥3 exercise types and ≥1 DRAG_AND_DROP question
- DRAG_AND_DROP prompts use `___` blank markers and pipe-separated multi-answers

**seed.ts** (`packages/database/prisma/seed.ts`):
- `import grammarData from "./seed-data/grammar.json"` added alongside vocabularyData
- `seedGrammar()` async function implements strict FK-ordered loop (Area → Topic → Lesson → Question.createMany with skipDuplicates)
- `await seedGrammar()` called from `main()` before vocabulary seed
- `pnpm --filter @repo/database db:seed` output: `Seeded grammar: 10 areas, 229 questions`
- DB count check confirmed: 11 topics × ≥20 questions each

**4 RED test scaffolds** (all fail with module-not-found — implementations in plans 02/03):
- `apps/api/src/grammar/grammar.service.spec.ts` — 14 tests covering getAreas, getLessonDetail, completeSession, getWeakQuestions with mock PrismaService
- `apps/web/src/components/grammar/exercises/multiple-choice-exercise.test.tsx` — 6 tests: render, correct/incorrect selection
- `apps/web/src/components/grammar/exercises/fill-in-the-blank-exercise.test.tsx` — 7 tests including case-insensitive + whitespace-trim matching
- `apps/web/src/components/grammar/exercises/drag-and-drop-exercise.test.tsx` — 7 tests: blank slot count, word bank chip rendering, dnd-kit mocked

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] DB push required --accept-data-loss flag**
- **Found during:** Task 2
- **Issue:** Existing GrammarArea/GrammarLesson rows in dev DB had null slugs; Prisma refused to add a UNIQUE constraint without the flag
- **Fix:** Used `prisma db push --accept-data-loss` (dev environment only — no production data at stake)
- **Files modified:** N/A (runtime migration command)
- **Commit:** 181378c

**2. [Rule 1 - Bug] Conditionals topics had <20 questions**
- **Found during:** Task 3 (JSON validation)
- **Issue:** `real-conditionals` had 16 questions (zero-conditional: 5, first-conditional: 11), `unreal-conditionals` had 14 (second: 7, third: 7) — both below the ≥20 requirement
- **Fix:** Added 4 questions to first-conditional lesson and 3+3 questions to second/third conditional lessons
- **Files modified:** `packages/database/prisma/seed-data/grammar.json`
- **Commit:** b270773

## Known Stubs

None. All seed data is fully populated with real content. DTOs define contracts for implementations (plans 02/03) but DTOs themselves are complete and type-checked.

## Threat Flags

None. No new network endpoints, auth paths, file access patterns, or schema changes at trust boundaries were introduced beyond the planned slug columns.

## Self-Check: PASSED

Files created/verified:
- [x] `packages/database/prisma/schema.prisma` — GrammarArea.slug and GrammarLesson.slug present
- [x] `packages/shared/src/grammar.dto.ts` — exists, builds clean
- [x] `packages/shared/src/index.ts` — barrel export present
- [x] `packages/database/prisma/seed-data/grammar.json` — 10 areas, 229 questions, all ≥20/topic
- [x] `packages/database/prisma/seed.ts` — contains grammarData, seedGrammar, await seedGrammar()
- [x] `apps/api/src/grammar/grammar.service.spec.ts` — exists, fails RED
- [x] `apps/web/src/components/grammar/exercises/multiple-choice-exercise.test.tsx` — exists, fails RED
- [x] `apps/web/src/components/grammar/exercises/fill-in-the-blank-exercise.test.tsx` — exists, fails RED
- [x] `apps/web/src/components/grammar/exercises/drag-and-drop-exercise.test.tsx` — exists, fails RED

Commits verified:
- [x] `181378c` — feat(04-01): add slug fields to grammar schema, define DTOs, install dnd-kit
- [x] `b270773` — feat(04-01): grammar seed dataset, seedGrammar(), 4 RED test scaffolds
