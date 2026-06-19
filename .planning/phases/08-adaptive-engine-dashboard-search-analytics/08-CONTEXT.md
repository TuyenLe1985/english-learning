# Phase 8: Adaptive Engine + Dashboard + Search + Analytics - Context

**Gathered:** 2026-06-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Users see a fully populated personalized dashboard (CEFR level, XP bar, skill scores, activity charts, skill radar, Continue Learning widget, recent/bookmarked content), can search all platform content via a persistent nav bar → `/search` page backed by PostgreSQL GIN full-text search, experience an adaptive engine that continuously updates per-skill scores and routes them toward weak topics, and can view detailed student analytics (CEFR progression, vocabulary retention, learning time, GitHub-style activity heatmap) — plus admins can view a platform health dashboard.

**Deliverables:**
- NestJS AdaptiveModule: `updateSkillScore(userId, skillArea, accuracy)` + `getWeakTopics(userId)` + `getContinueLearningRecommendation(userId)` — called inline from all 5 session-complete endpoints
- NestJS SearchModule: `GET /api/search?q=...&level=...&topic=...&skill=...` — PostgreSQL GIN full-text across 5 tables, `ts_headline()` snippets, < 300 ms
- NestJS AnalyticsModule: student analytics endpoint (CEFR progression, vocabulary retention, learning time, weekly activity grid); admin analytics endpoint (active users, retention, top content, user growth)
- Next.js dashboard page: replaces placeholder — hero XP/level bar + two-column grid (skill scores + radar left, activity chart + Continue Learning right) + horizontal scroll rows (recently viewed, bookmarked)
- Next.js `/search` page: search bar in top nav, grouped results by content type with ts_headline snippets, CEFR/topic/skill filters
- Next.js `/analytics` route: student analytics page (4 charts: CEFR progression line, vocabulary retention, learning time bar, activity contribution grid)
- Next.js `/admin` route: admin dashboard (active users, retention, top content, user growth) — visible in sidebar only for ADMIN role
- `User.role` field addition to Prisma schema: `UserRole` enum (USER | ADMIN); `pnpm db:seed:admin` script
- Prisma migration: add GIN indexes on relevant FTS columns

</domain>

<decisions>
## Implementation Decisions

### Dashboard Layout
- **D-01:** **XP + level bar dominates the hero section** — Level badge, XP bar toward next level, streak flame. Gamification-first, Duolingo/Quizlet aesthetic. Positioned at top of page above the main grid.
- **D-02:** **Two-column grid on desktop below the hero** — Left column: skill scores card + skill radar chart (Recharts). Right column: daily/weekly activity bar chart (Recharts) + Continue Learning widget. Mobile: single-column stacked.
- **D-03:** **Continue Learning widget primary CTA = weakest skill area lesson** — Surfaces the skill area with `isWeak=true` and lowest accuracy. Pre-threshold (<5 completed exercises across any module): shows a sensible default (e.g., "Start Vocabulary" or "Try a Grammar Lesson"). After threshold: shows "Work on [Skill Area] — your lowest at X%".
- **D-04:** **Horizontal scroll rows below the two-column grid** — "Recently Viewed" row (last 4 items) and "Bookmarked" row (last 4 items), each with a "View all →" link. Full-width below the main grid.

### Adaptive Engine
- **D-05:** **SkillScore updates are inline and synchronous** — `AdaptiveService.updateSkillScore(userId, skillArea, accuracy)` is called in every session-complete endpoint immediately after `GamificationService.awardXp()`. Same call-chain pattern as Phase 7 achievement checks. Adds ~5ms to endpoint; no queue needed at portfolio scale.
- **D-06:** **Difficulty unlock = surfacing recommendation only (no hard gate)** — No API-level content restrictions. Content endpoints remain fully open. The adaptive engine changes what it recommends once accuracy ≥ 80% on the current tier (e.g., starts recommending B2 content when B1 accuracy ≥ 80%). No 403 guards, no UI padlocks.
- **D-07:** **Weak topic priority = lowest accuracy, ties broken by recency** — Sort `SkillScore` by `accuracy ASC` where `isWeak = true` (accuracy < 60%). Tie-break by `updatedAt DESC` (most recently practiced). The single lowest entry is the Continue Learning recommendation.
- **D-08:** **Weak threshold = accuracy < 60%** — Matches ROADMAP success criterion 2 exactly. `SkillScore.isWeak` is set to `true` when accuracy drops below 60% and to `false` when it recovers to ≥ 60%.

