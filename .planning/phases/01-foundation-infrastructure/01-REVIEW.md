---
phase: 01-foundation-infrastructure
reviewed: 2026-06-11T00:00:00Z
depth: standard
files_reviewed: 30
files_reviewed_list:
  - .github/workflows/ci.yml
  - apps/api/nest-cli.json
  - apps/api/package.json
  - apps/api/src/app.module.ts
  - apps/api/src/health/health.controller.spec.ts
  - apps/api/src/health/health.controller.ts
  - apps/api/src/health/health.module.ts
  - apps/api/src/main.ts
  - apps/api/tsconfig.json
  - apps/api/vitest.config.ts
  - apps/web/next.config.js
  - apps/web/package.json
  - apps/web/postcss.config.js
  - apps/web/src/app/api/health/route.test.ts
  - apps/web/src/app/api/health/route.ts
  - apps/web/src/app/globals.css
  - apps/web/src/app/layout.tsx
  - apps/web/src/app/page.tsx
  - apps/web/tailwind.config.ts
  - apps/web/tsconfig.json
  - apps/web/vitest.config.ts
  - packages/database/package.json
  - packages/database/tsconfig.json
  - packages/database/vitest.config.ts
  - packages/shared/package.json
  - packages/shared/tsconfig.json
  - packages/shared/vitest.config.ts
  - package.json
  - pnpm-workspace.yaml
  - turbo.json
  - docker-compose.yml
findings:
  critical: 3
  warning: 7
  info: 3
  total: 13
status: issues_found
---

# Phase 01: Code Review Report

**Reviewed:** 2026-06-11T00:00:00Z
**Depth:** standard
**Files Reviewed:** 30
**Status:** issues_found

## Summary

This review covers the Phase 1 walking skeleton: monorepo scaffolding, Docker backing services, CI pipeline, Prisma schema, NestJS and Next.js health endpoints, and shared packages. The foundation is structurally sound — correct technology choices, proper two-Redis topology, local port binding, and workspace wiring are all in place.

Three blockers require immediate attention before the next phase builds on this foundation. The most serious is a committed `.env` file containing real-looking secrets (dev passwords and JWT secrets), which will be replicated into git history. The second is a missing `.env` gitignore exception that is contradicted by the git-tracked file. The CI pipeline never runs the test suite, so regressions in unit tests ship silently. The Prisma schema has a referential integrity gap in `GrammarAttempt` that will manifest as orphaned rows in production.

---

## Critical Issues

### CR-01: `.env` file committed to git with real-looking secrets

**File:** `.env:1-26`
**Issue:** The `.env` file is present on disk, listed as tracked by `git ls-files`, and contains values that look like real dev secrets: `POSTGRES_PASSWORD=devpassword123`, `NEXTAUTH_SECRET=dev-secret-change-in-production`, `JWT_SECRET=dev-jwt-secret-change-in-production`. Even though these are described as "dev" values, committing any `.env` to version control is a security violation: the file enters git history permanently, and values labeled "change in production" routinely do not get changed. The `.gitignore` correctly lists `.env`, but the file is tracked despite this, meaning it was `git add`-ed before the ignore rule was in place or was force-added.

**Fix:** Remove the file from tracking and rotate or clearly mark all values as non-sensitive placeholders:
```bash
git rm --cached .env
```
Replace the content of `.env` with only:
```
# This file is not tracked by git. Copy .env.example and fill in values.
```
Then ensure `.env.example` remains the only tracked env template. The actual `devpassword123` and `dev-*-change-in-production` values are fine in `.env.example` only if clearly labeled as examples. For dev secrets that are already in git history, run `git filter-repo` or treat the history as contaminated.

---

### CR-02: CI pipeline never runs tests — regressions ship silently

**File:** `.github/workflows/ci.yml:38-63`
**Issue:** The CI job is named "Type-check, Lint, Migrate" and contains exactly those three steps. There is no `turbo run test` or `pnpm test` step. As a result, any unit test failure (e.g., a broken health controller, a failing Zod schema) goes undetected in CI. The tests written in Phase 1 provide zero CI regression protection.

Additionally, no Redis service is provisioned in the CI `services:` block, even though `REDIS_URL_BULLMQ` and `REDIS_URL_CACHE` are set as environment variables. When tests that need Redis are added in later phases, the CI will silently connect to nothing, producing connection-error failures or skipped tests rather than catching the missing service setup.

**Fix:** Add a test step and a Redis service:
```yaml
services:
  postgres:
    # ... existing config ...
  redis:
    image: redis:7-alpine
    options: >-
      --health-cmd "redis-cli ping"
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5
    ports:
      - 6379:6379

# In steps, after "Run database migrations":
- name: Run tests
  run: pnpm turbo run test
```

