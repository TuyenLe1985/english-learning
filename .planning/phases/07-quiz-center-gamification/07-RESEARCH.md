# Phase 07: Quiz Center + Gamification - Research

**Researched:** 2026-06-18
**Domain:** NestJS quiz session engine, polymorphic question selection, XP/level gamification, achievement system, Framer Motion toast/modal UI
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01** Pull from existing module tables: GrammarQuestion, VocabularyExercise, ReadingQuestion, ListeningExercise. No standalone QuizQuestion table. Polymorphic `QuizAnswer.questionRef = "{type}:{questionId}"`.
- **D-02** Random sample filtered by CEFR level + topic using `ORDER BY RANDOM() LIMIT N`. Mixed-skill: query each module separately with LIMIT 3 (or 2/3 alternating). Topic-based: add `AND topic = selectedTopic`.
- **D-03** Mistake review: full question re-shown with explanation field displayed. Identical pattern to Grammar and Vocabulary modules.
- **D-04** Fixed 10 questions per session.
- **D-05** No time limit — `QuizSession.timeTakenSec` records elapsed wall-clock time only.
- **D-06** One question at a time, paginated. Progress bar at top. After answering, answer is locked and "Next" advances. No back-navigation once answered.
- **D-07** Even split for mixed-skill: 3 grammar + 3 vocabulary + 2 reading + 2 listening.
- **D-08** Display only — no content gating in Phase 7. `User.level` is calculated and displayed; no access control by level.
- **D-09** Linear level formula: `level = Math.min(100, Math.floor(xpTotal / 100) + 1)`.
- **D-10** CEFR-weighted XP rates: Quiz question correct = 5 XP × CEFR multiplier; session complete bonus = 10 XP × multiplier; lesson complete = 20 XP × multiplier; SRS Good/Easy = 3 XP flat. CEFR multipliers: B1=1×, B2=1.5×, C1=2×.
- **D-11** XP toast (Framer Motion, bottom-right) + level-up modal (Dialog) on session complete that awards XP. Auto-dismiss after 4 seconds.
- **D-12** Synchronous achievement evaluation in session-complete endpoints. Returns array of newly-awarded achievements in API response.
- **D-13** 8 hardcoded achievement definitions seeded to Achievement table: first-lesson, vocab-100, vocab-500, grammar-master, reading-complete, listening-complete, streak-7, streak-30.
- **D-14** All 5 modules wire GamificationService: Grammar, Vocabulary, Reading, Listening, Quiz.
- **D-15** SRS review complete endpoint gets 3 XP flat on Good/Easy rating.

### Claude's Discretion

- NestJS QuizModule structure (controller, service, DTOs)
- Specific endpoint paths
- React Query cache strategy for quiz session state
- Exact question split formula when 10 doesn't divide evenly
- Achievement badge icon assets (lucide-react)
- Toast notification position (bottom-right recommended)
- Framer Motion animation specifics (duration, easing, stagger)
- GamificationService method signatures beyond what's specified
- How streak-7 and streak-30 detect consecutive days (ActivityLog query pattern)

### Deferred Ideas (OUT OF SCOPE)

- Content gating by level (Phase 8 Adaptive Engine)
- Adaptive question weighting by user weakness (Phase 8)
- Leaderboard (v2 SOCL-01)
- BullMQ achievement queue (async evaluation)
- Social achievement sharing (SOCL-02)
- Streak anxiety notifications (explicitly out of scope)
- Configurable quiz length

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| QUIZ-01 | User can take a mixed-skill quiz combining grammar, vocabulary, reading, and listening questions | D-02 polymorphic query pattern; D-07 3+3+2+2 split; QuizSession schema verified in Prisma |
| QUIZ-02 | User can take topic-based quizzes filtered by topic | D-02 topic filter across all module tables; 5 topic options: technology, travel, business, daily communication, education |
| QUIZ-03 | Each quiz session stores: score, accuracy %, time taken, incorrect items, completion timestamp | QuizSession + QuizAnswer schema verified; completeSession endpoint pattern from ListeningService |
| QUIZ-04 | User can review mistakes with explanations | D-03 re-render question + correct answer + explanation field; MistakeReview component in UI-SPEC |
| QUIZ-05 | Quiz results feed into per-skill performance scores | SkillScore table exists in schema (Phase 8 primary owner); QuizAnswer.skillArea field enables per-skill aggregation now |
| GAME-01 | XP is complexity-weighted (harder exercises, higher CEFR award more) | D-10 CEFR multiplier table; XP_RATES constants in GamificationService |
| GAME-02 | XP accumulates to visible level 1–100 on profile and dashboard | D-09 linear formula; GamificationService.awardXp() atomically updates User.xpTotal + User.level; CRITICAL: existing modules do NOT update xpTotal/level — GamificationService owns this exclusively |
| GAME-03 | 8 achievement milestones awarded automatically | D-13 definitions; D-12 synchronous checkAchievements() call; upsert via @@unique([userId, achievementId]) |
| GAME-04 | Achievements displayed on profile with earned date and locked/unlocked state | Profile page augmentation; AchievementGrid + AchievementBadge components in UI-SPEC |
| GAME-05 | XP events logged as audit trail | XpEvent table verified in schema; GamificationService creates one XpEvent per award |

</phase_requirements>

---

## Summary

Phase 7 introduces two closely coupled systems: the Quiz Center (a polymorphic question engine drawing from all four existing module tables) and a cross-cutting Gamification layer that must be retroactively wired into all five session-complete endpoints (Grammar, Vocabulary, Reading, Listening, and the new Quiz). Both systems depend entirely on schema tables already scaffolded in Phase 1 and patterns already established across Phases 3–6.

The most architecturally significant discovery from codebase inspection is that **existing session-complete endpoints (Listening, Grammar, Reading, Vocabulary) create `XpEvent` records but never update `User.xpTotal` or `User.level`**. The `GamificationService.awardXp()` method must be the single authoritative writer that does both — using Prisma's `increment` on `User.xpTotal` plus a level recalculation write. All five modules must be updated to call this service rather than writing `XpEvent` records directly (or in addition to).

