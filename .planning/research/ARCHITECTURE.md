# Architecture Research

**Domain:** English Learning / EFL EdTech SaaS Web Application
**Researched:** 2026-06-11
**Confidence:** HIGH

---

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          PRESENTATION LAYER                              │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  Next.js 14 (App Router)                                         │   │
│  │  RSC + Client Components · Shadcn UI · Framer Motion · Recharts  │   │
│  └──────────────────────────┬───────────────────────────────────────┘   │
│                              │ HTTP (internal Docker network)            │
└──────────────────────────────┼──────────────────────────────────────────┘
                               │
┌──────────────────────────────┼──────────────────────────────────────────┐
│                          API LAYER                                        │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  NestJS 11 API Server (apps/api)                                  │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────┐  │   │
│  │  │ Grammar  │ │ Vocab    │ │ Reading  │ │Listening │ │ Quiz  │  │   │
│  │  │ Module   │ │ Module   │ │ Module   │ │ Module   │ │Module │  │   │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └───┬───┘  │   │
│  │       └────────────┴────────────┴────────────┴────────────┘      │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────────┐ │   │
│  │  │  Auth    │ │  User/   │ │  SRS     │ │  Adaptive Learning   │ │   │
│  │  │  Module  │ │Gamific.  │ │ Module   │ │     Module           │ │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────────────────┘ │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  NestJS Worker Process (apps/api, WORKER_ONLY=true)             │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────────────┐ │    │
│  │  │ Crawler  │ │  CEFR    │ │Exercise  │ │ SRS Review         │ │    │
│  │  │ Worker   │ │Classify  │ │Gen Worker│ │ Scheduler Worker   │ │    │
│  │  └──────────┘ └──────────┘ └──────────┘ └────────────────────┘ │    │
│  │  ┌──────────────────────────────────────────────────────────┐   │    │
│  │  │ BullMQ Queues: crawl | cefr-classify | exercise-gen      │   │    │
│  │  │                srs-reviews | notifications | tts-gen     │   │    │
│  │  └──────────────────────────────────────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────────┘
                               │
┌──────────────────────────────┼──────────────────────────────────────────┐
│                          DATA LAYER                                       │
│  ┌──────────────────┐  ┌─────────────────┐  ┌────────────────────────┐  │
│  │   PostgreSQL 16   │  │   Redis 7        │  │  Cloudflare R2         │  │
│  │                  │  │                 │  │  (MinIO in dev)         │  │
│  │  Primary store   │  │  BullMQ queues  │  │                        │  │
│  │  User data       │  │  Session cache  │  │  Audio MP3s            │  │
│  │  Content         │  │  API cache      │  │  TTS pronunciation     │  │
│  │  SRS state       │  │  Rate limits    │  │  Crawled media         │  │
│  │  Progress        │  │  OTP tokens     │  │                        │  │
│  └──────────────────┘  └─────────────────┘  └────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Next.js (web) | UI rendering, routing, auth session, RSC data fetching | App Router, RSC for page shells, client components for interactivity |
| NestJS API | Business logic, REST endpoints, auth validation, gamification events | NestJS modules, controllers, services, guards |
| NestJS Worker | BullMQ processors, content pipeline, SRS scheduling | Separate Docker service, `@Processor()` decorators |
| PostgreSQL | Durable storage for all entities | Prisma schema + migrations |
| Redis | Ephemeral state — queues, cache, sessions, rate limits | BullMQ transport + ioredis for cache |
| Cloudflare R2 / MinIO | Binary media (audio, images) | `@aws-sdk/client-s3` (S3-compatible) |
| CEFR Classifier | Text difficulty scoring (offline, pipeline-only) | Node.js service, rule-based, runs in BullMQ worker |
| AI Exercise Generator | Produce exercises from content | Provider interface (concrete provider plugged in later) |

---

## Database Schema

### Core Entity Groups

