<!-- GSD:project-start source:PROJECT.md -->
## Project

**English Learning Platform**

A modern, production-quality English learning web application for Intermediate (B1), Upper Intermediate (B2), and Advanced (C1) learners. The platform delivers five integrated learning modules — grammar, vocabulary-in-context, reading comprehension, listening comprehension, and mixed-skill quizzes — backed by automatically crawled and seeded content, a gamification layer, and adaptive spaced repetition. Built as a personal/portfolio project designed to look and feel like a commercial EdTech SaaS from day one.

**Core Value:** A learner can open the app, immediately find hundreds of exercises at their CEFR level across all skill areas, and feel their progress through XP, streaks, and visible advancement — no empty screens, no placeholder data.

### Constraints

- **Tech Stack**: Next.js + NestJS/Next.js API + PostgreSQL + Prisma + NextAuth + Redis + BullMQ — already specified, not up for debate
- **Performance**: Initial load < 2s, API response < 300ms, Lighthouse score > 90
- **Scale**: Architecture must support 10,000+ concurrent users and horizontal scaling (even if v1 runs on a single VPS)
- **Security**: JWT/auth protection on all private routes, rate limiting, bcrypt password hashing, input validation
- **Deployment**: Docker-first; cloud/VPS ready
- **No empty states**: seed scripts must populate all modules with realistic production-scale data on first deploy
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Recommended Stack
### Core Technologies
| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js | 14.x (lock to 14, not 15/16) | Frontend + Route Handlers | Project specifies 14; App Router is stable. Next.js 15+ changed async request APIs and 16 defaults to Turbopack — migrating mid-project adds risk. Pin to `^14.2` and upgrade intentionally after v1 ships. |
| NestJS | 11.x | Standalone API backend | Released Jan 2025; Express v5 default, SWC compiler, Node.js 20+ required. With 23 queue workers, SRS scheduler, crawler pipeline, and AI generation — NestJS gives you structured modules, DI container, guards, interceptors, and testability that Next.js Route Handlers cannot match. |
| TypeScript | 5.4+ | Type safety everywhere | Required by both Next.js 14 and NestJS 11. Use `strict: true`. Shared types live in a `packages/shared` workspace. |
| PostgreSQL | 16.x | Primary database | Relational model is correct for SRS schedules, quiz history, progress tracking, CEFR metadata, and content relationships. pg 16 adds logical replication improvements useful if you ever need read replicas. |
| Prisma ORM | 6.x | Type-safe DB layer | v6 ships a JS-first client generator (Rust-free), ESM support, and improved performance. Works with both NestJS (PrismaService pattern) and the Next.js frontend. Use `prisma generate` as a post-install hook. Single schema source of truth across the monorepo. |
| Redis | 7.x | Cache + queue transport | BullMQ requires Redis 6.2+; Redis 7 adds ACLs, multi-part AOF, and function scripting. Use one Redis instance for both cache (GET/SET with TTL) and BullMQ queues — isolate with key prefixes. |
| BullMQ | 5.x (latest 5.78) | Job queues (crawler, SRS, AI gen, notifications) | Current major version. `@nestjs/bullmq` integration is the correct wrapper for NestJS. See SRS section below for scheduling pattern. |
| NextAuth | v5 (Auth.js) | Authentication (Next.js side) | Project constraint. Auth.js v5 supports App Router natively. JWT strategy. For NestJS API protection, forward the session token and validate it as a shared JWT secret — see Auth section below. |
| Docker | 24+ / Compose v2 | Container orchestration | All services (Next.js, NestJS, PostgreSQL, Redis, MinIO) run via `docker-compose.yml`. Single `docker compose up` starts the full stack locally. |
| Turborepo | 2.x | Monorepo build orchestration | pnpm workspaces + Turborepo is the 2025 standard for Next.js + NestJS monorepos. Topological builds, incremental caching, parallel task execution. |
| pnpm | 9.x | Package manager | Required for Turborepo workspaces. Strict hoisting avoids phantom dependency bugs. Faster than npm/yarn for monorepos. |
### Backend Architecture Decision: NestJS (Separate Backend), NOT Next.js Route Handlers
### Audio / Video Storage and Delivery
| Concern | Decision |
|---------|----------|
| Production storage | Cloudflare R2 |
| Local development | MinIO (Docker) |
| Delivery CDN | Cloudflare's built-in edge (free with R2) |
| Audio format | MP3 (universal browser support, good compression) |
| Video | Out of scope for v1 (listening content is audio-only transcripts) |
- **Zero egress fees.** A platform serving 10TB/month of audio MP3s pays $0 egress with R2 vs ~$900/month with S3+CloudFront. For a portfolio/early product this is decisive.
- **Performance.** R2's 330+ edge locations deliver 20–30% better TTFB globally vs S3+single-region. Latency sits at 40–80ms globally without additional CDN configuration.
- **No operational overhead.** Cloudflare's CDN is automatic in front of R2. You don't configure CloudFront distributions or origin groups.
- **S3-compatible API.** Switch from MinIO (local) to R2 (prod) with a single environment variable change. The `@aws-sdk/client-s3` SDK works against both.
- Runs in Docker (`minio/minio` image), starts with `docker compose up`.
- Eliminates network dependency during development — no cloud credentials needed locally.
- S3-compatible, so the same storage service code works unchanged.
- Provides a web console at `localhost:9001` for inspecting uploaded files.
- Crawled listening content: store source MP3s in R2 with public read URLs.
- TTS-generated pronunciation: generate once, cache in R2 with a content-addressed key (`sha256(text+voice).mp3`). Never regenerate the same word twice.
- Serve via R2 public bucket URL (or R2 Custom Domain if you use a vanity domain).
- No chunked video streaming needed — audio files for EFL exercises are typically 30 seconds to 5 minutes.
### Text-to-Speech (Vocabulary Pronunciation)
- **Free tier: 1 million characters/month for Neural2 voices.** 5,000 vocabulary words × ~50 chars average = 250,000 characters. Entire initial corpus fits in the free tier.
- **WaveNet/Neural2 quality is sufficient for pronunciation guidance.** EFL learners need clear, accurate pronunciation, not theatrical voice acting.
- **en-US-Neural2-D** (male) or **en-US-Neural2-F** (female) are the recommended voices for pronunciation guides.
- API response is `ArrayBuffer` → save as MP3 to R2. Use content-addressed filenames: `tts/{sha256(word+voice)}.mp3`.
### SRS (Spaced Repetition) Scheduling with BullMQ
- `interval` — days until next review
- `repetitions` — count of successful reviews
- `easeFactor` — difficulty multiplier (starts at 2.5)
- `delay` option — job fires after N milliseconds (stored in Redis sorted set)
- `jobId` deduplication — prevents duplicate reviews if user reviews early
- `removeOnComplete: true` — don't accumulate completed jobs in Redis
- `@nestjs/bullmq` NestJS module — `@Processor('reviews')` decorator pattern
### CEFR Classification Engine
- LLM-based classification (calling OpenAI per document) is expensive at pipeline scale (2,000 reading passages + 1,000 listening transcripts = $10–50 per classification run).
- Training a custom ML model requires labeled CEFR data (the Cambridge dataset has 120 passages; not enough for a robust model).
- Rule-based achieves 70–75% accuracy for B1–C1 range, which is sufficient for seeding content and can be refined later.
| Factor | Weight | Implementation |
|--------|--------|----------------|
| Vocabulary difficulty | 50% | Match words against CEFR-J / EVP word lists (A1–C2 frequency bands) |
| Sentence length | 25% | Average words per sentence; >25 words/sentence = C1 indicator |
| Syntactic complexity | 25% | Subordinate clause density, passive constructions, modal chains |
### Testing Stack
| Layer | Tool | Version | Scope |
|-------|------|---------|-------|
| Unit tests | Vitest | 2.x | Services, utilities, algorithms (SM-2, CEFR classifier), NestJS module testing |
| Integration tests | Vitest + Supertest | 2.x / 7.x | NestJS HTTP endpoints against real PostgreSQL (test DB) |
| Component tests | Vitest + Testing Library | 2.x / 16.x | React components (Next.js) |
| E2E tests | Playwright | 1.x (latest ~1.48) | Critical user journeys: auth, lesson flow, quiz, SRS review |
| API mocking | MSW | 2.x | Mock NestJS API during Next.js component tests |
- Vitest is ESM-native — no `ts-jest` transform config required.
- NestJS 11 uses SWC as the default compiler; Vitest + SWC runs 4–5x faster than Jest + ts-jest.
- CI runtime improvement: 15 min (Jest) → 4 min (Vitest) is a documented real-world result for NestJS projects.
- API is Jest-compatible — `describe/it/expect/vi.mock` syntax. Negligible migration cost.
- `@nestjs/testing` `Test.createTestingModule()` works with Vitest out of the box.
- Playwright tests all three engines (Chromium, WebKit, Firefox) — one test covers Safari-equivalent.
- Playwright is already a project dependency (web crawler uses it). No new tooling to install.
- Better parallelism and sharding for CI.
- Cypress is component-test-focused; Playwright has stronger full-page interaction support.
### Supporting Libraries
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@nestjs/bullmq` | 11.x | BullMQ integration for NestJS | All queue producers and workers |
| `@nestjs/config` | 3.x | Config/env management | Load `.env` files with validation via Joi/Zod |
| `@nestjs/throttler` | 6.x | Rate limiting | Apply to auth endpoints and public APIs |
| `@nestjs/swagger` | 8.x | OpenAPI docs | Auto-generate API docs from decorators; useful for Next.js client type gen |
| `@aws-sdk/client-s3` | 3.x | S3-compatible storage | Works against both MinIO (local) and Cloudflare R2 (prod) |
| `@google-cloud/text-to-speech` | 5.x | TTS audio generation | Called by TTSService during content pipeline only |
| `natural` | 6.x | NLP tokenization/stemming | CEFR classifier word analysis |
| `zod` | 3.x | Schema validation | Shared DTOs in `packages/shared`; used by both NestJS pipes and Next.js forms |
| `ioredis` | 5.x | Redis client | Used by NestJS for cache outside BullMQ queues |
| `bcrypt` | 5.x | Password hashing | User auth — 12 rounds |
| `class-validator` + `class-transformer` | 0.14.x / 0.5.x | NestJS DTO validation | Paired with `ValidationPipe` globally |
| `@tanstack/react-query` | 5.x | Server state management | Client-side data fetching in Next.js; replaces useEffect + useState for API calls |
| `axios` | 1.x | HTTP client | Next.js → NestJS API calls; typed with DTOs from `packages/shared` |
| `date-fns` | 3.x | Date manipulation | SRS interval calculations, streak tracking, analytics |
| `sharp` | 0.33.x | Image processing | Optimize crawled images for reading passages |
| `cheerio` | 1.x | HTML parsing | Content crawler (already decided) |
| `playwright` | 1.x | Browser automation | Crawler (already decided) + E2E tests |
### Development Tools
| Tool | Purpose | Notes |
|------|---------|-------|
| `turbo` (Turborepo 2.x) | Monorepo task runner | `turbo dev`, `turbo build`, `turbo test` from root |
| `pnpm` 9.x | Package manager | `pnpm-workspace.yaml` defines `apps/*` and `packages/*` |
| `ESLint` 9.x | Linting | Flat config (`eslint.config.mjs`); shared config in `packages/eslint-config` |
| `Prettier` 3.x | Code formatting | Shared `.prettierrc` at monorepo root |
| `husky` + `lint-staged` | Pre-commit hooks | Run ESLint + Prettier on staged files only |
| `@prisma/client` generator | DB types | Run `prisma generate` after schema changes; output to `packages/database/generated` |
| `prisma-erd-generator` | Schema visualization | Generate ERD from Prisma schema for documentation |
| Bull Board (`@bull-board/nestjs`) | Queue monitoring UI | Mount at `/admin/queues` in NestJS; visualize job status during development |
| `dotenv-cli` | Env file loading | Load `.env.local` for Turborepo scripts that don't auto-load env |
## Installation
# Initialize monorepo
# Core backend (apps/api)
# Core frontend (apps/web)
# Shared package (packages/shared)
# Dev dependencies (root)
## Alternatives Considered
| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Backend | NestJS 11 | Next.js Route Handlers | ~70% lower throughput; no DI container; no structured modules; BullMQ workers don't belong in the Next.js process |
| Backend | NestJS 11 | Express + custom structure | NestJS is Express with structure — same performance, better DX, TypeScript-native, Swagger built-in |
| ORM | Prisma 6 | TypeORM | TypeORM is the "legacy" choice for NestJS in 2025; slower development velocity, decorator-based schema is harder to reason about vs Prisma SDL schema |
| ORM | Prisma 6 | Drizzle ORM | Drizzle has better raw SQL performance and smaller bundle, but Prisma's `@prisma/client` generator + relation queries are better for the complex relational schema this project needs (SRS + progress + quiz history) |
| TTS | Google Cloud Neural2 | ElevenLabs | 40–50x more expensive; overkill quality for pronunciation guides |
| TTS | Google Cloud Neural2 | OpenAI TTS-1 | No meaningful free tier; $15/1M chars; Google's free tier covers entire initial corpus |
| Storage | Cloudflare R2 + MinIO | AWS S3 + CloudFront | R2 has zero egress fees; CloudFront adds operational complexity; R2's CDN is automatic |
| Storage | Cloudflare R2 + MinIO | Supabase Storage | Supabase Storage is great for Supabase-native stacks; adds vendor dependency here |
| CEFR | Rule-based hybrid | LLM-based (OpenAI) | $10–50 per full corpus classification run; brittle to API changes; unnecessary for seed-time accuracy |
| CEFR | Rule-based hybrid | Pre-trained ML model | Insufficient labeled training data for fine-tuned model; rule-based matches required accuracy for v1 |
| Testing | Vitest | Jest | Jest requires `ts-jest` transform; 3–4x slower in CI; Vitest is ESM-native and Jest-compatible |
| E2E | Playwright | Cypress | Playwright already in project for crawler; tests all browser engines; better CI parallelism |
| Monorepo | Turborepo | Nx | Turborepo is lighter and sufficient; Nx adds significant configuration overhead for two apps |
| Auth | NextAuth v5 | Clerk | Clerk is a hosted service — adds vendor lock-in and cost; NextAuth keeps auth self-hosted |
## What NOT to Use
| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `bull` (original Bull) | Unmaintained since 2022; lacks BullMQ's delayed job accuracy, job deduplication, and flow producers | `bullmq` ^5.x |
| Next.js Pages Router | Project specifies App Router; mixing both routers in one project causes confusion and bugs | App Router exclusively |
| `typeorm` | Metadata-heavy decorator patterns; slower DX than Prisma; class-based entities don't compose well with Zod schemas in shared package | Prisma 6 |
| `mongoose` / MongoDB | Relational model (SRS schedules, progress tracking, quiz history, content relationships) is the correct fit; document store adds complexity here | PostgreSQL + Prisma |
| `socket.io` for real-time | No real-time features in v1 scope; don't add this until live features (future AI tutor) require it | Polling + React Query for dashboard refresh |
| `GraphQL` | Adds schema management overhead with no benefit for this project's data access patterns; REST is sufficient | REST (NestJS Route Guards + Swagger) |
| `Redux` / `Zustand` for all state | Use React Query for server state, React context for UI-only state (theme, modal open/closed). Global state stores are overkill. | `@tanstack/react-query` + React context |
| `next-i18next` / `i18n` | App targets English learners; UI language is English only in v1. Adding i18n now is premature. | Plain strings; extract to constants if needed later |
| `Cypress` | Playwright already in project; Cypress would be a duplicate E2E tool with worse multi-browser support | Playwright |
| `ts-jest` | Replaced by Vitest + SWC in NestJS 11 ecosystem; significantly slower compilation | Vitest with SWC |
## Version Compatibility
| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `next@14.x` | `react@18.x`, `react-dom@18.x` | Next.js 14 targets React 18. Do NOT use React 19 with Next.js 14 — React 19 requires Next.js 15+. |
| `next-auth@5.x` (Auth.js) | `next@14.x` | v5 is stable for App Router. Use `@auth/prisma-adapter` for DB sessions if needed. |
| `@nestjs/core@11.x` | `node@20+` | NestJS 11 drops Node.js 16 support. Ensure Docker base image is `node:20-alpine`. |
| `bullmq@5.x` | `ioredis@5.x`, `redis@7.x` | BullMQ 5.x uses native Redis commands; requires Redis 6.2+ (Redis 7 recommended). |
| `prisma@6.x` | `@prisma/client@6.x` | Must keep `prisma` (CLI, devDep) and `@prisma/client` (runtime) on the same major version. |
| `@nestjs/bullmq@11.x` | `bullmq@5.x`, `@nestjs/core@11.x` | Major version of `@nestjs/bullmq` must match NestJS core major version. |
| `tailwindcss@3.x` | `next@14.x`, `shadcn-ui` | shadcn/ui currently requires Tailwind 3. Tailwind 4 broke shadcn compatibility in 2025 — stay on v3 until shadcn officially supports v4. |
| `vitest@2.x` | `@vitest/coverage-v8@2.x` | Coverage package must match Vitest major version. |
## Stack Patterns by Scenario
- Use `axios` or `fetch` with the internal Docker network URL (`http://api:3001/api`)
- Pass the NextAuth session JWT as `Authorization: Bearer <token>` header
- NestJS validates the JWT using `@nestjs/passport` + `passport-jwt`
- Separate Docker service (`api-worker`) that runs only the NestJS worker processes, not the HTTP server
- Scale workers independently from the HTTP API service
- Use `WORKER_ONLY=true` env var to conditionally bootstrap only worker modules
- Run classification in a BullMQ job (not synchronously during crawl)
- Queue: `cefr-classify`, workers: 4 concurrent
- Store `cefrRaw` (rule-based) and `cefrConfidence` (float) in the content table for future ML override
- Frontend requests `/api/vocabulary/:id/pronunciation`
- NestJS checks R2 for cached audio
- If miss: call Google TTS, upload to R2, return URL
- If R2 is unavailable: fall back to browser's `SpeechSynthesis` API (Web Speech API) — zero cost, lower quality
## Sources
- [Contentful: NestJS vs Next.js — Differences and When to Use Each (2025)](https://www.contentful.com/blog/nestjs-vs-nextjs/) — Architecture tradeoffs, throughput figures
- [tech-insider.org: NestJS vs Next.js 2026 — 70% Speed Gap](https://tech-insider.org/nestjs-vs-nextjs-2026/) — Performance benchmarks
- [Trilon: Announcing NestJS 11](https://trilon.io/blog/announcing-nestjs-11-whats-new) — NestJS 11 features, Express v5, SWC default
- [Cloudflare: R2 vs AWS S3](https://www.cloudflare.com/pg-cloudflare-r2-vs-aws-s3/) — Egress fee comparison
- [DigitalApplied: Cloudflare R2 vs AWS S3 Complete 2025 Comparison](https://www.digitalapplied.com/blog/cloudflare-r2-vs-aws-s3-comparison) — Pricing and performance
- [Google Cloud TTS Pricing](https://cloud.google.com/text-to-speech/pricing) — Free tier limits (1M chars/month Neural2)
- [AssemblyAI: Top TTS APIs 2026](https://www.assemblyai.com/blog/top-text-to-speech-apis) — TTS comparison and pricing
- [BullMQ Docs: Delayed Jobs](https://docs.bullmq.io/guide/jobs/delayed) — Delayed job implementation
- [BullMQ Docs: Job Schedulers](https://docs.bullmq.io/guide/job-schedulers) — Scheduler API (v5.16+)
- [GitHub: Words-CEFR-Dataset](https://github.com/Maximax67/Words-CEFR-Dataset) — CEFR word list with POS + frequency
- [ECOSIRE: Vitest vs Jest for NestJS 2026](https://ecosire.com/blog/vitest-testing-nestjs-guide) — Migration results, CI timing
- [Next.js Docs: Testing](https://nextjs.org/docs/app/guides/testing) — Official Vitest + Playwright setup
- [Turborepo: NestJS + Next.js example PR](https://github.com/vercel/turborepo/pull/10792) — Official monorepo template
- [Prisma Docs: NestJS integration](https://www.prisma.io/docs/guides/nestjs) — PrismaService pattern
- [DEV: Best ORM for NestJS 2025](https://dev.to/sasithwarnakafonseka/best-orm-for-nestjs-in-2025-drizzle-orm-vs-typeorm-vs-prisma-229c) — Prisma vs TypeORM vs Drizzle
- [npm: bullmq](https://www.npmjs.com/package/bullmq) — Latest version (5.78.0 as of June 2026)
- [MinIO: Self-hosted Docker guide](https://blog.sachasmart.com/minio/) — Local dev setup
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
