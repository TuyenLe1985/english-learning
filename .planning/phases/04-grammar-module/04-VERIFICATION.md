---
phase: 04-grammar-module
verified: 2026-06-14T11:00:00Z
status: human_needed
score: 15/15
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 14/15
  gaps_closed:
    - "grammar-session-results.tsx masteryPct double-multiply removed: line 67 is now value={masteryPct}, line 69 is now {Math.round(masteryPct)}% — results screen correctly reads 0-100 service value directly"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "End-to-end grammar lesson flow"
    expected: "Grid of 10 areas visible; navigate area to topic to lesson; explanation card shows before exercises; carousel serves all 5 exercise types including DragAndDrop with mouse and touch; completion screen shows score and correct mastery % in 0-100 range; returning to topic page shows updated mastery bar"
    why_human: "Visual rendering, touch interaction, and live data flow from seeded DB cannot be verified programmatically"
  - test: "Weak-Review Session Flow"
    expected: "After completing a lesson with some incorrect answers, return to the topic page. Confirm 'Review weak exercises' button is visible. Click it. Confirm the URL contains ?review=weak, the explanation phase is skipped, and only previously-wrong questions appear."
    why_human: "Filtering logic depends on DB state after a real session; cannot verify without running the app"
---

# Phase 04: Grammar Module — Re-Verification Report (Plan 06 Final Gap Closure)

**Phase Goal:** Deliver the full grammar module vertical slice — seeded content, NestJS API, 5 exercise types, browse pages, and lesson carousel — so a learner can navigate grammar areas, open a lesson, practice exercises, and see mastery progress.
**Verified:** 2026-06-14T11:00:00Z
**Status:** human_needed
**Score:** 15/15 must-haves verified
**Re-verification:** Yes — after masteryPct double-multiply fix

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | GrammarArea and GrammarLesson have unique slug fields in DB schema | VERIFIED | Carried — schema.prisma unique slug fields present |
| 2 | Grammar DTOs exported from @repo/shared | VERIFIED | Carried — grammar.dto.ts 16 exports confirmed |
| 3 | Seed populates 10 grammar areas, ≥20 questions per topic | VERIFIED | Carried — grammar.json all topics 21+ questions |
| 4 | @dnd-kit/core and @dnd-kit/sortable installed in apps/web | VERIFIED | Carried — package.json confirmed |
| 5 | GET /api/grammar/areas returns 10 areas with topicCount, all behind JwtAuthGuard | VERIFIED | Carried — grammar.controller.ts + JwtAuthGuard confirmed |
| 6 | GET /api/grammar/lessons/:lessonSlug returns lesson explanation, examples, and questions | VERIFIED | Carried — getLessonDetail DTO shape confirmed |
| 7 | POST /api/grammar/sessions/complete stores masteryPct on 0-100 scale | VERIFIED | grammar.service.ts line 238: `(newCorrect / newAttempts) * 100`. Spec tests assert masteryPct === 80, === 0, === 40. |
| 8 | GET /api/grammar/topics/:topicSlug/weak-questions returns only incorrect most-recent attempts | VERIFIED | Carried — getWeakQuestions query confirmed |
| 9 | userId always taken from req.user.userId, never from request body | VERIFIED | Carried — service reads userId from JWT payload only |
| 10 | All 5 grammar exercise types render and emit onCorrect/onIncorrect | VERIFIED | Carried — renderExercise switch covers all 5 types |
| 11 | FillInTheBlank validates answers case-insensitively after trimming whitespace | VERIFIED | Carried — toLowerCase + trim in FillInTheBlank component |
| 12 | DragAndDrop uses @dnd-kit/core (not sortable) | VERIFIED | Carried — DnDContext from @dnd-kit/core confirmed |
| 13 | User can open /grammar and see grid of 10 area cards | VERIFIED | grammar/page.tsx: fetchWithAuth + INTERNAL_API_URL + forwarded cookie header. No getSessionToken. No NEXT_PUBLIC_API_URL. |
| 14 | Topic page shows masteryPct and 'Review weak exercises' button linking to first lesson with ?review=weak | VERIFIED | [area]/[topic]/page.tsx lines 113, 117: `Math.round(topic.masteryPct)` and `value={topic.masteryPct}` — direct pass, correct at 0-100 scale |
| 15 | Session results screen shows mastery between 0 and 100 percent (not 0-8000%) | VERIFIED | grammar-session-results.tsx line 67: `value={masteryPct}`, line 69: `{Math.round(masteryPct)}%` — `* 100` removed. Service returns 80 for 8/10 correct; screen renders 80%. Fix confirmed. |

**Score:** 15/15 truths verified

---

### Blocker Analysis: All Closed

**CR-01 (masteryPct scale) — FULLY CLOSED:**

Both required changes are now in place:
1. Service: `(newCorrect / newAttempts) * 100` at grammar.service.ts line 238 — DONE (confirmed in previous verification).
2. Results screen: `* 100` removed from grammar-session-results.tsx lines 67 and 69 — DONE (confirmed in this verification). Line 67 now reads `value={masteryPct}`. Line 69 now reads `{Math.round(masteryPct)}%`. The prop is a direct pass-through — no arithmetic.

**CR-03/CR-04 (relay auth) — CLOSED (carried from previous verification):**

