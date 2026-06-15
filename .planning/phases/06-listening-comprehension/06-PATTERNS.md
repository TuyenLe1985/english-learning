# Phase 6: Listening Comprehension - Pattern Map

**Mapped:** 2026-06-15
**Files analyzed:** 14 new/modified files
**Analogs found:** 12 / 14

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `apps/api/src/listening/listening.controller.ts` | controller | request-response | `apps/api/src/grammar/grammar.controller.ts` | exact |
| `apps/api/src/listening/listening.service.ts` | service | CRUD | `apps/api/src/grammar/grammar.service.ts` | exact |
| `apps/api/src/listening/listening.module.ts` | module/config | — | `apps/api/src/grammar/grammar.module.ts` | exact |
| `apps/api/src/listening/listening.service.spec.ts` | test | — | `apps/api/src/reading/reading.service.spec.ts` | exact |
| `apps/api/src/pipeline/listening-crawler.service.ts` | service | file-I/O | `apps/api/src/pipeline/classifier.service.spec.ts` (only pipeline file exists) | partial |
| `apps/api/src/pipeline/listening-seed.service.ts` | service | batch | `apps/api/src/pipeline/classifier.service.spec.ts` (only pipeline file exists) | partial |
| `packages/shared/src/listening.dto.ts` | utility/DTO | transform | `packages/shared/src/reading.dto.ts` | exact |
| `packages/shared/src/index.ts` | config | — | `packages/shared/src/index.ts` (MODIFY) | exact |
| `apps/web/src/app/(dashboard)/listening/page.tsx` | component | request-response | `apps/web/src/app/(dashboard)/grammar/page.tsx` | exact |
| `apps/web/src/app/(dashboard)/listening/[itemId]/page.tsx` | component | request-response | `apps/web/src/app/(dashboard)/grammar/[area]/[topic]/[lesson]/page.tsx` | role-match |
| `apps/web/src/components/listening/audio-player.tsx` | component | event-driven | `apps/web/src/components/grammar/multiple-choice-exercise.tsx` | partial |
| `apps/web/src/components/listening/listening-session.tsx` | component | event-driven | `apps/web/src/components/vocabulary/practice-session.tsx` | exact |
| `apps/web/src/hooks/use-audio-player.ts` | hook | event-driven | `apps/web/src/hooks/use-toast.ts` | role-match |
| `packages/database/prisma/schema.prisma` | model | — | self (MODIFY — add `wordTimestamps Json?`) | exact |

---

## Pattern Assignments

### `apps/api/src/listening/listening.controller.ts` (controller, request-response)

**Analog:** `apps/api/src/grammar/grammar.controller.ts`

**Imports pattern** (lines 19-48):
```typescript
import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Request,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ListeningService } from './listening.service';
import type {
  ListeningItemDto,
  ListeningItemDetailDto,
  ListeningSessionResultDto,
} from '@repo/shared';
import { ListeningSessionCompleteSchema } from '@repo/shared';
```

**Auth pattern** (lines 59-81 from grammar.controller.ts):
```typescript
// Authenticated request type — copy verbatim
interface AuthenticatedRequest {
  user: {
    userId: string;
    role?: string;
    cefrLevel?: string;
    email?: string;
  };
}

@Controller('listening')
export class ListeningController {
  constructor(private readonly listeningService: ListeningService) {}
```

**Route ordering pattern — fixed strings BEFORE params** (from grammar.controller.ts lines 59-81, and from RESEARCH Pitfall 7):
```typescript
// POST sessions/complete MUST be declared BEFORE GET :id
// Otherwise NestJS matches "sessions" as :id parameter value

@UseGuards(JwtAuthGuard)
@Post('sessions/complete')
async completeSession(
  @Request() req: AuthenticatedRequest,
  @Body() body: unknown,
): Promise<ListeningSessionResultDto> {
  const dto = ListeningSessionCompleteSchema.parse(body);
  return this.listeningService.completeSession(req.user.userId, dto);
}

// GET :id declared AFTER all fixed-string routes
@UseGuards(JwtAuthGuard)
@Get('items/:id')
async getItemById(
  @Param('id') id: string,
  @Request() req: AuthenticatedRequest,
): Promise<ListeningItemDetailDto> {
  return this.listeningService.getItemById(id, req.user.userId);
}
```

