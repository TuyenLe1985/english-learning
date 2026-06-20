---
phase: 08-adaptive-engine-dashboard-search-analytics
plan: 01c
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/shared/src/adaptive.dto.ts
  - packages/shared/src/search.dto.ts
  - packages/shared/src/analytics.dto.ts
  - packages/shared/src/index.ts
  - apps/api/src/adaptive/adaptive.service.spec.ts
  - apps/api/src/search/search.service.spec.ts
  - apps/api/src/analytics/analytics.service.spec.ts
  - apps/web/src/components/dashboard/dashboard-hero.test.tsx
  - apps/web/src/components/dashboard/skill-radar-chart.test.tsx
  - apps/web/src/components/analytics/activity-heatmap.test.tsx
  - packages/database/prisma/seed-admin.ts
  - packages/database/package.json
autonomous: true
requirements: [ADPT-01, ADPT-02, ADPT-03, ADPT-04, ADPT-05, SRCH-02, SRCH-03, ANLT-01, ANLT-02, DASH-01, DASH-03]
user_setup: []

must_haves:
  truths:
    - "Shared DTOs (DashboardDto, SearchResultDto, AnalyticsDto, AdminAnalyticsDto) are exported from @repo/shared"
    - "AnalyticsDto includes a skillBreakdown: SkillScoreDto[] field (ANLT-01 skill breakdown)"
    - "AdminAnalyticsDto includes a completionRateByModule field (ANLT-02 average completion rates by module)"
    - "RED test scaffolds exist and fail (no implementation yet) for adaptive/search/analytics services and 3 web components"
    - "pnpm db:seed:admin upserts an ADMIN-role user"
  artifacts:
    - path: "packages/shared/src/adaptive.dto.ts"
      provides: "DashboardDto, ContinueLearningDto, SkillScoreDto"
    - path: "packages/shared/src/search.dto.ts"
      provides: "SearchResultDto, SearchResultGroupDto"
    - path: "packages/shared/src/analytics.dto.ts"
      provides: "AnalyticsDto (incl. skillBreakdown), AdminAnalyticsDto (incl. completionRateByModule)"
    - path: "packages/database/prisma/seed-admin.ts"
      provides: "admin seed script"
  key_links:
    - from: "packages/shared/src/index.ts"
      to: "adaptive.dto / search.dto / analytics.dto"
      via: "barrel export"
      pattern: "export \\* from \"./(adaptive|search|analytics).dto\""
---

<objective>
Foundation part C for Phase 8. Define all shared DTOs (including the ANLT-01 skillBreakdown field on AnalyticsDto and the ANLT-02 completionRateByModule field on AdminAnalyticsDto), scaffold the failing TDD tests, and create the admin seed script.

Purpose: Establishes the interface contracts (DTOs) and RED scaffolds so the three Wave 2 backend plans (08-02/03/04) can run in parallel against fixed type contracts. 08-01c runs in parallel with 08-01a and 08-01b in Wave 1 (zero file overlap — 08-01a owns deps/schema/migration, 08-01b owns module skeletons/RolesGuard, 08-01c owns DTOs/scaffolds/seed). Wave 2 plans depend on 08-01a, 08-01b, AND 08-01c.
Output: Shared DTOs, RED test scaffolds, admin seed + db:seed:admin script.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/08-adaptive-engine-dashboard-search-analytics/08-RESEARCH.md
@.planning/phases/08-adaptive-engine-dashboard-search-analytics/08-PATTERNS.md

<interfaces>
Existing schema facts (verified, packages/database/prisma/schema.prisma):
- enum CefrLevel { B1 B2 C1 }
- enum UserRole { STUDENT ADMIN }  — already exists; do NOT recreate
- enum SkillArea { GRAMMAR VOCABULARY READING LISTENING MIXED }
- model User has: role (UserRole @default(STUDENT)), cefrLevel, xpTotal, level
- model SkillScore { userId, skillArea, score, accuracy, isWeak, updatedAt, @@unique([userId, skillArea]) } — exists
- model ActivityLog { userId, activityType, skillArea, metadata, loggedAt, @@index([userId, loggedAt]) } — exists
- CefrHistory model is added by 08-01a (do NOT add schema here; this plan does not touch schema.prisma)

Shared DTO pattern (packages/shared/src/grammar.dto.ts): Zod schema + z.infer type export.
Barrel pattern (packages/shared/src/index.ts): `export * from "./<name>.dto";`
Seed script invocation pattern (packages/database/package.json db:seed): `node --env-file=../../.env -r ts-node/register prisma/<file>.ts` with TS_NODE_PROJECT=tsconfig.seed.json

