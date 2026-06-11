# Project Research Summary

**Project:** English Learning Platform (EFL EdTech SaaS)
**Domain:** B1/B2/C1 adult English-as-a-Foreign-Language web application
**Researched:** 2026-06-11
**Confidence:** HIGH

## Executive Summary

This is a full-stack EFL SaaS platform targeting the underserved B1–C1 adult learner segment — the precise range where Duolingo stops being useful and where no single competitor combines authentic content, deep vocabulary (collocations/phrasal verbs/idioms), SRS, and structured skill progression. The recommended architecture is a Turborepo monorepo with Next.js 14 on the frontend and a standalone NestJS 11 API backend, not Next.js Route Handlers. The heavy backend workloads — SRS scheduling, a multi-stage content crawl pipeline, AI exercise generation, and notification delivery via BullMQ — require the module isolation, dependency injection, and independent worker processes that NestJS provides. PostgreSQL 16 with Prisma 6 handles all relational data; Redis 7 serves both BullMQ job queues and API caching (as two separate instances); Cloudflare R2 with MinIO locally stores all binary audio assets at zero egress cost.

The platform's competitive differentiation is clear and achievable: authentic CEFR-classified reading and listening content, vocabulary-in-context acquisition with SRS integration, synchronized interactive transcripts, and a sub-level CEFR progress indicator ("High B1 / 75% to B2"). These are gaps that Duolingo, Quizlet, and Busuu all leave open at B1+. The content pipeline — Playwright/Cheerio crawler, rule-based CEFR classifier, template-based exercise generator, BullMQ workers — is both the platform's biggest architectural complexity and its primary moat once seeded.

The two highest-risk areas are (1) scope paralysis — the full feature set is large enough that a naive build order could produce nothing deployable for months — and (2) infrastructure correctness under the SRS scheduling system. Using a single Redis instance for both caching and BullMQ queues can cause delayed SRS jobs to be silently evicted via memory eviction policies, corrupting the core review scheduling loop for every user. Both risks have clear prevention strategies that must be baked into the earliest phases of the roadmap.

## Key Findings

### Recommended Stack

The stack is tightly specified and well-justified. Next.js 14 (pinned to `^14.2.25+` for CVE-2025-29927 security patch) with App Router and Shadcn UI handles the frontend. NestJS 11 (Node.js 20+, Express v5, SWC compiler) is the standalone API and background worker host. The critical architectural decision is that NestJS runs as a separate `apps/api` process — not embedded in Next.js Route Handlers — because the platform has 6+ BullMQ queue workers that must run independently of the web process. PostgreSQL 16 with Prisma 6 provides the relational schema. Redis 7 must be split into two instances: one with `noeviction` + AOF persistence for BullMQ, one for HTTP caching. Cloudflare R2 + MinIO provide zero-egress S3-compatible binary storage. Google Cloud TTS Neural2 voices (1M chars/month free tier) cover the entire initial vocabulary corpus without cost. The CEFR classifier is rule-based rather than LLM-based — LLM classification costs $10–50 per full corpus run versus effectively zero for the word-frequency lookup approach.

**Core technologies:**
- **Next.js 14 (pinned `^14.2.25+`)**: Frontend + App Router — do not upgrade to 15/16 mid-project; async request API changed in Next.js 15
- **NestJS 11**: Standalone REST API + BullMQ worker host — 70% higher throughput than Route Handlers; enforces module isolation
- **PostgreSQL 16 + Prisma 6**: Primary store — relational model correct for SRS state, progress tracking, content relationships
- **Redis 7 (two instances)**: BullMQ transport (noeviction + AOF) and HTTP/session cache — must be separate
- **BullMQ 5.x**: 6 named queues with jobId deduplication for SRS; FlowProducer for pipeline chaining
- **Cloudflare R2 + MinIO**: Zero-egress audio storage; single env var swaps local/prod
- **Google Cloud TTS Neural2**: Pronunciation audio; free tier covers entire initial 5,000-word corpus
- **Turborepo 2.x + pnpm 9.x**: `apps/web`, `apps/api`, `packages/shared`, `packages/database`, `packages/tts`
- **Tailwind 3.x + Shadcn UI**: Stay on Tailwind 3; Tailwind 4 broke Shadcn compatibility in 2025
- **Vitest 2.x + Playwright 1.x**: 4–5x faster than Jest in CI; Playwright reuses the crawler dependency

