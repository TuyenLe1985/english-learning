# Phase 7: Quiz Center + Gamification - Pattern Map

**Mapped:** 2026-06-18
**Files analyzed:** 30 new/modified files
**Analogs found:** 28 / 30

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `apps/api/src/quiz/quiz.module.ts` | module | config | `apps/api/src/listening/listening.module.ts` | exact |
| `apps/api/src/quiz/quiz.controller.ts` | controller | request-response | `apps/api/src/listening/listening.controller.ts` | exact |
| `apps/api/src/quiz/quiz.service.ts` | service | CRUD | `apps/api/src/listening/listening.service.ts` | exact |
| `apps/api/src/quiz/quiz.service.spec.ts` | test | batch | `apps/api/src/listening/listening.service.spec.ts` | exact |
| `apps/api/src/gamification/gamification.module.ts` | module | config | `apps/api/src/listening/listening.module.ts` | role-match |
| `apps/api/src/gamification/gamification.service.ts` | service | CRUD + event-driven | `apps/api/src/listening/listening.service.ts` | role-match |
| `apps/api/src/gamification/gamification.constants.ts` | utility | config | `apps/api/src/vocabulary/vocabulary.service.ts` (CATEGORY_MAP block) | partial |
| `apps/api/src/gamification/gamification.service.spec.ts` | test | batch | `apps/api/src/listening/listening.service.spec.ts` | role-match |
| `apps/api/src/app.module.ts` (modify) | module | config | self | exact |
| `apps/api/src/grammar/grammar.service.ts` (modify) | service | CRUD | self | exact |
| `apps/api/src/vocabulary/vocabulary.service.ts` (modify) | service | CRUD | self | exact |
| `apps/api/src/reading/reading.service.ts` (modify) | service | CRUD | self | exact |
| `apps/api/src/listening/listening.service.ts` (modify) | service | CRUD | self | exact |
| `apps/api/src/srs/srs.service.ts` (modify) | service | event-driven | self | exact |
| `packages/shared/src/quiz.dto.ts` | utility | transform | `packages/shared/src/listening.dto.ts` | exact |
| `apps/web/src/app/(dashboard)/quiz/page.tsx` | component | request-response | `apps/web/src/app/(dashboard)/listening/page.tsx` | exact |
| `apps/web/src/app/(dashboard)/quiz/[sessionId]/page.tsx` | component | request-response | `apps/web/src/app/(dashboard)/listening/[itemId]/page.tsx` | exact |
| `apps/web/src/app/(dashboard)/quiz/[sessionId]/results/page.tsx` | component | request-response | `apps/web/src/app/(dashboard)/listening/[itemId]/page.tsx` | role-match |
| `apps/web/src/app/api/quiz/sessions/start/route.ts` | route | request-response | `apps/web/src/app/api/listening/sessions/complete/route.ts` | exact |
| `apps/web/src/app/api/quiz/sessions/[sessionId]/complete/route.ts` | route | request-response | `apps/web/src/app/api/listening/sessions/complete/route.ts` | exact |
| `apps/web/src/app/api/quiz/sessions/[sessionId]/mistakes/route.ts` | route | request-response | `apps/web/src/app/api/listening/sessions/complete/route.ts` | exact |
| `apps/web/src/components/quiz/quiz-type-selector.tsx` | component | request-response | `apps/web/src/components/listening/listening-item-card.tsx` | role-match |
| `apps/web/src/components/quiz/quiz-session.tsx` | component | event-driven | `apps/web/src/components/listening/listening-session.tsx` | exact |
| `apps/web/src/components/quiz/quiz-question.tsx` | component | event-driven | `apps/web/src/components/grammar/multiple-choice-exercise.tsx` | exact |
| `apps/web/src/components/quiz/quiz-progress-bar.tsx` | component | transform | `apps/web/src/components/ui/progress.tsx` | role-match |
| `apps/web/src/components/quiz/quiz-score-card.tsx` | component | request-response | `apps/web/src/components/listening/listening-score-card.tsx` | exact |
| `apps/web/src/components/quiz/mistake-review.tsx` | component | request-response | `apps/web/src/components/reading/questions-section.tsx` | role-match |
| `apps/web/src/components/gamification/xp-toast.tsx` | component | event-driven | `apps/web/src/components/listening/listening-session.tsx` (AnimatePresence block) | exact |
| `apps/web/src/components/gamification/level-up-modal.tsx` | component | event-driven | `apps/web/src/components/vocabulary/session-results.tsx` (Dialog block) | exact |
| `apps/web/src/components/gamification/achievement-badge.tsx` | component | transform | `apps/web/src/components/cefr-badge.tsx` | role-match |
| `apps/web/src/components/gamification/achievement-grid.tsx` | component | transform | `apps/web/src/components/cefr-badge.tsx` | role-match |
| `apps/web/src/components/gamification/level-badge.tsx` | component | transform | `apps/web/src/components/cefr-badge.tsx` | exact |
| `apps/web/src/components/gamification/xp-progress-bar.tsx` | component | transform | `apps/web/src/components/grammar/grammar-session-results.tsx` (Progress block) | exact |
| `apps/web/src/app/(dashboard)/profile/page.tsx` (modify) | component | request-response | self | exact |

---

## Pattern Assignments

### `apps/api/src/quiz/quiz.module.ts` (module, config)

**Analog:** `apps/api/src/listening/listening.module.ts`