NOTE: This plan must NOT touch packages/database/prisma/schema.prisma, apps/*/package.json, shadcn components, app.module.ts, or any module/guard source — those are owned by 08-01a (schema/deps) and 08-01b (module skeletons/RolesGuard). The CefrHistory model + GIN migration + deps come from 08-01a (same wave, no overlap).
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Define all shared DTOs (incl. ANLT-01 skillBreakdown + ANLT-02 completionRateByModule)</name>
  <files>packages/shared/src/adaptive.dto.ts, packages/shared/src/search.dto.ts, packages/shared/src/analytics.dto.ts, packages/shared/src/index.ts</files>
  <read_first>
    - packages/shared/src/grammar.dto.ts (Zod DTO pattern to replicate)
    - packages/shared/src/index.ts (barrel — append exports)
    - .planning/phases/08-adaptive-engine-dashboard-search-analytics/08-RESEARCH.md (phase_requirements ANLT-01/ANLT-02 descriptions)
  </read_first>
  <action>
    Create shared DTOs as Zod schemas in packages/shared/src/:
    (a) `adaptive.dto.ts` — `SkillScoreDto` {skillArea: string, accuracy: number, isWeak: boolean}, `ContinueLearningDto` {preThreshold: boolean, weakestSkill?: string, accuracy?: number, recommendedModule?: string, recommendedNextTier?: string}, `DashboardDto` {user:{name, xpTotal, level, cefrLevel: enum B1/B2/C1, streak}, skillScores: SkillScoreDto[], lessonsCompleted: number, recommendation: ContinueLearningDto, recentlyViewed: array of {id,title,type,cefrLevel}, bookmarked: same, pendingReviews: number}.
    (b) `search.dto.ts` — `SearchResultDto` {id, type: enum vocabulary/grammar/reading/listening/quiz, title, snippet, cefrLevel: nullable, topic: nullable}, `SearchResultGroupDto` {type, count, results: SearchResultDto[]}, `SearchResponseDto` {query, total, groups}.
    (c) `analytics.dto.ts` — `AnalyticsDto` {cefrProgression: array {month, level:1|2|3}, vocabRetention: array {week, rate}, learningTime: array {date, minutes}, activityHeatmap: array {date, count, level:0-4}, **skillBreakdown: SkillScoreDto[]** (ANLT-01 "skill breakdown" — per-skill accuracy/isWeak for the student analytics page; reuse the SkillScoreDto shape from adaptive.dto.ts or define a local SkillScoreDto in analytics.dto.ts)}; `AdminAnalyticsDto` {dau, wau, mau, retentionRate, topContent: array {title,module,completions}, **completionRateByModule: array {module: string, rate: number}** (ANLT-02 "average completion rates by module"), userGrowth: array {date,total}, lastUpdated: string}.
    Append `export * from "./adaptive.dto"; export * from "./search.dto"; export * from "./analytics.dto";` to index.ts.
    Do NOT touch schema.prisma or any package.json deps (owned by 08-01a).
  </action>
  <verify>
    <automated>cd /home/tuyen/Desktop/Apps/english-learning && test -f packages/shared/src/adaptive.dto.ts && test -f packages/shared/src/search.dto.ts && test -f packages/shared/src/analytics.dto.ts && grep -q "skillBreakdown" packages/shared/src/analytics.dto.ts && grep -q "completionRateByModule" packages/shared/src/analytics.dto.ts && grep -q "adaptive.dto" packages/shared/src/index.ts && pnpm --filter @repo/shared run build && echo OK</automated>
  </verify>
  <acceptance_criteria>
    - All three DTO files export both `*DtoSchema` and `*Dto` type
    - AnalyticsDto includes `skillBreakdown: SkillScoreDto[]` (ANLT-01)
    - AdminAnalyticsDto includes `completionRateByModule: Array<{module, rate}>` (ANLT-02)
    - barrel index.ts re-exports all three
    - `@repo/shared` builds
  </acceptance_criteria>
  <done>Shared DTOs defined and exported, including ANLT-01 skillBreakdown and ANLT-02 completionRateByModule.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: RED test scaffolds + admin seed script</name>
  <files>apps/api/src/adaptive/adaptive.service.spec.ts, apps/api/src/search/search.service.spec.ts, apps/api/src/analytics/analytics.service.spec.ts, apps/web/src/components/dashboard/dashboard-hero.test.tsx, apps/web/src/components/dashboard/skill-radar-chart.test.tsx, apps/web/src/components/analytics/activity-heatmap.test.tsx, packages/database/prisma/seed-admin.ts, packages/database/package.json</files>
  <read_first>
    - apps/api/src/gamification/gamification.service.spec.ts (Vitest + @nestjs/testing, Test.createTestingModule, prisma mock style)
    - packages/database/prisma/seed.ts (seed script structure, PrismaClient, upsert)
    - packages/database/package.json (scripts block — add db:seed:admin, mirror db:seed)
    - .planning/phases/08-adaptive-engine-dashboard-search-analytics/08-RESEARCH.md (Validation Architecture → Test Map + Wave 0 Gaps for exact spec file names + covered req IDs)
  </read_first>
  <behavior>
    RED scaffolds (must FAIL — implementations do not exist yet):
    - adaptive.service.spec.ts:
      - ADPT-01 EMA upsert (updateSkillScore blends accuracy)
      - ADPT-02 isWeak < 0.6
      - ADPT-05 getContinueLearningRecommendation() returns preThreshold=true when ActivityLog < 5
      - ADPT-03 getContinueLearningRecommendation() with ≥5 activities returns the lowest-accuracy isWeak skill (tie-break updatedAt desc)
      - ADPT-04 getContinueLearningRecommendation() returns recommendedNextTier when a skill accuracy ≥ 0.8 (recommendation-only, no gating — D-06)
    - search.service.spec.ts: SRCH-02 returns query matches (mock $queryRaw); SRCH-03 applies level/skill filter
    - analytics.service.spec.ts:
      - ANLT-02 getAdminAnalytics returns cached value on 2nd call (mock RedisCacheService)
      - ANLT-02 getAdminAnalytics result includes completionRateByModule
      - ANLT-01 getStudentAnalytics result includes skillBreakdown
    - dashboard-hero.test.tsx: DASH-01 renders XP bar + level + CEFR badge + streak
    - skill-radar-chart.test.tsx: DASH-03 renders 4 skill points
    - activity-heatmap.test.tsx: ANLT-01 renders 365 days
  </behavior>
  <action>
    Create the six RED spec/test files from RESEARCH.md "Wave 0 Gaps" with failing assertions importing the not-yet-implemented sources. Use gamification.service.spec.ts mocking style (PrismaService as vi.fn() mock) for API specs; Testing Library render/screen for web tests. Include the ADPT-03 and ADPT-04 assertions in adaptive.service.spec.ts (lowest-accuracy weak skill with updatedAt tie-break; recommendedNextTier when accuracy ≥ 0.8). Include the ANLT-01 skillBreakdown assertion in analytics.service.spec.ts and the ANLT-02 completionRateByModule assertion. Create `packages/database/prisma/seed-admin.ts`: instantiate PrismaClient, upsert a user with `role: 'ADMIN'` (literal 'ADMIN' — Pitfall 3), email/password from env `ADMIN_EMAIL`/`ADMIN_PASSWORD` (defaults e.g. admin@example.com), bcrypt-hash password at 12 rounds (match existing auth rounds). Add `"db:seed:admin": "TS_NODE_PROJECT=tsconfig.seed.json node --env-file=../../.env -r ts-node/register prisma/seed-admin.ts"` to packages/database/package.json (mirror db:seed). Do NOT implement the services or module skeletons (owned by 08-01b).
  </action>
  <verify>
    <automated>cd /home/tuyen/Desktop/Apps/english-learning && test -f apps/api/src/adaptive/adaptive.service.spec.ts && test -f apps/api/src/search/search.service.spec.ts && test -f apps/api/src/analytics/analytics.service.spec.ts && test -f apps/web/src/components/dashboard/dashboard-hero.test.tsx && test -f apps/web/src/components/dashboard/skill-radar-chart.test.tsx && test -f apps/web/src/components/analytics/activity-heatmap.test.tsx && test -f packages/database/prisma/seed-admin.ts && grep -q "db:seed:admin" packages/database/package.json && grep -q "recommendedNextTier" apps/api/src/adaptive/adaptive.service.spec.ts && grep -q "skillBreakdown" apps/api/src/analytics/analytics.service.spec.ts && grep -q "completionRateByModule" apps/api/src/analytics/analytics.service.spec.ts && echo SCAFFOLDS_OK</automated>
  </verify>
  <acceptance_criteria>
    - All six spec/test files exist at the exact Wave 0 Gap paths
    - adaptive.service.spec.ts asserts ADPT-03 (lowest-accuracy weak skill) and ADPT-04 (recommendedNextTier when accuracy ≥ 0.8)
    - analytics.service.spec.ts asserts ANLT-01 skillBreakdown and ANLT-02 completionRateByModule
    - `pnpm --filter @repo/api test -- adaptive.service.spec` FAILS (RED — no implementation)
    - seed-admin.ts upserts `role: 'ADMIN'` with bcrypt hash
    - `db:seed:admin` present in packages/database/package.json
  </acceptance_criteria>
  <done>Six RED scaffolds created and failing (incl. ADPT-03/04, ANLT-01 skillBreakdown, ANLT-02 completionRateByModule); admin seed script + db:seed:admin present.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| seed-admin env → DB | ADMIN_PASSWORD from env is bcrypt-hashed before storage |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-08-01 | Information Disclosure | admin seed password | mitigate | bcrypt 12 rounds; password from env, never logged plaintext |
</threat_model>

<verification>
- `@repo/shared` builds; DTOs exported (incl. skillBreakdown, completionRateByModule)
- Six RED tests fail (no implementation); ADPT-03/04 + ANLT-01/02 assertions present
- `db:seed:admin` upserts ADMIN user
</verification>

<success_criteria>
DTOs exported (incl. ANLT-01 skillBreakdown + ANLT-02 completionRateByModule), RED scaffolds failing, admin seed ready. Paired with 08-01a and 08-01b, fully unblocks Wave 2.
</success_criteria>

<output>
Create `.planning/phases/08-adaptive-engine-dashboard-search-analytics/08-01c-SUMMARY.md` when done.
</output>
</output>