```
USERS & AUTH
  User ──────────────────────────────────────────────────┐
    id, email, passwordHash, googleId                    │
    name, avatar, cefrLevel (B1/B2/C1)                   │
    xp, level, currentStreak, longestStreak              │
    lastActivityAt, createdAt                            │
    ↑                                                    │
  Session (NextAuth managed)                             │
  Account (OAuth providers)                             │
                                                        │
CONTENT                                                  │
  GrammarLesson ────────────────────────────────────────┼┐
    id, topicArea, title, cefrLevel, slug               ││
    explanation (rich text), examples (JSON)           ││
    orderIndex, published                               ││
    ↓ many                                             ││
  Exercise ───────────────────────────────────────────┐ ││
    id, contentType (grammar/vocab/reading/listening)  │ ││
    exerciseType (multiple_choice/fill_blank/...)      │ ││
    prompt, correctAnswer, options (JSON)              │ ││
    cefrLevel, difficulty (1-10), topicTag             │ ││
    grammarLessonId?, vocabularyId?, passageId?,       │ ││
    transcriptId?                                      │ ││
                                                       │ ││
  VocabularyWord                                       │ ││
    id, word, pronunciation, partOfSpeech              │ ││
    definition, exampleSentences (JSON)                │ ││
    synonyms (JSON), category, cefrLevel               │ ││
    audioUrl (R2 path)                                 │ ││
    ↓ many Exercises (via exerciseId FK)               │ ││
                                                       │ ││
  ReadingPassage                                       │ ││
    id, title, content (text), cefrLevel               │ ││
    contentType (article/news/blog/academic/story)     │ ││
    source, sourceUrl, wordCount                       │ ││
    topicTag, published                                │ ││
    ↓ many Exercises                                   │ ││
                                                       │ ││
  ListeningTranscript                                  │ ││
    id, title, transcript (text), audioUrl             │ ││
    cefrLevel, contentType (conversation/interview/...) │ ││
    duration (seconds), source, topicTag, published    │ ││
    ↓ many Exercises                                   │ ││
                                                       │ ││
SRS (per user)                                         │ ││
  SRSCard  ←──── VocabularyWord                       │ ││
    id, userId, vocabularyId                           │ ││
    interval (days), repetitions, easeFactor           │ ││
    nextReviewAt (indexed), lastReviewedAt             │ ││
    status (new/learning/review/suspended)             │ ││
                                                       │ ││
  SRSReview                                            │ ││
    id, srsCardId, userId                              │ ││
    qualityScore (0-5), responseTimeMs                 │ ││
    intervalBefore, intervalAfter, reviewedAt          │ ││
                                                       │ ││
PROGRESS (per user)                                    │ ││
  UserExerciseAttempt ──── Exercise ────────────────────┘ ││
    id, userId, exerciseId                                ││
    isCorrect, responseMs, attemptedAt                   ││
    userAnswer, cefrLevel (at time of attempt)           ││
                                                         ││
  UserLessonProgress ──── GrammarLesson ─────────────────┘│
    id, userId, grammarLessonId                           │
    status (not_started/in_progress/completed)            │
    score (0-100), completedAt                            │
                                                          │
  UserSkillScore ──── User ──────────────────────────────┘
    id, userId                                           
    skill (grammar/vocabulary/reading/listening/quiz)    
    score (0-100), accuracy (float)                      
    totalAttempts, lastUpdatedAt                         
    ← updated incrementally after each attempt           

GAMIFICATION
  Achievement
    id, key (unique), name, description, iconUrl
    category, xpReward, condition (JSON rule definition)

  UserAchievement ──── User, Achievement
    id, userId, achievementId, unlockedAt

  XPEvent ──── User
    id, userId, amount, reason (enum)
    referenceId (lessonId/quizId/etc), createdAt

CONTENT PIPELINE
  CrawlJob
    id, source (voa/bbc/news_in_levels/wikipedia)
    url, status (pending/processing/done/failed)
    resultCount, errorMessage, createdAt

  ContentRaw
    id, crawlJobId, rawHtml, normalizedText
    sourceUrl, contentType, processingStatus
    cefrRaw (classified level), cefrConfidence (float)
    deduplicationHash (sha256 of normalized text)
```

### Critical Indexes

```sql
-- SRS: finding due reviews per user (most frequent query)
CREATE INDEX idx_srs_card_due ON "SRSCard" ("userId", "nextReviewAt")
  WHERE status = 'review';

-- Exercise: content-type filtered queries
CREATE INDEX idx_exercise_content_type_cefr ON "Exercise" 
  ("contentType", "cefrLevel", "difficulty");

-- Progress: user performance lookup
CREATE INDEX idx_attempt_user_exercise ON "UserExerciseAttempt" 
  ("userId", "exerciseId", "attemptedAt");

-- Full-text search on vocabulary (GIN index)
CREATE INDEX idx_vocab_fts ON "VocabularyWord" 
  USING GIN (to_tsvector('english', word || ' ' || definition));

-- Full-text search on passages
CREATE INDEX idx_passage_fts ON "ReadingPassage" 
  USING GIN (to_tsvector('english', title || ' ' || content));

-- Deduplication check (crawl pipeline)
CREATE UNIQUE INDEX idx_content_dedup ON "ContentRaw" ("deduplicationHash");
```

### Schema Build Order

Build in this dependency order — each table only references already-created tables:

1. `User`, `Account`, `Session` (no foreign keys)
2. `Achievement` (no foreign keys)
3. `GrammarLesson`, `VocabularyWord`, `ReadingPassage`, `ListeningTranscript` (no foreign keys)
4. `Exercise` (references all content tables via nullable FKs)
5. `SRSCard`, `SRSReview` (references `User`, `VocabularyWord`)
6. `UserExerciseAttempt` (references `User`, `Exercise`)
7. `UserLessonProgress` (references `User`, `GrammarLesson`)
8. `UserSkillScore` (references `User`)
9. `UserAchievement`, `XPEvent` (references `User`, `Achievement`)
10. `CrawlJob`, `ContentRaw` (no cross-entity references)

---

## Recommended Project Structure

