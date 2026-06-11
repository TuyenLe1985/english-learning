# Phase 1: Foundation + Infrastructure - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-11
**Phase:** 01-Foundation + Infrastructure
**Areas discussed:** Monorepo package boundaries, Docker dev topology, Prisma schema scope, Environment variable strategy

---

## Monorepo Package Boundaries

| Option | Description | Selected |
|--------|-------------|----------|
| packages/database | Prisma schema + client as dedicated shared package; both apps import @repo/database | ✓ |
| Inside apps/api only | Prisma lives in NestJS only; Next.js must call API for all data | |

**User's choice:** packages/database (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Types + Zod schemas + API DTOs | packages/shared holds TS interfaces, Zod schemas, and DTOs for both apps | ✓ |
| Types only (minimal) | packages/shared holds only TS types; each app defines its own validation | |

**User's choice:** Types + Zod schemas + API DTOs (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| packages/eslint-config + packages/tsconfig | Shared ESLint and TS base configs extended by each app | ✓ |
| Duplicate configs per app | Each app has its own eslint and tsconfig | |

**User's choice:** Yes — packages/eslint-config + packages/tsconfig (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Just the above | packages/database, packages/shared, packages/eslint-config, packages/tsconfig | ✓ |
| Add packages/ui | Shared component library alongside the others | |
| Add packages/utils | Shared utility functions | |

**User's choice:** Just the above (Recommended)

**Notes:** Lean package structure. No packages/ui or packages/utils — extract later if real duplication appears.

---

## Docker Dev Topology

| Option | Description | Selected |
|--------|-------------|----------|
| Backing services in Docker only | Docker runs Postgres, Redis ×2, MinIO; apps run natively with turbo dev | ✓ |
| All services in Docker | Everything containerized including Next.js and NestJS | |

**User's choice:** Backing services in Docker only (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Separate Dockerfile per app + docker-compose.prod.yml | apps/web/Dockerfile + apps/api/Dockerfile; clean CI separation | ✓ |
| Single root Dockerfile | One Dockerfile builds both apps using build args | |

**User's choice:** Separate Dockerfile per app + docker-compose.prod.yml (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — basic CI pipeline in Phase 1 | .github/workflows/ci.yml with install, type-check, lint, db:migrate | ✓ |
| No — defer CI to later | Skip CI; add when there are real tests to run | |

**User's choice:** Yes — basic CI pipeline in Phase 1 (Recommended)

**Notes:** Portfolio project benefits from a green CI badge immediately. CI runs against a test Postgres container.

---

## Prisma Schema Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Full schema for all 8 phases now | All tables defined upfront; future phases add logic only | ✓ |
| Foundational tables only | Only Phase 1 bootstrap tables; each phase adds its own via migration | |

**User's choice:** Full schema for all 8 phases now (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| FSRS fields | stability, difficulty, elapsedDays, scheduledDays, reps, lapses, state, lastReview | ✓ |
| Algorithm-agnostic fields | Generic: interval, repetitions, easeFactor, nextReviewAt | |
| Defer — Phase 3 decides | Leave SRS card table out of Phase 1 schema | |

**User's choice:** FSRS fields (Recommended)

**Notes:** Locks FSRS now as STATE.md intended. Avoids schema migration mid-project. SM-2 not accommodated.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Storage keys / relative paths | Store R2 object key; NestJS constructs CDN URL at runtime | ✓ |
| Full URLs | Store complete public URL | |

**User's choice:** Storage keys / relative paths (Recommended)

**Notes:** Swapping CDN domains requires only an env var change, no DB migration on millions of rows.

---

## Environment Variable Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| .env at root + per-app .env.local | Root .env for shared vars; per-app .env.local for app-specific | ✓ |
| Separate .env per app only | No root .env; each app declares everything | |
| Single .env at root for everything | One file for all vars across all apps | |

**User's choice:** .env at root + per-app .env.local (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| env_file: .env directive in compose.yml | Docker Compose reads root .env automatically | ✓ |
| Hard-code dev values in compose.yml | environment: blocks with literal dev values in the file | |

**User's choice:** env_file: .env directive in compose.yml (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — .env.example with all keys, no real values | Committed template; actual .env gitignored | ✓ |
| No — document vars in CLAUDE.md only | No committed template | |

**User's choice:** Yes — .env.example with all keys, no real values (Recommended)

---

## Claude's Discretion

- Port assignments (conventional defaults: Next.js 3000, NestJS 3001, Postgres 5432, Redis-BullMQ 6379, Redis-cache 6380, MinIO 9000/9001)
- Specific Turborepo turbo.json pipeline config (standard dev/build/test/lint tasks)
- Base Docker images (node:20-alpine for apps, postgres:16-alpine, redis:7-alpine)
- Prisma model naming conventions (singular PascalCase per Prisma convention)

## Deferred Ideas

None — discussion stayed within phase scope.
