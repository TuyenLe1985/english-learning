---
phase: 01-foundation-infrastructure
plan: 02
subsystem: infrastructure
tags: [docker, compose, redis, postgres, minio, backing-services]
dependency_graph:
  requires: []
  provides:
    - docker-compose.yml (dev backing services)
    - docker-compose.prod.yml (prod orchestration skeleton)
    - apps/api/Dockerfile
    - apps/web/Dockerfile
  affects:
    - All subsequent plans that run `docker compose up -d`
    - Plan 01-03 (Prisma migrations need Postgres from this compose)
tech_stack:
  added:
    - postgres:16-alpine (Docker image)
    - redis:7-alpine (Docker image, two instances)
    - minio/minio (Docker image)
    - node:20-alpine (Docker base for app Dockerfiles)
  patterns:
    - Two-Redis topology (BullMQ noeviction+AOF / cache allkeys-lru)
    - Docker multi-stage build (builder + runner stages)
    - localhost-only port binding (127.0.0.1) for dev security
key_files:
  created:
    - docker-compose.yml
    - docker-compose.prod.yml
    - apps/api/Dockerfile
    - apps/web/Dockerfile
decisions:
  - "curl healthcheck for MinIO instead of mc ready local (avoids alias setup requirement)"
  - "All dev ports bound to 127.0.0.1 — prevents unintended LAN exposure"
  - "redis-bullmq uses noeviction+AOF — SRS review job eviction would be silent data loss"
  - "redis-cache uses allkeys-lru with no volume — cache miss is acceptable failure mode"
  - "No version: key in compose files — deprecated in Docker Compose v2"
metrics:
  duration_minutes: 2
  completed_date: "2026-06-11"
  tasks_completed: 2
  files_created: 4
---

# Phase 1 Plan 2: Docker Compose Topology Summary

**One-liner:** Two-Redis dev backing services (noeviction BullMQ + allkeys-lru cache) with multi-stage Node:20 Dockerfiles for NestJS and Next.js production builds.

## What Was Built

### Task 1: docker-compose.yml (Dev Backing Services)

Created the dev compose file with exactly 4 services:

- **postgres** (postgres:16-alpine): Port `127.0.0.1:5432:5432`, `pg_isready` healthcheck, named volume `postgres_data`, `env_file: .env`
- **redis-bullmq** (redis:7-alpine): Port `127.0.0.1:6379:6379`, `--appendonly yes --maxmemory-policy noeviction`, named volume `redis_bullmq_data`
- **redis-cache** (redis:7-alpine): Port `127.0.0.1:6380:6379`, `--maxmemory 256mb --maxmemory-policy allkeys-lru`, no persistence volume
- **minio** (minio/minio): Ports `127.0.0.1:9000:9000` and `127.0.0.1:9001:9001`, curl healthcheck to `/minio/health/live`, named volume `minio_data`

No app services defined (apps run natively via `turbo dev` per D-05). No deprecated `version:` key.

### Task 2: docker-compose.prod.yml + Dockerfiles

**docker-compose.prod.yml**: All 6 services — the 4 backing services (identical to dev, with `restart: unless-stopped` added) plus:
- **api** service: Builds from `apps/api/Dockerfile`, port `3001:3001`, `depends_on` all 4 backing services with `condition: service_healthy`
- **web** service: Builds from `apps/web/Dockerfile`, port `3000:3000`, `depends_on: api` with `condition: service_healthy`

**apps/api/Dockerfile**: Two-stage Node:20-alpine build — `builder` installs pnpm@9.15.9, runs `pnpm install --frozen-lockfile`, generates Prisma client, builds NestJS via `pnpm --filter @repo/api run build`; `runner` copies `dist/`, `node_modules/`, and `packages/database/generated/`.

**apps/web/Dockerfile**: Two-stage Node:20-alpine build — `builder` builds Next.js standalone output; `runner` copies `.next/standalone` and `.next/static`, runs `node server.js`.

## Verification Results

| Check | Result |
|-------|--------|
| `docker compose config` structure valid | PASS (env_file warning expected — .env created in plan 01-01) |
| `docker compose -f docker-compose.prod.yml config` valid | PASS (same env_file warning) |
| `redis-bullmq` uses `--maxmemory-policy noeviction` | PASS |
| `redis-bullmq` uses `--appendonly yes` | PASS |
| `redis-cache` uses `--maxmemory-policy allkeys-lru` | PASS |
| All dev ports bound to `127.0.0.1` | PASS |
| MinIO healthcheck uses curl (not mc) | PASS |
| Exactly 3 named volumes | PASS (postgres_data, redis_bullmq_data, minio_data) |
| No `version:` key in either compose file | PASS |
| No app services in dev compose | PASS |
| `node:20-alpine` in both Dockerfiles | PASS |
| Multi-stage builds (builder + runner) | PASS |
| `restart: unless-stopped` on all 6 prod services | PASS |

## Deviations from Plan

None — plan executed exactly as written.

The research Pattern 5 example showed `"5432:5432"` port format (not localhost-bound), but the task spec explicitly required `"127.0.0.1:5432:5432"`. The plan spec was followed over the research example, which aligns with the T-1-03 threat mitigation.

## Known Stubs

None — this plan creates infrastructure files only. No data-serving stubs.

## Threat Surface Scan

No new network endpoints beyond what is specified in the plan's threat model. All mitigations implemented:

| Threat | Mitigation Applied |
|--------|-------------------|
| T-1-03: Docker port exposure | All dev ports use `127.0.0.1:` prefix |
| T-1-04: env_file secrets | `env_file: .env` used; no secrets hardcoded in compose |
| T-1-05: BullMQ eviction | `--maxmemory-policy noeviction` on redis-bullmq |
| T-1-06: MinIO default creds | Dev uses minioadmin placeholders; CHANGE_ME noted in comments |

## Self-Check: PASSED

Files created:
- docker-compose.yml: EXISTS
- docker-compose.prod.yml: EXISTS
- apps/api/Dockerfile: EXISTS
- apps/web/Dockerfile: EXISTS

Commits verified:
- 47a9308: chore(01-02): add docker-compose.yml for dev backing services
- 62cde3d: chore(01-02): add docker-compose.prod.yml and app Dockerfiles
