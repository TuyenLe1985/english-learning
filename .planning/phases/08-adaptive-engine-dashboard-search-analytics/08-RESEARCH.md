# Phase 8: Adaptive Engine + Dashboard + Search + Analytics - Research

**Researched:** 2026-06-20
**Domain:** Dashboard UI, Adaptive Engine, PostgreSQL FTS, React charting, NestJS RBAC, Redis caching
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** XP + level bar dominates the hero section — Level badge, XP bar toward next level, streak flame. Gamification-first, Duolingo/Quizlet aesthetic. Positioned at top of page above the main grid.
- **D-02:** Two-column grid on desktop below the hero — Left column: skill scores card + skill radar chart (Recharts). Right column: daily/weekly activity bar chart (Recharts) + Continue Learning widget. Mobile: single-column stacked.
- **D-03:** Continue Learning widget primary CTA = weakest skill area lesson — Surfaces the skill area with `isWeak=true` and lowest accuracy. Pre-threshold (<5 completed exercises across any module): shows a sensible default. After threshold: shows "Work on [Skill Area] — your lowest at X%".
- **D-04:** Horizontal scroll rows below the two-column grid — "Recently Viewed" row (last 4 items) and "Bookmarked" row (last 4 items), each with a "View all →" link.
- **D-05:** SkillScore updates are inline and synchronous — `AdaptiveService.updateSkillScore(userId, skillArea, accuracy)` called in every session-complete endpoint immediately after `GamificationService.awardXp()`. Same call-chain pattern as Phase 7. Adds ~5ms; no queue needed.
- **D-06:** Difficulty unlock = surfacing recommendation only (no hard gate) — No 403 guards; adaptive engine changes what it recommends once accuracy ≥ 80%.
- **D-07:** Weak topic priority = lowest accuracy, ties broken by recency — Sort `SkillScore` by `accuracy ASC` where `isWeak = true`. Tie-break by `updatedAt DESC`.
- **D-08:** Weak threshold = accuracy < 60% — `SkillScore.isWeak` = true when accuracy < 60%, false when ≥ 60%.
- **D-09:** Search entry point = persistent nav bar → /search page — On Enter/submit, navigates to `/search?q={query}`. Results are bookmarkable.
- **D-10:** Results grouped by content type with section headers — Sections: Vocabulary · Grammar · Reading · Listening · Quiz. Top 3–5 per section. Cross-module filtering via `?level=B2&topic=technology&skill=reading`.
- **D-11:** GIN full-text index columns — `VocabularyWord`: (word, definition); `GrammarLesson`: (title, explanation); `ReadingPassage`: (title, content); `ListeningContent`: (title, transcriptText). QuizSession excluded.
- **D-12:** Snippets via PostgreSQL `ts_headline()` — highlighted snippets with matched terms bolded.
- **D-13:** Student analytics at `/analytics` route — 4 Recharts charts: CEFR progression line, vocabulary retention line, learning time bar, activity heatmap.
- **D-14:** Admin role via `User.role` enum — `UserRole` enum is `STUDENT | ADMIN` (already in schema — no migration needed). Default `STUDENT`. `pnpm db:seed:admin` script upserts admin user. Admin endpoints guarded by `RolesGuard`.
- **D-15:** Admin dashboard at `/admin`, sidebar link ADMIN-only.
- **D-16:** Activity heatmap = GitHub-style 52×7 contribution grid — colored by exercise count.

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

### Deferred Ideas (OUT OF SCOPE)

- Leaderboard (v2/SOCL-01)
- Push notifications (NOTF requirements)
- AI Tutor / conversational chat
- Placement test routing (QUIZ-06)
- Content gating hard enforcement (D-06 locks as recommendation-only)
- Export analytics as PDF/CSV
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ADPT-01 | Track per-user skill scores: grammar accuracy, vocabulary retention, reading score, listening score | SkillScore model exists in schema (@@unique[userId, skillArea]); upsert pattern in AdaptiveService |
| ADPT-02 | After each lesson/quiz, update skill scores and flag topics where accuracy < 60% as "weak" | Inline synchronous hook after `awardXp()` — same pattern as achievement checks in GamificationService |
| ADPT-03 | Dashboard "Continue Learning" surfaces highest-priority weak topic for user's CEFR level | GET /api/adaptive/recommendation — query SkillScore WHERE isWeak=true ORDER BY accuracy ASC, updatedAt DESC |
| ADPT-04 | Lesson difficulty increases progressively as user demonstrates mastery (≥ 80%) | Recommendation-only (D-06): AdaptiveService returns recommended CEFR tier, no content gating |
| ADPT-05 | Adaptive recommendations activate only after ≥ 5 exercises completed | COUNT(ActivityLog) threshold gate in getContinueLearningRecommendation() |
| DASH-01 | Dashboard shows CEFR level, XP progress bar, total lessons completed, per-skill scores | DashboardHero + SkillScoresCard; data from GET /api/adaptive/dashboard |
| DASH-02 | Continue Learning widget with current course, recommended next lesson, pending SRS reviews | ContinueLearningWidget driven by GET /api/adaptive/recommendation |
| DASH-03 | Daily/weekly activity bar chart and skill breakdown radar chart (Recharts) | Recharts BarChart + RadarChart; data from ActivityLog GROUP BY date and SkillScore |
| DASH-04 | Recently viewed lessons and bookmarked content for quick re-access | Query ReadingProgress.lastViewedAt + Bookmark model for last 4 items each |
| SRCH-01 | Global search across vocabulary, grammar, reading, listening, quizzes | UNION ALL FTS query across 4 tables via Prisma $queryRaw |
| SRCH-02 | PostgreSQL FTS with GIN index on tsvector columns | GIN index migration SQL; plainto_tsquery; @@ operator |
| SRCH-03 | Search filterable by CEFR level, topic, skill type, difficulty | WHERE clauses added to each UNION sub-query based on filters |
| SRCH-04 | Search results show content type, CEFR level, topic tag, title, snippet | ts_headline() for snippets; ContentType enum for type labels |
| ANLT-01 | Student analytics: CEFR progression over time, vocab retention, learning time, activity heatmap | CefrHistory model (NEW — not in schema); ActivityLog for heatmap; SrsCard for vocab retention |
| ANLT-02 | Admin analytics: active users (DAU/WAU/MAU), retention rate, top content, user growth | Expensive aggregate queries; Redis TTL=5min caching via ioredis |
</phase_requirements>

---