### Global Search
- **D-09:** **Search entry point = persistent nav bar → /search page** — A search `<input>` in the top navigation header on all dashboard pages. On submit (Enter or search button), navigates to `/search?q={query}`. Results are bookmarkable and shareable.
- **D-10:** **Results grouped by content type with section headers** — Sections: Vocabulary · Grammar · Reading · Listening · Quiz. Each section shows top 3–5 results (title, CEFR badge, topic tag, ts_headline snippet). A "Show more" link per section. Cross-module filtering via query params: `?level=B2&topic=technology&skill=reading`.
- **D-11:** **GIN full-text index columns** — `VocabularyWord`: (word, definition); `GrammarLesson`: (title, content); `ReadingPassage`: (title, content); `ListeningItem`: (title, transcript). GIN index on `to_tsvector('english', ...)`. `QuizSession` table excluded. Prisma migration adds `@@index` with raw SQL for GIN.
- **D-12:** **Snippets via PostgreSQL ts_headline()** — Highlighted snippets with matched terms bolded generated by `ts_headline(content, query)` in the same FTS query. No extra post-processing needed.

### Analytics + Admin
- **D-13:** **Student analytics at dedicated /analytics route** — Separate page in the `(dashboard)` route group. Linked from the sidebar nav and the profile page. Contains 4 Recharts charts: (1) CEFR progression line chart over time, (2) vocabulary retention rate line chart, (3) learning time bar chart (daily/weekly/monthly), (4) GitHub-style contribution grid (52 cols × 7 rows, colored by activity intensity).
- **D-14:** **Admin role via User.role enum field** — Add `UserRole` enum (`USER` | `ADMIN`) to Prisma schema. `User.role` defaults to `USER`. A `pnpm db:seed:admin` script upserts an admin user. NestJS admin endpoints guarded by a `RolesGuard` checking `role === 'ADMIN'`.
- **D-15:** **Admin dashboard at /admin, sidebar link ADMIN-only** — Admin dashboard at `/admin` in the `(dashboard)` route group. Sidebar nav link rendered conditionally only when `session.user.role === 'ADMIN'`. Shows: active users (DAU/WAU/MAU), retention rate, top content (most-viewed passages/exercises), user growth chart.
- **D-16:** **Activity heatmap = GitHub-style contribution grid** — Year-at-a-glance 52×7 grid where each cell = one day, colored by exercise count intensity (0 = grey, 1–3 = light green, 4–7 = medium, 8+ = dark green). Data sourced from `ActivityLog` grouped by `loggedAt::date`. Built with a custom SVG/CSS grid or lightweight charting (not a Recharts built-in).

### Claude's Discretion
- NestJS AdaptiveModule structure (controller, service, DTOs — follow GamificationModule pattern from Phase 7)
- NestJS SearchModule: exact Prisma `$queryRaw` vs. Prisma extension for FTS queries
- NestJS AnalyticsModule: exact endpoint paths, caching strategy (Redis TTL for admin stats)
- Recharts chart types for skill radar (RadarChart), activity bar (BarChart), CEFR progression (LineChart)
- Exact shadcn/ui components for the dashboard layout (Card, Separator, ScrollArea for horizontal rows)
- Top-nav search input component placement and styling
- `RolesGuard` implementation details (extend existing `JwtAuthGuard` or separate decorator)
- Weekly activity contribution grid implementation (SVG vs. react-activity-calendar library)
- Exact Framer Motion animations for dashboard hero section (if any)
- Admin seed script specifics (email/password for default admin)
- GIN index migration SQL syntax in Prisma (raw SQL in migration file vs. `@@index` annotation)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Scope and Requirements
- `.planning/ROADMAP.md` — Phase 8 goal, 5 success criteria, requirement IDs (ADPT-01–05, DASH-01–04, SRCH-01–04, ANLT-01–02), depends on Phase 7
- `.planning/REQUIREMENTS.md` — DASH-01 (XP/CEFR/skill/charts), DASH-02 (Continue Learning widget), DASH-03 (activity chart + radar), DASH-04 (recently viewed + bookmarks), ADPT-01–05 (adaptive engine), SRCH-01–04 (global search), ANLT-01 (student analytics), ANLT-02 (admin analytics)
- `.planning/PROJECT.md` — Core value, tech stack decisions, constraints