```
english-learning/
├── apps/
│   ├── web/                          # Next.js 14 (App Router)
│   │   ├── app/
│   │   │   ├── (auth)/               # Auth routes (login, register, reset)
│   │   │   ├── (app)/                # Authenticated app routes
│   │   │   │   ├── dashboard/        # Learning dashboard
│   │   │   │   ├── grammar/          # Grammar module pages
│   │   │   │   ├── vocabulary/       # Vocabulary + flashcard pages
│   │   │   │   ├── reading/          # Reading passage pages
│   │   │   │   ├── listening/        # Listening exercise pages
│   │   │   │   ├── quiz/             # Quiz center
│   │   │   │   └── profile/          # User profile + analytics
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   │   ├── ui/                   # Shadcn primitives (generated)
│   │   │   ├── exercises/            # Shared exercise renderers
│   │   │   │   ├── MultipleChoice.tsx
│   │   │   │   ├── FillBlank.tsx
│   │   │   │   ├── Flashcard.tsx
│   │   │   │   └── DragDrop.tsx
│   │   │   ├── gamification/         # XP bar, streak display, badges
│   │   │   ├── charts/               # Recharts wrappers for analytics
│   │   │   └── layout/               # Sidebar, nav, header
│   │   └── lib/
│   │       ├── api-client.ts         # Axios instance for NestJS API
│   │       └── auth.ts               # NextAuth config
│   │
│   └── api/                          # NestJS 11
│       └── src/
│           ├── main.ts               # HTTP bootstrap
│           ├── worker.ts             # Worker-only bootstrap (WORKER_ONLY=true)
│           ├── app.module.ts
│           └── modules/
│               ├── auth/             # JWT, guards, NextAuth bridge
│               ├── user/             # Profile, settings, CEFR level
│               ├── grammar/          # Lesson CRUD, exercise delivery
│               ├── vocabulary/       # Word sets, flashcard logic
│               ├── reading/          # Passage delivery, bookmarks
│               ├── listening/        # Transcript delivery, audio proxy
│               ├── quiz/             # Quiz engine, placement test
│               ├── srs/              # SM-2 algorithm, review scheduling
│               ├── gamification/     # XP events, streak, achievements
│               ├── adaptive/         # Recommendation engine
│               ├── search/           # PostgreSQL FTS across content
│               ├── analytics/        # Student + admin dashboards
│               ├── notifications/    # Email + in-app notifications
│               └── pipeline/         # Crawler, CEFR, exercise gen workers
│                   ├── crawler/
│                   ├── cefr/
│                   └── exercise-generator/
│
├── packages/
│   ├── shared/                       # Shared types and validation
│   │   ├── src/
│   │   │   ├── dto/                  # Zod schemas (request/response shapes)
│   │   │   ├── types/                # TypeScript interfaces
│   │   │   └── constants/            # CEFR levels, exercise types, etc.
│   │   └── package.json
│   │
│   ├── database/                     # Prisma schema + generated client
│   │   ├── prisma/
│   │   │   ├── schema.prisma         # Single source of truth
│   │   │   └── migrations/
│   │   └── package.json
│   │
│   └── tts/                          # TTS provider abstraction
│       ├── src/
│       │   ├── tts.interface.ts      # TTSProvider interface
│       │   ├── google-tts.service.ts # Concrete: Google Cloud Neural2
│       │   └── tts.service.ts        # Facade with R2 caching
│       └── package.json
│
├── docker/
│   ├── docker-compose.yml            # All services: web, api, worker, pg, redis, minio
│   ├── Dockerfile.web
│   ├── Dockerfile.api
│   └── Dockerfile.worker             # Same api image, WORKER_ONLY=true
│
├── scripts/
│   └── seed/                         # Standalone seed scripts (not BullMQ)
│       ├── seed-grammar.ts           # 500 grammar lessons
│       ├── seed-vocabulary.ts        # 5,000 words + TTS generation
│       ├── seed-reading.ts           # 2,000 passages
│       ├── seed-listening.ts         # 1,000 transcripts
│       └── seed-exercises.ts         # 20,000 questions
│
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

### Structure Rationale

- **`apps/web/` vs `apps/api/`:** Strict separation — Next.js never imports from NestJS source directly; communication is HTTP only. This enables independent scaling and deployment.
- **`packages/shared/`:** Single source of truth for DTO shapes. When the API response changes, the frontend type errors immediately at compile time.
- **`packages/database/`:** Prisma client is generated once and imported by `apps/api`. The Next.js frontend never imports Prisma directly (it calls the API).
- **`modules/pipeline/` inside NestJS:** Crawler, CEFR classifier, and exercise generator are NestJS modules, not separate microservices. They run in the worker process. No inter-service HTTP calls needed during seeding — everything is in-process.
- **`scripts/seed/`:** Seed scripts are standalone TypeScript files that call NestJS services directly (or via HTTP), not part of the application server. They run once during initial deploy.

---

## Architectural Patterns

### Pattern 1: Service Layer Separation (Handler → Service → Repository)

**What:** Every NestJS module follows three layers: Controller (HTTP boundary), Service (business logic), Repository (data access via Prisma). No business logic in controllers, no Prisma calls in services directly — services call repositories.

**When to use:** All NestJS modules. Non-negotiable for testability.

**Trade-offs:** More files per module, but each layer is independently testable.

```typescript
// vocabulary.controller.ts — handles HTTP only
@Get(':id')
async getWord(@Param('id') id: string, @CurrentUser() user: User) {
  return this.vocabularyService.getWordWithProgress(id, user.id);
}

