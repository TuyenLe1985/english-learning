# Phase 7: Quiz Center + Gamification - Context

**Gathered:** 2026-06-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can take 10-question mixed-skill or topic-based quizzes drawing questions randomly from the existing GrammarQuestion, VocabularyExercise, ReadingQuestion, and ListeningExercise tables, review their mistakes with full question+explanation re-display, and experience the complete gamification layer — CEFR-weighted XP accumulation, a linear 1–100 level system displayed on profile and dashboard, achievement badges awarded synchronously at completion, and a '+XP' toast with level-up modal.

**Deliverables:**
- NestJS QuizModule: endpoints for starting a session (question selection), submitting answers, session completion (stores QuizSession + QuizAnswer records), and mistake review
- NestJS GamificationService: `awardXp(userId, amount, reason, skillArea, sourceRef)` + `checkAchievements(userId, event)` — called by ALL 5 module session-complete endpoints (grammar, vocabulary, reading, listening, quiz)
- Achievement seed: upsert 8 achievement definitions into the Achievement table on startup
- Next.js quiz routes: `/quiz` (quiz type selector) → `/quiz/[sessionId]` (paginated question flow, progress bar) → `/quiz/[sessionId]/results` (score card + mistake review)
- XP toast component (Framer Motion) + level-up modal
- Profile page updates: show level badge, XP progress bar toward next level, achievement grid with earned dates

</domain>

<decisions>
## Implementation Decisions

### Quiz Question Pool
- **D-01:** **Pull from existing module tables**: Quiz engine queries GrammarQuestion, VocabularyExercise, ReadingQuestion, and ListeningExercise tables. No standalone QuizQuestion table. The polymorphic `QuizAnswer.questionRef = "{type}:{questionId}"` schema was designed for this. PIPE-05's "20,000 quiz questions" refers to the question records already seeded by the content pipeline in phases 3–6.
- **D-02:** **Random sample filtered by CEFR level + topic**: `SELECT ... FROM questions WHERE cefrLevel = user.cefrLevel [AND topic = selectedTopic] ORDER BY RANDOM() LIMIT N`. For mixed-skill: query each module separately with `LIMIT 3` (or 2/3 alternating). For topic-based: add `AND topic = selectedTopic` across all modules.
- **D-03:** **Mistake review: full question re-shown with explanation**: After quiz completion, the results screen re-renders each incorrect question (full prompt + all options) with the correct answer highlighted and the `explanation` field displayed. Identical pattern to what Grammar and Vocabulary modules already show for incorrect answers.

### Session Format
- **D-04:** **Fixed 10 questions per session**: Every quiz session contains exactly 10 questions regardless of type (mixed-skill or topic-based).
- **D-05:** **No time limit — elapsed time recorded only**: `QuizSession.timeTakenSec` records elapsed wall-clock time from session start to submission. No countdown timer UI. Low-pressure experience consistent with reading/listening modules.
- **D-06:** **One question at a time, paginated**: One question displayed per screen. Progress bar at top shows current position (e.g., "3 / 10"). After answering, answer is locked and a "Next →" button advances. No back-navigation once answered (prevents answer-fishing).
- **D-07:** **Even split for mixed-skill**: For a 10-question mixed-skill session: 3 grammar + 3 vocabulary + 2 reading + 2 listening (or nearest even split if modules have insufficient questions). Topic-based quizzes draw from all applicable question types for that topic.

### XP + Level System
- **D-08:** **Display only — no content gating in Phase 7**: `User.level` is calculated and displayed on the profile page and dashboard XP bar. No content access control by level. Content gating ("unlock advanced content at level X") is deferred to Phase 8 (Adaptive Engine).
- **D-09:** **Linear level formula**: `level = Math.min(100, Math.floor(xpTotal / 100) + 1)`. Level 1 at 0–99 XP, level 2 at 100–199 XP, ..., level 100 at 9900+ XP. Progress toward next level: `(xpTotal % 100)` out of 100.
- **D-10:** **CEFR-weighted XP rates**: Base rates × CEFR multiplier (B1=1×, B2=1.5×, C1=2×, rounded to nearest integer):
  - Quiz question answered correctly: 5 XP × multiplier
  - Quiz session completed: 10 bonus XP × multiplier
  - Grammar/vocabulary/reading/listening lesson completed: 20 XP × multiplier
  - SRS review card rated "Good" or "Easy": 3 XP (flat, no multiplier — word difficulty already captured in SRS ease factor)
