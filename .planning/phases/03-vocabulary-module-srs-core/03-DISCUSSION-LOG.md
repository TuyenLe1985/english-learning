# Phase 3: Vocabulary Module + SRS Core - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-12
**Phase:** 3-Vocabulary Module + SRS Core
**Areas discussed:** SRS queue mechanism, Practice session design, Vocabulary browse + word detail UX, Phase 3 seed data strategy

---

## SRS Queue Mechanism

### Q1: How should due vocabulary cards be surfaced to the user?

| Option | Description | Selected |
|--------|-------------|----------|
| DB query on request | NestJS queries SrsCard WHERE userId = ? AND due <= NOW(). Simple, no job overhead. | ✓ |
| BullMQ delayed jobs | Each card schedules a BullMQ job that fires when due. Complex: job dedup, crash recovery, Redis memory for 5,000 jobs. | |

**User's choice:** DB query on request
**Notes:** Overrides the original STATE.md/CLAUDE.md BullMQ-for-SRS decision for the *surfacing* mechanism. BullMQ remains available for future notification jobs (Phase 7+).

---

### Q2: After a review session completes, how should the next review be scheduled?

| Option | Description | Selected |
|--------|-------------|----------|
| Write next due to DB only | FSRS computes next due date → UPDATE SrsCard. No BullMQ job. | ✓ |
| Write to DB + enqueue BullMQ notification job | After updating DB, also enqueue a BullMQ job for the due date. Adds value when notifications are built. | |

**User's choice:** Write to DB only
**Notes:** Consistent with DB query approach above. Notification jobs deferred to Phase 7.

---

### Q3: Which library should implement the FSRS algorithm?

| Option | Description | Selected |
|--------|-------------|----------|
| ts-fsrs npm package | Battle-tested TypeScript FSRS implementation. createEmptyCard(), fsrs.repeat(card, now). | ✓ |
| Custom FSRS implementation | Write the algorithm directly in NestJS. Full control but handles edge cases that ts-fsrs already covers. | |

**User's choice:** ts-fsrs npm package

---

### Q4: Should there be a session cap on the review queue?

| Option | Description | Selected |
|--------|-------------|----------|
| Cap at 20 cards per session | Show at most 20 due cards. Prevents overwhelm after a missed day. Common in Anki. | ✓ |
| Show all due cards | All due cards shown. Simpler logic but can be overwhelming. | |

**User's choice:** Cap at 20 cards per session

---

## Practice Session Design

### Q1: How should a vocabulary practice session work?

| Option | Description | Selected |
|--------|-------------|----------|
| Mixed session — system rotates exercise types | 10 words, each gets a randomly chosen exercise type. Variety keeps engagement high. | ✓ |
| User picks one exercise type per session | User chooses Flashcards / Matching / Cloze etc. before starting. Cleaner for deliberate practice. | |
| Two-phase: recognition first, then production | Recognition exercises first, then production. Follows cognitive load theory. | |

**User's choice:** Mixed session

---

### Q2: How many words should a single practice session cover?

| Option | Description | Selected |
|--------|-------------|----------|
| 10 words per session | Standard, ~5-7 minutes. User can start another session for more. | ✓ |
| User-defined (5 / 10 / 20) | More control but adds friction to the start flow. | |
| Entire category in one session | Comprehensive but potentially 50+ words per session. | |

**User's choice:** 10 words per session

---

### Q3: After completing a practice session, what happens?

| Option | Description | Selected |
|--------|-------------|----------|
| Results screen + Add to SRS prompt | Score card (X/10 correct, time taken) + prompt to add wrong/unknown words to SRS. | ✓ |
| Auto-add all 10 words to SRS | All practiced words enter SRS automatically. Simpler but may add already-known words. | |
| Results screen only, SRS entry is separate | View score; user manually marks individual words from the word detail page. | |

**User's choice:** Results screen + Add to SRS prompt
**Notes:** User can deselect individual words from the "add to SRS" prompt before confirming.

---

### Q4: How should the matching exercise type work?

| Option | Description | Selected |
|--------|-------------|----------|
| 4-item tap grid | 4 words on left, 4 definitions shuffled on right. Tap word → tap definition. Pairs disappear on match. | ✓ |
| Drag-and-drop pairs | Drag words onto definitions. Desktop-friendly, tricky on mobile. | |

**User's choice:** 4-item tap grid (familiar from Duolingo/Quizlet)

---

## Vocabulary Browse + Word Detail UX

### Q1: How should the vocabulary browse page be organized?

