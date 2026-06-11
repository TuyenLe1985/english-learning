---
phase: 01-foundation-infrastructure
plan: "01"
subsystem: monorepo-scaffold
tags:
  - turborepo
  - pnpm-workspaces
  - prisma
  - typescript-config
  - eslint-config
dependency_graph:
  requires: []
  provides:
    - "@repo/tsconfig (nestjs.json, nextjs.json, base.json)"
    - "@repo/eslint-config (base, nextjs, nestjs variants)"
    - "@repo/shared (HealthResponseSchema, zod barrel)"
    - "@repo/database (Prisma 6.x, full schema, singleton)"
    - "pnpm workspace discovery (pnpm-workspace.yaml)"
    - "Turborepo task pipeline (turbo.json)"
  affects:
    - "All subsequent plans — every plan imports from @repo/* packages created here"
tech_stack:
  added:
    - "turbo@^2.9.18 — Turborepo 2.x (tasks key, not pipeline)"
    - "typescript@^5.4.0 — root devDep"
    - "prisma@^6.19.3 — explicitly pinned to avoid 7.x breakage"
    - "@prisma/client@^6.19.3 — must match prisma CLI major"
    - "zod@^3.24.0 — shared schema validation"
    - "eslint@^9.0.0 — ESLint 9 flat config format"
  patterns:
    - "pnpm workspace:* protocol for internal @repo/* packages"
    - "just-in-time internal packages (export .ts directly, no build step)"
    - "globalThis PrismaClient singleton (prevents hot-reload connection pool exhaustion)"
    - "turbo.json tasks key (Turborepo 2.x requirement)"
    - "No postinstall in @repo/database (avoids pnpm symlink timing #6603)"
key_files:
  created:
    - "package.json — root monorepo config, packageManager pnpm@9.15.9"
    - "pnpm-workspace.yaml — apps/* + packages/* workspace discovery"
    - "turbo.json — 7 task definitions using 'tasks' key (not 'pipeline')"
    - "tsconfig.json — root coordinator only (files: [], references: [])"
    - ".gitignore — .env gitignored, packages/database/generated/ gitignored"
    - ".env.example — 13 required env var keys with CHANGE_ME placeholders"
    - "packages/tsconfig/base.json — NodeNext, strict: true, noUncheckedIndexedAccess"
    - "packages/tsconfig/nextjs.json — extends base, Bundler moduleResolution, jsx: preserve"
    - "packages/tsconfig/nestjs.json — extends base, CommonJS+node, emitDecoratorMetadata: true"
    - "packages/eslint-config/index.mjs — ESLint 9 flat config, no-console/no-unused-vars"
    - "packages/shared/src/index.ts — HealthResponseSchema (zod), barrel for Phase 2+ types"
    - "packages/database/package.json — Prisma ^6.19.3, no postinstall"
    - "packages/database/src/index.ts — globalThis singleton PrismaClient"
    - "packages/database/prisma/schema.prisma — full schema (all 8 phases, 25 models)"
  modified: []
decisions:
  - "Pinned Prisma to ^6.19.3 explicitly — npm latest now resolves to 7.8.0 which has breaking config changes"
  - "No postinstall script in @repo/database — pnpm workspace symlinks not resolved during postinstall (issue #6603)"
  - "turbo.json uses 'tasks' key not 'pipeline' — Turborepo 2.x breaking rename; 'pipeline' is a no-op in v2"
  - "nestjs.json overrides module to CommonJS/node — base.json uses NodeNext which breaks NestJS DI silently"
  - "Root tsconfig.json has files:[] and references:[] — coordinator only, not included in any app build"
  - "just-in-time package pattern — no build step for @repo/* packages; apps' bundlers handle compilation"
metrics:
  duration: "5 minutes"
  completed_date: "2026-06-11"
  tasks_completed: 2
  tasks_total: 2
  files_created: 14
  files_modified: 0
---

# Phase 01 Plan 01: Turborepo Monorepo Scaffold Summary

**One-liner:** Turborepo 2.x pnpm workspace with shared tsconfig/eslint-config packages, @repo/shared (Zod health schema), and @repo/database (Prisma 6.x singleton + full 8-phase schema)

## Tasks Completed

| # | Task | Commit | Status |
|---|------|--------|--------|
| 1 | Root workspace config (package.json, turbo.json, pnpm-workspace.yaml, tsconfig.json, .gitignore, .env.example) | 3a36e3b | Done |
| 2 | Shared packages — @repo/tsconfig, @repo/eslint-config, @repo/shared, @repo/database skeletons | 32b6372 | Done |

## What Was Built

### Task 1: Root workspace config

Created the six root-level monorepo files:

