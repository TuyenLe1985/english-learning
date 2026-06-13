---
phase: 4
slug: grammar-module
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-13
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.x |
| **Config file** | `apps/web/vitest.config.ts` / `apps/api/vitest.config.ts` |
| **Quick run command** | `pnpm --filter web test --run` |
| **Full suite command** | `pnpm --filter web test --run && pnpm --filter api test --run` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter web test --run`
- **After every plan wave:** Run `pnpm --filter web test --run && pnpm --filter api test --run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 4-01-02 | 01 | 1 | GRAM-01 | T-04-02 | N/A | schema/build | `pnpm --filter @repo/shared build` | ✅ created W0 | ⬜ pending |
| 4-01-03 | 01 | 1 | GRAM-05 | T-04-01 | N/A | seed/data | `node -e` JSON+DB count check | ✅ created W0 | ⬜ pending |
| 4-02-01 | 02 | 2 | GRAM-01, GRAM-02, GRAM-04, GRAM-06 | T-04-13 | userId from JWT; Zod parse on session body | unit (service) | `pnpm --filter @repo/api test -- grammar.service.spec` | ✅ scaffolded 04-01 | ⬜ pending |
| 4-03-01 | 03 | 2 | GRAM-03 | — | N/A | component | `pnpm --filter @repo/web test -- grammar` | ✅ scaffolded 04-01 | ⬜ pending |
| 4-04-01 | 04 | 3 | GRAM-01, GRAM-06 | T-04-10 | auth() gate before relay proxy | component/build | `pnpm --filter @repo/web build` | ❌ built in plan | ⬜ pending |
| 4-05-01 | 05 | 4 | GRAM-02, GRAM-03, GRAM-04, GRAM-06 | T-04-13 | relay forwards body without userId | integration/build + e2e checkpoint | `pnpm --filter @repo/web build` + human-verify | ❌ built in plan | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

*Plans 04-01 through 04-05 are the five plans for this phase. Plan 04-01 (Wave 1) creates the schema migration, DTOs, seed data, and the RED test scaffolds (`grammar.service.spec.ts` + 3 exercise component tests). Plans 04-02 (NestJS service/controller) and 04-03 (exercise components) turn those scaffolds GREEN. Plans 04-04 and 04-05 are frontend page slices verified by `pnpm --filter @repo/web build` plus the end-to-end human checkpoint in plan 04-05 Task 3.*

---

## Wave 0 Requirements

- [x] Schema migration: add `GrammarArea.slug` and `GrammarLesson.slug` fields (plan 04-01 Task 2)
- [x] `apps/api/src/grammar/grammar.service.spec.ts` — RED unit-test scaffold for GRAM-01, GRAM-02, GRAM-04, GRAM-06 (plan 04-01 Task 3)
- [x] `apps/web/src/components/grammar/exercises/multiple-choice-exercise.test.tsx` — RED component scaffold for GRAM-03 (plan 04-01 Task 3)
- [x] `apps/web/src/components/grammar/exercises/fill-in-the-blank-exercise.test.tsx` — RED component scaffold for GRAM-03 (plan 04-01 Task 3)
- [x] `apps/web/src/components/grammar/exercises/drag-and-drop-exercise.test.tsx` — RED component scaffold for GRAM-03 (plan 04-01 Task 3)
- [x] `pnpm add @dnd-kit/core @dnd-kit/sortable` in `apps/web` (verified on npm registry — plan 04-01 Task 1 checkpoint)

*All Wave 0 requirements are covered by plan 04-01 (Wave 1, the foundation wave). The schema migration blocks all subsequent slug-based routing; the RED test scaffolds are turned GREEN by plans 04-02 (service) and 04-03 (components). No test file listed here lacks a creating task.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| DragAndDrop exercise on mobile touch | GRAM-03 | dnd-kit touch events hard to automate in Vitest | Load `/grammar/[area]/[topic]/[lesson]` on mobile device/emulator; drag word token to blank |
| Mastery bar visual update after session | GRAM-04 | Visual regression not automated | Complete a lesson, return to topic page, verify masteryPct bar reflects new ratio |
| Weak exercise filter accuracy | GRAM-06 | Requires prior incorrect attempts state | Answer questions incorrectly, navigate to weak exercises, confirm only wrong questions appear |

*These three behaviors are validated by the end-to-end human-verify checkpoint in plan 04-05 Task 3.*

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (every scaffold listed has a creating task in plan 04-01)
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** ready
