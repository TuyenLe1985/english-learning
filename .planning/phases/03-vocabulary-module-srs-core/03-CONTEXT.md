# Phase 3: Vocabulary Module + SRS Core - Context

**Gathered:** 2026-06-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can browse 8 vocabulary categories (business, travel, technology, education, health, daily life, social topics, academic English), open individual word entries to see full detail (definition, pronunciation, examples, synonyms, usage), and practice words through a mixed-exercise session. After practice, users can mark words as "learned" to enter them into an FSRS-based spaced-repetition schedule. Due cards surface in a dedicated review queue where Again/Hard/Good/Easy ratings reschedule each card. Users can also view their personal vocabulary list filtered by SRS status.

**Deliverables:**
- NestJS VocabularyModule: endpoints for category browse, word list (paginated), word detail, add to SRS, vocabulary list by status
- NestJS SrsModule: review queue endpoint (DB query `WHERE due <= NOW()`), submit review endpoint (FSRS rescheduling via ts-fsrs), session result endpoint
- Next.js vocabulary routes: `/vocabulary` (category grid), `/vocabulary/[category]` (word list), `/vocabulary/[category]/[wordId]` (word detail)
- Next.js practice session: `/vocabulary/[category]/practice` — mixed 10-word session with 6 exercise types
- Next.js review queue: `/review` — due cards with flip mechanic and A/H/G/E rating buttons
- Next.js vocabulary list: `/vocabulary/my-words` — personal list filtered by status (new / learning / reviewing / mastered)
- Seed data: 200 vocabulary words (25 per category × 8 categories) across B1/B2/C1 levels, plus 5 due-now SRS cards for a demo user

</domain>

<decisions>
## Implementation Decisions

### SRS Queue Mechanism
- **D-01:** Due cards surfaced via **DB query on request**: NestJS endpoint queries `SrsCard WHERE userId = ? AND due <= NOW()` ordered by `due ASC`. No BullMQ delayed jobs for Phase 3. BullMQ stays on the stack for future notification jobs (Phase 7+ streak/reminder notifications) but is NOT used to surface due cards.
- **D-02:** After a review session, **write next `due` to DB only**. ts-fsrs computes next scheduling (stability, difficulty, elapsedDays, scheduledDays, state, lastReview) → single `UPDATE SrsCard SET due = ?, stability = ?, ...`. No BullMQ job enqueued.
- **D-03:** FSRS algorithm implemented via **`ts-fsrs` npm package**. Use `createEmptyCard()` when a word is first added to SRS. Use `fsrs.repeat(card, now)` after each review to get the next scheduling for each rating (Again/Hard/Good/Easy). The schema fields already match ts-fsrs `Card` interface exactly (D-09 from Phase 1).
- **D-04:** **Review session cap: 20 cards maximum** per session. If more than 20 cards are due, show the 20 oldest (ORDER BY due ASC). User can start another session immediately after to review more.

### Practice Session Design
- **D-05:** Practice sessions are **mixed type** — system randomly assigns one of the 6 exercise types (flashcard, matching, cloze, context selection, synonym ID, recall) to each word in the queue. The session presents 10 words. Users cannot pick the exercise type — variety is the default.
- **D-06:** **10 words per practice session**. Words are randomly sampled from the selected category. User can start another session immediately to practice more words.
- **D-07:** Session ends with a **results screen + Add to SRS prompt**. Results screen shows score (X/10 correct), time taken, and a list of words the user got wrong or was uncertain about. A single-tap prompt: "Add these words to your review schedule?" — adds the listed words to SRS as new cards (state: New, due: now). User can deselect individual words before confirming.
- **D-08:** Matching exercise uses a **4-item tap grid**: 4 words displayed on the left column, 4 shuffled definitions on the right. User taps a word then taps its matching definition. Matched pairs disappear with a brief animation. All 4 matched = exercise complete. (One matching exercise covers 4 words; a 10-word session includes at most 2 matching exercises to avoid repetition.)

### Vocabulary Browse + Word Detail UX
- **D-09:** Three-level navigation: **`/vocabulary`** (category grid, 2×4 layout, 8 category cards with icon + name + word count) → **`/vocabulary/[category]`** (paginated word list for that category) → **`/vocabulary/[category]/[wordId]`** (full word detail page). All three routes are deep-linkable.
- **D-10:** Word detail pronunciation: **phonetic key text always shown** (`/prəˈnʌnsieɪʃən/`) + **play button** beside it. Play button triggers `audioStorageKey` via R2 public URL if it exists; falls back to `window.speechSynthesis.speak(new SpeechSynthesisUtterance(word))` if `audioStorageKey` is null. TTS generation for `audioStorageKey` is a Phase 5 content pipeline concern — Phase 3 wires the UI playback only.
- **D-11:** Two SRS entry points: (1) **"Practice this set"** button on the category word list page starts a 10-word practice session for that category; (2) **"Mark as learned"** button on the individual word detail page adds that single word directly to SRS as a new card without going through a practice session.
- **D-12:** Word list pagination: **20 words per page**, sorted alphabetically (A–Z) by default. Standard LIMIT/OFFSET. Prev/Next page controls at the bottom. No infinite scroll in Phase 3.

