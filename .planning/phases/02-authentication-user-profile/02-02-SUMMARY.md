---
phase: "02-authentication-user-profile"
plan: "02"
subsystem: "frontend-design-system + api-test-scaffolds"
tags: ["shadcn", "tailwind", "inter-font", "tdd", "red-scaffolds", "wave-0"]
dependency_graph:
  requires: ["02-01"]
  provides: ["shadcn-initialized", "inter-font-loaded", "auth-layout-shell", "wave-0-red-scaffolds"]
  affects: ["02-03", "02-04", "02-05", "02-06"]
tech_stack:
  added:
    - "class-variance-authority@latest (shadcn dependency)"
    - "clsx@latest (shadcn dependency)"
    - "tailwind-merge@latest (shadcn dependency)"
    - "lucide-react@latest (shadcn icon library)"
    - "tailwindcss-animate@latest (shadcn animation)"
  patterns:
    - "shadcn New York style with zinc base color and CSS custom properties"
    - "next/font/google Inter loading with --font-inter CSS variable"
    - "Route group (auth) layout pattern for centered auth pages"
    - "Wave 0 RED test scaffold pattern: expect(false).toBe(true) with plan attribution"
key_files:
  created:
    - "apps/web/components.json (shadcn configuration: New York, zinc, CSS vars)"
    - "apps/web/src/app/(auth)/layout.tsx (centered auth card shell, max-w-[400px])"
    - "apps/web/src/components/ui/button.tsx (shadcn Button component)"
    - "apps/web/src/lib/utils.ts (cn() helper)"
    - "apps/api/src/auth/auth.service.spec.ts (RED: AUTH-01, AUTH-02, AUTH-04)"
    - "apps/api/src/auth/jwt.guard.spec.ts (RED: AUTH-05, AUTH-06)"
    - "apps/api/src/users/users.service.spec.ts (RED: PROF-01, PROF-02)"
    - "apps/api/src/profile/profile.service.spec.ts (RED: PROF-02 avatar constraints)"
    - "packages/shared/src/user.dto.test.ts (GREEN: 23 passing tests)"
  modified:
    - "apps/web/src/app/globals.css (zinc CSS custom properties injected)"
    - "apps/web/src/app/layout.tsx (Inter font, --font-inter variable)"
    - "apps/web/tailwind.config.ts (shadcn CSS variable color tokens, tailwindcss-animate)"
    - "apps/web/package.json (shadcn dependencies added)"
decisions:
  - "shadcn --defaults flag selected base-nova style; manually corrected to new-york + zinc per UI-SPEC — no components.json default option allows non-interactive selection"
  - "packages/shared/src/user.dto.test.ts marked GREEN (not RED) because Plan 01 already shipped the schemas; 23 tests pass immediately"
  - "Wave 0 RED scaffolds use expect(false).toBe(true) pattern with '// RED: implemented in Plan NN' attribution so downstream plan executors can identify their owning tests"
metrics:
  duration: "~22 minutes"
  completed_date: "2026-06-12"
  tasks_completed: 2
  tasks_total: 2
  files_created: 9
  files_modified: 4
---

# Phase 02 Plan 02: Design System Init + Wave 0 Test Scaffolds Summary

**One-liner:** shadcn initialized (New York/zinc/CSS vars) with Inter font, (auth) route-group shell at max-w-[400px], and 5 Wave 0 RED test scaffolds attributed to Plans 03–06 for Nyquist compliance.

---

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Initialize shadcn + Inter font + (auth) layout shell | `3f1fbfc` | components.json, layout.tsx, (auth)/layout.tsx, globals.css, tailwind.config.ts |
| 2 | Wave 0 RED test scaffolds (Nyquist compliance) | `aa90d3f` | auth.service.spec.ts, jwt.guard.spec.ts, users.service.spec.ts, profile.service.spec.ts, user.dto.test.ts |

---

## Verification Results

### Task 1
- `apps/web/components.json` exists with `"style": "new-york"` ✓
- `globals.css` contains `--background`, `--primary`, `--destructive` zinc CSS variable tokens ✓
- `layout.tsx` imports Inter from `next/font/google` and applies `--font-inter` variable ✓
- `(auth)/layout.tsx` constrains content to `max-w-[400px]` centered layout ✓
- `pnpm --filter @repo/web exec tsc --noEmit` exits 0 ✓

### Task 2
- All 5 scaffold files exist with describe+it blocks ✓
- `jwt.guard.spec.ts` asserts UnauthorizedException (401) for missing and invalid Bearer tokens ✓
- `pnpm --filter @repo/api test --run` reports 24 failing tests (RED) + 2 passing (health) ✓
- `pnpm --filter @repo/shared test --run` reports 23 passing tests (user.dto.test.ts GREEN) ✓
- Every RED test comment names the owning plan ✓

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] shadcn `--defaults` flag selected wrong style (base-nova instead of new-york)**
- **Found during:** Task 1
- **Issue:** Running `npx shadcn@latest init --defaults` selected `base-nova` style and `neutral` base color instead of the UI-SPEC required `new-york` style and `zinc` base color. The default interactive choices in shadcn@4.11.0 use base-nova.
- **Fix:** Manually updated `components.json` to set `"style": "new-york"` and `"baseColor": "zinc"`. Replaced the generated `globals.css` (which used oklch color space) with the standard shadcn New York zinc HSL tokens. Updated `tailwind.config.ts` to use `hsl(var(--...))` color tokens matching the zinc palette.
- **Files modified:** `apps/web/components.json`, `apps/web/src/app/globals.css`, `apps/web/tailwind.config.ts`
- **Commit:** 3f1fbfc

**2. [Rule 2 - Missing critical functionality] shadcn init replaced Geist with Inter via layout update**
- **Found during:** Task 1 — shadcn init injected Geist font instead of Inter per UI-SPEC
- **Issue:** The shadcn init command updated `layout.tsx` to use Geist font (`const geist = Geist({...variable:'--font-sans'})`). UI-SPEC Typography explicitly requires Inter loaded as `--font-inter`.
- **Fix:** Replaced `Geist` import with `Inter` from `next/font/google`, renamed variable from `--font-sans` to `--font-inter`, updated `globals.css` body font-family to use `var(--font-inter)`, and updated `tailwind.config.ts` fontFamily sans to reference `--font-inter`.
- **Files modified:** `apps/web/src/app/layout.tsx`, `apps/web/src/app/globals.css`, `apps/web/tailwind.config.ts`
- **Commit:** 3f1fbfc

---

## Known Stubs

None. This plan creates design system scaffolding and test scaffolds only — no data-rendering components.

The RED test scaffolds intentionally fail (using `expect(false).toBe(true)`) and are attributed to their owning plans. These are Wave 0 placeholders, not stubs in the rendering/data sense.

---

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes introduced in this plan. shadcn component installation writes only client-side UI code.

---

## Self-Check: PASSED

Files exist:
- `apps/web/components.json` ✓
- `apps/web/src/app/(auth)/layout.tsx` ✓
- `apps/api/src/auth/auth.service.spec.ts` ✓
- `apps/api/src/auth/jwt.guard.spec.ts` ✓
- `apps/api/src/users/users.service.spec.ts` ✓
- `apps/api/src/profile/profile.service.spec.ts` ✓
- `packages/shared/src/user.dto.test.ts` ✓

Commits exist:
- `3f1fbfc` feat(02-02): initialize shadcn ✓
- `aa90d3f` test(02-02): Wave 0 RED test scaffolds ✓
