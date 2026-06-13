# Phase 4: Grammar Module - Pattern Map

**Mapped:** 2026-06-13
**Files analyzed:** 22 new/modified files
**Analogs found:** 21 / 22

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `apps/api/src/grammar/grammar.module.ts` | module | config | `apps/api/src/vocabulary/vocabulary.module.ts` | exact |
| `apps/api/src/grammar/grammar.controller.ts` | controller | request-response | `apps/api/src/vocabulary/vocabulary.controller.ts` | exact |
| `apps/api/src/grammar/grammar.service.ts` | service | CRUD | `apps/api/src/vocabulary/vocabulary.service.ts` | exact |
| `apps/api/src/grammar/grammar.service.spec.ts` | test | CRUD | `apps/api/src/vocabulary/vocabulary.service.spec.ts` | exact |
| `packages/shared/src/grammar.dto.ts` | utility | transform | `packages/shared/src/vocabulary.dto.ts` | exact |
| `packages/shared/src/index.ts` (modify) | config | transform | `packages/shared/src/index.ts` | exact |
| `apps/api/src/app.module.ts` (modify) | config | config | `apps/api/src/vocabulary/vocabulary.module.ts` | role-match |
| `apps/web/src/app/(dashboard)/grammar/page.tsx` | component | request-response | `apps/web/src/app/(dashboard)/vocabulary/page.tsx` | exact |
| `apps/web/src/app/(dashboard)/grammar/[area]/page.tsx` | component | request-response | `apps/web/src/app/(dashboard)/vocabulary/[category]/page.tsx` | exact |
| `apps/web/src/app/(dashboard)/grammar/[area]/[topic]/page.tsx` | component | request-response | `apps/web/src/app/(dashboard)/vocabulary/[category]/page.tsx` | role-match |
| `apps/web/src/app/(dashboard)/grammar/[area]/[topic]/[lesson]/page.tsx` | component | request-response | `apps/web/src/app/(dashboard)/vocabulary/[category]/[wordId]/page.tsx` | role-match |
| `apps/web/src/app/api/grammar/areas/route.ts` | route | request-response | `apps/web/src/app/api/vocabulary/categories/route.ts` | exact |
| `apps/web/src/app/api/grammar/areas/[areaSlug]/topics/route.ts` | route | request-response | `apps/web/src/app/api/vocabulary/[category]/words/route.ts` | exact |
| `apps/web/src/app/api/grammar/topics/[topicSlug]/lessons/route.ts` | route | request-response | `apps/web/src/app/api/vocabulary/[category]/words/route.ts` | exact |
| `apps/web/src/app/api/grammar/topics/[topicId]/weak-questions/route.ts` | route | request-response | `apps/web/src/app/api/vocabulary/[category]/words/route.ts` | role-match |
| `apps/web/src/app/api/grammar/lessons/[lessonSlug]/route.ts` | route | request-response | `apps/web/src/app/api/vocabulary/[category]/[wordId]/route.ts` | exact |
| `apps/web/src/app/api/grammar/sessions/complete/route.ts` | route | request-response | `apps/web/src/app/api/vocabulary/session/complete/route.ts` | exact |
| `apps/web/src/components/grammar/grammar-area-card.tsx` | component | request-response | `apps/web/src/components/vocabulary/category-card.tsx` | exact |
| `apps/web/src/components/grammar/grammar-lesson-page.tsx` | component | event-driven | `apps/web/src/components/vocabulary/practice-session.tsx` | exact |
| `apps/web/src/components/grammar/grammar-session-results.tsx` | component | event-driven | `apps/web/src/components/vocabulary/session-results.tsx` | exact |
| `apps/web/src/components/grammar/explanation-view.tsx` | component | request-response | `apps/web/src/components/vocabulary/exercises/flashcard-exercise.tsx` | partial-match |
| `apps/web/src/components/grammar/exercises/multiple-choice-exercise.tsx` | component | event-driven | `apps/web/src/components/vocabulary/exercises/cloze-exercise.tsx` | exact |
| `apps/web/src/components/grammar/exercises/fill-in-the-blank-exercise.tsx` | component | event-driven | `apps/web/src/components/vocabulary/exercises/cloze-exercise.tsx` | exact |
| `apps/web/src/components/grammar/exercises/sentence-transformation-exercise.tsx` | component | event-driven | `apps/web/src/components/vocabulary/exercises/recall-exercise.tsx` | role-match |
| `apps/web/src/components/grammar/exercises/error-correction-exercise.tsx` | component | event-driven | `apps/web/src/components/vocabulary/exercises/cloze-exercise.tsx` | role-match |
| `apps/web/src/components/grammar/exercises/drag-and-drop-exercise.tsx` | component | event-driven | none — new dnd-kit pattern | no-analog |
| `apps/web/src/components/grammar/exercises/multiple-choice-exercise.test.tsx` | test | event-driven | `apps/web/src/components/vocabulary/exercises/flashcard-exercise.test.tsx` | exact |
| `apps/web/src/components/grammar/exercises/fill-in-the-blank-exercise.test.tsx` | test | event-driven | `apps/web/src/components/vocabulary/exercises/flashcard-exercise.test.tsx` | exact |
| `apps/web/src/components/grammar/exercises/drag-and-drop-exercise.test.tsx` | test | event-driven | `apps/web/src/components/vocabulary/exercises/flashcard-exercise.test.tsx` | role-match |
| `packages/database/prisma/schema.prisma` (modify) | config | CRUD | existing schema.prisma slug fields | exact |
| `packages/database/prisma/seed.ts` (modify) | utility | batch | `packages/database/prisma/seed.ts` | exact |
| `packages/database/prisma/seed-data/grammar.json` | config | batch | `packages/database/prisma/seed-data/vocabulary.json` | exact |

