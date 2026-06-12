# Roadmap: English Learning Platform

## Overview

Eight phases take the platform from an empty monorepo to a fully seeded, adaptive English learning SaaS. Phases are ordered by dependency: infrastructure correctness before data, SRS core before all modules that harvest into it, content pipeline validated on a sample before bulk crawl, and the adaptive engine last so it operates on real user data rather than noise. Each phase ends at a deployable, smoke-testable boundary — no phase produces work that is invisible until a later phase completes it.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation + Infrastructure** - Monorepo scaffold, Docker services, full Prisma schema, deployable skeleton (completed 2026-06-11)
- [x] **Phase 2: Authentication + User Profile** - Secure account creation, login, OAuth, session management, user profile (completed 2026-06-12)
- [ ] **Phase 3: Vocabulary Module + SRS Core** - Vocabulary browsing, 6 exercise types, FSRS scheduling, review queue
- [ ] **Phase 4: Grammar Module** - Grammar topic browsing, lesson explanations, 5 exercise types, mastery tracking
- [ ] **Phase 5: Reading Comprehension + Content Pipeline** - Reading passages with highlights/notes/bookmarks, crawler, CEFR classifier, seed scripts, vocab-in-context
- [ ] **Phase 6: Listening Comprehension** - Audio player, karaoke transcript, 6 exercise types, tap-to-SRS
- [ ] **Phase 7: Quiz Center + Gamification** - Mixed-skill quizzes, topic quizzes, full XP/level/achievement system
- [ ] **Phase 8: Adaptive Engine + Dashboard + Search + Analytics** - Weak-topic routing, personalized recommendations, full dashboard, global search, student and admin analytics

## Phase Details

### Phase 1: Foundation + Infrastructure

**Goal**: The full project skeleton is running locally and deployable to a VPS — monorepo, Docker services, schema, and skeleton apps all pass smoke tests with zero feature logic
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: *(no user-facing v1 requirement IDs — this phase enables all others)*
**Success Criteria** (what must be TRUE):

  1. `docker compose up` starts PostgreSQL 16, two Redis 7 instances (BullMQ with noeviction+AOF, and HTTP cache), and MinIO without errors
  2. `pnpm db:migrate` runs the full Prisma schema (all tables and composite indexes) against the running Postgres container with zero errors
  3. The Next.js 14 app and NestJS 11 API both start, serve a health-check endpoint, and return 200 on the smoke-test route
  4. A CLAUDE.md file documents the monorepo layout, Docker topology, and the two-Redis split rationale

**Plans**: 6 plans in 4 waves

**Wave 1** *(no dependencies — run in parallel)*

- [x] 01-01-PLAN.md — Monorepo scaffold (workspace, turbo, shared packages: @repo/tsconfig, @repo/eslint-config, @repo/shared, @repo/database)
- [x] 01-02-PLAN.md — Docker backing services (Postgres 16, Redis BullMQ noeviction+AOF, Redis Cache allkeys-lru, MinIO)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 01-03-PLAN.md — Full Prisma schema (25+ models, all 8 phases) + [BLOCKING] initial migration

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 01-04-PLAN.md — NestJS 11 skeleton (health endpoint, SWC compiler, ValidationPipe, Vitest)
- [x] 01-05-PLAN.md — Next.js 14 skeleton (health route, Tailwind 3.x, transpilePackages, Vitest)

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 01-06-PLAN.md — GitHub Actions CI + Wave 0 Vitest configs + human smoke test checkpoint

**Cross-cutting constraints:**

- Pin Prisma to ^6.19.3 (npm latest is 7.x — breaking changes)
- Turborepo 2.x requires `"tasks"` key in turbo.json (not `"pipeline"`)
- All Docker services bind to 127.0.0.1 in dev (not 0.0.0.0)
- Node.js 20+ base image required for NestJS 11

**UI hint**: yes

### Phase 2: Authentication + User Profile

**Goal**: Users can securely create accounts, sign in via email/password or Google OAuth, manage their sessions, and view their profile
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, PROF-01, PROF-02, PROF-03
**Success Criteria** (what must be TRUE):

  1. User can register with email and password; a verification email is sent and the account is only accessible after clicking the link
  2. User can sign in with a Google account via OAuth and land on the dashboard without a separate registration step
  3. User can request a password-reset link, click it, and set a new password
  4. Authenticated session persists across browser refresh and new tab open; unauthenticated users visiting protected routes are redirected to the login page
  5. User profile page shows name, email, avatar (Google avatar or uploaded), CEFR level badge, and XP total; display name and avatar are editable; CEFR level auto-update from XP thresholds is deferred to Phase 7 (Gamification)

**Plans**: 6 plans in 3 waves

**Wave 1** *(no dependencies — run in parallel)*

- [x] 02-01-PLAN.md — Foundation: passwordHash migration, shared DTOs/JwtPayload, NextAuth v5 config (30-day JWT), NestJS JwtAuthGuard
- [x] 02-02-PLAN.md — shadcn init (New York/zinc) + Inter + (auth) shell + Wave 0 RED test scaffolds