- **package.json**: `name: "english-learning"`, `packageManager: "pnpm@9.15.9"` (pinned to avoid lockfile drift between pnpm 10 local dev and pnpm 9 CI), scripts delegating to turbo run / pnpm --filter, devDeps: turbo@^2.9.18 + typescript@^5.4.0.
- **pnpm-workspace.yaml**: `packages: ["apps/*", "packages/*"]` — enables workspace resolution for all app and package directories.
- **turbo.json**: uses `"tasks"` key (Turborepo 2.x requirement — `"pipeline"` is a silent no-op in v2). 7 tasks defined: build, dev, lint, type-check, test, db:migrate, db:generate with correct dependsOn/outputs/cache settings.
- **tsconfig.json**: root coordinator only (`files: []`, `references: []`) — not included in any app build, prevents root-level type errors leaking into app builds.
- **.gitignore**: `.env` gitignored (T-1-01 mitigation), `packages/database/generated/` gitignored (generated client not committed).
- **.env.example**: 13 required env var keys with CHANGE_ME placeholders — `DATABASE_URL`, `REDIS_URL_BULLMQ`, `REDIS_URL_CACHE`, `MINIO_*`, `POSTGRES_*`, `NEXTAUTH_*`, `GOOGLE_*`, `JWT_SECRET`, `PORT`.

### Task 2: Shared packages

Four `@repo/*` packages created as just-in-time internal packages (TypeScript exported directly, no build step):

**@repo/tsconfig** (packages/tsconfig/):
- `base.json`: `target: es2022`, `NodeNext` module resolution, `strict: true`, `noUncheckedIndexedAccess: true` — base for all packages.
- `nextjs.json`: extends base, overrides to `Bundler` moduleResolution, `jsx: preserve`, `allowImportingTsExtensions: true`, `noEmit: true`.
- `nestjs.json`: extends base, overrides to `CommonJS` + `node` (critical — NodeNext breaks NestJS DI silently), `experimentalDecorators: true`, `emitDecoratorMetadata: true`.

**@repo/eslint-config** (packages/eslint-config/):
- `index.mjs`: ESLint 9 flat config base, `no-console: warn`, `no-unused-vars: warn`.
- `nextjs.mjs`, `nestjs.mjs`: extend base config, placeholder rules for Phase 2+ when apps add their ESLint plugins.

**@repo/shared** (packages/shared/):
- `src/index.ts`: exports `HealthResponseSchema` (zod `z.object({ status, timestamp })`), `HealthResponse` type. Barrel export growing in Phase 2+ with auth DTOs, content types, quiz schemas.

**@repo/database** (packages/database/):
- `package.json`: `@prisma/client@^6.19.3`, `prisma@^6.19.3` (explicitly pinned — npm latest now resolves to 7.8.0 with breaking changes). No `postinstall` script (avoids pnpm workspace symlink timing issue #6603).
- `src/index.ts`: `globalThis` singleton pattern — prevents duplicate PrismaClient instances under Next.js webpack hot-reload which would exhaust the PostgreSQL connection pool.
- `prisma/schema.prisma`: Full schema covering all 8 phases — 8 enums + 25 models including all NextAuth tables (User, Account, Session, VerificationToken), vocabulary/SRS (FSRS fields matching ts-fsrs Card interface), grammar, reading, listening, quiz/gamification, and adaptive analytics.

## Deviations from Plan

None — plan executed exactly as written.

All anti-patterns from RESEARCH.md were avoided:
- T-1-02: `"tasks"` key used (not `"pipeline"`)
- T-1-03: No `postinstall` script in `@repo/database`
- T-1-01: `.env` gitignored; `.env.example` committed with CHANGE_ME only

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes beyond what was specified in the plan's `<threat_model>`. The T-1-01/T-1-02/T-1-03 mitigations are confirmed implemented:
- `.env` gitignored (verified with `git check-ignore .env`)
- turbo.json uses `"tasks"` key
- No `postinstall` in `@repo/database/package.json`

## Known Stubs

None affecting plan goals. The following are intentional scaffolds with future-phase resolution:

- `packages/eslint-config/nextjs.mjs` and `nestjs.mjs` have empty rules sections — placeholder for Phase 2+ when `@next/eslint-plugin-next` and NestJS-specific rules are added.
- `packages/shared/src/index.ts` exports only `HealthResponseSchema` — Phase 2+ adds auth DTOs, content types, quiz schemas.
- `packages/database/src/index.ts` imports from `../generated/client` which does not exist until `pnpm db:generate` runs after `pnpm install`.

None of these prevent the plan's goal (correct workspace scaffold with proper configs).

## Self-Check: PASSED

- `package.json` — exists, contains `pnpm@9.15.9`
- `turbo.json` — exists, contains `"tasks"` key (grep returns 1)
- `packages/tsconfig/nestjs.json` — exists, contains `emitDecoratorMetadata: true` and `"CommonJS"`
- `packages/database/package.json` — exists, contains `^6.19.3`, no `postinstall`
- `packages/database/src/index.ts` — exists, contains `globalForPrisma`
- `packages/shared/src/index.ts` — exists, exports `HealthResponseSchema`
- `.gitignore` — contains `.env` (exact line) and `packages/database/generated/`
- `.env.example` — committed (git ls-files returns .env.example), contains 13 required keys
- Task 1 commit `3a36e3b` — confirmed in git log
- Task 2 commit `32b6372` — confirmed in git log