All four grammar Server Component pages use `fetchWithAuth` + `INTERNAL_API_URL` + forwarded cookie header. No `getSessionToken`. No `NEXT_PUBLIC_API_URL`. Confirmed in previous verification pass.

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/api/src/grammar/grammar.service.ts` | masteryPct on 0-100 scale | VERIFIED | Line 238: `(newCorrect / newAttempts) * 100` |
| `apps/api/src/grammar/grammar.service.spec.ts` | Tests assert 0-100 scale | VERIFIED | masteryPct === 80, === 0, === 40 asserted |
| `apps/web/src/components/grammar/grammar-session-results.tsx` | Progress reads masteryPct directly (no *100) | VERIFIED | Line 67: `value={masteryPct}`. Line 69: `{Math.round(masteryPct)}%`. Fix applied and confirmed. |
| `apps/web/src/lib/api-client.ts` | INTERNAL_API_URL export | VERIFIED | `export const INTERNAL_API_URL = process.env["INTERNAL_API_URL"] ?? process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3001"` |
| `apps/web/src/app/(dashboard)/grammar/page.tsx` | fetchWithAuth + INTERNAL_API_URL | VERIFIED | Lines 17, 22-24: correct relay pattern |
| `apps/web/src/app/(dashboard)/grammar/[area]/page.tsx` | fetchWithAuth + INTERNAL_API_URL | VERIFIED | Correct relay pattern (carried) |
| `apps/web/src/app/(dashboard)/grammar/[area]/[topic]/page.tsx` | masteryPct displayed directly | VERIFIED | Lines 113, 117: `Math.round(topic.masteryPct)` and `value={topic.masteryPct}` |
| `apps/web/src/app/(dashboard)/grammar/[area]/[topic]/[lesson]/page.tsx` | fetchWithAuth + INTERNAL_API_URL on both helpers | VERIFIED | Both fetchLessonDetail and fetchWeakQuestions use relay pattern |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| grammar/page.tsx | INTERNAL_API_URL/api/grammar/areas | fetchWithAuth + forwarded cookie | VERIFIED | Relay auth pattern confirmed |
| [area]/page.tsx | INTERNAL_API_URL/api/grammar/areas/${area}/topics | fetchWithAuth + forwarded cookie | VERIFIED | Relay auth pattern confirmed |
| [area]/[topic]/page.tsx | INTERNAL_API_URL/api/grammar/topics/${topicSlug}/lessons | fetchWithAuth + forwarded cookie | VERIFIED | Relay auth pattern confirmed |
| [lesson]/page.tsx | INTERNAL_API_URL/api/grammar/lessons/${lessonSlug} | fetchWithAuth + forwarded cookie | VERIFIED | Both fetch helpers use relay auth |
| grammar.service.ts | grammarProgress.upsert | masteryPct on 0-100 scale | VERIFIED | Line 238: `(newCorrect / newAttempts) * 100` |
| grammar-session-results.tsx | masteryPct | Progress value prop | VERIFIED | `value={masteryPct}` — direct pass, no arithmetic. Fix confirmed. |

---

### Requirements Coverage

| Requirement | Plans | Description | Status | Evidence |
|-------------|-------|-------------|--------|----------|
| GRAM-01 | 01, 02, 04, 06 | Browse 10 grammar areas, topics, lessons | SATISFIED | All 4 browse pages use relay auth; area grid, topic list, lesson list built and wired |
| GRAM-02 | 02, 03, 05 | Lesson explanation rendered before exercises | SATISFIED (pending human) | ExplanationView + "Start Practice" gate confirmed |
| GRAM-03 | 01, 03, 05 | ≥3 of 5 exercise types in carousel | SATISFIED | All 5 types built; renderExercise switch covers all 5 |
| GRAM-04 | 02, 05, 06 | Session completion stores score + updates mastery | SATISFIED | Service stores 0-100; topic page displays correctly; results screen now also correct (no double-multiply) |
| GRAM-05 | 01 | ≥20 questions per topic in seed data | SATISFIED | grammar.json: all topics 21+ questions |
| GRAM-06 | 02, 04, 05 | Weak-question re-attempt session | SATISFIED (pending human) | getWeakQuestions() built; review=weak param consumed; filtered session skips explanation |

---

### Anti-Patterns Found

None. The previous BLOCKER (`masteryPct * 100` in grammar-session-results.tsx) is resolved. No new anti-patterns detected in the changed file.

---

### Human Verification Required

#### 1. End-to-End Grammar Lesson Flow

**Test:** With stack running, log in, navigate /grammar then select an area, then a topic, then a lesson. Click "Start Practice". Complete the carousel encountering at least 3 distinct exercise types. Verify DragAndDrop works with mouse and touch. Reach the completion screen.
**Expected:** 10-area grid visible; area/topic navigation works; explanation card appears before first exercise; carousel advances one question at a time; completion screen shows correct mastery % in 0-100% range (e.g., 80% for 8/10 correct — not 8000%); topic page mastery bar updates on return.
**Why human:** Visual rendering, touch interaction, and live DB data flow from seeded content cannot be verified programmatically.

#### 2. Weak-Review Session Flow

**Test:** After completing a lesson with some incorrect answers, return to the topic page. Confirm "Review weak exercises" button is visible. Click it. Confirm the URL contains `?review=weak`, the explanation phase is skipped, and only previously-wrong questions appear.
**Expected:** Filtered session starts immediately in exercises phase; questions are only those answered incorrectly in prior sessions.
**Why human:** Filtering logic depends on DB state after a real session; cannot verify without running the app.

---

## Gaps Summary

No automated gaps remain. All 15 must-have truths are VERIFIED.

The previously reported BLOCKER — `masteryPct * 100` double-multiply in grammar-session-results.tsx — is confirmed resolved. Line 67 is `value={masteryPct}` and line 69 is `{Math.round(masteryPct)}%`. The full mastery data path is now correct end-to-end: service computes and stores 0-100, the topic page displays 0-100, and the results screen displays 0-100.

Phase 04 is code-complete and awaiting human verification of visual rendering, exercise interaction, and live data flow.

---

_Verified: 2026-06-14T11:00:00Z_
_Verifier: Claude (gsd-verifier)_