**Complete pattern** (lines 1-19):
```typescript
/**
 * QuizModule — registers QuizController and QuizService.
 *
 * AuthModule imported to expose JwtAuthGuard.
 * GamificationModule imported to inject GamificationService.
 * PrismaService is global via PrismaModule (AppModule) — do NOT import here.
 */
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GamificationModule } from '../gamification/gamification.module';

@Module({
  imports: [AuthModule, GamificationModule],   // GamificationModule added vs Listening pattern
  controllers: [QuizController],
  providers: [QuizService],
  exports: [QuizService],
})
export class QuizModule {}
```

---

### `apps/api/src/quiz/quiz.controller.ts` (controller, request-response)

**Analog:** `apps/api/src/listening/listening.controller.ts`

**Imports pattern** (lines 17-44):
```typescript
import {
  Controller, Get, Post, Param, Body, Request, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { QuizService } from './quiz.service';
import type { QuizStartResponseDto, QuizCompleteResponseDto, QuizMistakesDto } from '@repo/shared';
import { QuizStartSchema, QuizCompleteSchema } from '@repo/shared';

interface AuthenticatedRequest {
  user: { userId: string; role?: string; cefrLevel?: string; email?: string };
}
```

**Route ordering pattern** (lines 46-108) — fixed-string routes BEFORE parameterized:
```typescript
@Controller('quiz')
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  // FIXED-STRING routes declared FIRST (Pitfall 5 / Route Shadowing)
  @UseGuards(JwtAuthGuard)
  @Post('sessions/start')                    // fixed string BEFORE :id
  async startSession(
    @Request() req: AuthenticatedRequest,
    @Body() body: unknown,
  ): Promise<QuizStartResponseDto> {
    const dto = QuizStartSchema.parse(body);
    return this.quizService.startSession(req.user.userId, dto);
  }

  // PARAMETERIZED routes declared LAST
  @UseGuards(JwtAuthGuard)
  @Post('sessions/:id/complete')
  async completeSession(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @Body() body: unknown,
  ): Promise<QuizCompleteResponseDto> {
    const dto = QuizCompleteSchema.parse(body);
    return this.quizService.completeSession(req.user.userId, id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('sessions/:id/mistakes')
  async getMistakes(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<QuizMistakesDto> {
    return this.quizService.getMistakes(req.user.userId, id);
  }
}
```

---

### `apps/api/src/quiz/quiz.service.ts` (service, CRUD)

**Analog:** `apps/api/src/listening/listening.service.ts`

**Imports pattern** (lines 15-27):
```typescript
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GamificationService } from '../gamification/gamification.service';
import type { QuizStartDto, QuizCompleteDto, QuizCompleteResponseDto } from '@repo/shared';
```

**Constructor + DI pattern** (lines 57-62):
```typescript
@Injectable()
export class QuizService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gamification: GamificationService,   // injected via GamificationModule import
  ) {}
```

**completeSession pattern** — mirrors ListeningService.completeSession() (lines 192-250) with these additions:
- Server recomputes accuracy from answers (T-06-03 equivalent for quiz)
- Calls `this.gamification.awardXp()` instead of `prisma.xpEvent.create()` directly
- Calls `this.gamification.checkAchievements()` after XP award
- Returns `{ score, accuracy, xpEarned, levelUp, newLevel, newAchievements[], incorrectAnswers[] }`
- Uses `completedAt` idempotency guard: check `session.completedAt != null` before processing

**IDOR protection pattern** (follows reading.service.ts pattern):
```typescript
// All session queries must scope by userId
const session = await this.prisma.quizSession.findFirst({
  where: { id: sessionId, userId },   // IDOR: userId from JWT, not body
});
if (!session) throw new NotFoundException(`Quiz session ${sessionId} not found`);
if (session.completedAt) throw new BadRequestException('Session already completed');
```

**Polymorphic question selection pattern** — use `$queryRaw` not `findMany`:
```typescript
// PITFALL 1: Prisma findMany has no ORDER BY RANDOM() support
// Use $queryRaw for each module table:
const grammarQuestions = await this.prisma.$queryRaw<GrammarQuestion[]>`
  SELECT * FROM "GrammarQuestion"
  WHERE "lessonId" IN (
    SELECT l.id FROM "GrammarLesson" l
    JOIN "GrammarTopic" t ON l."topicId" = t.id
    WHERE t."cefrLevel" = ${cefrLevel}
  )
  ORDER BY RANDOM() LIMIT 3
`;
// Repeat for VocabularyWord (cefrLevel filter), ReadingQuestion (via passage), ListeningQuestion (via content)
```

---

### `apps/api/src/quiz/quiz.service.spec.ts` (test, batch)

**Analog:** `apps/api/src/listening/listening.service.spec.ts`

**Mock pattern** (lines 22-42):
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { QuizService } from './quiz.service';
import type { PrismaService } from '../prisma/prisma.service';

const mockQuizSessionCreate = vi.fn();
const mockQuizSessionFindFirst = vi.fn();
const mockQuizAnswerCreateMany = vi.fn();
const mockQuizSessionUpdate = vi.fn();
const mockUserFindUniqueOrThrow = vi.fn();

// Mock GamificationService
const mockGamificationService = {
  awardXp: vi.fn().mockResolvedValue({ xpEarned: 10, oldLevel: 1, newLevel: 1, levelUp: false }),
  checkAchievements: vi.fn().mockResolvedValue([]),
};