---

## Pattern Assignments

### `apps/api/src/grammar/grammar.module.ts` (module, config)

**Analog:** `apps/api/src/vocabulary/vocabulary.module.ts`

**Full pattern** (lines 1–19):
```typescript
/**
 * GrammarModule — registers GrammarController and GrammarService.
 *
 * AuthModule is imported to expose JwtAuthGuard for @UseGuards(JwtAuthGuard).
 * PrismaService is provided globally via PrismaModule (imported in AppModule) — do NOT import here.
 */

import { Module } from '@nestjs/common';
import { GrammarController } from './grammar.controller';
import { GrammarService } from './grammar.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [GrammarController],
  providers: [GrammarService],
  exports: [GrammarService],
})
export class GrammarModule {}
```

---

### `apps/api/src/grammar/grammar.controller.ts` (controller, request-response)

**Analog:** `apps/api/src/vocabulary/vocabulary.controller.ts`

**Imports pattern** (lines 1–39):
```typescript
import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GrammarService } from './grammar.service';
import type {
  GrammarAreaDto,
  GrammarTopicDto,
  GrammarLessonDetailDto,
  GrammarQuestionDto,
  GrammarSessionResultDto,
} from '@repo/shared';
import { GrammarSessionCompleteSchema } from '@repo/shared';

// Type for the decoded JWT payload attached to request.user by JwtAuthGuard
interface AuthenticatedRequest {
  user: {
    userId: string;
    role?: string;
    cefrLevel?: string;
    email?: string;
  };
}
```

**Auth guard pattern** (lines 41–44, from vocabulary.controller.ts lines 41–52):
```typescript
// Applied per-method — same pattern as VocabularyController
@UseGuards(JwtAuthGuard)
@Get('areas')
async getAreas(): Promise<GrammarAreaDto[]> {
  return this.grammarService.getAreas();
}
```

**Route ordering rule** (from vocabulary.controller.ts comment and Pitfall 1 in RESEARCH.md):
```typescript
// CRITICAL: Fixed-string routes BEFORE parameterized routes
// e.g., GET 'sessions/complete' before GET ':topicId/weak-questions'
// Violating this causes NestJS to match the literal string as a param value.
@Controller('grammar')
export class GrammarController {
  constructor(private readonly grammarService: GrammarService) {}

  @UseGuards(JwtAuthGuard)
  @Get('areas')                       // fixed — must be first
  async getAreas(): Promise<GrammarAreaDto[]> { ... }

  @UseGuards(JwtAuthGuard)
  @Get('areas/:areaSlug/topics')      // parameterized — after fixed
  async getTopics(@Param('areaSlug') areaSlug: string): Promise<GrammarTopicDto[]> { ... }

  @UseGuards(JwtAuthGuard)
  @Post('sessions/complete')          // fixed POST — declare before any param routes
  async completeSession(
    @Request() req: AuthenticatedRequest,
    @Body() body: unknown,
  ): Promise<GrammarSessionResultDto> {
    const dto = GrammarSessionCompleteSchema.parse(body);
    return this.grammarService.completeSession(req.user.userId, dto);
  }
}
```

**userId security rule** (vocabulary.controller.ts lines 63–69):
```typescript
// userId ALWAYS from req.user.userId (JWT payload) — NEVER from request body
// This pattern appears on every method that needs the authenticated user
async getMyWords(
  @Request() req: AuthenticatedRequest,
  @Query('status') status?: string,
): Promise<MyWordDto[]> {
  return this.vocabularyService.getMyWords(req.user.userId, status);
}
```

---

### `apps/api/src/grammar/grammar.service.ts` (service, CRUD)

**Analog:** `apps/api/src/vocabulary/vocabulary.service.ts`

**Imports + Injectable pattern** (lines 16–23):
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type {
  GrammarAreaDto,
  GrammarTopicDto,
  GrammarLessonDetailDto,
  GrammarQuestionDto,
  GrammarSessionResultDto,
  GrammarSessionCompleteDto,
} from '@repo/shared';

