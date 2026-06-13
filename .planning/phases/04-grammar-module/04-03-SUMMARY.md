---
phase: 04-grammar-module
plan: "03"
subsystem: web/grammar-exercises
tags: [tdd, components, dnd-kit, exercise, grammar]
dependency_graph:
  requires: ["04-01"]
  provides: ["MultipleChoiceExercise", "FillInTheBlankExercise", "DragAndDropExercise", "SentenceTransformationExercise", "ErrorCorrectionExercise", "ExplanationView"]
  affects: ["04-05-grammar-lesson-page"]
tech_stack:
  added: ["@dnd-kit/core (already installed — plan 01)"]
  patterns: ["dnd-kit DndContext+useDraggable+useDroppable", "React controlled form with case-insensitive validation", "immediate-callback exercise pattern"]
key_files:
  created:
    - apps/web/src/components/grammar/multiple-choice-exercise.tsx
    - apps/web/src/components/grammar/fill-in-the-blank-exercise.tsx
    - apps/web/src/components/grammar/drag-and-drop-exercise.tsx
    - apps/web/src/components/grammar/explanation-view.tsx
    - apps/web/src/components/grammar/exercises/sentence-transformation-exercise.tsx
    - apps/web/src/components/grammar/exercises/error-correction-exercise.tsx
  modified: []
decisions:
  - "Exercise components placed at grammar/ (not grammar/exercises/) to match test import paths (../multiple-choice-exercise from exercises/ test folder)"
  - "MultipleChoiceExercise calls onCorrect/onIncorrect immediately on option click (no Next button) — driven by test assertions expecting immediate callback"
  - "DragAndDropExercise uses | separator for multi-blank answers (has written|has not submitted)"
  - "GrammarQuestion interface defined inline per component (no shared import) — avoids @repo/shared coupling for pure client components"
metrics:
  completed: "2026-06-13"
  tasks: 1
  files: 6
---

# Phase 04 Plan 03: Grammar Exercise Components — Summary

All 5 grammar exercise components plus ExplanationView implemented to turn 3 RED component tests GREEN.

## What Was Built

### MultipleChoiceExercise (`apps/web/src/components/grammar/multiple-choice-exercise.tsx`)

- Accepts `{ question, onCorrect, onIncorrect }` prop shape matching test contract
- Renders prompt text and 2×2 option grid (answer + distractors)
- Calls `onCorrect()` or `onIncorrect()` immediately on option click (no "Next" button — driven by test assertions)
- Options become disabled after selection
- Shows "Correct answer: {answer}" text when wrong (accessibility: color + text)
- `"use client"` directive, uses `cn()` from `@/lib/utils`

### FillInTheBlankExercise (`apps/web/src/components/grammar/fill-in-the-blank-exercise.tsx`)

- Accepts `{ question, onCorrect, onIncorrect }` prop shape
- Renders prompt text + `<form>` with `<input type="text">` and "Check" `<Button type="submit">`
- Validates: `input.trim().toLowerCase() === answer.toLowerCase()` — case-insensitive, trimmed
- `fireEvent.submit(input.closest("form")!)` test pattern requires `<form>` wrapper
- Shows "Correct!" or "The correct answer is: {answer}" feedback text
- `"use client"` directive

### DragAndDropExercise (`apps/web/src/components/grammar/drag-and-drop-exercise.tsx`)

- Uses `@dnd-kit/core` only: `DndContext`, `PointerSensor`, `useSensor`, `useSensors`, `DragOverlay`, `useDraggable`, `useDroppable`
- NO import from `@dnd-kit/sortable`
- Parses prompt `___` markers via `parsePrompt()` — supports 1 or 2+ blanks
- Multi-blank answer format: `"has written|has not submitted"` (pipe separator)
- `DroppableBlank` components use `data-testid="blank-slot-blank-{N}"` — regex `/blank-slot/` matches in tests
- `DraggableWord` components use `data-testid="word-chip-word-{N}-{word}"` — regex `/word-chip/` matches in tests
- Word bank shows all answer parts + distractors; placed words hidden from bank
- PointerSensor activation constraint: `{ distance: 5 }` (prevents accidental drag on mobile tap)
- "Check" button disabled until all blanks filled
- `"use client"` directive

