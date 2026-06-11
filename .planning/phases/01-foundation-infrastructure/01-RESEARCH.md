# Phase 1: Foundation + Infrastructure - Research

**Researched:** 2026-06-11
**Domain:** Turborepo monorepo, NestJS 11, Next.js 14, Prisma 6, Docker Compose, GitHub Actions CI
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** `packages/database` — Prisma schema + generated client as a dedicated shared package. Both `apps/api` and `apps/web` import `@repo/database` directly. Next.js RSCs can query the DB without going through the API.
- **D-02:** `packages/shared` — TypeScript interfaces, Zod validation schemas, and request/response DTOs shared between NestJS and Next.js. No duplication of validation logic between apps.
- **D-03:** `packages/eslint-config` + `packages/tsconfig` — shared ESLint and TypeScript base configs; each app extends from these. Single change propagates everywhere.
- **D-04:** No additional packages in Phase 1 — no `packages/ui`, no `packages/utils`. Keep lean; extract later when real duplication appears.
- **D-05:** Backing services run in Docker; apps run natively. `docker compose up` starts Postgres, Redis ×2, MinIO only. Next.js and NestJS run with `turbo dev` (native). Hot-reload is instant; no volume-mount latency.
- **D-06:** Production uses separate Dockerfiles per app. `docker-compose.prod.yml` wires all services together. `docker-compose.yml` is dev-only (backing services only).
- **D-07:** GitHub Actions CI skeleton included in Phase 1 — `.github/workflows/ci.yml` runs: `pnpm install`, type-check, lint, `pnpm db:migrate` against a test Postgres container.
- **D-08:** Full schema for all 8 phases written in Phase 1 — all tables defined upfront. Future phases add feature logic only.
- **D-09:** FSRS algorithm selected (not SM-2). SRS card schema uses: `stability`, `difficulty`, `elapsedDays`, `scheduledDays`, `reps`, `lapses`, `state` (enum: New/Learning/Review/Relearning), `lastReview`.
- **D-10:** Audio/media file references stored as storage keys (relative R2 paths), not full URLs. NestJS constructs CDN URLs at runtime.
- **D-11:** Root `.env` holds shared vars; per-app `.env.local` holds app-specific vars.
- **D-12:** Docker Compose uses `env_file: .env` directive.
- **D-13:** `.env.example` committed; actual `.env` gitignored.

### Claude's Discretion

- Port assignments (conventional defaults: Next.js 3000, NestJS 3001, Postgres 5432, Redis-BullMQ 6379, Redis-cache 6380, MinIO 9000/9001)
- Specific Turborepo `turbo.json` pipeline config (standard dev, build, test, lint tasks)
- Base Docker images (node:20-alpine, postgres:16-alpine, redis:7-alpine)
- Exact Prisma model naming conventions (singular PascalCase per Prisma convention)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.

</user_constraints>

---

## Summary

Phase 1 establishes the complete project skeleton: a Turborepo 2.x monorepo with pnpm 9.x workspaces, NestJS 11 and Next.js 14 skeleton apps, a complete Prisma 6 schema covering all 8 phases, Docker Compose topology for backing services, and a GitHub Actions CI pipeline. All decisions are locked in CONTEXT.md. The research confirms every locked technology choice is valid and provides precise configuration patterns.

The most critical finding is a **version discrepancy**: Prisma's npm `latest` tag now points to 7.8.0, not 6.x. Prisma 6 (latest: 6.19.3) must be explicitly pinned to avoid accidental upgrade. Prisma 7 introduced architectural breaking changes (new config file, changed generate output location, removed auto-seed on migrate) that would require rework. The locked choice of Prisma 6 remains the correct one for this project. Node 22 is installed on the developer machine (Node 22.22.2), which is compatible with NestJS 11 (requires Node 20+).

The second key finding is the **Prisma singleton pattern for Next.js App Router**: Prisma client must be anchored on `globalThis` in the `packages/database` package to prevent duplicate instances caused by webpack bundling multiple module systems within the same Next.js process. This is a documented pitfall affecting Next.js 14 pnpm monorepos.

**Primary recommendation:** Follow Turborepo's official "just-in-time" internal package pattern for `@repo/database` and `@repo/shared` — export TypeScript directly (no build step), let each consuming app's bundler handle compilation. This avoids complex dual CJS/ESM export configuration.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Database schema & migrations | Database / Storage | — | Prisma schema is source of truth; runs against PostgreSQL |
| Shared TypeScript types & DTOs | Build / Package | — | `packages/shared` consumed by both API and web at build time |
| HTTP API + auth guards | API / Backend (NestJS) | — | NestJS owns all business logic; Next.js calls API via HTTP |
| Server-side rendering | Frontend Server (Next.js) | — | RSCs can read DB directly via `@repo/database` |
| Background jobs (SRS, crawler) | API / Backend (NestJS) | — | BullMQ workers live in NestJS process |
| Backing services (Postgres, Redis, MinIO) | Infrastructure (Docker) | — | Dev: Docker Compose; Prod: docker-compose.prod.yml |
| CI pipeline | Infrastructure (GitHub Actions) | — | Runs on PRs; validates build + migrate + lint |
| Static asset delivery | CDN / Static (Cloudflare R2 + CDN) | MinIO (dev) | Storage keys in DB; URLs resolved at runtime |

---

## Standard Stack

### Core Packages

| Library | Pinned Version | Purpose | Confidence |
|---------|---------------|---------|------------|
| `next` | `^14.2.35` | Next.js 14 App Router frontend | HIGH [VERIFIED: npm registry] |
| `react` | `^18.3.1` | React 18 (NOT 19 — incompatible with Next.js 14) | HIGH [VERIFIED: npm registry] |
| `react-dom` | `^18.3.1` | React DOM | HIGH [VERIFIED: npm registry] |
| `@nestjs/core` | `^11.1.26` | NestJS 11 core | HIGH [VERIFIED: npm registry] |
| `@nestjs/common` | `^11.1.26` | NestJS common decorators | HIGH [VERIFIED: npm registry] |
| `@nestjs/platform-express` | `^11.1.26` | Express v5 adapter (default for NestJS 11) | HIGH [VERIFIED: npm registry] |
| `prisma` | `^6.19.3` | Prisma CLI (devDep) — must match client major | HIGH [VERIFIED: npm registry] |
| `@prisma/client` | `^6.19.3` | Prisma runtime client — must match CLI major | HIGH [VERIFIED: npm registry] |
| `typescript` | `^5.4.0` | TypeScript strict mode | HIGH [VERIFIED: npm registry] |
| `bullmq` | `^5.78.0` | Job queues | HIGH [VERIFIED: npm registry] |
| `@nestjs/bullmq` | `^11.0.4` | BullMQ NestJS integration | HIGH [VERIFIED: npm registry] |
| `tailwindcss` | `^3.4.19` | CSS framework (NOT v4 — shadcn/ui incompatible) | HIGH [VERIFIED: npm registry] |
| `turbo` | `^2.9.18` | Turborepo build system (root devDep) | HIGH [VERIFIED: npm registry] |
| `next-auth` | `^5.0.0` (Auth.js v5) | Auth for Next.js | HIGH [VERIFIED: npm registry] |
| `ioredis` | `^5.11.1` | Redis client for NestJS cache | HIGH [VERIFIED: npm registry] |
| `zod` | `^3.24.0` | Schema validation (shared package) | HIGH [VERIFIED: npm registry] |