**Query param pattern for browse** (from vocabulary.controller.ts lines 77-89):
```typescript
// GET /api/listening/items?cefrLevel=B2&topic=technology&contentType=NEWS_REPORT&page=1&limit=20
@UseGuards(JwtAuthGuard)
@Get('items')
async getItems(
  @Query('cefrLevel') cefrLevel?: string,
  @Query('topic') topic?: string,
  @Query('contentType') contentType?: string,
  @Query('page') page = 1,
  @Query('limit') limit = 20,
): Promise<PaginatedListeningItemsDto> {
  return this.listeningService.getItems({ cefrLevel, topic, contentType, page: +page, limit: +limit });
}
```

**Security rule:** `userId` always from `req.user.userId` (JWT), never from request body. Enforced in `completeSession` — copy exact pattern from grammar.controller.ts line 79-80.

---

### `apps/api/src/listening/listening.service.ts` (service, CRUD)

**Analog:** `apps/api/src/grammar/grammar.service.ts`

**Imports + Injectable pattern** (lines 15-29 from grammar.service.ts):
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type {
  ListeningItemDto,
  ListeningItemDetailDto,
  ListeningSessionCompleteDto,
  ListeningSessionResultDto,
} from '@repo/shared';

@Injectable()
export class ListeningService {
  constructor(private readonly prisma: PrismaService) {}
```

**Paginated query pattern** (mirrors reading.service.spec.ts lines 107-128 expectations):
```typescript
// getItems() must return { items, total, page, limit, totalPages }
async getItems(filters: {
  cefrLevel?: string;
  topic?: string;
  contentType?: string;
  page: number;
  limit: number;
}) {
  const where = {
    isPublished: true,
    ...(filters.cefrLevel ? { cefrLevel: filters.cefrLevel as CefrLevel } : {}),
    ...(filters.topic ? { topic: filters.topic } : {}),
    ...(filters.contentType ? { contentType: filters.contentType as ContentType } : {}),
  };

  const [items, total] = await Promise.all([
    this.prisma.listeningContent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (filters.page - 1) * filters.limit,
      take: filters.limit,
      include: { _count: { select: { questions: true } } },
    }),
    this.prisma.listeningContent.count({ where }),
  ]);

  return {
    items: items.map(item => ({ /* map to ListeningItemDto */ })),
    total,
    page: filters.page,
    limit: filters.limit,
    totalPages: Math.ceil(total / filters.limit),
  };
}
```

**NotFoundException pattern** (from grammar.service.ts lines 69-70, 161-163):
```typescript
if (!item) {
  throw new NotFoundException(`Listening item ${id} not found`);
}
```

**upsert on completeSession** — copy exact compound-key pattern from grammar.service.ts lines 241-257:
```typescript
// ListeningProgress unique key is @@unique([userId, contentId])
await this.prisma.listeningProgress.upsert({
  where: { userId_contentId: { userId, contentId: dto.contentId } },
  create: {
    userId,
    contentId: dto.contentId,
    score: dto.score,
    accuracy: dto.accuracy,
    completedAt: new Date(),
    lastViewedAt: new Date(),
  },
  update: {
    score: dto.score,
    accuracy: dto.accuracy,
    completedAt: new Date(),
    lastViewedAt: new Date(),
  },
});
```

**S3 presigned URL generation** (from RESEARCH Pattern 7):
```typescript
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// In getItemById(): after fetching from DB, generate 1-hour presigned URL
const command = new GetObjectCommand({
  Bucket: this.config.get<string>('S3_BUCKET') ?? 'audio',
  Key: item.audioStorageKey,
});
const audioUrl = await getSignedUrl(this.s3, command, { expiresIn: 3600 });
```

---

### `apps/api/src/listening/listening.module.ts` (module/config)

**Analog:** `apps/api/src/grammar/grammar.module.ts` (lines 1-19) — copy verbatim, substituting names:

```typescript
import { Module } from '@nestjs/common';
import { ListeningController } from './listening.controller';
import { ListeningService } from './listening.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ListeningController],
  providers: [ListeningService],
  exports: [ListeningService],
})
export class ListeningModule {}
```

**Key constraint:** Do NOT import `PrismaModule` here. `PrismaService` is provided globally via `PrismaModule` imported in `AppModule`. This is the established pattern across all modules (grammar, vocabulary, srs).

**Registration:** Add `ListeningModule` to `apps/api/src/app.module.ts` imports array (line 26 — after `GrammarModule`):
```typescript
import { ListeningModule } from './listening/listening.module';
// ... in @Module imports array:
GrammarModule,
ListeningModule,
```

---

### `apps/api/src/listening/listening.service.spec.ts` (test)

**Analog:** `apps/api/src/reading/reading.service.spec.ts` (exact structure) AND `apps/api/src/grammar/grammar.service.spec.ts`

**Test file structure** (from reading.service.spec.ts lines 19-101):
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { ListeningService } from './listening.service';
import type { PrismaService } from '../prisma/prisma.service';

// ─── Mock PrismaService ───────────────────────────────────────────────────────
const mockContentFindMany = vi.fn();
const mockContentCount = vi.fn();
const mockContentFindUnique = vi.fn();
const mockProgressUpsert = vi.fn();
const mockProgressFindUnique = vi.fn();

const mockPrisma = {
  listeningContent: {
    findMany: mockContentFindMany,
    count: mockContentCount,
    findUnique: mockContentFindUnique,
  },
  listeningProgress: {
    upsert: mockProgressUpsert,
    findUnique: mockProgressFindUnique,
  },
} as unknown as PrismaService;

// ─── Sample fixtures ──────────────────────────────────────────────────────────
const sampleContent = {
  id: 'content-001',
  title: 'A Day in London',
  contentType: 'CONVERSATION',
  cefrLevel: 'B2',
  topic: 'travel',
  durationSec: 180,
  isPublished: true,
  _count: { questions: 5 },
};

describe('ListeningService', () => {
  let service: ListeningService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ListeningService(mockPrisma);
  });
  // ... tests per LIST-01, LIST-07
```

