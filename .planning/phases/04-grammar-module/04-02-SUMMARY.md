---
phase: 04-grammar-module
plan: "02"
subsystem: grammar-api
status: complete
completed: 2026-06-13
requirements: [GRAM-01, GRAM-02, GRAM-04, GRAM-06]
tags: [nestjs, grammar, tdd, jwt-auth, prisma]

dependency_graph:
  requires:
    - "04-01: grammar schema slugs, DTOs, seed data, RED test scaffolds"
  provides:
    - "GET /api/grammar/areas — all areas with topicCount (GRAM-01)"
    - "GET /api/grammar/areas/:areaSlug/topics — topics in area (GRAM-01)"
    - "GET /api/grammar/topics/:topicSlug/lessons — topic detail + lesson list with masteryPct (GRAM-01)"
    - "GET /api/grammar/lessons/:lessonSlug — full lesson detail + questions (GRAM-02)"
    - "POST /api/grammar/sessions/complete — records attempts + upserts masteryPct (GRAM-04)"
    - "GET /api/grammar/topics/:topicSlug/weak-questions — incorrect most-recent attempts (GRAM-06)"
    - "GrammarModule registered in AppModule"

tech_stack:
  added: []
  patterns:
    - "JwtAuthGuard on all endpoints — userId from req.user.userId never from body"
    - "Fixed-string routes before parameterized routes (NestJS route order pitfall)"
    - "grammarProgress.upsert on userId_topicId with accumulated masteryPct"
    - "getWeakQuestions: JS dedup on most-recent attempt per questionId"

key_files:
  created:
    - apps/api/src/grammar/grammar.service.ts
    - apps/api/src/grammar/grammar.controller.ts
    - apps/api/src/grammar/grammar.module.ts
  modified:
    - apps/api/src/app.module.ts

decisions:
  - "getWeakQuestions deduplicates in JS (most-recent-first from Prisma orderBy attemptedAt desc) to avoid complex SQL window functions"
  - "completeSession reads existing GrammarProgress before upsert to accumulate totals correctly across multiple sessions"

metrics:
  duration: "~1h"
  completed: 2026-06-13
  tasks: 1
  files_created: 3
  files_modified: 1

tdd:
  red_commit: "b270773 feat(04-01): grammar seed dataset, seedGrammar(), 4 RED test scaffolds"
  green_commit: "7d30c7a feat(04-02): implement NestJS GrammarModule"
  tests_passing: 11
---

# Phase 04 Plan 02 Summary — NestJS GrammarModule

## What Was Built

NestJS GrammarModule with controller, service, and AppModule registration — turning the RED `grammar.service.spec.ts` from plan 01 fully GREEN (11/11 tests pass).

### Endpoints

| Method | Route | Service Method | Requirement |
|--------|-------|----------------|-------------|
| GET | `/api/grammar/areas` | `getAreas()` | GRAM-01 |
| GET | `/api/grammar/areas/:areaSlug/topics` | `getTopicsByArea()` | GRAM-01 |
| GET | `/api/grammar/topics/:topicSlug/lessons` | `getLessonsByTopic()` | GRAM-01 |
| GET | `/api/grammar/lessons/:lessonSlug` | `getLessonDetail()` | GRAM-02 |
| POST | `/api/grammar/sessions/complete` | `completeSession()` | GRAM-04 |
| GET | `/api/grammar/topics/:topicSlug/weak-questions` | `getWeakQuestionsBySlug()` | GRAM-06 |

All endpoints protected by `@UseGuards(JwtAuthGuard)`. userId always from `req.user.userId`.

### TDD Gate

- RED: `b270773` (04-01 scaffold — GrammarService import fails)
- GREEN: `7d30c7a` (04-02 implementation — 11/11 pass)

## Deviations from Plan

None — implementation matched plan spec exactly.

## Self-Check

- [x] grammar.service.spec.ts: 11/11 tests passing
- [x] All endpoints behind JwtAuthGuard
- [x] userId from JWT only (never request body)
- [x] Fixed routes before param routes in controller
- [x] GrammarModule registered in AppModule
- [x] grammarProgress.upsert with userId_topicId key

## Self-Check: PASSED