The Quiz engine is a new NestJS module (QuizModule) following the ListeningModule pattern exactly: a single controller, a single service, an AuthModule import, and three endpoints (start session, answer submission or complete-all, mistake review query). The question selection logic uses `ORDER BY RANDOM() LIMIT N` per module table, filtered by the user's CEFR level. The polymorphic `QuizAnswer.questionRef` field stores `"{type}:{id}"` strings, which the mistake-review endpoint decodes to re-fetch full question details for display.

On the frontend, all quiz UI lives under `apps/web/src/app/(dashboard)/quiz/` following the dashboard route group established in prior phases. The three screens (browse, session, results) are well-defined in the UI-SPEC. Framer Motion v12 is already installed and actively used throughout the codebase — the XP toast and level-up modal use `AnimatePresence` + `motion.div` patterns identical to what's already present in `listening-session.tsx` and `reading/questions-section.tsx`.

**Primary recommendation:** Build GamificationModule first (Wave 0), then QuizModule (Wave 1), then wire all five module hooks (Wave 2), then build frontend (Wave 3). Achievement seeding is a Wave 0 setup task.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Quiz question selection | API / Backend | — | RANDOM() query across 4 tables; must be server-side to prevent client from biasing question selection |
| Quiz session storage | API / Backend | Database | QuizSession + QuizAnswer rows; server recomputes accuracy from answers |
| XP calculation + award | API / Backend | Database | GamificationService owns User.xpTotal + User.level writes; atomic increment |
| Achievement evaluation | API / Backend | — | Synchronous in session-complete; idempotency via @@unique([userId, achievementId]) in DB |
| Achievement seeding | Database | API / Backend | Upsert on startup via seed script; Achievement definitions are server-side constants |
| XP toast display | Browser / Client | — | Client-side Framer Motion component; triggered by API response flag |
| Level-up modal | Browser / Client | — | Client-side Dialog; triggered by `levelUp: boolean` in API response |
| Quiz session state | Browser / Client | — | Accumulate answers in React state; batch POST on question 10 completion |
| Profile XP bar + level badge | Browser / Client | Frontend Server (SSR) | Profile page fetches from NestJS server-side; renders gamification UI client-side |
| Achievement grid on profile | Browser / Client | Frontend Server (SSR) | Profile page fetches UserAchievements; renders AchievementGrid with locked/unlocked state |
| Per-skill breakdown (QUIZ-05) | API / Backend | — | QuizAnswer.skillArea enables per-skill count; SkillScore upsert deferred to Phase 8 |

---

## Standard Stack

### Core (all already installed in project)

| Library | Installed Version | Purpose | Why Standard |
|---------|------------------|---------|--------------|
| NestJS 11 | `^11.1.26` | QuizModule + GamificationModule backend | Locked in CLAUDE.md; used by all prior phases |
| Prisma 6 | `^6.x` | DB queries for question selection, session storage, XP events | Locked; schema already complete |
| `framer-motion` | `^12.40.0` | XP toast (slide-up) + score card entrance animation | Already installed; active in listening, reading, vocab, grammar components |
| `@tanstack/react-query` | `^5.101.0` | Quiz session fetch + profile data refresh after XP award | Already installed; used across all modules |
| `date-fns` | `4.x` (found `4.4.0` on registry; `3.x` locked in CLAUDE.md) | Streak consecutive-day calculation via `differenceInCalendarDays` | Already installed |
| `lucide-react` | `^1.17.0` | Achievement badge icons + quiz type selector icons | Already installed |
| `zod` | `3.x` | Quiz DTO schemas in `packages/shared` | Already installed |

**Note on date-fns:** CLAUDE.md specifies `date-fns 3.x` but registry shows `4.4.0` as latest. The installed version in the project takes precedence — use whatever is in `node_modules`, not `npm install`. [VERIFIED: npm registry shows 4.4.0 as current; project uses existing install]

### Supporting (no new installs required)

| Library | Purpose | When to Use |
|---------|---------|-------------|
| `shadcn/ui` Card, Button, Progress, Badge, Dialog, Skeleton | All quiz UI primitives | UI-SPEC confirms all already installed from Phase 2–6 |
| `@auth/core/jwt` decode | JwtAuthGuard token validation | Already used in `jwt-auth.guard.ts` |
| Prisma `$transaction` | Atomic XP + level update | Use for `User.xpTotal increment` + `User.level write` in GamificationService |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Synchronous achievement check | BullMQ async queue | Async adds latency before response; synchronous is correct at portfolio scale (D-12 locked) |
| `ORDER BY RANDOM()` | Application-level shuffle | DB-side RANDOM() is simpler and sufficient for 10-question selection; app-side shuffle adds complexity |
| Prisma `increment` | Read-then-write XP update | `increment` is atomic and avoids race conditions under concurrent session submits |

**Installation:** No new packages required. Phase 7 uses only already-installed dependencies.

---

## Package Legitimacy Audit

> No new packages are installed in this phase. All dependencies are already installed from Phases 2–6.

| Package | Status | Note |
|---------|--------|------|
| `framer-motion` | Already installed v12.40.0 | Active use confirmed in 6 existing components |
| `@tanstack/react-query` | Already installed v5.101.0 | Active use confirmed across all module pages |
| `date-fns` | Already installed | `differenceInCalendarDays` available in v3 and v4 |
| `lucide-react` | Already installed v1.17.0 | `Shuffle`, `Monitor`, `Plane`, `Briefcase`, `MessageCircle`, `GraduationCap` icons available |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none
**slopcheck availability:** not installed — all packages verified as already-installed project dependencies with confirmed active usage. Registry existence verified via `npm view`. [ASSUMED for slopcheck verdict; VERIFIED for existence]

---

## Architecture Patterns

### System Architecture Diagram