### SentenceTransformationExercise (`apps/web/src/components/grammar/exercises/sentence-transformation-exercise.tsx`)

- Renders prompt in a muted block + textarea for free-text answer
- Case-insensitive comparison against answer
- Shows "Model answer: {answer}" on wrong
- `"use client"` directive

### ErrorCorrectionExercise (`apps/web/src/components/grammar/exercises/error-correction-exercise.tsx`)

- Renders erroneous sentence in a card + textarea for correction
- Case-insensitive comparison
- Shows "Corrected: {answer}" on wrong
- `"use client"` directive

### ExplanationView (`apps/web/src/components/grammar/explanation-view.tsx`)

- Renders explanation text in `bg-zinc-100 dark:bg-zinc-800` rule card
- Renders `examples` as italic bullet list with `•` prefix
- `"use client"` directive

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Deviation] Exercise files placed at grammar/ not grammar/exercises/**

- **Found during:** Implementation
- **Issue:** Plan's `files_modified` listed `grammar/exercises/multiple-choice-exercise.tsx` but test files import from `"../multiple-choice-exercise"` (one level up from `exercises/`). Following test import paths is the correct behavior.
- **Fix:** Created `multiple-choice-exercise.tsx`, `fill-in-the-blank-exercise.tsx`, `drag-and-drop-exercise.tsx` at `apps/web/src/components/grammar/` (not in `exercises/` subfolder). `sentence-transformation-exercise.tsx` and `error-correction-exercise.tsx` placed in `exercises/` as they have no test files constraining their location and the plan specifies them there.
- **Files modified:** Component placement decision

**2. [Rule 1 - Deviation] MultipleChoiceExercise uses immediate callback pattern**

- **Found during:** Reading test assertions
- **Issue:** PATTERNS.md shows a "Next" button before calling `onCorrect/onIncorrect`, but tests assert `onCorrect` is called immediately after `fireEvent.click(option)`. Tests are the authoritative spec.
- **Fix:** Component calls `onCorrect()` / `onIncorrect()` directly in `handleSelect()`, no intermediate "Next" button for test-facing behavior.

## Known Stubs

None. All components wire real logic (validation, callbacks, drag state).

## Threat Flags

No new threat surface beyond what plan 04-03 threat model covers. All prompt/explanation strings rendered as React text children (no `dangerouslySetInnerHTML`). React auto-escapes all seed-sourced content.

## Self-Check

Files created — verified by Read tool confirmation after Write:

- [x] `apps/web/src/components/grammar/multiple-choice-exercise.tsx` — contains `"use client"`, `onCorrect`, `onIncorrect`
- [x] `apps/web/src/components/grammar/fill-in-the-blank-exercise.tsx` — contains `"use client"`, `.trim().toLowerCase()`
- [x] `apps/web/src/components/grammar/drag-and-drop-exercise.tsx` — contains `"use client"`, imports `useDraggable`, `useDroppable` from `@dnd-kit/core`, no `@dnd-kit/sortable`
- [x] `apps/web/src/components/grammar/explanation-view.tsx` — contains `"use client"`, `bg-zinc-100`, `dark:bg-zinc-800`, `examples`
- [x] `apps/web/src/components/grammar/exercises/sentence-transformation-exercise.tsx` — contains `"use client"`
- [x] `apps/web/src/components/grammar/exercises/error-correction-exercise.tsx` — contains `"use client"`

**Note:** Test run (`pnpm --filter @repo/web test -- grammar`) and build (`pnpm --filter @repo/web build`) could not be executed — Bash tool permission was not available during this execution. Manual verification or re-run with Bash access required to confirm GREEN status.

## Self-Check: REQUIRES_MANUAL_VERIFICATION

Bash unavailable — cannot run `git log`, `pnpm test`, or `pnpm build`. Files were created successfully via Write tool. Test GREEN status needs shell verification.
