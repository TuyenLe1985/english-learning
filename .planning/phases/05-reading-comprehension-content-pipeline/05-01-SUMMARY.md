---
phase: 05-reading-comprehension-content-pipeline
plan: "01"
subsystem: reading-pipeline
tags:
  - tdd-red
  - shared-dtos
  - packages
  - reading
  - pipeline
dependency_graph:
  requires:
    - "04-06-SUMMARY.md (GrammarService patterns referenced)"
  provides:
    - "packages/shared/src/reading.dto.ts — all Phase 5 shared DTOs"
    - "apps/api/src/reading/reading.service.spec.ts — TDD RED gate for ReadingService"
    - "apps/api/src/pipeline/classifier.service.spec.ts — TDD RED gate for ClassifierService"
    - "vocabulary.service.spec.ts lookupByWord block — TDD RED gate for VOCAB-08"
  affects:
    - "All downstream Phase 5 plans (05-02 through 05-09)"
    - "apps/api — natural, cheerio, isomorphic-dompurify, dom-anchor-text-position available"
    - "apps/web — isomorphic-dompurify, dom-anchor-text-position, 6 new shadcn components available"
tech_stack:
  added:
    - "natural@^8.x (NLP tokenization for CEFR classifier)"
    - "cheerio@^1.x (HTML parsing for content crawler)"
    - "isomorphic-dompurify@^3.17.x (HTML sanitization, use-client only)"
    - "dom-anchor-text-position@^5.0.0 (highlight offset tracking)"
    - "@types/natural (devDep for natural package)"
  patterns:
    - "Zod schema-first DTOs with inferred TypeScript types (reading.dto.ts)"
    - "TDD RED via direct instantiation with mocked PrismaService"
    - "Pure-function classifier service (no DB dependency)"
key_files:
  created:
    - packages/shared/src/reading.dto.ts
    - apps/api/src/reading/reading.service.spec.ts
    - apps/api/src/pipeline/classifier.service.spec.ts
    - apps/web/src/components/ui/popover.tsx
    - apps/web/src/components/ui/sheet.tsx
    - apps/web/src/components/ui/separator.tsx
    - apps/web/src/components/ui/select.tsx
    - apps/web/src/components/ui/textarea.tsx
    - apps/web/src/components/ui/tooltip.tsx
  modified:
    - packages/shared/src/index.ts
    - apps/api/package.json
    - apps/web/package.json
    - apps/api/src/vocabulary/vocabulary.service.spec.ts
    - pnpm-lock.yaml
decisions:
  - "[05-01-D1] dom-anchor-text-position used over @hypothesis/anchoring (404 confirmed per RESEARCH.md Pitfall 2)"
  - "[05-01-D2] ClassifierService spec uses direct instantiation (no PrismaService — pure function service)"
  - "[05-01-D3] lookupByWord tests append to existing vocabulary.service.spec.ts block (not a new file)"
  - "[05-01-D4] Web type-check pre-existing failure (auth-actions.test.ts checkResendRateLimit) not in scope"
metrics:
  duration: "5 minutes"
  completed_date: "2026-06-14"
  tasks_completed: 3
  files_created: 9
  files_modified: 5
---

# Phase 05 Plan 01: Wave 0 Foundation — Package Installs, Shared DTOs, TDD RED Scaffolds Summary

**One-liner:** Wave 0 foundation — 5 API packages + 2 web packages installed, 8 Zod reading DTOs defined in shared package, TDD RED scaffolds for ReadingService (12 tests), ClassifierService (6 tests), and VocabularyService.lookupByWord (2 tests) confirming services not yet implemented.

## What Was Built

### Task 1: Package Installs + shadcn Components
Installed 5 new API packages (`natural`, `cheerio`, `isomorphic-dompurify`, `dom-anchor-text-position`, `@types/natural`) and 2 new web packages (`isomorphic-dompurify`, `dom-anchor-text-position`). Added 6 shadcn UI components to `apps/web/src/components/ui/`: popover, sheet, separator, select, textarea, tooltip. All packages sourced from npm with [ASSUMED] legitimacy audit from RESEARCH.md.

### Task 2: Shared Reading DTOs
Created `packages/shared/src/reading.dto.ts` with 8 Zod schemas and 8 inferred TypeScript types following the exact `grammar.dto.ts` pattern. Schemas cover browse card, detail, questions, highlights, session completion, highlight creation, note upsert, and bookmark toggle. Added `export * from "./reading.dto"` to `packages/shared/src/index.ts`. Package builds cleanly.

### Task 3: TDD RED Scaffolds
Created `reading.service.spec.ts` with 12 test cases covering all 7 ReadingService methods (getPassages, getPassageById, completeSession, createHighlight, deleteHighlight, upsertNote, toggleBookmark) with IDOR protection tests. Created `classifier.service.spec.ts` with 6 test cases covering PIPE-03 (CEFR level classification) and PIPE-04 (flaggedForReview when confidence < 0.65). Appended lookupByWord describe block to `vocabulary.service.spec.ts` with 2 tests. All new tests fail confirming RED state.

## Commits

| Task | Commit | Message |
|------|--------|---------|
| Task 1 | `24efb96` | chore(05-01): install reading pipeline packages and shadcn components |
| Task 2 | `9257ffc` | feat(05-01): add shared reading DTOs and update barrel export |
| Task 3 | `1828f1f` | test(05-01): add TDD RED scaffolds for ReadingService, ClassifierService, lookupByWord |

## Verification Results

1. `pnpm --filter @repo/api test` exits non-zero — 5 failed test files (RED state confirmed)
2. `pnpm --filter @repo/shared build` exits 0 — reading.dto.ts compiles cleanly
3. All 6 shadcn components present in `apps/web/src/components/ui/`
4. `grep "reading\.dto" packages/shared/src/index.ts` returns 1 match

## Deviations from Plan

### Out-of-Scope Pre-existing Issue Found
**Pre-existing failure in `apps/web` type-check:** `auth-actions.test.ts` references `checkResendRateLimit` which doesn't exist in `auth-actions.ts`. This failure existed before any Phase 5 changes and is unrelated to the current plan. Deferred per deviation rules (only auto-fix issues directly caused by the current task's changes). Logged to scope boundary.

No other deviations. All three tasks executed exactly as specified.

## Known Stubs

None. This plan creates test scaffolds and shared DTOs only — no UI rendering components. No stubs to track.

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes introduced. All files are test scaffolds, shared type definitions, or UI component files (shadcn). No threat flags.

## Self-Check: PASSED

All committed files verified:
- `packages/shared/src/reading.dto.ts` — exists, builds cleanly
- `packages/shared/src/index.ts` — exports reading.dto
- `apps/api/src/reading/reading.service.spec.ts` — exists, fails as RED
- `apps/api/src/pipeline/classifier.service.spec.ts` — exists, fails as RED
- `apps/api/src/vocabulary/vocabulary.service.spec.ts` — lookupByWord block appended, fails as RED
- `apps/web/src/components/ui/{popover,sheet,separator,select,textarea,tooltip}.tsx` — all 6 exist
- Commits 24efb96, 9257ffc, 1828f1f — all in git log
