# Phase 4: Grammar Module - Research

**Researched:** 2026-06-13
**Domain:** NestJS module (GrammarController + GrammarService), Next.js App Router pages, React exercise components, dnd-kit drag-and-drop, Prisma seeding
**Confidence:** HIGH

---

## Summary

Phase 4 builds the Grammar Module as a vertical slice over an already-migrated schema. All six Prisma models (`GrammarArea`, `GrammarTopic`, `GrammarLesson`, `GrammarQuestion`, `GrammarAttempt`, `GrammarProgress`) exist in `schema.prisma` and have been migrated — no schema migration is needed except for two missing slug fields (see Schema Gap below). The backend pattern is a direct copy of `VocabularyModule`: a NestJS module registered in `AppModule`, a controller with `@UseGuards(JwtAuthGuard)`, and a service injecting `PrismaService`. The frontend pattern mirrors the vocabulary module: Server Component pages fetching via Next.js relay routes that proxy to NestJS, and a `"use client"` session orchestrator managing exercise state in React component state.

The one genuinely new technical capability is drag-and-drop via `@dnd-kit/core` + `@dnd-kit/sortable`. The UI-SPEC is fully detailed and pre-approved (2026-06-13), including the dnd-kit component contracts. dnd-kit is the ecosystem standard for accessible drag-and-drop in React; it handles pointer, mouse, and keyboard sensors natively. No other novel dependencies are required.

The critical schema gap is that `GrammarArea` has no `slug` field and `GrammarLesson` has no `slug` field. The routing plan (`/grammar/[area]`, `/grammar/[area]/[topic]/[lesson]`) requires both. Plan Wave 0 must add a Prisma migration for `GrammarArea.slug` and `GrammarLesson.slug` before any seed or endpoint work proceeds.