```
Client Browser
  │
  │ POST /api/quiz/sessions/start  (via Next.js relay)
  ▼
Next.js Route Handler ──────────────────────► NestJS QuizController
  │                                               │
  │ returns QuizStartResponseDto                  │ QuizService.startSession()
  │ { sessionId, questions[] }                    │   ├─ prisma.grammarQuestion RANDOM() LIMIT 3
  │                                               │   ├─ prisma.vocabularyWord RANDOM() LIMIT 3
  ◄───────────────────────────────────────────────┤   ├─ prisma.readingQuestion RANDOM() LIMIT 2
  │                                               │   └─ prisma.listeningQuestion RANDOM() LIMIT 2
  │                                               │   → creates QuizSession row (startedAt)
  │
  │ Client accumulates answers in React state
  │ (useQuizSession hook: { questions, currentIndex, answers, startedAt })
  │
  │ POST /api/quiz/sessions/:id/complete
  ▼
Next.js Route Handler ──────────────────────► NestJS QuizController
                                                   │
                                                   │ QuizService.completeSession()
                                                   │   ├─ server recomputes accuracy
                                                   │   ├─ createMany QuizAnswer rows
                                                   │   ├─ updates QuizSession (score, accuracy, timeTakenSec)
                                                   │   ├─ GamificationService.awardXp(userId, xpAmount, ...)
                                                   │   │     ├─ prisma.xpEvent.create()
                                                   │   │     ├─ prisma.user.update({ xpTotal: { increment } })
                                                   │   │     └─ returns { xpEarned, oldLevel, newLevel, levelUp }
                                                   │   └─ GamificationService.checkAchievements(userId, event)
                                                   │         ├─ checks 8 milestone conditions via DB queries
                                                   │         └─ prisma.userAchievement.upsert() for each new badge
                                                   │
                                                   └─ returns QuizCompleteResponseDto
                                                         { score, accuracy, xpEarned, levelUp, newLevel,
                                                           newAchievements[], incorrectAnswers[] }

Client receives response:
  ├─ Renders QuizScoreCard (Framer Motion entrance)
  ├─ Fires XpToast (AnimatePresence, bottom-right, +{n} XP)
  ├─ If levelUp: fires LevelUpModal (Dialog, 1s delay)
  └─ If newAchievements: fires achievement toast(s) (500ms after XP toast)
```

### Recommended Project Structure

```
apps/api/src/
├── quiz/
│   ├── quiz.module.ts
│   ├── quiz.controller.ts        # POST /quiz/sessions/start, POST /quiz/sessions/:id/complete, GET /quiz/sessions/:id/mistakes
│   └── quiz.service.ts           # startSession(), completeSession(), getMistakes()
├── gamification/
│   ├── gamification.module.ts
│   ├── gamification.service.ts   # awardXp(), checkAchievements(), seedAchievements()
│   └── gamification.constants.ts # XP_RATES, CEFR_MULTIPLIERS, ACHIEVEMENT_DEFINITIONS

apps/web/src/
├── app/(dashboard)/quiz/
│   ├── page.tsx                  # /quiz — QuizTypeSelector (Server Component, then Client)
│   ├── [sessionId]/
│   │   ├── page.tsx              # /quiz/[sessionId] — QuizSession
│   │   └── results/
│   │       └── page.tsx          # /quiz/[sessionId]/results — QuizScoreCard + MistakeReview
├── app/api/quiz/
│   ├── sessions/
│   │   ├── start/route.ts        # Next.js relay → NestJS POST /api/quiz/sessions/start
│   │   └── [sessionId]/
│   │       ├── complete/route.ts  # Next.js relay → NestJS POST /api/quiz/sessions/:id/complete
│   │       └── mistakes/route.ts  # Next.js relay → NestJS GET /api/quiz/sessions/:id/mistakes
│   └── profile/achievements/route.ts # Next.js relay → NestJS GET /api/gamification/achievements/:userId
├── components/quiz/
│   ├── quiz-type-selector.tsx
│   ├── quiz-session.tsx
│   ├── quiz-question.tsx         # Polymorphic: dispatches to MultipleChoiceExercise or vocab variant
│   ├── quiz-progress-bar.tsx
│   ├── quiz-score-card.tsx
│   └── mistake-review.tsx
└── components/gamification/
    ├── xp-toast.tsx
    ├── level-up-modal.tsx
    ├── achievement-badge.tsx
    ├── achievement-grid.tsx
    ├── level-badge.tsx
    └── xp-progress-bar.tsx

packages/shared/src/
└── quiz.dto.ts                   # QuizStartDto, QuizCompleteDto, QuizCompleteResponseDto, AchievementDto, XpEventDto
```

### Pattern 1: GamificationService.awardXp() — Atomic XP + Level Update

**What:** Single method that creates an XpEvent AND increments User.xpTotal AND updates User.level in a single Prisma transaction. Returns `{ xpEarned, oldLevel, newLevel, levelUp }`.

**Critical finding:** Existing modules (Listening, Grammar, Reading, Vocabulary) create `XpEvent` records directly but **never update `User.xpTotal` or `User.level`**. This is a Phase 7 gap. GamificationService fixes this — all existing module session-complete methods must be updated to call `gamificationService.awardXp()` instead of writing `XpEvent` directly. [VERIFIED: confirmed by reading `listening.service.ts` lines 232–243 and grepping all API src files for `xpTotal` writes]

**When to use:** In every session-complete endpoint across all 5 modules.

**Example:**
```typescript
// Source: derived from Prisma docs — $transaction + increment pattern
// [ASSUMED] specific API shape — follow actual Prisma 6 docs

async awardXp(
  userId: string,
  amount: number,
  reason: string,
  skillArea: SkillArea,
  sourceRef?: string,
): Promise<{ xpEarned: number; oldLevel: number; newLevel: number; levelUp: boolean }> {
  // Read current xpTotal for level detection
  const user = await this.prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { xpTotal: true, level: true },
  });

  const oldLevel = user.level;
  const newXpTotal = user.xpTotal + amount;
  const newLevel = Math.min(100, Math.floor(newXpTotal / 100) + 1);

  // Atomic: create XpEvent + increment xpTotal + update level
  await this.prisma.$transaction([
    this.prisma.xpEvent.create({
      data: { userId, amount, reason, skillArea, sourceRef },
    }),
    this.prisma.user.update({
      where: { id: userId },
      data: {
        xpTotal: { increment: amount },
        level: newLevel,
      },
    }),
  ]);

  return { xpEarned: amount, oldLevel, newLevel, levelUp: newLevel > oldLevel };
}
```