**Wave 0 test cases to scaffold** (from RESEARCH Validation Architecture):
- `getItems()` returns `{ items, total, page, limit, totalPages }` — mirrors reading.service.spec.ts line 107-128
- `getItemById()` throws `NotFoundException` when not found — mirrors grammar.service.spec.ts line 155-160
- `completeSession()` calls `listeningProgress.upsert` with `where: { userId_contentId: { userId, contentId } }` — mirrors reading.service.spec.ts line 164-186

---

### `apps/api/src/pipeline/listening-crawler.service.ts` (service, file-I/O)

**No exact analog** — `apps/api/src/pipeline/` has only `classifier.service.spec.ts`. Phase 5's crawler was planned but no source file exists yet in this repo.

**Nearest pattern:** `apps/api/src/pipeline/classifier.service.spec.ts` lines 16-17 show the NestJS Injectable pattern used by pipeline services.

**Structure to follow** (from RESEARCH Architecture Patterns + CONTEXT D-07):
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ListeningCrawlerService {
  private readonly logger = new Logger(ListeningCrawlerService.name);
  private readonly s3: S3Client;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.s3 = new S3Client({
      endpoint: config.get('MINIO_ENDPOINT', 'http://localhost:9000'),
      credentials: {
        accessKeyId: config.get('MINIO_ACCESS_KEY', 'minioadmin'),
        secretAccessKey: config.get('MINIO_SECRET_KEY', 'minioadmin'),
      },
      forcePathStyle: true,
      region: 'us-east-1',
    });
  }

  // Pipeline step sequence per D-03:
  // 1. crawl source URL → download MP3 to temp file
  // 2. upload MP3 to MinIO → audioStorageKey
  // 3. POST whisper-worker → wordTimestamps
  // 4. classifyPassage(transcriptText) → cefrLevel
  // 5. prisma.listeningContent.create(...)
  // 6. generateExercises(content) → prisma.listeningQuestion.createMany()