### Expected Features

The market has a clear strategic gap: the B2/C1 ceiling. Every major competitor stalls at B2. This platform can own the B1–C1 adult learner segment by combining authentic content, collocations-first vocabulary, and a clear sub-level progress indicator.

**Must have (table stakes):**
- CEFR placement test with per-skill sub-scores (grammar / vocabulary / reading / listening separately)
- All content organized and filterable by CEFR level
- SRS vocabulary review with SM-2 (or FSRS) scheduling and a visual due-today queue
- Multiple exercise types per module (fill-blank, MC, matching, drag-drop, sentence transformation)
- Progress dashboard with streak, XP, skill breakdown, and review queue count (max 5–6 metrics)
- Playback speed control for listening content (0.5x–1.5x)
- Transcript for every listening exercise (locked until first attempt, then revealed as scaffold)
- Text highlighting and persistent notes in reading passages
- Mobile-responsive design (60%+ of EdTech sessions are mobile)
- Error correction with explanation on every wrong answer
- Streak with protection mechanic (1 free freeze per 7 days — not a purchase dark pattern)
- Dark mode (CSS variables + next-themes)
- Search across all content (PostgreSQL full-text GIN index)
- Bookmarking and quiz results history

**Should have (competitive differentiators):**
- Authentic crawled content (VOA, BBC Learning English) at all CEFR levels
- Vocabulary-in-context extraction during reading (LingQ-style word-status tracking → SRS)
- Collocations, phrasal verbs, and idioms as first-class vocabulary types
- Synchronized interactive transcript (click any word to replay; click to add to SRS)
- Sub-level CEFR progress indicator ("High B1 / 75% to B2") — unique in the market
- Adaptive difficulty routing based on per-skill accuracy history
- Post-listening vocabulary harvest modal (5–10 key words after exercise completion)
- AI-generated exercise variety (20+ exercise types, 30–50 per grammar lesson)
- Mastery-based skill badges tied to accuracy thresholds

**Defer to v2+:**
- Social peer correction / community writing board (cold-start problem; useless without an active user base)
- Real-time AI chat tutor (live LLM cost + latency; explicitly out of scope in PROJECT.md)
- Speaking/pronunciation evaluation (requires ASR pipeline; out of scope)
- Native mobile app (API-first architecture supports it later)
- Official CEFR certification (requires accreditation; legally complex)

### Architecture Approach

The architecture is three-tier: Next.js frontend (presentation), NestJS API + worker (business logic and background processing), and a data layer of PostgreSQL + Redis + R2. Ten NestJS modules mirror the learning modules (grammar, vocabulary, reading, listening, quiz, SRS, gamification, adaptive, search, pipeline). The pipeline module is architecturally the most complex: it uses BullMQ's `FlowProducer` to chain crawl → normalize → CEFR classify → exercise generate → store as dependent job stages, each independently retryable and inspectable via Bull Board. The adaptive engine is rule-based in-process in NestJS (not a separate microservice). All exercises are pre-generated and stored in PostgreSQL — zero AI latency at request time.

**Major components:**
1. **Next.js 14 (apps/web)** — UI, App Router, auth session via NextAuth v5; RSC for page shells; client components for interactive exercises
2. **NestJS API (HTTP mode)** — REST endpoints, auth JWT validation, business logic, gamification events, adaptive recommendations
3. **NestJS Worker (WORKER_ONLY=true)** — BullMQ processors: crawl, CEFR classify, exercise generation, SRS scheduling, TTS generation, notifications
4. **PostgreSQL 16** — Durable store; 10 critical composite indexes defined before first migration; build order: Users → Content → Exercise → SRS → Progress → Gamification → Pipeline
5. **Redis 7 (two instances)** — BullMQ transport (noeviction + AOF) and API/session cache (TTL-based, separate policies)
6. **Cloudflare R2 / MinIO** — Binary audio storage; content-addressed TTS keys (`sha256(word+voice).mp3`) prevent duplicate generation
7. **packages/shared** — Zod schemas and TypeScript types shared by both Next.js and NestJS; eliminates type drift at the HTTP boundary
8. **packages/database** — Single Prisma schema; never imported by Next.js directly (all data access goes through the NestJS API)