## Summary

Phase 8 delivers five interconnected deliverables across NestJS and Next.js: an AdaptiveModule that scores skills and surfaces recommendations, a SearchModule with PostgreSQL GIN full-text search, an AnalyticsModule for student and admin dashboards, a full dashboard page replacement, and a search/analytics/admin UI.

The codebase is well-prepared: the schema already contains `SkillScore`, `ActivityLog`, `XpEvent`, `UserRole` (STUDENT | ADMIN), and `User.role`. The `GamificationService.awardXp()` call chain in all 5 session-complete endpoints (grammar, vocabulary, reading, listening, quiz) is the established hook point for `AdaptiveService.updateSkillScore()`. The docker-compose already provisions a dedicated `redis-cache` instance on port 6380, and `REDIS_URL_CACHE` env var is pre-defined — no infrastructure changes needed.

Critical schema gaps that require new migrations: (1) `CefrHistory` model is absent and needed for the CEFR progression chart; (2) GIN indexes on 4 FTS tables need raw SQL migration (Prisma does not generate GIN index syntax). Key schema discrepancy vs. CONTEXT.md: `GrammarLesson` uses `explanation` not `content`, and the content table for listening is `ListeningContent` (not `ListeningItem`) with `transcriptText` (not `transcript`).

**Primary recommendation:** Follow the GamificationModule structural pattern exactly; add `ioredis` to `apps/api` dependencies; add `recharts` and `react-activity-calendar` to `apps/web`; create `CefrHistory` Prisma model; write GIN index migrations as raw SQL appended to a new migration file.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| SkillScore upsert and weak detection | API / Backend (NestJS) | — | Data mutation; called inline from 5 session-complete endpoints |
| Continue Learning recommendation logic | API / Backend (NestJS) | — | Business rule (accuracy < 60%, ADPT-05 threshold) belongs in API not browser |
| GIN full-text search query | API / Backend (NestJS) | — | `$queryRaw` PostgreSQL FTS must run server-side; not safe to expose raw SQL to browser |
| Admin stats aggregation | API / Backend (NestJS) | Redis cache | Expensive GROUP BY queries run in NestJS; Redis caches 5-min TTL |
| Dashboard data composition | API / Backend (NestJS) | — | Single `/api/adaptive/dashboard` endpoint aggregates skill scores, XP, streak, recommendations |
| Activity heatmap data | API / Backend (NestJS) | — | `ActivityLog GROUP BY date` aggregation runs on API; React renders the grid |
| Recharts charts (radar, bar, line) | Browser / Client | — | Client components; React hydration; ResponsiveContainer needs DOM width |
| ActivityCalendar heatmap render | Browser / Client | — | `react-activity-calendar` is a client component (SVG/CSS grid) |
| Search UI (filters, groups, snippets) | Browser / Client | Frontend Server (SSR) | SearchPage is a Next.js Server Component reading URL params; result display is client |
| Admin route access gate | Frontend Server (SSR) | API (RolesGuard) | Next.js page redirects non-ADMIN to /dashboard; NestJS guard enforces at API level |
| Streak calculation | API / Backend (NestJS) | — | Derived from ActivityLog; computed in AdaptiveService or GamificationService |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `recharts` | 3.8.1 | Dashboard charts (RadarChart, BarChart, LineChart) | [VERIFIED: npm registry] — established React chart library since 2015; specified in CLAUDE.md; already referenced in UI-SPEC |
| `react-activity-calendar` | 3.2.0 | GitHub-style activity heatmap | [VERIFIED: npm registry] — 5-year-old library with dedicated GitHub source repo; clean postinstall; per 08-UI-SPEC.md choice |
| `ioredis` | 5.11.1 | Redis client for admin stats caching (5-min TTL) | [VERIFIED: npm registry] — already in `apps/web` dependencies; `REDIS_URL_CACHE` env var pre-defined; `redis-cache` Docker service on port 6380 already provisioned |

### Supporting (already installed)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@tanstack/react-query` | 5.x | Dashboard/search/analytics data fetching | All client components using `useQuery` hooks |
| `date-fns` | 3.x | Date grouping for analytics, activity heatmap | Date arithmetic in AnalyticsService and ActivityHeatmap data transform |
| `framer-motion` | 12.x | Dashboard hero entrance, chart container fade-in | Per 08-UI-SPEC animation contract |
| `lucide-react` | 1.x | Sidebar icons, module icons in Continue Learning widget | Per design system (components.json `iconLibrary: lucide`) |
| `Prisma` | 6.x | `$queryRaw` for GIN FTS queries | `prisma.$queryRaw<T>` tagged template with `Prisma.sql` for composable query fragments |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `react-activity-calendar` | Custom SVG/CSS grid | Custom grid is ~60 lines of code but loses tooltip, accessibility, and localization. Library is minimal (no heavy deps) and 3+ years old — use it. |
| `recharts` | `chart.js` / `victory` | CLAUDE.md specifies Recharts. Non-negotiable. |
| Direct `ioredis` in NestJS | `@nestjs/cache-manager` | `@nestjs/cache-manager` adds abstraction overhead. Direct `ioredis` with a `RedisService` injectable is simpler and already used in `apps/web`. The project already has `ioredis` as a dependency and a dedicated cache Redis instance. |
| UNION ALL FTS across 4 tables | Meilisearch / Elasticsearch | Requirements (REQUIREMENTS.md Out of Scope) explicitly exclude external search services. PostgreSQL GIN FTS is sufficient for the dataset size. |

**Installation:**
```bash
# apps/web — add charting libraries
pnpm --filter @repo/web add recharts react-activity-calendar

# apps/api — add Redis client
pnpm --filter @repo/api add ioredis
```

**Version verification (run date: 2026-06-20):**
```bash
npm view recharts version          # 3.8.1
npm view react-activity-calendar version  # 3.2.0
npm view ioredis version           # 5.11.1
```

---

## Package Legitimacy Audit

> slopcheck was not available at research time. All packages verified by: npm registry existence check, official GitHub source repo confirmed, no suspicious postinstall scripts, package age > 3 years for all packages.

| Package | Registry | Age | Source Repo | Postinstall | Disposition |
|---------|----------|-----|-------------|-------------|-------------|
| `recharts` | npm | 11 yrs (2015-08-07) | github.com/recharts/recharts | none | Approved |
| `react-activity-calendar` | npm | 5 yrs (2021-06-15) | github.com/grubersjoe/react-activity-calendar | none | Approved |
| `ioredis` | npm | 11 yrs (2015-03-28) | github.com/luin/ioredis | none | Approved |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