**Primary recommendation:** Follow the VocabularyModule template exactly for backend structure. Add dnd-kit as the only new dependency. Fix the schema slug gap in Wave 0. Plan as one Wave 0 (schema + tests + DTOs), then parallel waves for backend, frontend pages, exercise components, and seed data.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Full 3-level hierarchy: `/grammar` (10 area cards) → `/grammar/[area]` (topic list for that area) → `/grammar/[area]/[topic]` (lesson list + topic mastery bar). Same depth separation as vocabulary's category → word pattern, extended by one level.
- **D-02:** Topic page shows lesson list + mastery bar: Each topic page renders a list of lesson cards (title, question count, locked/unlocked state) with the topic-level `masteryPct` from `GrammarProgress` shown at the top.
- **D-03:** Same 2×4 grid layout with Lucide icons for the `/grammar` area page. Reuse the `CategoryCard` component pattern — each card shows icon, area name, topic count. Consistent with vocabulary browse.
- **D-04:** Linear sequential flow: Explanation section at top (scrollable, rendered rule cards + examples) → user clicks "Start Practice" → one-at-a-time exercise carousel → session completion screen. One-directional flow, no tabbed navigation.
- **D-05:** Visual learning blocks = structured rule cards + example sentences rendered from the `GrammarLesson.explanation` (text) and `examples[]` (string array) fields already in the schema. No custom table components in Phase 4 — styled card with highlighted rule text and formatted example sentences.
- **D-06:** One-at-a-time exercise carousel, matching the vocab `PracticeSession` component pattern. Progress bar at top (n/total). Exercise components receive the current question and emit correct/incorrect. Session orchestrator component manages state and submits as one batch on completion.
- **D-07:** All exercises in the lesson ARE the assessment — no separate quiz step. Every answer submitted in a lesson session is recorded as a `GrammarAttempt` row. When the session ends, the batch is submitted and `GrammarProgress.masteryPct` is updated in one API call.
- **D-08:** Mastery calculation = running ratio: `masteryPct = GrammarProgress.correct / GrammarProgress.attempts` accumulated across ALL lesson attempts for the topic. Each new session adds to `correct` and `attempts` totals — mastery improves with re-attempts.
- **D-09:** Weak exercise re-attempt = filtered session: Topic page shows a "Review weak exercises" button visible when the user has prior attempts with incorrect answers. Button launches an exercise carousel session containing only questions answered incorrectly in the user's most recent attempt for that topic.
- **D-10:** Real drag-and-drop using `@dnd-kit/core`: Add `@dnd-kit/core` and `@dnd-kit/sortable` as new dependencies in `apps/web`. Supports both mouse (desktop) and touch (mobile via dnd-kit's pointer sensor).
- **D-11:** Word bank → blanks format: Sentence has one or more `___` blanks. Word bank shows the correct word plus distractors from `GrammarQuestion.distractors[]`. User drags a word from the bank into the active blank. Placing a word in the wrong blank allows re-placement.

### Claude's Discretion

- NestJS module structure for GrammarModule (controller, service, DTOs — researcher to evaluate patterns from VocabularyModule)
- Specific NestJS endpoint paths (e.g., `GET /api/grammar/areas`, `GET /api/grammar/areas/:areaId/topics`, `GET /api/grammar/lessons/:lessonId/questions`, `POST /api/grammar/sessions/complete`)
- React Query cache strategy for grammar lesson and area data
- Session state management during exercise carousel (in-memory React state, same pattern as vocab practice session)
- Specific Lucide icons for the 10 grammar areas
- Seed data structure (JSON file in `apps/api/prisma/seed-data/grammar.json`) and exact question counts per topic/lesson
- Whether sentence transformation and error correction exercises share a common component or have separate implementations

### Deferred Ideas (OUT OF SCOPE)

- Conjugation/structure tables in explanations (verb tenses, conditionals): Deferred to future UX polish phase.
- Progressive lesson unlocking: Phase 4 ships all lessons unlocked by default.
- Grammar XP events: GrammarAttempt data wired, XP increment and badge display ship in Phase 7.

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| GRAM-01 | User can browse grammar topics organized into 10 named areas | 3-level hierarchy with GrammarArea (10 areas) → GrammarTopic → GrammarLesson; area grid page at `/grammar`, topic list at `/grammar/[area]`, lesson list at `/grammar/[area]/[topic]` |
| GRAM-02 | Each grammar lesson presents an explanation section with examples and visual learning blocks before exercises | `GrammarLesson.explanation` (text) + `examples[]` (string array) are in schema; rendered as rule card + example list before "Start Practice" button |
| GRAM-03 | Grammar exercises include at least 3 of: multiple choice, fill-in-the-blank, sentence transformation, error correction, drag-and-drop | All 5 types are implemented: MultipleChoiceExercise, FillInTheBlankExercise, SentenceTransformationExercise, ErrorCorrectionExercise, DragAndDropExercise. ExerciseType enum already includes all 5 variants. |
| GRAM-04 | Grammar lesson ends with an assessment quiz and stores the score against the user's profile | D-07: all exercises ARE the assessment. `POST /api/grammar/sessions/complete` stores GrammarAttempts and upserts GrammarProgress with masteryPct on completion. |
| GRAM-05 | Each grammar topic has at least 20 practice questions across all exercise types | Seed data must include ≥20 GrammarQuestion rows per topic across all lessons in that topic. Enforced in the seed JSON structure. |
| GRAM-06 | Grammar topic pages show user's mastery percentage and allow re-attempt of weak exercises | GrammarProgress.masteryPct shown on topic page as Progress bar; "Review weak exercises" button fetches questions where user's most-recent GrammarAttempt has isCorrect=false |

</phase_requirements>

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Area list, topic list, lesson list | API (NestJS) | Frontend relay | Data lives in PostgreSQL; NestJS queries via Prisma, Next.js relay proxies |
| Lesson detail + question fetch | API (NestJS) | Frontend relay | GrammarQuestion rows pulled from DB per lessonId |
| Session state during exercises | Browser / Client | — | React component state (in-memory); no DB writes until session completes (D-06) |
| Session completion (batch submit) | API (NestJS) | — | `POST /api/grammar/sessions/complete` writes GrammarAttempt rows + upserts GrammarProgress |
| Mastery percentage calculation | API (NestJS) | — | `masteryPct = correct / attempts` computed on submit; stored in GrammarProgress |
| Weak question query | API (NestJS) | — | DB query on GrammarAttempt with `isCorrect=false` for the user, filtered by topic's lesson questions |
| Drag-and-drop interaction | Browser / Client | — | dnd-kit handles pointer/touch events; no server involvement |
| Explanation rendering | Browser / Client | — | Plain text + string array from lesson detail; rendered as styled JSX |
| Authentication / JWT validation | API (NestJS) | Frontend (relay) | JwtAuthGuard on all grammar endpoints; relay routes gate with `auth()` session check |
| Seed data | Database / Storage | — | Prisma `createMany()` in seed script; runs at deploy time |

---

## Standard Stack

### Core (all already installed — no new installs except dnd-kit)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| NestJS | 11.x (^11.1.26 installed) | GrammarModule backend | Already in apps/api — follow VocabularyModule pattern exactly [VERIFIED: apps/api/package.json] |
| Prisma Client | 6.x (^6.19.3) | DB access for grammar models | All grammar models already migrated; PrismaService global in PrismaModule [VERIFIED: packages/database/prisma/schema.prisma] |
| Next.js | 14.x (^14.2.35) | App Router pages + relay routes | Already installed; grammar pages follow vocabulary page pattern [VERIFIED: apps/web/package.json] |
| @tanstack/react-query | 5.x (^5.101.0) | Optional client caching | Already installed; use for any client-side data fetching where caching is valuable [VERIFIED: apps/web/package.json] |
| framer-motion | 12.x (^12.40.0) | Completion screen animation | Already installed; UI-SPEC requires it on results screen only [VERIFIED: apps/web/package.json] |
| Vitest | 2.x (^2.0.0) | Unit + component tests | Both apps/api and apps/web already configured [VERIFIED: vitest.config.ts files] |
| zod | 3.x | DTO schema validation | Already in @repo/shared; grammar DTOs follow vocabulary.dto.ts pattern [VERIFIED: packages/shared/src/vocabulary.dto.ts] |

### New Dependency (dnd-kit)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @dnd-kit/core | 6.3.1 (latest) | Drag-and-drop context + sensors | Pre-approved in UI-SPEC (2026-06-13); ecosystem standard for accessible React DnD [VERIFIED: npm registry] |
| @dnd-kit/sortable | 10.0.0 (latest) | Sortable utilities (optional) | May not be needed — DragAndDropExercise uses useDraggable/useDroppable from @dnd-kit/core only; install alongside core per dnd-kit documentation convention [VERIFIED: npm registry] |

**Installation (apps/web only):**
```bash
cd apps/web && pnpm add @dnd-kit/core @dnd-kit/sortable
# Or from monorepo root:
pnpm --filter @repo/web add @dnd-kit/core @dnd-kit/sortable
```

**Version verification:**
```
@dnd-kit/core:     6.3.1  (npm latest, first published 2021-01-02, last modified 2024-12-05)
@dnd-kit/sortable: 10.0.0 (npm latest, same repository)
```

---

## Package Legitimacy Audit

> slopcheck was unavailable at research time. All packages below are tagged `[ASSUMED]` for slopcheck status. The planner must gate each dnd-kit install behind a `checkpoint:human-verify` task before proceeding.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| @dnd-kit/core | npm | ~4 yrs (since Jan 2021) | High (major React DnD library) | github.com/clauderic/dnd-kit | [ASSUMED] | Approved — well-known library, authored by Claudéric Demers, no obfuscated code, no network calls, no postinstall scripts. UI-SPEC pre-approved. |
| @dnd-kit/sortable | npm | ~4 yrs | Same repo/author as core | github.com/clauderic/dnd-kit | [ASSUMED] | Approved — same repository, same author, no postinstall scripts. |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

*slopcheck was unavailable at research time. All packages above are tagged `[ASSUMED]` and the planner must gate each install behind a `checkpoint:human-verify` task.*

---

## Architecture Patterns

### System Architecture Diagram

```
Browser (Next.js client)
        │
        │  1. Page load: Server Component fetches grammar data
        ▼
Next.js Server (App Router Server Components)
  /grammar                    → fetchAreas() via relay GET /api/grammar/areas
  /grammar/[area]             → fetchTopics(areaSlug) via relay
  /grammar/[area]/[topic]     → fetchLessons(topicSlug) + fetchProgress(userId, topicId) via relay
  /grammar/[area]/[topic]/[lesson] → fetchLesson(lessonSlug) with questions via relay
        │
        │  2. Relay routes proxy to NestJS with Authorization header
        ▼
Next.js Relay Routes (Route Handlers)
  GET /api/grammar/areas
  GET /api/grammar/areas/[areaSlug]/topics
  GET /api/grammar/topics/[topicSlug]/lessons
  GET /api/grammar/lessons/[lessonSlug]          ← includes questions
  GET /api/grammar/topics/[topicId]/weak-questions
  POST /api/grammar/sessions/complete
        │
        │  3. fetchWithAuth() adds Bearer token, proxies to NestJS
        ▼
NestJS API (GrammarController → GrammarService → PrismaService)
  @JwtAuthGuard on all endpoints
  GrammarService queries PostgreSQL via Prisma
        │
        │  4. Session complete: client POSTs batch
        ▼
PostgreSQL
  GrammarArea / GrammarTopic / GrammarLesson / GrammarQuestion
  GrammarAttempt (per-answer records)
  GrammarProgress (upsert with running correct/attempts totals)
```

### Recommended Project Structure

```
apps/
├── api/src/grammar/
│   ├── grammar.module.ts          # NestJS module (imports AuthModule)
│   ├── grammar.controller.ts      # GET/POST endpoints
│   └── grammar.service.ts         # PrismaService injection, query logic
├── web/src/
│   ├── app/(dashboard)/grammar/
│   │   ├── page.tsx               # /grammar — area grid (Server Component)
│   │   ├── [area]/
│   │   │   ├── page.tsx           # /grammar/[area] — topic list
│   │   │   └── [topic]/
│   │   │       ├── page.tsx       # /grammar/[area]/[topic] — lesson list + mastery
│   │   │       └── [lesson]/
│   │   │           └── page.tsx   # /grammar/[area]/[topic]/[lesson] — lesson page
│   ├── app/api/grammar/
│   │   ├── areas/route.ts
│   │   ├── areas/[areaSlug]/topics/route.ts
│   │   ├── topics/[topicSlug]/lessons/route.ts
│   │   ├── topics/[topicId]/weak-questions/route.ts
│   │   ├── lessons/[lessonSlug]/route.ts
│   │   └── sessions/complete/route.ts
│   └── components/grammar/
│       ├── grammar-area-card.tsx
│       ├── grammar-lesson-page.tsx
│       ├── grammar-session-results.tsx
│       ├── explanation-view.tsx
│       └── exercises/
│           ├── multiple-choice-exercise.tsx
│           ├── fill-in-the-blank-exercise.tsx
│           ├── sentence-transformation-exercise.tsx
│           ├── error-correction-exercise.tsx
│           └── drag-and-drop-exercise.tsx
packages/
├── database/prisma/
│   ├── schema.prisma              # Add slug to GrammarArea + GrammarLesson
│   ├── seed.ts                    # Extend to call seedGrammar()
│   └── seed-data/
│       └── grammar.json           # 10 areas × topics × lessons × ≥20 questions
└── shared/src/
    ├── grammar.dto.ts             # New file: DTO schemas + types
    └── index.ts                   # Add: export * from "./grammar.dto"
```

### Pattern 1: NestJS GrammarController (mirrors VocabularyController)

**What:** Controller with JwtAuthGuard on every route, userId always from `req.user.userId`.
**When to use:** All grammar endpoints.

```typescript
// Source: apps/api/src/vocabulary/vocabulary.controller.ts (verified pattern)
@Controller('grammar')
export class GrammarController {
  constructor(private readonly grammarService: GrammarService) {}

  @UseGuards(JwtAuthGuard)
  @Get('areas')
  async getAreas(): Promise<GrammarAreaDto[]> {
    return this.grammarService.getAreas();
  }

  @UseGuards(JwtAuthGuard)
  @Get('areas/:areaSlug/topics')
  async getTopics(@Param('areaSlug') areaSlug: string): Promise<GrammarTopicDto[]> {
    return this.grammarService.getTopicsByArea(areaSlug);
  }

  @UseGuards(JwtAuthGuard)
  @Get('topics/:topicSlug/lessons')
  async getLessons(
    @Param('topicSlug') topicSlug: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<GrammarTopicDetailDto> {
    return this.grammarService.getLessonsByTopic(topicSlug, req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('lessons/:lessonSlug')
  async getLesson(@Param('lessonSlug') lessonSlug: string): Promise<GrammarLessonDetailDto> {
    return this.grammarService.getLessonDetail(lessonSlug);
  }

  @UseGuards(JwtAuthGuard)
  @Get('topics/:topicId/weak-questions')
  async getWeakQuestions(
    @Param('topicId') topicId: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<GrammarQuestionDto[]> {
    return this.grammarService.getWeakQuestions(topicId, req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('sessions/complete')
  async completeSession(
    @Request() req: AuthenticatedRequest,
    @Body() body: unknown,
  ): Promise<GrammarSessionResultDto> {
    const dto = GrammarSessionCompleteSchema.parse(body);
    return this.grammarService.completeSession(req.user.userId, dto);
  }
}
```

### Pattern 2: Session Completion + Mastery Upsert (NestJS Service)

**What:** `completeSession()` writes all GrammarAttempt rows, then upserts GrammarProgress with running totals.
**When to use:** `POST /api/grammar/sessions/complete`

```typescript
// Source: verified by reading vocabulary.service.ts + schema.prisma GrammarProgress model
async completeSession(userId: string, dto: GrammarSessionCompleteDto): Promise<GrammarSessionResultDto> {
  const { lessonId, attempts } = dto;

  // 1. Bulk-insert all attempt records
  await this.prisma.grammarAttempt.createMany({
    data: attempts.map((a) => ({
      questionId: a.questionId,
      userId,
      isCorrect: a.isCorrect,
      userAnswer: a.userAnswer ?? null,
    })),
    skipDuplicates: false, // Allow multiple attempts on same question
  });

  const correctCount = attempts.filter((a) => a.isCorrect).length;
  const totalCount = attempts.length;

  // 2. Resolve topicId from lessonId
  const lesson = await this.prisma.grammarLesson.findUniqueOrThrow({
    where: { id: lessonId },
    select: { topicId: true },
  });

  // 3. Upsert GrammarProgress: increment running totals, recalculate masteryPct
  const existing = await this.prisma.grammarProgress.findUnique({
    where: { userId_topicId: { userId, topicId: lesson.topicId } },
  });

  const newAttempts = (existing?.attempts ?? 0) + totalCount;
  const newCorrect = (existing?.correct ?? 0) + correctCount;
  const newMasteryPct = newAttempts > 0 ? newCorrect / newAttempts : 0;

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

  return {
    score: correctCount,
    total: totalCount,
    masteryPct: newMasteryPct,
  };
}
```

### Pattern 3: Weak Questions Query

**What:** Returns questions where the user's most-recent attempt per questionId is incorrect.
**When to use:** "Review weak exercises" feature on topic page.

```typescript
// Source: verified by reading GrammarAttempt schema (@@index([questionId, userId]))
async getWeakQuestions(topicId: string, userId: string): Promise<GrammarQuestionDto[]> {
  // Get all questionIds in this topic's lessons
  const questions = await this.prisma.grammarQuestion.findMany({
    where: { lesson: { topicId } },
    select: { id: true },
  });
  const questionIds = questions.map((q) => q.id);

  // For each questionId, find the most recent attempt by this user
  // Use groupBy is not available in Prisma for max — use raw query or Prisma's orderBy approach:
  // findMany with orderBy attemptedAt desc, take 1 per questionId
  // Practical approach: fetch all attempts ordered by attemptedAt desc, deduplicate in JS
  const attempts = await this.prisma.grammarAttempt.findMany({
    where: { userId, questionId: { in: questionIds } },
    orderBy: { attemptedAt: 'desc' },
  });

  // Keep only the most-recent attempt per questionId
  const seen = new Set<string>();
  const latestAttempts = attempts.filter((a) => {
    if (seen.has(a.questionId)) return false;
    seen.add(a.questionId);
    return true;
  });

  // Filter to incorrect ones
  const weakQuestionIds = latestAttempts
    .filter((a) => !a.isCorrect)
    .map((a) => a.questionId);

  if (weakQuestionIds.length === 0) return [];

  return this.prisma.grammarQuestion.findMany({
    where: { id: { in: weakQuestionIds } },
  });
}
```

### Pattern 4: DragAndDropExercise with dnd-kit

**What:** Word-bank-to-blank drag interaction using dnd-kit PointerSensor.
**When to use:** Questions with `exerciseType === 'DRAG_AND_DROP'`.

```typescript
// Source: dnd-kit documentation + UI-SPEC Section 4 DragAndDropExercise contract
"use client";

import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";

// PointerSensor with activationConstraint prevents accidental drag on mobile tap
const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: { distance: 5 }, // 5px movement threshold
  })
);

// DraggableWord: renders from word bank
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

// DroppableBlank: slot in sentence
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

### Pattern 5: Next.js Grammar Page (Server Component + Relay)

**What:** Server Component fetches grammar data from NestJS via relay route using `getSessionToken()`.
**When to use:** All `/grammar/*` page components.

```typescript
// Source: apps/web/src/app/(dashboard)/vocabulary/page.tsx (verified pattern)
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getSessionToken } from "@/lib/get-session-token";

const API_URL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3001";

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
  // ... render GrammarAreaCard grid
}
```

### Pattern 6: Shared Grammar DTOs (packages/shared/src/grammar.dto.ts)

**What:** Zod schemas + inferred types for all grammar API contracts, following vocabulary.dto.ts.
**When to use:** NestJS controller response types + Next.js client type imports.

```typescript
// Source: packages/shared/src/vocabulary.dto.ts (verified pattern)
import { z } from "zod";

export const GrammarAreaDtoSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  topicCount: z.number(),
  sortOrder: z.number(),
});

export const GrammarTopicDtoSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  cefrLevel: z.enum(["B1", "B2", "C1"]),
  lessonCount: z.number(),
  masteryPct: z.number().nullable(), // null when user has no attempts
  sortOrder: z.number(),
});

export const GrammarQuestionDtoSchema = z.object({
  id: z.string(),
  exerciseType: z.enum([
    "MULTIPLE_CHOICE", "FILL_IN_THE_BLANK", "SENTENCE_TRANSFORMATION",
    "ERROR_CORRECTION", "DRAG_AND_DROP",
  ]),
  prompt: z.string(),
  answer: z.string(),
  distractors: z.array(z.string()),
  explanation: z.string().nullable(),
  difficulty: z.number(),
  xpReward: z.number(),
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

export const GrammarSessionResultDtoSchema = z.object({
  score: z.number(),
  total: z.number(),
  masteryPct: z.number(),
});

// Inferred types
export type GrammarAreaDto = z.infer<typeof GrammarAreaDtoSchema>;
export type GrammarTopicDto = z.infer<typeof GrammarTopicDtoSchema>;
export type GrammarQuestionDto = z.infer<typeof GrammarQuestionDtoSchema>;
export type GrammarSessionCompleteDto = z.infer<typeof GrammarSessionCompleteSchema>;
export type GrammarSessionResultDto = z.infer<typeof GrammarSessionResultDtoSchema>;
```

### Anti-Patterns to Avoid

- **Querying userId from request body:** userId MUST come from `req.user.userId` (JWT payload). Never accept userId in the POST body — this is enforced in every existing controller and is a security requirement from Phase 2 (T-03-03).
- **Creating a separate assessment step:** D-07 locks this — exercises ARE the assessment. Do not add a separate quiz screen after exercises.
- **Writing session state to DB during exercises:** All state is held in React component state (in-memory); one batch POST on completion only. Mid-session API calls add latency and complexity that D-06 explicitly rules out.
- **Importing dnd-kit in Server Components:** dnd-kit requires client-side browser APIs. DragAndDropExercise must have `"use client"` directive. The session orchestrator (GrammarLessonPage) must also be `"use client"`.
- **Slug routing without slug fields:** The routing plan requires `areaSlug` and `lessonSlug` but `GrammarArea` and `GrammarLesson` have no `slug` fields in the current schema. This must be fixed in Wave 0 via a Prisma migration before any other work.
- **Using @dnd-kit/sortable APIs for the blank-drop exercise:** The DragAndDropExercise is NOT a sortable list — it's draggable words to droppable slots. Use `useDraggable` / `useDroppable` from `@dnd-kit/core` directly. `@dnd-kit/sortable`'s `SortableContext` is for reorderable lists and is not needed here.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drag-and-drop with touch support | Custom mousedown/touchstart event handlers | `@dnd-kit/core` with `PointerSensor` | Touch events, screen reader keyboard fallback, drag overlay, and activation constraint are 200+ LOC of edge cases; dnd-kit handles all of them |
| Session state persistence | Local storage or DB mid-session writes | React `useState` + single batch POST | PracticeSession in vocab already establishes this pattern; mid-session persistence adds complexity with no UX benefit in a 10–20 question session |
| Mastery % computation | Application-level recalculation on every read | `masteryPct` stored in GrammarProgress, recalculated only on submit | Avoid N+1 DB query patterns on topic list load by pre-computing and storing |
| DTO validation | Manual `if` checks on request body fields | Zod `GrammarSessionCompleteSchema.parse(body)` | SessionController in srs/session.controller.ts sets the exact pattern; Zod throws structured errors that NestJS ValidationPipe surfaces cleanly |
| Slug derivation | Complex slug-from-name algorithm | Simple `name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')` | 10 fixed area names are known at seed time; no dynamic slug generation needed |

**Key insight:** Nearly every pattern in Phase 4 has a direct Phase 3 precedent. The only genuinely new problem is drag-and-drop — everything else is extension of existing patterns.

---

## Critical Schema Gap

### GrammarArea.slug and GrammarLesson.slug Missing

**Current state:** `GrammarArea` has `id`, `name`, `description`, `sortOrder`. No `slug` field. `GrammarLesson` has `id`, `topicId`, `title`, `explanation`, `examples[]`, `sortOrder`, `createdAt`. No `slug` field. [VERIFIED: packages/database/prisma/schema.prisma lines 227–266]

**Impact:** The routing plan requires:
- `/grammar/[area]` — resolved via `areaSlug`
- `/grammar/[area]/[topic]/[lesson]` — resolved via `lessonSlug`

Without slug fields, the router cannot resolve these URL segments to database records.

**Resolution (Wave 0, BLOCKING):**

```prisma
model GrammarArea {
  id          String         @id @default(cuid())
  slug        String         @unique    // ADD: "verb-tenses", "modal-verbs", etc.
  name        String         @unique
  description String?
  sortOrder   Int            @default(0)
  topics      GrammarTopic[]
}

model GrammarLesson {
  id          String   @id @default(cuid())
  topicId     String
  slug        String   @unique    // ADD: url-safe, unique per lesson
  title       String
  explanation String   @db.Text
  examples    String[]
  sortOrder   Int      @default(0)
  createdAt   DateTime @default(now())
  ...
}
```

Migration command:
```bash
pnpm --filter @repo/database db:migrate -- --name "add-grammar-slugs"
```

All 10 area slugs are fixed and can be seeded: `verb-tenses`, `modal-verbs`, `conditionals`, `passive-voice`, `relative-clauses`, `reported-speech`, `gerunds-infinitives`, `articles`, `prepositions`, `linking-words`.

---

## Common Pitfalls

### Pitfall 1: Route Collision — `my-words` Pattern

**What goes wrong:** NestJS param routes can shadow specific string routes. In VocabularyController, `GET my-words` must be declared before `GET :category/words` to avoid "my-words" being treated as a `:category` param.
**Why it happens:** NestJS matches routes in declaration order for the same HTTP method.
**How to avoid:** In GrammarController, declare any fixed-string routes (e.g., `GET areas`) before param routes (e.g., `GET areas/:areaSlug/topics`). Verify route order at module registration time.
**Warning signs:** NestJS returns 404 or param is "areas" for a call to `/api/grammar/areas`.

### Pitfall 2: getSessionToken() in App Router vs. Route Handlers

**What goes wrong:** `getSessionToken()` uses `cookies()` from `next/headers`, which returns a synchronous value in older Next.js patterns but behaves differently in App Router Server Components vs. Route Handlers.
**Why it happens:** The existing `get-session-token.ts` calls `cookies()` synchronously. In Next.js 14 App Router Server Components this works; in Route Handlers, `headers()` and `cookies()` must be awaited.
**How to avoid:** In relay Route Handlers, use `const reqHeaders = await headers(); const cookieHeader = reqHeaders.get("cookie") ?? ""` then call `fetchWithAuth(cookieHeader, ...)` — exactly the pattern in `vocabulary/categories/route.ts`. In Server Component pages, use `getSessionToken()` directly (same pattern as vocabulary page).
**Warning signs:** Token is null despite user being logged in; 401 from NestJS when session exists in browser.

### Pitfall 3: dnd-kit DragOverlay Requires Portal Rendering

**What goes wrong:** If `DragOverlay` is rendered inside a container with `overflow: hidden` or `overflow: scroll`, the drag preview clips at the container boundary.
**Why it happens:** dnd-kit's DragOverlay renders as a fixed-position overlay, but its stacking context can be clipped by ancestor overflow styles.
**How to avoid:** Ensure `DndContext` wraps the entire exercise card area. The exercise card container (`rounded-xl border bg-card p-6`) uses default `overflow: visible` — this is safe. Do not add `overflow: hidden` to the DnD exercise card wrapper.
**Warning signs:** Word chip "disappears" when dragged outside the exercise card boundary.

### Pitfall 4: Prisma createMany in Seed — GrammarArea/Topic Dependency Chain

**What goes wrong:** Seeding must respect foreign key order: `GrammarArea` before `GrammarTopic` before `GrammarLesson` before `GrammarQuestion`. Using `createMany` on all tables simultaneously causes FK constraint violations.
**Why it happens:** PostgreSQL enforces FK constraints on insert.
**How to avoid:** Execute seed in strict dependency order with `await` between each table level. Within each level, use `createMany()` in batches of 500 (PIPE-06 pattern). For the parent record IDs needed in children, query them back after each `createMany` or use `upsert` with known slugs.
**Warning signs:** Seed script throws `PrismaClientKnownRequestError P2003` (foreign key constraint violation).

### Pitfall 5: GrammarProgress @@unique([userId, topicId]) Upsert

**What goes wrong:** Using `create` instead of `upsert` on GrammarProgress causes duplicate-key errors on the second session attempt for the same user+topic pair.
**Why it happens:** The schema has `@@unique([userId, topicId])` on GrammarProgress, which is correct for a single progress record per user per topic — but multiple lesson sessions within the same topic must all update this one record.
**How to avoid:** Always use `prisma.grammarProgress.upsert({ where: { userId_topicId: { userId, topicId } }, ... })`. Never `create` directly. [VERIFIED: schema.prisma line showing @@unique([userId, topicId])]
**Warning signs:** `PrismaClientKnownRequestError P2002` (unique constraint violation) on second session completion.

### Pitfall 6: Weak Questions Query — N+1 vs. Bulk Approach

**What goes wrong:** Fetching the most-recent attempt per question by querying each questionId individually produces N database roundtrips.
**Why it happens:** Prisma lacks a `DISTINCT ON` equivalent in its query builder.
**How to avoid:** Fetch all attempts for the user+topicId in one query ordered by `attemptedAt desc`, then deduplicate in JavaScript (filter to first seen per questionId). This is O(n) in memory and O(1) DB roundtrips.
**Warning signs:** Slow response on topics with many questions; N+1 Prisma query log entries.

---

## Code Examples

### GrammarModule Registration

```typescript
// Source: apps/api/src/vocabulary/vocabulary.module.ts (verified)
// apps/api/src/grammar/grammar.module.ts
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

### AppModule Registration

```typescript
// Source: apps/api/src/app.module.ts (verified — add GrammarModule to imports)
import { GrammarModule } from './grammar/grammar.module';

@Module({
  imports: [
    // ... existing modules
    VocabularyModule,
    SrsModule,
    GrammarModule,   // ADD
  ],
})
export class AppModule {}
```

### Seed Structure (grammar.json)

```json
// packages/database/prisma/seed-data/grammar.json
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
                  "difficulty": 1
                }
                // ... ≥20 questions per topic (across all lessons)
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `react-beautiful-dnd` | `@dnd-kit/core` | ~2022 | `react-beautiful-dnd` is unmaintained; dnd-kit is the successor with better touch, accessibility, and React 18 compatibility |
| Manual session state in Redux | React component state + one batch POST | Phase 3 established | No global store needed for a single-session workflow; reduces bundle size and complexity |
| Separate assessment quiz | Exercises ARE the assessment (D-07) | Phase 4 design | Simpler UX; every exercise feeds GrammarAttempt directly |

**Deprecated/outdated:**
- `react-beautiful-dnd`: Unmaintained since 2022, React 18 compatibility issues. Do not use. Use `@dnd-kit/core` instead.
- Separate `getServerSideProps` pattern: Pages Router only. Phase 4 uses App Router Server Components exclusively.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `@dnd-kit/core` and `@dnd-kit/sortable` are legitimate packages with no malicious code | Package Legitimacy Audit | Low — well-known library, 4+ years old, authored by Claudéric Demers, reviewed in UI-SPEC. But slopcheck could not be run. |
| A2 | GrammarLesson lookup-by-slug in `getLessonDetail()` is sufficient to get questions (via relation) | Architecture Patterns | Low — Prisma `include: { questions: true }` on GrammarLesson is straightforward; schema confirms the relation |
| A3 | The seed JSON structure (nested areas → topics → lessons → questions) can be loaded entirely in memory during seed | Code Examples (seed) | Low — 10 areas × ~3-5 topics × ~3-5 lessons × ~20 questions = max ~5000 records; well within memory limits |
| A4 | `getSessionToken()` works in grammar Server Component pages identically to how it works in vocabulary pages | Pattern 5 | Low — both use App Router Server Components with identical `cookies()` access pattern |

**If this table is empty:** All claims in this research were verified or cited — no user confirmation needed.

---

## Open Questions (RESOLVED)

1. **areaSlug routing strategy for weak-questions endpoint** — RESOLVED
   - What we know: The weak-questions endpoint is `GET /api/grammar/topics/:topicId/weak-questions`. The topic page knows the `topicSlug` from the URL but needs `topicId` for this query.
   - What's unclear: Should the API accept `topicSlug` (more RESTful) or `topicId` (simpler service implementation)?
   - Recommendation: Accept `topicSlug` and resolve to `topicId` inside GrammarService (single Prisma lookup). Keeps the frontend consistent — it only deals with slugs from URL params.
   - **RESOLUTION (implemented in plans 04-02 + 04-05):** Accept `topicSlug` at the relay + controller layer and resolve to `topicId` inside GrammarService. Plan 04-05 Task 1 builds the `topics/[topicSlug]/weak-questions` relay route on slug; plan 04-02 resolves slug→id in the service.

2. **Seed question count distribution per topic** — RESOLVED
   - What we know: GRAM-05 requires ≥20 questions per topic. With 10 areas × ~3-5 topics × 3-5 exercise types, total questions = 10 × 4 × 20 = ~800 questions minimum.
   - What's unclear: Whether to distribute questions evenly across lessons or concentrate them.
   - Recommendation: Distribute as ~7 questions per lesson across 3 lessons per topic (= 21 per topic, meets GRAM-05). This gives meaningful variety per lesson session while meeting the minimum.
   - **RESOLUTION (implemented in plan 04-01 Task 3):** Distribute ~7 questions across ~3 lessons per topic (= ~21 per topic). The plan 04-01 Task 3 verify enforces ≥20 questions per topic at both the JSON-structure level and (post-seed) the DB-count level.
