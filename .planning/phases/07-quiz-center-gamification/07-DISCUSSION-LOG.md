# Phase 7: Quiz Center + Gamification - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-18
**Phase:** 7-quiz-center-gamification
**Areas discussed:** Quiz question pool, Session format, Level + unlock scope, Achievement triggers

---

## Quiz Question Pool

**Q: Where do quiz questions come from?**

| Option | Description | Selected |
|--------|-------------|----------|
| Pull from existing module tables | Query GrammarQuestion, ReadingQuestion, VocabularyExercise, ListeningExercise — polymorphic questionRef schema already set up | ✓ |
| Standalone QuizQuestion table | Seed a separate quiz-specific question bank — new schema model + separate seed script | |
| Hybrid: module tables + quiz-specific bank | Mix of both — most from module tables, small set of quiz-only questions | |

**User's choice:** Pull from existing module tables (Recommended)

---

**Q: How does the quiz engine select questions from those module tables?**

| Option | Description | Selected |
|--------|-------------|----------|
| Random sample filtered by CEFR level + topic | `WHERE cefrLevel = user.cefrLevel AND topic = selectedTopic ORDER BY RANDOM() LIMIT N` | ✓ |
| Curated question lists per quiz type | Pre-define which question IDs belong to which quiz type — needs QuizTemplate model | |
| Weighted by user's weak areas | Bias toward skills with lower scores — overlaps with Phase 8 Adaptive Engine | |

**User's choice:** Random sample filtered by CEFR level + topic (Recommended)

---

**Q: For mistake review (QUIZ-04), how much detail when showing incorrect answers?**

| Option | Description | Selected |
|--------|-------------|----------|
| Full question re-shown with explanation | Complete prompt + all options, correct answer highlighted, explanation text | ✓ |
| Summary list with explanation text only | Lighter UI — "Q3: chose X, correct was Y. Explanation: ..." | |
| Link back to source module | Navigate to original grammar lesson / vocab set / passage | |

**User's choice:** Full question re-shown with explanation (Recommended)

---

## Session Format

**Q: How many questions per quiz session?**

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed 10 questions | Every session = 10 questions, 5–10 minute sessions | ✓ |
| Fixed 20 questions | More thorough, 10–15 minutes, higher drop-off risk | |
| Configurable per quiz type | Mixed=20, topic=10, placement=30 — adds complexity | |

**User's choice:** Fixed 10 questions (Recommended)

---

**Q: Is there a time limit per quiz session?**

| Option | Description | Selected |
|--------|-------------|----------|
| No time limit — just record elapsed time | `timeTakenSec` for analytics, no countdown | ✓ |
| Per-question timer (e.g., 30 seconds) | Countdown per question, auto-submit on expire | |
| Total session timer (e.g., 10 minutes) | One countdown for whole session | |

**User's choice:** No time limit — just record elapsed time (Recommended)

---

**Q: How are questions presented within a session?**

| Option | Description | Selected |
|--------|-------------|----------|
| One question at a time, paginated | Progress bar (3/10), answer locked after submit, Next → button | ✓ |
| All questions on one scrollable page | Scroll all 10, submit at bottom | |
| Carousel (swipe left/right) | Mobile-first, reuses vocabulary practice-session carousel | |

**User's choice:** One question at a time, paginated (Recommended)

---

**Q: For a mixed-skill quiz, how are the 10 questions distributed across skills?**

| Option | Description | Selected |
|--------|-------------|----------|
| Even split across all 4 skills | ~2–3 per skill area (3+3+2+2), balanced and predictable | ✓ |
| Random mix — any skill, any count | Purely random, could yield 7 grammar + 3 vocab | |
| Proportional to user's activity | Ties to Phase 8 Adaptive Engine — scope creep | |

**User's choice:** Even split across all 4 skills (Recommended)

---

## Level + Unlock Scope

**Q: Does Phase 7 implement actual content gating by level, or just display the level?**

| Option | Description | Selected |
|--------|-------------|----------|
| Display only — no content gating | `User.level` shown on profile + dashboard, content gating deferred to Phase 8 | ✓ |
| Level display + soft content unlock | 'Recommended' label on harder content, visual nudge only | |
| Full content gating by level | Backend enforces level requirements on content endpoints | |