### Pattern 2: CEFR-Weighted XP Calculation

**What:** Typed constants at top of gamification.constants.ts for XP rates and CEFR multipliers.

**Example:**
```typescript
// Source: D-10 from CONTEXT.md — exact rates locked
export const XP_RATES = {
  QUIZ_CORRECT: 5,       // per correct question
  QUIZ_SESSION_BONUS: 10, // session completion bonus
  LESSON_COMPLETE: 20,    // grammar/vocab/reading/listening lesson
  SRS_REVIEW: 3,          // flat, no CEFR multiplier
} as const;

export const CEFR_MULTIPLIERS: Record<string, number> = {
  B1: 1.0,
  B2: 1.5,
  C1: 2.0,
};

// Usage:
function calculateXp(baseRate: number, cefrLevel: string): number {
  const multiplier = CEFR_MULTIPLIERS[cefrLevel] ?? 1.0;
  return Math.round(baseRate * multiplier);
}
```

### Pattern 3: Polymorphic Question Selection

**What:** QuizService queries each module table separately with `RANDOM()`, returning a unified question array with `questionRef = "{type}:{id}"` strings.

**Example:**
```typescript
// Source: D-01, D-02, D-07 from CONTEXT.md — pattern [ASSUMED] for Prisma raw query
async startSession(userId: string, type: 'MIXED' | string): Promise<QuizStartDto> {
  const session = await this.prisma.quizSession.create({
    data: { userId, skillArea: type === 'MIXED' ? 'MIXED' : 'MIXED', topic: type === 'MIXED' ? null : type },
  });

  const cefrLevel = await this.getUserCefrLevel(userId); // from User table

  const [grammar, vocabulary, reading, listening] = await Promise.all([
    this.prisma.grammarQuestion.findMany({
      where: { lesson: { topic: { cefrLevel } } },
      take: 3,
      orderBy: { id: 'asc' }, // placeholder — use raw SQL for RANDOM()
    }),
    // ... similar for other tables
  ]);

  // NOTE: Prisma findMany does not natively support ORDER BY RANDOM().
  // Use this.prisma.$queryRaw`SELECT * FROM "GrammarQuestion" WHERE ... ORDER BY RANDOM() LIMIT 3`
  // or fetch N*3 records and shuffle in application layer.
}
```

**Important pitfall:** Prisma `findMany` does not support `ORDER BY RANDOM()`. Use `$queryRaw` with parameterized query or fetch a larger set and shuffle in application code. See Pitfall 1.

### Pattern 4: Achievement Idempotency

**What:** `checkAchievements()` uses `upsert` with `@@unique([userId, achievementId])`. Never double-awards.

**Example:**
```typescript
// Source: D-12, D-13 from CONTEXT.md; Prisma upsert pattern [ASSUMED]
async checkAchievements(
  userId: string,
  event: { type: string; metadata?: Record<string, unknown> },
): Promise<AchievementDto[]> {
  const newlyAwarded: AchievementDto[] = [];

  // Check first-lesson condition
  if (event.type === 'LESSON_COMPLETE') {
    const achievement = await this.prisma.achievement.findUnique({
      where: { slug: 'first-lesson' },
    });
    if (achievement) {
      const result = await this.prisma.userAchievement.upsert({
        where: { userId_achievementId: { userId, achievementId: achievement.id } },
        create: { userId, achievementId: achievement.id },
        update: {}, // no-op if already exists
        select: { earnedAt: true, id: true },
      });
      // If this is a newly created record (not update), add to response
      // Detect via returned earnedAt being within the last second
    }
  }
  // ... similar for all 8 achievements
  return newlyAwarded;
}
```

### Pattern 5: XP Toast with AnimatePresence

**What:** Fixed bottom-right toast using Framer Motion `AnimatePresence` + auto-dismiss after 4 seconds.

**Example:**
```typescript
// Source: D-11 from CONTEXT.md; Framer Motion v12 AnimatePresence [VERIFIED: used in listening-session.tsx]
'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function XpToast({ xpAmount }: { xpAmount: number }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed bottom-4 right-4 z-50 rounded-lg bg-primary px-4 py-2 text-primary-foreground"
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          +{xpAmount} XP
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

### Pattern 6: Streak Detection (Activity-Log-Based)

**What:** Query ActivityLog for the user's activity over the last 31 days, group by calendar day, check for N consecutive days.

**Example:**
```typescript
// Source: D-13, specifics section from CONTEXT.md; date-fns [VERIFIED: installed]
import { differenceInCalendarDays } from 'date-fns';