```

**Whisper worker call** (from RESEARCH Pattern 1):
```typescript
async callWhisperWorker(
  audioPath: string,
): Promise<Array<{ word: string; start: number; end: number }>> {
  const form = new FormData();
  form.append('file', fs.createReadStream(audioPath), { filename: 'audio.mp3' });
  form.append('model', 'whisper-1');
  form.append('response_format', 'verbose_json');
  form.append('timestamp_granularities[]', 'word');
  form.append('language', 'en');

  const whisperUrl = this.config.get('WHISPER_WORKER_URL', 'http://whisper-worker:9000');
  const response = await fetch(`${whisperUrl}/v1/audio/transcriptions`, {
    method: 'POST',
    body: form,
  });

  const json = await response.json() as {
    text: string;
    words: Array<{ word: string; start: number; end: number; probability: number }>;
  };

  return json.words.map(w => ({ word: w.word, start: w.start, end: w.end }));
}
```

**Pitfall:** `WHISPER_WORD_TIMESTAMPS=true` in docker-compose env AND `response_format=verbose_json` + `timestamp_granularities[]=word` in FormData are both required. Missing either returns segment-level output only (RESEARCH Pitfall 1).

---

### `apps/api/src/pipeline/listening-seed.service.ts` (service, batch)

**No exact analog** — same situation as crawler above.

**Batch insert pattern** (from CONTEXT code_context "prisma.createMany() in batches of 500"):
```typescript
// Seed in batches of 500 — copy this pattern for listeningQuestion.createMany
const BATCH_SIZE = 500;

async seedQuestions(questions: CreateQuestionInput[]): Promise<void> {
  for (let i = 0; i < questions.length; i += BATCH_SIZE) {
    const batch = questions.slice(i, i + BATCH_SIZE);
    await this.prisma.listeningQuestion.createMany({
      data: batch,
      skipDuplicates: true,
    });
  }
}
```

**FillMissingWords generation** (from RESEARCH Pattern 4 — use during seed, not at request time):
```typescript
// Run during ListeningSeedService — never at request time
function generateFillMissingWords(
  sentences: string[],
  cefrWordList: Set<string>,
): Array<{ prompt: string; answer: string; distractors: string[] }> {
  // ... (copy verbatim from RESEARCH Pattern 4, lines 376-399)
}
```

**Entry point pattern** (from CONTEXT D-07 — same CLI pattern as Phase 5 pipeline):
```typescript
// apps/api/src/pipeline/seed-listening.ts — CLI entry point
import { NestFactory } from '@nestjs/core';
import { PipelineModule } from './pipeline.module';
import { ListeningSeedService } from './listening-seed.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(PipelineModule);
  const seeder = app.get(ListeningSeedService);
  await seeder.run();
  await app.close();
}

bootstrap().catch(console.error);
```

**pnpm scripts** (add to `apps/api/package.json`):
```json
"pipeline:crawl:listening": "ts-node -r tsconfig-paths/register src/pipeline/crawl-listening.ts",
"pipeline:seed:listening": "ts-node -r tsconfig-paths/register src/pipeline/seed-listening.ts",
"pipeline:validate:listening": "ts-node -r tsconfig-paths/register src/pipeline/validate-listening.ts"
```

---

### `packages/shared/src/listening.dto.ts` (utility/DTO, transform)

**Analog:** `packages/shared/src/reading.dto.ts` — copy structure exactly

**Full DTO file** (from RESEARCH Code Examples, lines 586-645):
```typescript
import { z } from 'zod';

export const WordTimestampSchema = z.object({
  word: z.string(),
  start: z.number(),  // seconds
  end: z.number(),    // seconds
});

export const ListeningItemDtoSchema = z.object({
  id: z.string(),
  title: z.string(),
  contentType: z.enum(['CONVERSATION', 'INTERVIEW', 'PODCAST', 'LECTURE', 'NEWS_REPORT']),
  cefrLevel: z.enum(['B1', 'B2', 'C1']),
  topic: z.string().nullable(),
  durationSec: z.number().nullable(),
  questionCount: z.number(),
});

export const ListeningQuestionDtoSchema = z.object({
  id: z.string(),
  exerciseType: z.enum(['MULTIPLE_CHOICE', 'FILL_MISSING_WORDS', 'DICTATION']),
  prompt: z.string(),
  answer: z.string(),
  distractors: z.array(z.string()),
  explanation: z.string().nullable(),
  timestampSec: z.number().nullable(),
  xpReward: z.number(),
  sortOrder: z.number(),
});

export const ListeningItemDetailDtoSchema = ListeningItemDtoSchema.extend({
  audioUrl: z.string(),
  transcriptText: z.string(),
  wordTimestamps: z.array(WordTimestampSchema).nullable(),
  questions: z.array(ListeningQuestionDtoSchema),
  progress: z.object({ score: z.number(), accuracy: z.number() }).nullable(),
});

