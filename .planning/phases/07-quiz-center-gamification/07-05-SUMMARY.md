---
phase: "07-quiz-center-gamification"
plan: "05"
subsystem: "quiz-ui-vertical-slice"
tags: [quiz, next.js, relay-routes, session-flow, score-card, framer-motion]
dependency_graph:
  requires:
    - packages/shared/src/quiz.dto.ts (QuizStartResponseDto, QuizCompleteResponseDto, QuizQuestionDto from 07-01)
  provides:
    - apps/web/src/app/api/quiz/sessions/start/route.ts (POST relay to NestJS)
    - apps/web/src/app/api/quiz/sessions/[sessionId]/complete/route.ts (POST relay to NestJS)
    - apps/web/src/app/api/quiz/sessions/[sessionId]/mistakes/route.ts (GET relay to NestJS)
    - apps/web/src/app/(dashboard)/quiz/page.tsx (quiz browse page)
    - apps/web/src/components/quiz/quiz-type-selector.tsx (6-type card grid + session start)
    - apps/web/src/app/(dashboard)/quiz/[sessionId]/page.tsx (session page)
    - apps/web/src/app/(dashboard)/quiz/[sessionId]/results/page.tsx (results page)
    - apps/web/src/components/quiz/quiz-session.tsx (state machine orchestrator)
    - apps/web/src/components/quiz/quiz-question.tsx (MC delegation wrapper)
    - apps/web/src/components/quiz/quiz-progress-bar.tsx (progress indicator)
    - apps/web/src/components/quiz/quiz-score-card.tsx (score card with breakdown)
    - apps/web/src/components/quiz/quiz-results-client.tsx (sessionStorage reader + ScoreCard renderer)
  affects:
    - 07-06 (XP toast + level-up modal mount points already marked in quiz-score-card.tsx and results page)
tech_stack:
  added: []
  patterns:
    - Next.js relay route pattern (auth() gate + fetchWithAuth + INTERNAL_API_URL)
    - sessionStorage hand-off (QuizTypeSelector stores QuizStartResponseDto, QuizSession and QuizResultsClient read it)
    - State machine pattern (IDLE/ACTIVE/ANSWER_LOCKED/SUBMITTING/RESULTS in quiz-session.tsx)
    - Framer Motion entrance animation (opacity 0->1 scale 0.95->1 0.3s easeOut in quiz-score-card.tsx)
    - MultipleChoiceExercise delegation (QuizQuestion maps all skill types to existing MC component)
key_files:
  created:
    - apps/web/src/app/api/quiz/sessions/start/route.ts
    - apps/web/src/app/api/quiz/sessions/[sessionId]/complete/route.ts
    - apps/web/src/app/api/quiz/sessions/[sessionId]/mistakes/route.ts
    - apps/web/src/app/(dashboard)/quiz/page.tsx
    - apps/web/src/components/quiz/quiz-type-selector.tsx
    - apps/web/src/app/(dashboard)/quiz/[sessionId]/page.tsx
    - apps/web/src/app/(dashboard)/quiz/[sessionId]/results/page.tsx
    - apps/web/src/components/quiz/quiz-session.tsx
    - apps/web/src/components/quiz/quiz-question.tsx
    - apps/web/src/components/quiz/quiz-progress-bar.tsx
    - apps/web/src/components/quiz/quiz-score-card.tsx
    - apps/web/src/components/quiz/quiz-results-client.tsx
  modified: []
decisions:
  - "sessionStorage used for quiz data hand-off (QuizTypeSelector -> QuizSession -> QuizResultsClient) to avoid re-fetching from NestJS on each page navigation"
  - "QuizResultsClient introduced as separate component from QuizScoreCard to handle sessionStorage loading and error states, keeping QuizScoreCard pure presentation"
  - "MultipleChoiceExercise callback fires after 900ms built-in delay; QuizSession waits for onAnswer callback then shows Next button rather than auto-advancing"
  - "QuizQuestion does not capture userAnswer string from MultipleChoiceExercise (existing component does not pass it in onIncorrect); recorded as empty string, mistake review uses correctAnswer + isCorrect flag"
