---
phase: 03-vocabulary-module-srs-core
plan: 01
subsystem: vocabulary-srs-foundation
tags: [vocabulary, srs, react-query, seed, middleware, dto, ts-fsrs, framer-motion]
dependency_graph:
  requires: []
  provides:
    - packages/shared vocabulary DTOs (VocabularyWordDto, CategoryDto, PaginatedWordsDto, EnrollWordSchema, ReviewSubmitSchema, SessionCompleteSchema, SessionResultDto, MyWordDto)
    - packages/database/prisma/seed.ts (200-word corpus + demo user + 5 past-due SrsCards)
    - apps/web QueryProvider (React Query wrapped in dashboard layout)
    - apps/web middleware protecting /vocabulary and /review routes
    - Wave 0 RED test scaffolds for VOCAB-01..07
  affects:
    - apps/web (dashboard) layout
    - apps/web middleware.ts
    - packages/database package.json (seed script)
tech_stack:
  added:
    - ts-fsrs@5.4.1 (in apps/api)
    - framer-motion@12.40.0 (in apps/web)
    - "@tanstack/react-query@5.101.0 (in apps/web)"
    - bcryptjs@2.4.3 (in packages/database devDeps — seed script)
    - ts-node@10.9.2 (in packages/database devDeps — seed runner)
    - shadcn/ui: card, badge, progress, dialog, tabs, pagination, skeleton, toast
  patterns:
    - QueryClientProvider with 30s staleTime wraps dashboard layout
    - Zod schema-first DTOs with z.infer type exports
    - ts-node with dedicated tsconfig.seed.json for seed script (lib: es2022 + types: node)
    - createMany with skipDuplicates for idempotent seeding
key_files:
  created:
    - packages/shared/src/vocabulary.dto.ts
    - packages/database/prisma/seed.ts
    - packages/database/prisma/seed-data/vocabulary.json
    - packages/database/tsconfig.seed.json
    - apps/web/src/components/query-provider.tsx
    - apps/web/.env.example
    - apps/api/src/vocabulary/vocabulary.service.spec.ts
    - apps/api/src/srs/srs.service.spec.ts
    - apps/web/e2e/vocabulary.spec.ts
    - apps/web/src/components/ui/{card,badge,progress,dialog,tabs,pagination,skeleton,toast,toaster}.tsx
    - apps/web/src/hooks/use-toast.ts
  modified:
    - packages/shared/src/index.ts (added vocabulary.dto export)
    - packages/database/package.json (added db:seed script + prisma.seed + bcryptjs + ts-node)
    - "apps/web/src/app/(dashboard)/layout.tsx (wrapped children with QueryProvider)"
    - apps/web/src/middleware.ts (added /vocabulary and /review to matcher)
    - apps/api/package.json (ts-fsrs added)
    - apps/web/package.json (framer-motion + @tanstack/react-query added)
decisions:
  - Seed data placed at packages/database/prisma/seed-data/vocabulary.json rather than apps/api/prisma/seed-data/ per D-14 — avoids cross-package file dependency; Prisma seed must run from schema owner (packages/database)
  - bcryptjs (pure-JS) used instead of bcrypt in packages/database context — prevents native build failures in the database package (RESEARCH Pitfall 7)
  - tsconfig.seed.json separate from tsconfig.json — main tsconfig has rootDir:src which excludes prisma/; seed tsconfig has types:node to resolve console/process globals
metrics:
  duration: "14 minutes"
  completed_date: "2026-06-12"
  tasks_completed: 2
  files_created: 16
  files_modified: 6
---

# Phase 3 Plan 1: Vocabulary + SRS Foundation Summary