async checkStreakAchievement(userId: string, streakTarget: number): Promise<boolean> {
  const since = new Date();
  since.setDate(since.getDate() - (streakTarget + 1));

  const logs = await this.prisma.activityLog.findMany({
    where: { userId, loggedAt: { gte: since } },
    orderBy: { loggedAt: 'desc' },
    select: { loggedAt: true },
  });

  // Deduplicate to one entry per calendar day
  const days = [...new Set(logs.map(l => l.loggedAt.toISOString().slice(0, 10)))].sort().reverse();

  // Check for N consecutive days from today backward
  let streak = 0;
  for (let i = 0; i < days.length; i++) {
    const prev = i === 0 ? new Date() : new Date(days[i - 1]);
    const curr = new Date(days[i]);
    if (differenceInCalendarDays(prev, curr) === 1 || (i === 0 && differenceInCalendarDays(new Date(), curr) <= 1)) {
      streak++;
      if (streak >= streakTarget) return true;
    } else {
      break;
    }
  }
  return false;
}
```

### Anti-Patterns to Avoid

- **Writing XpEvent directly in module services:** Listening, Grammar, Reading, Vocabulary currently write `prisma.xpEvent.create()` directly but skip `User.xpTotal` increment. Replace all direct xpEvent.create() calls with `gamificationService.awardXp()`. Leaving the old pattern breaks GAME-02.
- **Prisma findMany with ORDER BY RANDOM():** Not supported natively. Use `$queryRaw` or application-layer shuffle. Attempting to sort by a computed field will error.
- **Double-awarding achievements:** Always use `upsert` with `@@unique`, never `create`. A race condition with two concurrent sessions could award the same badge twice if using plain `create`.
- **Client-supplied accuracy in quiz completion:** Like all prior modules, the server MUST recompute accuracy from the answers array. Never trust the client-supplied accuracy field.
- **Injecting userId from request body:** All endpoints use JWT guard; userId comes from `req.user.userId` only.
- **Route order collision:** Declare fixed-string POST routes (`sessions/start`, `sessions/complete`) BEFORE parameterized routes (`sessions/:id`) in NestJS controller. See ListeningController comment on "Pitfall 7".

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Random question selection | Custom shuffle algorithm | `$queryRaw` + `ORDER BY RANDOM()` | Postgres RANDOM() is cryptographically adequate for this use case; no bias risk at 10-question scale |
| Toast notification system | Custom `setTimeout` + CSS positioning | `framer-motion` `AnimatePresence` | Already in project; handles mount/unmount animations with proper cleanup |
| Level-up modal | Custom overlay with z-index management | shadcn/ui `Dialog` | Already installed; Radix handles focus trapping, escape key, portal rendering |
| Achievement idempotency | `findFirst` check + conditional `create` | Prisma `upsert` with `@@unique` | `upsert` is atomic; check-then-create has TOCTOU race condition |
| XP calculation | Per-module custom logic | `GamificationService.awardXp()` | Single source of truth; all 5 modules must call same function |
| Date-based streak | Manual day-difference arithmetic | `date-fns` `differenceInCalendarDays` | Handles DST, timezone edge cases; already installed |

**Key insight:** The gamification domain looks simple but contains hidden complexity: atomic counter updates, idempotent badge awards, streak boundary conditions, and level-boundary edge cases. Do not scatter XP logic across module services — centralize in GamificationService.

---

## Common Pitfalls

### Pitfall 1: Prisma ORDER BY RANDOM() Not Supported
**What goes wrong:** `prisma.grammarQuestion.findMany({ orderBy: { /* no RANDOM() */ } })` — Prisma's generated types do not expose `RANDOM()` as an orderBy option. TypeScript compile error or silent wrong ordering.
**Why it happens:** Prisma's type-safe query builder intentionally omits raw SQL expressions to prevent injection.
**How to avoid:** Use `this.prisma.$queryRaw<GrammarQuestion[]>` with backtick template and `Prisma.sql` tagged template for parameter interpolation. Alternative: `findMany({ take: N * 5 })` then `array.sort(() => Math.random() - 0.5)` in application code — acceptable at 10-question scale.
**Warning signs:** TypeScript error on `orderBy` field or all quizzes returning same questions in same order.

### Pitfall 2: Missing User.xpTotal Increment in Existing Modules
**What goes wrong:** After Phase 7 ships, Grammar/Vocabulary/Reading/Listening session-complete endpoints still only create `XpEvent` without incrementing `User.xpTotal`. Profile page shows 0 XP for lessons completed before quiz gamification wired.
**Why it happens:** Existing modules were built before GamificationService existed. They create `XpEvent` as a stub but don't write to `User.xpTotal` or `User.level`. [VERIFIED: confirmed by reading listening.service.ts and grep for xpTotal writes — zero results in API src]
**How to avoid:** All five `completeSession()` methods must be updated to call `gamificationService.awardXp()`. The `awardXp()` method replaces direct `xpEvent.create()` calls in those services.
**Warning signs:** User profile shows 0 XP despite completed lessons; XpEvent table has rows but User.xpTotal stays 0.

### Pitfall 3: Achievement Race Condition
**What goes wrong:** Two concurrent requests (e.g., user submits quiz and SRS review simultaneously) both check the `vocab-100` achievement, neither finds a UserAchievement record, and both try to `create` — one succeeds, one throws a Prisma unique constraint violation.
**Why it happens:** Read-check-then-write is not atomic.
**How to avoid:** Always use `prisma.userAchievement.upsert()` with the `@@unique([userId, achievementId])` constraint. Prisma's upsert is an atomic `INSERT ... ON CONFLICT DO UPDATE` — the second concurrent call silently no-ops.
**Warning signs:** Prisma unique constraint error in logs; user sees duplicate achievement toasts.

### Pitfall 4: Quiz Session State Loss on Browser Refresh
**What goes wrong:** User refreshes browser mid-quiz — all accumulated `answers[]` in React state are lost. Session row exists in DB but has no answers. Mistake review returns empty.
**Why it happens:** Quiz session state is intentionally held in client React state (not persisted per-answer). This is the correct design (D-06) but means refresh = session loss.
**How to avoid:** On the results page, retrieve mistakes from the API response (included in `POST /complete` response as `incorrectAnswers[]`). Store the complete response in React state or URL params before navigating to results. Do NOT try to re-fetch partial session state.
**Warning signs:** Empty mistake review screen despite user having gotten questions wrong.

### Pitfall 5: Route Shadowing in NestJS Controller
**What goes wrong:** `GET /api/quiz/sessions/complete` is treated as `GET /api/quiz/sessions/:id` with `id = "complete"`.
**Why it happens:** NestJS resolves routes in declaration order. Parameterized routes declared before literal routes shadow them.
**How to avoid:** Declare all fixed-string routes (`/sessions/start`, `/sessions/complete`) before parameterized routes (`/sessions/:id`, `/sessions/:id/mistakes`) in the controller class. This pattern is documented in `listening.controller.ts` as "Pitfall 7".
**Warning signs:** 404 or NotFoundException on literal route paths; `id` parameter receives string value "start" or "complete".

### Pitfall 6: Framer Motion v12 API Changes
**What goes wrong:** Code samples from internet or training data use `motion.div` with deprecated v10 props, causing React warnings or broken animations.
**Why it happens:** Framer Motion v12 changed some prop names from v10 (e.g., `layoutId` behavior, `drag` constraints). Project has v12.40.0 installed.
**How to avoid:** Use the pattern already established in the codebase: `listening-session.tsx` uses `motion.div` with `initial`, `animate`, `transition` — these are stable across v10–v12. Avoid undocumented or experimental props. [VERIFIED: framer-motion v12 AnimatePresence + motion.div pattern actively used in listening-session.tsx, reading/questions-section.tsx, grammar-session-results.tsx]
**Warning signs:** React console warnings about unknown props; animations not playing.

### Pitfall 7: GrammarQuestion Table Has No Direct topic Field
**What goes wrong:** Quiz topic-filter query on `GrammarQuestion` fails because `GrammarQuestion` has no `topic` column — it belongs to `GrammarLesson` → `GrammarTopic` → `GrammarArea`.
**Why it happens:** Schema models GrammarQuestion as nested under GrammarLesson, not tagged directly with topic.
**How to avoid:** For topic-filtered grammar questions, use Prisma relation filter: `where: { lesson: { topic: { /* some topic match */ } } }`. For mixed-skill quiz, omit topic filter entirely. For topic-based quiz, the topic filter may need to use `GrammarArea.name` or `GrammarTopic.title` rather than a direct `topic` field. [VERIFIED: read schema.prisma — GrammarQuestion has no `topic` field; ReadingPassage and ListeningContent have `topic: String?` directly; VocabularyWord has `topic: String?` and `category: String?`]
**Warning signs:** Prisma type error when adding `topic` to GrammarQuestion where clause.

---

## Code Examples

### Verified Pattern: NestJS Module with AuthModule Import

```typescript
// Source: apps/api/src/listening/listening.module.ts [VERIFIED: read directly]
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],            // required for JwtAuthGuard
  controllers: [QuizController],
  providers: [QuizService],
  exports: [QuizService],
})
export class QuizModule {}
```

### Verified Pattern: JWT Guard on All Endpoints

```typescript
// Source: apps/api/src/listening/listening.controller.ts [VERIFIED: read directly]
@Controller('quiz')
export class QuizController {
  @UseGuards(JwtAuthGuard)
  @Post('sessions/start')          // fixed-string BEFORE parameterized routes
  async startSession(@Request() req: AuthenticatedRequest, @Body() body: unknown) { ... }

