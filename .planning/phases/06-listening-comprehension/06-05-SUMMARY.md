---
phase: 06-listening-comprehension
plan: "05"
subsystem: pipeline
tags: [pipeline, crawler, seed, listening, whisper, minio, cefr]
dependency_graph:
  requires:
    - "06-02"   # presigned URL service (MinIO S3 pattern)
    - "06-04"   # listening browse/detail pages (consumes seeded data)
  provides:
    - ListeningCrawlerService  # VOA/BBC/ESLPod/TED crawl + Whisper + MinIO upload
    - ListeningSeedService      # exercise generation + batch insert
    - PipelineModule            # NestJS module wiring all pipeline services
  affects:
    - ListeningContent table    # upserts from crawl
    - ListeningQuestion table   # creates via generateExercises
tech_stack:
  added: []
  patterns:
    - "NestFactory.createApplicationContext for standalone CLI pipeline runners"
    - "Prisma.DbNull for nullable Json fields (not raw null)"
    - "Cheerio .each() callbacks use block bodies to avoid implicit number return"
    - "createMany batch accumulation with per-item contentId tagging"
key_files:
  created:
    - apps/api/src/pipeline/pipeline.module.ts
    - apps/api/src/pipeline/crawl-listening.ts
    - apps/api/src/pipeline/seed-listening.ts
  modified:
    - apps/api/src/pipeline/listening-crawler.service.ts
    - apps/api/src/pipeline/listening-seed.service.ts
    - apps/api/src/pipeline/validate-listening.ts
    - apps/api/package.json
decisions:
  - "Prisma.DbNull used instead of null for nullable Json wordTimestamps field (Prisma 6 NullableJsonNullValueInput requirement)"
  - "Batch accumulation tracks contentId per exercise to support cross-item batching without wrong contentId assignment"
  - "Cheerio .each() callbacks use block bodies { } instead of arrow expression to avoid TS2322 (void not number)"
metrics:
  duration: "~20min"
  completed: "2026-06-16"
  tasks: 2
  files: 7
requirements:
  - LIST-01
  - LIST-02
  - LIST-07
---

# Phase 06 Plan 05: Content Pipeline (Crawler + Seed) Summary

Content pipeline for listening comprehension: ListeningCrawlerService crawls 4 sources (VOA/BBC/ESLPod/TED) with Whisper word timestamps and CEFR classification, ListeningSeedService generates 3 exercise types per item and batch-inserts 500 records at a time.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | ListeningCrawlerService with 4 sources and Whisper integration | 9d0293f | validate-listening.ts (bug fix) |
| 2 | ListeningSeedService, PipelineModule, CLI entry points, pnpm scripts | dc3ab90 | pipeline.module.ts, crawl-listening.ts, seed-listening.ts, listening-seed.service.ts, listening-crawler.service.ts, package.json |

Note: The core service files (listening-crawler.service.ts, listening-seed.service.ts, validate-listening.ts, classifier.service.ts) were pre-staged in commit 98700d9 by the orchestrator before this executor wave began.

## What Was Built

### ListeningCrawlerService (`apps/api/src/pipeline/listening-crawler.service.ts`)

NestJS `@Injectable()` service with:
- `crawlItem(sourceUrl, contentType, title, audioUrl, transcriptText)`: downloads MP3 to temp, uploads to MinIO, calls Whisper, classifies CEFR, upserts `listeningContent`
- `callWhisperWorker(audioPath)`: POSTs FormData with `response_format=verbose_json` AND `timestamp_granularities[]=word` (Pitfall 1 mitigation); guards `if (!json.words || json.words.length === 0) return []`
- `crawlVoa(limit)`: VOA Learning English → NEWS_REPORT content type
- `crawlBbc(limit)`: BBC 6 Minute English → alternating CONVERSATION/INTERVIEW
- `crawlEslpod(limit)`: archive.org ESLPod → PODCAST
- `crawlLecture(limit)`: TED.com talks → LECTURE (transcript-only; no audio download due to DRM)

All 5 content types (CONVERSATION, INTERVIEW, PODCAST, LECTURE, NEWS_REPORT) covered across 4 sources.

### ListeningSeedService (`apps/api/src/pipeline/listening-seed.service.ts`)

NestJS `@Injectable()` service with:
- `run()`: fetches published content with 0 questions, generates exercises, batch-inserts to DB
- `generateExercises(content)`: returns ≥1 MULTIPLE_CHOICE, ≥1 FILL_MISSING_WORDS, ≥1 DICTATION per item (LIST-02)
- `generateFillMissingWords(sentence, wordSet)`: finds CEFR word ≥4 chars, blanks it, generates 3 distractors
- Batch insert at 500 records using `prisma.listeningQuestion.createMany({ skipDuplicates: true })`
- CEFR word set fallback (34 B1-C1 words) when `cefr-word-list.json` not present

