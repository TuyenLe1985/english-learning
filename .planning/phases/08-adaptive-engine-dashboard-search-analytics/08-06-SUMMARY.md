---
phase: 08-adaptive-engine-dashboard-search-analytics
plan: "06"
subsystem: frontend-search-analytics
tags: [search, analytics, recharts, react-activity-calendar, relay, xss-sanitization]
dependency_graph:
  requires: ["08-03", "08-04", "08-05"]
  provides: [search-ui, analytics-ui]
  affects: [apps/web/src/app/(dashboard)/search, apps/web/src/app/(dashboard)/analytics]
tech_stack:
  added: [react-activity-calendar]
  patterns:
    - Next.js Server Component + relay route forwarding query params
    - Recharts ResponsiveContainer with explicit-height wrapper (Pitfall 6)
    - "use client" chart isolation (Pitfall 7)
    - XSS-safe snippet rendering via sanitizeSnippet() + dangerouslySetInnerHTML
key_files:
  created:
    - apps/web/src/app/api/search/route.ts
    - apps/web/src/lib/sanitize-snippet.ts
    - apps/web/src/app/(dashboard)/search/page.tsx
    - apps/web/src/components/search/search-filters.tsx
    - apps/web/src/components/search/search-result-group.tsx
    - apps/web/src/components/search/search-result-item.tsx
    - apps/web/src/app/api/analytics/me/route.ts
    - apps/web/src/app/(dashboard)/analytics/page.tsx
    - apps/web/src/components/analytics/cefr-progression-chart.tsx
    - apps/web/src/components/analytics/vocab-retention-chart.tsx
    - apps/web/src/components/analytics/learning-time-chart.tsx
    - apps/web/src/components/analytics/skill-breakdown-chart.tsx
    - apps/web/src/components/analytics/activity-heatmap.tsx
  modified:
    - apps/web/src/components/analytics/activity-heatmap.test.tsx
decisions:
  - "Search relay forwards all URL query params (q, level, topic, skill) to NestJS using searchParams.forEach to preserve multi-value semantics"
  - "sanitizeSnippet() regex strips all HTML except <mark>/<mark> before dangerouslySetInnerHTML — raw snippet never rendered (T-08-15)"
  - "SkillBreakdownChart uses accuracy bars (SkillScoresCard pattern) over recharts BarChart — matches existing dashboard structure"
  - "ActivityHeatmap wraps react-activity-calendar in role=grid aria-label for accessibility"
  - "All Recharts components use explicit-height div wrappers (h-[200px]) — prevents ResponsiveContainer height=0 bug"
metrics:
  duration: "continuation session (prior session hit usage limit)"
  completed: "2026-06-20"
  tasks_completed: 2
  files_created: 13
  files_modified: 1
requirements_satisfied: [SRCH-01, SRCH-02, SRCH-03, SRCH-04, ANLT-01, ANLT-02]
---

# Phase 08 Plan 06: Search UI + Student Analytics UI Summary

Search page (grouped results, XSS-safe snippets, URL-driven filters) and analytics page (5 Recharts visualizations + GitHub-style activity heatmap) delivered end-to-end with GREEN TDD test.

## What Was Built

### Task 1: Search Slice (commit 02fc711)

**Relay:** `apps/web/src/app/api/search/route.ts` — forwards all URL query params to NestJS `GET /api/search` using `searchParams.forEach` so `q`, `level`, `topic`, `skill` all pass through. Session-gated via `auth()`.

**XSS sanitizer:** `apps/web/src/lib/sanitize-snippet.ts` — `sanitizeSnippet()` strips all HTML tags except `<mark>` and `</mark>` using a regex replace. The search result item imports this and sanitizes before passing to `dangerouslySetInnerHTML` — raw `result.snippet` is never rendered (T-08-15 mitigated).

**Search page** (`/search`): Server Component reading `searchParams` prop. Auth-redirects to `/login` if no session. Skips fetch when `q` is absent. Renders heading `Search results for "{query}"`, result count, `SearchFilters` bar, and result groups in fixed order (Vocabulary, Grammar, Reading, Listening, Quizzes). No-results and error states included. Framer-motion group stagger on result groups.

**SearchFilters:** URL-driven CEFR/Topic/Skill selects with dismissible Badge chips and "Clear all" — preserves `q` param. Targets `/search`.

**SearchResultGroup:** Separator, module name heading, count Badge, first 5 items, "Show N more →" link when overflow.

**SearchResultItem:** Title, CefrBadge, topic Badge, content-type label, highlighted snippet with `<mark>` styled `bg-yellow-100 text-yellow-800`.