const mockPrisma = {
  quizSession: { create: mockQuizSessionCreate, findFirst: mockQuizSessionFindFirst, update: mockQuizSessionUpdate },
  quizAnswer: { createMany: mockQuizAnswerCreateMany },
  user: { findUniqueOrThrow: mockUserFindUniqueOrThrow },
  $queryRaw: vi.fn(),
  $transaction: vi.fn(),
} as unknown as PrismaService;

// Direct instantiation — no NestJS DI (mirrors listening.service.spec.ts line 29-42)
let service: QuizService;
beforeEach(() => {
  vi.clearAllMocks();
  service = new QuizService(mockPrisma, mockGamificationService as any);
});
```

---

### `apps/api/src/gamification/gamification.module.ts` (module, config)

**Analog:** `apps/api/src/listening/listening.module.ts`

**Pattern:**
```typescript
import { Module } from '@nestjs/common';
import { GamificationService } from './gamification.service';

@Module({
  imports: [],          // PrismaModule is global — no import needed
  providers: [GamificationService],
  exports: [GamificationService],   // exported so Grammar/Vocab/Reading/Listening/Quiz modules can import
})
export class GamificationModule {}
```

Note: No controller — GamificationService is a cross-cutting concern injected by other modules.

---

### `apps/api/src/gamification/gamification.service.ts` (service, event-driven + CRUD)

**Analog:** `apps/api/src/listening/listening.service.ts` (structure); `apps/api/src/grammar/grammar.service.ts` (upsert pattern)

**Imports pattern:**
```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { differenceInCalendarDays } from 'date-fns';
import { XP_RATES, CEFR_MULTIPLIERS, ACHIEVEMENT_DEFINITIONS } from './gamification.constants';
import type { AchievementDto } from '@repo/shared';
```

**awardXp() — Prisma $transaction + increment** (RESEARCH Pattern 1):
```typescript
async awardXp(
  userId: string,
  amount: number,
  reason: string,
  skillArea: SkillArea,
  sourceRef?: string,
): Promise<{ xpEarned: number; oldLevel: number; newLevel: number; levelUp: boolean }> {
  // Read current for level boundary detection (cannot use increment alone for level calc)
  const user = await this.prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { xpTotal: true, level: true },
  });

  const oldLevel = user.level;
  const newXpTotal = user.xpTotal + amount;
  const newLevel = Math.min(100, Math.floor(newXpTotal / 100) + 1);  // D-09 formula

  // Atomic: XpEvent create + User.xpTotal increment + User.level write
  await this.prisma.$transaction([
    this.prisma.xpEvent.create({
      data: { userId, amount, reason, skillArea, sourceRef: sourceRef ?? null },
    }),
    this.prisma.user.update({
      where: { id: userId },
      data: { xpTotal: { increment: amount }, level: newLevel },
    }),
    // Write ActivityLog for streak tracking (A7 resolution — GamificationService owns this)
    this.prisma.activityLog.create({
      data: { userId, activityType: 'LESSON_COMPLETE', skillArea },
    }),
  ]);

  return { xpEarned: amount, oldLevel, newLevel, levelUp: newLevel > oldLevel };
}
```

**checkAchievements() — upsert idempotency pattern** (mirrors grammar.service.ts upsert at lines 241-257):
```typescript
async checkAchievements(
  userId: string,
  event: { type: string; metadata?: Record<string, unknown> },
): Promise<AchievementDto[]> {
  const newlyAwarded: AchievementDto[] = [];

  // Always use upsert — never create — to avoid race condition (RESEARCH Pitfall 3)
  // @@unique([userId, achievementId]) makes second upsert a no-op
  const tryAward = async (slug: string): Promise<boolean> => {
    const achievement = await this.prisma.achievement.findUnique({ where: { slug } });
    if (!achievement) return false;
    const before = await this.prisma.userAchievement.count({
      where: { userId, achievementId: achievement.id },
    });
    await this.prisma.userAchievement.upsert({
      where: { userId_achievementId: { userId, achievementId: achievement.id } },
      create: { userId, achievementId: achievement.id },
      update: {},  // no-op if already exists
    });
    const after = await this.prisma.userAchievement.count({
      where: { userId, achievementId: achievement.id },
    });
    if (after > before) {
      newlyAwarded.push({ id: achievement.id, slug, name: achievement.name, description: achievement.description, iconUrl: achievement.iconUrl ?? null, xpReward: achievement.xpReward });
    }
    return after > before;
  };
  // ... per-achievement condition checks using tryAward()
  return newlyAwarded;
}
```

**Streak detection** (RESEARCH Pattern 6, uses date-fns):
```typescript
private async checkStreak(userId: string, streakTarget: number): Promise<boolean> {
  const since = new Date();
  since.setDate(since.getDate() - (streakTarget + 1));

  const logs = await this.prisma.activityLog.findMany({
    where: { userId, loggedAt: { gte: since } },
    orderBy: { loggedAt: 'desc' },
    select: { loggedAt: true },
  });

  const days = [...new Set(logs.map(l => l.loggedAt.toISOString().slice(0, 10)))].sort().reverse();

  let streak = 0;
  for (let i = 0; i < days.length; i++) {
    const prev = i === 0 ? new Date() : new Date(days[i - 1]!);
    const curr = new Date(days[i]!);
    if (differenceInCalendarDays(prev, curr) === 1 || (i === 0 && differenceInCalendarDays(new Date(), curr) <= 1)) {
      streak++;
      if (streak >= streakTarget) return true;
    } else break;
  }
  return false;
}
```

---

### `apps/api/src/gamification/gamification.constants.ts` (utility, config)

**Analog:** Constants block in `apps/api/src/vocabulary/vocabulary.service.ts` (lines 27-51)

**Pattern:**
```typescript
// Typed constants — define at module level, not inside class
// Mirror: CATEGORY_MAP pattern from vocabulary.service.ts lines 27-36