---

### CR-03: `GrammarAttempt.userId` has no enforced foreign key relation to `User`

**File:** `packages/database/prisma/schema.prisma:284-295`
**Issue:** `GrammarAttempt` stores a `userId String` field and even indexes on it, but defines no Prisma relation to the `User` model. This means no foreign key constraint is generated in PostgreSQL. User attempts rows will persist even after the `User` is deleted (`onDelete` cascade cannot be configured without the relation). The `User` model also has no `grammarAttempts GrammarAttempt[]` relation field, confirming the link is entirely missing. All other user-linked tables (`GrammarProgress`, `QuizSession`, `SrsCard`, etc.) correctly define the relation with `onDelete: Cascade`.

**Fix:** Add the relation to both models:
```prisma
// In GrammarAttempt model, add:
user User @relation(fields: [userId], references: [id], onDelete: Cascade)

// In User model, add to relations block:
grammarAttempts GrammarAttempt[]
```
This will generate the missing FK constraint and enable cascade deletion.

---

## Warnings

### WR-01: `@swc/cli` and `@swc/core` pinned to `latest` — non-reproducible builds

**File:** `apps/api/package.json:28-29`
**Issue:** Both `@swc/cli` and `@swc/core` use `"latest"` as the version specifier. This is the only dependency in the entire monorepo using `latest` rather than a semver range. SWC releases frequently and has a history of breaking changes in minor versions. Using `latest` means `pnpm install --frozen-lockfile` in CI will still use the lockfile version, but any `pnpm install` without `--frozen-lockfile` will silently pull a newer major version. It also makes dependency auditing impossible since the installed version changes over time.

**Fix:**
```json
"@swc/cli": "^0.4.0",
"@swc/core": "^1.7.0"
```
Pin to the currently installed version range, then upgrade intentionally.

---

### WR-02: `turbo.json` `test` task depends on `build` — unnecessary coupling that slows feedback

**File:** `turbo.json:17-20`
**Issue:** The `test` task is declared with `"dependsOn": ["build"]`. This means every `turbo run test` invocation triggers a full `nest build` (TypeScript → CommonJS compilation) before running Vitest. Vitest with SWC compiles TypeScript on-the-fly; it does not need the compiled `dist/` output. This adds 15-30 seconds of unnecessary build time to every test run. For packages that have no `build` script (`@repo/shared`, `@repo/database`), Turborepo skips the build gracefully, but for `@repo/api` this is a real penalty.

**Fix:**
```json
"test": {
  "dependsOn": ["^build"],
  "outputs": ["coverage/**"]
}
```
Using `"^build"` (upstream deps only) instead of `"build"` (self + upstream) means the test task waits for dependency packages to build but does not require the package under test to build itself first. Alternatively, remove the `dependsOn` entirely if cross-package type safety is validated by the `type-check` task.

---

### WR-03: `turbo.json` references `.env` as a `globalDependency` but `.env` is gitignored

**File:** `turbo.json:3`
**Issue:** `"globalDependencies": [".env"]` instructs Turborepo to hash `.env` as part of its cache key. In CI, `.env` does not exist (it is gitignored), so Turborepo hashes a missing file — the resulting cache key is computed as if the file is empty. This is not a fatal error, but it means the turbo cache key is incorrect: changing `.env` locally won't invalidate the CI cache, and local cache entries computed with `.env` won't be reusable in CI. The intent (cache-bust when env changes) is not achieved in CI.