  @UseGuards(JwtAuthGuard)
  @Post('sessions/:id/complete')
  async completeSession(@Param('id') id: string, @Request() req: AuthenticatedRequest, @Body() body: unknown) { ... }

  @UseGuards(JwtAuthGuard)
  @Get('sessions/:id/mistakes')    // parameterized route LAST
  async getMistakes(@Param('id') id: string, @Request() req: AuthenticatedRequest) { ... }
}
```

### Verified Pattern: Score Card Entrance Animation

```typescript
// Source: apps/web/src/components/reading/passage-score-card.tsx [VERIFIED: read directly]
<motion.div
  initial={{ opacity: 0, scale: 0.95 }}
  animate={{ opacity: 1, scale: 1 }}
  transition={{ duration: 0.3, ease: 'easeOut' }}
  className="mx-auto mt-8 max-w-lg"
>
  <Card>
    <CardContent className="flex flex-col items-center gap-6 py-8">
      <p className="text-[28px] font-semibold leading-tight text-foreground">
        {score}/10 correct
      </p>
    </CardContent>
  </Card>
</motion.div>
```

### Verified Pattern: Next.js Relay Route Handler

```typescript
// Source: apps/web/src/app/api/listening/sessions/complete/route.ts [VERIFIED: read directly]
export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const reqHeaders = await headers();
  const cookieHeader = reqHeaders.get('cookie') ?? '';

  const res = await fetchWithAuth(
    cookieHeader,
    `${INTERNAL_API_URL}/api/quiz/sessions/start`,  // adjust path per route
    { method: 'POST', body: JSON.stringify(body) },
  );

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: err || 'Failed' }, { status: res.status });
  }
  return NextResponse.json(await res.json());
}
```

### Verified Pattern: Shared DTO Schema (Zod)

```typescript
// Source: packages/shared/src/listening.dto.ts [VERIFIED: read directly]
// Pattern for quiz.dto.ts:
import { z } from 'zod';

export const QuizStartSchema = z.object({
  type: z.enum(['MIXED', 'technology', 'travel', 'business', 'daily-communication', 'education']),
});

export const QuizAnswerSchema = z.object({
  questionRef: z.string(),  // "{type}:{id}" e.g. "grammar:clxyz123"
  skillArea: z.enum(['GRAMMAR', 'VOCABULARY', 'READING', 'LISTENING']),
  userAnswer: z.string(),
  isCorrect: z.boolean(),
  xpEarned: z.number().int().min(0),
});

export const QuizCompleteSchema = z.object({
  timeTakenSec: z.number().int().min(0),
  answers: z.array(QuizAnswerSchema).min(1).max(10),
});

export type QuizStartDto = z.infer<typeof QuizStartSchema>;
export type QuizCompleteDto = z.infer<typeof QuizCompleteSchema>;
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| XpEvent-only logging (stub) | GamificationService with atomic User.xpTotal increment | Phase 7 introduces this | Profile page can now show real XP; level display works |
| Per-module XpEvent.create() | Centralized gamificationService.awardXp() | Phase 7 retrofit | All 5 modules must be updated; single source of truth for XP |
| No achievement system | 8 hardcoded achievements with DB seeding | Phase 7 | Profile page can display locked/unlocked state for all 8 |
| Dashboard XP bar placeholder | Real XP progress bar with Level 1–100 | Phase 7 | Visible progress motivates learners |