import type { SkillArea } from '@repo/shared';  // or from @prisma/client

export const XP_RATES = {
  QUIZ_CORRECT: 5,
  QUIZ_SESSION_BONUS: 10,
  LESSON_COMPLETE: 20,
  SRS_REVIEW: 3,       // flat — no CEFR multiplier
} as const;

export const CEFR_MULTIPLIERS: Record<string, number> = {
  B1: 1.0,
  B2: 1.5,
  C1: 2.0,
};

export function calculateXp(baseRate: number, cefrLevel: string): number {
  const multiplier = CEFR_MULTIPLIERS[cefrLevel] ?? 1.0;
  return Math.round(baseRate * multiplier);
}

export const ACHIEVEMENT_DEFINITIONS = [
  { slug: 'first-lesson',        name: 'First Step',           description: 'Complete your first lesson',                xpReward: 10 },
  { slug: 'vocab-100',           name: 'Word Collector',       description: 'Learn 100 vocabulary words',                xpReward: 50 },
  { slug: 'vocab-500',           name: 'Lexicon Builder',      description: 'Learn 500 vocabulary words',                xpReward: 200 },
  { slug: 'grammar-master',      name: 'Grammar Master',       description: 'Score 80%+ on a grammar topic',             xpReward: 100 },
  { slug: 'reading-complete',    name: 'First Reader',         description: 'Complete your first reading passage',       xpReward: 20 },
  { slug: 'listening-complete',  name: 'First Listener',       description: 'Complete your first listening exercise',    xpReward: 20 },
  { slug: 'streak-7',           name: 'Week Warrior',          description: '7 consecutive days of practice',           xpReward: 75 },
  { slug: 'streak-30',          name: 'Monthly Champion',      description: '30 consecutive days of practice',          xpReward: 500 },
] as const;
```

---

### `apps/api/src/app.module.ts` (modify — add QuizModule + GamificationModule)

**Analog:** Self

**Change pattern** (lines 1-34 — add two imports):
```typescript
// ADD to existing imports:
import { QuizModule } from './quiz/quiz.module';
import { GamificationModule } from './gamification/gamification.module';

// ADD to @Module({ imports: [...] }):
GamificationModule,   // added before QuizModule (dependency order)
QuizModule,
```

---

### `apps/api/src/grammar/grammar.service.ts` (modify — add gamification hook)

**Analog:** Self (existing completeSession at lines 199-263)

**Change pattern** — constructor and completeSession modification:
```typescript
// BEFORE (line 30-31):
constructor(private readonly prisma: PrismaService) {}

// AFTER:
constructor(
  private readonly prisma: PrismaService,
  private readonly gamification: GamificationService,
) {}

// In completeSession() — replace direct XpEvent create with:
// (Grammar currently does NOT create XpEvent — but wires gamification here)
const xpAmount = calculateXp(XP_RATES.LESSON_COMPLETE, userCefrLevel);
const xpResult = await this.gamification.awardXp(userId, xpAmount, 'grammar_lesson', 'GRAMMAR', lessonId);
const newAchievements = await this.gamification.checkAchievements(userId, { type: 'LESSON_COMPLETE', metadata: { lessonId, skillArea: 'GRAMMAR' } });

// ALSO: GrammarModule must import GamificationModule
```

Same modification pattern applies to `vocabulary.service.ts`, `reading.service.ts`, `listening.service.ts`:
- **listening.service.ts** (lines 232-242): Replace `prisma.xpEvent.create()` with `gamification.awardXp()` + `gamification.checkAchievements()`
- **reading.service.ts**: Same replacement
- **vocabulary.service.ts**: Same replacement

---

### `apps/api/src/srs/srs.service.ts` (modify — add 3 XP flat)

**Analog:** Self

**Change pattern** — in `submitReview()` after the Prisma card update, for Rating.Good and Rating.Easy:
```typescript
// After FSRS card update write, check rating:
if (rating === Rating.Good || rating === Rating.Easy) {
  // D-10: SRS review XP is flat 3 — no CEFR multiplier
  await this.gamification.awardXp(userId, XP_RATES.SRS_REVIEW, 'srs_review', 'VOCABULARY', cardId);
}
```

---

### `packages/shared/src/quiz.dto.ts` (utility, transform)

**Analog:** `packages/shared/src/listening.dto.ts`

**Pattern** (mirrors listening.dto.ts Zod schema structure):
```typescript
import { z } from 'zod';

// Inbound DTOs (client → API)
export const QuizStartSchema = z.object({
  type: z.enum(['MIXED', 'technology', 'travel', 'business', 'daily-communication', 'education']),
});

export const QuizAnswerItemSchema = z.object({
  questionRef: z.string(),      // "{type}:{id}" e.g. "grammar:clxyz123"
  skillArea: z.enum(['GRAMMAR', 'VOCABULARY', 'READING', 'LISTENING']),
  userAnswer: z.string(),
  correctAnswer: z.string(),
  isCorrect: z.boolean(),
});

export const QuizCompleteSchema = z.object({
  timeTakenSec: z.number().int().min(0),
  answers: z.array(QuizAnswerItemSchema).min(1).max(10),
});

