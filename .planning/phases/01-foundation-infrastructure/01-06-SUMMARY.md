---
plan: 01-06
phase: 01-foundation-infrastructure
status: complete
completed: 2026-06-11
self_check: PASSED
key-files:
  created:
    - .github/workflows/ci.yml
    - packages/database/vitest.config.ts
    - packages/database/tsconfig.json
    - packages/shared/vitest.config.ts
    - packages/shared/tsconfig.json
  modified:
    - packages/database/package.json
    - packages/shared/package.json
---

## Plan 01-06: Walking Skeleton CI + Human Verification

### What Was Built

Completed the walking skeleton with a GitHub Actions CI pipeline and the final two Vitest configs needed by VALIDATION.md Wave 0. Human smoke test verified: `pnpm turbo run type-check` passes across all 4 workspaces; `db:migrate:deploy` applies the initial migration against the local Postgres container.

### Tasks Completed

**Task 1 — CI pipeline + Wave 0 Vitest configs:**
- `.github/workflows/ci.yml` — push/PR to main/master triggers: checkout → pnpm 9 → node 20 → install (frozen-lockfile) → db:generate → type-check → lint → db:migrate:deploy. Postgres 16-alpine service container with health check.
- `packages/database/vitest.config.ts` — Vitest 2.x node environment, globals true
- `packages/database/tsconfig.json` — extends @repo/tsconfig/base.json, vitest/globals types
- `packages/shared/vitest.config.ts` — Vitest 2.x node environment, globals true
- `packages/shared/tsconfig.json` — extends @repo/tsconfig/base.json, vitest/globals types
- Added `test` and `type-check` scripts to both package.json files

**Task 2 — Human verification checkpoint (approved):**
- `pnpm turbo run type-check` → 4 successful across @repo/api, @repo/web, @repo/database, @repo/shared
- `db:migrate:deploy` → all 29 tables applied to local Postgres (el_postgres container)
- Wave 0 complete: all 4 Vitest configs exist (api ✓, web ✓, database ✓, shared ✓)

### Key Decisions

- CI uses `prisma migrate deploy` (not `dev`) — non-interactive, applies existing migrations
- pnpm pinned to v9 in CI via `pnpm/action-setup@v3 version: 9`
- DATABASE_URL loaded from .env for local dev; CI uses hardcoded postgres://postgres:postgres@localhost:5432/english_learning_test

### Self-Check: PASSED

- All 4 workspace type-checks pass
- CI YAML has postgres service with health check
- VALIDATION.md Wave 0 fully satisfied (4/4 Vitest configs)
- Human verification approved by user