export const ListeningSessionCompleteSchema = z.object({
  contentId: z.string(),
  score: z.number(),
  accuracy: z.number(),
  attempts: z.array(z.object({
    questionId: z.string(),
    isCorrect: z.boolean(),
    userAnswer: z.string().optional(),
  })),
});

export type WordTimestamp = z.infer<typeof WordTimestampSchema>;
export type ListeningItemDto = z.infer<typeof ListeningItemDtoSchema>;
export type ListeningItemDetailDto = z.infer<typeof ListeningItemDetailDtoSchema>;
export type ListeningQuestionDto = z.infer<typeof ListeningQuestionDtoSchema>;
export type ListeningSessionCompleteDto = z.infer<typeof ListeningSessionCompleteSchema>;
```

**Barrel registration** (`packages/shared/src/index.ts` line 26 — add after reading.dto):
```typescript
// Phase 6: Listening DTOs
export * from "./listening.dto";
```

---

### `apps/web/src/app/(dashboard)/listening/page.tsx` (component, request-response)

**Analog:** `apps/web/src/app/(dashboard)/grammar/page.tsx` (exact pattern)

**Server Component pattern** (from grammar/page.tsx lines 1-70):
```typescript
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { fetchWithAuth, INTERNAL_API_URL } from "@/lib/api-client";
import type { ListeningItemDto } from "@repo/shared";

async function fetchListeningItems(
  cookieHeader: string,
  params: URLSearchParams,
): Promise<{ items: ListeningItemDto[]; total: number }> {
  try {
    const res = await fetchWithAuth(
      cookieHeader,
      `${INTERNAL_API_URL}/api/listening/items?${params.toString()}`,
    );
    if (!res.ok) return { items: [], total: 0 };
    return res.json() as Promise<{ items: ListeningItemDto[]; total: number }>;
  } catch {
    return { items: [], total: 0 };
  }
}

export default async function ListeningPage({ searchParams }: Props) {
  const session = await auth();
  if (!session) redirect("/login");

  const reqHeaders = await headers();
  const cookieHeader = reqHeaders.get("cookie") ?? "";

  // Build filter query from searchParams (cefrLevel, topic, contentType)
  const params = new URLSearchParams();
  // ... add filters from searchParams
  const data = await fetchListeningItems(cookieHeader, params);

  return (
    <div className="mx-auto max-w-screen-xl">
      <div className="mb-8">
        <h1 className="text-[28px] font-semibold text-foreground">Listening</h1>
        <p className="mt-1 text-base text-muted-foreground">Browse by level and topic</p>
      </div>
      {/* Filter bar — shadcn Select for cefrLevel, topic, contentType */}
      {/* ListeningItemCard grid */}
    </div>
  );
}
```

**Key difference from vocabulary/page.tsx:** Grammar and reading pages use `fetchWithAuth` + `INTERNAL_API_URL` + forwarded cookie header. Vocabulary page uses `getSessionToken()` + direct `NEXT_PUBLIC_API_URL`. Use the grammar pattern (`fetchWithAuth` + `headers()`) — it is the more recent and correct pattern.

---

### `apps/web/src/app/(dashboard)/listening/[itemId]/page.tsx` (component, request-response)

**Analog:** `apps/web/src/app/(dashboard)/grammar/[area]/[topic]/[lesson]/page.tsx`

**Server Component detail page pattern** (from grammar lesson page lines 27-124):
```typescript
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { headers } from "next/headers";
import Link from "next/link";
import { fetchWithAuth, INTERNAL_API_URL } from "@/lib/api-client";
import type { ListeningItemDetailDto } from "@repo/shared";

async function fetchItemDetail(
  cookieHeader: string,
  itemId: string,
): Promise<ListeningItemDetailDto | null> {
  try {
    const res = await fetchWithAuth(
      cookieHeader,
      `${INTERNAL_API_URL}/api/listening/items/${itemId}`,
    );
    if (!res.ok) return null;
    return res.json() as Promise<ListeningItemDetailDto>;
  } catch {
    return null;
  }
}

interface Props {
  params: Promise<{ itemId: string }>;
}

