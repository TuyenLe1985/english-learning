# Phase 1: Foundation + Infrastructure - Context

**Gathered:** 2026-06-11
**Status:** Ready for planning

<domain>
## Phase Boundary

The full project skeleton is running locally and deployable to a VPS — monorepo scaffold, Docker backing services, full Prisma schema for all 8 phases, and skeleton Next.js + NestJS apps all passing smoke tests. Zero user-facing feature logic. Every subsequent phase depends on this foundation being correct.

**Deliverables:**
- Turborepo monorepo with 2 apps (web, api) and 4 packages (database, shared, eslint-config, tsconfig)
- docker-compose.yml starting PostgreSQL 16, two Redis 7 instances, and MinIO without errors
- Full Prisma schema (all tables for all 8 phases) successfully migrated
- Next.js 14 app and NestJS 11 API each serving a health-check endpoint returning 200
- GitHub Actions CI pipeline (install, type-check, lint, db:migrate)
- `.env.example` documenting all required environment variables

</domain>

<decisions>
## Implementation Decisions

### Monorepo Package Boundaries
- **D-01:** `packages/database` — Prisma schema + generated client as a dedicated shared package. Both `apps/api` and `apps/web` import `@repo/database` directly. Next.js RSCs can query the DB without going through the API.
- **D-02:** `packages/shared` — TypeScript interfaces, Zod validation schemas, and request/response DTOs shared between NestJS and Next.js. No duplication of validation logic between apps.
- **D-03:** `packages/eslint-config` + `packages/tsconfig` — shared ESLint and TypeScript base configs; each app extends from these. Single change propagates everywhere.
- **D-04:** No additional packages in Phase 1 — no `packages/ui`, no `packages/utils`. Keep lean; extract later when real duplication appears.

### Docker Development Topology
- **D-05:** Backing services run in Docker; apps run natively. `docker compose up` starts Postgres, Redis ×2, MinIO only. Next.js and NestJS run with `turbo dev` (native). Hot-reload is instant; no volume-mount latency.
- **D-06:** Production uses separate Dockerfiles per app: `apps/web/Dockerfile` (multi-stage Next.js build) and `apps/api/Dockerfile` (multi-stage NestJS build). `docker-compose.prod.yml` wires all services together. `docker-compose.yml` is dev-only (backing services only).
- **D-07:** GitHub Actions CI skeleton included in Phase 1 — `.github/workflows/ci.yml` runs: `pnpm install`, type-check, lint, `pnpm db:migrate` against a test Postgres container. Ensures scaffold is CI-ready from day 1.

### Prisma Schema Scope
- **D-08:** Full schema for all 8 phases written in Phase 1 — all tables defined upfront. Future phases add feature logic only; no `ALTER TABLE` on live data. Avoids schema migrations touching already-migrated tables.
- **D-09:** FSRS algorithm selected for SRS scheduling (confirmed, not deferred). SRS card schema uses FSRS-specific fields: `stability`, `difficulty`, `elapsedDays`, `scheduledDays`, `reps`, `lapses`, `state` (enum: New/Learning/Review/Relearning), `lastReview`. SM-2 is not accommodated.
- **D-10:** Audio/media file references stored as **storage keys** (relative R2 object paths, e.g. `audio/listening/abc123.mp3`), not full URLs. NestJS constructs CDN URLs at runtime: `R2_BASE_URL + key`. Migrating CDN domains requires only an env var change, no DB migration.

### Environment Variable Strategy
- **D-11:** Root `.env` holds shared vars: `DATABASE_URL`, `REDIS_URL_BULLMQ`, `REDIS_URL_CACHE`, `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET`. Per-app `.env.local` holds app-specific vars: `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (in `apps/web`); `JWT_SECRET`, `PORT` (in `apps/api`).
- **D-12:** Docker Compose uses `env_file: .env` directive in `docker-compose.yml` to inject shared env vars into Postgres, Redis, and MinIO containers from the root `.env`.
- **D-13:** `.env.example` committed to the repo with all keys and placeholder values. Actual `.env` is gitignored. Developers copy `.env.example` → `.env` and fill in local values.

### Claude's Discretion
- Port assignments (conventional defaults are fine: Next.js 3000, NestJS 3001, Postgres 5432, Redis-BullMQ 6379, Redis-cache 6380, MinIO 9000/9001)
- Specific Turborepo `turbo.json` pipeline config (standard `dev`, `build`, `test`, `lint` tasks)
- Base Docker images (use `node:20-alpine` for apps, `postgres:16-alpine`, `redis:7-alpine`)
- Exact Prisma model naming conventions (singular PascalCase per Prisma convention)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Foundation
- `.planning/ROADMAP.md` — Phase 1 success criteria, two-Redis split rationale, full phase list and dependencies
- `.planning/REQUIREMENTS.md` — All 68 v1 requirements with traceability to phases; Phase 1 enables all others (no direct requirement IDs)
- `.planning/PROJECT.md` — Core value, tech stack decisions, key decisions table, constraints

### Technology Constraints (from CLAUDE.md)
- `CLAUDE.md` §Technology Stack — Full tech stack with version pins and compatibility table; these are LOCKED, not debatable
  - Next.js 14.x (pin to ^14.2, not 15/16)
  - NestJS 11.x (Node.js 20+ required)
  - Prisma 6.x (prisma CLI + @prisma/client must match major version)
  - BullMQ 5.x + @nestjs/bullmq 11.x
  - TailwindCSS 3.x (NOT v4 — shadcn/ui incompatible with Tailwind 4)
  - React 18.x (NOT React 19 — requires Next.js 15+)
  - Turborepo 2.x + pnpm 9.x
- `CLAUDE.md` §Stack Patterns by Scenario — Inter-service communication patterns (Next.js → NestJS via internal Docker network), worker-only bootstrap pattern, TTS cache pattern

### SRS Algorithm
- `.planning/STATE.md` §Accumulated Context/Decisions — Two-Redis split decision, FSRS over SM-2 rationale, VOCAB-08 deferral

No external ADRs or design specs — all decisions captured above and in decisions section.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — project is empty. Everything created from scratch in this phase.

### Established Patterns
- None yet — this phase establishes the patterns all future phases follow.

### Integration Points
- Phase 1 output (monorepo scaffold + schema) is the foundation every subsequent phase builds on. The package structure decided here (`@repo/database`, `@repo/shared`) will be imported across all 8 phases — get naming right now.

</code_context>

<specifics>
## Specific Ideas

- **Two-Redis topology:** Redis instance 1 (BullMQ transport) must use `noeviction` maxmemory policy + AOF persistence — SRS review jobs must never be evicted. Redis instance 2 (HTTP cache) can use `allkeys-lru`. Named in compose as `redis-bullmq` and `redis-cache` respectively.
- **Schema design reference:** CEFR level represented as a PostgreSQL enum (`B1`, `B2`, `C1`). Content tables (`ReadingPassage`, `ListeningContent`, `VocabularyWord`) all include `cefrLevel`, `cefrConfidence` (Float), and `topic` fields for CEFR classification pipeline output from Phase 5.
- **Seed readiness:** Phase 1 schema must include all columns that Phase 5's seed scripts will write — the seed scripts use `createMany()` in batches of 500 and cannot add columns without a migration.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 1-Foundation + Infrastructure*
*Context gathered: 2026-06-11*