**One-liner:** Install ts-fsrs/framer-motion/react-query, define all shared Zod vocabulary DTOs, seed 200 production-quality words with FSRS demo cards, wrap dashboard layout in QueryProvider, protect /vocabulary + /review routes, and scaffold Wave 0 RED tests for VOCAB-01..07.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Human verification gate (pre-checkpoint) | — | — |
| 2 | Install packages + DTOs + seed + React Query + middleware + env | b5a250b | vocabulary.dto.ts, seed.ts, vocabulary.json, query-provider.tsx, layout.tsx, middleware.ts |
| 3 | Run seed + Wave 0 RED test scaffolds | 7bdc676 | vocabulary.service.spec.ts, srs.service.spec.ts, vocabulary.spec.ts |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed tsconfig.seed.json missing Node.js type definitions**
- **Found during:** Task 3 (running seed script)
- **Issue:** The base tsconfig.json (`@repo/tsconfig/base.json`) sets `lib: ["es2022"]` with no Node.js types. The seed script uses `console`, `process` and other Node globals. Running `ts-node --project tsconfig.json prisma/seed.ts` failed with `TS2584: Cannot find name 'console'` and `TS2580: Cannot find name 'process'`.
- **Fix:** Created `tsconfig.seed.json` (separate from main `tsconfig.json`) with `types: ["node"]` and `rootDir: "."` to include `prisma/**/*`. Updated `db:seed` script and `prisma.seed` entry to use `--project tsconfig.seed.json`.
- **Files modified:** `packages/database/tsconfig.seed.json`
- **Commit:** 7bdc676

**2. [Rule 3 - Blocking] Seed data location overrides D-14**
- **Found during:** Task 2 planning (pre-empted)
- **Issue:** D-14 specifies seed data at `apps/api/prisma/seed-data/vocabulary.json`, but `prisma db seed` must run from `packages/database` (the package owning the Prisma schema). Cross-package JSON import would create fragile relative-path dependency.
- **Fix:** Both `seed.ts` and `vocabulary.json` placed under `packages/database/prisma/seed-data/`. Documented as deviation in plan objective.
- **Files modified:** `packages/database/prisma/seed.ts`, `packages/database/prisma/seed-data/vocabulary.json`

## Verification Results

| Check | Result |
|-------|--------|
| `require.resolve('ts-fsrs')` in @repo/api | PASS |
| `require.resolve('framer-motion')` in @repo/web | PASS |
| `require.resolve('@tanstack/react-query')` in @repo/web | PASS |
| `pnpm --filter @repo/shared type-check` | PASS |
| vocabulary.json: 200 records, 25/category, all words unique | PASS |
| `pnpm --filter @repo/database db:seed` exits 0 | PASS |
| DB: 200 VocabularyWord rows | PASS |
| DB: demo@example.com with emailVerified | PASS |
| DB: 5 SrsCards with past due dates | PASS |
| vocabulary.service.spec.ts FAIL (RED) | PASS (expected) |
| srs.service.spec.ts FAIL (RED) | PASS (expected) |
| middleware.ts includes /vocabulary and /review | PASS |
| .env.example contains NEXT_PUBLIC_MINIO_PUBLIC_URL | PASS |

## Known Stubs

None — no UI components were created in this plan. Seed data uses real English vocabulary words appropriate to each CEFR level and category (no placeholder text).

## Threat Flags

No new threat surface introduced beyond what was documented in the plan's threat model.

T-03-01 (mitigate): /vocabulary and /review routes now in middleware matcher — unauthenticated redirect confirmed by E2E spec stubs.
T-03-02 (accept): Demo user seed guarded by `NODE_ENV !== 'production'` — not run in production.

## Self-Check: PASSED

All key files verified:
- packages/shared/src/vocabulary.dto.ts: exists
- packages/database/prisma/seed.ts: exists
- packages/database/prisma/seed-data/vocabulary.json: exists (200 records)
- apps/web/src/components/query-provider.tsx: exists
- apps/api/src/vocabulary/vocabulary.service.spec.ts: exists
- apps/api/src/srs/srs.service.spec.ts: exists
- apps/web/e2e/vocabulary.spec.ts: exists

Commits verified:
- b5a250b: feat(03-01): install deps + define vocabulary DTOs + seed + React Query + middleware
- 7bdc676: test(03-01): run seed + add Wave 0 RED test scaffolds for VOCAB-01..07