- **D-11:** **XP toast + level-up modal**: On any session complete that awards XP: a Framer Motion toast slides up from bottom-right showing "+{n} XP". If `newLevel > oldLevel`: a level-up modal appears over the score card showing "🎉 Level {n}!" with the new level badge. Both dismiss automatically after 4 seconds or on click.

### Achievement Triggers
- **D-12:** **Synchronous in session-complete endpoints**: `GamificationService.checkAchievements(userId, { event, metadata })` is called inline after `GamificationService.awardXp()` in every session-complete endpoint. The method returns an array of newly-awarded achievements, which are included in the API response so the frontend can display achievement unlock toasts.
- **D-13:** **Hardcoded definitions + seeded to Achievement table**: Achievement trigger conditions are TypeScript constants in `GamificationService`. On API startup (or via a `pnpm db:seed:achievements` script), these are upserted into the `Achievement` table so the profile page can display name, description, and iconUrl. The 8 achievements from GAME-03:
  1. `first-lesson` — first lesson of any type completed
  2. `vocab-100` — 100 vocabulary words learned (UserWord status = "mastered")
  3. `vocab-500` — 500 vocabulary words learned
  4. `grammar-master` — any grammar topic with score ≥ 80% on final assessment
  5. `reading-complete` — first reading passage completed
  6. `listening-complete` — first listening exercise completed
  7. `streak-7` — 7 consecutive days with ≥ 1 completed exercise (from ActivityLog)
  8. `streak-30` — 30 consecutive days
- **D-14:** **All 5 modules wire GamificationService**: Grammar, Vocabulary, Reading, Listening, and Quiz session-complete endpoints all call `gamificationService.awardXp()` + `gamificationService.checkAchievements()`. This is Phase 7's cross-cutting concern — all modules need to be updated, not just the new QuizModule.

### Claude's Discretion
- NestJS QuizModule structure (controller, service, DTOs — follow ReadingModule + ListeningModule as templates)
- Specific endpoint paths (e.g., `POST /api/quiz/sessions/start`, `POST /api/quiz/sessions/:id/answer`, `POST /api/quiz/sessions/:id/complete`)
- React Query cache strategy for quiz session state
- Exact question split formula when 10 doesn't divide evenly (e.g., 3+3+2+2 vs 3+2+3+2)
- Achievement badge icon assets (use emoji or SVG icons from lucide-react)
- Toast notification position (bottom-right recommended)
- Framer Motion animation specifics (duration, easing, stagger)
- GamificationService method signatures beyond what's specified above
- How streak-7 and streak-30 detect consecutive days (ActivityLog query pattern)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Scope and Requirements
- `.planning/ROADMAP.md` — Phase 7 goal, 5 success criteria, requirement IDs (QUIZ-01–05, GAME-01–05), depends on Phase 6
- `.planning/REQUIREMENTS.md` — QUIZ-01 (mixed-skill quiz session), QUIZ-02 (topic-based quiz), QUIZ-03 (session data stored: score, accuracy, time, mistakes), QUIZ-04 (mistake review with explanations), QUIZ-05 (quiz results feed skill scores), GAME-01 (complexity-weighted XP), GAME-02 (XP → level 1–100, unlocks display), GAME-03 (8 achievement milestones), GAME-04 (achievements on profile with earned date), GAME-05 (XP audit log)
- `.planning/PROJECT.md` — Core value, tech stack decisions, constraints

