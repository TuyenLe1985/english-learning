---
phase: 04-grammar-module
verified: 2026-06-14T00:00:00Z
status: gaps_found
score: 13/15
must_haves_verified: 13/15
overrides_applied: 0
re_verification: false
gaps:
  - truth: "POST /api/grammar/sessions/complete records GrammarAttempt rows and upserts GrammarProgress with masteryPct = correct/attempts"
    status: partial
    reason: "masteryPct is stored as a 0-1 fraction in the DB (newCorrect/newAttempts, confirmed line 238 of grammar.service.ts). GrammarSessionResults then multiplies by 100 again (value={masteryPct*100}, line 67), producing 8000% display for a user who answered 8/10 correctly (CR-01). The topic page passes the same raw 0-1 fraction directly to <Progress value={topic.masteryPct}> and Math.round, showing ~0-1% instead of 0-100%. The mastery display is broken on both screens — the stored value is self-consistent but every consumer renders it incorrectly."
    artifacts:
      - path: "apps/api/src/grammar/grammar.service.ts"
        issue: "Line 238: newMasteryPct = newCorrect / newAttempts — stores 0-1 fraction, not 0-100 percentage"
      - path: "apps/web/src/components/grammar/grammar-session-results.tsx"
        issue: "Line 67: value={masteryPct * 100} — multiplies 0-1 fraction by 100 again, yielding up to 8000%"
      - path: "apps/web/src/app/(dashboard)/grammar/[area]/[topic]/page.tsx"
        issue: "Line 118: value={topic.masteryPct} and Math.round(topic.masteryPct) — treats 0-1 fraction as 0-100, shows 0-1% instead of 0-100%"
    missing:
      - "Fix service to store 0-100: const newMasteryPct = newAttempts > 0 ? (newCorrect / newAttempts) * 100 : 0;"
      - "Remove *100 multiplication from grammar-session-results.tsx (use masteryPct directly)"
      - "Topic page already passes value directly — will be correct once service stores 0-100"
  - truth: "User can open a lesson, read the explanation, click Start Practice, answer a one-at-a-time exercise carousel, and see a completion screen"
    status: partial
    reason: "Lesson page Server Component (lesson/page.tsx line 31, 50) calls getSessionToken() synchronously — the function returns a raw JWE session cookie value, not a signed JWT the NestJS JwtAuthGuard can verify. In the current Next.js 14 environment this works in practice, but the relay routes in the same phase correctly use await headers() + fetchWithAuth, while the Server Component pages bypass the relay and call NEXT_PUBLIC_API_URL directly. CR-03 and CR-04 in the code review both flag this as a defect. The lesson page and browse pages will fail to load authenticated data in Docker production where the container cannot reach the public hostname."
    artifacts:
      - path: "apps/web/src/app/(dashboard)/grammar/[area]/[topic]/[lesson]/page.tsx"
        issue: "Lines 31, 50: calls getSessionToken() synchronously and fetches NEXT_PUBLIC_API_URL (NestJS) directly instead of the Next.js relay routes — bypasses relay auth model"
      - path: "apps/web/src/app/(dashboard)/grammar/page.tsx"
        issue: "Line 24: direct fetch to NEXT_PUBLIC_API_URL via getSessionToken() — same bypass"
      - path: "apps/web/src/app/(dashboard)/grammar/[area]/[topic]/page.tsx"
        issue: "Same direct-to-NestJS pattern bypassing relay"
    missing:
      - "Server Component pages should fetch via relative /api/grammar/... relay routes (or use auth() + internal Docker URL with correct JWT)"
human_verification:
  - test: "End-to-end grammar lesson flow (Plan 05 Task 3 checkpoint — pending)"
    expected: "Grid of 10 areas visible; navigate area→topic→lesson; explanation card shows before exercises; carousel serves all 5 exercise types including DragAndDrop with mouse and touch; completion screen shows score and correct mastery %; returning to topic page shows updated mastery bar; weak-review CTA launches filtered session skipping explanation"
    why_human: "Visual rendering, touch interaction, and live data flow from seeded DB cannot be verified programmatically"
