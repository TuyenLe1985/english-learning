# Phase 4: Grammar Module - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-13
**Phase:** 04-Grammar Module
**Areas discussed:** Browse navigation, Lesson page flow, Assessment quiz design, Drag-and-drop exercise

---

## Browse Navigation

**Q1: How should the grammar browse hierarchy work?**

| Option | Description | Selected |
|--------|-------------|----------|
| Full 3-level: /grammar → /grammar/[area] → /grammar/[area]/[topic] | Main page shows 10 area cards. Area page lists topics with CEFR badges. Topic page lists lessons + mastery bar. Clean separation. | ✓ |
| Flat 2-level: /grammar → /grammar/[topic] | Main page shows all topics grouped under area headers (accordion or section dividers). | |
| 2-level with area as filter | Main page has area filter tabs/pills at top, shows filtered topic cards below. | |

**User's choice:** Full 3-level hierarchy
**Notes:** Clean separation — each level has one job.

---

**Q2: On the topic page, what does the user see?**

| Option | Description | Selected |
|--------|-------------|----------|
| Lesson list + topic mastery bar | Shows each lesson as a card (title, exercise count, locked/unlocked state). Topic-level mastery percentage at top. | ✓ |
| Topic page IS the lesson | Each topic has one combined page: explanation → exercises → quiz. | |
| You decide | Claude picks the most natural pattern. | |

**User's choice:** Lesson list + topic mastery bar

---

**Q3: Should grammar areas use the same 2×4 card grid as vocabulary categories?**

| Option | Description | Selected |
|--------|-------------|----------|
| Same 2×4 grid, Lucide icons | Reuse the CategoryCard component pattern — consistent UI, fast to implement. | ✓ |
| Wider 5×2 grid (10 areas) | Fits exactly 10 areas cleanly on desktop. | |
| List with area descriptions | Vertical list: area name + short description + topic count. | |

**User's choice:** Same 2×4 grid, Lucide icons

---

## Lesson Page Flow

**Q1: How should the lesson page flow work?**

| Option | Description | Selected |
|--------|-------------|----------|
| Linear sequential: explanation → exercises → quiz | Read explanation, click "Start Practice" → carousel → completion. One-directional. | ✓ |
| Tabbed: Explanation \| Practice \| Quiz | Three tabs — user navigates freely. | |
| All on one page | Single long page, scroll through explanation then inline exercises. | |

**User's choice:** Linear sequential

---

**Q2: What are the "visual learning blocks" in GRAM-02's explanation section?**

| Option | Description | Selected |
|--------|-------------|----------|
| Structured rule cards + example sentences | Styled card with highlighted rule text + formatted examples from the schema fields. | ✓ |
| Conjugation/structure tables | Tables for verb tenses and conditionals. More visual but more work. | |
| You decide | Claude picks the simplest approach satisfying GRAM-02. | |

**User's choice:** Structured rule cards + example sentences

---

**Q3: Should grammar exercises be one-at-a-time carousel or shown as a list?**

| Option | Description | Selected |
|--------|-------------|----------|
| One-at-a-time carousel | Matches the vocab PracticeSession pattern. Progress bar. Mobile-friendly. | ✓ |
| All exercises as a scrollable list | User sees all questions at once and scrolls through. | |
| Paginated groups of 5 | Show 5 exercises per page. | |

**User's choice:** One-at-a-time carousel

---

## Assessment Quiz Design

**Q1: What distinguishes the "assessment quiz" from practice exercises?**

| Option | Description | Selected |
|--------|-------------|----------|
| All exercises in the lesson ARE the assessment | Every answer recorded as GrammarAttempt. masteryPct updated at session end. No separate quiz step. | ✓ |
| Separate final quiz: 10 random questions | Distinct quiz phase after practice, only quiz score counts toward masteryPct. | |
| Exercises = practice (ungraded), quiz = graded final | Practice doesn't record attempts; only final quiz does. | |

**User's choice:** All exercises are the assessment

---

**Q2: How should masteryPct be calculated?**

| Option | Description | Selected |
|--------|-------------|----------|
| Running correct/attempts ratio across ALL attempts | masteryPct = total correct / total attempts. Improves with re-attempts. Uses existing GrammarProgress fields. | ✓ |
| Latest session score only | masteryPct = most recent session score. Simpler but volatile. | |
| Best session score per lesson, averaged | Most complex — requires per-lesson scoring in DB. | |

**User's choice:** Running correct/attempts ratio

---

**Q3: For GRAM-06 (re-attempt weak exercises), what does the experience look like?**

| Option | Description | Selected |
|--------|-------------|----------|
| Filtered session: only previously-wrong questions | "Review weak exercises" button → carousel of incorrectly-answered questions from GrammarAttempt history. | ✓ |
| Full lesson re-take | Re-attempt button returns to lesson page; redo all exercises from scratch. | |
| You decide | Claude picks the implementation that best satisfies GRAM-06. | |

**User's choice:** Filtered session with previously-wrong questions

---

## Drag-and-Drop Exercise

**Q1: How should drag-and-drop be implemented?**

| Option | Description | Selected |
|--------|-------------|----------|
| Click-to-place word bank | Tap-to-place interaction, no real DnD. Works perfectly on mobile, simpler. | |
| Real drag-and-drop with dnd-kit | Use @dnd-kit/core — true drag on desktop, touch-drag on mobile. New dependency. | ✓ |
| Defer DRAG_AND_DROP to Phase 5 | Implement only 4 other exercise types for Phase 4. | |

**User's choice:** Real drag-and-drop with dnd-kit

---

**Q2: What is the drag-and-drop interaction format?**

| Option | Description | Selected |
|--------|-------------|----------|
| Word bank → blanks in a sentence | Sentence has blanks, word bank below. User drags correct word into blank slot. | ✓ |
| Scrambled sentence reordering | All words shuffled, user drags into correct order. | |
| Both, depending on the question | Claude decides per-question based on prompt and distractors. | |

**User's choice:** Word bank → blanks in a sentence

---

## Claude's Discretion

- NestJS module structure for GrammarModule (controller, service, DTOs)
- Specific endpoint paths
- React Query cache strategy for grammar data
- Specific Lucide icons for the 10 grammar areas
- Seed data structure and exact question counts
- Whether sentence transformation and error correction exercises share a component

## Deferred Ideas

- Conjugation/structure tables in explanations — future UX polish phase
- Progressive lesson unlocking — Phase 4 ships all lessons unlocked by default
- Grammar XP events — data is wired (GrammarAttempt rows), XP increment ships in Phase 7 Gamification
