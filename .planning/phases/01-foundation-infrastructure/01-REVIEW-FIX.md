---
phase: 01-foundation-infrastructure
fixed_at: 2026-06-11T00:00:00Z
review_path: .planning/phases/01-foundation-infrastructure/01-REVIEW.md
iteration: 1
findings_in_scope: 12
fixed: 11
skipped: 1
status: partial
---

# Phase 01: Code Review Fix Report

**Fixed at:** 2026-06-11T00:00:00Z
**Source review:** .planning/phases/01-foundation-infrastructure/01-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 12 (CR-01 pre-resolved per instructions; CR-02, CR-03, WR-01–WR-07, IN-01–IN-03 = 12 remaining)
- Fixed: 11
- Skipped: 1

## Fixed Issues

### CR-02: CI pipeline never runs tests

**Files modified:** `.github/workflows/ci.yml`
**Commit:** 4a076e5
**Applied fix:** Added a `redis:7-alpine` service to the CI `services:` block (with health check on `redis-cli ping`, port 6379:6379) and a `Run tests` step running `pnpm turbo run test` after the database migration step.

---

### CR-03: `GrammarAttempt.userId` has no enforced foreign key relation to `User`

**Files modified:** `packages/database/prisma/schema.prisma`
**Commit:** 6ea311f
**Applied fix:** Added `user User @relation(fields: [userId], references: [id], onDelete: Cascade)` to the `GrammarAttempt` model, and added `grammarAttempts GrammarAttempt[]` to the `User` model's relations block. This generates the missing FK constraint in PostgreSQL and enables cascade deletion.

---

### WR-01: `@swc/cli` and `@swc/core` pinned to `latest`

**Files modified:** `apps/api/package.json`
**Commit:** d98a4a1
**Applied fix:** Changed `"@swc/cli": "latest"` to `"@swc/cli": "^0.4.0"` and `"@swc/core": "latest"` to `"@swc/core": "^1.7.0"`.

---

### WR-02: `turbo.json` `test` task depends on `build`

**Files modified:** `turbo.json`
**Commit:** e1b1c82
**Applied fix:** Changed `"dependsOn": ["build"]` to `"dependsOn": ["^build"]` for the `test` task, so it waits for upstream dependency packages to build but does not require the package-under-test to compile itself before Vitest runs.

---

### WR-03: `turbo.json` references `.env` as a `globalDependency`

**Files modified:** `turbo.json`
**Commit:** e1b1c82
**Applied fix:** Changed `"globalDependencies": [".env"]` to `"globalDependencies": [".env.example"]` so Turborepo hashes a git-tracked file for cache key computation.

---

### WR-04: Shared packages export TypeScript source with no clarifying comment

**Files modified:** `packages/database/package.json`, `packages/shared/package.json`
**Commit:** c4de47c
**Applied fix:** Added a `_exportNote` field to both package.json files documenting that the TypeScript source export is intentional — both consumer apps transpile on the fly — and that these packages are internal to the Turborepo monorepo and will never be published to npm.

---

### WR-05: `apps/web` missing `@vitest/coverage-v8` devDependency

**Files modified:** `apps/web/package.json`
**Commit:** 92f8dc4
**Applied fix:** Added `"@vitest/coverage-v8": "^2.0.0"` to `apps/web/package.json` devDependencies, matching the version already present in `apps/api/package.json`.

---

### WR-06: `docker-compose.prod.yml` exposes MinIO ports on all interfaces

**Files modified:** `docker-compose.prod.yml`
**Commit:** 1de6f7e
**Applied fix:** Changed `"9000:9000"` and `"9001:9001"` to `"127.0.0.1:9000:9000"` and `"127.0.0.1:9001:9001"`, matching the localhost-binding pattern already used by all other services in both compose files. Updated the comments to reflect that sibling containers access MinIO via the Docker internal network.

---

### WR-07: `bootstrap()` promise rejection unhandled in `apps/api/src/main.ts`

**Files modified:** `apps/api/src/main.ts`
**Commit:** 7e5bb70
**Applied fix:** Changed `bootstrap();` to `bootstrap().catch((err: unknown) => { console.error('Fatal startup error:', err); process.exit(1); });` so startup failures produce a useful error message before process exit.

---

### IN-01: `turbo.json` `lint` task has no `dependsOn`

**Files modified:** `turbo.json`
**Commit:** e1b1c82
**Applied fix:** Added `"dependsOn": ["^build"]` to the `lint` task so linting waits for upstream packages to build before running type-aware ESLint rules.

---

### IN-02: `docker-compose.yml` redis-bullmq has no `maxmemory` limit

**Files modified:** `docker-compose.yml`
**Commit:** 80c7b87
**Applied fix:** Added `--maxmemory 512mb` to the `redis-bullmq` command, so Redis will trigger the `noeviction` policy at 512 MB rather than consuming all available host memory.

---

### IN-03: Health route test missing HTTP status assertion

**Files modified:** `apps/web/src/app/api/health/route.test.ts`
**Commit:** 16b297c
**Applied fix:** Added a new `it('returns HTTP 200', ...)` test case that calls `GET()` and asserts `response.status === 200`, so a route accidentally returning a non-2xx status with a valid JSON body would be caught.

---

## Skipped Issues

### CR-01: `.env` file committed to git with real-looking secrets

**File:** `.env:1-26`
**Reason:** Skipped per explicit instructions — `git ls-files .env` returns nothing, confirming `.env` is not tracked by git. This finding is already resolved.
**Original issue:** `.env` file present in git tracking with dev credentials. Confirmed not applicable to current repo state.

---

## Post-Fix Verification

`pnpm turbo run type-check lint` was run after all fixes were applied:

- **type-check:** All 4 packages passed (2 cached, results consistent).
- **lint:** `@repo/api#lint` failed with "ESLint couldn't find an eslint.config.js file" — this is a **pre-existing issue** that existed before any fix was applied (`apps/api` has never had an ESLint config file in git history). None of the fixes in this report modified any ESLint configuration. `@repo/web#lint` passed.

---

_Fixed: 2026-06-11T00:00:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