*slopcheck was unavailable at research time. All packages above are tagged `[ASSUMED]` status based on manual npm registry verification (age, source repo, no postinstall). The planner does NOT need to gate these behind checkpoint:human-verify given the corroborating evidence (package age >5 years, known official repos, widely used libraries).*

---

## Architecture Patterns

### System Architecture Diagram

```
User Browser
    │
    ├─► Next.js (dashboard/layout.tsx)
    │       TopNavSearch input → navigates to /search?q=
    │       Sidebar: role-gated /admin link
    │
    ├─► GET /dashboard → DashboardPage (Server Component)
    │       ↓ useQuery → Next.js relay → GET /api/adaptive/dashboard (NestJS)
    │           └─► AdaptiveService.getDashboardData(userId)
    │                   ├─► SkillScore[]  (DB query)
    │                   ├─► User (xpTotal, level, cefrLevel)  (DB query)
    │                   ├─► ActivityLog COUNT  (streak calc)
    │                   ├─► getContinueLearningRecommendation(userId)
    │                   ├─► ReadingProgress (recently viewed, lastViewedAt)
    │                   └─► Bookmark[] (bookmarked passages)
    │
    ├─► GET /search?q=... → SearchPage (Server Component reads URL params)
    │       ↓ useQuery → Next.js relay → GET /api/search?q=...&level=...
    │           └─► SearchService.search(q, filters)
    │                   └─► prisma.$queryRaw<SearchResultRow[]>`
    │                           UNION ALL across 4 tables with GIN FTS
    │                           plainto_tsquery + ts_headline snippets
    │
    ├─► GET /analytics → AnalyticsPage (Server Component)
    │       ↓ useQuery → Next.js relay → GET /api/analytics/me (NestJS)
    │           └─► AnalyticsService.getStudentAnalytics(userId)
    │                   ├─► CefrHistory[] (time-series CEFR level)
    │                   ├─► ActivityLog GROUP BY date (heatmap data)
    │                   ├─► SrsCard stats (vocab retention)
    │                   └─► XpEvent GROUP BY date (learning time proxy)
    │
    └─► GET /admin → AdminPage (Server Component, role-checked server-side)
            ↓ useQuery → Next.js relay → GET /api/admin/analytics (NestJS + RolesGuard)
                └─► AnalyticsService.getAdminAnalytics()
                        ├─► Redis cache check (REDIS_URL_CACHE, TTL 5min)
                        ├─► User COUNT (DAU/WAU/MAU) [if cache miss]
                        ├─► ActivityLog aggregation [if cache miss]
                        └─► ReadingProgress/QuizSession top content [if cache miss]

Session-complete hook (all 5 modules):
awardXp() → adaptiveService.updateSkillScore() → checkAchievements()
```

### Recommended Project Structure

```
apps/api/src/
├── adaptive/
│   ├── adaptive.module.ts
│   ├── adaptive.controller.ts       # GET /api/adaptive/dashboard, GET /api/adaptive/recommendation
│   ├── adaptive.service.ts          # updateSkillScore, getDashboardData, getWeakTopics
│   └── adaptive.dto.ts              # DashboardDto, SkillScoreDto, ContinueLearningDto
├── search/
│   ├── search.module.ts
│   ├── search.controller.ts         # GET /api/search
│   ├── search.service.ts            # search() with $queryRaw UNION ALL
│   └── search.dto.ts                # SearchResultDto, SearchResultGroupDto
└── analytics/
    ├── analytics.module.ts
    ├── analytics.controller.ts      # GET /api/analytics/me, GET /api/admin/analytics
    ├── analytics.service.ts         # getStudentAnalytics, getAdminAnalytics (Redis cached)
    └── analytics.dto.ts             # AnalyticsDto, AdminAnalyticsDto

apps/web/src/
├── app/(dashboard)/
│   ├── dashboard/page.tsx           # Replace placeholder — full DashboardPage
│   ├── search/page.tsx              # SearchPage (Server Component)
│   ├── analytics/page.tsx           # AnalyticsPage (Server Component)
│   └── admin/page.tsx               # AdminPage (Server Component, role-gated)
├── app/api/
│   ├── adaptive/
│   │   ├── dashboard/route.ts       # Relay to NestJS GET /api/adaptive/dashboard
│   │   └── recommendation/route.ts # Relay to NestJS GET /api/adaptive/recommendation
│   ├── search/route.ts              # Relay to NestJS GET /api/search
│   ├── analytics/me/route.ts        # Relay to NestJS GET /api/analytics/me
│   └── admin/analytics/route.ts    # Relay to NestJS GET /api/admin/analytics
├── components/
│   ├── dashboard/
│   │   ├── dashboard-hero.tsx       # XP bar, level badge, streak
│   │   ├── skill-scores-card.tsx    # 4 skill rows with accuracy %
│   │   ├── skill-radar-chart.tsx    # Recharts RadarChart
│   │   ├── activity-bar-chart.tsx   # Recharts BarChart daily activity
│   │   ├── continue-learning-widget.tsx
│   │   ├── recently-viewed-row.tsx  # shadcn ScrollArea horizontal
│   │   ├── bookmarked-row.tsx
│   │   └── content-scroll-card.tsx
│   ├── search/
│   │   ├── top-nav-search.tsx       # Search input in layout header
│   │   ├── search-result-group.tsx
│   │   ├── search-result-item.tsx   # title, CefrBadge, snippet
│   │   └── search-filters.tsx
│   └── analytics/
│       ├── cefr-progression-chart.tsx   # Recharts LineChart
│       ├── vocab-retention-chart.tsx    # Recharts LineChart
│       ├── learning-time-chart.tsx      # Recharts BarChart
│       ├── activity-heatmap.tsx         # react-activity-calendar
│       ├── admin-stat-card.tsx
│       ├── user-growth-chart.tsx        # Recharts LineChart
│       └── top-content-table.tsx
```

---

## Pattern 1: AdaptiveService — Inline Session Hook

**What:** `updateSkillScore(userId, skillArea, accuracy)` upserts `SkillScore` with exponential moving average; sets `isWeak` flag.
**When to use:** After every session-complete in all 5 modules, immediately after `gamificationService.awardXp()`.

```typescript
// Source: derived from GamificationService pattern (apps/api/src/gamification/gamification.service.ts)
// apps/api/src/adaptive/adaptive.service.ts