**Deprecated/outdated:**
- Direct `prisma.xpEvent.create()` in module services: Must be replaced by `gamificationService.awardXp()` in Phase 7 retrofit. The listening.service.ts stub creates XpEvent but skips User.xpTotal — this is technically a Phase 6 bug that Phase 7 corrects.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `VocabularyExercise` table exists in schema under that name with `cefrLevel` and `topic` fields for quiz question pool | Standard Stack / Architecture | Medium: CONTEXT.md D-01 says VocabularyExercise — but schema.prisma shows `VocabularyWord` + `UserVocabularyItem`. Need to verify which table quiz pulls vocabulary questions from |
| A2 | `ReadingQuestion` has a `cefrLevel` field or can be filtered via ReadingPassage.cefrLevel | Architecture Patterns | Medium: Schema shows `ReadingQuestion` has no `cefrLevel` — it belongs to `ReadingPassage`. Topic-filter query must go through `passage: { cefrLevel, topic }` relation |
| A3 | `ListeningQuestion` has `topic` field or can be filtered via ListeningContent.topic | Architecture Patterns | Low: Schema shows ListeningContent has `topic: String?`; ListeningQuestion has no direct topic field — use `content: { cefrLevel, topic }` relation |
| A4 | date-fns `differenceInCalendarDays` API is unchanged between v3 and v4 | Standard Stack | Low: Minor API change risk; verify against installed version |
| A5 | Framer Motion v12 `AnimatePresence` + `motion.div` with `initial/animate/exit/transition` works identically to the existing codebase usage | Code Examples | Low: v12 is backward-compatible for this usage; confirmed by 6 active usages in project |
| A6 | `GrammarQuestion` can be used directly as quiz questions without needing full lesson context | Architecture | Medium: GrammarQuestion.explanation field exists; prompt/answer/distractors exist. But GrammarQuestion.lessonId relation means fetching questions for quiz needs to avoid lesson-specific assumptions |
| A7 | ActivityLog.activityType values are consistent enough to distinguish lesson completions for streak detection | Architecture | Medium: No existing code writes to ActivityLog — GamificationService will write `LESSON_COMPLETE` records. Streak detection will work only after Phase 7 starts writing ActivityLog rows |

**Critical A1 follow-up:** The CONTEXT.md D-01 references "VocabularyExercise" but the Prisma schema has `VocabularyWord` (word records) not a separate exercise table. Quiz vocabulary questions likely come from `VocabularyWord` records used as context-selection or flashcard format, OR this refers to vocabulary question content generated by the content pipeline (PIPE-05). Planner should verify this against Phase 3/5 seeding scripts before writing QuizService question selection.

**Critical A7 follow-up:** ActivityLog has never been written to in any existing module. GamificationService must write `ActivityLog` rows on LESSON_COMPLETE and QUIZ_COMPLETE events for streak tracking to work. The streak-7 and streak-30 achievements are only achievable if ActivityLog is populated by Phase 7.

---

## Open Questions

1. **What table provides vocabulary questions for the quiz pool?**
   - What we know: CONTEXT.md D-01 names "VocabularyExercise" as a source. Schema shows `VocabularyWord` (word definitions) + `UserVocabularyItem` (enrolled words). Phase 3 vocabulary module uses exercise types like FLASHCARD, MATCHING, CONTEXT_SELECTION.
   - What's unclear: Is there a `VocabularyExercise` table that the content pipeline creates? Or does the quiz engine create vocabulary questions ad hoc from `VocabularyWord` records?
   - Recommendation: Planner must read Phase 3 seed scripts and vocabulary module service to confirm the table name before writing QuizService. If no separate exercise table exists, use `VocabularyWord` with `MULTIPLE_CHOICE` format (word + definition).

2. **How does the GamificationModule export to all five module services without circular dependencies?**
   - What we know: NestJS module system requires explicit exports. GrammarModule, VocabularyModule, etc. each need to import GamificationModule to inject GamificationService.
   - What's unclear: Whether GamificationModule needs to import PrismaModule (it does, but PrismaModule is global via AppModule) and whether circular import is triggered.
   - Recommendation: Make GamificationModule export GamificationService; import GamificationModule in GrammarModule, VocabularyModule, ReadingModule, ListeningModule, QuizModule. PrismaModule is already global — no extra import needed.

3. **Does ActivityLog need to be written by all five modules or only tracked via QuizSession/progress tables?**
   - What we know: ActivityLog table exists in schema with `userId`, `activityType`, `skillArea`, `metadata`, `loggedAt`. Streak achievements check for consecutive days of "≥ 1 completed exercise". No existing code writes to ActivityLog.
   - What's unclear: Whether the streak calculation reads from ActivityLog or can instead derive "active day" from the presence of a session-complete event in any module's progress table.
   - Recommendation: Write to ActivityLog in GamificationService.awardXp() (one record per session complete event). This is simpler than querying 5 different progress tables and more aligned with the table's purpose.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All | ✓ | v22.22.2 | — |