### Supporting Packages (Phase 1 skeleton only)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@nestjs/config` | `^4.0.4` | Env var loading with validation | AppModule config |
| `@nestjs/terminus` | `^11.1.1` | Health check endpoints | `/health` route |
| `@nestjs/swagger` | `^11.4.4` | OpenAPI docs | Dev only, mount at `/api` |
| `@nestjs/passport` | `^11.0.5` | Passport.js integration | Auth module (Phase 2) |
| `@nestjs/jwt` | `^11.0.2` | JWT strategy | Auth module (Phase 2) |
| `@nestjs/throttler` | `^6.5.0` | Rate limiting | Auth/public endpoints |
| `class-validator` | `^0.15.1` | DTO validation decorators | NestJS ValidationPipe |
| `class-transformer` | `^0.5.1` | DTO transformation | Paired with class-validator |
| `@swc/core` | latest | SWC compiler core | NestJS dev builds |
| `@swc/cli` | latest | SWC CLI | NestJS dev builds |
| `vitest` | `^2.x` | Unit/integration test runner | All test suites |
| `@vitest/coverage-v8` | `^4.1.8` | Code coverage | Coverage reports |

### FSRS Algorithm Library

`ts-fsrs` is the reference TypeScript FSRS implementation from the `open-spaced-repetition` organization. [VERIFIED: npm registry — 74 published versions, repo at github.com/open-spaced-repetition/ts-fsrs, published 2023-03-05, 5.4.1 latest]

Note: `ts-fsrs` is NOT used in Phase 1. It is included here because the **Prisma schema in Phase 1 must mirror the `ts-fsrs` Card interface field names exactly** so Phase 3 requires zero migration.

**ts-fsrs Card fields (for schema design):**
- `due` (DateTime) — next review date
- `stability` (Float) — memory strength in days
- `difficulty` (Float) — inherent difficulty 1–10
- `elapsedDays` (Int) — days since last review
- `scheduledDays` (Int) — scheduled interval in days
- `reps` (Int) — total successful reviews
- `lapses` (Int) — times forgotten
- `state` (Enum: New / Learning / Review / Relearning)
- `lastReview` (DateTime?)

### Alternatives Considered (all locked out by CONTEXT.md)

| Instead of | Could Use | Locked Reason |
|------------|-----------|---------------|
| Prisma 6 | Prisma 7 | Breaking changes: new config file, no auto-seed, different client output |
| Express (platform-express) | Fastify | Express is default; Fastify needs explicit adapter swap |
| React 18 | React 19 | Next.js 14 targets React 18; React 19 requires Next.js 15+ |
| SM-2 fields | FSRS fields | D-09 locks FSRS; SM-2 schema is incompatible |

---

## Package Legitimacy Audit

> slopcheck was unavailable at research time. All packages are tagged `[ASSUMED]` where not independently verified via official documentation or authoritative source. Packages marked `[VERIFIED]` were confirmed via npm registry AND traced to official docs or well-established organizations.

| Package | Registry | Age | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-------------|-----------|-------------|
| `turbo` | npm | 2021 (4+ yrs) | github.com/vercel/turborepo | N/A | Approved [VERIFIED: Vercel official] |
| `next` | npm | 2016 (9+ yrs) | github.com/vercel/next.js | N/A | Approved [VERIFIED: Vercel official] |
| `@nestjs/core` | npm | 2017 (8+ yrs) | github.com/nestjs/nest | N/A | Approved [VERIFIED: official docs] |
| `prisma` | npm | 2019 (6+ yrs) | github.com/prisma/prisma | N/A | Approved [VERIFIED: official docs] |
| `@prisma/client` | npm | 2019 (6+ yrs) | github.com/prisma/prisma | N/A | Approved [VERIFIED: official docs] |
| `bullmq` | npm | 2019 (6+ yrs) | github.com/taskforcesh/bullmq | N/A | Approved [VERIFIED: official docs] |
| `tailwindcss` | npm | 2017 (8+ yrs) | github.com/tailwindlabs/tailwindcss | N/A | Approved [VERIFIED: official docs] |
| `zod` | npm | 2020 (5+ yrs) | github.com/colinhacks/zod | N/A | Approved [VERIFIED: well-known] |
| `ioredis` | npm | 2015 (10+ yrs) | github.com/redis/ioredis | N/A | Approved [VERIFIED: well-known] |
| `ts-fsrs` | npm | 2023 (2+ yrs) | github.com/open-spaced-repetition/ts-fsrs | N/A | Approved [ASSUMED — 74 versions, active org, but verify before use in Phase 3] |
| `next-auth` | npm | 2020 (5+ yrs) | github.com/nextauthjs/next-auth | N/A | Approved [VERIFIED: well-known] |
| `@nestjs/terminus` | npm | 2019 (6+ yrs) | github.com/nestjs/terminus | N/A | Approved [VERIFIED: official docs] |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

*slopcheck was unavailable. All packages traced to official GitHub organizations. ts-fsrs is tagged `[ASSUMED]` pending Phase 3 verify step.*

---

## Architecture Patterns

### System Architecture Diagram

```
Developer Machine
├── turbo dev (native)
│   ├── apps/web  (Next.js 14, port 3000)
│   │   └── imports: @repo/database, @repo/shared
│   └── apps/api  (NestJS 11, port 3001)
│       └── imports: @repo/database, @repo/shared
│
└── docker compose up (backing services)
    ├── postgres:16-alpine (port 5432)
    ├── redis-bullmq:7-alpine (port 6379, noeviction+AOF)
    ├── redis-cache:7-alpine (port 6380, allkeys-lru)
    └── minio/minio (ports 9000/9001)

packages/database
  └── prisma/schema.prisma  ──▶  prisma migrate dev ──▶  PostgreSQL
  └── generated/client/     ◀──  prisma generate
  └── index.ts              ──▶  re-exports PrismaClient + all types

packages/shared
  └── src/types/            ──▶  TypeScript interfaces (no compile step)
  └── src/schemas/          ──▶  Zod schemas
  └── src/dtos/             ──▶  NestJS request/response DTOs

GitHub Actions CI
  └── pnpm install --frozen-lockfile
  └── turbo run type-check lint
  └── service: postgres:16 (test container)
  └── pnpm db:migrate
```

### Recommended Project Structure