| Option | Description | Selected |
|--------|-------------|----------|
| Category grid → word list → word detail page | 2×4 grid → paginated list → detail page. Three routes, deep-linkable. | ✓ |
| Category filter + flat word list | Single browse page with sidebar/tab category filter. | |
| Category grid → word list with expandable rows | Rows expand inline to show detail. No separate page. | |

**User's choice:** Category grid → word list → word detail page (3 routes)

---

### Q2: How should pronunciation be handled on the word detail page?

| Option | Description | Selected |
|--------|-------------|----------|
| Phonetic text + play button, fallback to browser Speech API | /phonetic/ always shown. Play triggers R2 audio or falls back to window.speechSynthesis. | ✓ |
| Pronunciation key text only (no audio) | /phonetic/ only. Simple, no audio complexity. | |
| Audio only, no phonetic text | Play button only. Not viable for Phase 3 hand-seeded data. | |

**User's choice:** Phonetic text + play button with Speech API fallback
**Notes:** TTS generation for audioStorageKey is a Phase 5 pipeline concern.

---

### Q3: Where does the user start a practice session and mark a word as learned?

| Option | Description | Selected |
|--------|-------------|----------|
| Both from category list and word detail page | "Practice this set" on list + "Mark as learned" on detail. Two user intents, two entry points. | ✓ |
| Only from category list | Practice button on category list only. Word detail is view-only. | |
| Only from word detail page | Per-word actions only. No session-level practice from category view. | |

**User's choice:** Both entry points

---

### Q4: How should the word list within a category handle loading?

| Option | Description | Selected |
|--------|-------------|----------|
| Paginated list, 20 words per page | Standard LIMIT/OFFSET pagination. Prev/Next controls. Alphabetical default. | ✓ |
| Infinite scroll, 20 words on demand | useInfiniteQuery. Better mobile UX, more complex. | |
| Single page, all words visible | Fine for 20-50 words but breaks with 600+ words post-Phase 5. | |

**User's choice:** Paginated list, 20 words per page

---

## Phase 3 Seed Data Strategy

### Q1: How much vocabulary data should the seed script create?

| Option | Description | Selected |
|--------|-------------|----------|
| 25 words × 8 categories = 200 words | Enough to demo all features. Fits in a single JSON seed file. | ✓ |
| 50 words × 8 categories = 400 words | Better pagination testing but larger to hand-craft. | |
| 10 words × 8 categories = 80 words | Minimal. Enough to test exercise types but feels sparse. | |

**User's choice:** 200 words (25 per category)

---

### Q2: Where should the seed data be stored?

| Option | Description | Selected |
|--------|-------------|----------|
| JSON file in apps/api/prisma/seed-data/vocabulary.json | Hand-crafted JSON array. Seed script reads and calls createMany(). Easy to review. | ✓ |
| TypeScript constant in seed.ts | Inline array in seed.ts. Makes the file very large. | |
| Fetch from a public word API at seed time | Reduces hand-crafting but adds network dependency and rate limits. | |

**User's choice:** JSON file at apps/api/prisma/seed-data/vocabulary.json

---

### Q3: Should the seed script pre-create SRS cards for testing?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — seed 5 due-now cards per demo user | Demo user (demo@example.com) with 5 cards due = NOW() - 1h. Immediate review queue testing. Dev-only. | ✓ |
| No — review queue requires real user interaction | No pre-seeded cards. More realistic but creates testing friction. | |

**User's choice:** Yes, seed 5 due-now SRS cards for a demo user

---

### Q4: Should seed data include CEFR distribution?

| Option | Description | Selected |
|--------|-------------|----------|
| Distribute across B1 / B2 / C1 | ~8-9 words per level per category. Validates CEFR filtering from day 1. | ✓ |
| All B1 for simplicity | Simpler to craft but misses CEFR field validation opportunity. | |

**User's choice:** Distribute across B1/B2/C1

---

## Claude's Discretion

- NestJS module structure (VocabularyModule, SrsModule, or combined)
- Specific API endpoint paths
- React Query cache strategy and stale times
- Session state management during practice (React state only, no mid-session API calls)
- Word detail page layout (tabs vs. scrollable sections)
- Category icon set (Lucide icons or emoji)
- Framer Motion vs. CSS-only flashcard flip animation

## Deferred Ideas

- VOCAB-08 (tap-to-SRS from reading passages) — deferred to Phase 5 as per STATE.md
- BullMQ notification jobs for SRS due dates — deferred to Phase 7 (notifications system)
- Pronunciation audio generation via Google TTS — deferred to Phase 5 content pipeline
- Infinite scroll for word list — deferred; paginated list sufficient for Phase 3
- User-defined session length (5/10/20 words) — deferred; fixed 10 is sufficient for v1