@Injectable()
export class GrammarService {
  constructor(private readonly prisma: PrismaService) {}
```

**NotFoundException pattern** (vocabulary.service.ts lines 145–165):
```typescript
// Use findUniqueOrThrow + P2025 code check for 404 responses
async getLessonDetail(lessonSlug: string): Promise<GrammarLessonDetailDto> {
  try {
    const lesson = await this.prisma.grammarLesson.findUniqueOrThrow({
      where: { slug: lessonSlug },
      include: { questions: true },
    });
    return lesson as GrammarLessonDetailDto;
  } catch (err) {
    if (
      err != null &&
      typeof err === 'object' &&
      'code' in err &&
      (err as { code: string }).code === 'P2025'
    ) {
      throw new NotFoundException(`Lesson ${lessonSlug} not found`);
    }
    throw err;
  }
}
```

**Prisma upsert pattern** (vocabulary.service.ts — established upsert pattern):
```typescript
// GrammarProgress upsert — @@unique([userId, topicId]) constraint requires upsert, never create
// (Pitfall 5 from RESEARCH.md: second session completion would fail with P2002 on create)
await this.prisma.grammarProgress.upsert({
  where: { userId_topicId: { userId, topicId: lesson.topicId } },
  create: {
    userId,
    topicId: lesson.topicId,
    attempts: totalCount,
    correct: correctCount,
    masteryPct: newMasteryPct,
    lastAttemptAt: new Date(),
  },
  update: {
    attempts: newAttempts,
    correct: newCorrect,
    masteryPct: newMasteryPct,
    lastAttemptAt: new Date(),
  },
});
```

**Bulk insert pattern** (vocabulary seed pattern — createMany):
```typescript
// GrammarAttempt bulk insert — one createMany per session (D-06)
await this.prisma.grammarAttempt.createMany({
  data: attempts.map((a) => ({
    questionId: a.questionId,
    userId,
    isCorrect: a.isCorrect,
    userAnswer: a.userAnswer ?? null,
  })),
  skipDuplicates: false, // multiple attempts on same question are allowed
});
```

---

### `apps/api/src/grammar/grammar.service.spec.ts` (test, CRUD)

**Analog:** `apps/api/src/vocabulary/vocabulary.service.spec.ts`

**Full test structure pattern** (lines 1–72):
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { GrammarService } from './grammar.service';
import type { PrismaService } from '../prisma/prisma.service';

// Mock PrismaService — direct instantiation, no NestJS DI
const mockGrammarAreaFindMany = vi.fn();
const mockGrammarAttemptCreateMany = vi.fn();
const mockGrammarProgressUpsert = vi.fn();
// ... one mock per Prisma model method used

const mockPrisma = {
  grammarArea: { findMany: mockGrammarAreaFindMany },
  grammarAttempt: { createMany: mockGrammarAttemptCreateMany },
  grammarProgress: { upsert: mockGrammarProgressUpsert, findUnique: vi.fn() },
  // ...
} as unknown as PrismaService;

describe('GrammarService', () => {
  let service: GrammarService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new GrammarService(mockPrisma); // direct instantiation, no TestingModule
  });

  describe('getAreas()', () => {
    it('returns all grammar areas ordered by sortOrder', async () => {
      mockGrammarAreaFindMany.mockResolvedValue([...]);
      const result = await service.getAreas();
      expect(result).toHaveLength(10);
    });
  });
  // ...
});
```

---

### `packages/shared/src/grammar.dto.ts` (utility, transform)

**Analog:** `packages/shared/src/vocabulary.dto.ts`

**Full DTO pattern** (lines 1–96 of vocabulary.dto.ts):
```typescript
// Follow exact same structure: Zod schema first, then inferred TypeScript type
import { z } from "zod";

// ─── Section separator comments (copy style) ──────────────────────────────────

export const GrammarAreaDtoSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  topicCount: z.number(),
  sortOrder: z.number(),
});

export const GrammarSessionCompleteSchema = z.object({
  lessonId: z.string(),
  attempts: z.array(z.object({
    questionId: z.string(),
    isCorrect: z.boolean(),
    userAnswer: z.string().optional(),
  })),
  timeTakenMs: z.number().optional(),
});

// ─── Inferred TypeScript types — always at bottom (vocabulary.dto.ts lines 88–95) ─
export type GrammarAreaDto = z.infer<typeof GrammarAreaDtoSchema>;
export type GrammarSessionCompleteDto = z.infer<typeof GrammarSessionCompleteSchema>;
// ... one type per schema
```

**Barrel export addition** (`packages/shared/src/index.ts` lines 19–20):
```typescript
// Phase 4: Grammar DTOs — add below Phase 3 export
export * from "./grammar.dto";
```

---

### `apps/web/src/app/(dashboard)/grammar/page.tsx` (component, request-response)

**Analog:** `apps/web/src/app/(dashboard)/vocabulary/page.tsx`

**Full Server Component pattern** (lines 1–73):
```typescript
// Server Component: auth() check → redirect → fetchAreas() → render grid
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getSessionToken } from "@/lib/get-session-token";
import type { GrammarAreaDto } from "@repo/shared";

const API_URL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3001";

// Fetch directly from NestJS in Server Component (not via relay route)
// (Same pattern as vocabulary/page.tsx lines 22–34)
async function fetchAreas(): Promise<GrammarAreaDto[]> {
  try {
    const token = getSessionToken();
    const res = await fetch(`${API_URL}/api/grammar/areas`, {
      cache: "no-store",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return [];
    return res.json() as Promise<GrammarAreaDto[]>;
  } catch {
    return [];
  }
}

export default async function GrammarPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const areas = await fetchAreas();

  return (
    <div className="mx-auto max-w-screen-xl">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-foreground">Grammar</h1>
        <p className="mt-1 text-base text-muted-foreground">Browse by topic area</p>
      </div>
      {/* 2-col mobile / 4-col desktop grid — same as vocabulary (lines 53–70) */}
      {areas.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {areas.map((area) => (
            <GrammarAreaCard key={area.slug} {...area} />
          ))}
        </div>
      ) : (
        <div role="status" className="py-16 text-center">
          <p className="text-base text-muted-foreground">No grammar areas available.</p>
        </div>
      )}
    </div>
  );
}
```

---

### `apps/web/src/app/(dashboard)/grammar/[area]/page.tsx` (component, request-response)

**Analog:** `apps/web/src/app/(dashboard)/vocabulary/[category]/page.tsx`

**Dynamic param + fetch pattern** (lines 48–65):
```typescript
interface Props {
  params: Promise<{ area: string }>;
}

export default async function GrammarAreaPage({ params }: Props) {
  const session = await auth();
  if (!session) redirect("/login");

  const { area } = await params;          // await params — Next.js 14 App Router
  const topics = await fetchTopics(area);

  return ( /* topic list rendering */ );
}
```

---

### Next.js Relay Route — GET pattern

**Analog:** `apps/web/src/app/api/vocabulary/categories/route.ts`

**GET relay pattern** (lines 1–36):
```typescript
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { fetchWithAuth, API_URL } from "@/lib/api-client";

export async function GET(): Promise<NextResponse> {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // CRITICAL: await headers() in Route Handlers (Pitfall 2 from RESEARCH.md)
  // Do NOT use getSessionToken() here — use headers() + fetchWithAuth()
  const reqHeaders = await headers();
  const cookieHeader = reqHeaders.get("cookie") ?? "";

  const res = await fetchWithAuth(
    cookieHeader,
    `${API_URL}/api/grammar/areas`,
  );

  if (!res.ok) {
    return NextResponse.json(
      { error: "Failed to fetch grammar areas" },
      { status: res.status },
    );
  }

  const data = await res.json();
  return NextResponse.json(data);
}
```

**GET relay with dynamic segment pattern** (`apps/web/src/app/api/vocabulary/[category]/words/route.ts` lines 1–51):
```typescript
interface RouteParams {
  params: Promise<{ areaSlug: string }>;
}

export async function GET(
  req: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { areaSlug } = await params;
  const reqHeaders = await headers();
  const cookieHeader = reqHeaders.get("cookie") ?? "";

  const res = await fetchWithAuth(
    cookieHeader,
    `${API_URL}/api/grammar/areas/${areaSlug}/topics`,
  );

  if (!res.ok) {
    return NextResponse.json({ error: "Failed to fetch topics" }, { status: res.status });
  }
  return NextResponse.json(await res.json());
}
```

**POST relay pattern** (`apps/web/src/app/api/vocabulary/session/complete/route.ts` lines 1–54):
```typescript
export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const reqHeaders = await headers();
  const cookieHeader = reqHeaders.get("cookie") ?? "";

  const res = await fetchWithAuth(
    cookieHeader,
    `${API_URL}/api/grammar/sessions/complete`,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json(
      { error: err || "Session completion failed" },
      { status: res.status },
    );
  }

  const data = await res.json();
  return NextResponse.json(data);
}
```

---

### `apps/web/src/components/grammar/grammar-area-card.tsx` (component, request-response)

**Analog:** `apps/web/src/components/vocabulary/category-card.tsx`

**Full component pattern** (lines 1–77):
```typescript
"use client";

import Link from "next/link";
import {
  Clock, HelpCircle, GitBranch, RefreshCw, Link as LinkIcon,
  MessageSquare, Minus, AlignLeft, MapPin, Shuffle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Grammar area slug → Lucide icon map (D-03, CONTEXT.md specifics)
const AREA_ICONS: Record<string, LucideIcon> = {
  "verb-tenses": Clock,
  "modal-verbs": HelpCircle,
  "conditionals": GitBranch,
  "passive-voice": RefreshCw,
  "relative-clauses": LinkIcon,
  "reported-speech": MessageSquare,
  "gerunds-infinitives": Minus,
  "articles": AlignLeft,
  "prepositions": MapPin,
  "linking-words": Shuffle,
};

interface GrammarAreaCardProps {
  slug: string;
  name: string;
  topicCount: number;
  className?: string;
}

export function GrammarAreaCard({ slug, name, topicCount, className }: GrammarAreaCardProps) {
  const Icon = AREA_ICONS[slug] ?? Clock;

  return (
    <Link
      href={`/grammar/${slug}`}
      data-testid="grammar-area-card"
      className={cn(
        // Exact same Tailwind classes as CategoryCard (lines 58–62)
        "flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md",
        className,
      )}
    >
      <span aria-hidden="true" className="text-foreground">
        <Icon className="h-8 w-8" />
      </span>
      <span className="text-center text-sm font-semibold text-foreground">{name}</span>
      {/* "topics" instead of "words" — only semantic change from CategoryCard */}
      <span className="text-xs text-muted-foreground">{topicCount} topics</span>
    </Link>
  );
}
```

---

### `apps/web/src/components/grammar/grammar-lesson-page.tsx` (component, event-driven)

**Analog:** `apps/web/src/components/vocabulary/practice-session.tsx`

**Session orchestrator structure** (lines 1–283):
```typescript
"use client";

import React, { useState, useRef } from "react";
import { Progress } from "@/components/ui/progress";
// Exercise components rendered per exerciseType
import { MultipleChoiceExercise } from "./exercises/multiple-choice-exercise";
import { FillInTheBlankExercise } from "./exercises/fill-in-the-blank-exercise";
// ... other exercise imports
import { GrammarSessionResults } from "./grammar-session-results";
import type { GrammarLessonDetailDto, GrammarQuestionDto } from "@repo/shared";

// State shape mirrors practice-session.tsx Answer interface (lines 30–34)
interface Attempt {
  questionId: string;
  isCorrect: boolean;
  userAnswer?: string;
}

interface Props {
  lesson: GrammarLessonDetailDto;
  topicSlug: string;
}

export function GrammarLessonPage({ lesson, topicSlug }: Props) {
  // Three phases: explanation → exercises → results (D-04)
  const [phase, setPhase] = useState<"explanation" | "exercises" | "results">("explanation");

  // Session state in React component state — no API calls mid-session (D-06)
  const [currentIndex, setCurrentIndex] = useState(0);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const startTime = useRef<number>(Date.now());

  const questions = lesson.questions;
  const totalQuestions = questions.length;

  // handleCorrect/handleIncorrect pattern mirrors practice-session.tsx lines 149–179
  const handleAnswer = (questionId: string, isCorrect: boolean, userAnswer?: string) => {
    const newAttempts = [...attempts, { questionId, isCorrect, userAnswer }];
    setAttempts(newAttempts);
    if (currentIndex + 1 >= totalQuestions) {
      void submitSession(newAttempts);
    } else {
      setCurrentIndex((i) => i + 1);
    }
  };

  // Batch submit on completion — mirrors practice-session.tsx lines 182–201
  const submitSession = async (finalAttempts: Attempt[]) => {
    setSubmitting(true);
    const timeTakenMs = Date.now() - startTime.current;
    try {
      await fetch("/api/grammar/sessions/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId: lesson.id,
          attempts: finalAttempts,
          timeTakenMs,
        }),
      });
    } catch {
      // Non-blocking — still show results
    } finally {
      setSubmitting(false);
      setPhase("results");
    }
  };

  // Progress bar pattern — practice-session.tsx lines 244–261
  if (phase === "exercises") {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {currentIndex + 1} of {totalQuestions}
            </p>
          </div>
          <Progress value={(currentIndex / totalQuestions) * 100} className="h-2" />
        </div>
        {/* Exercise card — rounded-xl border bg-card p-6 shadow-sm (lines 266–277) */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm min-h-[280px]">
          {renderExercise(questions[currentIndex]!, handleAnswer)}
        </div>
      </div>
    );
  }
  // ...
}
```

---

### `apps/web/src/components/grammar/grammar-session-results.tsx` (component, event-driven)

**Analog:** `apps/web/src/components/vocabulary/session-results.tsx`

**Results screen structure** (lines 1–50):
```typescript
"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface GrammarSessionResultsProps {
  score: number;
  total: number;
  masteryPct: number;        // grammar-specific — from GrammarProgress
  timeTakenMs: number;
  onReviewWeak?: () => void; // D-09: "Review weak exercises" button
  onRestart?: () => void;
}

export function GrammarSessionResults({
  score, total, masteryPct, timeTakenMs, onReviewWeak, onRestart,
}: GrammarSessionResultsProps) {
  return (
    // Framer-motion entrance — session-results.tsx lines 117–122
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="mx-auto flex max-w-lg flex-col items-center gap-8 py-8"
    >
      <div className="text-center">
        <p className="mb-2 text-sm text-muted-foreground">Session complete!</p>
        <p className="text-[28px] font-semibold text-foreground">
          {score}/{total} correct
        </p>
      </div>
      {/* Mastery progress bar — grammar-specific; vocabulary analog has no equivalent */}
      <div className="w-full">
        <p className="text-sm text-muted-foreground mb-1">Topic mastery</p>
        <Progress value={masteryPct * 100} className="h-3" />
        <p className="text-xs text-muted-foreground mt-1">{Math.round(masteryPct * 100)}%</p>
      </div>
      {onReviewWeak && (
        <Button variant="outline" onClick={onReviewWeak} className="w-full min-h-[44px]">
          Review weak exercises
        </Button>
      )}
      {onRestart && (
        <Button variant="outline" onClick={onRestart} className="w-full min-h-[44px]">
          Practice again
        </Button>
      )}
    </motion.div>
  );
}
```

---

### `apps/web/src/components/grammar/exercises/multiple-choice-exercise.tsx` (component, event-driven)

**Analog:** `apps/web/src/components/vocabulary/exercises/cloze-exercise.tsx`

**Full exercise component pattern** (lines 1–93):
```typescript
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  prompt: string;
  options: string[];       // answer + distractors[] shuffled
  answer: string;
  explanation?: string | null;
  onCorrect: () => void;
  onIncorrect: () => void;
}

export function MultipleChoiceExercise({ prompt, options, answer, explanation, onCorrect, onIncorrect }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);

  const handleSelect = (option: string) => {
    if (answered) return;
    setSelected(option);
    setAnswered(true);
  };

  const handleNext = () => {
    if (selected === answer) onCorrect();
    else onIncorrect();
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mb-2 text-sm text-muted-foreground">Choose the correct answer</p>
        <p className="text-base leading-relaxed text-foreground">{prompt}</p>
      </div>

      {/* Option buttons — exact styling from cloze-exercise.tsx lines 57–76 */}
      <div className="grid grid-cols-2 gap-3">
        {options.map((option) => {
          const isCorrect = answered && option === answer;
          const isWrong = answered && option === selected && option !== answer;
          return (
            <button
              key={option}
              onClick={() => handleSelect(option)}
              disabled={answered}
              className={[
                "min-h-[44px] rounded-lg border px-3 py-2 text-sm font-medium text-left transition-colors",
                isCorrect ? "border-green-500 bg-green-50 text-green-800"
                  : isWrong ? "border-red-500 bg-red-50 text-red-800"
                  : answered ? "border-border bg-secondary text-muted-foreground"
                  : "border-border bg-secondary text-foreground hover:bg-secondary/80",
                answered ? "cursor-default" : "cursor-pointer",
              ].join(" ")}
            >
              {option}
            </button>
          );
        })}
      </div>

      {answered && (
        <div className="flex flex-col gap-2">
          {explanation && (
            <p className="text-sm text-muted-foreground">{explanation}</p>
          )}
          <Button onClick={handleNext} className="min-h-[44px]">Next</Button>
        </div>
      )}
    </div>
  );
}
```

---

### `apps/web/src/components/grammar/exercises/fill-in-the-blank-exercise.tsx` (component, event-driven)

**Analog:** `apps/web/src/components/vocabulary/exercises/cloze-exercise.tsx`

Copy the ClozeExercise pattern exactly. Key difference: accept a free-text `<input>` field instead of option buttons when the exercise type is free-text fill-in (no distractors). When distractors exist, use the same option-button grid as ClozeExercise. Case-insensitive answer comparison:

```typescript
// Case-insensitive comparison — test requirement from RESEARCH.md validation map
const isCorrect = userInput.trim().toLowerCase() === answer.toLowerCase();
```

---

### `apps/web/src/components/grammar/exercises/drag-and-drop-exercise.tsx` (component, event-driven)

**Analog:** none — new dnd-kit pattern (no existing analog in codebase)

See RESEARCH.md Pattern 4 (lines 399–456) for the full dnd-kit implementation. Key excerpts:

**dnd-kit imports** (RESEARCH.md Pattern 4 lines 403–414):
```typescript
"use client";  // REQUIRED — dnd-kit uses browser APIs; cannot be a Server Component

import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";
// Do NOT import from @dnd-kit/sortable — this is not a sortable list (anti-pattern from RESEARCH.md)
```

**PointerSensor with activation constraint** (RESEARCH.md Pattern 4 lines 416–421):
```typescript
// activationConstraint prevents accidental drag on mobile tap — 5px threshold
const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: { distance: 5 },
  })
);
```

**DraggableWord component** (RESEARCH.md Pattern 4 lines 423–438):
```typescript
function DraggableWord({ id, word }: { id: string; word: string }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id });
  return (
    <span
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "inline-flex items-center px-3 py-2 rounded-lg border border-border bg-secondary text-sm font-medium text-foreground cursor-grab active:cursor-grabbing hover:bg-secondary/70 transition-colors",
        isDragging && "ring-2 ring-primary opacity-80"
      )}
    >
      {word}
    </span>
  );
}
```

**DroppableBlank component** (RESEARCH.md Pattern 4 lines 441–454):
```typescript
function DroppableBlank({ id, filledWord }: { id: string; filledWord?: string }) {
  const { isOver, setNodeRef } = useDroppable({ id });
  return (
    <span
      ref={setNodeRef}
      className={cn(
        "inline-flex items-center justify-center min-w-[80px] h-8 rounded border-2 border-dashed border-border bg-background mx-1 text-sm",
        isOver && "border-primary bg-primary/5",
        filledWord && "border border-border bg-secondary font-medium"
      )}
    >
      {filledWord ?? "..."}
    </span>
  );
}
```

**DndContext overflow warning** (RESEARCH.md Pitfall 3): Do NOT add `overflow: hidden` to the exercise card wrapper — `DragOverlay` uses fixed positioning and will clip at that boundary.

---

### `apps/web/src/components/grammar/exercises/*.test.tsx` (test, event-driven)

**Analog:** `apps/web/src/components/vocabulary/exercises/flashcard-exercise.test.tsx`

Apply the same test file structure (Vitest + Testing Library, `jsdom` environment). Render the component with mock props and assert on user interactions via `fireEvent` or `userEvent`.

---

### `apps/web/src/components/grammar/explanation-view.tsx` (component, request-response)

**Analog:** partial — no direct analog. Style pattern from `apps/web/src/components/vocabulary/exercises/flashcard-exercise.tsx` (card container layout):

```typescript
"use client";
// No dnd-kit here; this is a plain Server-renderable presentation component

interface Props {
  explanation: string;
  examples: string[];
}

export function ExplanationView({ explanation, examples }: Props) {
  return (
    <div className="flex flex-col gap-6">
      {/* Grammar rule card — zinc-100 background per D-05 */}
      <div className="rounded-xl border border-border bg-zinc-100 dark:bg-zinc-800 p-6">
        <p className="text-base leading-relaxed text-foreground">{explanation}</p>
      </div>

      {/* Example sentences — monospace/italic per D-05 */}
      {examples.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-foreground">Examples</p>
          <ul className="flex flex-col gap-1">
            {examples.map((ex, i) => (
              <li key={i} className="text-sm italic text-muted-foreground pl-4 border-l-2 border-border">
                {ex}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

---

### `packages/database/prisma/seed.ts` (modify — add `seedGrammar()`) (utility, batch)

**Analog:** existing `packages/database/prisma/seed.ts` (lines 1–100+)

**Dependency order rule** (RESEARCH.md Pitfall 4 — FK constraint on createMany):
```typescript
// Extend main() with strict dependency-ordered inserts:
async function seedGrammar() {
  const grammarData = await import("./seed-data/grammar.json");

  for (const area of grammarData.areas) {
    // 1. Create GrammarArea first
    const createdArea = await prisma.grammarArea.upsert({
      where: { slug: area.slug },
      create: { slug: area.slug, name: area.name, description: area.description, sortOrder: area.sortOrder },
      update: {},
    });

    for (const topic of area.topics) {
      // 2. Create GrammarTopic (depends on GrammarArea.id)
      const createdTopic = await prisma.grammarTopic.upsert({
        where: { slug: topic.slug },
        create: { areaId: createdArea.id, slug: topic.slug, title: topic.title, cefrLevel: topic.cefrLevel, sortOrder: topic.sortOrder },
        update: {},
      });

      for (const lesson of topic.lessons) {
        // 3. Create GrammarLesson (depends on GrammarTopic.id)
        const createdLesson = await prisma.grammarLesson.upsert({
          where: { slug: lesson.slug },
          create: { topicId: createdTopic.id, slug: lesson.slug, title: lesson.title, explanation: lesson.explanation, examples: lesson.examples, sortOrder: lesson.sortOrder },
          update: {},
        });

        // 4. createMany GrammarQuestions (depends on GrammarLesson.id)
        // skipDuplicates: true guards re-runs (same as vocabularyWord seed line 26)
        await prisma.grammarQuestion.createMany({
          data: lesson.questions.map((q) => ({
            lessonId: createdLesson.id,
            exerciseType: q.exerciseType,
            prompt: q.prompt,
            answer: q.answer,
            distractors: q.distractors,
            explanation: q.explanation ?? null,
            difficulty: q.difficulty ?? 1,
            xpReward: q.xpReward ?? 10,
          })),
          skipDuplicates: true,
        });
      }
    }
  }
}
```

**Import pattern** (seed.ts lines 14–17):
```typescript
import { PrismaClient } from "../generated/client";
import grammarData from "./seed-data/grammar.json";  // same static import style as vocabularyData
```

---

### `packages/database/prisma/seed-data/grammar.json` (config, batch)

**Analog:** `packages/database/prisma/seed-data/vocabulary.json`

The vocabulary JSON is a flat array of word objects. The grammar JSON needs a nested structure (areas → topics → lessons → questions). Follow the structural pattern from RESEARCH.md Code Examples (lines 718–758):

```json
{
  "areas": [
    {
      "slug": "verb-tenses",
      "name": "Verb Tenses",
      "description": "Master present, past, and future tense forms",
      "sortOrder": 1,
      "topics": [
        {
          "slug": "present-perfect",
          "title": "Present Perfect",
          "cefrLevel": "B1",
          "sortOrder": 1,
          "lessons": [
            {
              "slug": "present-perfect-formation",
              "title": "Present Perfect: Formation",
              "sortOrder": 1,
              "explanation": "The present perfect is formed with have/has + past participle...",
              "examples": [
                "I have visited London three times.",
                "She has never eaten sushi."
              ],
              "questions": [
                {
                  "exerciseType": "MULTIPLE_CHOICE",
                  "prompt": "Choose the correct form: She ___ to Paris before.",
                  "answer": "has been",
                  "distractors": ["is been", "was been", "have been"],
                  "explanation": "Use 'has been' for third-person singular in present perfect.",
                  "difficulty": 1,
                  "xpReward": 10
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

Scale: 10 areas × ~3–4 topics × ~3 lessons × ~7 questions = ~630–840 questions. Meets GRAM-05 (≥20 per topic).

---

## Shared Patterns

### Authentication (JwtAuthGuard)
**Source:** `apps/api/src/auth/jwt-auth.guard.ts` (lines 1–55)
**Apply to:** All GrammarController methods, all Next.js relay routes

NestJS side — per-method decorator:
```typescript
@UseGuards(JwtAuthGuard)
@Get('areas')
async getAreas(): Promise<GrammarAreaDto[]> { ... }
```

Next.js relay side — `auth()` gate before any proxy:
```typescript
const session = await auth();
if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
```

### fetchWithAuth — Relay Route Proxy
**Source:** `apps/web/src/lib/api-client.ts` (lines 55–79)
**Apply to:** All 6 Next.js grammar relay routes

```typescript
import { fetchWithAuth, API_URL } from "@/lib/api-client";
// In Route Handler: await headers() first (Pitfall 2 — not getSessionToken())
const reqHeaders = await headers();
const cookieHeader = reqHeaders.get("cookie") ?? "";
const res = await fetchWithAuth(cookieHeader, `${API_URL}/api/grammar/...`);
```

### userId Security Rule
**Source:** `apps/api/src/vocabulary/vocabulary.controller.ts` (lines 63–69) + jwt-auth.guard.ts
**Apply to:** All GrammarController methods that use userId

```typescript
// userId from JWT payload — NEVER from request body
@Request() req: AuthenticatedRequest
// Use: req.user.userId
// Never: dto.userId or body.userId
```

### Zod Body Validation
**Source:** `packages/shared/src/vocabulary.dto.ts` (lines 54–64) — SessionCompleteSchema pattern
**Apply to:** `POST /api/grammar/sessions/complete` controller method

```typescript
// In controller — parse body with Zod before passing to service
const dto = GrammarSessionCompleteSchema.parse(body);
return this.grammarService.completeSession(req.user.userId, dto);
```

### shadcn/ui Component Usage
**Source:** `apps/web/src/components/vocabulary/practice-session.tsx` (lines 16–27) and `session-results.tsx`
**Apply to:** All grammar React components

```typescript
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";     // if needed
import { Badge } from "@/components/ui/badge";   // for CEFR level display
```

### framer-motion Entrance Animation
**Source:** `apps/web/src/components/vocabulary/session-results.tsx` (lines 117–122)
**Apply to:** `grammar-session-results.tsx` completion screen only

```typescript
import { motion } from "framer-motion";
<motion.div
  initial={{ opacity: 0, scale: 0.95 }}
  animate={{ opacity: 1, scale: 1 }}
  transition={{ duration: 0.3, ease: "easeOut" }}
>
```

### getSessionToken() in Server Component Pages
**Source:** `apps/web/src/app/(dashboard)/vocabulary/page.tsx` (lines 17–34)
**Apply to:** All 4 grammar Server Component pages — use `getSessionToken()` NOT `headers()`

```typescript
// Server Component pages use getSessionToken() (not headers())
const token = getSessionToken();
const res = await fetch(`${API_URL}/api/grammar/areas`, {
  cache: "no-store",
  headers: token ? { Authorization: `Bearer ${token}` } : {},
});
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `apps/web/src/components/grammar/exercises/drag-and-drop-exercise.tsx` | component | event-driven | No drag-and-drop components exist in the codebase. Pattern comes from RESEARCH.md Pattern 4 (dnd-kit docs). Must install `@dnd-kit/core` and `@dnd-kit/sortable` before implementing. |

---

## Metadata

**Analog search scope:** `apps/api/src/vocabulary/`, `apps/web/src/components/vocabulary/`, `apps/web/src/app/(dashboard)/vocabulary/`, `apps/web/src/app/api/vocabulary/`, `packages/shared/src/`, `packages/database/prisma/`
**Files scanned:** 22
**Pattern extraction date:** 2026-06-13