### Phase 3 Seed Data
- **D-13:** Seed **25 words × 8 categories = 200 vocabulary words** total. Enough to demonstrate all features (browsing, 2-page pagination per category, practice sessions, SRS queue) without requiring Phase 5's full content pipeline.
- **D-14:** Seed data stored as **`apps/api/prisma/seed-data/vocabulary.json`** — a JSON array of `{word, definition, partOfSpeech, examples[], synonyms[], pronunciationKey, cefrLevel, category}` objects. Seed script reads this file and calls `prisma.vocabularyWord.createMany()`.
- **D-15:** Seed script also creates **one demo user** (`demo@example.com`, password `demo1234` bcrypt-hashed, `emailVerified: new Date()`) with **5 SrsCards with `due = new Date(Date.now() - 3600000)`** (1 hour past due) across different categories. Allows immediate review queue testing without manually marking words. Demo user is development-only — seed should check `NODE_ENV !== 'production'` before creating it.
- **D-16:** CEFR distribution across seed words: **~8-9 words per level per category** (B1/B2/C1). Validates CEFR filtering in Phase 8 and demonstrates level progression from day 1.

### Claude's Discretion
- NestJS module structure for vocabulary and SRS (VocabularyModule, SrsModule, or combined — researcher to evaluate)
- Specific NestJS endpoint paths (e.g., `GET /api/vocabulary/categories`, `GET /api/vocabulary/:category/words`, `GET /api/srs/queue`, `POST /api/srs/review`)
- React Query setup for vocabulary list and review queue (cache strategy, stale time)
- Session state management during practice (in-memory in React state vs. stored in DB mid-session)
- Word detail page layout (tab-based vs. scrollable sections for definition/examples/synonyms/usage)
- Specific Tailwind/shadcn components for exercise types (Card, Badge, Button variants)
- Category icon set (Lucide icons or emoji in the 2×4 category grid)
- Animation library for flashcard flip (CSS transform or Framer Motion — Framer Motion already in the tech stack)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Scope and Requirements
- `.planning/ROADMAP.md` — Phase 3 goal, success criteria (5 criteria), MVP mode, depends-on Phase 2, VOCAB-01–07 requirement IDs
- `.planning/REQUIREMENTS.md` — VOCAB-01 (categories), VOCAB-02 (word detail fields), VOCAB-03 (6 exercise types), VOCAB-04 (mark as learned + SRS entry), VOCAB-05 (FSRS intervals), VOCAB-06 (review queue with A/H/G/E ratings), VOCAB-07 (vocabulary list with status filter) — full acceptance criteria
- `.planning/PROJECT.md` — Core value, tech stack decisions, constraints

### Technology Stack (LOCKED)
- `CLAUDE.md` §Technology Stack — Version pins and compatibility table (Next.js 14, NestJS 11, TailwindCSS 3.x, React 18.x)
- `CLAUDE.md` §SRS (Spaced Repetition) Scheduling with BullMQ — Documents the original BullMQ approach; **Phase 3 uses DB query instead** (D-01 above overrides this for surfacing due cards)

### Database Schema (already migrated — read before writing any code)
- `packages/database/prisma/schema.prisma` — Phase 3 models: `VocabularyWord` (word, definition, partOfSpeech, examples[], synonyms[], pronunciationKey, audioStorageKey, cefrLevel, category, frequency), `UserVocabularyItem` (userId, wordId, addedAt, contextSentence), `SrsCard` (userId, wordId, userVocabItemId, due, stability, difficulty, elapsedDays, scheduledDays, reps, lapses, state, lastReview). All fields already match ts-fsrs `Card` interface.

### Prior Phase Decisions
- `.planning/phases/01-foundation-infrastructure/01-CONTEXT.md` — D-09 (FSRS algorithm confirmed, schema fields), D-10 (audio stored as R2 storage keys not full URLs), D-11 (env var strategy)
- `.planning/phases/02-authentication-user-profile/02-CONTEXT.md` — D-12/D-13 (NestJS JWT guard pattern, shared JWT secret), D-13 (JWT payload: userId, role, cefrLevel), D-15 (responsibility split: NestJS owns API endpoints)
- `.planning/STATE.md` — §Accumulated Context/Decisions (two-Redis split, FSRS over SM-2 rationale, VOCAB-08 deferred to Phase 5)