// vocabulary.service.ts — owns business logic
async getWordWithProgress(wordId: string, userId: string) {
  const word = await this.vocabRepo.findById(wordId);
  const srsCard = await this.srsRepo.findCardForUser(wordId, userId);
  return { ...word, srsStatus: srsCard?.status ?? 'new' };
}

// vocabulary.repository.ts — owns Prisma queries
async findById(id: string) {
  return this.prisma.vocabularyWord.findUniqueOrThrow({ where: { id } });
}
```

### Pattern 2: Event-Driven Gamification

**What:** Learning actions (lesson complete, quiz done, SRS review) emit internal NestJS events. A `GamificationService` subscribes and handles XP, streaks, and achievement checks asynchronously.

**When to use:** Whenever a user completes a learning action. Prevents the lesson-complete handler from knowing about XP logic.

**Trade-offs:** Slightly harder to trace than direct calls, but keeps modules decoupled. The `UserLessonProgress.completedAt` update and the XP grant happen in the same transaction.

```typescript
// In LessonService:
await this.eventEmitter.emit('lesson.completed', {
  userId, lessonId, score, skill: 'grammar'
});

// In GamificationService:
@OnEvent('lesson.completed')
async handleLessonCompleted(payload: LessonCompletedEvent) {
  await this.xpService.grant(payload.userId, XP_LESSON_COMPLETE);
  await this.streakService.updateStreak(payload.userId);
  await this.achievementService.check(payload.userId, payload);
}
```

### Pattern 3: BullMQ FlowProducer for Content Pipeline

**What:** The content pipeline uses BullMQ's `FlowProducer` to chain jobs with hard dependencies: crawl → clean → CEFR classify → exercise generate. Child jobs must complete before parent proceeds.

**When to use:** Multi-stage pipelines where each stage's output is the next stage's input.

**Trade-offs:** More complex setup than simple queues, but gives observable, retryable, durable pipeline stages. Each stage is independently inspectable in Bull Board.

```typescript
// Pipeline entry point (triggered by seed script or cron):
await flowProducer.add({
  name: 'store-content',
  data: { sourceUrl, contentType },
  queueName: 'content-store',
  children: [
    {
      name: 'generate-exercises',
      data: { contentType },
      queueName: 'exercise-gen',
      children: [
        {
          name: 'classify-cefr',
          data: { text: normalizedText },
          queueName: 'cefr-classify',
          children: [
            {
              name: 'normalize-content',
              data: { rawHtml },
              queueName: 'content-normalize',
            }
          ]
        }
      ]
    }
  ]
});
// Execution order: normalize → classify → generate-exercises → store
```

### Pattern 4: Cache-Aside for API Responses

**What:** NestJS checks Redis before hitting PostgreSQL. On miss, fetch from DB, write to Redis with TTL, return. On write mutations, invalidate relevant cache keys.

**When to use:** Read-heavy endpoints: content pages (grammar lessons, passages), vocabulary word details, leaderboards, user stats summary.

**Trade-offs:** Adds cache invalidation complexity. Use only for data that is read significantly more than written.

```typescript
async getGrammarLesson(slug: string): Promise<GrammarLesson> {
  const cacheKey = `grammar:lesson:${slug}`;
  const cached = await this.redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const lesson = await this.grammarRepo.findBySlug(slug);
  await this.redis.setex(cacheKey, 3600, JSON.stringify(lesson)); // 1hr TTL
  return lesson;
}
```

---

## Content Pipeline Architecture

### Pipeline Flow

```
TRIGGER (seed script or scheduled cron)
    │
    ▼
[crawl] Queue
    │  Playwright fetches target URL (VOA/BBC/etc)
    │  Cheerio extracts text, metadata, audio links
    │  SHA-256 dedup hash → skip if already in ContentRaw
    ▼
[content-normalize] Queue
    │  Strip HTML tags, normalize whitespace
    │  Sentence segmentation (natural.js)
    │  Extract vocabulary candidates
    ▼
[cefr-classify] Queue
    │  Vocabulary difficulty scoring (CEFR word list lookup)
    │  Sentence length analysis
    │  Syntactic complexity heuristic
    │  Output: { level: 'B2', confidence: 0.73 }
    │  Store: ContentRaw.cefrRaw, cefrConfidence
    ▼
[exercise-gen] Queue
    │  AI provider interface called
    │  v1: template-based generation (rule-based)
    │  Later: real AI provider plugged in
    │  Generates 10-50 exercises per content item
    ▼
[content-store] Queue
    │  Write to appropriate table:
    │    ReadingPassage / ListeningTranscript / VocabularyWord
    │  Write Exercises linked to content
    │  Mark ContentRaw.processingStatus = 'done'
    ▼
[tts-gen] Queue (vocabulary only)
    │  For each new VocabularyWord
    │  Check R2 for cached audio (content-addressed key)
    │  If miss: call Google TTS → upload to R2
    │  Update VocabularyWord.audioUrl
    ▼