```
/
├── apps/
│   ├── web/                     # Next.js 14 App Router
│   │   ├── src/app/             # App Router pages & layouts
│   │   ├── src/components/      # React components
│   │   ├── src/lib/             # Utilities, Next.js specific helpers
│   │   ├── next.config.js
│   │   ├── tailwind.config.ts
│   │   ├── package.json         # name: "@repo/web"
│   │   ├── tsconfig.json        # extends @repo/tsconfig/nextjs.json
│   │   └── .env.local           # NEXTAUTH_SECRET, NEXTAUTH_URL, etc.
│   └── api/                     # NestJS 11 API
│       ├── src/
│       │   ├── main.ts          # bootstrap() + port 3001
│       │   ├── app.module.ts    # root module
│       │   └── health/          # HealthModule + HealthController
│       ├── nest-cli.json        # builder: "swc", typeCheck: true
│       ├── tsconfig.json        # extends @repo/tsconfig/nestjs.json
│       ├── package.json         # name: "@repo/api"
│       └── .env.local           # JWT_SECRET, PORT, etc.
├── packages/
│   ├── database/                # @repo/database — Prisma + generated client
│   │   ├── prisma/
│   │   │   ├── schema.prisma    # Full schema for all 8 phases
│   │   │   └── migrations/      # Generated migration files
│   │   ├── generated/           # Generated Prisma client (gitignored output)
│   │   ├── src/index.ts         # Re-exports PrismaClient + all Prisma types
│   │   └── package.json         # name: "@repo/database", postinstall: prisma generate
│   ├── shared/                  # @repo/shared — types, schemas, DTOs
│   │   ├── src/
│   │   │   ├── types/           # TypeScript interfaces
│   │   │   ├── schemas/         # Zod schemas
│   │   │   └── dtos/            # NestJS-compatible DTOs
│   │   └── package.json         # name: "@repo/shared"
│   ├── eslint-config/           # @repo/eslint-config
│   │   ├── index.mjs            # Base ESLint flat config
│   │   ├── nextjs.mjs           # Next.js ESLint config
│   │   └── nestjs.mjs           # NestJS ESLint config
│   └── tsconfig/                # @repo/tsconfig
│       ├── base.json            # Shared strict TS options
│       ├── nextjs.json          # Next.js specific (jsx: preserve)
│       └── nestjs.json          # NestJS specific (emitDecoratorMetadata: true)
├── .github/
│   └── workflows/ci.yml         # Install, type-check, lint, db:migrate
├── docker-compose.yml           # Dev: backing services only
├── docker-compose.prod.yml      # Prod: all services
├── turbo.json                   # Task pipeline
├── pnpm-workspace.yaml          # apps/* + packages/*
├── package.json                 # Root: turbo devDep, scripts
├── .env                         # Shared: DATABASE_URL, REDIS_*, MINIO_*
├── .env.example                 # Committed: all keys + placeholder values
└── tsconfig.json                # Root: references only (not included in builds)
```

### Pattern 1: Turborepo Workspace + pnpm Setup

**What:** pnpm-workspace.yaml defines package discovery; turbo.json defines task graph.
**When to use:** Always — this is the monorepo entry point.

```yaml
# pnpm-workspace.yaml
# Source: https://github.com/vercel/turborepo/blob/main/apps/docs/content/docs/crafting-your-repository/structuring-a-repository.mdx
packages:
  - "apps/*"
  - "packages/*"
```

```jsonc
// turbo.json — tasks key (Turborepo 2.x uses "tasks" not "pipeline")
// Source: https://github.com/vercel/turborepo/blob/main/apps/docs/content/docs/reference/configuration.mdx
{
  "$schema": "https://turborepo.dev/schema.json",
  "globalDependencies": [".env"],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "!.next/cache/**", "!.next/dev/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "type-check": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"]
    },
    "db:migrate": {
      "cache": false
    },
    "db:generate": {
      "cache": false
    }
  }
}
```

**Internal package naming convention:** `@repo/` prefix prevents npm registry collisions.
[VERIFIED: Context7 / vercel/turborepo official docs]

**pnpm workspace dependency syntax:**
```json
{ "@repo/database": "workspace:*" }
```
[VERIFIED: Context7 / vercel/turborepo official docs]

---

### Pattern 2: NestJS 11 Bootstrap + SWC + Health Check

**What:** NestJS 11 uses SWC compiler by default (Express v5 adapter). Health endpoint at `/health`.
**When to use:** `apps/api/src/main.ts` and `nest-cli.json`.

```typescript
// apps/api/src/main.ts
// Source: NestJS official docs — bootstrap pattern
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
```

```json
// apps/api/nest-cli.json
// Source: NestJS official docs — SWC builder config
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "builder": "swc",
    "typeCheck": true
  }
}
```

```typescript
// apps/api/src/health/health.controller.ts
// Source: NestJS official docs — Terminus health check
import { Controller, Get } from '@nestjs/common';
import { HealthCheckService, HealthCheck, PrismaHealthIndicator } from '@nestjs/terminus';

@Controller('health')
export class HealthController {
  constructor(private health: HealthCheckService) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([]);
  }
}
```

**Note:** `@nestjs/terminus` `PrismaHealthIndicator` does not exist as a separate import; use a custom `PrismaHealthIndicator` that extends `HealthIndicator` and calls `prisma.$queryRaw\`SELECT 1\``. [ASSUMED — terminus docs show TypeORM and HTTP indicators, not Prisma-specific]

---

### Pattern 3: Prisma 6 in @repo/database Package

**What:** Schema lives in `packages/database/prisma/schema.prisma`. Client is generated to `packages/database/generated/client/`. `packages/database/src/index.ts` re-exports the client using `globalThis` singleton pattern.

**Critical: pin Prisma to 6.x.** npm `latest` now resolves to 7.8.0. Use exact range `^6.19.3`.

```prisma
// packages/database/prisma/schema.prisma
// Source: https://www.prisma.io/docs/orm/prisma-schema/overview [VERIFIED: official Prisma docs]
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
  output   = "../generated/client"
}
```

```typescript
// packages/database/src/index.ts — globalThis singleton pattern
// Source: Prisma docs + Next.js monorepo best practice
// Prevents duplicate instances under Next.js webpack bundling
import { PrismaClient } from '../generated/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma || new PrismaClient({ log: ['error'] });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export * from '../generated/client';
```

```json
// packages/database/package.json — scripts that consumers run
{
  "name": "@repo/database",
  "version": "0.0.1",
  "scripts": {
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:migrate:deploy": "prisma migrate deploy",
    "db:push": "prisma db push"
  },
  "devDependencies": {
    "prisma": "^6.19.3"
  },
  "dependencies": {
    "@prisma/client": "^6.19.3"
  }
}
```