### Database Schema (CRITICAL — read before writing any code)
- `packages/database/prisma/schema.prisma` — Models already scaffolded in Phase 1:
  - `QuizSession` (userId, skillArea, topic, score, accuracy, timeTakenSec, xpEarned, completedAt)
  - `QuizAnswer` (sessionId, questionRef, skillArea, isCorrect, userAnswer, correctAnswer, xpEarned)
  - `XpEvent` (userId, amount, reason, skillArea, sourceRef, createdAt)
  - `Achievement` (id, slug, name, description, iconUrl, xpReward)
  - `UserAchievement` (userId, achievementId, earnedAt — @@unique([userId, achievementId]))
  - `User.xpTotal` (Int @default(0)), `User.level` (Int @default(1))
  - `SkillArea` enum: GRAMMAR, VOCABULARY, READING, LISTENING, MIXED
  - Verify `GrammarQuestion`, `VocabularyExercise`, `ReadingQuestion`, `ListeningExercise` tables exist and have `cefrLevel`, `topic`, `explanation` fields

### Technology Stack (LOCKED)
- `CLAUDE.md` §Technology Stack table — Next.js 14, NestJS 11, Tailwind 3.x, React 18.x, shadcn/ui New York/zinc, Framer Motion (already in project)
- `CLAUDE.md` §Supporting Libraries — `@tanstack/react-query` 5.x for quiz session state, `axios` 1.x for API calls, `date-fns` 3.x for streak calculation

### Prior Phase Session-Complete Patterns (closest analogs)
- `.planning/phases/06-listening-comprehension/06-CONTEXT.md` — D-16 (inline score card + stay on page), D-13 (listen-first flow patterns), D-15 (full unlock in one state transition)
- `.planning/phases/05-reading-comprehension-content-pipeline/05-CONTEXT.md` — D-04 (inline score card + stay on page), D-06 (batch submit pattern)

### Existing Code Patterns (read before implementing)
- `apps/api/src/listening/` — Most recent NestJS module; QuizModule and GamificationService follow this structure
- `apps/api/src/reading/reading.controller.ts` — Session-complete endpoint pattern with JWT guard
- `apps/api/src/grammar/` — GrammarModule; check how GrammarProgress is saved (to be updated with gamification hooks)
- `apps/api/src/vocabulary/` — VocabularyModule; VocabSession complete endpoint (to be updated)
- `apps/api/src/srs/` — SRS module; SRS review complete endpoint (to be updated with 3 XP award)
- `apps/web/src/components/listening/listening-session.tsx` — Session orchestrator pattern; quiz session uses same accumulate-then-submit flow
- `apps/web/src/components/grammar/exercises/multiple-choice-exercise.tsx` (or .test.tsx sibling) — MC exercise component; reuse directly in quiz for grammar questions
- `apps/web/src/components/vocabulary/exercises/flashcard-exercise.tsx` — Vocab exercise component for vocabulary quiz questions
- `apps/web/src/components/reading/passage-score-card.tsx` — Score card component; quiz score card follows same pattern
- `apps/web/src/lib/api-client.ts` — Axios client for all NestJS calls
- `apps/api/src/auth/jwt-auth.guard.ts` — JwtAuthGuard for all quiz endpoints

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `apps/web/src/components/grammar/exercises/multiple-choice-exercise.tsx` — Direct reuse for GRAMMAR + VOCABULARY question types in quiz
- `apps/web/src/components/listening/listening-session.tsx` — Session state + accumulate pattern; quiz session follows same flow
- `apps/web/src/components/reading/passage-score-card.tsx` — Score card layout; quiz results screen adapts this
- `apps/web/src/components/cefr-badge.tsx` — CEFR badge for quiz browse cards
- `apps/web/src/components/ui/progress.tsx` — Progress bar (shadcn/ui) for question progress indicator (3/10)
- `apps/web/src/lib/api-client.ts` — Axios client; all quiz API calls route through this

### Established Patterns
- NestJS global prefix `/api` — all quiz endpoints at `/api/quiz/*`
- Global `ValidationPipe` (`whitelist: true`, `transform: true`) — all quiz DTOs auto-validated
- shadcn/ui New York/zinc: Card (quiz browse + score card), Progress (question counter + XP bar), Badge (CEFR + skill area), Button
- Dashboard route group `(dashboard)` — all quiz routes under `apps/web/src/app/(dashboard)/quiz/`
- Session state in React component state, batch submit on complete (consistent with all prior modules)
- `prisma.createMany()` in batches for achievement seed (same as PIPE-06)
- JWT Bearer token for all protected endpoints (`JwtAuthGuard`)