### Critical Pitfalls

1. **Single Redis instance for BullMQ + cache** — If the Redis instance used for HTTP session caching applies `allkeys-lru` eviction, BullMQ delayed SRS jobs are silently deleted. Users never receive review reminders; vocabulary retention collapses invisibly. Fix: separate Redis service in Docker Compose with `maxmemory-policy noeviction` and `appendonly yes`. Must be done in Phase 1 infrastructure — cannot be retrofitted without data loss.

2. **SRS ease-factor floor (Anki ease hell)** — SM-2 with a hard EF floor of 1.30 traps difficult vocabulary in permanent short-interval purgatory. Words answered "Good" repeatedly never recover because "Good" in the Anki variant neither increases nor decreases EF. Fix: add mean-reversion (+0.05 EF after 3 consecutive correct recalls at the floor) or use FSRS (Anki's current algorithm since 23.10, which eliminates this structurally). Decide before seeding 5,000 vocabulary records.

3. **CEFR classifier systematic over-classification** — Proper nouns, technical terms, and compound conjunctions inflate the vocabulary difficulty score, consistently classifying B2 content as C1. Result: B1 content shelf is empty after crawling. Fix: exclude proper nouns (NER tagging), numbers, and dates from vocabulary difficulty scoring; use 75th-percentile sentence difficulty (not mean); trust source-level labels when VOA/BBC provide them.

4. **Next.js App Router serves stale SRS due-counts** — Router Cache (30-second default lifetime) shows old due counts on dashboard after a user completes a review session. Fix: call `revalidatePath` and `revalidateTag('srs-due-count')` inside server actions after SRS mutations; use Client Components with local state for the interactive review session itself.

5. **Prisma seeding 20,000+ records with `create()` in a loop** — Sequential single-row INSERTs for 20K exercises run for 2–4 hours. Fix: use `createMany()` in batches of 500–1,000 and `$executeRaw` multi-row bulk inserts. Target: full seed under 10 minutes.

## Implications for Roadmap

The build order is driven by three hard constraints from research: (1) infrastructure correctness must precede all data work, (2) the platform must never be empty — seed data and core modules must ship together as a deployable demo, and (3) each phase must produce a deployed URL to prevent scope paralysis (the single biggest risk for a project of this scope and complexity).

### Phase 1: Foundation and Infrastructure

**Rationale:** All subsequent phases depend on the monorepo scaffold, Docker environment, and database schema being correct. The Redis split (cache vs. BullMQ with different memory policies) must be configured here — it cannot be retrofitted without data loss. The Prisma schema with all composite indexes must be finalized before any data is inserted. Auth (NextAuth v5 + NestJS JWT bridge) must be working before any feature module can be tested end-to-end.
**Delivers:** Turborepo monorepo scaffold; Docker Compose with PostgreSQL, Redis (two instances), MinIO; full Prisma schema with all tables and composite indexes; NextAuth v5 login/register/OAuth with NestJS JWT bridge; deployed authentication shell
**Addresses:** Authentication (table stakes for any feature)
**Avoids:** Redis eviction pitfall (configure noeviction + AOF for BullMQ Redis here), missing composite index pitfall (all `@@index` blocks before first migration), CVE-2025-29927 (pin Next.js `^14.2.25+`)

### Phase 2: Vocabulary Module and SRS Core

**Rationale:** The SRS vocabulary loop is the single most critical daily engagement mechanic. It underpins both the reading and listening modules (both harvest vocabulary into SRS). Building it second ensures the SRS algorithm and BullMQ scheduling are battle-tested before 5,000 records are scheduled. TTS generation and R2 storage are also validated here at small scale.
**Delivers:** Vocabulary CRUD + delivery API; SM-2 or FSRS algorithm implemented and unit-tested; BullMQ SRS review scheduling with jobId deduplication; flashcard UI (Flashcard, Learn, Cloze, Recall modes); TTS pronunciation via Google Cloud Neural2 + R2 content-addressed cache; gamification foundation (XP events, streak, achievements via NestJS EventEmitter); 5,000 vocabulary records seeded; deployed review session accessible at a URL
**Addresses:** SRS vocabulary review (table stakes), pronunciation audio, vocabulary-in-context with example sentences, achievement system, complexity-weighted XP
**Avoids:** SRS ease-factor hell (mean-reversion or FSRS before seeding), BullMQ Redis eviction, Prisma seeding performance (createMany bulk inserts)

### Phase 3: Grammar Module

**Rationale:** Grammar is the second pillar of the daily learning loop and provides the grammar sub-score that the placement test requires in a later phase. The exercise generator (template-based v1) must be built here. Building gamification on top of a second complete module validates the XP/streak system against real usage patterns.
**Delivers:** 10 grammar topic areas with lesson CRUD; exercise delivery engine (MC, fill-blank, drag-drop, sentence transformation); template-based AI exercise generator with topic rotation and CEFR validation gate; 500 grammar lessons seeded; deployed grammar lesson flow with XP display and streak
**Addresses:** Grammar module (table stakes), multiple exercise types, achievement unlocking
**Avoids:** AI exercise homogeneity pitfall (topic rotation and exclusion lists in prompt templates from day one), over-gamification pitfall (complexity-weighted XP from the start — C1 exercises award more XP than B1 exercises)

### Phase 4: Reading Comprehension Module and Content Pipeline

**Rationale:** Reading is the platform's primary differentiator. The content pipeline must be validated on a 50–100 URL sample before the 2,000-URL bulk crawl. The CEFR classifier proper noun exclusion fix must be in place before bulk classification. This phase is deliberately scheduled after vocabulary and grammar so the pipeline can also regenerate exercises for those modules if needed.
**Delivers:** Playwright + Cheerio crawler with content quality gate (word count filter, boilerplate blocklist, deduplication hash); CEFR classifier with proper noun exclusion, 75th-percentile scoring, manual override table; BullMQ FlowProducer pipeline (crawl → normalize → classify → generate → store); reading passage delivery API; reading UI with text highlighting, persistent notes, bookmarking, post-reading comprehension questions; 2,000 reading passages seeded and CEFR-validated; deployed reading module
**Addresses:** Reading comprehension module (table stakes), authentic crawled content (differentiator), text highlighting/notes/bookmarking (table stakes)
**Avoids:** CEFR over-classification (validate on 50-URL sample before bulk crawl), crawler boilerplate ingestion (quality gate before bulk insert), VOA copyright issue (byline detection to filter AP/Reuters-credited stories)

### Phase 5: Listening Comprehension Module

**Rationale:** Listening builds directly on the pipeline established in Phase 4. The synchronized interactive transcript is a key differentiator but requires timestamp data — this is a separate, harder task from basic transcript display and must be scoped separately.
**Delivers:** Listening transcript delivery API; R2 audio streaming; listening UI with playback speed control (0.5x–1.5x), transcript reveal scaffold, synchronized interactive transcript (word highlighting + click-to-replay); post-listening vocabulary harvest modal; 1,000 listening transcripts seeded; deployed listening module
**Addresses:** Listening comprehension module (table stakes), playback speed control (table stakes), transcript reveal (table stakes), interactive synchronized transcript (differentiator), post-listening vocabulary harvest (differentiator)
**Avoids:** Over-instrumented analytics pitfall (harvest modal shows only 5–10 key words)

### Phase 6: Quiz Center and Placement Test

**Rationale:** The placement test architecturally requires all four skill modules to exist (it uses grammar, vocabulary, reading, and listening sub-scores). This phase is correctly ordered last among the content phases despite being "the first thing a user does" logically. Building it before modules exist would require mock data and then a painful replacement.
**Delivers:** Quiz engine (session creation, answer submission, results storage); mixed-skill quizzes; topic-based quizzes; CEFR placement test with per-skill sub-scores and sub-level output ("High B1"); quiz results history; re-assessment prompt after 30 days of activity; deployed quiz center
**Addresses:** Quiz center (table stakes), CEFR placement test (table stakes), multi-skill sub-score output (differentiator), results history (table stakes)
**Avoids:** Placement test before modules exist (correctly ordered last)

### Phase 7: Adaptive Learning and Progress Dashboard

**Rationale:** The adaptive engine requires actual per-user accuracy data to be meaningful. Ordering it after 4–6 content modules ship means real data exists to calibrate the weak-skill detection thresholds. The full progress dashboard also depends on all progress tracking being in production.
**Delivers:** `UserSkillScore` aggregation updated after each attempt; adaptive recommendation engine (weak skill detection, difficulty calibration, topic gap analysis, SRS backlog detection); recommendations API with 6-hour Redis cache; "What to do next" widget; sub-level CEFR progress indicator ("75% to B2"); weekly skill challenge; full progress dashboard (streak, XP, skill breakdown, review queue, weekly heatmap — max 6 metrics); email notification system (daily reminder + SRS due alert)
**Addresses:** Adaptive difficulty routing (differentiator), sub-level progress indicator (differentiator), progress dashboard (table stakes), email reminders (table stakes), weekly challenge (differentiator)
**Avoids:** Over-instrumented analytics (actionable "what to do next" recommendation, not raw charts), adaptive engine without data (correctly ordered after content modules exist)

### Phase 8: Vocabulary-in-Context Integration and Polish

**Rationale:** Vocabulary extraction from reading (word-status tracking, click-to-add-to-SRS) requires both reading and SRS to be stable in production. It compounds the value of both but is too complex to build while either is still being validated. This phase also includes the seed validation gate and admin tooling.
**Delivers:** Word-status tracking during reading (LingQ-style blue/yellow/white); tap-to-define inline; click-to-add-to-SRS from reading passages; collocation/phrasal verb/idiom tagging in vocabulary; "continue where you left off" session persistence; admin content management UI; performance audit (index analysis, Redis hit rate, query plan review); seed validation (>100 items per CEFR level per module confirmed before sign-off)
**Addresses:** Vocabulary-in-context extraction from reading (differentiator), collocation vocabulary types (differentiator), session persistence (differentiator)
**Avoids:** Empty CEFR level shelf (seed validation query run as phase exit gate)

### Phase Ordering Rationale

- Infrastructure before data: Redis split and Prisma composite indexes must be correct before any records are inserted. These cannot be retrofitted without data migrations and Redis reconfiguration under load.
- SRS before content modules: The SRS algorithm and BullMQ job patterns need to be correct before 5,000 vocabulary records are scheduled. Changing the algorithm post-seeding requires a database migration of all card states.
- Content pipeline validated on sample before bulk crawl: The CEFR classifier and crawler quality gate must be tested on 50–100 URLs before the 2,000-URL crawl. A misconfigured classifier on a bulk run means hours of wasted compute and a mis-labeled content shelf.
- Placement test last among content phases: It is logically the first user-facing step but architecturally requires all four skill modules to exist. Ordering it last prevents it from blocking earlier phases with mock data.
- Adaptive engine after content data exists: Rule-based adaptive routing calibrated on zero user events is noise. It needs actual per-skill accuracy data from deployed content modules to produce meaningful recommendations.
- Vocabulary-in-context as integration layer: This feature touches both reading and SRS. Building it after both are stable in production prevents compounding instability from two simultaneously evolving systems.

### Research Flags

Phases likely needing deeper research during planning:

- **Phase 2 (SRS):** FSRS vs SM-2 algorithm selection must be resolved in planning before any SRS code is written. FSRS eliminates ease hell structurally but has fewer community implementations. Also: `queue.addBulk()` patterns for the initial vocabulary import (5,000 records × delayed jobs in a single Redis pipeline call).
- **Phase 4 (Content Pipeline):** Crawler selector specificity for VOA and BBC Learning English needs validation against current page templates. Legal review of VOA public domain scope vs. AP/Reuters syndicated content (byline detection pattern needed). CEFR classifier accuracy must be empirically validated on a 50-URL sample before proceeding — if accuracy is below 60%, NER integration (spaCy or equivalent) may be required.
- **Phase 5 (Listening):** Synchronized transcript timestamp availability is a critical unknown. Whether VOA/BBC provide WebVTT/SRT timestamps with audio files, or whether timestamps must be generated via forced-alignment tooling, has significant pipeline complexity implications. This must be validated against 5–10 actual source files before Phase 5 planning.
- **Phase 7 (Adaptive):** The 60%/80% accuracy thresholds cited in research are starting points. The adaptive engine needs monitoring instrumentation from day one so thresholds can be adjusted based on actual user behavior.

Phases with standard patterns (research-phase can be skipped):

- **Phase 1 (Foundation):** Well-documented Turborepo + NestJS + Next.js monorepo patterns with official examples. Prisma + NestJS PrismaService pattern is in Prisma's official docs.
- **Phase 3 (Grammar):** NestJS module + EventEmitter gamification pattern is standard. Template-based exercise generation is straightforward text templating with no new infrastructure.
- **Phase 6 (Quiz Center):** Quiz engine pattern (create session, submit answer, return results) is a standard REST state machine with no unusual dependencies.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Core technologies verified against official release notes (NestJS 11 blog, Prisma 6 changelog, BullMQ 5 npm). Version compatibility matrix is explicit and cross-checked (React 18 with Next.js 14, Tailwind 3 with Shadcn, BullMQ 5 requiring Redis 6.2+). |
| Features | HIGH | Verified against competitor product documentation (Duolingo, LingQ, ELSA, Busuu), peer-reviewed gamification studies (Frontiers 2024 meta-analysis), SRS retention research (Karpicke & Roediger), and analytics motivation research (SoLAR 2022, MDPI 2025). |
| Architecture | HIGH | Architecture decisions are internally consistent across STACK.md and ARCHITECTURE.md. Database schema, index strategy, build order, caching strategy, and anti-patterns are coherent and derived from official documentation (BullMQ FlowProducer, Prisma relations, NestJS EventEmitter). |
| Pitfalls | HIGH | Critical pitfalls verified against official sources: CVE-2025-29927 (Next.js security blog), BullMQ Redis persistence (BullMQ production guide), SM-2 ease floor (Anki official FAQ), Prisma bulk insert performance (GitHub issue #3835). |

**Overall confidence:** HIGH

### Gaps to Address

- **FSRS vs SM-2 selection:** Must be decided in Phase 2 planning before any SRS code is written. Wrong choice is a painful migration after 5,000 cards are scheduled. Recommendation: use FSRS if a well-maintained Node.js FSRS library exists; fall back to SM-2 with mean-reversion if FSRS library quality is insufficient.
- **Listening transcript timestamp availability:** Whether VOA/BBC provide WebVTT/SRT timestamps determines whether the synchronized transcript is a 2-day or 2-week implementation. Validate against 5–10 actual source audio files before Phase 5 planning.
- **AI exercise generator concrete provider:** The `ExerciseGeneratorProvider` interface is correctly abstracted. The Phase 3 stub is template-based. The actual provider (OpenAI/Claude/Ollama) needs to be selected before Phase 4 exercises require real quality at scale. Cost, rate limits, and prompt reliability differ significantly.
- **CEFR classifier accuracy on actual corpus:** The 70–75% rule-based accuracy figure is a research estimate. Empirical validation on VOA/BBC content is required in Phase 4 before bulk crawling. If accuracy falls below 60%, NER integration is needed — this changes the Phase 4 scope estimate.

## Sources

### Primary (HIGH confidence)
- [Trilon: Announcing NestJS 11](https://trilon.io/blog/announcing-nestjs-11-whats-new) — NestJS 11 features, Express v5, SWC default
- [Cloudflare: R2 vs AWS S3](https://www.cloudflare.com/pg-cloudflare-r2-vs-aws-s3/) — Egress fee comparison
- [Google Cloud TTS Pricing](https://cloud.google.com/text-to-speech/pricing) — Free tier limits (1M chars/month Neural2)
- [BullMQ Docs: Delayed Jobs](https://docs.bullmq.io/guide/jobs/delayed) — SRS scheduling
- [BullMQ Docs: Going to Production](https://docs.bullmq.io/guide/going-to-production) — Redis persistence requirements
- [BullMQ Docs: Flows](https://docs.bullmq.io/guide/flows) — FlowProducer pipeline chaining
- [Anki FSRS FAQ](https://faqs.ankiweb.net/what-spaced-repetition-algorithm) — SM-2 ease floor, FSRS migration
- [Prisma Docs: NestJS integration](https://www.prisma.io/docs/guides/nestjs) — PrismaService pattern
- [Next.js Security Update CVE-2025-29927](https://nextjs.org/blog/security-update-2025-12-11) — Middleware auth bypass, patched versions
- [Frontiers: Gamification influence on motivation 2024](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2024.1295709/full) — Adult learner gamification research
- [SoLAR: Learning Analytics Dashboards 2022](https://www.solaresearch.org/2022/03/dashboards-for-learners-dont-always-motivate-them/) — Dashboard motivation research
- [GitHub: Words-CEFR-Dataset](https://github.com/Maximax67/Words-CEFR-Dataset) — CEFR word frequency list
- [Turborepo: NestJS + Next.js example](https://github.com/vercel/turborepo/pull/10792) — Official monorepo template

### Secondary (MEDIUM confidence)
- [tech-insider.org: NestJS vs Next.js performance 2026](https://tech-insider.org/nestjs-vs-nextjs-2026/) — 70% throughput gap benchmark
- [ECOSIRE: Vitest vs Jest for NestJS 2026](https://ecosire.com/blog/vitest-testing-nestjs-guide) — CI timing comparison
- [Taalhammer: Multi-platform B1–C1 comparison](https://www.taalhammer.com/taalhammer-vs-duolingo-busuu-babbel-anki-lingq-which-language-learning-app-reaches-c1c2-in-english-fastest/) — Competitor gap analysis
- [LingQ Review 2026](https://www.lingq.com/blog/lingq-review/) — Word-status tracking system
- [Migaku SRS guide 2026](https://migaku.com/blog/language-fun/spaced-repetition-for-language-learners-a-2026-guide) — SRS review format research
- [CEFR classification consistency study (ResearchGate 2025)](https://www.researchgate.net/publication/393805731_Evaluating_the_consistency_of_automated_CEFR_analyzers_a_study_of_English_language_text_classification) — Rule-based classifier accuracy estimates
- [MDPI Dashboard Design Principles 2025](https://www.mdpi.com/2076-3417/15/21/11493) — Analytics display recommendations
- [DigitalApplied: Redis Caching Strategies for Next.js](https://www.digitalapplied.com/blog/redis-caching-strategies-nextjs-production) — TTL guidance, cache-aside pattern
- [MINDOMAX: FSRS vs SM-2](https://www.mindomax.com/fsrs-vs-sm2-spaced-repetition-algorithm) — Algorithm comparison

### Tertiary (LOW confidence — validate during implementation)
- [Taalhammer: Streak culture critique 2026](https://www.taalhammer.com/why-daily-streak-apps-often-fail-serious-learners-and-which-language-learning-app-works-better-instead-in-2026) — Streak anxiety for adult learners (single source; directional conclusion supported by Frontiers 2024)
- [LLM CEFR accuracy (ScienceDirect 2025)](https://www.sciencedirect.com/science/article/pii/S2772766125000205) — LLM over-classification at B2 (validates proper noun exclusion fix; specific figures need validation on actual VOA/BBC corpus)
- CEFR 70–75% rule-based accuracy estimate — directional confidence is HIGH; specific accuracy on this corpus requires empirical validation in Phase 4

---
*Research completed: 2026-06-11*
*Ready for roadmap: yes*