---

# Phase 04: Grammar Module — Verification Report

**Phase Goal:** Deliver the full grammar module vertical slice — seeded content, NestJS API, 5 exercise types, browse pages, and lesson carousel — so a learner can navigate grammar areas, open a lesson, practice exercises, and see mastery progress.
**Verified:** 2026-06-14T00:00:00Z
**Status:** gaps_found
**Score:** 13/15 must-haves verified
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | GrammarArea and GrammarLesson have unique slug fields in DB schema | VERIFIED | schema.prisma: `slug String @unique` present in both model blocks |
| 2 | Grammar DTOs (area, topic, question, session-complete, session-result) exported from @repo/shared | VERIFIED | grammar.dto.ts has 16 export statements; barrel export in index.ts confirmed |
| 3 | Seed populates 10 grammar areas, ≥20 questions per topic across all lessons | VERIFIED | grammar.json: 10 areas, all topics have 21+ questions (conditionals: 40); seed.ts wired with seedGrammar() awaited in main() |
| 4 | @dnd-kit/core and @dnd-kit/sortable are installed in apps/web | VERIFIED | apps/web/package.json: both at correct versions (^6.3.1, ^10.0.0) |
| 5 | GET /api/grammar/areas returns 10 areas with topicCount, all behind JwtAuthGuard | VERIFIED | controller line 59-60: @UseGuards(JwtAuthGuard) + @Get('areas'); service getAreas() implemented (319-line service) |
| 6 | GET /api/grammar/lessons/:lessonSlug returns lesson explanation, examples, and questions | VERIFIED | controller line 133-134: @UseGuards(JwtAuthGuard) + @Get('lessons/:lessonSlug'); service getLessonDetail throws NotFoundException on P2025 |
| 7 | POST /api/grammar/sessions/complete records GrammarAttempt rows and upserts GrammarProgress with masteryPct = correct/attempts | FAILED | Service stores 0-1 fraction (line 238). GrammarSessionResults multiplies by 100 again (line 67) showing values up to 8000%. Topic page also misreads (0-1% display). Both consumer UIs broken. See CR-01. |
| 8 | GET /api/grammar/topics/:topicSlug/weak-questions returns only incorrect most-recent attempts | VERIFIED | Service getWeakQuestionsBySlug() implemented with JS dedup; controller line 116-117 |
| 9 | userId always taken from req.user.userId, never from request body | VERIFIED | Controller routes use `@Request() req`; grep of controller/service finds no `body.userId` or `dto.userId` |
| 10 | All 5 grammar exercise types render and emit onCorrect/onIncorrect | VERIFIED | All 5 components exist; multiple-choice and fill-in-blank have onCorrect/onIncorrect; drag-and-drop uses useDraggable/useDroppable from @dnd-kit/core only |
| 11 | FillInTheBlank validates answers case-insensitively after trimming whitespace | VERIFIED | fill-in-the-blank-exercise.tsx line 40: `input.trim().toLowerCase() === answer.toLowerCase()` |
| 12 | DragAndDrop uses @dnd-kit/core (not sortable) | VERIFIED | drag-and-drop-exercise.tsx imports from @dnd-kit/core only; no @dnd-kit/sortable import found |
| 13 | User can open /grammar and see grid of 10 area cards | VERIFIED | grammar/page.tsx fetches /api/grammar/areas and renders GrammarAreaCard grid; AREA_ICONS maps all 10 slugs |
| 14 | Topic page shows masteryPct and 'Review weak exercises' button linking to first lesson with ?review=weak | PARTIAL (scale broken) | Button exists (lines 86, 126 with `?review=weak` and `lessons[0]?.slug`), Progress component present — but masteryPct is a 0-1 fraction so displayed as 0-1% instead of 0-100%. Visual display wrong even though wiring is correct. |
| 15 | User can open a lesson, read explanation, click Start Practice, answer carousel, see completion screen | FAILED | grammar-lesson-page.tsx orchestrator is structurally complete (all 5 exercise types in switch, Start Practice CTA, batch POST). However lesson Server Component calls getSessionToken() synchronously and fetches NestJS directly (NEXT_PUBLIC_API_URL) bypassing relay auth — lesson data will not load in Docker production. CR-03/CR-04. |