**Fix:** Either remove `.env` from `globalDependencies` (the CI env vars are explicitly set in the workflow, which Turborepo doesn't read), or use `.env.example` instead — it is tracked by git and actually reflects the configuration surface:
```json
"globalDependencies": [".env.example"]
```

---

### WR-04: `packages/@repo/database` and `@repo/shared` export TypeScript source directly — no compiled output

**File:** `packages/database/package.json:5-7`, `packages/shared/package.json:5-7`
**Issue:** Both packages declare `"exports": { ".": "./src/index.ts" }`, pointing to TypeScript source files. This works for the `@repo/web` (Next.js with Bundler module resolution) and `@repo/api` (NestJS with SWC), because both host apps transpile on the fly. However, neither package has a `build` script or a compiled `dist/` output. If any consumer ever runs in a context that cannot transpile TypeScript (e.g., a plain Node.js script, a Jest run without SWC, or a published package), the import will fail with a syntax error. The turbo `type-check` task for `@repo/api` depends on `^build`, meaning it waits for upstream builds — but these packages have no `build` to produce, so the task dependency is resolved vacuously.

**Fix:** For internal monorepo packages that will never be published, the pattern is acceptable but should be made explicit. Consider adding a `build` script that compiles to `dist/` and adding conditional exports:
```json
"exports": {
  ".": {
    "import": "./dist/index.js",
    "require": "./dist/index.cjs",
    "types": "./dist/index.d.ts",
    "default": "./src/index.ts"
  }
}
```
At minimum, add a comment in both `package.json` files clarifying that the source export is intentional and supported only within the Turborepo monorepo context.

---

### WR-05: `apps/web` missing `@vitest/coverage-v8` devDependency

**File:** `apps/web/package.json`
**Issue:** `apps/web/vitest.config.ts` declares `coverage: { provider: 'v8', ... }`, but `@vitest/coverage-v8` is not listed in `apps/web/package.json` devDependencies. The `@repo/api` package correctly includes `"@vitest/coverage-v8": "^2.0.0"`. When `pnpm turbo run test --coverage` is invoked for the web app, it will fail with `Error: Cannot find package '@vitest/coverage-v8'`.

**Fix:** Add to `apps/web/package.json` devDependencies:
```json
"@vitest/coverage-v8": "^2.0.0"
```

---

### WR-06: `docker-compose.prod.yml` exposes MinIO ports 9000/9001 on all interfaces (0.0.0.0)

**File:** `docker-compose.prod.yml:85-87`
**Issue:** In `docker-compose.yml` (dev), all ports are correctly bound to `127.0.0.1`. In `docker-compose.prod.yml`, the MinIO service exposes `"9000:9000"` and `"9001:9001"` without the `127.0.0.1:` prefix. This binds MinIO to all network interfaces on the production host, making the S3 API and admin console publicly accessible to the internet without the reverse proxy. The comment says "restrict access via firewall rules" but the dev compose proves the correct mechanism is bind-address restriction at the Docker layer, not a separate firewall.

**Fix:** Apply the same localhost-binding pattern as dev:
```yaml
ports:
  - "127.0.0.1:9000:9000"
  - "127.0.0.1:9001:9001"
```
The NestJS API (running as a sibling container) accesses MinIO via the Docker internal network (`http://minio:9000`), not the host-bound port.

---

### WR-07: `apps/api/src/main.ts` — `bootstrap()` promise rejection is unhandled

**File:** `apps/api/src/main.ts:29`
**Issue:** `bootstrap()` is called without `.catch()` or a top-level `try/catch`. If `NestFactory.create()` or `app.listen()` throws (e.g., missing required env var, port already in use, database connection failure at startup), the error is an unhandled promise rejection. In Node.js 15+, unhandled promise rejections crash the process with exit code 1, but the error message is often not logged to stderr in a useful format before the process exits. This makes production debugging harder.

**Fix:**
```typescript
bootstrap().catch((err: unknown) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
```

---

## Info

### IN-01: `turbo.json` `lint` task has no `dependsOn` — may lint stale type imports

**File:** `turbo.json:13`
**Issue:** The `lint` task has an empty configuration object `{}`, meaning it has no `dependsOn`. For the NestJS API that uses `@nestjs/eslint-plugin` with type-aware rules, linting without first building upstream packages can produce false negatives or errors if type information is stale. This is low risk in Phase 1 (no complex type imports yet), but will matter when `@repo/shared` types are imported by both apps.

**Fix:**
```json
"lint": {
  "dependsOn": ["^build"]
}
```

---

### IN-02: `docker-compose.yml` redis-bullmq service has no `maxmemory` limit

**File:** `docker-compose.yml:36-56`
**Issue:** `redis-bullmq` is configured with `maxmemory-policy noeviction` (correct for BullMQ) but without a `--maxmemory` limit. Without an explicit limit, Redis will consume all available host memory before triggering the noeviction policy, potentially OOM-killing the host process or other containers. In a development environment this is low risk, but it's a habit that shouldn't carry to production.

**Fix:** Add a reasonable upper bound:
```yaml
command: >
  redis-server
  --appendonly yes
  --maxmemory 512mb
  --maxmemory-policy noeviction
```

---

### IN-03: `apps/web/src/app/api/health/route.test.ts` — HTTP status code not asserted

**File:** `apps/web/src/app/api/health/route.test.ts:6-19`
**Issue:** The tests assert `json.status === 'ok'` and a valid timestamp, but never assert that `response.ok === true` or `response.status === 200`. If the route were accidentally changed to return a non-2xx status while keeping the JSON body, the tests would still pass. The NestJS controller spec has the same gap — it tests the return value of `check()` directly but not the HTTP response wrapper.

**Fix:**
```typescript
it('returns HTTP 200', async () => {
  const response = await GET();
  expect(response.status).toBe(200);
});
```

---

_Reviewed: 2026-06-11T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