// Outbound DTOs (API → client)
export type QuizStartDto = z.infer<typeof QuizStartSchema>;
export type QuizCompleteDto = z.infer<typeof QuizCompleteSchema>;
export type QuizAnswerItemDto = z.infer<typeof QuizAnswerItemSchema>;

// Response shape (not Zod — returned by NestJS service)
export interface QuizQuestionDto {
  questionRef: string;          // "{type}:{id}"
  skillArea: 'GRAMMAR' | 'VOCABULARY' | 'READING' | 'LISTENING';
  prompt: string;
  answer: string;
  distractors: string[];
  explanation: string | null;
}

export interface QuizStartResponseDto {
  sessionId: string;
  questions: QuizQuestionDto[];
}

export interface AchievementDto {
  id: string;
  slug: string;
  name: string;
  description: string;
  iconUrl: string | null;
  xpReward: number;
}

export interface QuizCompleteResponseDto {
  score: number;
  accuracy: number;
  xpEarned: number;
  levelUp: boolean;
  newLevel: number;
  newAchievements: AchievementDto[];
  incorrectAnswers: QuizQuestionDto[];   // for client-side mistake review (Pitfall 4)
}
```

---

### `apps/web/src/app/(dashboard)/quiz/page.tsx` (component, request-response)

**Analog:** `apps/web/src/app/(dashboard)/listening/page.tsx`

**Server Component structure** (lines 14-206):
```typescript
// Server Component — auth-gate + server-side data fetch pattern
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { headers } from 'next/headers';

export default async function QuizPage({ searchParams }: Props) {
  const session = await auth();
  if (!session) redirect('/login');

  // No NestJS fetch needed on quiz browse — quiz sessions are started client-side
  // Render QuizTypeSelector client component

  return (
    <div className="mx-auto max-w-screen-xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-[28px] font-semibold text-foreground">Quiz Center</h1>
        <p className="mt-1 text-sm text-muted-foreground">Test your skills across all areas</p>
      </div>
      <QuizTypeSelector />
    </div>
  );
}
```

---

### `apps/web/src/app/(dashboard)/quiz/[sessionId]/page.tsx` (component, request-response)

**Analog:** `apps/web/src/app/(dashboard)/listening/[itemId]/page.tsx`

**Server Component + data fetch pattern** (lines 52-137):
```typescript
// Server Component: fetch session from NestJS, pass to client orchestrator
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { headers } from 'next/headers';
import { fetchWithAuth, INTERNAL_API_URL } from '@/lib/api-client';

export default async function QuizSessionPage({ params }: Props) {
  const session = await auth();
  if (!session) redirect('/login');

  const { sessionId } = await params;
  const reqHeaders = await headers();
  const cookieHeader = reqHeaders.get('cookie') ?? '';

  // Fetch session questions from NestJS
  // NOTE: Questions already fetched during session start and stored in client state
  // This page receives sessionId from URL and renders QuizSession client component
  return (
    <div className="mx-auto max-w-screen-xl px-4 py-8">
      <QuizSessionClient sessionId={sessionId} />
    </div>
  );
}
```

---

### `apps/web/src/app/api/quiz/sessions/start/route.ts` (route, request-response)

**Analog:** `apps/web/src/app/api/listening/sessions/complete/route.ts`

**Relay route pattern** (lines 27-62 — copy exactly, change only URL and path):
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { headers } from 'next/headers';
import { fetchWithAuth, INTERNAL_API_URL } from '@/lib/api-client';

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
    `${INTERNAL_API_URL}/api/quiz/sessions/start`,  // only this URL changes
    { method: 'POST', body: JSON.stringify(body) },
  );

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: err || 'Failed' }, { status: res.status });
  }
  return NextResponse.json(await res.json());
}
```

Same pattern for `[sessionId]/complete/route.ts` (POST) and `[sessionId]/mistakes/route.ts` (GET — use `fetchWithAuth` without body, method GET).

---

### `apps/web/src/components/quiz/quiz-session.tsx` (component, event-driven)

**Analog:** `apps/web/src/components/listening/listening-session.tsx`

**Session orchestrator pattern** (lines 79-309):
```typescript
'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';   // already in listening-session.tsx line 17
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';        // add: question progress bar
import { XpToast } from '@/components/gamification/xp-toast';
import { LevelUpModal } from '@/components/gamification/level-up-modal';

// Accumulate answers in state — batch POST on question 10 (D-06, mirrors listening-session.tsx line 87-97)
const [answers, setAnswers] = useState<SessionAnswer[]>([]);
const [submitting, setSubmitting] = useState(false);
const [isComplete, setIsComplete] = useState(false);
const [sessionResult, setSessionResult] = useState<QuizCompleteResponseDto | null>(null);
const [currentIndex, setCurrentIndex] = useState(0);

// On answer: lock and advance (D-06 — no back navigation)
const handleAnswer = (answer: SessionAnswer) => {
  if (answers.some(a => a.questionRef === answer.questionRef)) return;  // prevent double-answer
  setAnswers(prev => [...prev, answer]);
  if (currentIndex < questions.length - 1) {
    setCurrentIndex(i => i + 1);
  }
};

// On last question: batch POST (mirrors listening-session.tsx lines 114-157)
const handleSubmit = async () => {
  setSubmitting(true);
  try {
    const res = await fetch(`/api/quiz/sessions/${sessionId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timeTakenSec: elapsed, answers }),
    });
    if (!res.ok) throw new Error('Failed to submit');
    const result = await res.json() as QuizCompleteResponseDto;
    setSessionResult(result);
    setIsComplete(true);
  } catch {
    toast({ title: 'Submission failed', variant: 'destructive' });
  } finally {
    setSubmitting(false);
  }
};
```

---

### `apps/web/src/components/quiz/quiz-question.tsx` (component, event-driven)

**Analog:** `apps/web/src/components/grammar/multiple-choice-exercise.tsx`

**Polymorphic dispatch pattern** — routes to existing exercise components:
```typescript
'use client';
// Dispatch to existing exercise components by question type
// Direct reuse — no re-implementation needed