metrics:
  duration: "35 minutes"
  completed_date: "2026-06-19"
  tasks: 3
  files: 12
---

# Phase 7 Plan 5: Quiz UI Vertical Slice Summary

**One-liner:** Three Next.js relay routes, quiz browse page with 6-type card grid, 10-question session orchestrator with progress bar + answer lock, and Framer Motion score card with per-skill breakdown — completing the end-to-end quiz user journey.

## What Was Built

### Task 1: Three Next.js Relay Routes

Created three relay routes following the listening relay pattern exactly:

- `start/route.ts` — POST, auth() gate (401 if no session), parses JSON body, relays to `${INTERNAL_API_URL}/api/quiz/sessions/start`. Auth enforcement implements T-07-13.
- `[sessionId]/complete/route.ts` — POST with dynamic `sessionId` param, relays to `${INTERNAL_API_URL}/api/quiz/sessions/${sessionId}/complete`. NestJS recomputes accuracy server-side (T-07-15).
- `[sessionId]/mistakes/route.ts` — GET with dynamic `sessionId` param, relays to `${INTERNAL_API_URL}/api/quiz/sessions/${sessionId}/mistakes` (no body).

All three: use `fetchWithAuth + INTERNAL_API_URL` (not `NEXT_PUBLIC_`), forward cookie header, call `auth()` before any forwarding.

### Task 2: Quiz Browse Page + QuizTypeSelector

- `quiz/page.tsx` — Server Component with `auth()` redirect guard, renders "Quiz Center" heading (20px semibold) + subtitle "Test your knowledge across all skills.", passes `cefrLevel` from session to `QuizTypeSelector`.
- `quiz-type-selector.tsx` — 'use client', 2-col card grid on md+, 1-col on mobile. 6 quiz types with lucide icons (Shuffle/Monitor/Plane/Briefcase/MessageCircle/GraduationCap per UI-SPEC). Each card: icon 32px, name 14px semibold, subtitle 12px muted, CefrBadge, "Start Quiz" CTA per Copywriting Contract. On click: POST to `/api/quiz/sessions/start`, stores `QuizStartResponseDto` in `sessionStorage[quiz-session-{sessionId}]`, `router.push` to `/quiz/${sessionId}`. Loading state per card, error state rendered inline.

### Task 3: Session Flow + Results Page

- `quiz/[sessionId]/page.tsx` — Server Component, auth() guard, renders `QuizSession` with sessionId and cefrLevel.
- `quiz/[sessionId]/results/page.tsx` — Server Component, auth() guard, renders `QuizResultsClient`. 07-06 mount point marked in comments.
- `quiz-progress-bar.tsx` — shadcn `Progress` with value `(currentIndex+1)/10 * 100`, label "Question N of 10" per Copywriting Contract.
- `quiz-question.tsx` — delegates ALL question types to `MultipleChoiceExercise` (grammar/vocab/reading/listening all render as MC in quiz context). Maps `QuizQuestionDto` to MC props. Header shows skill-area Badge (variant="secondary") + CefrBadge. Emits `SessionAnswer` on correct/incorrect.
- `quiz-session.tsx` — state machine (IDLE/ACTIVE/ANSWER_LOCKED/SUBMITTING/RESULTS). Holds `{questions, currentIndex, answers[], startedAt}` in client state. Reads `QuizStartResponseDto` from sessionStorage on mount. Shows "Next ->" after answer lock, "Submit Quiz" on question 10. Batch POSTs to `/api/quiz/sessions/${sessionId}/complete`, stores result in `sessionStorage[quiz-result-{sessionId}]`, then `router.push` to results page. Elapsed timer passive display. D-06 no-back-navigation enforced.
- `quiz-score-card.tsx` — Framer Motion entrance (opacity 0->1, scale 0.95->1, 0.3s easeOut). Score headline `{score}/10 correct` at `text-[28px] font-semibold`. Sub-line `{pct}% accuracy · +{xp} XP · {time}`. `<dl>` skill breakdown (Grammar/Vocabulary/Reading/Listening). CTAs: "Review Mistakes" (only if incorrectCount > 0), "Try Another Quiz" (outline), "Back to Quiz Center" (ghost).
- `quiz-results-client.tsx` — reads `sessionStorage[quiz-result-{sessionId}]` on mount, renders `QuizScoreCard`. Error state if entry missing.

