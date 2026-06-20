---
phase: 08-adaptive-engine-dashboard-search-analytics
plan: 01b
type: execute
wave: 1
depends_on: []
files_modified:
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
requirements: [ADPT-01, ADPT-02, ADPT-03, ADPT-04, ADPT-05, SRCH-02, SRCH-03, ANLT-01, ANLT-02]
user_setup: []

must_haves:
  truths:
    - "Empty AdaptiveModule/SearchModule/AnalyticsModule skeletons + RolesGuard exist and are registered in app.module; apps/api builds"
    - "RolesGuard reads req.user.role (JWT-decoded) and compares against required roles using 'ADMIN'/'STUDENT' literals"
  artifacts:
    - path: "apps/api/src/auth/roles.guard.ts"
      provides: "RolesGuard"
      exports: ["RolesGuard"]
    - path: "apps/api/src/auth/roles.decorator.ts"
      provides: "ROLES_KEY, Roles()"
    - path: "apps/api/src/adaptive/adaptive.module.ts"
      provides: "AdaptiveModule skeleton (exports AdaptiveService)"
  key_links:
    - from: "apps/api/src/app.module.ts"
      to: "AdaptiveModule / SearchModule / AnalyticsModule"
      via: "imports array registration"
      pattern: "(Adaptive|Search|Analytics)Module"
---

<objective>
Foundation part B for Phase 8. Create the three NestJS module skeletons (AdaptiveModule, SearchModule, AnalyticsModule) + RolesGuard + roles.decorator, and register all three modules in app.module.ts.

Purpose: Establishes the module skeletons + app.module.ts ownership so the three Wave 2 backend plans (08-02/03/04) can run in parallel without touching app.module.ts. The module skeletons are interface contracts: downstream plans fill in service/controller bodies, never the registration. 08-01b runs in parallel with 08-01a and 08-01c in Wave 1 (zero file overlap — 08-01a owns deps/schema/migration, 08-01b owns module skeletons/RolesGuard, 08-01c owns DTOs/scaffolds/seed). Wave 2 plans depend on 08-01a, 08-01b, AND 08-01c.
Output: Three registered empty module skeletons, RolesGuard + roles.decorator.
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
- enum UserRole { STUDENT ADMIN }  — already exists; do NOT recreate
- model User has: role (UserRole @default(STUDENT))
- CefrHistory model is added by 08-01a (do NOT add schema here; this plan does not touch schema.prisma)

Module skeleton pattern (apps/api/src/gamification/gamification.module.ts): @Module({ imports:[AuthModule], controllers:[...], providers:[...], exports:[...] }).
app.module.ts (apps/api/src/app.module.ts): imports array currently ends with QuizModule (line 33). Add AdaptiveModule, SearchModule, AnalyticsModule.
RolesGuard (RESEARCH.md Pattern 3 + 08-PATTERNS.md): roles.decorator.ts exports ROLES_KEY + Roles(); roles.guard.ts reads Reflector.getAllAndOverride and compares req.user.role to required roles. Use 'ADMIN'/'STUDENT' literals (Pitfall 3).

NOTE: This plan must NOT touch packages/database/prisma/schema.prisma, apps/*/package.json, shadcn components, shared DTOs, RED scaffolds, or the admin seed — DTOs/scaffolds/seed are owned by 08-01c; schema/deps by 08-01a (same wave, no overlap).
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Module skeletons + RolesGuard + app.module registration</name>
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
| client role claim → RolesGuard | role read from server-decoded JWT, not client-asserted |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-08-08 | Elevation of Privilege | RolesGuard | mitigate | RolesGuard reads req.user.role (JWT-decoded server-side), 'ADMIN' literal compare — cannot be spoofed by client |
</threat_model>

<verification>
- Module skeletons + RolesGuard registered; apps/api builds
- RolesGuard compares req.user.role against required roles with literal compare
</verification>

<success_criteria>
Three module skeletons + RolesGuard registered (app.module owned here). Paired with 08-01a and 08-01c, fully unblocks Wave 2.
</success_criteria>

<output>
Create `.planning/phases/08-adaptive-engine-dashboard-search-analytics/08-01b-SUMMARY.md` when done.
</output>
</output>
