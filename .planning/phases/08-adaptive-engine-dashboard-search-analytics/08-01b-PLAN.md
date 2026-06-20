---
phase: 08-adaptive-engine-dashboard-search-analytics
plan: 01b
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
  - apps/api/src/adaptive/adaptive.module.ts
  - apps/api/src/adaptive/adaptive.service.ts
  - apps/api/src/adaptive/adaptive.controller.ts
  - apps/api/src/search/search.module.ts
  - apps/api/src/search/search.service.ts
  - apps/api/src/search/search.controller.ts
  - apps/api/src/analytics/analytics.module.ts
  - apps/api/src/analytics/analytics.service.ts
  - apps/api/src/analytics/analytics.controller.ts
  - apps/api/src/auth/roles.decorator.ts
  - apps/api/src/auth/roles.guard.ts
  - apps/api/src/app.module.ts
autonomous: true
requirements: [ADPT-01, ADPT-02, ADPT-03, ADPT-04, ADPT-05, SRCH-02, SRCH-03, ANLT-01, ANLT-02, DASH-01, DASH-03]
user_setup: []

must_haves:
  truths:
    - "Shared DTOs (DashboardDto, SearchResultDto, AnalyticsDto, AdminAnalyticsDto) are exported from @repo/shared"
    - "AnalyticsDto includes a skillBreakdown: SkillScoreDto[] field (ANLT-01 skill breakdown)"
    - "AdminAnalyticsDto includes a completionRateByModule field (ANLT-02 average completion rates by module)"
    - "RED test scaffolds exist and fail (no implementation yet) for adaptive/search/analytics services and 3 web components"
    - "Empty AdaptiveModule/SearchModule/AnalyticsModule skeletons + RolesGuard exist and are registered in app.module; apps/api builds"
    - "pnpm db:seed:admin upserts an ADMIN-role user"
  artifacts:
    - path: "packages/shared/src/adaptive.dto.ts"
      provides: "DashboardDto, ContinueLearningDto, SkillScoreDto"
    - path: "packages/shared/src/search.dto.ts"
      provides: "SearchResultDto, SearchResultGroupDto"
    - path: "packages/shared/src/analytics.dto.ts"
      provides: "AnalyticsDto (incl. skillBreakdown), AdminAnalyticsDto (incl. completionRateByModule)"
    - path: "apps/api/src/auth/roles.guard.ts"
      provides: "RolesGuard"
      exports: ["RolesGuard"]
    - path: "apps/api/src/adaptive/adaptive.module.ts"
      provides: "AdaptiveModule skeleton (exports AdaptiveService)"
    - path: "packages/database/prisma/seed-admin.ts"
      provides: "admin seed script"
  key_links:
    - from: "apps/api/src/app.module.ts"
      to: "AdaptiveModule / SearchModule / AnalyticsModule"
      via: "imports array registration"
      pattern: "(Adaptive|Search|Analytics)Module"
    - from: "packages/shared/src/index.ts"
      to: "adaptive.dto / search.dto / analytics.dto"
      via: "barrel export"
      pattern: "export \\* from \"./(adaptive|search|analytics).dto\""
---

<objective>
Foundation part B for Phase 8. Define all shared DTOs (including the ANLT-01 skillBreakdown field on AnalyticsDto and the ANLT-02 completionRateByModule field on AdminAnalyticsDto), scaffold the failing TDD tests, create the admin seed script, and create the three NestJS module skeletons (AdaptiveModule, SearchModule, AnalyticsModule) + RolesGuard registered in app.module.ts.

Purpose: Establishes the interface contracts (DTOs + module skeletons + app.module.ts ownership) so the three Wave 2 backend plans (08-02/03/04) can run in parallel without touching app.module.ts. The module skeletons are interface contracts: downstream plans fill in service/controller bodies, never the registration. 08-01b runs in parallel with 08-01a in Wave 1 (zero file overlap — 08-01a owns deps/schema/migration, 08-01b owns DTOs/scaffolds/skeletons/seed). Wave 2 plans depend on BOTH 08-01a and 08-01b.
Output: Shared DTOs, RED test scaffolds, admin seed, registered empty module skeletons, RolesGuard.
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

