---
phase: 08-adaptive-engine-dashboard-search-analytics
plan: "07"
subsystem: frontend-admin
tags: [admin, analytics, rbac, role-gate, recharts, framer-motion, anlt-02]
dependency_graph:
  requires: ["08-04", "08-06"]
  provides:
    - Admin relay GET /api/admin/analytics → NestJS /api/analytics/admin
    - Admin page /admin (Server Component, ADMIN role gate, redirect STUDENT → /dashboard)
    - AdminStatCard (dl/dt/dd a11y, framer-motion stagger)
    - UserGrowthChart (recharts LineChart, --chart-5)
    - TopContentTable (title truncate, module Badge, completions right-aligned)
    - ModuleCompletionTable (ANLT-02 per-module completion rates with rate bar)
  affects: [phase-08-verification]
tech_stack:
  added: []
  patterns:
    - Server Component role gate (session.user.role !== 'ADMIN' → redirect)
    - Next.js relay route targeting NestJS /api/analytics/admin (surfaces 403 as-is)
    - Recharts LineChart with explicit-height wrapper (Pitfall 6/7)
    - framer-motion stat card stagger (opacity + scale, 0.05s delay per card)
    - dl/dt/dd semantic markup for admin stat a11y (UI-SPEC Admin)
key_files:
  created:
    - apps/web/src/app/api/admin/analytics/route.ts
    - apps/web/src/app/(dashboard)/admin/page.tsx
    - apps/web/src/components/analytics/admin-stat-card.tsx
    - apps/web/src/components/analytics/user-growth-chart.tsx
    - apps/web/src/components/analytics/top-content-table.tsx
    - apps/web/src/components/analytics/module-completion-table.tsx
  modified:
    - apps/web/src/components/analytics/activity-heatmap.tsx (tooltip labels type error fix)
    - packages/database/prisma/seed-admin.ts (passwordHash field fix)
decisions:
  - "[08-07] ModuleCompletionTable renders inline rate bar (div width %) for visual clarity over right-aligned % only"
  - "[08-07] AdminStatCard uses dl/dt/dd per UI-SPEC a11y requirement"
  - "[08-07] Pre-existing API build errors (gamification/@prisma/client, crawler/playwright, reading/schema) are out-of-scope and not introduced by this plan"
  - "[08-07] Pre-existing RED-phase placeholder tests (jwt.guard.spec.ts auth.service.spec.ts auth-actions.test.ts) are not fixed — do NOT weaken assertions"
metrics:
  duration: ~30m
  completed: 2026-06-20
  tasks_completed: 2
  files_created: 6
  files_modified: 2
requirements:
  - ANLT-02
---

# Phase 08 Plan 07: Admin Dashboard Summary

Admin platform dashboard (/admin) with ADMIN role gate, relay to NestJS /api/analytics/admin, 4 KPI stat cards, user growth chart, top-content table, and per-module completion rate table (ANLT-02). Admin seed fixed and seeded successfully.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Admin relay + role-gated page + stat cards/chart/table | `9f38fba` | 6 new + 1 modified |
| 2 | Seed-admin fix + verify suite | `35bdc49` | seed-admin.ts |
| 3 | Human checkpoint (pending) | — | — |

## What Was Built

### Task 1: Admin Dashboard Slice

**Relay** (`apps/web/src/app/api/admin/analytics/route.ts`):
- Copy of profile/me relay pattern targeting `${API_URL}/api/analytics/admin`
- `auth()` → 401 if no session (T-08-17 spoofing mitigated)
- Surfaces NestJS 403 as-is — RolesGuard is the authoritative ADMIN enforcement

**Admin page** (`apps/web/src/app/(dashboard)/admin/page.tsx`):
- Server Component: `auth()` → `redirect('/login')` if no session
- Role gate: `if (session.user?.role !== 'ADMIN') redirect('/dashboard')` — T-08-16 mitigated
- Uses 'ADMIN' literal (not 'USER' — Pitfall 3)
- Fetches `INTERNAL_API_URL/api/analytics/admin` server-side with graceful empty fallback
- Renders: heading "Platform Overview" + "Last updated {relative time}" + 4 AdminStatCard + UserGrowthChart + TopContentTable + ModuleCompletionTable

**AdminStatCard** (`apps/web/src/components/analytics/admin-stat-card.tsx`):
- `<dl><dt><dd>` a11y markup (UI-SPEC Screen 6)
- dt: 12px muted label; dd: 28px semibold Display value; optional delta badge (emerald if ≥0, text-destructive if <0)
- framer-motion `initial={{ opacity: 0, scale: 0.97 }}` → `animate={{ opacity: 1, scale: 1 }}`, stagger 0.05s per card

**UserGrowthChart** (`apps/web/src/components/analytics/user-growth-chart.tsx`):
- `"use client"` Recharts LineChart (Pitfall 7)
- `--chart-5` (amber `hsl(27, 87%, 67%)`) stroke color
- Explicit `style={{ height: 200 }}` wrapper (Pitfall 6)
- Date labels formatted "Jun 20" style

