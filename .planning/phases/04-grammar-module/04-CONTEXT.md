# Phase 4: Grammar Module - Context

**Gathered:** 2026-06-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can browse 10 grammar topic areas through a 3-level navigation hierarchy (/grammar → /grammar/[area] → /grammar/[area]/[topic]), open a topic to see its lesson list with mastery bar, then study each lesson through a linear sequential flow: explanation with structured rule cards → one-at-a-time exercise carousel → session completion with score stored. Every exercise answer is recorded as a GrammarAttempt, mastery percentage is computed as a running correct/attempts ratio across all attempts for the topic, and a "Review weak exercises" button surfaces only previously-wrong questions for targeted re-attempt.

**Deliverables:**
- NestJS GrammarModule: endpoints for area list, topic list by area, lesson list by topic, lesson detail with questions, session completion (records GrammarAttempts + updates GrammarProgress), weak-question query
- Next.js grammar routes: `/grammar` (area grid), `/grammar/[area]` (topic list), `/grammar/[area]/[topic]` (lesson list + mastery bar), `/grammar/[area]/[topic]/[lesson]` (lesson page with explanation → exercise carousel)
- Grammar exercise components: MultipleChoiceExercise, FillInTheBlankExercise, SentenceTransformationExercise, ErrorCorrectionExercise, DragAndDropExercise (5 types, all implemented)
- Seed data: 10 grammar areas × multiple topics × lessons × ≥20 questions per topic (minimum viable for demo)

</domain>

<decisions>
## Implementation Decisions

### Browse Navigation
- **D-01:** **Full 3-level hierarchy**: `/grammar` (10 area cards) → `/grammar/[area]` (topic list for that area) → `/grammar/[area]/[topic]` (lesson list + topic mastery bar). Same depth separation as vocabulary's category → word pattern, extended by one level.
- **D-02:** **Topic page shows lesson list + mastery bar**: Each topic page renders a list of lesson cards (title, question count, locked/unlocked state) with the topic-level `masteryPct` from `GrammarProgress` shown at the top.
- **D-03:** **Same 2×4 grid layout with Lucide icons** for the `/grammar` area page. Reuse the `CategoryCard` component pattern — each card shows icon, area name, topic count. Consistent with vocabulary browse.

### Lesson Page Flow
- **D-04:** **Linear sequential flow**: Explanation section at top (scrollable, rendered rule cards + examples) → user clicks "Start Practice" → one-at-a-time exercise carousel → session completion screen. One-directional flow, no tabbed navigation.
- **D-05:** **Visual learning blocks** = structured rule cards + example sentences rendered from the `GrammarLesson.explanation` (text) and `examples[]` (string array) fields already in the schema. No custom table components in Phase 4 — styled card with highlighted rule text and formatted example sentences.
- **D-06:** **One-at-a-time exercise carousel**, matching the vocab `PracticeSession` component pattern. Progress bar at top (n/total). Exercise components receive the current question and emit correct/incorrect. Session orchestrator component manages state and submits as one batch on completion.

### Assessment Quiz Design
- **D-07:** **All exercises in the lesson ARE the assessment** — no separate quiz step. Every answer submitted in a lesson session is recorded as a `GrammarAttempt` row. When the session ends, the batch is submitted and `GrammarProgress.masteryPct` is updated in one API call.
- **D-08:** **Mastery calculation = running ratio**: `masteryPct = GrammarProgress.correct / GrammarProgress.attempts` accumulated across ALL lesson attempts for the topic. Each new session adds to `correct` and `attempts` totals — mastery improves with re-attempts. The `GrammarProgress` table already has these fields.
- **D-09:** **Weak exercise re-attempt = filtered session**: Topic page shows a "Review weak exercises" button visible when the user has prior attempts with incorrect answers. Button launches an exercise carousel session containing only questions answered incorrectly in the user's most recent attempt for that topic (queried from `GrammarAttempt WHERE isCorrect = false AND userId = ?` for that topic's lessons, ordered by most recent).

