# Walking Skeleton — Phase 1: Foundation + Infrastructure

**Created:** 2026-06-11
**Status:** To be validated after Plan 06 human checkpoint

---

## What the Skeleton Proves

The thinnest possible end-to-end slice that validates the entire architecture:

1. `pnpm install` resolves all workspace package dependencies without errors
2. `docker compose up -d` starts all 4 backing services (Postgres 16, Redis BullMQ, Redis Cache, MinIO)
3. `pnpm db:migrate` runs the full Prisma schema against the running Postgres container with zero errors
4. NestJS 11 API starts on port 3001 and `GET /api/health` returns 200
5. Next.js 14 app starts on port 3000 and `GET /api/health` returns 200
6. GitHub Actions CI runs pnpm install + type-check + lint + db:migrate:deploy green

This proves: monorepo resolves → Docker services start → schema migrates → both apps serve → CI validates.

---

## Architectural Decisions (Locked for All 8 Phases)

These decisions are set in this skeleton. Changing them after Phase 1 ships requires coordinated updates across all apps and packages.

### Monorepo Structure

| Decision | Value | Rationale |
|----------|-------|-----------|
| Package manager | pnpm 9.x (pinned: pnpm@9.15.9) | Turborepo requires pnpm; pinned to prevent lockfile drift between local (pnpm 10) and CI (pnpm 9) |
| Build orchestrator | Turborepo 2.x | Topological builds, incremental caching, parallel task execution |
| turbo.json key | `"tasks"` (NOT `"pipeline"`) | Turborepo 2.x renamed this; "pipeline" silently does nothing |
| Internal package prefix | `@repo/` | Prevents npm registry collisions; imported as `@repo/database`, `@repo/shared`, etc. |
| Internal package pattern | Just-in-time (no build step) | TypeScript exported directly; apps' bundlers compile it — avoids dual CJS/ESM export complexity |

### Package Boundaries

| Package | Name | Purpose | Key Constraint |
|---------|------|---------|----------------|
| packages/database | @repo/database | Prisma schema + generated client | Pin to Prisma ^6.19.3; no postinstall script |
| packages/shared | @repo/shared | TypeScript types, Zod schemas, DTOs | Shared by both apps; no app-specific code |
| packages/tsconfig | @repo/tsconfig | TypeScript base configs | nestjs.json must have emitDecoratorMetadata: true + CommonJS module |
| packages/eslint-config | @repo/eslint-config | ESLint flat configs | ESLint 9.x flat config format (eslint.config.mjs) |

### Application Stack

| App | Framework | Port | Key Config |
|-----|-----------|------|-----------|
| apps/web | Next.js 14.x (App Router) | 3000 | next@^14.2.35, react@^18.3.1 (NOT 19), tailwindcss@^3.4.19 (NOT v4) |
| apps/api | NestJS 11.x | 3001 | @nestjs/core@^11.1.26, SWC compiler, ValidationPipe global |

### Database

| Decision | Value | Rationale |
|----------|-------|-----------|
| ORM | Prisma 6.x (pinned ^6.19.3) | npm latest is now 7.x with breaking changes; pin explicitly |
| Schema location | packages/database/prisma/schema.prisma | Single source of truth for all 8 phases |
| Client output | packages/database/generated/client/ | Generated; gitignored; must regenerate after schema change |
| Client singleton | globalThis pattern in packages/database/src/index.ts | Prevents duplicate instances under Next.js webpack hot-reload |
| Schema strategy | Full schema written in Phase 1 | All 25+ tables for all 8 phases defined upfront; no ALTER TABLE on live data |
| SRS algorithm | FSRS (NOT SM-2) | FSRS fields: stability, difficulty, elapsedDays, scheduledDays, reps, lapses, state, lastReview |
| Storage key pattern | audioStorageKey stores R2 key (NOT full URL) | CDN domain change requires only env var change, not DB migration |

### Docker Topology

| Decision | Value | Rationale |
|----------|-------|-----------|
| Dev topology | Docker = backing services only; apps run native | Instant hot-reload; no volume-mount latency |
| Prod topology | docker-compose.prod.yml with all services | Separate from dev compose |
| Redis instances | Two separate instances | BullMQ + cache must be isolated |
| redis-bullmq policy | noeviction + AOF persistence | SRS jobs must never evict; survive container restart |
| redis-cache policy | allkeys-lru (no persistence) | Cache miss is acceptable; eviction on memory pressure is correct |
| Port bindings | 127.0.0.1:XXXX:XXXX (dev) | Localhost-only; prevents external access on dev machine |

### Environment Variables

| Variable | Location | Purpose |
|----------|----------|---------|
| DATABASE_URL | root .env | Prisma connection string |
| REDIS_URL_BULLMQ | root .env | BullMQ Redis (port 6379) |
| REDIS_URL_CACHE | root .env | Cache Redis (port 6380) |
| MINIO_ENDPOINT | root .env | MinIO S3-compatible API |
| MINIO_ACCESS_KEY | root .env | MinIO credentials |
| MINIO_SECRET_KEY | root .env | MinIO credentials |
| MINIO_BUCKET | root .env | MinIO bucket name |
| NEXTAUTH_SECRET | apps/web/.env.local | NextAuth JWT signing key |
| NEXTAUTH_URL | apps/web/.env.local | Canonical app URL |
| GOOGLE_CLIENT_ID | apps/web/.env.local | OAuth client |
| GOOGLE_CLIENT_SECRET | apps/web/.env.local | OAuth secret |
| JWT_SECRET | apps/api/.env.local | NestJS JWT signing key |
| PORT | apps/api/.env.local | NestJS port (default 3001) |