DONE
```

### Queue Configuration

| Queue | Concurrency | Priority | Retry | Notes |
|-------|-------------|----------|-------|-------|
| `crawl` | 3 | 100 (low) | 3x exponential | Playwright is memory-heavy; cap at 3 |
| `content-normalize` | 10 | 80 | 5x | CPU-light, high throughput |
| `cefr-classify` | 8 | 80 | 5x | In-memory lookup, fast |
| `exercise-gen` | 4 | 70 | 3x | AI provider calls — rate limited |
| `content-store` | 10 | 60 | 5x | DB writes |
| `tts-gen` | 2 | 50 | 3x | Google API rate limit |
| `srs-reviews` | 20 | 10 (high) | 1x | User-facing; must be fast |
| `notifications` | 5 | 20 | 3x | Email sends |

---

## SRS Scheduling Architecture

### SM-2 Flow

```
USER REVIEWS WORD
    │
    ▼
POST /srs/review
    │  { cardId, quality: 0-5, responseTimeMs }
    ▼
SRSService.recordReview()
    │  1. Load SRSCard (interval, repetitions, easeFactor)
    │  2. Run SM-2 algorithm
    │     - quality >= 3: increase interval
    │     - quality < 3: reset interval to 1
    │     - Update easeFactor: EF + (0.1 - (5-q)(0.08 + (5-q)*0.02))
    │  3. Write SRSReview record (audit trail)
    │  4. Update SRSCard (new interval, nextReviewAt, status)
    │  5. Cancel existing BullMQ delayed job (by jobId)
    │  6. Schedule new delayed job
    │     delay = interval.days * 86400 * 1000 ms
    │     jobId = `review:${userId}:${vocabularyId}` (dedup key)
    ▼
BULLMQ DELAYED JOB FIRES (N days later)
    │
    ▼
SRSReviewSchedulerWorker.process()
    │  1. Check if card still due (guard against early manual review)
    │  2. Emit notification: "Time to review: [word]"
    │  3. Update SRSCard.status = 'review' (makes it appear in review queue)
    ▼
USER SEES REVIEW IN DASHBOARD
    │  GET /srs/due → SRSCard WHERE status='review' AND userId=X
    │  Sorted by nextReviewAt ASC, max 20 per session
```

### SRS State Machine

```
new ──(first study)──► learning
learning ──(quality >= 3)──► review
review ──(quality >= 3)──► review (increased interval)
review ──(quality < 3)──► learning (reset interval)
any ──(user suspends)──► suspended
suspended ──(user reactivates)──► review
```

---

## Adaptive Learning Engine

### Architecture

The adaptive engine is NOT a separate microservice. It lives in `modules/adaptive/` within NestJS and runs synchronously on dashboard load and recommendation requests.

```
DATA INPUTS (read from PostgreSQL)
├── UserSkillScore (per skill accuracy + total attempts)
├── UserExerciseAttempt (last 30 days, grouped by topic/difficulty)
├── SRSCard (due count, overdue count, average ease factor)
├── UserLessonProgress (completed lessons, scores)
└── User.cefrLevel (current level)

          │
          ▼
ADAPTIVE ENGINE (AdaptiveService)
    Rule-based v1 (not ML):
    
    1. Weak Skill Detection
       For each skill: if accuracy < 60% in last 20 attempts → "weak"
    
    2. Difficulty Calibration
       Current difficulty band = User.cefrLevel ± 1
       If recent accuracy > 80%: suggest one step harder
       If recent accuracy < 50%: suggest one step easier
    
    3. Topic Gap Analysis
       Compare attempted topics vs available topics at user's CEFR level
       Surface topics with 0 attempts or accuracy < 50%
    
    4. SRS Backlog Detection
       If overdue SRS cards > 20: prioritize vocabulary review over new content

          │
          ▼
