---
phase: 06-listening-comprehension
plan: "06"
subsystem: listening-ui
tags: [listening, exercises, fill-missing-words, dictation, session, score-card, audio, transcript]
dependency_graph:
  requires:
    - "06-03"  # AudioPlayer, TranscriptPanel, useAudioPlayer
    - "06-04"  # ListeningItemClient stub + page.tsx
  provides:
    - FillMissingWordsExercise
    - DictationExercise
    - ListeningSession
    - ListeningScoreCard
    - ListeningItemClient (full implementation)
  affects:
    - apps/web/src/app/(dashboard)/listening/[itemId]/page.tsx  # consumes ListeningItemClient
tech_stack:
  added: []
  patterns:
    - framer-motion entrance animation (opacity/scale/y)
    - Wagner-Fischer edit distance (native, no external dep)
    - transcriptLocked atomic unlock on session submit (D-15)
    - listen-first gate via hasListenedEnough (D-13)
key_files:
  created:
    - apps/web/src/components/listening/exercises/fill-missing-words.tsx
    - apps/web/src/components/listening/exercises/dictation-exercise.tsx
    - apps/web/src/components/listening/listening-session.tsx
    - apps/web/src/components/listening/listening-score-card.tsx
  modified:
    - apps/web/src/components/listening/listening-item-client.tsx  # replaced Plan 04 stub
decisions:
  - "[06-06] Native editDistance (Wagner-Fischer 20-line DP) implemented in dictation-exercise.tsx to avoid client-side dependency on fastest-levenshtein (server-only package in apps/api)"
  - "[06-06] WordPopover tap-to-SRS integration uses toast placeholder — WordPopover from Phase 5 reading module was not available in this worktree branch"
  - "[06-06] onSubmitComplete callback pattern for D-15 atomic unlock — parent (ListeningItemClient) owns transcriptLocked state, child (ListeningSession) calls callback on successful POST only"
metrics:
  duration: "~15 minutes"
  completed: "2026-06-16"
  tasks: 2
  files: 5
---

# Phase 06 Plan 06: Full Listening Interactive Experience Summary

Full interactive listening item experience: FillMissingWordsExercise + DictationExercise with native edit distance + ListeningSession with listen-first gate (D-13) + atomic transcript unlock on submit (D-15) + inline ListeningScoreCard (D-16) + full ListeningItemClient replacing Plan 04 stub.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | FillMissingWords and Dictation exercise components | 540d831 | exercises/fill-missing-words.tsx, exercises/dictation-exercise.tsx |
| 2 | ListeningSession + ListeningScoreCard + ListeningItemClient (full) | cc8f98b | listening-session.tsx, listening-score-card.tsx, listening-item-client.tsx |

## What Was Built

### Task 1: Exercise Components

**FillMissingWordsExercise** (`apps/web/src/components/listening/exercises/fill-missing-words.tsx`):
- Renders `question.prompt` by splitting on literal `___` string — React text nodes, no `dangerouslySetInnerHTML` (T-06-14)
- Inline blank pill before answer is selected; answer word shown in emerald/red pill after selection
- 3 option pills shuffled once on mount via `useMemo` with empty dep array
- Correct/incorrect/revealed-correct Tailwind class variants applied via `cn()`
- Explanation row rendered conditionally after answer

**DictationExercise** (`apps/web/src/components/listening/exercises/dictation-exercise.tsx`):
- Mini clip player: Play/Pause button + "Audio clip · 10s" label, calls `onPlayClip(question.timestampSec ?? 0)`
- Native `editDistance(a, b)` function: 20-line Wagner-Fischer DP (no `fastest-levenshtein` import)
- `normalizeDictation(text)`: lowercase, strip `[.,!?;:"'-]`, collapse whitespace, trim
- Scoring: `editDistance(normalize(userAnswer), normalize(answer)) <= 2 → isCorrect`
- Correct: Textarea border-emerald-400 bg-emerald-50 + CheckCircle icon + "Correct!"
- Incorrect: Textarea border-red-400 bg-red-50 + XCircle icon + `Correct: "{answer}"` (text node, T-06-15)

### Task 2: Session Orchestrator + Score Card + Full Client