Rule: Root .env holds shared vars (both apps need them). Per-app .env.local holds app-specific vars.
Both .env and .env.local are gitignored. Only .env.example is committed.

### CI/CD

| Decision | Value | Rationale |
|----------|-------|-----------|
| CI platform | GitHub Actions | D-07 locked decision |
| pnpm CI version | 9.x via pnpm/action-setup@v3 | Pinned to match CLAUDE.md spec |
| Node.js CI version | 20 | NestJS 11 minimum; local has 22 (compatible) |
| Migration command in CI | db:migrate:deploy | Non-interactive; applies committed migrations only |

---

## Directory Structure

```
/
├── apps/
│   ├── web/                     # Next.js 14 App Router (@repo/web)
│   │   ├── src/app/             # App Router pages and layouts
│   │   │   ├── layout.tsx       # Root layout
│   │   │   ├── page.tsx         # Homepage placeholder
│   │   │   ├── globals.css      # Tailwind directives
│   │   │   └── api/health/      # Health route handler
│   │   ├── next.config.js       # transpilePackages for @repo/*
│   │   ├── tailwind.config.ts   # Tailwind 3.x content paths
│   │   ├── postcss.config.js
│   │   ├── vitest.config.ts     # jsdom environment
│   │   └── package.json         # next@^14.2.35, react@^18.3.1
│   └── api/                     # NestJS 11 API (@repo/api)
│       ├── src/
│       │   ├── main.ts          # bootstrap() — port 3001, /api prefix, ValidationPipe
│       │   ├── app.module.ts    # Root module
│       │   └── health/          # HealthModule + HealthController
│       ├── nest-cli.json        # builder: swc, typeCheck: true
│       ├── vitest.config.ts     # node environment
│       └── package.json         # @nestjs/core@^11.1.26
├── packages/
│   ├── database/                # @repo/database
│   │   ├── prisma/
│   │   │   ├── schema.prisma    # Full schema — all 8 phases (25+ models)
│   │   │   └── migrations/      # Committed migration history
│   │   ├── generated/           # Generated client (gitignored)
│   │   ├── src/index.ts         # globalThis singleton + re-exports
│   │   ├── vitest.config.ts
│   │   └── package.json         # prisma@^6.19.3
│   ├── shared/                  # @repo/shared
│   │   ├── src/index.ts         # HealthResponseSchema + Phase 2+ types
│   │   ├── vitest.config.ts
│   │   └── package.json         # zod@^3.24.0
│   ├── eslint-config/           # @repo/eslint-config
│   │   ├── index.mjs            # Base flat config
│   │   ├── nextjs.mjs
│   │   └── nestjs.mjs
│   └── tsconfig/                # @repo/tsconfig
│       ├── base.json            # strict TypeScript + NodeNext
│       ├── nextjs.json          # jsx: preserve, Bundler resolution
│       └── nestjs.json          # CommonJS + emitDecoratorMetadata
├── .github/
│   └── workflows/ci.yml         # install + type-check + lint + migrate:deploy
├── docker-compose.yml           # Dev: 4 backing services
├── docker-compose.prod.yml      # Prod: all 6 services
├── turbo.json                   # "tasks" key (NOT "pipeline")
├── pnpm-workspace.yaml          # apps/* + packages/*
├── package.json                 # packageManager: pnpm@9.15.9
├── .env                         # Gitignored — copy from .env.example
└── .env.example                 # Committed — placeholder values only
```

---

## Smoke Test Sequence

Run these in order after all 6 plans execute:

```bash
# 1. Start backing services
docker compose up -d
docker compose ps     # All 4 → "Up (healthy)"

# 2. Install workspace dependencies
pnpm install          # exits 0

# 3. Generate Prisma client and migrate
pnpm db:generate      # exits 0
pnpm db:migrate       # enter "init" when prompted — exits 0

# 4. Verify database tables
docker exec el_postgres psql -U postgres -d english_learning -c "\dt" | head -30

# 5. Type-check all workspaces
pnpm turbo run type-check   # 0 errors across 4 packages

# 6. Lint all workspaces
pnpm turbo run lint         # 0 errors across 4 packages

# 7. Start apps and hit health endpoints
pnpm --filter @repo/api run dev &
pnpm --filter @repo/web run dev &
sleep 10
curl -sf http://localhost:3001/api/health   # → {"status":"ok","timestamp":"..."}
curl -sf http://localhost:3000/api/health   # → {"status":"ok","timestamp":"..."}
```

---

## What the Skeleton Does NOT Include

The skeleton is intentionally minimal. These are deferred to later phases:

- Auth (Phase 2): NextAuth, JWT guards, OAuth, session management
- UI components (Phase 3+): shadcn/ui, component library, page layouts
- Data fetching (Phase 3+): React Query, API calls from Next.js to NestJS
- Business logic (Phase 3+): SRS, vocabulary, grammar, reading, listening
- Gamification (Phase 7): XP, levels, achievements
- Content pipeline (Phase 5): crawlers, CEFR classifier, seed scripts
- Production deployment (Phase 1 skeleton only): actual VPS deploy configuration

---

*Walking Skeleton established by Phase 1 plans 01-01 through 01-06*
*All architectural decisions locked and documented above*
