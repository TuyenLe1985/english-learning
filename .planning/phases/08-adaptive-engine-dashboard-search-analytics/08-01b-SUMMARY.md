---
phase: 08-adaptive-engine-dashboard-search-analytics
plan: 01b
subsystem: api-backend
tags: [nestjs, modules, rbac, wave1, skeleton]
dependency_graph:
  requires: []
  provides:
    - AdaptiveModule skeleton (exports AdaptiveService)
    - SearchModule skeleton
    - AnalyticsModule skeleton (RolesGuard provider registered)
    - RolesGuard (T-08-08 — server-side role check)
    - roles.decorator (ROLES_KEY, Roles())
    - app.module.ts registered with all three modules
  affects:
    - apps/api/src/app.module.ts
    - apps/api/src/auth/
tech_stack:
  added: []
  patterns:
    - NestJS module skeleton (GamificationModule analog)
    - CanActivate guard (RolesGuard reads JWT-decoded req.user.role)
    - SetMetadata decorator factory (Roles())
key_files:
  created:
    - apps/api/src/auth/roles.decorator.ts
    - apps/api/src/auth/roles.guard.ts
    - apps/api/src/adaptive/adaptive.module.ts
    - apps/api/src/adaptive/adaptive.service.ts
    - apps/api/src/adaptive/adaptive.controller.ts
    - apps/api/src/search/search.module.ts
    - apps/api/src/search/search.service.ts
    - apps/api/src/search/search.controller.ts
    - apps/api/src/analytics/analytics.module.ts
    - apps/api/src/analytics/analytics.service.ts
    - apps/api/src/analytics/analytics.controller.ts
  modified:
    - apps/api/src/app.module.ts
decisions:
  - "[08-01b] RolesGuard uses 'ADMIN'/'STUDENT' string literals (UserRole enum values) — not 'USER'"
  - "[08-01b] AnalyticsModule registers RolesGuard as provider so Plan 08-04 can use it without additional imports"
  - "[08-01b] AdaptiveModule exports AdaptiveService — required for Grammar/Vocab/Reading/Listening/Quiz module injection in Plan 08-02"
metrics:
  duration: "5 minutes"
  completed: "2026-06-20T08:36:15Z"
  tasks_completed: 1
  files_created: 11
  files_modified: 1
---

# Phase 8 Plan 01b: Module Skeletons + RolesGuard Summary

**One-liner:** Three NestJS module skeletons (Adaptive/Search/Analytics) + RolesGuard with JWT-decoded role comparison registered in app.module.ts, unblocking Wave 2 parallel plans.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Module skeletons + RolesGuard + app.module registration | 44dd793 | 11 created, 1 modified |

## What Was Built

### roles.decorator.ts
Exports `ROLES_KEY = 'roles'` and `Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles)`. Used by Wave 2 plan 08-04 to guard the admin analytics endpoint.

### roles.guard.ts
`RolesGuard implements CanActivate` — reads `Reflector.getAllAndOverride<string[]>(ROLES_KEY, [handler, class])`, returns `true` if no roles required, otherwise checks `requiredRoles.includes(user?.role)`. Role value is read from `req.user.role` (JWT-decoded by `JwtAuthGuard` which runs first in the guard chain). Uses `'ADMIN'` / `'STUDENT'` string literals matching `UserRole` enum values. Mitigates T-08-08 (Elevation of Privilege).

### AdaptiveModule Skeleton
Empty `AdaptiveService` (injects `PrismaService`), empty `AdaptiveController` (`@Controller('adaptive')` with no routes), `AdaptiveModule` (imports `[AuthModule]`, exports `[AdaptiveService]`). The export is the key contract: Wave 2 plans for Grammar/Vocabulary/Reading/Listening/Quiz modules need to inject `AdaptiveService.updateSkillScore()`.

### SearchModule Skeleton
Empty `SearchService` (injects `PrismaService`), empty `SearchController` (`@Controller('search')` with no routes), `SearchModule` (imports `[AuthModule]`). Plan 08-03 fills in the FTS implementation.

### AnalyticsModule Skeleton
Empty `AnalyticsService` (injects `PrismaService`), empty `AnalyticsController` (`@Controller('analytics')` with no routes), `AnalyticsModule` (imports `[AuthModule]`, providers include `RolesGuard`). Plan 08-04 fills in the student/admin analytics endpoints.

### app.module.ts
Added imports for `AdaptiveModule`, `SearchModule`, `AnalyticsModule` after `QuizModule`. These registrations are permanent — Wave 2 plans fill in service/controller bodies only and must NOT edit app.module.ts registration.

## Verification

- All 11 new files created and committed
- app.module.ts imports all three new modules
- AdaptiveModule exports AdaptiveService
- RolesGuard correctly reads JWT-decoded role (server-side, not client-asserted)
- Build check: The `pnpm --filter @repo/api build` check cannot pass in isolation in the worktree because `node_modules` are not linked in the worktree (pnpm installs to main checkout only). This is expected parallel worktree behavior — the same `TS2307: Cannot find module '@nestjs/common'` errors affect ALL files in the worktree equally (including pre-existing files like `jwt-auth.guard.ts`). The build will pass after the orchestrator merges all Wave 1 branches and runs `pnpm install`.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

The three module service/controller files are intentional skeletons (no routes, no business logic). This is by design — they are CONTRACT skeletons for Wave 2 plans to fill. They do not present any user-visible stubs.

## Self-Check: PASSED

All created files verified present. Commit 44dd793 exists. Key content verified:
- app.module.ts imports AdaptiveModule, SearchModule, AnalyticsModule
- AdaptiveModule exports AdaptiveService
- roles.decorator.ts exports ROLES_KEY
- roles.guard.ts exports RolesGuard with requiredRoles.includes() check