| PostgreSQL | DB queries | assumed ✓ | 16.x (per CLAUDE.md) | — |
| Redis | not needed for Phase 7 | — | — | — |
| `framer-motion` | XP toast, level-up modal, score card | ✓ | 12.40.0 (installed) | — |
| `@tanstack/react-query` | Quiz session fetch, profile refresh | ✓ | 5.101.0 (installed) | — |
| `date-fns` | Streak calculation | ✓ | installed (v4.4.0 on registry, project has 3.x or 4.x) | — |
| `lucide-react` | Achievement icons, quiz type icons | ✓ | 1.17.0 (installed) | — |
| shadcn/ui Dialog | Level-up modal | ✓ | Already installed (confirmed via UI-SPEC §Registry Safety) | — |
| shadcn/ui Progress | XP bar, question progress | ✓ | Already installed | — |

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** None.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 2.x |
| Config file | `vitest.config.ts` (per CLAUDE.md) |
| Quick run command | `pnpm test` (from workspace root) or `pnpm --filter api test` |
| Full suite command | `pnpm test:all` or `turbo test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| QUIZ-01 | Mixed-skill quiz session returns 10 questions (3+3+2+2) | unit | `vitest run apps/api/src/quiz/quiz.service.spec.ts` | ❌ Wave 0 |
| QUIZ-02 | Topic-based quiz filters questions by topic across all tables | unit | `vitest run apps/api/src/quiz/quiz.service.spec.ts` | ❌ Wave 0 |
| QUIZ-03 | Session completion stores score, accuracy, timeTaken, answers | integration | `vitest run apps/api/src/quiz/quiz.service.spec.ts` | ❌ Wave 0 |
| QUIZ-04 | GET mistakes endpoint returns incorrect answers with explanation | integration | `vitest run apps/api/src/quiz/quiz.service.spec.ts` | ❌ Wave 0 |
| QUIZ-05 | QuizAnswer.skillArea is correctly populated per question type | unit | `vitest run apps/api/src/quiz/quiz.service.spec.ts` | ❌ Wave 0 |
| GAME-01 | awardXp() applies correct CEFR multiplier (B1=5, B2=7, C1=10 for quiz correct) | unit | `vitest run apps/api/src/gamification/gamification.service.spec.ts` | ❌ Wave 0 |
| GAME-02 | awardXp() increments User.xpTotal and updates User.level atomically | unit | `vitest run apps/api/src/gamification/gamification.service.spec.ts` | ❌ Wave 0 |
| GAME-03 | checkAchievements() awards first-lesson badge exactly once (idempotent) | unit | `vitest run apps/api/src/gamification/gamification.service.spec.ts` | ❌ Wave 0 |
| GAME-04 | Profile endpoint returns UserAchievements with earnedAt | integration | `vitest run apps/api/src/profile/` | ❌ Wave 0 |
| GAME-05 | awardXp() creates exactly one XpEvent per call | unit | `vitest run apps/api/src/gamification/gamification.service.spec.ts` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `pnpm --filter api test -- --run gamification.service`
- **Per wave merge:** `turbo test --filter=api`
- **Phase gate:** Full suite green (`turbo test`) before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `apps/api/src/quiz/quiz.service.spec.ts` — covers QUIZ-01 through QUIZ-05
- [ ] `apps/api/src/gamification/gamification.service.spec.ts` — covers GAME-01 through GAME-05
- [ ] `packages/shared/src/quiz.dto.ts` — Zod schemas for quiz DTOs

*(No existing test infrastructure changes needed — Vitest is already configured)*

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | JwtAuthGuard on all quiz + gamification endpoints |
| V3 Session Management | no | Stateless JWT; no server-side session store |
| V4 Access Control | yes | userId always from JWT payload, never body; user can only complete their own QuizSession |
| V5 Input Validation | yes | Zod schema parse on all incoming bodies; server recomputes accuracy |
| V6 Cryptography | no | No crypto operations in this phase |

### Known Threat Patterns for Quiz/Gamification Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XP inflation via replayed requests | Tampering | Server recomputes XP from answers array; client-supplied xpEarned is ignored; QuizSession has completedAt uniqueness |
| IDOR — completing another user's session | Elevation of Privilege | `WHERE id = sessionId AND userId = jwtUserId` on all QuizSession queries |
| Achievement farming via repeated API calls | Tampering | `upsert` with `@@unique([userId, achievementId])` — additional awards no-op |
| Accuracy manipulation | Tampering | Server recomputes accuracy from `answers[].isCorrect`; ignore client accuracy field |
| XP race condition (concurrent session submits) | Tampering | Prisma `$transaction` with `increment` is atomic; cannot produce negative XP |
| Question fishing (submitting twice) | Tampering | QuizSession.completedAt set on first complete; service checks null before processing |

---

## Sources

### Primary (HIGH confidence)

- `packages/database/prisma/schema.prisma` — All model definitions verified: QuizSession, QuizAnswer, XpEvent, Achievement, UserAchievement, ActivityLog, SkillScore, GrammarQuestion, ReadingQuestion, ListeningQuestion, VocabularyWord
- `apps/api/src/listening/listening.service.ts` — completeSession() pattern; XpEvent creation without User.xpTotal increment (critical finding)
- `apps/api/src/listening/listening.controller.ts` — Route ordering pattern, JwtAuthGuard usage, AuthenticatedRequest type
- `apps/api/src/grammar/grammar.service.ts` — completeSession() pattern, GrammarAttempt createMany, GrammarProgress upsert
- `apps/api/src/app.module.ts` — Module registration pattern; QuizModule and GamificationModule must be added here
- `apps/web/src/components/listening/listening-session.tsx` — AnimatePresence + motion.div usage pattern (v12 compatible)
- `apps/web/src/components/reading/passage-score-card.tsx` — Score card entrance animation pattern
- `.planning/phases/07-quiz-center-gamification/07-CONTEXT.md` — All locked decisions D-01 through D-15
- `.planning/phases/07-quiz-center-gamification/07-UI-SPEC.md` — Component inventory, screen specs, animation contract

### Secondary (MEDIUM confidence)

- `apps/web/src/app/api/listening/sessions/complete/route.ts` — Next.js relay route pattern (fetchWithAuth, INTERNAL_API_URL)
- `apps/api/src/auth/jwt-auth.guard.ts` — JwtAuthGuard implementation verified
- `packages/shared/src/listening.dto.ts` — Zod DTO schema pattern for quiz.dto.ts
- `packages/shared/src/user.dto.ts` — UserProfileDto including xpTotal and level fields
- npm registry: framer-motion@12.40.0, @tanstack/react-query@5.101.0, date-fns@4.4.0

### Tertiary (LOW confidence)

- Training knowledge for Prisma `$transaction` pattern and `$queryRaw` for ORDER BY RANDOM() — should be verified against Prisma 6 docs before implementing

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages already installed and verified in project
- Architecture: HIGH — schema verified directly from schema.prisma; patterns verified from existing module code
- Pitfalls: HIGH — directly observed from codebase (xpTotal not incremented, RANDOM() limitation, route ordering) plus established patterns from prior phases
- XP calculation logic: HIGH — formulas directly from CONTEXT.md locked decisions
- Achievement implementation: MEDIUM — database shape verified; checkAchievements() logic is Claude's discretion

**Research date:** 2026-06-18
**Valid until:** 2026-07-18 (stable stack, no external API dependencies)