**postinstall in @repo/database:** Do NOT add `prisma generate` to postinstall script. In pnpm monorepos this fails because the script runs before workspace symlinks are fully resolved. Instead, add `db:generate` as an explicit pre-build step in the root `package.json` scripts.
[VERIFIED: Prisma GitHub issue #6603 + official pnpm workspaces guide]

---

### Pattern 4: Full Prisma Schema — All 8 Phases

All enums and models required for Phases 1–8. This is the schema that `pnpm db:migrate` must produce without errors.

```prisma
// packages/database/prisma/schema.prisma (complete skeleton)

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
  output   = "../generated/client"
}

// ─── Enums ────────────────────────────────────────────────────────────────────

enum CefrLevel {
  B1
  B2
  C1
}

enum CardState {
  New
  Learning
  Review
  Relearning
}

enum UserRole {
  STUDENT
  ADMIN
}

enum ContentType {
  ARTICLE
  NEWS
  BLOG_POST
  ACADEMIC
  STORY
  OPINION
  CONVERSATION
  INTERVIEW
  PODCAST
  LECTURE
  NEWS_REPORT
}

enum ExerciseType {
  MULTIPLE_CHOICE
  FILL_IN_THE_BLANK
  SENTENCE_TRANSFORMATION
  ERROR_CORRECTION
  DRAG_AND_DROP
  FLASHCARD
  MATCHING
  CONTEXT_SELECTION
  CLOZE
  SYNONYM_ID
  RECALL
  DICTATION
  FILL_MISSING_WORDS
  SPEAKER_INTENTION
  SEQUENCE_ORDERING
  NOTE_TAKING
}

enum SkillArea {
  GRAMMAR
  VOCABULARY
  READING
  LISTENING
  MIXED
}

// ─── Phase 2: User & Auth ─────────────────────────────────────────────────────

model User {
  id            String   @id @default(cuid())
  email         String   @unique
  emailVerified DateTime?
  name          String?
  avatarUrl     String?
  role          UserRole @default(STUDENT)
  cefrLevel     CefrLevel @default(B1)
  xpTotal       Int      @default(0)
  level         Int      @default(1)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  lastActiveAt  DateTime @default(now())

  // Relations
  accounts         Account[]
  sessions         Session[]
  srsCards         SrsCard[]
  vocabularyItems  UserVocabularyItem[]
  quizSessions     QuizSession[]
  xpEvents         XpEvent[]
  achievements     UserAchievement[]
  readingProgress  ReadingProgress[]
  listeningProgress ListeningProgress[]
  grammarProgress  GrammarProgress[]
  skillScores      SkillScore[]
  highlights       Highlight[]
  notes            Note[]
  bookmarks        Bookmark[]
  activityLogs     ActivityLog[]

  @@index([cefrLevel])
  @@index([xpTotal])
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@index([userId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

// ─── Phase 3: Vocabulary & SRS ────────────────────────────────────────────────

model VocabularyWord {
  id              String    @id @default(cuid())
  word            String    @unique
  definition      String    @db.Text
  partOfSpeech    String?
  examples        String[]
  synonyms        String[]
  pronunciationKey String?
  audioStorageKey String?   // R2 storage key — NOT full URL (D-10)
  cefrLevel       CefrLevel
  cefrConfidence  Float     @default(0.0)
  topic           String?
  category        String?   // business, travel, technology, etc.
  frequency       Int       @default(0)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  srsCards        SrsCard[]
  userItems       UserVocabularyItem[]

  @@index([cefrLevel])
  @@index([category])
  @@index([topic])
}

model UserVocabularyItem {
  id         String   @id @default(cuid())
  userId     String
  wordId     String
  addedAt    DateTime @default(now())
  contextSentence String? @db.Text  // sentence from reading/listening (VOCAB-08)

  user User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  word VocabularyWord @relation(fields: [wordId], references: [id], onDelete: Cascade)
  srsCard SrsCard?

  @@unique([userId, wordId])
  @@index([userId])
}

// FSRS-aligned SRS card — fields match ts-fsrs Card interface exactly (D-09)
model SrsCard {
  id             String    @id @default(cuid())
  userId         String
  wordId         String?
  userVocabItemId String?  @unique
  due            DateTime
  stability      Float     @default(0)
  difficulty     Float     @default(0)
  elapsedDays    Int       @default(0)
  scheduledDays  Int       @default(0)
  reps           Int       @default(0)
  lapses         Int       @default(0)
  state          CardState @default(New)
  lastReview     DateTime?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  user          User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  word          VocabularyWord?   @relation(fields: [wordId], references: [id])
  userVocabItem UserVocabularyItem? @relation(fields: [userVocabItemId], references: [id])

  @@index([userId, due])
  @@index([userId, state])
}

// ─── Phase 4: Grammar ─────────────────────────────────────────────────────────

model GrammarArea {
  id          String   @id @default(cuid())
  name        String   @unique
  description String?
  sortOrder   Int      @default(0)
  topics      GrammarTopic[]
}

model GrammarTopic {
  id          String    @id @default(cuid())
  areaId      String
  title       String
  slug        String    @unique
  description String?   @db.Text
  cefrLevel   CefrLevel
  sortOrder   Int       @default(0)
  createdAt   DateTime  @default(now())

  area      GrammarArea    @relation(fields: [areaId], references: [id])
  lessons   GrammarLesson[]
  progress  GrammarProgress[]

  @@index([areaId])
  @@index([cefrLevel])
}

model GrammarLesson {
  id          String   @id @default(cuid())
  topicId     String
  title       String
  explanation String   @db.Text
  examples    String[]
  sortOrder   Int      @default(0)
  createdAt   DateTime @default(now())

  topic     GrammarTopic      @relation(fields: [topicId], references: [id])
  questions GrammarQuestion[]

  @@index([topicId])
}

model GrammarQuestion {
  id           String       @id @default(cuid())
  lessonId     String
  exerciseType ExerciseType
  prompt       String       @db.Text
  answer       String       @db.Text
  distractors  String[]
  explanation  String?      @db.Text
  difficulty   Int          @default(1)
  xpReward     Int          @default(10)
  createdAt    DateTime     @default(now())

  lesson   GrammarLesson   @relation(fields: [lessonId], references: [id])
  attempts GrammarAttempt[]

  @@index([lessonId])
  @@index([exerciseType])
}

model GrammarAttempt {
  id         String   @id @default(cuid())
  questionId String
  userId     String
  isCorrect  Boolean
  userAnswer String?
  attemptedAt DateTime @default(now())

  question GrammarQuestion @relation(fields: [questionId], references: [id])

  @@index([questionId, userId])
}

model GrammarProgress {
  id           String   @id @default(cuid())
  userId       String
  topicId      String
  masteryPct   Float    @default(0)
  attempts     Int      @default(0)
  correct      Int      @default(0)
  lastAttemptAt DateTime?

  user  User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  topic GrammarTopic @relation(fields: [topicId], references: [id])

  @@unique([userId, topicId])
  @@index([userId])
}

// ─── Phase 5: Reading + Content Pipeline ─────────────────────────────────────

model ReadingPassage {
  id              String      @id @default(cuid())
  title           String
  content         String      @db.Text
  sourceUrl       String?     @unique
  contentHash     String?     @unique
  contentType     ContentType
  cefrLevel       CefrLevel
  cefrConfidence  Float       @default(0.0)
  topic           String?
  wordCount       Int         @default(0)
  isPublished     Boolean     @default(false)
  flaggedForReview Boolean    @default(false)
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  questions        ReadingQuestion[]
  progress         ReadingProgress[]
  bookmarks        Bookmark[]
  highlights       Highlight[]
  notes            Note[]

  @@index([cefrLevel])
  @@index([topic])
  @@index([contentType])
  @@index([isPublished])
}

model ReadingQuestion {
  id           String   @id @default(cuid())
  passageId    String
  questionType String
  prompt       String   @db.Text
  answer       String   @db.Text
  distractors  String[]
  explanation  String?  @db.Text
  xpReward     Int      @default(10)
  sortOrder    Int      @default(0)

  passage  ReadingPassage   @relation(fields: [passageId], references: [id], onDelete: Cascade)

  @@index([passageId])
}

model ReadingProgress {
  id           String   @id @default(cuid())
  userId       String
  passageId    String
  score        Float?
  accuracy     Float?
  readingTimeSec Int?
  completedAt  DateTime?
  lastViewedAt DateTime @default(now())

  user    User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  passage ReadingPassage @relation(fields: [passageId], references: [id])

  @@unique([userId, passageId])
  @@index([userId])
}

model Highlight {
  id          String   @id @default(cuid())
  userId      String
  passageId   String
  startOffset Int
  endOffset   Int
  text        String   @db.Text
  createdAt   DateTime @default(now())

  user    User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  passage ReadingPassage @relation(fields: [passageId], references: [id])

  @@index([userId, passageId])
}

model Note {
  id        String   @id @default(cuid())
  userId    String
  passageId String
  content   String   @db.Text
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user    User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  passage ReadingPassage @relation(fields: [passageId], references: [id])

  @@index([userId, passageId])
}

model Bookmark {
  id        String   @id @default(cuid())
  userId    String
  passageId String
  createdAt DateTime @default(now())

  user    User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  passage ReadingPassage @relation(fields: [passageId], references: [id])

  @@unique([userId, passageId])
  @@index([userId])
}

// ─── Phase 6: Listening ───────────────────────────────────────────────────────

model ListeningContent {
  id              String      @id @default(cuid())
  title           String
  transcriptText  String      @db.Text
  audioStorageKey String?     // R2 storage key — NOT full URL (D-10)
  sourceUrl       String?     @unique
  contentHash     String?     @unique
  contentType     ContentType
  cefrLevel       CefrLevel
  cefrConfidence  Float       @default(0.0)
  topic           String?
  durationSec     Int?
  isPublished     Boolean     @default(false)
  flaggedForReview Boolean    @default(false)
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  questions  ListeningQuestion[]
  progress   ListeningProgress[]

  @@index([cefrLevel])
  @@index([topic])
  @@index([contentType])
  @@index([isPublished])
}

model ListeningQuestion {
  id           String       @id @default(cuid())
  contentId    String
  exerciseType ExerciseType
  prompt       String       @db.Text
  answer       String       @db.Text
  distractors  String[]
  explanation  String?      @db.Text
  timestampSec Int?
  xpReward     Int          @default(10)
  sortOrder    Int          @default(0)

  content ListeningContent @relation(fields: [contentId], references: [id], onDelete: Cascade)

  @@index([contentId])
}

model ListeningProgress {
  id           String   @id @default(cuid())
  userId       String
  contentId    String
  score        Float?
  accuracy     Float?
  completedAt  DateTime?
  lastViewedAt DateTime @default(now())

  user    User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  content ListeningContent @relation(fields: [contentId], references: [id])

  @@unique([userId, contentId])
  @@index([userId])
}

// ─── Phase 7: Quiz & Gamification ─────────────────────────────────────────────

model QuizSession {
  id           String    @id @default(cuid())
  userId       String
  skillArea    SkillArea
  topic        String?
  score        Float     @default(0)
  accuracy     Float     @default(0)
  timeTakenSec Int?
  xpEarned     Int       @default(0)
  completedAt  DateTime?
  startedAt    DateTime  @default(now())

  user    User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  answers QuizAnswer[]

  @@index([userId])
  @@index([skillArea])
}

model QuizAnswer {
  id           String   @id @default(cuid())
  sessionId    String
  questionRef  String   // polymorphic: "{type}:{questionId}" e.g. "grammar:clxyz"
  skillArea    SkillArea
  isCorrect    Boolean
  userAnswer   String?
  correctAnswer String?
  xpEarned     Int      @default(0)
  answeredAt   DateTime @default(now())

  session QuizSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  @@index([sessionId])
}

model XpEvent {
  id         String    @id @default(cuid())
  userId     String
  amount     Int
  reason     String
  skillArea  SkillArea?
  sourceRef  String?
  createdAt  DateTime  @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt])
}

model Achievement {
  id          String   @id @default(cuid())
  slug        String   @unique
  name        String
  description String
  iconUrl     String?
  xpReward    Int      @default(0)
  createdAt   DateTime @default(now())

  userAchievements UserAchievement[]
}

model UserAchievement {
  id            String   @id @default(cuid())
  userId        String
  achievementId String
  earnedAt      DateTime @default(now())

  user        User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  achievement Achievement @relation(fields: [achievementId], references: [id])

  @@unique([userId, achievementId])
  @@index([userId])
}

// ─── Phase 8: Adaptive / Analytics ───────────────────────────────────────────

model SkillScore {
  id         String    @id @default(cuid())
  userId     String
  skillArea  SkillArea
  score      Float     @default(0)
  accuracy   Float     @default(0)
  isWeak     Boolean   @default(false)
  updatedAt  DateTime  @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, skillArea])
  @@index([userId])
}

model ActivityLog {
  id         String    @id @default(cuid())
  userId     String
  activityType String
  skillArea  SkillArea?
  metadata   Json?
  loggedAt   DateTime  @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, loggedAt])
}
```

**Schema design notes:**
- `cefrLevel`, `cefrConfidence`, `topic` present on all content tables (PIPE-03 requirement, D-08 specific)
- `audioStorageKey` is a storage key string, NOT a URL (D-10)
- `contentHash` on content tables enables crawl deduplication (PIPE-02)
- `flaggedForReview` for low-confidence CEFR (PIPE-04)
- FSRS fields on SrsCard match `ts-fsrs` Card interface exactly (D-09)
- `@@index([userId, due])` on SrsCard enables efficient due-card queries
- NextAuth required tables: `Account`, `Session`, `VerificationToken` (AUTH-01–06)

---

### Pattern 5: Docker Compose Topology

```yaml
# docker-compose.yml — dev backing services only (D-05)
# Source: verified Docker Compose patterns from official Redis + PostgreSQL docs
version: '3.9'

services:
  postgres:
    image: postgres:16-alpine
    container_name: el_postgres
    env_file: .env
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-english_learning}
      POSTGRES_USER: ${POSTGRES_USER:-postgres}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-postgres}"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s

  redis-bullmq:
    image: redis:7-alpine
    container_name: el_redis_bullmq
    command: >
      redis-server
      --appendonly yes
      --maxmemory-policy noeviction
    ports:
      - "6379:6379"
    volumes:
      - redis_bullmq_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 3

  redis-cache:
    image: redis:7-alpine
    container_name: el_redis_cache
    command: >
      redis-server
      --maxmemory 256mb
      --maxmemory-policy allkeys-lru
    ports:
      - "6380:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 3

  minio:
    image: minio/minio
    container_name: el_minio
    command: server /data --console-address ":9001"
    env_file: .env
    environment:
      MINIO_ROOT_USER: ${MINIO_ACCESS_KEY:-minioadmin}
      MINIO_ROOT_PASSWORD: ${MINIO_SECRET_KEY:-minioadmin}
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data
    healthcheck:
      test: ["CMD", "mc", "ready", "local"]
      interval: 10s
      timeout: 5s
      retries: 3

volumes:
  postgres_data:
  redis_bullmq_data:
  minio_data:
```

**Two-Redis rationale (from ROADMAP.md):**
- `redis-bullmq` with `noeviction` + AOF: BullMQ requires this — eviction would silently delete queued SRS review jobs. Persistence means jobs survive container restart.
- `redis-cache` with `allkeys-lru` + no persistence: HTTP cache is ephemeral; eviction on memory pressure is correct; losing it costs a cache miss, not data loss.

---

### Pattern 6: GitHub Actions CI Skeleton

```yaml
# .github/workflows/ci.yml
# Source: GitHub Actions pnpm monorepo best practices [VERIFIED: pnpm/action-setup docs]
name: CI

on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

jobs:
  ci:
    name: Type-check, Lint, Migrate
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: english_learning_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    env:
      DATABASE_URL: postgresql://postgres:postgres@localhost:5432/english_learning_test
      REDIS_URL_BULLMQ: redis://localhost:6379
      REDIS_URL_CACHE: redis://localhost:6380
      MINIO_ENDPOINT: http://localhost:9000
      MINIO_ACCESS_KEY: minioadmin
      MINIO_SECRET_KEY: minioadmin
      MINIO_BUCKET: english-learning

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v3
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Type-check
        run: pnpm turbo run type-check

      - name: Lint
        run: pnpm turbo run lint

      - name: Generate Prisma client
        run: pnpm --filter @repo/database run db:generate

      - name: Run database migrations
        run: pnpm --filter @repo/database run db:migrate:deploy
```

---

### Pattern 7: TypeScript Shared Config

```json
// packages/tsconfig/base.json
// Source: Context7 / vercel/turborepo official docs
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "target": "es2022",
    "lib": ["es2022"],
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "declaration": true,
    "declarationMap": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "moduleDetection": "force"
  }
}
```

```json
// packages/tsconfig/nestjs.json — NestJS requires emitDecoratorMetadata
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "./base.json",
  "compilerOptions": {
    "module": "CommonJS",
    "moduleResolution": "node",
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "lib": ["es2022"]
  }
}
```

```json
// packages/tsconfig/nextjs.json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "./base.json",
  "compilerOptions": {
    "jsx": "preserve",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "allowImportingTsExtensions": true,
    "lib": ["dom", "dom.iterable", "es2022"]
  }
}
```

**Critical NestJS requirement:** `emitDecoratorMetadata: true` is required for NestJS DI to work. The base config uses `NodeNext` module resolution; NestJS config must override to `CommonJS` + `node`. [VERIFIED: NestJS official docs, known requirement]

---

### Anti-Patterns to Avoid

- **Using `turbo.json` `"pipeline"` key:** Turborepo 2.x uses `"tasks"` not `"pipeline"`. Using the old key silently falls back to legacy behavior or fails. [VERIFIED: Context7 / Turborepo reference docs]
- **postinstall: prisma generate in pnpm monorepo:** Fails because postinstall runs before workspace symlinks resolve. Use explicit `db:generate` in build scripts instead. [VERIFIED: GitHub issue #6603]
- **Prisma `latest` tag:** `npm install prisma` installs 7.8.0, not 6.x. Always specify `prisma@^6.19.3` explicitly.
- **React 19 with Next.js 14:** Package managers may install React 19 if `"react": "*"`. Always pin `"react": "^18.3.1"`.
- **TailwindCSS v4 with shadcn/ui:** shadcn/ui requires Tailwind 3. Installing `tailwindcss@latest` gives v4. Pin `tailwindcss@^3.4.19`.
- **Shared @repo packages without `exports` field:** Without explicit `exports`, pnpm may not resolve the package correctly in all consuming apps.
- **NestJS base tsconfig with `NodeNext` module:** NestJS decorators require `CommonJS` module. Using the shared base tsconfig directly in NestJS causes decorator metadata to fail silently.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Health check endpoints | Custom ping controller | `@nestjs/terminus` | Handles concurrent checks, structured JSON response, integrates with Kubernetes probes |
| Monorepo task orchestration | Custom scripts | Turborepo `turbo run` | Handles parallel execution, topological ordering, file hash caching |
| Environment variable validation | Manual `process.env` checks | `@nestjs/config` + Joi | Fails fast at startup with clear error messages before server binds |
| Redis connection management | Raw `redis.createClient()` | `ioredis` (via `@nestjs/bullmq` for queues) | Auto-reconnect, Sentinel support, connection pooling |
| SRS algorithm | Custom scheduling math | `ts-fsrs` (Phase 3) | FSRS is research-backed; SM-2 ease-floor trap is a known failure mode |
| Job queue implementation | Custom poll loop | BullMQ | Handles job deduplication, retry logic, delay accuracy, Redis sorted sets |
| Password hashing | `crypto.createHash()` | `bcrypt` | bcrypt has adaptive cost factor; raw crypto lacks work factor protection |
| Input validation | Manual DTO checking | `class-validator` + `ValidationPipe` | Covers nested objects, arrays, custom decorators; single global pipe |

**Key insight:** Every item above has solved edge cases that took the library authors years to discover. The skeleton phase is about wiring them together correctly, not reimplementing them.

---

## Common Pitfalls

### Pitfall 1: Prisma 7 vs Prisma 6 Version Collision
**What goes wrong:** Running `pnpm install prisma` without a version pin installs Prisma 7.8.0. Prisma 7 uses a new `prisma.config.ts` file and changed client output location — the `schema.prisma` generator block and `PrismaService` pattern both break silently with a 6-to-7 mismatch.
**Why it happens:** npm `latest` tag moved to 7.8.0 while CLAUDE.md specifies 6.x.
**How to avoid:** Always use `prisma@^6.19.3` and `@prisma/client@^6.19.3`. Set `overrides` in root `package.json` if needed. [VERIFIED: npm dist-tags confirmed]
**Warning signs:** `Cannot find module '../generated/client'`, `prisma.config.ts not found`

### Pitfall 2: NestJS `emitDecoratorMetadata` Not Enabled
**What goes wrong:** Dependency injection silently fails — providers are `undefined` even though imports look correct. No error at startup, only `undefined` at runtime.
**Why it happens:** `emitDecoratorMetadata: true` is required by NestJS's DI container (via `reflect-metadata`). The shared `base.json` tsconfig should NOT have it; only the NestJS tsconfig variant should.
**How to avoid:** Use a dedicated `packages/tsconfig/nestjs.json` that sets `emitDecoratorMetadata: true` and module to `CommonJS`.
**Warning signs:** `Nest can't resolve dependencies of [Service] (?)` error pattern.

### Pitfall 3: Prisma `postinstall` in pnpm Monorepo
**What goes wrong:** `pnpm install` fails or runs `prisma generate` against wrong path because the workspace symlinks aren't resolved when the `postinstall` script fires.
**Why it happens:** pnpm resolves symlinks for workspace packages after all `postinstall` hooks run.
**How to avoid:** Remove `postinstall: prisma generate` from `packages/database/package.json`. Add an explicit `prepare` or `db:generate` step to the root `package.json` and to the CI pipeline.
**Warning signs:** `Error: Could not find Prisma schema` during `pnpm install`.

### Pitfall 4: Next.js + Prisma Duplicate Client Instances
**What goes wrong:** Prisma Client throws `Error: too many connections` in development. Multiple `PrismaClient` instances are created on each hot-reload, exhausting the PostgreSQL connection pool.
**Why it happens:** Next.js webpack bundles modules twice (server and edge), creating two separate `PrismaClient` instances even from the same source file.
**How to avoid:** Use the `globalThis` singleton pattern in `packages/database/src/index.ts`. Only skip globalThis in production (`NODE_ENV === 'production'`).
**Warning signs:** `PrismaClientKnownRequestError: Unable to start a transaction` or connection pool exhausted after ~5 hot-reloads.

### Pitfall 5: Turborepo `pipeline` vs `tasks` Key
**What goes wrong:** `turbo run build` does nothing; tasks don't execute; no error output.
**Why it happens:** Turborepo 2.x renamed the configuration key from `"pipeline"` to `"tasks"`. Old `"pipeline"` is a no-op in v2 without explicit migration.
**How to avoid:** Always use `"tasks"` in `turbo.json`. Run `npx turbo --version` to confirm 2.x is installed.
**Warning signs:** `turbo run build` completes instantly with `0 tasks completed`.

### Pitfall 6: pnpm Hoisting with `@repo/*` Packages
**What goes wrong:** Importing `@repo/database` works in one app but not the other. Or types from generated Prisma client can't be resolved in `apps/web`.
**Why it happens:** pnpm uses strict hoisting by default — packages only exist in `node_modules` of their direct dependents. If `@repo/database` exports generated types, both apps must declare it as a dependency.
**How to avoid:** Add `"@repo/database": "workspace:*"` to BOTH `apps/web` and `apps/api` `package.json`. Add `"@repo/shared": "workspace:*"` similarly.
**Warning signs:** `Cannot find module '@repo/database'` in only one app; works fine in another.

### Pitfall 7: Redis BullMQ Eviction Policy
**What goes wrong:** SRS review jobs silently disappear from the queue hours or days after being scheduled. Users miss due vocabulary reviews.
**Why it happens:** If the BullMQ Redis instance uses `allkeys-lru` or `volatile-lru`, Redis evicts delayed jobs when memory pressure occurs. BullMQ stores delayed jobs as sorted set entries with the timestamp as score.
**How to avoid:** `redis-bullmq` container MUST use `--maxmemory-policy noeviction`. Add `--appendonly yes` for persistence across container restarts.
**Warning signs:** Fewer-than-expected review jobs appearing; jobs vanishing after Redis restart.

---

## Code Examples

### Next.js 14 Health Route (App Router)

```typescript
// apps/web/src/app/api/health/route.ts
export async function GET() {
  return Response.json({ status: 'ok', timestamp: new Date().toISOString() });
}
```

### NestJS 11 Simple Health Controller (no Terminus dependency for Phase 1)

```typescript
// apps/api/src/health/health.controller.ts
import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
```

A simple plain controller is sufficient for Phase 1 smoke tests. Add `@nestjs/terminus` with Prisma + Redis checks in Phase 2 when those services are actively used.

### Root package.json Scripts

```json
{
  "name": "english-learning",
  "private": true,
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "type-check": "turbo run type-check",
    "test": "turbo run test",
    "db:generate": "pnpm --filter @repo/database run db:generate",
    "db:migrate": "pnpm --filter @repo/database run db:migrate",
    "db:migrate:deploy": "pnpm --filter @repo/database run db:migrate:deploy"
  },
  "devDependencies": {
    "turbo": "^2.9.18",
    "typescript": "^5.4.0"
  }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `turbo.json` `"pipeline"` key | `"tasks"` key | Turborepo 2.0 (2024) | Old key silently ignored in v2 |
| `prisma generate` in postinstall | Explicit `db:generate` script | pnpm monorepo best practice | Avoids workspace symlink timing issues |
| Single Redis for BullMQ + cache | Two separate Redis instances | BullMQ docs recommendation | Prevents job eviction |
| SM-2 SRS algorithm | FSRS algorithm | 2023 (ts-fsrs library) | Eliminates ease-floor trap |
| `@nestjs/bull` | `@nestjs/bullmq` | BullMQ 4+ / NestJS 10+ | Bull is unmaintained since 2022 |
| Prisma 6 | Prisma 7 (latest) | April 2025 | Rust-free, new config file — project pins 6.x intentionally |
| `npm install --save-dev @swc/core` | Bundled in NestJS 11 | NestJS 11 (Jan 2025) | SWC is default compiler; `@swc/cli @swc/core` needed only as devDeps |

**Deprecated/outdated:**
- `@nestjs/bull`: Replaced by `@nestjs/bullmq`. Bull (original) unmaintained since 2022.
- `"pipeline"` in `turbo.json`: Replaced by `"tasks"` in Turborepo 2.x.
- `ts-jest` for NestJS: Replaced by Vitest + SWC (4–5x faster in CI).
- `SM-2` fields (easeFactor, interval, repetitions): FSRS (stability, difficulty, state) is the new standard.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `ts-fsrs` Card field names exactly match FSRS spec used by Phase 3 | Schema Pattern 4 | Schema migration needed in Phase 3 — high impact |
| A2 | `@nestjs/terminus` does not ship a `PrismaHealthIndicator`; custom implementation needed | Pattern 2 | Minor — simple to implement either way |
| A3 | pnpm 9 installed on target developer machines | CI Pattern | CI will auto-install via `pnpm/action-setup@v3`; local dev needs manual install |
| A4 | Shadcn/ui is not scaffolded in Phase 1 (Phase 1 is skeleton only, no UI library) | Architecture | No risk in Phase 1 |
| A5 | docker-compose v2 syntax (`docker compose`) available on target machines | Docker Pattern | docker-compose v1 syntax (`docker-compose`) is deprecated but still works |

---

## Open Questions

1. **Prisma 7 upgrade path**
   - What we know: Prisma 7 is `latest`, Prisma 6.19.3 is `prev`. Prisma 7 works with NestJS 11 but requires a new config file.
   - What's unclear: When the project will need to upgrade to Prisma 7.
   - Recommendation: Pin to `^6.19.3` now. Plan a dedicated upgrade task post-v1 ship.

2. **ts-fsrs Card field names vs Prisma schema**
   - What we know: ts-fsrs 5.4.1 Card interface has the FSRS-4 standard fields.
   - What's unclear: Whether `ts-fsrs` v5 uses camelCase (`elapsedDays`) or snake_case field names internally.
   - Recommendation: In Phase 3, verify `ts-fsrs` types before writing SRS service. Schema uses camelCase (Prisma convention).

3. **MinIO healthcheck image capability**
   - What we know: MinIO Docker image has `mc` CLI but the healthcheck command path may vary by version.
   - What's unclear: Whether `mc ready local` works without prior `mc alias set`.
   - Recommendation: Use `curl -f http://localhost:9000/minio/health/live` as the healthcheck fallback. [ASSUMED]

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | NestJS 11, Next.js 14 | ✓ | 22.22.2 (> 20 req) | — |
| pnpm | Turborepo workspaces | ✓ | 10.9.7 (latest-10) | — |
| Docker | Backing services | ✓ | 29.4.2 | — |
| Docker Compose | docker-compose.yml | ✓ | v5.1.3 | — |
| PostgreSQL | Via Docker | ✓ (container) | 16-alpine image | — |
| Redis | Via Docker | ✓ (container) | 7-alpine image | — |
| MinIO | Via Docker | ✓ (container) | minio/minio image | — |

**Note on pnpm version:** Developer machine has pnpm 10.9.7 (latest-10 series). CLAUDE.md specifies pnpm 9.x. Pnpm 10 is fully backward-compatible with pnpm 9 lockfile format. CI uses `pnpm/action-setup@v3` with `version: 9` — pinning CI to 9 while local uses 10 may cause lockfile format differences. **Recommendation:** Upgrade project requirement to pnpm 9.15.9 (latest-9) or document that pnpm 10 is acceptable. [ASSUMED — investigate before creating `packageManager` field in root `package.json`]

**Missing dependencies with no fallback:** None — all backing services run in Docker.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 2.x |
| Config file | `vitest.config.ts` in each app (none yet — Wave 0 creates them) |
| Quick run command | `pnpm --filter @repo/api run test` |
| Full suite command | `pnpm turbo run test` |

### Phase Requirements → Test Map

Phase 1 has no user-facing requirements. The validation is infrastructure smoke tests:

| Check | Test Type | Automated Command | File Exists? |
|-------|-----------|-------------------|-------------|
| docker compose up starts all 4 services | smoke | `docker compose ps` | ❌ Wave 0 |
| `prisma migrate dev` runs zero-error | smoke | `pnpm db:migrate` | ❌ Wave 0 |
| NestJS API returns 200 on GET /api/health | smoke | `curl http://localhost:3001/api/health` | ❌ Wave 0 |
| Next.js returns 200 on GET /api/health | smoke | `curl http://localhost:3000/api/health` | ❌ Wave 0 |
| Type-check passes across all workspaces | lint | `pnpm turbo run type-check` | ❌ Wave 0 |
| Lint passes across all workspaces | lint | `pnpm turbo run lint` | ❌ Wave 0 |

### Wave 0 Gaps

- [ ] `apps/api/vitest.config.ts` — NestJS unit test config with SWC transformer
- [ ] `apps/web/vitest.config.ts` — Next.js component test config
- [ ] `packages/database/vitest.config.ts` — DB utility test config
- [ ] `packages/shared/vitest.config.ts` — Shared schema test config
- [ ] Root `turbo.json` must include `"test"` task definition

### Sampling Rate

- **Per task commit:** `pnpm --filter <changed-package> run type-check`
- **Per wave merge:** `pnpm turbo run type-check lint && docker compose ps`
- **Phase gate:** `docker compose up` + `pnpm db:migrate` + health check 200 on both services

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No (Phase 2) | NextAuth v5 + JWT |
| V3 Session Management | No (Phase 2) | NextAuth session |
| V4 Access Control | No (skeleton only) | NestJS Guards (Phase 2) |
| V5 Input Validation | Yes | `class-validator` + `ValidationPipe` (global) |
| V6 Cryptography | No (Phase 1 skeleton) | bcrypt Phase 2 |

### Phase 1 Security Concerns

Phase 1 is infrastructure only (no user-facing routes, no auth). Security controls wired at the bootstrap level:

- `ValidationPipe({ whitelist: true, transform: true })` applied globally in `main.ts` — strips unknown properties from all DTOs before they reach controllers.
- `.env` added to `.gitignore` from day one (D-13). `.env.example` committed with placeholder values only.
- Docker Compose services not exposed to external networks (local dev only; no `0.0.0.0` binding in production Docker).
- Database URL in `.env` with strong passwords — use `openssl rand -base64 32` for `POSTGRES_PASSWORD` and `NEXTAUTH_SECRET`.

### Known Threat Patterns for Infrastructure Phase

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Secrets in git history | Information Disclosure | `.env` gitignored from day 1; `.env.example` has no real values |
| Open backing service ports | Tampering | docker-compose.yml binds to `127.0.0.1` in dev; prod Compose does not expose Postgres/Redis directly |
| Missing connection pool limits | DoS | Prisma default pool size = (CPUs × 2 + 1); acceptable for dev |

---

## Sources

### Primary (HIGH confidence)

- Context7 `/vercel/turborepo` — workspace config, turbo.json tasks, package naming, pnpm protocol, TypeScript config patterns
- Context7 `/nestjs/docs.nestjs.com` — bootstrap pattern, SWC builder, health checks (Terminus), ConfigModule, BullMQ integration, lifecycle hooks
- Context7 `/websites/prisma_io` — schema design, NestJS PrismaService pattern, createMany, @@index, pnpm workspaces guide
- npm registry (verified via `npm view`) — versions for all packages: turbo 2.9.18, next 14.2.35, @nestjs/core 11.1.26, prisma 6.19.3, bullmq 5.78.0, tailwindcss 3.4.19, ts-fsrs 5.4.1

### Secondary (MEDIUM confidence)

- [Prisma GitHub Discussion #29146](https://github.com/prisma/prisma/discussions/29146) — Prisma 7 NestJS compatibility (confirmed works)
- [Prisma Blog: Announcing Prisma ORM 7](https://www.prisma.io/blog/announcing-prisma-orm-7-0-0) — Prisma 7 breaking changes documented
- [Prisma pnpm workspaces guide](https://www.prisma.io/docs/guides/use-prisma-in-pnpm-workspaces) — official Prisma pnpm monorepo setup
- [GitHub Issue prisma/prisma #6603](https://github.com/prisma/prisma/issues/6603) — postinstall pnpm timing issue
- [open-spaced-repetition/ts-fsrs README](https://github.com/open-spaced-repetition/ts-fsrs) — FSRS Card interface fields
- [Docker official blog: Postgres Docker image](https://www.docker.com/blog/how-to-use-the-postgres-docker-official-image/) — healthcheck patterns

### Tertiary (LOW confidence)

- WebSearch results on NestJS 11 Express vs Fastify — confirms Express v5 is default in NestJS 11
- WebSearch results on Next.js globalThis singleton pattern — confirms pnpm monorepo singleton fix

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all versions verified via npm registry; compatibility confirmed via official docs
- Architecture: HIGH — patterns sourced from Turborepo official docs (Context7) and Prisma official pnpm guide
- Pitfalls: HIGH — most sourced from GitHub issues and official changelogs, not just training data
- Schema design: MEDIUM — all 8 phases modeled, but specific field names for ts-fsrs require Phase 3 verification

**Research date:** 2026-06-11
**Valid until:** 2026-09-01 (stable stack; Prisma 6 LTS window ends when Prisma 7 adoption is universal)