**Wave 2** *(blocked on Wave 1)*

- [x] 02-03-PLAN.md — Email/password registration + email-verification gate (AUTH-01, AUTH-02) [TDD]
- [x] 02-04-PLAN.md — Login + 30-day session persistence + protected-route redirect (AUTH-05, AUTH-06)

**Wave 3** *(blocked on Wave 2)*

- [x] 02-05-PLAN.md — Google OAuth sign-in + password reset (AUTH-03, AUTH-04) [TDD]
- [x] 02-06-PLAN.md — Profile endpoints, avatar presigned upload, CEFR badge (PROF-01, PROF-02, PROF-03) [TDD]

**UI hint**: yes

### Phase 3: Vocabulary Module + SRS Core

**Goal**: Users can browse vocabulary sets, practice words with six exercise types, and enter words into a spaced-repetition review schedule that surfaces due cards on the dashboard
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: VOCAB-01, VOCAB-02, VOCAB-03, VOCAB-04, VOCAB-05, VOCAB-06, VOCAB-07
**Success Criteria** (what must be TRUE):

  1. User can browse 8 vocabulary categories and open any word entry to see meaning, pronunciation guide, example sentences, synonyms, and common usage
  2. User can practice a vocabulary set using at least 3 exercise types (flashcard flip, cloze test, matching) within a single session
  3. User can mark a word as "learned"; it appears in their vocabulary list with status "learning" and a next-review date
  4. Due vocabulary reviews appear in a dedicated review queue; completing a session with Again/Hard/Good/Easy ratings reschedules each card using the FSRS algorithm at the correct next interval
  5. User can view their full personal vocabulary list filtered by status (new / learning / reviewing / mastered)

**Plans**: 6 plans in 5 waves

**Wave 1** *(no dependencies)*

- [x] 03-01-PLAN.md — Foundation: install ts-fsrs/framer-motion/react-query, shared DTOs, 200-word seed + demo user, QueryProvider, middleware, Wave 0 RED scaffolds [has checkpoint]

**Wave 2** *(blocked on Wave 1)*

- [x] 03-02-PLAN.md — VocabularyModule API: categories, paginated word list, word detail, my-words (VOCAB-01, VOCAB-02, VOCAB-03, VOCAB-07) [TDD]

**Wave 3** *(blocked on Wave 2)*

- [ ] 03-03-PLAN.md — SrsModule API: enroll, due queue, FSRS review, session-complete (VOCAB-04, VOCAB-05, VOCAB-06) [TDD]

**Wave 4** *(blocked on Wave 3 — parallel)*

- [ ] 03-04-PLAN.md — Vocabulary browse/detail/enroll UI slice (VOCAB-01, VOCAB-02, VOCAB-04)
- [ ] 03-05-PLAN.md — Practice session slice: 6 exercise types + results + add-to-SRS (VOCAB-03, VOCAB-04)

**Wave 5** *(blocked on Wave 4)*

- [ ] 03-06-PLAN.md — Review queue + my-words slice + phase end-to-end verification (VOCAB-06, VOCAB-07) [has checkpoint]

**UI hint**: yes

### Phase 4: Grammar Module

**Goal**: Users can study any of 10 grammar topic areas through structured lesson explanations and varied exercise types, with their mastery percentage tracked per topic
**Mode:** mvp
**Depends on**: Phase 3
**Requirements**: GRAM-01, GRAM-02, GRAM-03, GRAM-04, GRAM-05, GRAM-06
**Success Criteria** (what must be TRUE):

  1. User can browse grammar topics organized into 10 named areas and open any topic to see a list of available lessons
  2. Each lesson page shows an explanation section with examples and visual learning blocks before any exercises begin
  3. A grammar lesson session presents at least 3 distinct exercise types (e.g., multiple choice, fill-in-the-blank, sentence transformation) and each topic has at least 20 practice questions total
  4. Completing a lesson's assessment quiz stores the score against the user's profile; the grammar topic page shows the user's mastery percentage
  5. User can re-attempt exercises from a topic where their accuracy was weak

**Plans**: TBD
**UI hint**: yes

### Phase 5: Reading Comprehension + Content Pipeline

**Goal**: Users can read CEFR-filtered passages with highlights, notes, and bookmarks, answer comprehension questions, and tap unknown words to add them to their SRS queue — all backed by a seeded content database populated by the crawler and CEFR classifier
**Mode:** mvp
**Depends on**: Phase 4
**Requirements**: READ-01, READ-02, READ-03, READ-04, READ-05, READ-06, READ-07, PIPE-01, PIPE-02, PIPE-03, PIPE-04, PIPE-05, PIPE-06, VOCAB-08
**Success Criteria** (what must be TRUE):

  1. User can browse reading passages filtered by CEFR level (B1/B2/C1), topic, and content type; at least 2,000 passages are present in the database after seeding
  2. Each passage page shows at least 6 comprehension questions; completing them stores a score against the user's reading progress
  3. User can highlight text in a passage and take notes; both persist on re-visit; user can bookmark a passage and find it later on the bookmarks list
  4. User can tap an unknown word in a passage to see its meaning and add it to their SRS queue with that sentence as context
  5. The seed script completes within a practical time window (under 10 minutes on the target machine) using Prisma createMany batching, and every CEFR level shelf contains content