export default async function ListeningItemPage({ params }: Props) {
  const session = await auth();
  if (!session) redirect("/login");

  const { itemId } = await params;
  const reqHeaders = await headers();
  const cookieHeader = reqHeaders.get("cookie") ?? "";

  const item = await fetchItemDetail(cookieHeader, itemId);

  if (!item) {
    return (
      <div className="mx-auto max-w-2xl">
        <Link href="/listening" className="mb-4 inline-block text-sm text-muted-foreground">
          ← Back to Listening
        </Link>
        <p role="status" className="py-16 text-center text-base text-muted-foreground">
          Could not load this item. Try refreshing.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-screen-lg">
      {/* Sticky audio player + scrollable transcript + exercises */}
      {/* All interactive state managed by ListeningItemClient (Client Component) */}
    </div>
  );
}
```

**Critical pattern:** This page passes the full `ListeningItemDetailDto` (including `wordTimestamps`) to a Client Component. The Server Component does NOT have any `'use client'` directive — it delegates all interactive state (playback, exercises, karaoke) to child Client Components.

---

### `apps/web/src/components/listening/listening-session.tsx` (component, event-driven)

**Analog:** `apps/web/src/components/vocabulary/practice-session.tsx` — accumulate-then-submit pattern

**Session state pattern** (from practice-session.tsx lines 118-203):
```typescript
"use client";

export function ListeningSession({ item, onComplete }: Props) {
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<SessionAnswer[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [transcriptLocked, setTranscriptLocked] = useState(true);

  // Accumulate answers mid-session — no API calls until submit
  const handleAnswer = (questionId: string, isCorrect: boolean, userAnswer?: string) => {
    const newAnswers = [...answers, { questionId, isCorrect, userAnswer }];
    setAnswers(newAnswers);
    if (newAnswers.length >= item.questions.length) {
      void submitSession(newAnswers);
    } else {
      setStepIndex(prev => prev + 1);
    }
  };

  // Batch submit — one POST after all exercises answered
  const submitSession = async (finalAnswers: SessionAnswer[]) => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/listening/sessions/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentId: item.id,
          score: finalAnswers.filter(a => a.isCorrect).length,
          accuracy: (finalAnswers.filter(a => a.isCorrect).length / finalAnswers.length) * 100,
          attempts: finalAnswers,
        }),
      });
      // D-15: Atomic state transition — unlock transcript + activate karaoke + show score card
      setTranscriptLocked(false);
      setIsComplete(true);
    } catch {
      // Non-blocking — still unlock transcript
      setTranscriptLocked(false);
      setIsComplete(true);
    } finally {
      setSubmitting(false);
    }
  };
```

**Score card pattern** (from session-results.tsx lines 115-177 — inline, no redirect):
```typescript
// If complete, render score card inline (D-16 — same page, no redirect)
if (isComplete) {
  return (
    <ListeningScoreCard
      score={answers.filter(a => a.isCorrect).length}
      total={answers.length}
      // ... xpEarned etc.
    />
  );
}
```

---

### `apps/web/src/hooks/use-audio-player.ts` (hook, event-driven)

**Analog:** `apps/web/src/hooks/use-toast.ts` — hook file structure and pattern

**Hook file header pattern** (from use-toast.ts line 1):
```typescript
"use client"
```

**Full hook implementation** (from RESEARCH Pattern 2):
```typescript
'use client';
import { useRef, useState, useCallback, useEffect } from 'react';

export interface AudioPlayerState {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  playbackRate: number;
  hasListenedEnough: boolean;  // true once currentTime >= duration * 0.5
}