### Existing Code Patterns
- `apps/api/src/app.module.ts` — Module registration pattern; add VocabularyModule and SrsModule here
- `apps/api/src/auth/jwt-auth.guard.ts` — JwtAuthGuard import path and usage pattern for protected endpoints
- `apps/api/src/prisma/prisma.service.ts` — PrismaService injection pattern
- `apps/web/src/lib/api-client.ts` — Axios client for NestJS API calls (with JWT header injection)
- `apps/web/src/components/cefr-badge.tsx` — CEFR level badge component, reuse on word detail page and word list items

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `apps/web/src/components/cefr-badge.tsx` — CEFR level badge already built in Phase 2; use on word list items and word detail page
- `apps/web/src/lib/api-client.ts` — Axios instance with auth header injection; all NestJS API calls go through this
- `apps/api/src/prisma/prisma.service.ts` — PrismaService already available in all NestJS modules via PrismaModule (global)
- `apps/api/src/auth/jwt-auth.guard.ts` — JwtAuthGuard for protecting all vocabulary and SRS endpoints
- `packages/shared/src/index.ts` — Barrel export; add vocabulary/SRS DTOs and Zod schemas here (VocabularyWordDto, SrsCardDto, ReviewSubmitDto, etc.)

### Established Patterns
- NestJS global prefix `/api` — all vocabulary endpoints at `/api/vocabulary/*`, SRS at `/api/srs/*`
- Global ConfigModule — env vars accessible via `ConfigService` anywhere in NestJS
- Global ValidationPipe (`whitelist: true`, `transform: true`) — all DTOs auto-validated
- shadcn/ui New York theme with zinc color palette (established in Phase 2) — use the same component variants
- Dashboard layout at `apps/web/src/app/(dashboard)/layout.tsx` — vocabulary and review pages go in `(dashboard)` route group

### Integration Points
- `apps/web/src/app/(dashboard)/` — New routes: `/vocabulary`, `/vocabulary/[category]`, `/vocabulary/[category]/[wordId]`, `/vocabulary/[category]/practice`, `/review`, `/vocabulary/my-words`
- `apps/api/src/app.module.ts` — Add `VocabularyModule` and `SrsModule` to imports array
- `packages/database/prisma/schema.prisma` — Models already exist; Phase 3 adds no new schema (read-only use of Phase 1 schema)
- Future: Phase 6 `LIST-06` will call the SRS enrollment endpoint from the listening transcript — the `POST /api/srs/enroll` endpoint built here must accept `contextSentence` to support that integration

</code_context>

<specifics>
## Specific Ideas

- **ts-fsrs usage**: `import { createEmptyCard, fsrs, Rating } from 'ts-fsrs'`. New card: `createEmptyCard()` → maps to `SrsCard` fields. After review: `const scheduling = fsrs.repeat(card, now)` returns `{ Again: Card, Hard: Card, Good: Card, Easy: Card }` — pick the appropriate rating's `Card` and update the DB row.
- **Pronunciation fallback**: `const audio = new Audio(r2Url); audio.play().catch(() => window.speechSynthesis.speak(new SpeechSynthesisUtterance(word)))` — try R2 first, fall back to browser TTS silently.
- **Demo user seed**: `email: 'demo@example.com'`, `password: bcrypt.hash('demo1234', 12)`, `emailVerified: new Date()`, `cefrLevel: 'B1'`. 5 SrsCards with `due = new Date(Date.now() - 3600000)`. Guard with `if (process.env.NODE_ENV !== 'production')`.
- **Flashcard flip animation**: Use CSS `transform: rotateY(180deg)` with a `transition` or Framer Motion `variants` — Framer Motion is already in the tech stack from CLAUDE.md.
- **Matching exercise state**: Track which word is "selected" (first tap) and which definition is "selected" (second tap) in React state. On match: animate pair out. On mismatch: shake animation, deselect both.
- **Session state**: Keep practice session state (current question index, answers, score) in React component state only — no API calls mid-session. Submit the entire session result in one `POST /api/vocabulary/session/complete` at the end.

</specifics>

<deferred>
## Deferred Ideas

- **VOCAB-08 (tap-to-SRS from reading passages)**: Deferred to Phase 5 as per STATE.md — the SRS enrollment endpoint built in Phase 3 must accept `contextSentence`, but the reading UI trigger is Phase 5 work.
- **BullMQ SRS notification jobs**: The original STATE.md decision was to use BullMQ for SRS. Phase 3 overrides this for the *surfacing* mechanism (DB query is sufficient). BullMQ notification jobs (fire when due → send push notification / badge refresh) are deferred to Phase 7 when the notification system is built.
- **Pronunciation audio generation via Google TTS**: The `audioStorageKey` field in `VocabularyWord` is ready. Actual TTS generation (calling Google Cloud TTS, uploading to R2) is the Phase 5 content pipeline's responsibility. Phase 3 only wires the playback UI.
- **Infinite scroll for word list**: Deferred — paginated list (20/page) is sufficient for Phase 3. If Phase 5's 600+ words per category makes pagination feel heavy, revisit with `useInfiniteQuery` in Phase 5 or a future UX pass.
- **User-defined session length** (5 / 10 / 20 words): Deferred — 10 words fixed is sufficient for v1. Add length selector in a UX polish phase if analytics show demand.

</deferred>

---

*Phase: 3-Vocabulary Module + SRS Core*
*Context gathered: 2026-06-12*
