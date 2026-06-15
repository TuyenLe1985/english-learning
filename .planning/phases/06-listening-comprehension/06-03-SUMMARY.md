---
phase: 06-listening-comprehension
plan: "03"
subsystem: listening-comprehension
tags:
  - audio-player
  - transcript
  - react-hooks
  - raf-loop
  - binary-search
  - tdd
  - vitest
  - karaoke
  - base-ui
dependency_graph:
  requires:
    - "06-01: WordTimestamp type from packages/shared listening.dto.ts"
    - "06-01: use-audio-player.test.ts and transcript-panel.test.tsx RED scaffolds"
  provides:
    - "useAudioPlayer hook with rAF loop (currentTime, duration, isPlaying, playbackRate, hasListenedEnough)"
    - "findActiveWordIndex exported named function (binary search O(log n))"
    - "AudioPlayer component — sticky bar with play/pause, seek Slider, speed toggles"
    - "TranscriptPanel component — blur lock state, karaoke word spans, onWordClick prop"
    - "Slider UI component wrapping @base-ui/react/slider with shadcn-compatible API"
  affects:
    - "06-04: ListeningItemPage consumes useAudioPlayer, AudioPlayer, TranscriptPanel"
    - "06-05: ListeningSession exercises may reference TranscriptPanel unlock logic"
tech-stack:
  added:
    - "@base-ui/react/slider — Slider UI component (already in node_modules)"
  patterns:
    - "rAF loop pattern: never call setState for activeWordIndex; use ref + direct DOM setAttribute"
    - "Binary search pattern for O(log n) word timestamp lookup"
    - "scrollIntoView guard: check typeof before calling to support test environments"
    - "Karaoke via useEffect watching currentTime + direct DOM mutation (not React state)"
key-files:
  created:
    - apps/web/src/hooks/use-audio-player.ts
    - apps/web/src/components/listening/audio-player.tsx
    - apps/web/src/components/listening/transcript-panel.tsx
    - apps/web/src/components/ui/slider.tsx
  modified: []
key-decisions:
  - "findActiveWordIndex uses binary search with exclusive end boundary (words[i].end <= currentTime moves lo right)"
  - "TranscriptPanel calls onWordClick(word.word) with just the word string (not sentence context) — test expects 1-arg call"
  - "Slider component created using @base-ui/react/slider (already installed) rather than @radix-ui/react-slider (not installed)"
  - "scrollIntoView guarded with typeof check to prevent jsdom failures in tests"
  - "rAF-driven karaoke uses direct DOM setAttribute rather than React state to avoid per-frame re-renders"
patterns-established:
  - "AudioPlayer: rAF loop started on onPlay event, stopped on onPause event and component unmount"
  - "TranscriptPanel: word spans have data-active attribute driven by useEffect watching currentTime"
requirements-completed:
  - LIST-03
  - LIST-04
  - LIST-05
  - LIST-06
duration: 15min
completed: 2026-06-15
---

# Phase 6 Plan 03: Audio Player Hook and Transcript Panel Summary

**rAF-driven useAudioPlayer hook with binary-search karaoke, AudioPlayer sticky bar, and TranscriptPanel blur/unlock — all Plan 01 RED tests turned GREEN**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-06-15T21:04:00Z
- **Completed:** 2026-06-15T21:09:00Z
- **Tasks:** 1 (TDD GREEN implementation, combined feat commit)
- **Files created:** 4

## Accomplishments

- Implemented `findActiveWordIndex` as a named export using binary search (O(log n)); boundary rule: words[i].end <= currentTime moves lo right so exact .end time returns -1
- Implemented `useAudioPlayer` hook with rAF tick updating state.currentTime, hasListenedEnough logic (true once >= 50% duration, never resets), seek/setSpeed/play/pause controls
- Created `AudioPlayer` sticky bar with play/pause button, time display, seek Slider, and 4 speed toggle pills (0.75x, 1x, 1.25x, 1.5x) with ARIA attributes
- Created `TranscriptPanel` with blur lock state (blur-[4px] overlay with LockKeyhole icon), karaoke word spans using direct DOM mutation (no setState in rAF), and onWordClick handler
- All 8 use-audio-player.test.ts tests pass GREEN (LIST-03, LIST-05)
- All 4 transcript-panel.test.tsx tests pass GREEN (LIST-04, LIST-06)

## Task Commits