import { MultipleChoiceExercise } from '@/components/grammar/multiple-choice-exercise';
// Note: READING and LISTENING question types are also MULTIPLE_CHOICE format in quiz context

interface QuizQuestionProps {
  question: QuizQuestionDto;
  questionNumber: number;
  total: number;
  onAnswer: (answer: SessionAnswer) => void;
}

export function QuizQuestion({ question, questionNumber, total, onAnswer }: QuizQuestionProps) {
  // All quiz question types render as MultipleChoiceExercise
  // (grammar, vocab, reading, listening questions are all MC in quiz format)
  return (
    <MultipleChoiceExercise
      question={{
        id: question.questionRef,
        exerciseType: 'MULTIPLE_CHOICE',
        prompt: question.prompt,
        answer: question.answer,
        distractors: question.distractors,
        explanation: question.explanation,
        difficulty: 1,
        xpReward: 5,
      }}
      onCorrect={() => onAnswer({ questionRef: question.questionRef, skillArea: question.skillArea, isCorrect: true, userAnswer: question.answer, correctAnswer: question.answer })}
      onIncorrect={(userAnswer) => onAnswer({ questionRef: question.questionRef, skillArea: question.skillArea, isCorrect: false, userAnswer: userAnswer ?? '', correctAnswer: question.answer })}
    />
  );
}
```

---

### `apps/web/src/components/quiz/quiz-score-card.tsx` (component, request-response)

**Analog:** `apps/web/src/components/listening/listening-score-card.tsx`

**Score card pattern** (lines 50-116):
```typescript
'use client';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function QuizScoreCard({ score, total, xpEarned, accuracy, onRestart }: Props) {
  return (
    // Framer Motion entrance — identical to listening-score-card.tsx lines 50-57
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="max-w-lg mx-auto mt-8"
      role="region"
      aria-label="Quiz results"
    >
      <Card>
        <CardContent className="flex flex-col gap-6 pt-6">
          {/* Score headline — 28px font (mirrors listening-score-card.tsx line 61-65) */}
          <div className="text-center">
            <p className="text-[28px] font-semibold text-foreground text-center">
              {score}/{total} correct
            </p>
            <p className="text-sm text-muted-foreground text-center mt-1">
              {Math.round(accuracy)}% accuracy · {xpEarned} XP earned
            </p>
          </div>
          {/* action buttons, mistake review link */}
        </CardContent>
      </Card>
    </motion.div>
  );
}
```

---

### `apps/web/src/components/gamification/xp-toast.tsx` (component, event-driven)

**Analog:** `apps/web/src/components/listening/listening-session.tsx` (AnimatePresence block, lines 207-215)

**Framer Motion toast pattern** (RESEARCH Pattern 5, confirmed v12 compatible):
```typescript
'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function XpToast({ xpAmount, onDismiss }: { xpAmount: number; onDismiss?: () => void }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          // Position: fixed bottom-right (D-11)
          className="fixed bottom-4 right-4 z-50 rounded-lg bg-primary px-4 py-3 text-primary-foreground shadow-lg cursor-pointer"
          initial={{ y: 50, opacity: 0 }}      // D-11: slide up from bottom
          animate={{ y: 0, opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}        // D-11: 0.3s duration
          onClick={() => setVisible(false)}
          role="status"
          aria-live="polite"
        >
          +{xpAmount} XP
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

---

### `apps/web/src/components/gamification/level-up-modal.tsx` (component, event-driven)

**Analog:** `apps/web/src/components/vocabulary/session-results.tsx` (Dialog block, lines 20-30)

**shadcn Dialog pattern:**
```typescript
'use client';
import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';

export function LevelUpModal({ newLevel, onClose }: { newLevel: number; onClose?: () => void }) {
  const [open, setOpen] = useState(false);

  // D-11: show 1 second after XP toast (stagger)
  useEffect(() => {
    const timer = setTimeout(() => setOpen(true), 1000);
    const autoClose = setTimeout(() => { setOpen(false); onClose?.(); }, 5000);
    return () => { clearTimeout(timer); clearTimeout(autoClose); };
  }, [onClose]);

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) onClose?.(); }}>
      <DialogContent className="sm:max-w-sm text-center">
        <DialogHeader>
          <DialogTitle className="text-2xl">Level {newLevel}!</DialogTitle>
          <DialogDescription>You reached a new level. Keep it up!</DialogDescription>
        </DialogHeader>
        {/* LevelBadge displayed prominently */}
        <LevelBadge level={newLevel} size="lg" />
      </DialogContent>
    </Dialog>
  );
}
```

---

### `apps/web/src/components/gamification/level-badge.tsx` (component, transform)

**Analog:** `apps/web/src/components/cefr-badge.tsx`

**Badge pattern** (lines 54-70 — copy structure, adapt for numeric level):
```typescript
'use client';
import { cn } from '@/lib/utils';

interface LevelBadgeProps {
  level: number;          // 1–100
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LevelBadge({ level, size = 'md', className }: LevelBadgeProps) {
  // Color tiers: 1-33 blue, 34-66 emerald, 67-100 violet (mirrors CefrBadge color scheme)
  const tierClass = level <= 33
    ? 'bg-blue-100 text-blue-700 border-blue-200'
    : level <= 66
      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
      : 'bg-violet-100 text-violet-800 border-violet-200';

  return (
    <span
      role="img"
      aria-label={`Level ${level}`}
      className={cn(
        'inline-flex items-center rounded-full border font-semibold transition-colors',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : size === 'lg' ? 'px-4 py-1 text-lg' : 'px-2.5 py-0.5 text-sm',
        tierClass,
        className,
      )}
    >
      Lv. {level}
    </span>
  );
}
```

---

### `apps/web/src/components/gamification/xp-progress-bar.tsx` (component, transform)

**Analog:** `apps/web/src/components/grammar/grammar-session-results.tsx` (Progress block, lines 65-72)

**Progress pattern:**
```typescript
'use client';
import { Progress } from '@/components/ui/progress';

interface XpProgressBarProps {
  xpTotal: number;   // raw total from User.xpTotal
  level: number;     // current level (1-100)
}

export function XpProgressBar({ xpTotal, level }: XpProgressBarProps) {
  // D-09 formula: progress within current level
  const xpIntoLevel = xpTotal % 100;
  const xpForNext = 100;
  const progressPct = (xpIntoLevel / xpForNext) * 100;

  return (
    <div className="w-full">
      <div className="mb-1 flex items-center justify-between text-sm text-muted-foreground">
        <span>Level {level}</span>
        <span>{xpIntoLevel}/{xpForNext} XP to Level {Math.min(100, level + 1)}</span>
      </div>
      {/* shadcn Progress — mirrors grammar-session-results.tsx line 68 */}
      <Progress value={progressPct} className="h-3" aria-label="XP progress to next level" />
    </div>
  );
}
```

---

### `apps/web/src/components/gamification/achievement-badge.tsx` (component, transform)

**Analog:** `apps/web/src/components/cefr-badge.tsx`

**Badge with locked/unlocked state pattern** (mirrors cefr-badge.tsx lines 54-70):
```typescript
'use client';
import { cn } from '@/lib/utils';
import { Lock } from 'lucide-react';

interface AchievementBadgeProps {
  slug: string;
  name: string;
  description: string;
  iconUrl: string | null;
  earnedAt: Date | null;   // null = locked
  className?: string;
}

export function AchievementBadge({ name, description, iconUrl, earnedAt, className }: AchievementBadgeProps) {
  const isUnlocked = earnedAt !== null;
  return (
    <div
      role="img"
      aria-label={isUnlocked ? `Achievement: ${name}` : `Locked achievement: ${name}`}
      className={cn(
        'flex flex-col items-center gap-1 rounded-lg border p-3 text-center',
        isUnlocked ? 'border-emerald-200 bg-emerald-50' : 'border-border bg-muted opacity-60',
        className,
      )}
    >
      {iconUrl ? <img src={iconUrl} alt="" className="size-8" /> : isUnlocked ? <span className="text-2xl">🏆</span> : <Lock className="size-5 text-muted-foreground" />}
      <p className="text-xs font-medium text-foreground">{name}</p>
      {isUnlocked && earnedAt && (
        <p className="text-[10px] text-muted-foreground">{new Date(earnedAt).toLocaleDateString()}</p>
      )}
    </div>
  );
}
```

---

### `apps/web/src/components/gamification/achievement-grid.tsx` (component, transform)

**Analog:** `apps/web/src/components/vocabulary/category-card.tsx` (grid of cards)

**Grid layout pattern:**
```typescript
'use client';
import { AchievementBadge } from './achievement-badge';
import type { AchievementDto } from '@repo/shared';

interface UserAchievement extends AchievementDto {
  earnedAt: Date | null;
}

export function AchievementGrid({ achievements }: { achievements: UserAchievement[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {achievements.map((a) => (
        <AchievementBadge
          key={a.slug}
          slug={a.slug}
          name={a.name}
          description={a.description}
          iconUrl={a.iconUrl}
          earnedAt={a.earnedAt}
        />
      ))}
    </div>
  );
}
```

---

## Shared Patterns

### Authentication Guard
**Source:** `apps/api/src/auth/jwt-auth.guard.ts` + `apps/api/src/listening/listening.controller.ts` (lines 55, 82, 100)
**Apply to:** All NestJS quiz and gamification controller endpoints
```typescript
@UseGuards(JwtAuthGuard)
// userId ALWAYS from: req.user.userId  — NEVER from request body
```

### Error Handling — NestJS
**Source:** `apps/api/src/reading/reading.service.ts` (lines 19) + `apps/api/src/listening/listening.service.ts` (lines 197-205)
**Apply to:** QuizService, GamificationService
```typescript
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';

// Pattern for entity not found:
if (!entity) throw new NotFoundException(`Quiz session ${id} not found`);
// Pattern for business logic violation:
if (session.completedAt) throw new BadRequestException('Session already completed');
```

### Zod Body Parsing — Controller
**Source:** `apps/api/src/listening/listening.controller.ts` (line 89) + `apps/api/src/reading/reading.controller.ts` (line 96)
**Apply to:** All QuizController POST endpoints
```typescript
// In controller method body — parse with Zod schema from @repo/shared:
const dto = QuizStartSchema.parse(body);    // throws ZodError → 400 via global exception filter
```

### Next.js Relay Route — Auth Guard
**Source:** `apps/web/src/app/api/listening/sessions/complete/route.ts` (lines 27-32)
**Apply to:** All `apps/web/src/app/api/quiz/` route handlers
```typescript
const session = await auth();
if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
```

### fetchWithAuth — Internal API Call
**Source:** `apps/web/src/lib/api-client.ts` (lines 69-93)
**Apply to:** All Next.js relay routes and Server Components fetching from NestJS
```typescript
import { fetchWithAuth, INTERNAL_API_URL } from '@/lib/api-client';
// Use INTERNAL_API_URL (not NEXT_PUBLIC_API_URL) in Server Components and Route Handlers
```

### Framer Motion Entrance Animation
**Source:** `apps/web/src/components/listening/listening-score-card.tsx` (lines 50-57) + `apps/web/src/components/grammar/grammar-session-results.tsx` (lines 47-52) + `apps/web/src/components/reading/passage-score-card.tsx` (lines 44-50)
**Apply to:** QuizScoreCard, all gamification UI components with entrance animation
```typescript
<motion.div
  initial={{ opacity: 0, scale: 0.95 }}
  animate={{ opacity: 1, scale: 1 }}
  transition={{ duration: 0.3, ease: 'easeOut' }}
>
```

### AnimatePresence Pattern
**Source:** `apps/web/src/components/listening/listening-session.tsx` (lines 207-215)
**Apply to:** XpToast (slide-up), any quiz question transition animation
```typescript
// v12-compatible pattern — confirmed active usage in project
import { motion, AnimatePresence } from 'framer-motion';
<AnimatePresence>
  {visible && (
    <motion.div
      key="unique-key"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
```

### shadcn Progress Component
**Source:** `apps/web/src/components/grammar/grammar-session-results.tsx` (lines 65-72)
**Apply to:** XpProgressBar, quiz question progress bar
```typescript
import { Progress } from '@/components/ui/progress';
<Progress value={pct} className="h-3" aria-label="descriptive label" />
```

### Prisma Upsert — Idempotent Write
**Source:** `apps/api/src/grammar/grammar.service.ts` (lines 241-257) + `apps/api/src/listening/listening.service.ts` (lines 213-229)
**Apply to:** GamificationService.checkAchievements() (UserAchievement upsert)
```typescript
await this.prisma.userAchievement.upsert({
  where: { userId_achievementId: { userId, achievementId: achievement.id } },
  create: { userId, achievementId: achievement.id },
  update: {},  // no-op on duplicate — idempotency guaranteed by @@unique
});
```

### createMany — Bulk Insert
**Source:** `apps/api/src/grammar/grammar.service.ts` (lines 217-224)
**Apply to:** QuizService.completeSession() for QuizAnswer batch insert + achievement seed upsertMany
```typescript
await this.prisma.quizAnswer.createMany({
  data: answers.map(a => ({ sessionId, questionRef: a.questionRef, skillArea: a.skillArea, isCorrect: a.isCorrect, userAnswer: a.userAnswer ?? null, correctAnswer: a.correctAnswer ?? null, xpEarned: a.xpEarned })),
  skipDuplicates: false,
});
```

### Server Component — Auth + Fetch + Pass to Client
**Source:** `apps/web/src/app/(dashboard)/listening/[itemId]/page.tsx` (lines 70-137)
**Apply to:** All quiz page.tsx files in the dashboard route group
```typescript
export default async function QuizPage({ params, searchParams }: Props) {
  const session = await auth();
  if (!session) redirect('/login');

  const { sessionId } = await params;
  const reqHeaders = await headers();
  const cookieHeader = reqHeaders.get('cookie') ?? '';

  const data = await fetchWithAuth(cookieHeader, `${INTERNAL_API_URL}/api/...`);
  // Pass data as props to Client Component
  return <ClientComponent data={data} />;
}
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| Achievement seed script | utility | batch | No startup seed scripts exist yet — this is a new pattern; use `prisma.achievement.upsertMany()` or loop-upsert with `ACHIEVEMENT_DEFINITIONS` from gamification.constants.ts. Can be implemented as a NestJS `OnModuleInit` hook in GamificationService or as a standalone `pnpm db:seed:achievements` script following pipeline seed scripts in `apps/api/src/pipeline/seed.service.ts`. |

---

## Metadata

**Analog search scope:** `apps/api/src/`, `apps/web/src/`, `packages/shared/src/`, `packages/database/prisma/`
**Files scanned:** 55 source files + schema.prisma
**Pattern extraction date:** 2026-06-18

**Key findings:**
1. ListeningModule/Controller/Service (lines 1-251) is the exact template for QuizModule — same structure, same patterns, same auth guard usage
2. All existing session-complete endpoints create `XpEvent` but NEVER increment `User.xpTotal` — GamificationService.awardXp() fixes this gap and must be called by all 5 modules
3. Framer Motion v12 `AnimatePresence + motion.div` with `initial/animate/exit/transition` is confirmed active in 3 components — safe to copy exactly
4. shadcn Dialog is confirmed installed (used in vocabulary/session-results.tsx) — use for LevelUpModal
5. `fetchWithAuth` from `api-client.ts` is the mandatory relay pattern for all Next.js Route Handlers proxying to NestJS
6. Achievement upsert must use Prisma `upsert` not `create` — the `@@unique([userId, achievementId])` constraint is in schema and prevents double-award atomically
7. Route ordering: fixed-string routes (`sessions/start`) must be declared BEFORE parameterized routes (`sessions/:id`) — documented in listening.controller.ts as Pitfall 7