@Injectable()
export class AdaptiveService {
  constructor(private readonly prisma: PrismaService) {}

  async updateSkillScore(
    userId: string,
    skillArea: SkillArea,
    accuracy: number, // 0.0–1.0
  ): Promise<void> {
    const existing = await this.prisma.skillScore.findUnique({
      where: { userId_skillArea: { userId, skillArea } },
    });

    // Exponential moving average: blend new accuracy with existing
    const alpha = 0.3; // weight for new observation
    const newAccuracy = existing
      ? existing.accuracy * (1 - alpha) + accuracy * alpha
      : accuracy;

    await this.prisma.skillScore.upsert({
      where: { userId_skillArea: { userId, skillArea } },
      create: { userId, skillArea, accuracy: newAccuracy, isWeak: newAccuracy < 0.6 },
      update: { accuracy: newAccuracy, isWeak: newAccuracy < 0.6 },
    });
  }

  async getContinueLearningRecommendation(userId: string): Promise<{
    preThreshold: boolean;
    weakestSkill?: SkillArea;
    accuracy?: number;
  }> {
    // ADPT-05: require >= 5 completed activities
    const activityCount = await this.prisma.activityLog.count({ where: { userId } });
    if (activityCount < 5) return { preThreshold: true };

    // D-07: lowest accuracy with isWeak=true, tie-break by updatedAt DESC
    const weakest = await this.prisma.skillScore.findFirst({
      where: { userId, isWeak: true },
      orderBy: [{ accuracy: 'asc' }, { updatedAt: 'desc' }],
    });

    if (!weakest) return { preThreshold: false }; // all skills healthy
    return { preThreshold: false, weakestSkill: weakest.skillArea, accuracy: weakest.accuracy };
  }
}
```

---

## Pattern 2: SearchService — GIN Full-Text UNION ALL

**What:** Cross-table FTS using PostgreSQL `plainto_tsquery` + `ts_headline`, executed via `prisma.$queryRaw`.
**When to use:** `GET /api/search?q=...&level=...&topic=...&skill=...`

**Critical Schema Corrections vs. CONTEXT.md:**
- `ListeningItem` is actually `ListeningContent` in schema; transcript field is `transcriptText` not `transcript`
- `GrammarLesson` uses `explanation` not `content`; has no direct `cefrLevel` (cefrLevel is on `GrammarTopic`)

```typescript
// Source: [CITED: www.pedroalonso.net/blog/postgres-full-text-search/]
// Prisma $queryRaw pattern [CITED: www.prisma.io/docs/orm/prisma-client/using-raw-sql/raw-queries]

interface SearchResultRow {
  id: string;
  type: string;
  title: string;
  snippet: string;
  cefrLevel: string | null;
  topic: string | null;
}

async search(q: string, filters: SearchFilters): Promise<SearchResultRow[]> {
  // GIN indexes make WHERE @@ plainto_tsquery fast for all 4 tables
  // ts_headline is called on raw text — does NOT use GIN index (called post-filter)
  return this.prisma.$queryRaw<SearchResultRow[]>`
    SELECT id, 'vocabulary' AS type, word AS title,
           ts_headline('english', definition, plainto_tsquery('english', ${q}),
             'StartSel=<mark>,StopSel=</mark>,MaxWords=15,MinWords=10') AS snippet,
           "cefrLevel", topic
    FROM "VocabularyWord"
    WHERE to_tsvector('english', word || ' ' || definition) @@ plainto_tsquery('english', ${q})
    UNION ALL
    SELECT gl.id, 'grammar', gl.title,
           ts_headline('english', gl.explanation, plainto_tsquery('english', ${q}),
             'StartSel=<mark>,StopSel=</mark>,MaxWords=15,MinWords=10'),
           gt."cefrLevel", gt.topic
    FROM "GrammarLesson" gl JOIN "GrammarTopic" gt ON gl."topicId" = gt.id
    WHERE to_tsvector('english', gl.title || ' ' || gl.explanation) @@ plainto_tsquery('english', ${q})
    UNION ALL
    SELECT id, 'reading', title,
           ts_headline('english', content, plainto_tsquery('english', ${q}),
             'StartSel=<mark>,StopSel=</mark>,MaxWords=15,MinWords=10'),
           "cefrLevel", topic
    FROM "ReadingPassage"
    WHERE to_tsvector('english', title || ' ' || content) @@ plainto_tsquery('english', ${q})
      AND "isPublished" = true
    UNION ALL
    SELECT id, 'listening', title,
           ts_headline('english', "transcriptText", plainto_tsquery('english', ${q}),
             'StartSel=<mark>,StopSel=</mark>,MaxWords=15,MinWords=10'),
           "cefrLevel", topic
    FROM "ListeningContent"
    WHERE to_tsvector('english', title || ' ' || "transcriptText") @@ plainto_tsquery('english', ${q})
      AND "isPublished" = true
    LIMIT 100
  `;
}
```

**GIN Index Migration SQL (append to new Prisma migration file):**
```sql
-- DO NOT REMOVE: manually added GIN indexes for FTS — Prisma does not generate these.
CREATE INDEX IF NOT EXISTS "VocabularyWord_fts_idx"
  ON "VocabularyWord" USING GIN (to_tsvector('english', word || ' ' || definition));

CREATE INDEX IF NOT EXISTS "GrammarLesson_fts_idx"
  ON "GrammarLesson" USING GIN (to_tsvector('english', title || ' ' || explanation));

CREATE INDEX IF NOT EXISTS "ReadingPassage_fts_idx"
  ON "ReadingPassage" USING GIN (to_tsvector('english', title || ' ' || content));

CREATE INDEX IF NOT EXISTS "ListeningContent_fts_idx"
  ON "ListeningContent" USING GIN (to_tsvector('english', title || ' ' || "transcriptText"));
```

---

## Pattern 3: NestJS RolesGuard with @Roles() Decorator

**What:** A guard that reads role metadata from the JWT payload (`req.user.role`) and compares to the required roles set via `@Roles()` decorator.
**When to use:** Admin endpoints only (`GET /api/admin/analytics`). Regular endpoints continue using `JwtAuthGuard` alone.

```typescript
// Source: [CITED: docs.nestjs.com/security/authorization]
// apps/api/src/auth/roles.decorator.ts

import { SetMetadata } from '@nestjs/common';
export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

// apps/api/src/auth/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) return true; // no @Roles() = open to any authenticated user

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.includes(user?.role);
  }
}

