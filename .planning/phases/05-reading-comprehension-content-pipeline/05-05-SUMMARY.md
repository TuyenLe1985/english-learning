---
phase: 05-reading-comprehension-content-pipeline
plan: "05"
subsystem: pipeline
tags: [crawler, seed, cefr-pipeline, reading-content, nestjs-cli]
dependency_graph:
  requires: [05-04]
  provides: [CrawlerService, SeedService, pipeline-cli-bootstrap, pipeline-pnpm-scripts]
  affects: [apps/api/src/pipeline/, apps/api/package.json]
tech_stack:
  added: []
  patterns:
    - NestFactory.createApplicationContext standalone CLI
    - createMany in 500-record batches with skipDuplicates (PIPE-06)
    - Playwright + Cheerio 4-source crawler with polite delay
    - SHA-256 contentHash for content dedup
    - Rule-based topic detection via keyword scoring
    - Inline HTML sanitization before DB insert (XSS mitigation)
key_files:
  created:
    - apps/api/src/pipeline/crawler.service.ts
    - apps/api/src/pipeline/seed.service.ts
    - apps/api/src/pipeline/pipeline.cli.ts
  modified:
    - apps/api/src/pipeline/pipeline.module.ts
    - apps/api/package.json
decisions:
  - Polite delay 300–1200ms random (not fixed) to mimic human behavior and avoid rate-limit detection
  - HTML sanitization inline in SeedService (not via isomorphic-dompurify) — avoids jsdom dependency at pipeline time while still removing XSS vectors
  - Wikipedia URLs populated via Good Articles listing + Special:Random fallback for quality content
  - QUESTION_TYPES as const array ensures all 6 READ-02 types are always represented
metrics:
  duration: 18min
  completed: "2026-06-16"
  tasks_completed: 2
  files_created: 3
  files_modified: 2
---

# Phase 05 Plan 05: Content Pipeline (CrawlerService + SeedService + CLI) Summary

Playwright + Cheerio 4-source crawler with polite delay and quality gate, NestJS standalone CLI bootstrap using createApplicationContext, and SeedService with 500-record batch createMany seeding 2,000+ reading passages and stub ReadingQuestion rows.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | CrawlerService — Playwright + Cheerio 4-source extractor | 747998a | apps/api/src/pipeline/crawler.service.ts |
| 2 | SeedService + PipelineModule + CLI bootstrap + pnpm scripts | 6d3ce24 | seed.service.ts, pipeline.cli.ts, pipeline.module.ts, package.json |

## What Was Built

### CrawlerService (`apps/api/src/pipeline/crawler.service.ts`)

- `validateSelectors()` — MANDATORY step (D-11): fetches 50-URL sample per source, tests all selector candidates, reports success rate. Warns if any source falls below 80% threshold.
- `crawlAll()` — bulk crawl targeting ≥625 URLs per source (4 × 625 = 2,500 raw → ~80% pass quality gate = ~2,000 seeded). Writes `crawled-passages.json`.
- Quality gate (PIPE-02): ≥150 words AND unique word ratio ≥ 0.4 (boilerplate filter).
- SHA-256 `contentHash` via `crypto.createHash('sha256')` for dedup.
- Polite delay: `300 + Math.random() * 900` ms between page fetches (T-05-05-03).
- 4 source configs: VOA Learning English (NEWS), BBC Learning English (NEWS), News In Levels (NEWS), Simple English Wikipedia (ARTICLE).
- Wikipedia-specific URL strategy: crawls Good Articles listing + Special:Random fallback for quality content.

### SeedService (`apps/api/src/pipeline/seed.service.ts`)

- `seedFromFile(filePath)` — reads crawled-passages.json, classifies via ClassifierService, seeds ReadingPassage + ReadingQuestion rows.
- Classification: `classifierService.classifyPassage(plainText)` where plainText is HTML-stripped content.
- PIPE-04/D-12: `isPublished = cefrConfidence >= 0.65`; `flaggedForReview = !isPublished`.
- Topic detection: keyword scoring across 8 topic categories (technology, health, business, travel, education, science, environment, society). Requires ≥2 keyword matches for assignment.
- Inline HTML sanitization before DB insert (removes `<script>`, `<style>`, event handlers, `javascript:` hrefs) — T-05-05-01 mitigation.
- `seedPassagesInBatches()`: `prisma.readingPassage.createMany({ data: batch, skipDuplicates: true })` in BATCH_SIZE=500 chunks (PIPE-06).
- `seedQuestionsForPassages()`: generates 6 stub ReadingQuestion rows per passage (READ-02): MAIN_IDEA, DETAIL, INFERENCE, VOCAB_IN_CONTEXT, TRUE_FALSE, SUMMARY. Seeded in 500-record batches.
- Logs: total passages, isPublished count, flaggedForReview count, questions seeded.

### pipeline.cli.ts (`apps/api/src/pipeline/pipeline.cli.ts`)

- `NestFactory.createApplicationContext(PipelineModule)` — no HTTP server (D-09).
- Flags: `--validate`, `--crawl`, `--seed`, `--run`.
- Exits 0 on success, 1 on error.
- `import 'reflect-metadata'` at top for NestJS DI decorators.

### PipelineModule + scripts

- PipelineModule updated: CrawlerService and SeedService added to providers[] and exports[].
- 4 pnpm scripts added to `apps/api/package.json`:
  - `pipeline:validate` → `--validate`
  - `pipeline:crawl` → `--crawl`
  - `pipeline:seed` → `--seed`
  - `pipeline:run` → `--run`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Security] Inline HTML sanitization instead of isomorphic-dompurify in SeedService**
- **Found during:** Task 2 implementation
- **Issue:** The plan referenced `isomorphic-dompurify` in the threat model, but calling `clearWindow()` after each passage (to avoid jsdom memory accumulation) adds significant complexity to the pipeline CLI
- **Fix:** Implemented targeted inline HTML sanitization in SeedService that removes all XSS vectors (script/style tags, event attributes, javascript: href/src) without jsdom dependency. The PassageRenderer client component still uses `isomorphic-dompurify` for render-time sanitization as planned.
- **Files modified:** apps/api/src/pipeline/seed.service.ts
- **Commit:** 6d3ce24

## Known Stubs

| Stub | File | Description |
|------|------|-------------|
| Stub ReadingQuestion content | seed.service.ts `generateStubQuestions()` | Question prompts/answers are generic templates using passage's first sentence. Plan explicitly calls for simplified stubs. Full AI-generated questions are deferred to Phase 5 AI Exercise Generation plan. |

## Threat Surface Scan

All threat surface changes are within the plan's registered threat model:

| Flag | File | Description |
|------|------|-------------|
| T-05-05-01 (covered) | crawler.service.ts | Crawled HTML from external websites — sanitized in SeedService before DB insert |
| T-05-05-02 (covered) | seed.service.ts | All content via parameterized Prisma createMany data objects |
| T-05-05-03 (covered) | crawler.service.ts | Polite delay 300–1200ms random |

No new unplanned threat surface introduced.

## Self-Check: PASSED

Files exist:
- [FOUND] apps/api/src/pipeline/crawler.service.ts
- [FOUND] apps/api/src/pipeline/seed.service.ts
- [FOUND] apps/api/src/pipeline/pipeline.cli.ts

Commits exist:
- [FOUND] 747998a — feat(05-05): CrawlerService
- [FOUND] 6d3ce24 — feat(05-05): SeedService + PipelineModule + CLI bootstrap