## Deviations from Plan

None — plan executed exactly as written. The `QuizResultsClient` component is an implementation detail of the results page (not separately named in the plan's file list) that cleanly separates sessionStorage concerns from the pure presentation `QuizScoreCard`.

## Known Stubs

| Stub | File | Line | Reason |
|------|------|------|--------|
| `TODO(07-06): XP toast + level-up modal mount point` | quiz-score-card.tsx | 116 | Intentional mount point per plan — gamification overlays added in 07-06 |
| `TODO(07-06): XP toast + level-up modal` | quiz/[sessionId]/results/page.tsx | 35 | Intentional mount point per plan — 07-06 adds XpToast + LevelUpModal here |

Both stubs are explicitly required by the plan ("leave a clearly marked mount point"). They do not prevent the plan's goal (end-to-end quiz flow) from being achieved. 07-06 resolves them.

## Threat Flags

None. All relay routes enforce auth() (T-07-13). No new untrusted input handling, no new endpoints beyond what the plan defined. NestJS recomputes accuracy server-side (T-07-15 mitigated).

## Self-Check

### Files Created

- [x] `apps/web/src/app/api/quiz/sessions/start/route.ts` — FOUND
- [x] `apps/web/src/app/api/quiz/sessions/[sessionId]/complete/route.ts` — FOUND
- [x] `apps/web/src/app/api/quiz/sessions/[sessionId]/mistakes/route.ts` — FOUND
- [x] `apps/web/src/app/(dashboard)/quiz/page.tsx` — FOUND
- [x] `apps/web/src/components/quiz/quiz-type-selector.tsx` — FOUND
- [x] `apps/web/src/app/(dashboard)/quiz/[sessionId]/page.tsx` — FOUND
- [x] `apps/web/src/app/(dashboard)/quiz/[sessionId]/results/page.tsx` — FOUND
- [x] `apps/web/src/components/quiz/quiz-session.tsx` — FOUND
- [x] `apps/web/src/components/quiz/quiz-question.tsx` — FOUND
- [x] `apps/web/src/components/quiz/quiz-progress-bar.tsx` — FOUND
- [x] `apps/web/src/components/quiz/quiz-score-card.tsx` — FOUND
- [x] `apps/web/src/components/quiz/quiz-results-client.tsx` — FOUND

### Commits Verified

- [x] `4c91750` — feat(07-05): create three Next.js relay routes for quiz sessions
- [x] `1af5daa` — feat(07-05): build quiz browse page and QuizTypeSelector component
- [x] `e6ff319` — feat(07-05): build quiz session flow, results page, and score card components

### Acceptance Criteria Verified

- [x] Three relay route files exist and export correct HTTP method handlers (POST, POST, GET)
- [x] Each relay calls auth() and returns 401 JSON when no session
- [x] Each relay uses fetchWithAuth + INTERNAL_API_URL targeting matching /api/quiz/... path
- [x] quiz/page.tsx is a Server Component with auth() redirect guard and renders QuizTypeSelector
- [x] quiz-type-selector.tsx references all 6 lucide icons (grep count = 12, 6 imports + 6 usages)
- [x] On card click: POSTs to /api/quiz/sessions/start, stores session, navigates to /quiz/[sessionId]
- [x] "Quiz Center" heading and "Start Quiz" CTA copy present per Copywriting Contract
- [x] QuizQuestion delegates to MultipleChoiceExercise (grep count = 7 >= 1)
- [x] QuizSession accumulates answers, shows progress bar, locks options, batch POST on question 10
- [x] QuizScoreCard: "{score}/10 correct" at text-[28px] font-semibold, Framer Motion entrance, skill breakdown table
- [x] quiz/[sessionId]/page.tsx and results/page.tsx are Server Components with auth() guards
- [x] pnpm --filter web exec tsc --noEmit reports zero quiz-related errors

## Self-Check: PASSED