**Plans**: TBD
**UI hint**: yes

### Phase 6: Listening Comprehension

**Goal**: Users can browse, listen to, and answer exercises on audio content, with playback controls, a locked-then-revealed karaoke transcript, and one-tap vocabulary harvesting from the transcript
**Mode:** mvp
**Depends on**: Phase 5
**Requirements**: LIST-01, LIST-02, LIST-03, LIST-04, LIST-05, LIST-06, LIST-07
**Success Criteria** (what must be TRUE):

  1. User can browse listening content filtered by CEFR level, topic, and content type; the audio player loads and plays without buffering errors
  2. Each listening item includes at least 3 exercise types; completing the exercise session stores a score against the user's listening progress
  3. Audio player supports playback speed control at 0.75×, 1×, 1.25×, and 1.5× and allows section replay
  4. The full transcript is locked (hidden) during the exercise and automatically unlocks after the user submits their final answer
  5. The unlocked transcript highlights the currently spoken word or phrase in sync with audio; user can tap any transcript word to add it to their SRS vocabulary queue

**Plans**: TBD
**UI hint**: yes

### Phase 7: Quiz Center + Gamification

**Goal**: Users can take mixed-skill and topic-based quizzes, review their mistakes, and experience a complete gamification system — complexity-weighted XP, a 1–100 level system with content unlocks, achievement badges, and an XP audit log
**Mode:** mvp
**Depends on**: Phase 6
**Requirements**: QUIZ-01, QUIZ-02, QUIZ-03, QUIZ-04, QUIZ-05, GAME-01, GAME-02, GAME-03, GAME-04, GAME-05
**Success Criteria** (what must be TRUE):

  1. User can start a mixed-skill quiz session and answer grammar, vocabulary, reading, and listening questions in sequence; the session stores score, accuracy, time taken, and incorrect items
  2. User can take a topic-based quiz filtered by topic (technology, travel, business, daily communication)
  3. After completing any quiz, user can view a mistake-review screen showing each incorrect question with an explanation
  4. User earns XP after completing any lesson or quiz; harder and higher-CEFR exercises award more XP than easy ones; XP accumulates to a visible level (1–100) displayed on the profile and dashboard
  5. Achievement badges are awarded automatically at defined milestones (first lesson, 100 vocab words, grammar topic mastered, 30-day activity, etc.) and displayed on the profile page with earned date; every XP event is recorded in an audit log

**Plans**: TBD
**UI hint**: yes

### Phase 8: Adaptive Engine + Dashboard + Search + Analytics

**Goal**: Users see a personalized dashboard with actionable recommendations surfacing their weakest skills, can search all content, and can view detailed skill analytics — plus admins can monitor platform health
**Mode:** mvp
**Depends on**: Phase 7
**Requirements**: ADPT-01, ADPT-02, ADPT-03, ADPT-04, ADPT-05, DASH-01, DASH-02, DASH-03, DASH-04, SRCH-01, SRCH-02, SRCH-03, SRCH-04, ANLT-01, ANLT-02
**Success Criteria** (what must be TRUE):

  1. Dashboard shows current CEFR level, XP progress bar, lessons completed, per-skill scores, daily/weekly activity charts (Recharts), and a skill breakdown radar chart — all populated with real user data
  2. Dashboard "Continue Learning" widget surfaces the user's highest-priority weak topic (accuracy below 60%) after they have completed at least 5 exercises; before that threshold it shows a sensible default
  3. After each completed lesson or quiz, the system updates the user's per-skill scores, flags weak topics, and progressively unlocks harder difficulty tiers once the user scores ≥ 80% on their current tier
  4. Global search returns results across vocabulary, grammar, reading, listening, and quizzes in under 300 ms using PostgreSQL GIN full-text index; results show content type, CEFR level, topic tag, and a text snippet; results are filterable by CEFR level, topic, and skill type
  5. Student analytics page shows CEFR progression over time, vocabulary retention rate, total learning time, and weekly activity heatmap; admin dashboard shows active users, retention rate, top content, and user growth chart

**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation + Infrastructure | 6/6 | Complete   | 2026-06-11 |
| 2. Authentication + User Profile | 6/6 | Complete   | 2026-06-12 |
| 3. Vocabulary Module + SRS Core | 2/6 | In Progress|  |
| 4. Grammar Module | 0/TBD | Not started | - |
| 5. Reading Comprehension + Content Pipeline | 0/TBD | Not started | - |
| 6. Listening Comprehension | 0/TBD | Not started | - |
| 7. Quiz Center + Gamification | 0/TBD | Not started | - |
| 8. Adaptive Engine + Dashboard + Search + Analytics | 0/TBD | Not started | - |