### Integration Points
- `apps/api/src/app.module.ts` — Add `QuizModule` + `GamificationModule` to imports
- `apps/api/src/grammar/grammar.service.ts` — Add `GamificationService` injection, call on lesson/quiz complete
- `apps/api/src/vocabulary/vocabulary.service.ts` — Same gamification hook
- `apps/api/src/reading/reading.service.ts` — Same gamification hook
- `apps/api/src/listening/listening.service.ts` — Same gamification hook
- `apps/api/src/srs/srs.service.ts` — Add 3 XP flat reward on Good/Easy SRS card review
- `packages/shared/src/index.ts` — Add quiz DTOs: `QuizSessionDto`, `QuizAnswerDto`, `QuizResultDto`, `AchievementDto`, `XpEventDto`
- `apps/web/src/app/(dashboard)/` — Add `/quiz/` route group
- `packages/database/prisma/schema.prisma` — Schema already complete; verify no missing fields before planning

</code_context>

<specifics>
## Specific Ideas

- **XP formula as a service constant**: Define `XP_RATES` and `CEFR_MULTIPLIERS` as typed constants at the top of GamificationService. Makes it easy to tune without touching logic: `XP_RATES = { QUIZ_CORRECT: 5, SESSION_COMPLETE: 10, LESSON_COMPLETE: 20, SRS_REVIEW: 3 }` and `CEFR_MULTIPLIERS = { B1: 1, B2: 1.5, C1: 2 }`.
- **Level-up detection**: In `awardXp()`, compute `oldLevel = Math.floor(oldXpTotal / 100) + 1` and `newLevel = Math.floor(newXpTotal / 100) + 1`. If `newLevel > oldLevel`, include `{ levelUp: true, newLevel }` in the service return. Frontend checks this to show the level-up modal.
- **Achievement idempotency**: `GamificationService.checkAchievements()` should use upsert with `@@unique([userId, achievementId])` — already guaranteed by the schema. Never double-award.
- **Quiz session state on client**: `useQuizSession()` hook holds `{ questions, currentIndex, answers, startedAt }`. `questions` array fetched once at session start. Each answer appended to `answers[]`. On reaching question 10, submit all at once to `POST /api/quiz/sessions/:id/complete` with the full answers array.
- **Framer Motion XP toast**: Position: fixed bottom-right, `initial: { y: 50, opacity: 0 }`, `animate: { y: 0, opacity: 1 }`, `exit: { opacity: 0 }`, `transition: { duration: 0.3 }`. Auto-remove after 4 seconds via `AnimatePresence`.
- **Streak calculation**: Query `ActivityLog WHERE userId = X AND activityType = 'LESSON_COMPLETE' AND loggedAt >= (NOW() - INTERVAL '31 days')`, group by day, check for N consecutive days. `date-fns` `differenceInCalendarDays` is the right utility.

</specifics>

<deferred>
## Deferred Ideas

- **Content gating by level**: Higher levels unlocking access to C1 content or advanced themes. Noted as Phase 8 (Adaptive Engine) scope — requires content endpoint guards and a level-threshold configuration system.
- **Adaptive question weighting by user weakness**: Biasing quiz questions toward user's weak skill areas. Overlaps with Phase 8's adaptive engine. Deferred to avoid Phase 7/8 boundary blurring.
- **Leaderboard**: Users ranking by XP/level within their CEFR cohort. Listed in REQUIREMENTS.md under v2/SOCL-01 — out of scope for Phase 7.
- **BullMQ achievement queue**: Async achievement evaluation via a dedicated queue. Synchronous evaluation (D-12) is correct for portfolio scale; async can be introduced post-v1 if latency becomes an issue.
- **Social achievement sharing**: Sharing earned achievement cards as images (SOCL-02 in v2 requirements). Post-v1.
- **Streak anxiety notifications**: Explicitly out of scope per REQUIREMENTS.md — research confirms harm to adult learner motivation.
- **Configurable quiz length**: Allowing users to choose 5/10/20 questions. Deferred; fixed 10 is the right default to ship.

</deferred>

---

*Phase: 7-Quiz Center + Gamification*
*Context gathered: 2026-06-18*