### Database Schema (CRITICAL — read before writing any code)
- `packages/database/prisma/schema.prisma` — Models relevant to Phase 8:
  - `SkillScore` (userId, skillArea, score, accuracy, isWeak, updatedAt — @@unique[userId, skillArea])
  - `ActivityLog` (userId, activityType, skillArea, metadata, loggedAt — @@index[userId, loggedAt])
  - `XpEvent` (userId, amount, reason, skillArea, sourceRef, createdAt)
  - `UserAchievement` (userId, achievementId, earnedAt)
  - `User.xpTotal`, `User.level`, `User.cefrLevel`, `User.streak`
  - Add `User.role` field (UserRole enum: USER | ADMIN) via new migration
  - Verify `GrammarLesson`, `VocabularyWord`, `ReadingPassage`, `ListeningItem` tables exist with `title`, `content`/`definition`, `cefrLevel`, `topic` fields for FTS indexing
  - GIN indexes: add via raw SQL Prisma migration on FTS columns for each module table

### Technology Stack (LOCKED)
- `CLAUDE.md` §Technology Stack table — Next.js 14, NestJS 11, Tailwind 3.x, React 18.x, shadcn/ui New York/zinc
- `CLAUDE.md` §Supporting Libraries — `@tanstack/react-query` 5.x for server state, `recharts` for all charts (radar, bar, line), `date-fns` 3.x for date grouping in analytics

### Prior Phase Patterns (closest analogs)
- `.planning/phases/07-quiz-center-gamification/07-CONTEXT.md` — D-12 (synchronous inline achievement checks after awardXp — AdaptiveService follows same call chain), D-13 (hardcoded definitions + seed pattern for achievement definitions — admin seed follows same), D-14 (all 5 modules wired to GamificationService — same modules need AdaptiveService wiring)
- `.planning/phases/05-reading-comprehension-content-pipeline/05-CONTEXT.md` — D-09 (standalone script pattern) — admin seed script follows same NestJS CLI context pattern

### Existing Code Patterns (read before implementing)
- `apps/api/src/gamification/gamification.service.ts` — inline session-complete hook pattern; AdaptiveService is a sibling service following this exact structure
- `apps/api/src/grammar/grammar.service.ts` + `apps/api/src/vocabulary/vocabulary.service.ts` + `apps/api/src/reading/reading.service.ts` + `apps/api/src/listening/listening.service.ts` — session-complete endpoints to add `adaptiveService.updateSkillScore()` call
- `apps/api/src/app.module.ts` — Add AdaptiveModule, SearchModule, AnalyticsModule
- `apps/api/src/auth/jwt-auth.guard.ts` — Extend or wrap for RolesGuard (ADMIN endpoints)
- `apps/web/src/app/(dashboard)/layout.tsx` — Add search input to top nav; add /admin link conditional on role
- `apps/web/src/app/(dashboard)/dashboard/page.tsx` — Currently a placeholder; full implementation in this phase
- `apps/web/src/lib/api-client.ts` — All new API calls route through this Axios client
- `apps/web/src/components/ui/progress.tsx` — XP progress bar (shadcn/ui), reused in dashboard hero
- `apps/web/src/components/cefr-badge.tsx` — CEFR badge, reused in search results

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `apps/web/src/components/ui/progress.tsx` — shadcn Progress bar; reused for XP bar in dashboard hero
- `apps/web/src/components/cefr-badge.tsx` — CEFR level badge; reused in search result cards and dashboard skill scores
- `apps/web/src/components/ui/card.tsx` (shadcn Card) — all dashboard cards, search result cards, analytics charts containers
- `apps/web/src/components/ui/scroll-area.tsx` (shadcn ScrollArea) — horizontal scroll rows for recently viewed + bookmarks
- `apps/api/src/gamification/gamification.service.ts` — `awardXp()` call pattern; `updateSkillScore()` follows same pattern and is called immediately after `awardXp()`
- `packages/shared/src/index.ts` — Add new DTOs: `DashboardDto`, `SearchResultDto`, `SearchResultGroupDto`, `AnalyticsDto`, `AdminAnalyticsDto`