### Drag-and-Drop Exercise
- **D-10:** **Real drag-and-drop using `@dnd-kit/core`**: Add `@dnd-kit/core` and `@dnd-kit/sortable` as new dependencies in `apps/web`. The exercise shows a sentence with blanks and a word bank below. User drags the correct word into the blank slot. Supports both mouse (desktop) and touch (mobile via dnd-kit's pointer sensor).
- **D-11:** **Word bank → blanks format**: Sentence has one or more `___` blanks. Word bank shows the correct word plus distractors from `GrammarQuestion.distractors[]`. User drags a word from the bank into the active blank. Placing a word in the wrong blank allows re-placement — the word returns to the bank.

### Claude's Discretion
- NestJS module structure for GrammarModule (controller, service, DTOs — researcher to evaluate patterns from VocabularyModule)
- Specific NestJS endpoint paths (e.g., `GET /api/grammar/areas`, `GET /api/grammar/areas/:areaId/topics`, `GET /api/grammar/lessons/:lessonId/questions`, `POST /api/grammar/sessions/complete`)
- React Query cache strategy for grammar lesson and area data
- Session state management during exercise carousel (in-memory React state, same pattern as vocab practice session)
- Specific Lucide icons for the 10 grammar areas
- Seed data structure (JSON file in `apps/api/prisma/seed-data/grammar.json`) and exact question counts per topic/lesson
- Whether sentence transformation and error correction exercises share a common component or have separate implementations

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Scope and Requirements
- `.planning/ROADMAP.md` — Phase 4 goal, success criteria (5 criteria), MVP mode, depends-on Phase 3, GRAM-01–06 requirement IDs
- `.planning/REQUIREMENTS.md` — GRAM-01 (10 topic areas), GRAM-02 (explanation + visual blocks), GRAM-03 (≥3 exercise types of 5), GRAM-04 (assessment quiz → score stored, mastery % visible), GRAM-05 (≥20 questions per topic), GRAM-06 (re-attempt weak exercises) — full acceptance criteria
- `.planning/PROJECT.md` — Core value, tech stack decisions, constraints

### Technology Stack (LOCKED)
- `CLAUDE.md` §Technology Stack — Version pins and compatibility table (Next.js 14, NestJS 11, TailwindCSS 3.x, React 18.x, shadcn/ui New York/zinc)

### Database Schema (already migrated — read before writing any code)
- `packages/database/prisma/schema.prisma` — Phase 4 models: `GrammarArea` (id, name, description, sortOrder), `GrammarTopic` (id, areaId, title, slug, description, cefrLevel, sortOrder), `GrammarLesson` (id, topicId, title, explanation, examples[], sortOrder), `GrammarQuestion` (id, lessonId, exerciseType, prompt, answer, distractors[], explanation, difficulty, xpReward), `GrammarAttempt` (id, questionId, userId, isCorrect, userAnswer, attemptedAt), `GrammarProgress` (id, userId, topicId, masteryPct, attempts, correct, lastAttemptAt). All fields already exist — Phase 4 adds no new schema.
- `packages/database/prisma/schema.prisma` §ExerciseType enum — `MULTIPLE_CHOICE`, `FILL_IN_THE_BLANK`, `SENTENCE_TRANSFORMATION`, `ERROR_CORRECTION`, `DRAG_AND_DROP` are the 5 grammar exercise types

### Prior Phase Decisions
- `.planning/phases/03-vocabulary-module-srs-core/03-CONTEXT.md` — D-05 (practice session design, one-at-a-time carousel), D-06 (session state in React component state, one-batch submission), D-09 (route structure and deep-linkable pages), D-12 (component patterns, shadcn/ui New York/zinc)
- `.planning/phases/02-authentication-user-profile/02-CONTEXT.md` — D-12/D-13 (NestJS JWT guard pattern), D-15 (NestJS owns API endpoints)
- `.planning/STATE.md` — §Accumulated Context/Decisions (XP event infrastructure wired in earlier phases; gamification ships Phase 7)

### Existing Code Patterns (critical — read before implementing)
- `apps/api/src/vocabulary/vocabulary.controller.ts` — Controller pattern for module endpoints; GrammarController should follow the same structure
- `apps/api/src/vocabulary/vocabulary.service.ts` — Service pattern with PrismaService injection; GrammarService follows the same
- `apps/web/src/components/vocabulary/practice-session.tsx` — Session orchestrator pattern (React state for session, one-batch submit). GrammarLesson exercise carousel reuses this exact pattern.
- `apps/web/src/components/vocabulary/category-card.tsx` — Card component for browsable grid items; GrammarAreaCard reuses this pattern with grammar-specific icons
- `apps/web/src/lib/api-client.ts` — Axios client for NestJS API calls (JWT header injection)
- `apps/api/src/auth/jwt-auth.guard.ts` — JwtAuthGuard for all protected grammar endpoints
- `apps/api/src/prisma/prisma.service.ts` — PrismaService injection pattern

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `apps/web/src/components/vocabulary/practice-session.tsx` — Session orchestrator for one-at-a-time exercise carousel; grammar lesson session reuses this architecture (state: currentIndex, answers[], score, elapsed time; submit batch on complete)
- `apps/web/src/components/vocabulary/category-card.tsx` — Browsable card grid component; GrammarAreaCard is the same pattern with different icon map
- `apps/web/src/components/vocabulary/session-results.tsx` — Post-session results screen; can be adapted for grammar lesson completion screen
- `apps/web/src/components/cefr-badge.tsx` — CEFR level badge already built; use on grammar topic cards and lesson headers
- `apps/web/src/lib/api-client.ts` — Axios client with auth header injection; all NestJS API calls go through this
- `apps/api/src/vocabulary/vocabulary.controller.ts` + `vocabulary.service.ts` — Direct template for GrammarController + GrammarService structure
- `packages/shared/src/vocabulary.dto.ts` — DTO pattern; add GrammarAreaDto, GrammarTopicDto, GrammarLessonDto, GrammarQuestionDto, GrammarSessionResultDto here

### Established Patterns
- NestJS global prefix `/api` — all grammar endpoints at `/api/grammar/*`
- Global ValidationPipe (`whitelist: true`, `transform: true`) — all DTOs auto-validated
- shadcn/ui New York theme with zinc color palette — use Card, Badge, Button, Progress components consistently
- Dashboard route group `(dashboard)` — all grammar routes go under `apps/web/src/app/(dashboard)/grammar/`
- Session state in React component state (not DB), batch submit on complete (established Phase 3 D-06)

### Integration Points
- `apps/web/src/app/(dashboard)/` — New routes: `/grammar`, `/grammar/[area]`, `/grammar/[area]/[topic]`, `/grammar/[area]/[topic]/[lesson]`
- `apps/api/src/app.module.ts` — Add `GrammarModule` to imports array (same as VocabularyModule registration)
- `packages/shared/src/index.ts` — Add grammar DTOs to barrel export
- `packages/database/prisma/schema.prisma` — All grammar models already exist; Phase 4 adds no new schema
- Future: Phase 7 Gamification — the `GrammarAttempt` and `GrammarProgress` data feeds XP calculation (GAME-01); ensure GrammarSession completion endpoint is hookable for XP events

</code_context>

<specifics>
## Specific Ideas

- **dnd-kit setup**: `pnpm add @dnd-kit/core @dnd-kit/sortable` in `apps/web`. Use `DndContext` with `PointerSensor` (covers both mouse and touch). `DraggableWord` as the draggable source, `DroppableBlank` as the drop target. On drop: validate match, animate success/failure.
- **Grammar area Lucide icons**: Map 10 areas to Lucide icons — verb tenses → `Clock`, modals → `HelpCircle`, conditionals → `GitBranch`, passive voice → `RefreshCw`, relative clauses → `Link`, reported speech → `MessageSquare`, gerunds/infinitives → `Minus`, articles → `AlignLeft`, prepositions → `MapPin`, linking words → `Shuffle`. Researcher can revise for better semantic match.
- **Session batch endpoint**: `POST /api/grammar/sessions/complete` body: `{ lessonId, attempts: [{ questionId, isCorrect, userAnswer }] }`. NestJS service: (1) `createMany()` GrammarAttempts, (2) upsert GrammarProgress (increment attempts + correct, recalculate masteryPct, update lastAttemptAt).
- **Weak exercises query**: `GET /api/grammar/topics/:topicId/weak-questions?userId=...` — returns questionIds where the user's most-recent GrammarAttempt (per questionId) has `isCorrect = false`. Used by the "Review weak exercises" feature.
- **Explanation rendering**: `GrammarLesson.explanation` is plain text or lightly-formatted string. Render it in a styled `<div>` with a highlighted background (zinc-100/dark:zinc-800) as a "grammar rule card". `examples[]` rendered as a list with each item in a monospace or italic style.

</specifics>

<deferred>
## Deferred Ideas

- **Conjugation/structure tables in explanations**: For verb tenses and conditionals, a proper conjugation table would be more visual. Deferred — Phase 4 uses text + example sentences. A future UX polish phase can add structured tables once content pipeline (Phase 5) has seeded real grammar content.
- **Progressive lesson unlocking**: Locking later lessons until earlier ones reach a mastery threshold. Noted in the topic page design (lesson card shows locked/unlocked state) but the unlock logic is deferred — Phase 4 ships all lessons unlocked by default for simplicity.
- **Grammar XP events**: GrammarAttempt completion should eventually emit XP events (GAME-01). Phase 4 wires the data (GrammarAttempt rows exist) but the XP increment and badge checks ship in Phase 7 Gamification.

</deferred>

---

*Phase: 4-Grammar Module*
*Context gathered: 2026-06-13*