**ListeningSession** (`apps/web/src/components/listening/listening-session.tsx`):
- D-13: "Start Exercises" button `disabled={!hasListenedEnough}` with guidance text below
- `framer-motion opacity:0→1, y:8→0, duration:0.2s easeOut` on exercises section activation
- Exercise header: "Exercises" + "{n} of {total} answered" counter
- Dispatches `MULTIPLE_CHOICE` → `MultipleChoiceExercise` (Phase 4 reuse)
- Dispatches `FILL_MISSING_WORDS` → `FillMissingWordsExercise`
- Dispatches `DICTATION` → `DictationExercise` with `onPlayClip={(sec) => seek(sec)}`
- POST to `/api/listening/sessions/complete` with `{ contentId, score, accuracy, attempts }`
- D-15: `onSubmitComplete()` called only on successful HTTP 200 response
- Loader2 spinner during submission, toast error on failure

**ListeningScoreCard** (`apps/web/src/components/listening/listening-score-card.tsx`):
- `motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3, ease: 'easeOut' }}`
- Score headline: `{score}/{total} correct` at text-[28px]
- Sub-line: `{pct}% accuracy · {xpEarned} XP earned`
- Exercise breakdown `<dl>`: 3 rows — Multiple Choice, Fill in the Blank, Dictation
- Transcript reminder (conditional on `hasWordTimestamps`)
- "Try another item" + "Browse all listening" buttons via `router.push('/listening')`

**ListeningItemClient** (`apps/web/src/components/listening/listening-item-client.tsx`):
- Replaces Plan 04 stub with full orchestration
- `useAudioPlayer(item.audioUrl)` provides audioRef, state.hasListenedEnough, seek, etc.
- `transcriptLocked` state starts `true`; D-15: `onSubmitComplete={() => setTranscriptLocked(false)}`
- Renders: AudioPlayer (sticky top bar) → TranscriptPanel (blurred until unlock) → ListeningSession
- `handleWordClick`: toast placeholder for Phase 5 WordPopover tap-to-SRS (LIST-06)

## Verification Results

1. `transcriptLocked` in listening-item-client.tsx: 4 occurrences (state decl + prop + callback + comment) ✓
2. `disabled={!hasListenedEnough}` in listening-session.tsx ✓
3. `initial={{ opacity: 0, scale: 0.95 }}` in listening-score-card.tsx ✓
4. `editDistance` in dictation-exercise.tsx: 3 occurrences (function def + definition comment + call) ✓
5. No actual `dangerouslySetInnerHTML` usage — only in comments ✓
6. MULTIPLE_CHOICE, FILL_MISSING_WORDS, DICTATION all dispatched in listening-session.tsx ✓
7. TypeScript: no errors in new files (pre-existing errors in unrelated .next/types/ and auth-actions.test.ts are out of scope) ✓

## Deviations from Plan

### Auto-handled During Execution

**1. [Plan-anticipated fallback — WordPopover unavailable]**
- **Found during:** Task 2, ListeningItemClient implementation
- **Issue:** Phase 5 reading module WordPopover component does not exist at `@/components/reading/word-popover`
- **Fix:** Per plan instruction: "if WordPopover does not exist yet, use a toast notification as a placeholder" — implemented toast feedback for word click (LIST-06)
- **Files modified:** listening-item-client.tsx
- **Status:** Intentional per plan; future plan will wire actual WordPopover

**2. [page.tsx — no changes needed]**
- Plan says to update page.tsx to import new ListeningItemClient. The existing page.tsx already correctly imports from `@/components/listening/listening-item-client` and passes `item` prop — no changes needed. The full implementation replaced the stub in-place at the same path.

## Known Stubs

| Stub | File | Reason |
|------|------|--------|
| `handleWordClick` uses toast instead of WordPopover | listening-item-client.tsx:56-61 | Phase 5 reading module WordPopover not yet available; plan explicitly allows toast fallback |
| `estimateDuration` always returns 10s | dictation-exercise.tsx | Default clip length estimate; future plan could compute from `wordTimestamps` boundaries |

Neither stub prevents the plan's goal from being achieved — both are intentional placeholders documented in the plan.

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes introduced. All new surface is client-side React components only. T-06-14 (XSS via prompt rendering — no dangerouslySetInnerHTML) and T-06-15 (XSS via answer reveal — text nodes only) mitigations applied as required by plan threat model.

## Self-Check: PASSED