### Task 2: Analytics Slice (commit e32978d)

**Relay:** `apps/web/src/app/api/analytics/me/route.ts` — plain copy targeting NestJS `GET /api/analytics/me`. Session-gated (T-08-14 mitigated — auth() returns 401 before any NestJS call).

**Analytics page** (`/analytics`): Server Component with auth redirect, fetches `INTERNAL_API_URL/api/analytics/me` with graceful null fallback to empty-state DTO. Layout: `max-w-4xl`, heading "Your Analytics", 2-column grid (CefrProgressionChart + VocabRetentionChart + LearningTimeChart + SkillBreakdownChart), full-width ActivityHeatmap. Empty state per UI-SPEC.

**CefrProgressionChart:** `"use client"` LineChart, Y-axis 1/2/3 → B1/B2/C1 via tickFormatter, `--chart-2` stroke color, 200px explicit-height wrapper.

**VocabRetentionChart:** `"use client"` LineChart, retention rate over weeks, `--chart-3` stroke.

**LearningTimeChart:** `"use client"` BarChart with local-state Daily/Weekly/Monthly Select (default Weekly), `--chart-4` fill.

**SkillBreakdownChart (ANLT-01):** `"use client"` Card with per-skill accuracy bars over `AnalyticsDto.skillBreakdown[]`. `isWeak` skills render `text-destructive` label + `bg-destructive` bar + `bg-destructive/10` row background.

**ActivityHeatmap:** `"use client"` wrapping `react-activity-calendar`, `Activity[] {date, count, level}` prop, D-16 light theme colors (`["hsl(240 4.8% 95.9%)", "#bbf7d0", "#4ade80", "#16a34a", "#14532d"]`), `showWeekdayLabels`, tooltip labels, `role="grid"` aria-label.

**TDD:** `activity-heatmap.test.tsx` (RED from plan 08-01c) turned GREEN — 3 tests pass confirming ANLT-01 "renders 365 days of data".

## Requirements Satisfied

| ID | Description | Status |
|----|-------------|--------|
| SRCH-01 | Search UI surface — /search page with grouped results | Done |
| SRCH-02 | Search snippets with highlighted terms | Done |
| SRCH-03 | Search filters (CEFR, topic, skill) URL-driven | Done |
| SRCH-04 | XSS-safe snippet rendering via sanitizeSnippet() | Done |
| ANLT-01 | Student analytics — per-skill accuracy breakdown + activity heatmap | Done |
| ANLT-02 | Analytics page CEFR progression, vocab retention, learning time charts | Done |

## Deviations from Plan

None — plan executed as written. All 14 files from the plan's `files_modified` frontmatter are present.

## Threat Model Coverage

| Threat | Mitigation Applied |
|--------|-------------------|
| T-08-14 (Spoofing — search/analytics relays) | `auth()` checks session before `fetchWithAuth` in both relay routes; returns 401 if no session |
| T-08-15 (XSS — search snippet rendering) | `sanitizeSnippet()` strips all tags except `<mark>` before `dangerouslySetInnerHTML`; raw snippet never reaches DOM |

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1: Search slice | `02fc711` | Search relay + page + result/filter components |
| Task 2: Analytics slice | `e32978d` | Analytics relay + page + 5 chart components + GREEN heatmap test |

## Self-Check: PASSED

All 14 plan files verified present on disk:
- FOUND: apps/web/src/app/api/search/route.ts
- FOUND: apps/web/src/lib/sanitize-snippet.ts
- FOUND: apps/web/src/app/(dashboard)/search/page.tsx
- FOUND: apps/web/src/components/search/search-filters.tsx
- FOUND: apps/web/src/components/search/search-result-group.tsx
- FOUND: apps/web/src/components/search/search-result-item.tsx
- FOUND: apps/web/src/app/api/analytics/me/route.ts
- FOUND: apps/web/src/app/(dashboard)/analytics/page.tsx
- FOUND: apps/web/src/components/analytics/cefr-progression-chart.tsx
- FOUND: apps/web/src/components/analytics/vocab-retention-chart.tsx
- FOUND: apps/web/src/components/analytics/learning-time-chart.tsx
- FOUND: apps/web/src/components/analytics/skill-breakdown-chart.tsx
- FOUND: apps/web/src/components/analytics/activity-heatmap.tsx
- FOUND: apps/web/src/components/analytics/activity-heatmap.test.tsx

Commits verified:
- `02fc711` (Task 1) — present in git log
- `e32978d` (Task 2) — present in git log

Activity-heatmap test: 3 tests PASSED (ANLT-01 GREEN).
