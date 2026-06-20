---
plan: 08-03
phase: 08
status: complete
completed: 2026-06-20
key-files:
  created:
    - apps/api/src/search/search.dto.ts
  modified:
    - apps/api/src/search/search.service.ts
    - apps/api/src/search/search.controller.ts
deviations:
  - "Executed inline by orchestrator after executor agent hit Bash permission restriction"
---

## What Was Built

**Plan 08-03: Full-Text Search Backend — SRCH-01 through SRCH-04**

### Task 1: SearchService + DTO (commit 36ad569)

- `search.dto.ts` — local DTO: `SearchResultDto`, `SearchResultGroupDto`, `SearchResponseDto`, `SearchFilters`
- `search.service.ts` — `search(q, filters)` method implementing:
  - Short-circuit on empty/whitespace query (returns `[]` without hitting DB)
  - UNION ALL across 4 branches: vocabulary, grammar, reading, listening
  - `plainto_tsquery` + `ts_headline` with `<mark>` tags per branch
  - Grammar: JOINs `GrammarTopic` for `cefrLevel`; uses `explanation` (not `content` — Pitfall 1)
  - Listening: uses `ListeningContent` + `"transcriptText"` (Pitfall 2)
  - Reading + Listening: `"isPublished" = true` filter
  - Dynamic filters (level, topic, skill) via `Prisma.sql` / `Prisma.join` — no raw string concat
  - Outer `LIMIT 100` (Pitfall 5 — DoS mitigation T-08-07)
  - `groupResults()` helper groups flat rows into fixed order: Vocabulary · Grammar · Reading · Listening
- All 5 tests in `search.service.spec.ts` GREEN

### Task 2: SearchController (commit b7244e8)

- `search.controller.ts` — `@UseGuards(JwtAuthGuard) @Get()` handler
  - Reads `q`, `level`, `topic`, `skill` via `@Query()`
  - Delegates to `searchService.search()` then `searchService.groupResults()`
  - Returns `SearchResponseDto` shape: `{query, total, groups}`
- `search.module.ts` and `app.module.ts` NOT touched (owned by 08-01b)

## Self-Check: PASSED

- `search.service.spec.ts`: 5/5 tests GREEN (SRCH-02, SRCH-03)
- `plainto_tsquery` + `ts_headline` present
- `explanation` (grammar) + `"transcriptText"` (listening) correct
- `"isPublished" = true` on reading + listening branches
- `LIMIT 100` outer guard present
- No user input concatenated as raw SQL
- `JwtAuthGuard` on controller endpoint

## Requirements Coverage

| Req ID | Status | Notes |
|--------|--------|-------|
| SRCH-01 | GREEN | 4 content types indexed; Quiz excluded per D-11 |
| SRCH-02 | GREEN | GIN FTS UNION ALL, tests pass |
| SRCH-03 | GREEN | level/topic/skill filters via Prisma.sql |
| SRCH-04 | GREEN | Results grouped by type in fixed order |
| T-08-05 | Mitigated | Prisma tagged template auto-parameterizes `q` |
| T-08-06 | Mitigated | JwtAuthGuard on GET /api/search |
| T-08-07 | Mitigated | LIMIT 100 outer guard |