export function useAudioPlayer(audioUrl: string) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const [state, setState] = useState<AudioPlayerState>({
    currentTime: 0, duration: 0, isPlaying: false, playbackRate: 1, hasListenedEnough: false,
  });

  // rAF loop — attach when playing, cancel when paused (RESEARCH Pattern 2)
  const startRafLoop = useCallback(() => {
    const tick = () => {
      if (!audioRef.current) return;
      const ct = audioRef.current.currentTime;
      const dur = audioRef.current.duration || 0;
      setState(prev => ({
        ...prev,
        currentTime: ct,
        hasListenedEnough: prev.hasListenedEnough || (dur > 0 && ct >= dur * 0.5),
      }));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const stopRafLoop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  // ...play, pause, seek, setSpeed implementations
  return { audioRef, state, play, pause, seek, setSpeed, startRafLoop, stopRafLoop };
}
```

**Critical performance rule** (RESEARCH Pitfall 2): Do NOT call `setState({ activeWordIndex })` inside the rAF loop. Keep `activeWordIndex` in a `useRef` and directly update DOM attributes: `wordSpanRef.current?.setAttribute('data-active', 'true')`. Only use `setState` for coarse updates (play/pause/currentTime for seek bar).

**Binary search helper** (from RESEARCH Pattern 3 — pure function, test with use-audio-player.test.ts):
```typescript
// Export for testability (LIST-05 unit test requirement)
export function findActiveWordIndex(
  words: Array<{ word: string; start: number; end: number }>,
  currentTime: number,
): number {
  let lo = 0, hi = words.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (words[mid].end <= currentTime) lo = mid + 1;
    else if (words[mid].start > currentTime) hi = mid - 1;
    else return mid;
  }
  return -1;
}
```

---

### `apps/web/src/components/listening/audio-player.tsx` (component, event-driven)

**No close analog** — no existing audio player component in the codebase.

**Nearest pattern:** `apps/web/src/components/grammar/multiple-choice-exercise.tsx` for the shadcn Button + state feedback pattern.

**shadcn component imports** (available in project — verified by directory listing):
```typescript
"use client";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";  // seek bar per D-09
import { cn } from "@/lib/utils";

// Speed toggle buttons — D-12 pattern:
// Pill-shaped buttons, active speed gets filled/accent state
const SPEEDS = [0.75, 1, 1.25, 1.5] as const;

{SPEEDS.map(speed => (
  <Button
    key={speed}
    size="sm"
    variant={state.playbackRate === speed ? "default" : "outline"}
    onClick={() => setSpeed(speed)}
    className="min-h-[36px] rounded-full px-3 text-xs"
  >
    {speed}×
  </Button>
))}
```

**Sticky header layout** (from CONTEXT D-11):
```typescript
// Player bar is position: sticky; top: 0 in the page layout
// Transcript panel scrolls below it
<div className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
  {/* Audio controls: play/pause, seek bar, speed toggles */}
</div>
```

---

### `packages/database/prisma/schema.prisma` (MODIFY)

**Analog:** Self — existing `ListeningContent` model at lines 426-450.

**Single column addition** (from CONTEXT D-04, RESEARCH Pattern 6):
```prisma
model ListeningContent {
  // ... all existing fields remain unchanged ...
  id               String      @id @default(cuid())
  title            String
  transcriptText   String      @db.Text
  audioStorageKey  String?
  sourceUrl        String?     @unique
  contentHash      String?     @unique
  contentType      ContentType
  cefrLevel        CefrLevel
  cefrConfidence   Float       @default(0.0)
  topic            String?
  durationSec      Int?
  isPublished      Boolean     @default(false)
  flaggedForReview Boolean     @default(false)
  createdAt        DateTime    @default(now())
  updatedAt        DateTime    @updatedAt

  // NEW — Phase 6 addition:
  wordTimestamps   Json?       // [{word: String, start: Float, end: Float}] from Whisper
```

**Migration command:**
```bash
npx prisma migrate dev --name add_word_timestamps_to_listening_content
```

**Guard in frontend** (RESEARCH Pitfall 5 — nullable field):
```typescript
// In transcript-panel.tsx:
if (!wordTimestamps || wordTimestamps.length === 0) {
  // Render static transcript without karaoke sync
  return <StaticTranscript text={transcriptText} />;
}
```

---

## Shared Patterns

### Authentication Guard
**Source:** `apps/api/src/auth/jwt-auth.guard.ts` (lines 18-55)
**Apply to:** All `ListeningController` endpoints, `apps/web/src/app/api/listening/*` relay routes

```typescript
// NestJS side: apply to every endpoint
@UseGuards(JwtAuthGuard)

// Next.js relay side: extract JWE cookie, forward as Bearer header
import { fetchWithAuth, INTERNAL_API_URL } from "@/lib/api-client";
// See api-client.ts extractRawToken() + fetchWithAuth() for complete implementation
```

### JWT userId Security Rule
**Source:** `apps/api/src/grammar/grammar.controller.ts` line 79-80
**Apply to:** `completeSession()` in ListeningController

```typescript
// ALWAYS: userId from JWT payload, NEVER from request body
const dto = ListeningSessionCompleteSchema.parse(body);  // validates body
return this.listeningService.completeSession(req.user.userId, dto);  // userId from JWT
```

### Server Component Auth Check
**Source:** `apps/web/src/app/(dashboard)/grammar/page.tsx` lines 33-39
**Apply to:** Both `listening/page.tsx` and `listening/[itemId]/page.tsx`

```typescript
const session = await auth();
if (!session) redirect("/login");

const reqHeaders = await headers();
const cookieHeader = reqHeaders.get("cookie") ?? "";
// Then: fetchWithAuth(cookieHeader, `${INTERNAL_API_URL}/api/listening/...`)
```

### Error Handling (NestJS)
**Source:** `apps/api/src/grammar/grammar.service.ts` lines 69-70
**Apply to:** `getItemById()` in ListeningService

```typescript
if (!item) {
  throw new NotFoundException(`Listening item ${id} not found`);
}
```

### Prisma Upsert with Compound Key
**Source:** `apps/api/src/grammar/grammar.service.ts` lines 241-257
**Apply to:** `completeSession()` in ListeningService

```typescript
// ListeningProgress @@unique([userId, contentId]) → compound key name: userId_contentId
await this.prisma.listeningProgress.upsert({
  where: { userId_contentId: { userId, contentId: dto.contentId } },
  create: { ... },
  update: { ... },
});
```

### shadcn Component Usage
**Source:** `apps/web/src/components/grammar/multiple-choice-exercise.tsx` line 5, `apps/web/src/components/vocabulary/session-results.tsx` lines 22-29
**Apply to:** All new listening components

```typescript
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";  // for audio seek bar
import { cn } from "@/lib/utils";  // for conditional classnames
```

### Fetch Error Boundary (Server Component)
**Source:** `apps/web/src/app/(dashboard)/grammar/page.tsx` lines 20-31
**Apply to:** All `listening/` page Server Components

```typescript
// Always wrap fetchWithAuth in try/catch; return empty data on failure
async function fetchListeningItems(cookieHeader: string): Promise<ListeningItemDto[]> {
  try {
    const res = await fetchWithAuth(cookieHeader, `${INTERNAL_API_URL}/api/listening/items`);
    if (!res.ok) return [];
    return res.json() as Promise<ListeningItemDto[]>;
  } catch {
    return [];
  }
}
```

---

## No Analog Found

Files with no close match in the existing codebase (planner must use RESEARCH.md patterns instead):

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `apps/api/src/pipeline/listening-crawler.service.ts` | service | file-I/O | No crawler service exists yet — Phase 5 pipeline code not yet created in repo; only `classifier.service.spec.ts` present |
| `apps/api/src/pipeline/listening-seed.service.ts` | service | batch | Same — no seed service implementation exists yet |
| `apps/web/src/components/listening/audio-player.tsx` | component | event-driven | No audio player in codebase; nearest pattern is Button/Slider usage from grammar/vocabulary exercises |
| `apps/web/src/components/listening/transcript-panel.tsx` | component | event-driven | No transcript display component; karaoke sync is novel to this phase |
| `apps/web/src/components/listening/exercises/fill-missing-words.tsx` | component | event-driven | No FillMissingWords component; closest is `cloze-exercise.tsx` (vocabulary) which blanks a word — but that file is for vocabulary words, not transcript sentences |
| `apps/web/src/components/listening/exercises/dictation-exercise.tsx` | component | event-driven | No dictation component exists; entirely new interaction pattern |
| `docker-compose.yml` (MODIFY) | config | — | whisper-worker is a new Docker service with no existing analog |

**For these files:** Use RESEARCH.md Patterns 1-7 as the code template. Patterns 2, 3, 4, 5 are complete implementations ready to copy.

---

## Metadata

**Analog search scope:** `apps/api/src/`, `apps/web/src/`, `packages/shared/src/`, `packages/database/prisma/`
**Files scanned:** 35 TypeScript/TSX files + 1 Prisma schema
**Key finding:** Phase 5 reading module was planned but not yet implemented (no `reading.controller.ts`, `reading.service.ts`, or `reading.module.ts` exist in `apps/api/src/reading/` — only `reading.service.spec.ts`). Grammar module is the most complete NestJS module and is the correct template for ListeningModule.
**Pattern extraction date:** 2026-06-15
