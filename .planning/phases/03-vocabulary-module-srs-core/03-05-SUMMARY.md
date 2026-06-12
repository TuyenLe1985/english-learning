---
phase: 03-vocabulary-module-srs-core
plan: "05"
subsystem: vocabulary-practice
status: complete
completed: 2026-06-12
requirements: [VOCAB-03, VOCAB-04]
tags: [exercise-components, framer-motion, practice-session, srs-enrollment, tdd]

dependency_graph:
  requires:
    - "03-02: VocabularyModule + SrsModule NestJS endpoints"
    - "03-03: SrsModule + ts-fsrs enrollment relay"
    - "03-04: vocabulary browse pages + enroll relay"
  provides:
    - "Mixed 10-word practice session with 6 exercise types (VOCAB-03)"
    - "Add-to-SRS from session results screen (VOCAB-04)"
    - "Session batch submission relay (/api/vocabulary/session/complete)"
  affects:
    - "Future Phase 7 gamification: session/complete relay already in place for XP events"

tech_stack:
  added:
    - "exercise-assignment.ts: pure Fisher-Yates shuffle + D-05 matching cap logic"
  patterns:
    - "Framer Motion rotateY flip with preserve-3d + backface-visibility inline styles"
    - "Framer Motion AnimatePresence for matching pair dismiss (opacity/scale)"
    - "Framer Motion shake animation x:[0,-6,6,-6,0] for incorrect matching"
    - "All session state in React (no mid-session API calls) — batch POST at end"
    - "Dialog enroll pattern: POST /api/vocabulary/enroll per selected word"

key_files:
  created:
    - apps/web/src/components/vocabulary/exercises/flashcard-exercise.tsx
    - apps/web/src/components/vocabulary/exercises/flashcard-exercise.test.tsx
    - apps/web/src/components/vocabulary/exercises/matching-exercise.tsx
    - apps/web/src/components/vocabulary/exercises/cloze-exercise.tsx
    - apps/web/src/components/vocabulary/exercises/context-selection-exercise.tsx
    - apps/web/src/components/vocabulary/exercises/synonym-exercise.tsx
    - apps/web/src/components/vocabulary/exercises/recall-exercise.tsx
    - apps/web/src/app/api/vocabulary/session/complete/route.ts
    - apps/web/src/components/vocabulary/practice-session.tsx
    - apps/web/src/components/vocabulary/session-results.tsx
    - apps/web/src/app/(dashboard)/vocabulary/[category]/practice/page.tsx
    - apps/web/src/lib/exercise-assignment.ts
  modified: []

decisions:
  - "exercise-assignment.ts is a pure helper (no side effects) so it is deterministic under any seeded RNG — enables testability"
  - "PracticeSession uses refs for session words/assignments to avoid re-sampling on React re-renders"
  - "session/complete relay is non-blocking: submit errors show a toast but results screen still renders"
  - "MatchingExercise tracks correctIds in a Set via onPairResult callback before onComplete fires"

metrics:
  duration: "~20m"
  completed: 2026-06-12
  tasks: 2
  files_created: 12
---

# Phase 03 Plan 05 Summary — Mixed-Type Practice Session (Vertical Slice)

## What Was Built

Mixed-type practice session end-to-end: six exercise components + session orchestrator + results screen + Add-to-SRS dialog + session relay.

### One-liner
Six interactive exercise types (flashcard flip, 4-item matching grid, cloze, context-selection, synonym, recall) wired into a 10-word session orchestrator with batch submission and SRS enrollment from the results screen.

### Exercise Components

| Component | Exercise Type | Key Feature |
|-----------|--------------|-------------|
| `FlashcardExercise` | Flashcard | Framer Motion rotateY 0→180, preserve-3d, aria-pressed |
| `MatchingExercise` | Matching | 4-item tap grid, correct dismiss (opacity/scale), incorrect shake |
| `ClozeExercise` | Fill-in-blank | Sentence with blank, 4 options, green/red feedback |
| `ContextSelectionExercise` | Context selection | Word + 4 sentences, pick correct usage |
| `SynonymExercise` | Synonym ID | Word + 4 options, pick correct synonym |
| `RecallExercise` | Self-rated recall | Definition shown, self-rate correct/incorrect |

### Session Infrastructure

- `practice-session.tsx`: samples 10 words, assigns exercise types (≤2 matching per D-08), Progress bar, batch POST at end
- `session-results.tsx`: score/time/wrong-words + shadcn Dialog for Add-to-SRS with per-word checkboxes
- `exercise-assignment.ts`: pure Fisher-Yates helper, D-05 matching cap logic
- `session/complete relay`: auth() 401 gate, proxies to NestJS `/api/vocabulary/session/complete`
- `practice/page.tsx`: server component with auth guard, fetches words, passes to PracticeSession

### TDD Coverage

`flashcard-exercise.test.tsx` (9 tests, all passing):
- Renders word on front face
- aria-pressed starts false
- Click toggles aria-pressed to true
- Definition always in DOM (back face)
- Action buttons appear after flip
- onCorrect fires on "Got it!" click
- onIncorrect fires on "Didn't know it" click
- Enter key flips card
- Space key flips card

## Deviations from Plan

None — plan executed exactly as written.

## Security

- T-03-13 (mitigate): session/complete relay calls `auth()` before proxying → 401 for unauthenticated requests ✓
- T-03-14 (accept): client-reported session score is non-authoritative; NestJS receives it but no XP/gamification yet ✓
- T-03-15 (mitigate): relay proxies body to NestJS which validates via `SessionCompleteSchema` (Zod) ✓

## Known Stubs

None — all components use real data, real callbacks, and real API calls.

## Self-Check

- [x] All 12 files created successfully
- [x] flashcard-exercise.test.tsx: 9/9 tests pass
- [x] `rotateY` in flashcard-exercise.tsx
- [x] `aria-selected` in matching-exercise.tsx
- [x] session/complete relay file exists
- [x] practice page exists
- [x] `session/complete` in practice-session.tsx
- [x] `vocabulary/enroll` in session-results.tsx
- [x] No errors in new files (only pre-existing errors in pagination.tsx, auth-actions.ts)
- [x] Commits: 1f5dfd8 (Task 1), 84c877b (Task 2)

## Self-Check: PASSED