**TopContentTable** (`apps/web/src/components/analytics/top-content-table.tsx`):
- Title `max-w-[200px] truncate` (UI-SPEC)
- Module `<Badge variant="secondary" className="capitalize">`
- Completions `tabular-nums text-right`

**ModuleCompletionTable** (`apps/web/src/components/analytics/module-completion-table.tsx`):
- ANLT-02 "average completion rates by module"
- Module Badge + inline rate bar (`bg-emerald-500` fill proportional to rate %) + % label

### Task 2: Seed Fix + Suite Run

**seed-admin.ts bug fixed** (Rule 1 — Bug):
- Field `password` → `passwordHash` to match Prisma schema
- Admin user seeded: `admin@example.com` id=cmqmfu1g100001e6pld3a6vhq

**Test suite results:**
- Phase 8 API tests (adaptive/search/analytics): ALL PASS (9+5+4 tests)
- Phase 8 web tests (skill-radar-chart/dashboard-hero/activity-heatmap): ALL PASS (3+5+3 tests)
- Pre-existing failures: 4 RED-placeholder tests in jwt.guard.spec.ts + auth.service.spec.ts; 18 auth-actions.test.ts failures (prisma.$transaction mock gap — pre-existing from Phase 2)
- Web build: SUCCESS (✓ Compiled successfully, all 49 static pages generated)
- API build: FAILED (pre-existing errors unrelated to this plan — see Deferred Issues)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] activity-heatmap.tsx tooltip labels type error**
- Found during: Task 1 web build
- Issue: `labels={{ tooltip: "..." }}` — `tooltip` key does not exist in the `labels` prop type of react-activity-calendar
- Fix: Removed the `labels` prop entirely; tooltip still renders via default behavior
- Files modified: apps/web/src/components/analytics/activity-heatmap.tsx
- Commit: 9f38fba

**2. [Rule 1 - Bug] seed-admin.ts uses 'password' field instead of 'passwordHash'**
- Found during: Task 2 admin seed run
- Issue: `{ password: hash }` in upsert create/update payload — Prisma User schema field is `passwordHash`
- Fix: Changed both `create` and `update` payload keys to `passwordHash`
- Files modified: packages/database/prisma/seed-admin.ts
- Commit: 35bdc49

## Deferred Issues

Pre-existing build/test failures not caused by this plan (out of scope per scope boundary rule):

| Issue | File | Description |
|-------|------|-------------|
| API build error | apps/api/src/gamification/gamification.service.ts | Cannot find module '@prisma/client' — pre-existing dependency issue |
| API build error | apps/api/src/pipeline/classifier.service.ts | Import assignment not ECMAScript-compatible — pre-existing |
| API build error | apps/api/src/pipeline/crawler.service.ts | Cannot find module 'playwright' — pre-existing |
| API build error | apps/api/src/reading/reading.service.ts | 'userId_passageId' not in NoteWhereUniqueInput — pre-existing schema mismatch |
| Test RED placeholder | apps/api/src/auth/jwt.guard.spec.ts (L77, L89) | `expect(false).toBe(true)` — intentional RED stubs from Plan 04, never turned GREEN |
| Test RED placeholder | apps/api/src/auth/auth.service.spec.ts | `expect(false).toBe(true)` — intentional RED stubs from Plan 05 |
| Test failure | apps/web/src/lib/auth-actions.test.ts | prisma.$transaction is not a function in test mocks — pre-existing Phase 2 mock gap |

## Known Stubs

None — the admin page fetches real data from NestJS or falls back to empty state DTOs (no hardcoded placeholder data displayed to users).

## Threat Model Coverage

| Threat | Component | Mitigation Applied |
|--------|-----------|-------------------|
| T-08-16 (Elevation of Privilege — /admin page) | admin/page.tsx | Server Component checks `session.user.role !== 'ADMIN'` → redirect('/dashboard'); NestJS RolesGuard provides authoritative 403 even if page check bypassed |
| T-08-17 (Spoofing — admin relay) | /api/admin/analytics/route.ts | auth() → 401 if no session; relay surfaces NestJS 403 for non-ADMIN JWT |

## Checkpoint Status

Task 3 (Phase 8 end-to-end human verification) is a `checkpoint:human-verify` blocking gate.
The plan requires human verification of all 5 Phase 8 success criteria before marking complete.

## Self-Check

Files verified:
- FOUND: apps/web/src/app/api/admin/analytics/route.ts
- FOUND: apps/web/src/app/(dashboard)/admin/page.tsx
- FOUND: apps/web/src/components/analytics/admin-stat-card.tsx
- FOUND: apps/web/src/components/analytics/user-growth-chart.tsx
- FOUND: apps/web/src/components/analytics/top-content-table.tsx
- FOUND: apps/web/src/components/analytics/module-completion-table.tsx

Commits verified:
- `9f38fba` (Task 1) — present in git log
- `35bdc49` (Task 2) — present in git log

Role gate verified: `grep -q "role !== 'ADMIN'"` — PASS
Relay target verified: `grep -q "/api/analytics/admin"` — PASS
Web build: SUCCESS

## Self-Check: PASSED
