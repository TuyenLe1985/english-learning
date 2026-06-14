---
phase: 04-grammar-module
plan: "05"
subsystem: grammar-lesson-flow
tags: [grammar, lesson-page, session-orchestrator, relay-routes, weak-review]
dependency_graph:
  requires: ["04-02", "04-03", "04-04"]
  provides: [lesson-detail-relay, session-complete-relay, weak-questions-relay, grammar-lesson-page, grammar-session-results, lesson-server-component]
  affects: [grammar-module-e2e]
tech_stack:
  added: []
  patterns: [server-component-fetch, relay-route-proxy, session-orchestrator, phase-state-machine, weak-review-mode]
key_files:
  created:
    - apps/web/src/app/api/grammar/lessons/[lessonSlug]/route.ts
    - apps/web/src/app/api/grammar/sessions/complete/route.ts
    - apps/web/src/app/api/grammar/topics/[topicSlug]/weak-questions/route.ts
    - apps/web/src/components/grammar/grammar-session-results.tsx
    - apps/web/src/components/grammar/grammar-lesson-page.tsx
    - apps/web/src/app/(dashboard)/grammar/[area]/[topic]/[lesson]/page.tsx
  modified: []
decisions:
  - "Exercise card wrapper omits overflow-hidden to allow DragOverlay to render outside card boundary (DnD Pitfall 3)"
  - "Weak-review mode skips explanation phase; GrammarLessonPage starts directly in exercises phase when weakQuestions prop is non-empty"
  - "Session completion failure is non-blocking: results screen still renders with locally-computed score; error copy shown when sessionResult is null after submission"
  - "Restart after completion skips explanation phase (starts directly in exercises) for a better UX"
metrics:
  duration: "6m"
  completed: "2026-06-14T02:06:44Z"
  tasks_completed: 2
  files_created: 6
---

# Phase 04 Plan 05: Grammar Lesson Flow Summary

## One-liner

Full lesson vertical slice: 3 auth-gated relay routes + GrammarLessonPage orchestrator (explanation→carousel→results) + lesson Server Component with weak-review mode via `review=weak` search param.

## What Was Built

### Task 1: Three relay routes

**`GET /api/grammar/lessons/[lessonSlug]/route.ts`**
- Auth gate: `auth()` → 401
- Awaits `params` for `lessonSlug`, `headers()` for cookie, proxies to `${API_URL}/api/grammar/lessons/${lessonSlug}` via `fetchWithAuth`
- Returns lesson detail JSON or propagates NestJS error status

**`POST /api/grammar/sessions/complete/route.ts`**
- Auth gate: `auth()` → 401
- `req.json()` wrapped in try/catch → 400 "Invalid JSON" on malformed body (T-04-15)
- No `userId` injection — NestJS derives from JWT (T-04-13)
- Forwards body unchanged to `${API_URL}/api/grammar/sessions/complete`

**`GET /api/grammar/topics/[topicSlug]/weak-questions/route.ts`**
- Auth gate: `auth()` → 401 (T-04-14)
- Proxies to `${API_URL}/api/grammar/topics/${topicSlug}/weak-questions`
- NestJS scopes results to authenticated user

### Task 2: GrammarSessionResults + GrammarLessonPage + lesson Server Component

**`grammar-session-results.tsx`**
- `"use client"` — framer-motion entrance (`opacity: 0→1, scale: 0.95→1, 0.3s easeOut`)
- "Session complete!" label, `{score}/{total} correct` at `text-[28px] font-semibold`
- `{N}% · {Xs}` accuracy + time metadata
- `<Progress value={masteryPct * 100} className="h-3">` mastery bar
- "Practice again" + "Back to topic" outline Buttons, `w-full min-h-[44px]`
- No SRS dialog (grammar exercises don't feed SRS)

**`grammar-lesson-page.tsx`**
- `"use client"` session orchestrator
- Props: `{ lesson, areaSlug, topicSlug, weakQuestions? }`
- Three-phase state machine: `"explanation" | "exercises" | "results"` (D-04 linear)
- Weak-review mode (D-09): when `weakQuestions` is non-empty, starts directly in `"exercises"` with only those questions
- `renderExercise` switch covers all 5 exercise types: `MULTIPLE_CHOICE`, `FILL_IN_THE_BLANK`, `SENTENCE_TRANSFORMATION`, `ERROR_CORRECTION`, `DRAG_AND_DROP`
- Exercise card: `rounded-xl border border-border bg-card p-6 shadow-sm min-h-[280px]` — no `overflow-hidden`
- Batch submit on last question: POST to `/api/grammar/sessions/complete` with `{ lessonId, attempts, timeTakenMs }`
- Non-blocking failure: results screen renders even if API call fails

**`/grammar/[area]/[topic]/[lesson]/page.tsx`** (Server Component)
- Awaits `params` and `searchParams`
- Fetches lesson detail via `getSessionToken()` + NestJS
- When `review === "weak"`: additionally fetches weak-questions and passes as `weakQuestions` prop
- Renders `<GrammarLessonPage>` with all props
- Modifies NO plan-04 files (`[area]/[topic]/page.tsx` untouched)

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all data flows from NestJS API via relay routes; no hardcoded empty values.

## Threat Flags

No new threat surfaces beyond those documented in the plan's threat model (T-04-13, T-04-14, T-04-15 all mitigated as specified).

## Self-Check

### Files created exist:
- [x] `apps/web/src/app/api/grammar/lessons/[lessonSlug]/route.ts` — FOUND
- [x] `apps/web/src/app/api/grammar/sessions/complete/route.ts` — FOUND
- [x] `apps/web/src/app/api/grammar/topics/[topicSlug]/weak-questions/route.ts` — FOUND
- [x] `apps/web/src/components/grammar/grammar-session-results.tsx` — FOUND
- [x] `apps/web/src/components/grammar/grammar-lesson-page.tsx` — FOUND
- [x] `apps/web/src/app/(dashboard)/grammar/[area]/[topic]/[lesson]/page.tsx` — FOUND

### Commits exist:
- Task 1: `065ad2a` — feat(04-05): add 3 grammar relay routes
- Task 2: `6faeef4` — feat(04-05): implement GrammarSessionResults, GrammarLessonPage, lesson page SC

### Status: CHECKPOINT — awaiting human verification (Task 3)

Human checkpoint (Task 3) is still pending user verification of the end-to-end grammar lesson flow.