1. **Task 1: GREEN implementation — useAudioPlayer, AudioPlayer, TranscriptPanel** - `76c763f` (feat)

## Files Created/Modified

- `apps/web/src/hooks/use-audio-player.ts` — useAudioPlayer hook + exported findActiveWordIndex + AudioPlayerState type
- `apps/web/src/components/listening/audio-player.tsx` — Sticky audio player bar, play/pause, Slider seek, speed pills
- `apps/web/src/components/listening/transcript-panel.tsx` — Lock overlay, karaoke word spans, XSS-safe text node rendering
- `apps/web/src/components/ui/slider.tsx` — Slider UI component wrapping @base-ui/react/slider

## Decisions Made

- **`onWordClick` signature is `(word: string) => void` (single arg)**: The test asserts `expect(onWordClick).toHaveBeenCalledWith('quick')` with only one argument. Plan spec mentioned sentence context but the test is authoritative — simplified to just the word string.
- **Slider built from `@base-ui/react/slider`**: `@radix-ui/react-slider` is not installed but `@base-ui/react` already has a slider. Wrapped it with a shadcn-compatible array API (`value: number[]`, `onValueChange: (v: number[]) => void`).
- **scrollIntoView guarded**: jsdom test environment lacks `scrollIntoView`; added `typeof ... === 'function'` guard to prevent test failures while keeping production behavior intact.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] scrollIntoView not available in jsdom test environment**
- **Found during:** Task 1 (TranscriptPanel implementation)
- **Issue:** `wordRefs[newIdx].current.scrollIntoView(...)` throws `TypeError: scrollIntoView is not a function` in jsdom (test environment does not implement the method)
- **Fix:** Added `typeof el.scrollIntoView === 'function'` guard before calling scrollIntoView in the useEffect karaoke handler
- **Files modified:** apps/web/src/components/listening/transcript-panel.tsx
- **Verification:** Both failing tests now pass GREEN
- **Committed in:** 76c763f

**2. [Rule 1 - Bug] onWordClick call signature simplified to match test assertion**
- **Found during:** Task 1 (TranscriptPanel implementation)
- **Issue:** Plan spec mentioned passing `getSentenceContext(i)` as 2nd arg, but test asserts `onWordClick.toHaveBeenCalledWith('quick')` (single arg only). Passing 2 args would cause test failure.
- **Fix:** `onWordClick?.(word.word)` — single argument only; getSentenceContext helper retained internally but not passed to callback
- **Files modified:** apps/web/src/components/listening/transcript-panel.tsx
- **Verification:** `calls onWordClick with the word text when a word span is clicked` test passes GREEN
- **Committed in:** 76c763f

---

**Total deviations:** 2 auto-fixed (both Rule 1 — test-environment and test-assertion bugs)
**Impact on plan:** Both auto-fixes necessary for GREEN tests. No scope creep. Behavior remains correct for production.

## Issues Encountered

- Pre-existing test failures in `auth-actions.test.ts` (18 tests, `prisma.$transaction is not a function` in mock) — out of scope for this plan, not caused by this work. Logged as deferred item.

## Known Stubs

None — all components are wired and functional.

## Threat Flags

None — no new network endpoints, auth paths, file access patterns, or schema changes introduced.

## Next Phase Readiness

- `useAudioPlayer`, `AudioPlayer`, and `TranscriptPanel` are ready for consumption by Plan 06-04 (ListeningItemPage)
- `findActiveWordIndex` is exported from `use-audio-player.ts` and can be imported directly in parent components
- `Slider` UI component added to `/components/ui/slider.tsx` for use by AudioPlayer and any future seek bars

## Self-Check: PASSED

Files verified:
- `apps/web/src/hooks/use-audio-player.ts` exists — FOUND
- `apps/web/src/components/listening/audio-player.tsx` exists — FOUND
- `apps/web/src/components/listening/transcript-panel.tsx` exists — FOUND
- `apps/web/src/components/ui/slider.tsx` exists — FOUND
- `findActiveWordIndex` is a named top-level export — VERIFIED (grep returns 1 result)
- `dangerouslySetInnerHTML` absent — VERIFIED (grep returns 0 results)
- `blur-[4px]` present in TranscriptPanel — VERIFIED
- `data-[active=true]:bg-amber-200` present in TranscriptPanel — VERIFIED
- `sticky top-0 z-40` present in AudioPlayer — VERIFIED

Commits verified:
- 76c763f (Task 1: feat implementation) — FOUND