**Score:** 13/15 truths verified (2 FAILED, 1 PARTIAL — counted as FAILED for scoring)

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/database/prisma/schema.prisma` | slug on GrammarArea + GrammarLesson | VERIFIED | Both unique slug fields present |
| `packages/shared/src/grammar.dto.ts` | 8 Zod schemas + inferred types | VERIFIED | 16 exports confirmed |
| `packages/database/prisma/seed-data/grammar.json` | 10 areas, ≥20 q/topic | VERIFIED | All areas have 21+ questions |
| `packages/database/prisma/seed.ts` | seedGrammar() in main() | VERIFIED | Import + function + await present |
| `apps/api/src/grammar/grammar.service.ts` | 6 service methods, ≥90 lines | VERIFIED | 319 lines, all methods present |
| `apps/api/src/grammar/grammar.controller.ts` | JwtAuthGuard on all endpoints | VERIFIED | @UseGuards on every route |
| `apps/api/src/grammar/grammar.module.ts` | Module with controller + service | VERIFIED | exports class GrammarModule |
| `apps/web/src/components/grammar/multiple-choice-exercise.tsx` | onCorrect/onIncorrect | VERIFIED | Both callbacks present |
| `apps/web/src/components/grammar/fill-in-the-blank-exercise.tsx` | Case-insensitive validation | VERIFIED | trim().toLowerCase() present |
| `apps/web/src/components/grammar/drag-and-drop-exercise.tsx` | @dnd-kit/core, useDraggable | VERIFIED | Both imports from @dnd-kit/core |
| `apps/web/src/components/grammar/explanation-view.tsx` | Rule card + examples | VERIFIED | bg-zinc-100/dark:bg-zinc-800 + examples rendered |
| `apps/web/src/components/grammar/exercises/sentence-transformation-exercise.tsx` | Textarea + case-insensitive | VERIFIED | Exists in exercises/ subfolder |
| `apps/web/src/components/grammar/exercises/error-correction-exercise.tsx` | Textarea + feedback | VERIFIED | Exists in exercises/ subfolder |
| `apps/web/src/app/(dashboard)/grammar/page.tsx` | Area grid Server Component | VERIFIED | GrammarAreaCard in sm:grid-cols-4 |
| `apps/web/src/components/grammar/grammar-area-card.tsx` | AREA_ICONS map + Link | VERIFIED | All 10 slugs mapped |
| `apps/web/src/app/(dashboard)/grammar/[area]/[topic]/page.tsx` | Mastery bar + weak CTA | STUB (scale bug) | Structure correct but 0-1 fraction displayed raw |
| `apps/web/src/components/grammar/grammar-lesson-page.tsx` | Session orchestrator | VERIFIED | Start Practice, all 5 exercise types, batch POST |
| `apps/web/src/components/grammar/grammar-session-results.tsx` | Score + mastery Progress | STUB (scale bug) | masteryPct * 100 double-multiplies the 0-1 fraction |
| `apps/web/src/app/(dashboard)/grammar/[area]/[topic]/[lesson]/page.tsx` | Lesson SC with weak-review | PARTIAL | Orchestration correct; auth bypass (getSessionToken direct-to-NestJS) |
| `apps/web/src/app/api/grammar/sessions/complete/route.ts` | POST relay | VERIFIED | method: POST, try/catch on req.json, fetchWithAuth |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| packages/shared/src/index.ts | grammar.dto.ts | barrel re-export | VERIFIED | `export * from "./grammar.dto"` confirmed |
| apps/api/src/app.module.ts | grammar.module.ts | imports array | VERIFIED | GrammarModule in imports |
| grammar.service.ts | prisma.grammarProgress | upsert on userId_topicId | VERIFIED | grammarProgress.upsert present (line 241) |
| grammar.controller.ts | GrammarSessionCompleteSchema | Zod parse of body | VERIFIED | GrammarSessionCompleteSchema.parse(body) present |
| grammar/page.tsx | /api/grammar/areas | Server Component fetch | VERIFIED | fetch(`${API_URL}/api/grammar/areas`) |
| [area]/[topic]/page.tsx | /grammar/[area]/[topic]/[lesson]?review=weak | Button href from lessons[0].slug | VERIFIED | review=weak and lessons[0] both in file |
| grammar-lesson-page.tsx | /api/grammar/sessions/complete | fetch POST on completion | VERIFIED | fetch("/api/grammar/sessions/complete") present |
| grammar-lesson-page.tsx | exercises/* | renderExercise switch on exerciseType | VERIFIED | All 5 cases in switch |
| [lesson]/page.tsx | /api/grammar/lessons/[lessonSlug] | Server Component fetch | WIRED (auth defect) | Wired but uses direct NEXT_PUBLIC_API_URL + getSessionToken() — bypasses relay |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| grammar/page.tsx | areas[] | fetch NEXT_PUBLIC_API_URL/api/grammar/areas | NestJS queries DB via getAreas() | FLOWING (auth concern noted) |
| [area]/[topic]/page.tsx | masteryPct | GrammarTopicDetailDto | DB GrammarProgress | FLOWING but 0-1 scale broken at render |
| grammar-session-results.tsx | masteryPct | POST response GrammarSessionResultDto | NestJS completeSession() | FLOWING but scale bug: displays 0-8000% |
| grammar-lesson-page.tsx | lesson.questions | GrammarLessonDetailDto | DB GrammarQuestion via relay | FLOWING |

---

### Requirements Coverage

| Requirement | Plans | Description | Status | Evidence |
|-------------|-------|-------------|--------|----------|
| GRAM-01 | 01, 02, 04 | Browse 10 grammar areas, topics, lessons | SATISFIED | 10-area grid, topic list, lesson list pages all built and wired |
| GRAM-02 | 02, 03, 05 | Lesson explanation rendered before exercises | SATISFIED (pending human) | ExplanationView + "Start Practice" gate; getLessonDetail returns explanation+examples |
| GRAM-03 | 01, 03, 05 | ≥3 of 5 exercise types in carousel | SATISFIED | All 5 types built; renderExercise switch covers all 5 |
| GRAM-04 | 02, 05 | Session completion stores score + updates mastery | PARTIAL | Attempts stored, upsert wired — but masteryPct scale bug means displayed mastery is wrong on both topic page and results screen |
| GRAM-05 | 01 | ≥20 questions per topic in seed data | SATISFIED | grammar.json verified: all topics 21+ questions |
| GRAM-06 | 02, 04, 05 | Weak-question re-attempt session | SATISFIED (pending human) | getWeakQuestions() built; review=weak param consumed; filtered session skips explanation |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| grammar-session-results.tsx | 67, 69 | `masteryPct * 100` — double-multiplies 0-1 fraction | BLOCKER | Every session completion shows mastery 100x too large (e.g. 8000%) |
| grammar.service.ts | 238 | `newCorrect / newAttempts` — returns 0-1, not 0-100 | BLOCKER | Root cause of the scale mismatch; all mastery displays wrong |
| [area]/[topic]/page.tsx | 114, 118 | `Math.round(topic.masteryPct)` + `value={topic.masteryPct}` on 0-1 | BLOCKER | Topic page shows 0-1% mastery and near-empty progress bar |
| [lesson]/page.tsx | 31, 50 | `getSessionToken()` direct to NEXT_PUBLIC_API_URL | BLOCKER | Bypasses relay auth; will fail in Docker production; cannot reach NestJS internally |
| grammar/page.tsx | 24 | Same direct-to-NestJS fetch pattern | WARNING | Browse pages load data but bypass relay — production concern |
| grammar-lesson-page.tsx | 194-199 | Empty catch block — silent error swallow | WARNING | User progress lost without any logged error or retry path (WR-03) |
| multiple-choice-exercise.tsx | 31 | `sort(() => 0)` — no-op shuffle | WARNING | Correct answer always first option; trivially solvable (WR-02) |
| drag-and-drop-exercise.tsx | 92-102 | Missing `blankCount === 0` guard | WARNING | Malformed question with no ___ auto-awards correct (WR-04) |

---

### Human Verification Required

#### 1. End-to-End Grammar Lesson Flow (Plan 05 Task 3 — pending approval)

**Test:** With stack running (`docker compose up`, `pnpm dev`, seed run), log in as demo@example.com / demo1234. Navigate: /grammar → click an area → click a topic → open a lesson. Click "Start Practice". Complete the carousel encountering at least 3 distinct exercise types. Verify DragAndDrop works with mouse and touch. Reach the completion screen. Return to the topic page and check the mastery bar.

**Expected:** 10-area grid visible; area/topic navigation works; explanation card appears before first exercise; carousel advances one question at a time; DragAndDrop word chips drag without clipping; completion screen shows a score and a mastery percentage in the 0-100% range (not 0-8000%); topic page mastery bar updates.

**Why human:** Visual rendering correctness, touch interaction with DragAndDrop, and live DB data flow cannot be verified programmatically. Also: the masteryPct scale bug (CR-01, BLOCKER) means the human tester will likely observe wrong percentages — this test will likely FAIL until the scale fix is applied.

#### 2. Weak-Review Session Flow

**Test:** After completing a lesson with some incorrect answers, return to the topic page. Confirm "Review weak exercises" button is visible. Click it. Confirm the URL contains `?review=weak`, the explanation phase is skipped, and only previously-wrong questions appear.

**Expected:** Filtered session starts immediately in exercises phase; questions are only those answered incorrectly in prior sessions.

**Why human:** Filtering logic depends on DB state after a real session; cannot verify without running the app.

---

## Gaps Summary

Two blockers prevent the phase goal from being fully achieved:

**Blocker 1 — masteryPct scale mismatch (CR-01):** The NestJS service stores masteryPct as a 0-1 fraction. GrammarSessionResults multiplies it by 100 again, displaying up to 8000%. The topic page also misreads it, showing 0-1% and a near-empty progress bar. The mastery display — a core deliverable of GRAM-04 ("see mastery progress") — is broken on both screens. Fix: multiply by 100 in the service (`(newCorrect / newAttempts) * 100`), remove the `* 100` from grammar-session-results.tsx.

**Blocker 2 — Server Components bypass relay auth (CR-03/CR-04):** The lesson page, area page, and topic page call `getSessionToken()` and fetch `NEXT_PUBLIC_API_URL` (the public NestJS hostname) directly. In Docker production, Server Components run inside the container network and cannot reach the public hostname. These pages will return empty/error data in production. The relay routes in the same phase correctly use `await headers()` + `fetchWithAuth` — the Server Component pages should use the same relay pattern.

The structural plumbing is solid (13/15 truths verified): schema slugs, DTOs, seed data, NestJS endpoints, all 5 exercise components, browse pages, lesson carousel, and weak-review mode all exist and are wired correctly. The two blockers are a rendering-layer scale error and an auth-routing inconsistency — both fixable in a single targeted plan.

---

_Verified: 2026-06-14T00:00:00Z_
_Verifier: Claude (gsd-verifier)_