RECOMMENDATIONS (output, stored in Redis with 6hr TTL)
├── nextLesson: { type, id, reason }
├── reviewReminder: { srsCount, urgency }
├── weakTopics: [{ skill, topic, suggestedExercises }]
└── levelUpProgress: { current, needed, projectedDate }
```

### Recommendation Trigger Points

| Trigger | When | What Updates |
|---------|------|--------------|
| After lesson completion | Synchronous | `UserSkillScore`, `UserLessonProgress` |
| After quiz submission | Synchronous | `UserExerciseAttempt`, `UserSkillScore` |
| Dashboard load | On request | Read-only; serve from Redis cache |
| Daily cron (2am) | Scheduled | Recompute `UserSkillScore` aggregates, clear stale cache |

---

## Caching Strategy

### What Goes in Redis vs PostgreSQL

| Data | Store | TTL | Reason |
|------|-------|-----|--------|
| User session (JWT) | Redis | 7 days | Fast auth validation on every request |
| OTP / email verification tokens | Redis | 15 min | Auto-expire — no cleanup job needed |
| Password reset tokens | Redis | 1 hour | Auto-expire |
| Grammar lesson content (by slug) | Redis | 1 hour | Read-heavy, rarely changes |
| Vocabulary word detail | Redis | 1 hour | Read-heavy, immutable after seeding |
| Reading passage (by id) | Redis | 6 hours | Very stable content |
| User skill scores summary | Redis | 30 min | Recomputed after activity |
| Adaptive recommendations | Redis | 6 hours | Expensive to compute; stale is acceptable |
| Leaderboard / XP rankings | Redis sorted set | 1 hour | Sorted set enables O(log N) rank lookup |
| SRS due count for user | Redis | 5 min | Changes as user reviews |
| Rate limit counters | Redis | 60 sec | Short window |
| BullMQ queue state | Redis | Permanent | BullMQ owns this namespace |

**Never cache in Redis:**
- `UserExerciseAttempt` records (append-only, source of truth)
- `SRSReview` records (audit trail)
- `UserAchievement` locks (must be transactionally correct)
- Anything requiring transactional consistency with other writes

### Cache Invalidation Rules

| Event | Cache Keys to Invalidate |
|-------|--------------------------|
| User completes lesson | `user:${id}:skills`, `user:${id}:recommendations` |
| User earns XP | `user:${id}:xp-summary`, `leaderboard:weekly` |
| Admin publishes content | `grammar:lesson:${slug}`, `reading:passage:${id}` |
| SRS review recorded | `user:${id}:srs-due-count` |

---

## API Structure

### Endpoint Organization

```
/api/auth/*              — NextAuth endpoints (handled by Next.js, not NestJS)
/api/v1/                 — NestJS REST API base

  /users/me              — Profile, settings, level
  /users/me/stats        — XP, streak, skill scores
  /users/me/achievements — Unlocked achievements

  /grammar/lessons       — List (paginated, filtered by CEFR)
  /grammar/lessons/:slug — Single lesson with exercises

  /vocabulary/words      — List (paginated, by category/CEFR)
  /vocabulary/words/:id  — Single word with examples + audio
  /vocabulary/flashcards — SRS-optimized word set for today

  /reading/passages      — List passages
  /reading/passages/:id  — Passage + comprehension questions

  /listening/transcripts — List transcripts
  /listening/transcripts/:id — Transcript + exercises + audio URL

  /quiz/start            — Create quiz session
  /quiz/submit           — Submit answer
  /quiz/results/:sessionId — Quiz results

  /srs/due               — Due vocabulary cards (max 20)
  /srs/review            — POST: record review + reschedule

  /exercises/:id         — Single exercise
  /exercises/:id/attempt — POST: submit attempt

  /recommendations       — GET: adaptive recommendations for user

  /search                — GET ?q=&type=&cefr= — Global FTS

  /notifications         — GET list, PATCH mark-read

  /admin/*               — Admin routes (guarded by role)
    /admin/analytics     — Platform-wide stats
    /admin/content       — Content management
    /admin/queues        — Bull Board mount point
```

### Auth Flow: Next.js ↔ NestJS JWT Bridge

```
User logs in via NextAuth (Next.js)
    │
    ▼
NextAuth creates JWT session (signed with NEXTAUTH_SECRET)
    │
    ▼
Next.js Server Component or Client Component
    │  Attach session token as Authorization header
    ▼
NestJS API receives request
    │  JwtGuard: verify token using shared NEXTAUTH_SECRET
    │  Extract userId, email, role from token payload
    │  Attach to request as @CurrentUser()
    ▼
NestJS handler runs with authenticated user context
```

---

## Data Flow

### Lesson Study Flow

```
User clicks "Start Lesson" (Next.js Client)
    ↓
GET /api/v1/grammar/lessons/:slug
    ↓ Redis hit? → return immediately (< 5ms)
    ↓ Redis miss? → PostgreSQL query (lesson + exercises)
    ↓ Store in Redis (1hr TTL)
    ↓ Return to Next.js
    ↓
User works through exercises (client state)
    ↓
POST /api/v1/exercises/:id/attempt (each answer)
    ↓ Write UserExerciseAttempt to PostgreSQL (append-only)
    ↓ Emit 'exercise.attempted' event (internal NestJS EventEmitter)
    ↓ Return { correct, explanation }
    ↓
User completes lesson
    ↓
POST /api/v1/grammar/lessons/:id/complete
    ↓ Write UserLessonProgress (upsert: set completed)
    ↓ Emit 'lesson.completed' event
        ↓ GamificationService handles:
        │  - Grant XP (write XPEvent)
        │  - Update streak (write User.currentStreak)
        │  - Check achievements (write UserAchievement if unlocked)
        │  - Invalidate Redis: user:skills, user:recommendations
    ↓ Update UserSkillScore (aggregate, write to DB)
    ↓ Return { xpEarned, streakStatus, achievementsUnlocked }
```

### SRS Review Flow

```
User opens "Review" tab (Next.js)
    ↓
GET /api/v1/srs/due
    ↓ Query: SRSCard WHERE userId=X AND status='review' ORDER BY nextReviewAt LIMIT 20
    ↓ Return 20 cards with VocabularyWord data
    ↓
User sees flashcard, presses quality rating (1-5)
    ↓
POST /api/v1/srs/review { cardId, quality, responseTimeMs }
    ↓ Run SM-2 algorithm (pure function, no I/O)
    ↓ Write SRSReview record
    ↓ Update SRSCard (new interval, nextReviewAt, status)
    ↓ Cancel previous BullMQ delayed job (by jobId)
    ↓ Schedule new BullMQ delayed job (N days delay)
    ↓ Invalidate Redis: user:srs-due-count
    ↓ Return { nextReviewAt, interval, easeFactor }
```

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0–1K users | Single VPS; all services in docker-compose; Redis on same host. Pipeline runs during off-hours. |
| 1K–10K users | Separate worker Docker service. Redis cache starts paying off heavily. Add read replica for PostgreSQL analytics queries. Upgrade to managed PostgreSQL (Neon, Supabase). |
| 10K–100K users | Horizontal scale NestJS API (2–4 instances behind load balancer). Scale BullMQ workers independently. Consider PostgreSQL connection pooling (PgBouncer). Move Redis to managed Redis (Upstash). |
| 100K+ users | DB read replicas for content queries. Separate analytics DB (or TimescaleDB for time-series). Consider CDN for API responses on stable content. CEFR classifier and exercise generator become separate services if GPU/ML upgrades happen. |

### Scaling Priorities

1. **First bottleneck:** PostgreSQL connection exhaustion. Fix: PgBouncer connection pooler between NestJS and PostgreSQL. Prisma default pool (10 connections) per instance; PgBouncer limits physical connections to DB.

2. **Second bottleneck:** BullMQ worker throughput during bulk seeding. Fix: Run multiple worker instances (separate Docker containers), each picking from the same queues. BullMQ handles distributed locking automatically.

3. **Third bottleneck:** Redis memory from BullMQ job accumulation. Fix: `removeOnComplete: { count: 100 }` and `removeOnFail: { count: 500 }` on all queues. Keep only recent history.

---

## Anti-Patterns

### Anti-Pattern 1: Business Logic in Next.js Server Actions Hitting DB Directly

**What people do:** Use Next.js Server Actions with `import { prisma }` to query the DB from the frontend app, bypassing NestJS entirely.

**Why it's wrong:** Mixes frontend and backend concerns; duplicates business logic; breaks the audit trail; makes the codebase unmaintainable as modules grow. When you later add mobile or public API access, there's no canonical backend to call.

**Do this instead:** Server Actions call the NestJS API over HTTP. One canonical backend, one set of business rules.

### Anti-Pattern 2: One BullMQ Queue for All Job Types

**What people do:** Create a single `jobs` queue and route all work through it with a `type` field in the payload.

**Why it's wrong:** Crawler jobs (slow, Playwright-heavy) block SRS review jobs (must fire in < 1s for good UX). One queue means low-priority batch work starves real-time user-facing operations.

**Do this instead:** Separate queues per job type with appropriate concurrency limits. `srs-reviews` queue: concurrency 20, high priority. `crawl` queue: concurrency 3, low priority. Completely independent resource pools.

### Anti-Pattern 3: Caching SRS Cards in Redis

**What people do:** Cache the user's current SRS deck in Redis to avoid DB queries.

**Why it's wrong:** SRS card state (interval, nextReviewAt, status) changes on every review. Cache invalidation becomes a source of subtle bugs where users see stale card states. Cache coherence with BullMQ state is impossible to guarantee.

**Do this instead:** Query SRS cards fresh from PostgreSQL on every review session load. The query is indexed (`idx_srs_card_due`), returns max 20 rows, and completes in < 5ms. Cache the count only (short TTL), not the card data.

### Anti-Pattern 4: Synchronous Exercise Generation at Request Time

**What people do:** Call the AI provider API inline when a user requests a lesson, generating exercises on demand.

**Why it's wrong:** AI API latency is 1–30 seconds; exercise generation fails or times out under load; exercises appear blank on first visit; cost scales with user traffic. This is explicitly called out in PROJECT.md as out of scope.

**Do this instead:** All exercises are pre-generated by the background pipeline and stored in PostgreSQL. The exercise endpoint is a simple DB read. Zero AI latency at request time.

### Anti-Pattern 5: Streak Tracking with Only a Counter Field

**What people do:** Store `currentStreak: int` and increment/reset it based on `lastActivityAt`.

**Why it's wrong:** You lose streak history, can't distinguish "active today" from "did something 3 days ago," can't retroactively fix a bug, and can't implement streak protection features.

**Do this instead:** Store `lastActivityAt` (timestamp), `currentStreak` (int), and `longestStreak` (int) on the User. Track streak updates in `XPEvent` records as the audit trail. On each activity, check `DATE(lastActivityAt) = DATE(NOW()) - INTERVAL '1 day'` to decide increment vs reset.

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Google Cloud TTS | REST API via `@google-cloud/text-to-speech` SDK | Called in `tts-gen` BullMQ worker only; never at request time |
| Cloudflare R2 | S3-compatible via `@aws-sdk/client-s3` | Same code works against MinIO in dev |
| AI Exercise Generator | Abstracted `ExerciseGeneratorProvider` interface | Concrete provider (OpenAI/Claude/Ollama) injected via env config |
| NextAuth / Auth.js | JWT shared secret between Next.js and NestJS | `NEXTAUTH_SECRET` must match in both services |
| Playwright targets | VOA Learning English, BBC Learning English, News in Levels | Rate-limit crawl: 1 req/3s per domain; respect robots.txt |
| SMTP (notifications) | Nodemailer via NestJS `notifications` module | Use Resend or SendGrid SMTP relay in production |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Next.js → NestJS API | HTTP REST (Axios) | Internal Docker network; no public exposure needed |
| NestJS HTTP → NestJS Worker | BullMQ via Redis | Same codebase, different process entry point |
| NestJS → PostgreSQL | Prisma client (connection pool) | `DATABASE_URL` env var; PgBouncer in prod |
| NestJS → Redis | ioredis for cache; BullMQ for queues | Same Redis instance, different key prefixes |
| NestJS → R2/MinIO | `@aws-sdk/client-s3` | `STORAGE_ENDPOINT` env var swaps local/prod |
| Pipeline Worker → CEFR Classifier | In-process function call | `CEFRService` is a NestJS provider in pipeline module |

---

## Build Order (Component Dependencies)

Build in this order — each layer depends on the previous:

**Phase 0: Foundation**
1. Monorepo scaffold (Turborepo + pnpm workspaces)
2. Docker Compose with PostgreSQL, Redis, MinIO
3. `packages/database/` — Prisma schema (Users, basic content tables)
4. `packages/shared/` — Base DTOs and constants

**Phase 1: Auth + Shell**
5. NestJS app with `AuthModule` (JWT guard, user validation)
6. Next.js with NextAuth v5 (login, register, OAuth)
7. JWT bridge (shared secret, NestJS validates NextAuth tokens)

**Phase 2: Content Data Model**
8. Full Prisma schema (all tables, all indexes)
9. Seed scripts scaffold (can run empty, fill in over time)

**Phase 3: Content Modules (no pipeline yet)**
10. NestJS `GrammarModule` (CRUD, exercise delivery)
11. NestJS `VocabularyModule` (word delivery, no SRS yet)
12. NestJS `ReadingModule`, `ListeningModule`
13. Next.js pages for all content types

**Phase 4: SRS + Gamification**
14. SM-2 algorithm (pure function, unit tested)
15. NestJS `SRSModule` (card management, review recording, BullMQ scheduling)
16. NestJS `GamificationModule` (XP, streak, achievements via events)
17. Next.js flashcard UI, review session, XP/streak display

**Phase 5: Content Pipeline**
18. BullMQ queue setup (all queues, Bull Board)
19. Crawler worker (Playwright + Cheerio)
20. CEFR classifier (rule-based, `natural.js`)
21. Exercise generator (template-based v1)
22. TTS generator (Google Cloud Neural2 + R2)
23. Full pipeline integration test with 100 sample records

**Phase 6: Adaptive Learning + Search**
24. `UserSkillScore` aggregation pipeline
25. NestJS `AdaptiveModule` (rule-based recommendations)
26. PostgreSQL FTS (GIN indexes, `search` endpoint)
27. Next.js search UI + recommendation widgets

**Phase 7: Seeding + Polish**
28. Full seed scripts (5K vocab, 2K passages, 1K audio, 500 grammar, 20K exercises)
29. Admin analytics module
30. Performance audit (indexes, query analysis, Redis hit rate)

---

## Sources

- [BullMQ Docs: Flows / FlowProducer](https://docs.bullmq.io/guide/flows) — Pipeline dependency pattern
- [BullMQ Docs: Delayed Jobs](https://docs.bullmq.io/guide/jobs/delayed) — SRS scheduling implementation
- [DEV: Background Job Processing in Node.js — BullMQ Patterns 2026](https://dev.to/young_gao/background-job-processing-in-nodejs-bullmq-queues-and-worker-patterns-31d4) — Worker isolation, queue separation
- [DigitalApplied: Redis Caching Strategies for Next.js Production](https://www.digitalapplied.com/blog/redis-caching-strategies-nextjs-production) — TTL guidance, cache-aside pattern
- [Next.js Docs: Building APIs with Next.js](https://nextjs.org/blog/building-apis-with-nextjs) — Route handler limitations
- [DEV: Ultimate Guide to Software Architecture in Next.js](https://dev.to/shayan_saed/the-ultimate-guide-to-software-architecture-in-nextjs-from-monolith-to-microservices-i2c) — Monolith to microservice guidance
- [PostgreSQL FTS vs Elasticsearch — Neon comparison](https://neon.com/blog/postgres-full-text-search-vs-elasticsearch) — PostgreSQL GIN index sufficient for < 1M records
- [Madavi: Adaptive Learning in EdTech Systems](https://madavi.co/adaptive-learning-in-edtech-systems-enhancing-student-performance/) — Adaptive engine component breakdown
- [Anki FSRS documentation](https://faqs.ankiweb.net/what-spaced-repetition-algorithm) — SM-2 algorithm parameters
- STACK.md (this project) — Architecture decisions already locked (NestJS, BullMQ, Cloudflare R2, SM-2)

---

*Architecture research for: English Learning / EFL EdTech SaaS Web Application*
*Researched: 2026-06-11*