// Usage in AnalyticsController:
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Get('admin/analytics')
async getAdminAnalytics(): Promise<AdminAnalyticsDto> { ... }
```

**Important:** `RolesGuard` must be applied AFTER `JwtAuthGuard` so that `req.user` is populated. The `Reflector` must be available — register `RolesGuard` as a provider in `AuthModule` or the consuming module.

---

## Pattern 4: ioredis Service for Admin Stats Caching

**What:** Injectable `RedisService` wrapping ioredis client for 5-min TTL cache of expensive admin analytics queries.
**When to use:** `AnalyticsService.getAdminAnalytics()` — check Redis first, compute from DB on miss, store with TTL.

```typescript
// Source: [ASSUMED] — derived from established NestJS ioredis provider patterns
// Environment: REDIS_URL_CACHE=redis://localhost:6380 (pre-configured in .env.example)
// Docker: redis-cache service already in docker-compose.yml on port 6380

// apps/api/src/analytics/redis-cache.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisCacheService implements OnModuleInit, OnModuleDestroy {
  private client!: Redis;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    this.client = new Redis(this.config.get<string>('REDIS_URL_CACHE') ?? 'redis://localhost:6380');
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }

  async get<T>(key: string): Promise<T | null> {
    const val = await this.client.get(key);
    return val ? (JSON.parse(val) as T) : null;
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  }
}
```

---

## Pattern 5: Recharts Chart Component Data Shapes

**What:** Data format required by Recharts for each chart type used in Phase 8.
**Source:** [CITED: recharts.github.io/en-US/api/RadarChart] + [CITED: refine.dev/blog/recharts/]

### RadarChart (SkillRadarChart)

```typescript
// Data shape for Recharts RadarChart
interface SkillRadarPoint {
  skill: string;    // displayed on PolarAngleAxis
  accuracy: number; // 0–100 (percentage)
}

const data: SkillRadarPoint[] = [
  { skill: 'Grammar', accuracy: 72 },
  { skill: 'Vocabulary', accuracy: 85 },
  { skill: 'Reading', accuracy: 60 },
  { skill: 'Listening', accuracy: 45 },
];

// Component
<ResponsiveContainer width="100%" height={220}>
  <RadarChart data={data} cx="50%" cy="50%" outerRadius="80%">
    <PolarGrid />
    <PolarAngleAxis dataKey="skill" tick={{ fontSize: 12 }} />
    <PolarRadiusAxis domain={[0, 100]} tick={false} />
    <Radar dataKey="accuracy" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.3} />
    <Tooltip />
  </RadarChart>
</ResponsiveContainer>
```

### BarChart (ActivityBarChart — daily activity)

```typescript
interface ActivityBarPoint {
  date: string;  // e.g. "Mon", "Tue" or "Jun 14"
  count: number; // exercises completed
}

<ResponsiveContainer width="100%" height={220}>
  <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
    <Tooltip />
    <Bar dataKey="count" fill="hsl(var(--chart-1))" radius={[3, 3, 0, 0]} />
  </BarChart>
</ResponsiveContainer>
```

### LineChart (CefrProgressionChart — CEFR over time)

```typescript
interface CefrProgressionPoint {
  month: string;  // e.g. "Jan 2026"
  level: number;  // B1=1, B2=2, C1=3 for Y-axis rendering
}

<ResponsiveContainer width="100%" height={200}>
  <LineChart data={data}>
    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
    <YAxis domain={[1, 3]} ticks={[1, 2, 3]}
      tickFormatter={(v) => v === 1 ? 'B1' : v === 2 ? 'B2' : 'C1'}
      tick={{ fontSize: 11 }} />
    <Tooltip formatter={(v) => v === 1 ? 'B1' : v === 2 ? 'B2' : 'C1'} />
    <Line type="monotone" dataKey="level" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{ r: 3 }} />
  </LineChart>
</ResponsiveContainer>
```

---

## Pattern 6: react-activity-calendar Data Format

**What:** Data format and theme configuration for the GitHub-style activity heatmap.
**Source:** [CITED: github.com/grubersjoe/react-activity-calendar]

```typescript
// Data shape — each day must be a separate entry; zero-activity days can be omitted
interface Activity {
  date: string;   // ISO format 'YYYY-MM-DD'
  count: number;  // exercise count for that day
  level: number;  // 0=none, 1=low, 2=medium, 3=medium-high, 4=high
}

// Level mapping from exercise count (per D-16: 0=grey, 1-3=light, 4-7=medium, 8+=dark)
function toLevel(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count === 0) return 0;
  if (count <= 3) return 1;
  if (count <= 7) return 2;
  if (count <= 10) return 3;
  return 4;
}

// Component usage
<ActivityCalendar
  data={activityData}
  theme={{
    light: ['hsl(240 4.8% 95.9%)', '#bbf7d0', '#4ade80', '#16a34a', '#14532d'],
    // level 0 = bg-muted, 1 = emerald-200, 2 = emerald-400, 3 = emerald-600, 4 = dark
  }}
  labels={{
    months: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
    weekdays: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],
    totalCount: '{{count}} exercises in {{year}}',
  }}
  showWeekdayLabels
  hideColorLegend={false}
  renderBlock={(block, activity) =>
    React.cloneElement(block, {
      'data-tooltip-id': 'activity-tooltip',
      'data-tooltip-content': `${activity.count} exercises on ${activity.date}`,
    })
  }
