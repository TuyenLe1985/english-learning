---
phase: 8
slug: adaptive-engine-dashboard-search-analytics
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-20
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework (API)** | Vitest 2.x + NestJS @nestjs/testing |
| **Framework (Web)** | Vitest 2.x + Testing Library |
| **Config file (API)** | `apps/api/vitest.config.ts` |
| **Config file (Web)** | `apps/web/vitest.config.ts` |
| **Quick run command** | `pnpm --filter @repo/api test` / `pnpm --filter @repo/web test` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~60 seconds (API: ~30s, Web: ~30s) |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter @repo/api test` and `pnpm --filter @repo/web test`
- **After every plan wave:** Run `pnpm test` (full Turborepo suite)
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 08-?-01 | adaptive | 1 | ADPT-01 | IDOR | userId from JWT only | unit | `pnpm --filter @repo/api test -- adaptive.service.spec` | ❌ W0 | ⬜ pending |
| 08-?-02 | adaptive | 1 | ADPT-02 | — | isWeak=true when accuracy < 0.6 | unit | (same spec) | ❌ W0 | ⬜ pending |
| 08-?-03 | adaptive | 1 | ADPT-05 | — | preThreshold=true when activityCount < 5 | unit | (same spec) | ❌ W0 | ⬜ pending |
| 08-?-04 | search | 1 | SRCH-02 | — | GIN FTS returns matching results | unit | `pnpm --filter @repo/api test -- search.service.spec` | ❌ W0 | ⬜ pending |
| 08-?-05 | search | 1 | SRCH-03 | — | CEFR/skill filter applied to UNION ALL | unit | (same spec) | ❌ W0 | ⬜ pending |
| 08-?-06 | analytics | 2 | ANLT-02 | — | Admin stats returns cached result on second call | unit | `pnpm --filter @repo/api test -- analytics.service.spec` | ❌ W0 | ⬜ pending |
| 08-?-07 | dashboard | 2 | DASH-01 | — | DashboardHero renders XP bar, level, CEFR badge | component | `pnpm --filter @repo/web test -- dashboard-hero.test` | ❌ W0 | ⬜ pending |
| 08-?-08 | dashboard | 2 | DASH-03 | — | SkillRadarChart renders 4 data points | component | `pnpm --filter @repo/web test -- skill-radar-chart.test` | ❌ W0 | ⬜ pending |
| 08-?-09 | analytics | 2 | ANLT-01 | — | ActivityHeatmap renders 365 days | component | `pnpm --filter @repo/web test -- activity-heatmap.test` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/api/src/adaptive/adaptive.service.spec.ts` — stubs for ADPT-01, ADPT-02, ADPT-05
- [ ] `apps/api/src/search/search.service.spec.ts` — stubs for SRCH-02, SRCH-03
- [ ] `apps/api/src/analytics/analytics.service.spec.ts` — stubs for ANLT-02
- [ ] `apps/web/src/components/dashboard/dashboard-hero.test.tsx` — stubs for DASH-01
- [ ] `apps/web/src/components/dashboard/skill-radar-chart.test.tsx` — stubs for DASH-03
- [ ] `apps/web/src/components/analytics/activity-heatmap.test.tsx` — stubs for ANLT-01

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Dashboard renders correct data for a real user session | DASH-01, DASH-02 | Requires seeded DB + real session JWT | Start app, login as seeded user, navigate to /dashboard, verify XP bar, skill scores, Continue Learning widget |
| Global search returns results in < 300ms | SRCH-01, SRCH-04 | Performance constraint requires real DB with GIN indexes | Use Chrome DevTools Network tab on /search?q=grammar, verify response time < 300ms |
| Activity heatmap matches ActivityLog data | ANLT-01 | Requires real DB with 365 days of seeded data | Navigate to /analytics, verify heatmap cell counts match DB query |
| Admin dashboard is hidden for non-admin users | ANLT-02 | Role-based UI hiding requires real session | Login as non-admin, verify /admin sidebar link absent and /admin returns 403 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