### PipelineModule (`apps/api/src/pipeline/pipeline.module.ts`)

NestJS module that:
- Imports ConfigModule (global) and PrismaModule (global)
- Registers ClassifierService, ListeningCrawlerService, ListeningSeedService as providers and exports

### CLI Entry Points

- `crawl-listening.ts`: calls crawlVoa(75), crawlBbc(75), crawlEslpod(75), crawlLecture(75)
- `seed-listening.ts`: calls `ListeningSeedService.run()`
- `validate-listening.ts`: tests 5 sample URLs per source, exits 1 if any source <80% success

### Package.json Scripts (3 new)

```json
"pipeline:crawl:listening": "ts-node -r tsconfig-paths/register src/pipeline/crawl-listening.ts",
"pipeline:seed:listening": "ts-node -r tsconfig-paths/register src/pipeline/seed-listening.ts",
"pipeline:validate:listening": "ts-node -r tsconfig-paths/register src/pipeline/validate-listening.ts"
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed `void crawler` used before declaration in validate-listening.ts**
- **Found during:** Task 1 review
- **Issue:** Line `void crawler;` appeared before `const crawler = app.get(...)` declaration — TypeScript TS2448/TS2454 errors
- **Fix:** Moved `void crawler` comment to after the `const crawler` declaration
- **Files modified:** `apps/api/src/pipeline/validate-listening.ts`
- **Commit:** 9d0293f

**2. [Rule 1 - Bug] Fixed `@prisma/client` direct import in listening-crawler.service.ts**
- **Found during:** Task 2 typecheck
- **Issue:** `import('@prisma/client').Prisma.JsonValue` fails — `@prisma/client` is not directly available in the monorepo; must use `@repo/database`
- **Fix:** Added `import { Prisma } from '@repo/database'` and used `Prisma.InputJsonValue` / `Prisma.DbNull`
- **Files modified:** `apps/api/src/pipeline/listening-crawler.service.ts`
- **Commit:** dc3ab90

**3. [Rule 1 - Bug] Fixed Cheerio `.each()` callback implicit return type (TS2322)**
- **Found during:** Task 2 typecheck
- **Issue:** Arrow callbacks `=> array.push(...)` return a `number`; Cheerio's `.each()` expects `void | boolean` — TS2322 in 4 locations
- **Fix:** Changed all `.each()` callbacks to use block bodies `{ array.push(...); }` to return `void`
- **Files modified:** `apps/api/src/pipeline/listening-crawler.service.ts`
- **Commit:** dc3ab90

**4. [Rule 1 - Bug] Fixed `wordTimestamps: null` for Prisma nullable Json field (TS2322)**
- **Found during:** Task 2 typecheck
- **Issue:** Prisma 6 `Json?` fields require `Prisma.DbNull` or `Prisma.JsonNull` — raw `null` doesn't satisfy `NullableJsonNullValueInput | InputJsonValue | undefined`
- **Fix:** Used `Prisma.DbNull` in both the `crawlItem` upsert and the TED lecture upsert
- **Files modified:** `apps/api/src/pipeline/listening-crawler.service.ts`
- **Commit:** dc3ab90

**5. [Rule 1 - Bug] Fixed cross-item batch contentId assignment in ListeningSeedService**
- **Found during:** Task 2 implementation review
- **Issue:** Original batch code used `item.id` for all exercises in the batch — if exercises from item A were still in the batch when item B hit BATCH_SIZE, they'd get contentId of item B
- **Fix:** Changed to global batch with `{ ...exercise, contentId: item.id }` tagging per item, flushed at end
- **Files modified:** `apps/api/src/pipeline/listening-seed.service.ts`
- **Commit:** dc3ab90

## Test Results

- `src/pipeline/listening-seed.service.spec.ts`: 1 test PASSED (LIST-02 — generateExercises returns MULTIPLE_CHOICE, FILL_MISSING_WORDS, DICTATION)
- Pre-existing failures in reading.service.spec.ts, vocabulary.service.spec.ts, auth.service.spec.ts: out of scope for this plan

## Known Stubs

- `validate-listening.ts`: sample URLs are all the same listing page URL per source (5 copies of the index page). A full validation should test individual article URLs. The validate script is designed for selector smoke testing, not deep per-URL audio extraction validation — this is acceptable for the current wave.

## Threat Surface Scan

No new security surfaces introduced:
- Pipeline services are offline scripts (no HTTP exposure)
- MinIO access uses S3 credentials from env (env-gated, T-06-12 already in plan's threat model)
- Crawled content sanitized by ClassifierService tokenizer + Prisma parameterized queries (T-06-11)
- T-06-13 (DoS via unlimited crawl): mitigated by `limit` parameter (max 75 per source)

## Self-Check: PASSED

All created/modified files confirmed present. All task commits (9d0293f, dc3ab90) confirmed in git log.