/>
```

---

## Pattern 7: CefrHistory Model (NEW — must add to schema)

`CefrHistory` does NOT exist in the schema (verified by grep). The CEFR progression chart (ANLT-01) requires a time-series of CEFR level changes. Two implementation options:

**Option A (Recommended): Dedicated model** — simplest to query, explicit intent.
```prisma
model CefrHistory {
  id        String    @id @default(cuid())
  userId    String
  cefrLevel CefrLevel
  recordedAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, recordedAt])
}
```
Write a `CefrHistory` record when `cefrLevel` changes (in `AdaptiveService` or when checking level after XP award).

**Option B: Derive from XpEvent** — approximate only; does not capture level demotion.

**Resolution:** Use Option A. Add to schema with migration. `AdaptiveService` writes a CefrHistory entry when `User.cefrLevel` changes (compare old vs. new level after computation).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| GitHub-style activity grid | Custom SVG with 52×7 hardcoded cells | `react-activity-calendar` | Handles month labels, day labels, week alignment, accessibility, tooltips, dark mode |
| Radar/bar/line charts | Canvas drawing or D3 directly | Recharts RadarChart/BarChart/LineChart | Handles axis math, responsive resize, tooltips, animation |
| Redis cache pattern | Custom LRU in-process | ioredis + REDIS_URL_CACHE (already provisioned) | Survives process restarts; shared across multiple API workers; pre-provisioned |
| FTS across 4 tables | String LIKE %query% | PostgreSQL GIN FTS with plainto_tsquery | LIKE is O(n); GIN is O(log n); GIN supports partial match, stemming, ranking |
| Role-based guards | Parsing `req.user.role` manually in each controller | NestJS `RolesGuard` + `@Roles()` decorator | Centralizes enforcement; testable; declarative |

---

## Runtime State Inventory

> Phase 8 is not a rename/refactor/migration phase. This section is not applicable.

---

## Common Pitfalls

### Pitfall 1: GrammarLesson field names mismatch
**What goes wrong:** SearchService writes `content` but the schema has `explanation`. GIN index creation also fails with column-not-found error.
**Why it happens:** CONTEXT.md says `GrammarLesson: (title, content)` but the actual schema has `explanation`. Likely a schema evolution vs. documentation drift.
**How to avoid:** Always use `explanation` for `GrammarLesson` in GIN index SQL and FTS queries. Also note: `GrammarLesson` has no direct `cefrLevel` — join to `GrammarTopic` is required to get it.
**Warning signs:** Migration error `column "content" does not exist` when creating GIN index.

### Pitfall 2: ListeningContent vs. ListeningItem naming
**What goes wrong:** Code references `ListeningItem` (from CONTEXT.md and REQUIREMENTS.md), but the Prisma model is `ListeningContent` with field `transcriptText` not `transcript`.
**Why it happens:** CONTEXT.md uses conceptual names that don't match the schema (from Phase 6).
**How to avoid:** Use `ListeningContent` and `transcriptText` everywhere. Check schema.prisma before writing any query.
**Warning signs:** Prisma runtime error `Cannot find model ListeningContent` if table is referenced as `ListeningItem`.

### Pitfall 3: UserRole is STUDENT|ADMIN not USER|ADMIN
**What goes wrong:** RolesGuard checks for `'USER'` instead of `'STUDENT'` — all authenticated users fail the non-admin check.
**Why it happens:** CONTEXT.md says "USER | ADMIN" but the Prisma enum is `STUDENT | ADMIN`, and `auth.ts` defaults to `"STUDENT"`.
**How to avoid:** Always use `'STUDENT'` and `'ADMIN'` string literals. The JWT payload (confirmed in `apps/web/src/auth.ts`) embeds `role` as `"STUDENT"` or `"ADMIN"`.
**Warning signs:** Admin-role check works; non-admin users get unexpected 403s (if `'USER'` check is applied to a STUDENT-default user).

### Pitfall 4: User.role and UserRole enum already exist in schema
**What goes wrong:** Planner creates a migration to add `UserRole` enum or `User.role` field — migration fails because they already exist.
**Why it happens:** CONTEXT.md says "Add `User.role` field (UserRole enum: USER | ADMIN) via new migration" but inspecting schema.prisma shows these are already present as `STUDENT | ADMIN`.
**How to avoid:** Only new migration needed is `CefrHistory` model + GIN indexes. Do NOT add UserRole/User.role migration.
**Warning signs:** `prisma migrate dev` output contains error about duplicate enum definition.

### Pitfall 5: ts_headline is slow on large result sets
**What goes wrong:** Calling `ts_headline()` on all matching rows from a UNION ALL of 4 tables, then paginating, causes full-text re-scan of every matching document.
**Why it happens:** `ts_headline` does not use the GIN index — it processes raw text to generate snippets.
**How to avoid:** Apply `LIMIT 100` to the outer UNION ALL before calling `ts_headline`, or use a subquery that GIN-filters first, then applies `ts_headline` on the limited set. Phase 8 search scope is small enough that LIMIT 100 total (across all tables) is safe.
**Warning signs:** Search response times > 300ms with > 50 results.

### Pitfall 6: ResponsiveContainer requires a parent with explicit height
**What goes wrong:** Recharts `ResponsiveContainer` with `width="100%"` returns 0px height when inside a flex parent without explicit height.
**Why it happens:** ResponsiveContainer measures its parent's DOM dimensions. A flexbox parent without fixed height collapses.
**How to avoid:** Always wrap `ResponsiveContainer` in a `div` with `style={{ height: 220 }}` or Tailwind `h-[220px]` — never set height only on ResponsiveContainer itself.
**Warning signs:** Chart renders with 0px height, blank white space.

### Pitfall 7: React hydration error on chart components
**What goes wrong:** SSR renders different content than client for Recharts components; React throws hydration mismatch error.
**Why it happens:** Recharts measures DOM width client-side; during SSR the width is unknown and chart renders differently.
**How to avoid:** Mark all Recharts-containing components with `"use client"`. Never render Recharts in Server Components.
**Warning signs:** Console error: "Warning: Prop `width` did not match. Server: undefined Client: 400".

### Pitfall 8: ioredis not in apps/api dependencies
**What goes wrong:** `import Redis from 'ioredis'` fails at runtime in NestJS — module not found.
**Why it happens:** `ioredis` is only in `apps/web/package.json` (for rate limiting), not in `apps/api/package.json`.
**How to avoid:** Run `pnpm --filter @repo/api add ioredis` before implementing AnalyticsModule.
**Warning signs:** NestJS fails to start with `Cannot find module 'ioredis'`.

### Pitfall 9: CefrHistory never written
**What goes wrong:** CEFR progression chart is always empty even after level changes.
**Why it happens:** The schema has `CefrHistory` but no code writes to it unless explicitly triggered.
**How to avoid:** Write `CefrHistory.create` in `AdaptiveService` whenever `User.cefrLevel` changes. This requires reading the old level before update and comparing. Or write in a separate `recordCefrSnapshot()` call in the dashboard endpoint.
**Warning signs:** `CefrHistory.findMany()` returns empty array despite user having completed exercises.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Store tsvector in a generated column | Functional GIN index on `to_tsvector(...)` | Postgres 11+ | No extra column, no triggers, same performance; avoids Prisma migration drift |
| `bull` for queues | `bullmq` 5.x | 2022 (bull unmaintained) | Relevant: this project uses BullMQ (already decided). Phase 8 has no new queues. |
| React 18 + Recharts 2.x | Recharts 3.x (current 3.8.1) | 2024 | Recharts 3.x requires React 18; compatible with this project's React 18 + Next.js 14 |
| `color` prop on ActivityCalendar | `theme` prop (v3+) | 2024 | `color` prop removed in v3; use `theme: { light: [...], dark: [...] }` |

**Deprecated/outdated:**
- `recharts@2.x`: Still widely documented; this project should use 3.x (3.8.1 is current). API is nearly identical but `<AreaChart>` and responsive behavior improved.
- `react-activity-calendar` `color` prop: Removed in v3. Use `theme` prop with a color array (5 values for levels 0–4).

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Exponential moving average (alpha=0.3) is appropriate for SkillScore updates | Pattern 1: AdaptiveService | Wrong alpha could make scores converge too slowly or be too volatile; tunable at runtime |
| A2 | Admin stats TTL of 5 minutes is acceptable for DAU/WAU/MAU freshness | Pattern 4: Redis caching | If admin requires real-time data, TTL must be reduced (impacts Redis write frequency) |
| A3 | `react-activity-calendar` v3.2.0 `theme` prop accepts a 5-element light/dark color array | Pattern 6 | If prop API changed, use custom CSS grid fallback (60 lines of Tailwind CSS) |
| A4 | `GrammarLesson` has no cefrLevel — joined from GrammarTopic | Pattern 2: SearchService | If cefrLevel was added to GrammarLesson in a later migration, the JOIN is redundant but harmless |
| A5 | `CefrHistory` should record changes only (not snapshot every session) | Pattern 7 | If snapshot-every-session is preferred, add call in AdaptiveService.updateSkillScore() instead |
| A6 | `ioredis` NestJS provider pattern using `OnModuleInit` is sufficient | Pattern 4 | If NestJS DI lifecycle requires explicit module provider token, use `useFactory` pattern instead |

---

## Open Questions (RESOLVED)

1. **CefrHistory write trigger**
   - What we know: `CefrHistory` needs to be populated for the CEFR progression chart.
   - What's unclear: Should it be written (a) on every session complete, (b) only when `cefrLevel` changes, or (c) on a daily snapshot?
   - Recommendation: Write only when `User.cefrLevel` changes — detected by comparing old vs. new in `AdaptiveService`. This minimizes writes and produces a meaningful time series.
   - **RESOLVED:** Write a CefrHistory entry only on CEFR level change (when `User.cefrLevel` changes from the previous value). Implemented via `recordCefrSnapshotIfChanged(userId, currentLevel)` in AdaptiveService (08-02).

2. **ScrollArea component missing from shadcn/ui installed components**
   - What we know: `apps/web/src/components/ui/` does not contain `scroll-area.tsx`. The UI-SPEC requires it for horizontal scroll rows (D-04).
   - What's unclear: Was it intentionally omitted, or simply not yet added via `npx shadcn@latest add scroll-area`?
   - Recommendation: Wave 0 task must add ScrollArea: `npx shadcn@latest add scroll-area` in `apps/web`.
   - **RESOLVED:** ScrollArea is installed in 08-01a Task 1 via `pnpm --filter @repo/web dlx shadcn@latest add scroll-area`.

3. **Streak display on dashboard hero**
   - What we know: `User` model has no `streak` field; streak is computed from `ActivityLog`.
   - What's unclear: Should `AdaptiveService.getDashboardData()` compute the streak, or should the API expose a separate endpoint?
   - Recommendation: Add a private `computeCurrentStreak(userId)` helper to `AdaptiveService` mirroring `GamificationService.checkStreak()`. Include result in the dashboard endpoint response.
   - **RESOLVED:** Streak display uses a `computeCurrentStreak()` private helper in AdaptiveService (08-02), sourced from ActivityLog over the last 365 days, returned in the dashboard endpoint response.

4. **Recently Viewed cross-module scope**
   - What we know: `ReadingProgress.lastViewedAt` exists for reading. Grammar has `GrammarProgress.lastAttemptAt`. Listening has `ListeningProgress.lastViewedAt`.
   - What's unclear: DASH-04 says "recently viewed lessons" — does it cover all 5 modules or just reading?
   - Recommendation: Scope to reading + listening passages in v1 (both have `lastViewedAt`). Grammar/vocab/quiz can be added in a follow-up. Document scope in the plan.
   - **RESOLVED:** Recently Viewed scope = reading + listening only (`lastViewedAt` exists on ReadingPassage/ReadingProgress + ListeningContent/ListeningProgress); grammar/vocab/quiz excluded in v1.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All | ✓ | v22.22.2 | — |
| Docker | Dev infrastructure | ✓ | 29.4.2 | — |
| PostgreSQL (Docker) | FTS migrations, GIN indexes | ✓ (via `docker compose up`) | 16.x (image) | — |
| Redis cache (Docker) | Admin analytics caching | ✓ (via `docker compose up`) | 7.x (image), port 6380 | — |
| `ioredis` in apps/api | AnalyticsService Redis caching | ✗ not in package.json | — | Must install: `pnpm --filter @repo/api add ioredis` |
| `recharts` in apps/web | Dashboard/analytics charts | ✗ not in package.json | — | Must install: `pnpm --filter @repo/web add recharts` |
| `react-activity-calendar` in apps/web | Activity heatmap | ✗ not in package.json | — | Must install: `pnpm --filter @repo/web add react-activity-calendar` |
| ScrollArea shadcn component | Horizontal scroll rows (D-04) | ✗ not in components/ui/ | — | Must add: `pnpm --filter @repo/web dlx shadcn@latest add scroll-area` |

**Missing dependencies with no fallback:**
- None — all missing dependencies have clear install commands.

**Missing dependencies with fallback (if install fails):**
- `react-activity-calendar`: Use custom CSS grid (52 columns × 7 rows via Tailwind `grid-cols-[repeat(52,12px)]`)
- `recharts`: No feasible fallback for chart library; install is required.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework (API) | Vitest 2.x + NestJS @nestjs/testing |
| Framework (Web) | Vitest 2.x + Testing Library |
| Config file (API) | `apps/api/vitest.config.ts` |
| Config file (Web) | `apps/web/vitest.config.ts` |
| Quick run command | `pnpm --filter @repo/api test` (API) / `pnpm --filter @repo/web test` (Web) |
| Full suite command | `pnpm test` (Turborepo runs all) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ADPT-01 | updateSkillScore() upserts SkillScore with correct accuracy | unit | `pnpm --filter @repo/api test -- --reporter=verbose adaptive.service.spec` | ❌ Wave 0 |
| ADPT-02 | updateSkillScore() sets isWeak=true when accuracy < 0.6 | unit | (same spec) | ❌ Wave 0 |
| ADPT-05 | getContinueLearningRecommendation() returns preThreshold=true when activityCount < 5 | unit | (same spec) | ❌ Wave 0 |
| SRCH-02 | SearchService returns results matching query from GIN FTS | unit | `pnpm --filter @repo/api test -- search.service.spec` | ❌ Wave 0 |
| SRCH-03 | SearchService applies CEFR/skill filter to UNION ALL query | unit | (same spec) | ❌ Wave 0 |
| ANLT-02 | getAdminAnalytics() returns cached result on second call | unit | `pnpm --filter @repo/api test -- analytics.service.spec` | ❌ Wave 0 |
| DASH-01 | DashboardHero renders XP bar, level, CEFR badge | component | `pnpm --filter @repo/web test -- dashboard-hero.test` | ❌ Wave 0 |
| DASH-03 | SkillRadarChart renders 4 data points | component | `pnpm --filter @repo/web test -- skill-radar-chart.test` | ❌ Wave 0 |
| ANLT-01 | ActivityHeatmap renders 365 days of data | component | `pnpm --filter @repo/web test -- activity-heatmap.test` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm --filter @repo/api test` + `pnpm --filter @repo/web test`
- **Per wave merge:** Full suite `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `apps/api/src/adaptive/adaptive.service.spec.ts` — covers ADPT-01, ADPT-02, ADPT-05
- [ ] `apps/api/src/search/search.service.spec.ts` — covers SRCH-02, SRCH-03
- [ ] `apps/api/src/analytics/analytics.service.spec.ts` — covers ANLT-02
- [ ] `apps/web/src/components/dashboard/dashboard-hero.test.tsx` — covers DASH-01
- [ ] `apps/web/src/components/dashboard/skill-radar-chart.test.tsx` — covers DASH-03
- [ ] `apps/web/src/components/analytics/activity-heatmap.test.tsx` — covers ANLT-01

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | JwtAuthGuard on all new endpoints (already established) |
| V3 Session Management | no | Session management handled by NextAuth (prior phases) |
| V4 Access Control | yes | RolesGuard for admin endpoints; IDOR prevention (userId from JWT only) |
| V5 Input Validation | yes | `plainto_tsquery` (Prisma tagged template) auto-parameterizes; `ValidationPipe` on DTOs |
| V6 Cryptography | no | No new crypto operations |

### Known Threat Patterns for Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| SQL injection via search query | Tampering | `prisma.$queryRaw` tagged template auto-parameterizes `${q}` variable — not susceptible |
| IDOR in analytics endpoint | Elevation of privilege | `userId` always from `req.user.userId` (JWT) — never from path/query params |
| Admin endpoint spoofing | Elevation of privilege | RolesGuard reads `req.user.role` from JWT (server-decoded) — cannot be spoofed by client |
| Uncached admin queries causing DB DoS | Denial of service | Redis TTL=5min prevents repeated expensive GROUP BY queries under load |

---

## Sources

### Primary (HIGH confidence)

- `packages/database/prisma/schema.prisma` — Ground truth for all model names, field names, and existing indexes. Verified by direct codebase read.
- `apps/api/src/gamification/gamification.service.ts` — Pattern for inline session hook (`awardXp` → `checkAchievements`); AdaptiveService follows same structure.
- `apps/api/src/auth/jwt-auth.guard.ts` — Existing guard implementation; RolesGuard extends same pattern.
- `apps/web/src/auth.ts` — Confirms `UserRole` is `"STUDENT" | "ADMIN"` in JWT payload, and `User.role` is already embedded in session.
- `docker-compose.yml` — Confirms `redis-cache` service on port 6380, `REDIS_URL_CACHE` env var pre-defined.
- [CITED: www.prisma.io/docs/orm/prisma-client/using-raw-sql/raw-queries] — `$queryRaw` tagged template pattern, `Prisma.sql` composable queries.
- [CITED: recharts.github.io/en-US/api/RadarChart] — RadarChart props: cx, cy, outerRadius, data; PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar component props.
- [CITED: github.com/grubersjoe/react-activity-calendar] — `Activity` interface: `{ date: string, count: number, level: number }`; `theme` prop structure.

### Secondary (MEDIUM confidence)

- [CITED: www.pedroalonso.net/blog/postgres-full-text-search/] — GIN index migration SQL, `$queryRaw` FTS pattern, `plainto_tsquery`, `ts_headline` with `StartSel`/`StopSel` options.
- [CITED: docs.nestjs.com/security/authorization] — `RolesGuard` + `@Roles()` + `Reflector.getAllAndOverride` pattern (page content not fully loaded via WebFetch but pattern is well-documented via WebSearch cross-reference).
- [CITED: refine.dev/blog/recharts/] — BarChart/LineChart TypeScript component examples, `ResponsiveContainer` usage pattern.
- npm registry metadata — package age, source repo, no postinstall scripts for recharts (3.8.1, 2015), react-activity-calendar (3.2.0, 2021), ioredis (5.11.1, 2015).

### Tertiary (LOW confidence)

- [ASSUMED] — `RedisCacheService` implementation using `ioredis` with `OnModuleInit`/`OnModuleDestroy` lifecycle pattern. Standard NestJS pattern; not verified via official NestJS ioredis docs.
- [ASSUMED] — Exponential moving average alpha=0.3 for SkillScore updates. Reasonable default; no domain authority confirms this specific value.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — packages verified on npm registry; recharts/react-activity-calendar have official GitHub repos and >5 year age
- Architecture: HIGH — based on direct codebase inspection of existing modules, schema, and docker-compose
- Pitfalls: HIGH — pitfalls 1-4 discovered via direct schema inspection (actual column names vs. CONTEXT.md documentation); pitfalls 5-9 verified from research sources
- FTS patterns: HIGH — cited from official Prisma docs and postgres FTS blog with working code examples
- RolesGuard: MEDIUM — NestJS docs page content not fully loaded; pattern verified via WebSearch cross-reference

**Research date:** 2026-06-20
**Valid until:** 2026-07-20 (30 days — stable libraries; recharts and react-activity-calendar do not release breaking changes frequently)
