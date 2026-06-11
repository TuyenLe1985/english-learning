---
status: testing
phase: 01-foundation-infrastructure
source:
  - 01-01-SUMMARY.md
  - 01-02-SUMMARY.md
  - 01-03-SUMMARY.md
  - 01-04-SUMMARY.md
  - 01-05-SUMMARY.md
  - 01-06-SUMMARY.md
started: "2026-06-11T00:00:00Z"
updated: "2026-06-11T00:00:00Z"
---

## Current Test

number: 7
name: Unit Test Suite
expected: |
  Run `pnpm turbo run test`.
  Tests pass across all packages with no failures.
  At minimum: NestJS health controller tests pass (health.controller.spec.ts),
  and Next.js health route test passes (route.test.ts includes HTTP 200 assertion).
awaiting: user response

## Tests

### 1. Cold Start Smoke Test
expected: |
  Kill any running services. Run `docker compose down -v && docker compose up -d`.
  All 4 services start without errors: postgres (el_postgres), redis-bullmq, redis-cache, minio.
  Then run `pnpm db:migrate` — it should complete with zero errors and show 29 tables applied.
  Finally, start the NestJS API (`pnpm --filter @repo/api run dev`) and Next.js web
  (`pnpm --filter @repo/web run dev`) — both should boot without errors and stay running.
result: issue
reported: "[NestJS] ERROR [PackageLoader] The \"class-validator\" package is missing. Please, make sure to install it to take advantage of ValidationPipe."
severity: major

### 2. Docker Services Health
expected: |
  With `docker compose up -d` running, all 4 services are healthy:
  - `docker compose ps` shows status "healthy" or "running" for postgres, redis-bullmq, redis-cache, minio.
  - Ports are bound to localhost only: 5432 (postgres), 6379 (redis-bullmq), 6380 (redis-cache), 9000/9001 (minio).
  - MinIO console is accessible at http://localhost:9001.
result: pass

### 3. Database Migration (29 tables)
expected: |
  Run `pnpm db:migrate` (or `pnpm --filter @repo/database run db:migrate`).
  Migration completes with zero errors. All 29 tables are created in PostgreSQL 16.
  Key tables present: User, SrsCard, VocabularyWord, ReadingPassage, ListeningContent, QuizSession.
  Prisma version is 6.x (not 7.x).
result: pass

### 4. NestJS API Health Endpoint
expected: |
  With NestJS running (`pnpm --filter @repo/api run dev` or `nest start`):
  `curl http://localhost:3001/api/health` returns HTTP 200 with body:
  `{"status":"ok","timestamp":"<ISO string>"}`.
  The API starts without crashing and stays running (no unhandled promise rejection).
result: pass

### 5. Next.js Web Health Endpoint
expected: |
  With Next.js running (`pnpm --filter @repo/web run dev`):
  `curl http://localhost:3000/api/health` returns HTTP 200 with body:
  `{"status":"ok","timestamp":"<ISO string>"}`.
  The web app homepage at http://localhost:3000 loads and shows "English Learning Platform".
result: pass

### 6. Type-check Pipeline
expected: |
  Run `pnpm turbo run type-check`.
  All 4 workspaces pass with zero TypeScript errors:
  @repo/api, @repo/web, @repo/database, @repo/shared — 4 successful, 0 failed.
result: pass

### 7. Unit Test Suite
expected: |
  Run `pnpm turbo run test`.
  Tests pass across all packages with no failures.
  At minimum: NestJS health controller tests pass (health.controller.spec.ts),
  and Next.js health route test passes (route.test.ts includes HTTP 200 assertion).
result: [pending]

### 8. Lint Pipeline
expected: |
  Run `pnpm turbo run lint`.
  Both @repo/api and @repo/web lint tasks complete (0 errors, warnings are acceptable).
  ESLint 9 flat config is in place for both apps.
result: [pending]

### 9. CLAUDE.md Documentation
expected: |
  Open CLAUDE.md at the project root.
  It documents:
  - Monorepo layout (apps/, packages/ structure)
  - Docker topology (4-service setup: postgres, redis-bullmq, redis-cache, minio)
  - Two-Redis split rationale (BullMQ noeviction+AOF vs cache allkeys-lru)
result: [pending]

## Summary

total: 9
passed: 5
issues: 1
pending: 3
skipped: 0

## Gaps

- truth: "NestJS API boots without errors; no missing package warnings"
  status: failed
  reason: "User reported: [NestJS] ERROR [PackageLoader] The \"class-validator\" package is missing. Please, make sure to install it to take advantage of ValidationPipe."
  severity: major
  test: 1
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