**User's choice:** Display only — no content gating (Recommended)

---

**Q: What is the XP-to-level formula?**

| Option | Description | Selected |
|--------|-------------|----------|
| Linear: 100 XP per level | `level = floor(xpTotal / 100) + 1`, capped at 100 | ✓ |
| Exponential: increasing XP per level | Level N requires N × 50 XP, slower at higher levels | |
| Tiered: flat within CEFR bands | B1=1–33, B2=34–66, C1=67–100 | |

**User's choice:** Linear: 100 XP per level (Recommended)

---

**Q: How is XP awarded per action, and what does 'complexity-weighted' mean in practice?**

| Option | Description | Selected |
|--------|-------------|----------|
| Base XP × CEFR multiplier | Quiz correct=5, lesson complete=20, session bonus=10; B1=1×, B2=1.5×, C1=2× | ✓ |
| Base XP × difficulty score per question | Needs difficulty field on question records | |
| Fixed flat XP regardless of complexity | Doesn't satisfy GAME-01 requirement | |

**User's choice:** Base XP × CEFR multiplier (Recommended)

---

**Q: Should Phase 7 show an XP earned animation/toast after completing a quiz or lesson?**

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — toast notification showing +XP earned | Framer Motion slide-up '+25 XP'; level-up triggers larger modal | ✓ |
| No toast — XP updates silently in score card | XP shown in score card only | |
| Level-up only — no per-quiz XP toast | Only notify on level-up, silent for regular XP | |

**User's choice:** Yes — toast notification showing +XP earned (Recommended)

---

## Achievement Triggers

**Q: Where do achievement checks run — synchronously or async?**

| Option | Description | Selected |
|--------|-------------|----------|
| Synchronous in session-complete endpoint | `GamificationService.checkAchievements(userId)` inline, returns awarded achievements | ✓ |
| BullMQ async job (achievement-check queue) | Decoupled, scalable, but needs new queue + frontend polling | |
| Polling — check on page load | Lazy evaluation, delayed feedback | |

**User's choice:** Synchronous in the session-complete endpoint (Recommended)

---

**Q: How are achievement definitions stored — hardcoded or data-driven?**

| Option | Description | Selected |
|--------|-------------|----------|
| Hardcoded in GamificationService + seeded to Achievement table | TypeScript constants upserted into DB at startup | ✓ |
| Fully data-driven from Achievement table | JSON trigger conditions in DB, needs condition evaluator engine | |
| Hardcoded only, no Achievement table usage | Skip the Achievement table in Phase 7 | |

**User's choice:** Hardcoded in GamificationService + seeded to Achievement table (Recommended)

---

**Q: Which modules call GamificationService on completion?**

| Option | Description | Selected |
|--------|-------------|----------|
| All modules — hook into every session-complete endpoint | Grammar + Vocab + Reading + Listening + Quiz all call awardXp() + checkAchievements() | ✓ |
| Quiz-only for Phase 7, other modules deferred | Risk: achievement triggers like 'first lesson' won't fire | |
| Quiz + grammar only | Partial coverage, reading/listening/vocab added in Phase 8 | |

**User's choice:** All modules call it — hook into every session-complete endpoint (Recommended)

---

## Claude's Discretion

- NestJS QuizModule and GamificationModule structure (controller, service, DTOs)
- Specific endpoint paths beyond the session lifecycle
- React Query cache strategy for quiz session state
- Exact question split formula when 10 doesn't divide evenly (3+3+2+2 vs other distributions)
- Achievement badge icon assets (emoji or lucide-react icons)
- Toast notification position and animation timing
- `GamificationService` method signatures beyond awardXp + checkAchievements
- Streak detection query implementation details

## Deferred Ideas

- Content gating by level — Phase 8 scope
- Adaptive question weighting by user weakness — Phase 8 Adaptive Engine
- Leaderboard — REQUIREMENTS.md v2/SOCL-01
- BullMQ achievement queue — post-v1 optimization
- Social achievement sharing — v2/SOCL-02
- Configurable quiz length (5/10/20 questions)