### Established Patterns
- NestJS global prefix `/api` — all new endpoints under `/api/search`, `/api/analytics`, `/api/admin/analytics`, `/api/adaptive`
- Global `ValidationPipe` (`whitelist: true`, `transform: true`) — all new DTOs auto-validated
- shadcn/ui New York/zinc theme established — all new components follow same card/button/badge palette
- React Query 5.x for all server state — dashboard, search, analytics all use `useQuery` hooks
- Dashboard route group `(dashboard)` — all new routes under `apps/web/src/app/(dashboard)/`
- `GrammarLesson`, `VocabularyWord`, `ReadingPassage`, `ListeningItem` already filterable by `cefrLevel` — search adds FTS on top of existing filter infrastructure

### Integration Points
- **All 5 session-complete endpoints** — Add `adaptiveService.updateSkillScore(userId, skillArea, accuracy)` after `gamificationService.awardXp()` call
- `apps/web/src/app/(dashboard)/layout.tsx` — Add search `<input>` to top nav header; add `/admin` sidebar link conditional on `session.user.role === 'ADMIN'`
- `apps/web/src/app/(dashboard)/dashboard/page.tsx` — Replace placeholder with full dashboard implementation
- `packages/database/prisma/schema.prisma` — Add `UserRole` enum, `User.role` field, GIN index migration
- `apps/api/src/app.module.ts` — Register AdaptiveModule, SearchModule, AnalyticsModule

</code_context>

<specifics>
## Specific Ideas

- **Dashboard hero** — Level badge (from Phase 7 LevelBadge component) + XP progress bar toward next level (`xpTotal % 100` out of 100) + streak flame icon + count. All in a single hero card spanning full width.
- **Continue Learning pre-threshold copy** — When user has < 5 exercises completed, show "Begin your journey → [Module Name]" with a module icon (e.g., BookOpen for Reading, Headphones for Listening). Avoids an empty "You have no weak areas" message.
- **Search GIN Prisma migration** — GIN indexes require raw SQL in a Prisma migration file since Prisma doesn't natively generate GIN index syntax. Pattern: `CREATE INDEX IF NOT EXISTS "VocabularyWord_fts_idx" ON "VocabularyWord" USING GIN (to_tsvector('english', word || ' ' || definition));`
- **Activity contribution grid** — Consider `react-activity-calendar` npm package (lightweight, GitHub-style, zero dependencies). Query: `ActivityLog GROUP BY loggedAt::date, COUNT(*)` for the last 365 days.
- **Admin analytics Redis caching** — Admin stats (DAU/WAU/MAU, top content) can be expensive queries. Cache with Redis TTL 5 minutes using `ioredis` in AnalyticsService — same pattern as other cached endpoints in the project.
- **CEFR progression tracking** — Needs a `CefrHistory` table or a derived query from `ActivityLog` snapshots. Check if `packages/database/prisma/schema.prisma` has a `CefrHistory` model already scaffolded in Phase 1; if not, planner needs to add it.

</specifics>

<deferred>
## Deferred Ideas

- **Leaderboard** — Users ranked by XP/level within CEFR cohort. Listed in REQUIREMENTS.md under v2/SOCL-01 — out of v1 scope.
- **Push notifications** — Daily learning reminders, streak alerts. Listed in NOTIF requirements — out of v1 scope for this phase.
- **AI Tutor / conversational chat** — Explicitly out of scope per PROJECT.md.
- **Placement test routing** — QUIZ-06 (placement test determining CEFR level) noted in REQUIREMENTS.md but not in Phase 8 success criteria. Deferred post-v1.
- **Content gating hard enforcement** — D-06 locks this as "recommendation only." Hard gating (403 guards) can be added post-v1 if desired.
- **Export analytics as PDF/CSV** — Portfolio enhancement; not in current requirements.

</deferred>

---

*Phase: 8-Adaptive Engine + Dashboard + Search + Analytics*
*Context gathered: 2026-06-20*