Module skeleton pattern (apps/api/src/gamification/gamification.module.ts): @Module({ imports:[AuthModule], controllers:[...], providers:[...], exports:[...] }).
app.module.ts (apps/api/src/app.module.ts): imports array currently ends with QuizModule (line 33). Add AdaptiveModule, SearchModule, AnalyticsModule.
RolesGuard (RESEARCH.md Pattern 3 + 08-PATTERNS.md): roles.decorator.ts exports ROLES_KEY + Roles(); roles.guard.ts reads Reflector.getAllAndOverride and compares req.user.role to required roles. Use 'ADMIN'/'STUDENT' literals (Pitfall 3).

NOTE: This plan must NOT touch packages/database/prisma/schema.prisma, apps/*/package.json, or shadcn components — those are owned by 08-01a. The CefrHistory model + GIN migration + deps come from 08-01a (same wave, no overlap).
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Define all shared DTOs (incl. ANLT-01 skillBreakdown + ANLT-02 completionRateByModule)</name>
  <files>packages/shared/src/adaptive.dto.ts, packages/shared/src/search.dto.ts, packages/shared/src/analytics.dto.ts, packages/shared/src/index.ts, packages/shared/src/grammar.dto.ts</files>
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
    Create the six RED spec/test files from RESEARCH.md "Wave 0 Gaps" with failing assertions importing the not-yet-implemented sources. Use gamification.service.spec.ts mocking style (PrismaService as vi.fn() mock) for API specs; Testing Library render/screen for web tests. Include the ADPT-03 and ADPT-04 assertions in adaptive.service.spec.ts (lowest-accuracy weak skill with updatedAt tie-break; recommendedNextTier when accuracy ≥ 0.8). Include the ANLT-01 skillBreakdown assertion in analytics.service.spec.ts and the ANLT-02 completionRateByModule assertion. Create `packages/database/prisma/seed-admin.ts`: instantiate PrismaClient, upsert a user with `role: 'ADMIN'` (literal 'ADMIN' — Pitfall 3), email/password from env `ADMIN_EMAIL`/`ADMIN_PASSWORD` (defaults e.g. admin@example.com), bcrypt-hash password at 12 rounds (match existing auth rounds). Add `"db:seed:admin": "TS_NODE_PROJECT=tsconfig.seed.json node --env-file=../../.env -r ts-node/register prisma/seed-admin.ts"` to packages/database/package.json (mirror db:seed). Do NOT implement the services.
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

<task type="auto">
  <name>Task 3: Module skeletons + RolesGuard + app.module registration</name>
  <files>apps/api/src/app.module.ts, apps/api/src/auth/roles.decorator.ts, apps/api/src/auth/roles.guard.ts, apps/api/src/adaptive/adaptive.module.ts, apps/api/src/adaptive/adaptive.service.ts, apps/api/src/adaptive/adaptive.controller.ts, apps/api/src/search/search.module.ts, apps/api/src/search/search.service.ts, apps/api/src/search/search.controller.ts, apps/api/src/analytics/analytics.module.ts, apps/api/src/analytics/analytics.service.ts, apps/api/src/analytics/analytics.controller.ts</files>
  <read_first>
    - apps/api/src/app.module.ts (imports array ending at QuizModule line 33)
    - apps/api/src/gamification/gamification.module.ts (module structure + exports)
    - apps/api/src/auth/jwt-auth.guard.ts (CanActivate pattern; confirms req.user includes role)
    - .planning/phases/08-adaptive-engine-dashboard-search-analytics/08-RESEARCH.md (Pattern 3 RolesGuard + @Roles)
    - .planning/phases/08-adaptive-engine-dashboard-search-analytics/08-PATTERNS.md (roles.guard.ts / roles.decorator.ts sections)
  </read_first>
  <action>
    Create minimal compiling skeletons so app.module.ts can register all three modules and Wave 2 plans never touch app.module.ts again. (1) `apps/api/src/auth/roles.decorator.ts`: export `ROLES_KEY = 'roles'` and `Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles)`. (2) `apps/api/src/auth/roles.guard.ts`: `RolesGuard implements CanActivate` reading `reflector.getAllAndOverride<string[]>(ROLES_KEY, [handler, class])`; if no roles return true; else `requiredRoles.includes(user?.role)` (use 'ADMIN'/'STUDENT' literals — Pitfall 3). (3) AdaptiveModule skeleton: empty `adaptive.service.ts` (`@Injectable() export class AdaptiveService { constructor(private readonly prisma: PrismaService) {} }`), empty `adaptive.controller.ts` (`@Controller('adaptive')` with no routes yet), `adaptive.module.ts` (imports [AuthModule], controllers [AdaptiveController], providers [AdaptiveService], exports [AdaptiveService]). (4) SearchModule skeleton: empty SearchService, SearchController (`@Controller('search')`), search.module.ts (imports [AuthModule], controllers [SearchController], providers [SearchService]). (5) AnalyticsModule skeleton: empty AnalyticsService, AnalyticsController (`@Controller('analytics')`), analytics.module.ts (imports [AuthModule], controllers [AnalyticsController], providers [AnalyticsService, RolesGuard]). (6) Register AdaptiveModule, SearchModule, AnalyticsModule in app.module.ts imports array after QuizModule. These are CONTRACT skeletons — downstream plans 08-02/03/04 fill in bodies and must NOT edit module/app.module registration. apps/api must build (requires 08-01a's Prisma client regenerate for prisma.cefrHistory typing — if running standalone before 08-01a completes, the AdaptiveService skeleton has no cefrHistory reference yet so it still builds).
  </action>
  <verify>
    <automated>cd /home/tuyen/Desktop/Apps/english-learning && grep -q "AdaptiveModule" apps/api/src/app.module.ts && grep -q "SearchModule" apps/api/src/app.module.ts && grep -q "AnalyticsModule" apps/api/src/app.module.ts && test -f apps/api/src/auth/roles.guard.ts && grep -q "exports: \[AdaptiveService\]" apps/api/src/adaptive/adaptive.module.ts && pnpm --filter @repo/api build 2>&1 | tail -3 && echo OK</automated>
  </verify>
  <acceptance_criteria>
    - roles.decorator.ts exports ROLES_KEY + Roles; roles.guard.ts exports RolesGuard implementing CanActivate
    - AdaptiveModule/SearchModule/AnalyticsModule skeletons exist; AdaptiveModule exports AdaptiveService
    - app.module.ts imports array includes all three modules
    - `pnpm --filter @repo/api build` succeeds (NestJS DI resolves)
  </acceptance_criteria>
  <done>Three module skeletons + RolesGuard created and registered in app.module; apps/api builds. Downstream plans fill bodies only.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| seed-admin env → DB | ADMIN_PASSWORD from env is bcrypt-hashed before storage |
| client role claim → RolesGuard | role read from server-decoded JWT, not client-asserted |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-08-01 | Information Disclosure | admin seed password | mitigate | bcrypt 12 rounds; password from env, never logged plaintext |
| T-08-08 | Elevation of Privilege | RolesGuard | mitigate | RolesGuard reads req.user.role (JWT-decoded server-side), 'ADMIN' literal compare — cannot be spoofed by client |
</threat_model>

<verification>
- `@repo/shared` builds; DTOs exported (incl. skillBreakdown, completionRateByModule)
- Six RED tests fail (no implementation); ADPT-03/04 + ANLT-01/02 assertions present
- Module skeletons + RolesGuard registered; apps/api builds
- `db:seed:admin` upserts ADMIN user
</verification>

<success_criteria>
DTOs exported (incl. ANLT-01 skillBreakdown + ANLT-02 completionRateByModule), RED scaffolds failing, admin seed ready, three module skeletons + RolesGuard registered (app.module owned here). Paired with 08-01a, fully unblocks Wave 2.
</success_criteria>

<output>
Create `.planning/phases/08-adaptive-engine-dashboard-search-analytics/08-01b-SUMMARY.md` when done.
</output>
