# Phase 5: Reading Comprehension + Content Pipeline — Pattern Map

**Mapped:** 2026-06-14
**Files analyzed:** 20 new/modified files
**Analogs found:** 18 / 20

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `apps/api/src/reading/reading.module.ts` | module | config | `apps/api/src/grammar/grammar.module.ts` | exact |
| `apps/api/src/reading/reading.controller.ts` | controller | request-response | `apps/api/src/grammar/grammar.controller.ts` | exact |
| `apps/api/src/reading/reading.service.ts` | service | CRUD | `apps/api/src/grammar/grammar.service.ts` | exact |
| `apps/api/src/reading/reading.service.spec.ts` | test | — | `apps/api/src/grammar/grammar.service.spec.ts` | exact |
| `apps/api/src/vocabulary/vocabulary.controller.ts` (modify) | controller | request-response | `apps/api/src/vocabulary/vocabulary.controller.ts` | exact (add lookup route) |
| `apps/api/src/vocabulary/vocabulary.service.ts` (modify) | service | CRUD | `apps/api/src/vocabulary/vocabulary.service.ts` | exact (add lookupByWord) |
| `apps/api/src/vocabulary/vocabulary.service.spec.ts` (modify) | test | — | `apps/api/src/vocabulary/vocabulary.service.spec.ts` | exact (add lookupByWord test) |
| `apps/api/src/pipeline/pipeline.module.ts` | module | config | `apps/api/src/grammar/grammar.module.ts` | role-match |
| `apps/api/src/pipeline/pipeline.cli.ts` | utility | batch | `apps/api/src/main.ts` | partial-match (NestFactory pattern) |
| `apps/api/src/pipeline/crawler.service.ts` | service | file-I/O | `apps/api/src/vocabulary/vocabulary.service.ts` | partial-match (Injectable service) |
| `apps/api/src/pipeline/classifier.service.ts` | service | transform | `apps/api/src/vocabulary/vocabulary.service.ts` | partial-match (Injectable service) |
| `apps/api/src/pipeline/seed.service.ts` | service | batch | `packages/database/prisma/seed.ts` | role-match |
| `packages/database/prisma/seed-data/cefr-word-list.json` | config | — | `packages/database/prisma/seed-data/vocabulary.json` | role-match (JSON seed data) |
| `packages/shared/src/reading.dto.ts` | utility | — | `packages/shared/src/grammar.dto.ts` | exact |
| `packages/shared/src/index.ts` (modify) | utility | — | `packages/shared/src/index.ts` | exact (add barrel export) |
| `apps/api/src/app.module.ts` (modify) | module | config | `apps/api/src/app.module.ts` | exact (add ReadingModule) |
| `apps/web/src/app/(dashboard)/reading/page.tsx` | component | request-response | `apps/web/src/app/(dashboard)/grammar/page.tsx` | exact (browse/grid page) |
| `apps/web/src/app/(dashboard)/reading/[passageId]/page.tsx` | component | request-response | `apps/web/src/app/(dashboard)/grammar/[area]/[topic]/[lesson]/page.tsx` | role-match |
| `apps/web/src/components/reading/passage-renderer.tsx` | component | event-driven | `apps/web/src/components/grammar/grammar-lesson-page.tsx` | partial-match ("use client" orchestrator) |
| `apps/web/src/components/reading/questions-section.tsx` | component | event-driven | `apps/web/src/components/grammar/grammar-lesson-page.tsx` | role-match |
| `apps/web/src/components/reading/passage-score-card.tsx` | component | — | `apps/web/src/components/grammar/grammar-session-results.tsx` | exact |
| `apps/web/src/components/reading/word-popover.tsx` | component | request-response | `apps/web/src/components/vocabulary/session-results.tsx` | partial-match (SRS enroll call) |
| `apps/web/src/components/reading/notes-panel.tsx` | component | event-driven | `apps/web/src/components/vocabulary/practice-session.tsx` | partial-match ("use client" with blur save) |
| `apps/web/src/components/reading/highlight-tooltip.tsx` | component | event-driven | no analog | none |

---

## Pattern Assignments

### `apps/api/src/reading/reading.module.ts` (module, config)

**Analog:** `apps/api/src/grammar/grammar.module.ts`

**Complete file pattern** (lines 1–19):
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

**Adapt for reading:** Replace `Grammar*` with `Reading*`. PrismaModule is global — do NOT import it.

---

### `apps/api/src/reading/reading.controller.ts` (controller, request-response)

**Analog:** `apps/api/src/grammar/grammar.controller.ts`

**Imports pattern** (lines 1–49):
```typescript
import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Body,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReadingService } from './reading.service';
import type { ... } from '@repo/shared';
import { ReadingSessionCompleteSchema, HighlightCreateSchema, NoteUpsertSchema } from '@repo/shared';

interface AuthenticatedRequest {
  user: {
    userId: string;
    role?: string;
    cefrLevel?: string;
    email?: string;
  };
}
```

**Route order rule** (lines 50–140) — fixed-string routes BEFORE parameterized:
```typescript
@Controller('reading')
export class ReadingController {
  constructor(private readonly readingService: ReadingService) {}

  // FIXED-STRING ROUTES FIRST (prevents NestJS from matching "passages" as :id)

  @UseGuards(JwtAuthGuard)
  @Get('passages')
  async getPassages(
    @Query() query: PassageBrowseQueryDto,
    @Request() req: AuthenticatedRequest,
  ) { ... }

  @UseGuards(JwtAuthGuard)
  @Post('sessions/complete')
  async completeSession(
    @Request() req: AuthenticatedRequest,
    @Body() body: unknown,
  ) {
    const dto = ReadingSessionCompleteSchema.parse(body);
    return this.readingService.completeSession(req.user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('highlights')
  async createHighlight(@Request() req: AuthenticatedRequest, @Body() body: unknown) { ... }

  @UseGuards(JwtAuthGuard)
  @Delete('highlights/:id')
  async deleteHighlight(@Param('id') id: string, @Request() req: AuthenticatedRequest) { ... }

  @UseGuards(JwtAuthGuard)
  @Post('notes')
  async upsertNote(@Request() req: AuthenticatedRequest, @Body() body: unknown) { ... }

  @UseGuards(JwtAuthGuard)
  @Post('bookmarks')
  async toggleBookmark(@Request() req: AuthenticatedRequest, @Body() body: unknown) { ... }

  // PARAMETERIZED ROUTES LAST
  @UseGuards(JwtAuthGuard)
  @Get('passages/:id')
  async getPassageDetail(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) { ... }
}
```

**Security rule** (from grammar.controller.ts lines 8–18):
```
- @UseGuards(JwtAuthGuard) applied to every endpoint
- userId always sourced from req.user.userId (JWT payload), never request body
```

---

### `apps/api/src/reading/reading.service.ts` (service, CRUD)

**Analog:** `apps/api/src/grammar/grammar.service.ts`

**Imports + constructor pattern** (lines 15–31):
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { ... } from '@repo/shared';

@Injectable()
export class ReadingService {
  constructor(private readonly prisma: PrismaService) {}
```

**Browse query pattern** (adapt from grammar.service.ts lines 37–51 — findMany with filter):
```typescript
async getPassages(userId: string, query: PassageBrowseQueryDto) {
  const { cefrLevel, topic, contentType, page = 1, limit = 20 } = query;
  const [passages, total] = await Promise.all([
    this.prisma.readingPassage.findMany({
      where: {
        isPublished: true,
        ...(cefrLevel ? { cefrLevel } : {}),
        ...(topic ? { topic } : {}),
        ...(contentType ? { contentType } : {}),
      },
      include: {
        _count: { select: { questions: true } },
        bookmarks: { where: { userId }, select: { id: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    this.prisma.readingPassage.count({ where: { isPublished: true, ... } }),
  ]);
  return { passages, total, page, limit, totalPages: Math.ceil(total / limit) };
}
```

**Session complete / upsert pattern** (grammar.service.ts lines 199–263 — exact template for ReadingProgress):
```typescript
// Grammar upsert pattern — copy for ReadingProgress
await this.prisma.grammarProgress.upsert({
  where: { userId_topicId: { userId, topicId } },
  create: {
    userId,
    topicId,
    attempts: newAttempts,
    correct: newCorrect,
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
// For ReadingProgress: where: { userId_passageId: { userId, passageId } }
// Fields: score, accuracy, readingTimeSec, completedAt, lastViewedAt
```

**NotFoundException pattern** (grammar.service.ts lines 68–70):
```typescript
if (!passage) {
  throw new NotFoundException(`Passage ${id} not found`);
}
```

**Security rule** (all annotation queries — where: { userId, passageId }):
```typescript
// CRITICAL: Always filter annotations by userId — IDOR prevention
await this.prisma.highlight.findMany({
  where: { userId, passageId },   // never omit userId filter
});
```

---

### `apps/api/src/reading/reading.service.spec.ts` (test)

**Analog:** `apps/api/src/grammar/grammar.service.spec.ts`

**Full test structure pattern** (lines 1–46):
```typescript
/**
 * ReadingService unit tests — Wave 0 RED scaffolds
 * Tests use direct instantiation with a mocked PrismaService (no NestJS DI).
 * Pattern mirrors apps/api/src/grammar/grammar.service.spec.ts.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { ReadingService } from './reading.service';
import type { PrismaService } from '../prisma/prisma.service';

const mockPassageFindMany = vi.fn();
const mockPassageFindUnique = vi.fn();
const mockProgressUpsert = vi.fn();
const mockProgressFindUnique = vi.fn();
const mockHighlightCreate = vi.fn();
const mockHighlightFindMany = vi.fn();
const mockHighlightDelete = vi.fn();
const mockNoteUpsert = vi.fn();
const mockBookmarkUpsert = vi.fn();
const mockBookmarkDelete = vi.fn();

const mockPrisma = {
  readingPassage: { findMany: mockPassageFindMany, findUnique: mockPassageFindUnique },
  readingProgress: { upsert: mockProgressUpsert, findUnique: mockProgressFindUnique },
  highlight: { create: mockHighlightCreate, findMany: mockHighlightFindMany, delete: mockHighlightDelete },
  note: { upsert: mockNoteUpsert },
  bookmark: { upsert: mockBookmarkUpsert, delete: mockBookmarkDelete },
} as unknown as PrismaService;

describe('ReadingService', () => {
  let service: ReadingService;
  beforeEach(() => {
    vi.clearAllMocks();
    service = new ReadingService(mockPrisma);
  });
  // ...RED test cases for READ-01 through READ-07
});
```

**Test case pattern** (grammar.service.spec.ts lines 96–165 — describe block with it, beforeEach, mock setup):
```typescript
describe('completeSession()', () => {
  it('calls readingProgress.upsert with correct userId and passageId', async () => {
    mockProgressUpsert.mockResolvedValue({ id: 'prog-001' });
    // ...
    expect(mockProgressUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_passageId: { userId: 'user-001', passageId: 'passage-001' } },
      }),
    );
  });
});
```

---

### `apps/api/src/vocabulary/vocabulary.controller.ts` (modify — add lookup route)

**Analog:** `apps/api/src/vocabulary/vocabulary.controller.ts`

**Critical insertion point** (lines 63–70 — add BEFORE `:category/words` using same fixed-route pattern as `my-words`):
```typescript
// ADD THIS BEFORE @Get(':category/words') — same pattern as my-words
/**
 * VOCAB-08 — GET /api/vocabulary/lookup?word=
 * Returns a single VocabularyWord or null for graceful no-match (D-13).
 * Returns null (not 404) so the client can show "not found" gracefully.
 *
 * NOTE: Must appear before :category/words to avoid NestJS matching "lookup"
 * as a :category parameter. Mirrors the existing my-words fixed-route pattern.
 */
@UseGuards(JwtAuthGuard)
@Get('lookup')
async lookupWord(
  @Query('word') word: string,
): Promise<VocabularyWordDto | null> {
  return this.vocabularyService.lookupByWord(word.toLowerCase().trim());
}
```

**Existing route context** (vocabulary.controller.ts lines 62–90 — shows where to insert):
```typescript
// Line 63: @Get('my-words') — fixed route already exists above :category/words
// INSERT 'lookup' here, same position pattern
// Line 78: @Get(':category/words') — parameterized route MUST remain after lookup
```

---

### `apps/api/src/vocabulary/vocabulary.service.ts` (modify — add lookupByWord)

**Analog:** `apps/api/src/vocabulary/vocabulary.service.ts`

**Existing getWordDetail pattern** (lines 145–165 — adapt for word string lookup):
```typescript
// EXISTING: findUniqueOrThrow by id
async getWordDetail(wordId: string): Promise<VocabularyWordDto> {
  const word = await this.prisma.vocabularyWord.findUniqueOrThrow({ where: { id: wordId } });
  ...
}

// NEW: lookupByWord returns null on miss (D-13 — graceful no-match, not 404)
async lookupByWord(word: string): Promise<VocabularyWordDto | null> {
  const found = await this.prisma.vocabularyWord.findFirst({
    where: { word: { equals: word, mode: 'insensitive' } },
    select: WORD_SELECT,
  });
  return found as VocabularyWordDto | null;
}
```

**WORD_SELECT reuse** (vocabulary.service.ts lines 55–67 — already defined, reuse):
```typescript
const WORD_SELECT = {
  id: true,
  word: true,
  definition: true,
  partOfSpeech: true,
  examples: true,
  synonyms: true,
  pronunciationKey: true,
  audioStorageKey: true,
  cefrLevel: true,
  category: true,
  frequency: true,
} as const;
```

---

### `apps/api/src/pipeline/pipeline.module.ts` (module, config)

**Analog:** `apps/api/src/grammar/grammar.module.ts`

**Module pattern** (grammar.module.ts lines 1–19 — adapt without AuthModule since pipeline is CLI only):
```typescript
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CrawlerService } from './crawler.service';
import { ClassifierService } from './classifier.service';
import { SeedService } from './seed.service';

@Module({
  imports: [PrismaModule],      // Pipeline needs PrismaService for SeedService
  providers: [CrawlerService, ClassifierService, SeedService],
  exports: [CrawlerService, ClassifierService, SeedService],
})
export class PipelineModule {}
```

---

### `apps/api/src/pipeline/pipeline.cli.ts` (utility, batch — standalone CLI)

**Analog:** `apps/api/src/main.ts` (NestFactory pattern, partial match)

**NestFactory.createApplicationContext pattern** (main.ts lines 1–32 adapted for CLI — no HTTP server):
```typescript
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { PipelineModule } from './pipeline.module';
import { CrawlerService } from './crawler.service';
import { SeedService } from './seed.service';

async function bootstrap() {
  // createApplicationContext instead of create — no HTTP server, full DI container
  const app = await NestFactory.createApplicationContext(PipelineModule);

  const flag = process.argv[2]; // --validate | --crawl | --seed | --run
  const crawler = app.get(CrawlerService);
  const seeder = app.get(SeedService);

  if (flag === '--validate') await crawler.validateSelectors();
  else if (flag === '--crawl') await crawler.crawlAll();
  else if (flag === '--seed') await seeder.seedFromFile('./crawled-passages.json');
  else if (flag === '--run') {
    await crawler.crawlAll();
    await seeder.seedFromFile('./crawled-passages.json');
  } else {
    console.error('Usage: pipeline.cli.ts --validate | --crawl | --seed | --run');
    process.exit(1);
  }

  await app.close();
}

bootstrap().catch((err: unknown) => {
  console.error('Pipeline error:', err);
  process.exit(1);
});
```

**pnpm script pattern** (reference `packages/database/package.json` db:seed for ts-node pattern):
```json
// db:seed uses: TS_NODE_PROJECT=tsconfig.seed.json node --env-file=../../.env -r ts-node/register prisma/seed.ts
// Pipeline scripts follow the same ts-node/register pattern in apps/api/package.json:
"pipeline:validate": "TS_NODE_PROJECT=tsconfig.json node -r ts-node/register src/pipeline/pipeline.cli.ts -- --validate",
"pipeline:crawl":   "TS_NODE_PROJECT=tsconfig.json node -r ts-node/register src/pipeline/pipeline.cli.ts -- --crawl",
"pipeline:seed":    "TS_NODE_PROJECT=tsconfig.json node -r ts-node/register src/pipeline/pipeline.cli.ts -- --seed",
"pipeline:run":     "TS_NODE_PROJECT=tsconfig.json node -r ts-node/register src/pipeline/pipeline.cli.ts -- --run"
```

---

### `apps/api/src/pipeline/seed.service.ts` (service, batch)

**Analog:** `packages/database/prisma/seed.ts`

**createMany in 500-record batches** (seed.ts lines 69–92 — adapt for 500-batch loop):
```typescript
// EXISTING: grammar seed uses createMany with skipDuplicates
await prisma.grammarQuestion.createMany({
  data: lesson.questions.map(...),
  skipDuplicates: true,
});

// NEW: batch loop for 2,000+ passages (PIPE-06)
async function seedInBatches<T>(
  items: T[],
  batchFn: (batch: T[]) => Promise<{ count: number }>,
  label: string,
): Promise<number> {
  const BATCH_SIZE = 500;
  let total = 0;
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    const result = await batchFn(batch);
    total += result.count;
    console.log(`[${label}] batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(items.length / BATCH_SIZE)} — ${result.count} inserted`);
  }
  return total;
}

// Usage:
await seedInBatches(passages, (batch) =>
  this.prisma.readingPassage.createMany({ data: batch, skipDuplicates: true }),
  'ReadingPassage',
);
```

**Quality gate pattern** (PIPE-02 — contentHash dedup, wordCount ≥ 150):
```typescript
// Filter before seeding
const qualified = rawPassages.filter(p =>
  p.wordCount >= 150 &&
  p.content.trim().length > 0
);
// skipDuplicates: true handles sourceUrl + contentHash dedup at DB level
```

---

### `packages/shared/src/reading.dto.ts` (utility — DTOs)

**Analog:** `packages/shared/src/grammar.dto.ts`

**DTO file structure pattern** (grammar.dto.ts lines 1–110 — same Zod + TypeScript type export pattern):
```typescript
// reading.dto.ts — Shared reading DTOs
import { z } from "zod";

// ─── Reading Passage (browse card) ───────────────────────────────────────────
export const ReadingPassageDtoSchema = z.object({
  id: z.string(),
  title: z.string(),
  contentType: z.enum(["ARTICLE", "NEWS", "BLOG_POST", "ACADEMIC", "STORY", "OPINION"]),
  cefrLevel: z.enum(["B1", "B2", "C1"]),
  cefrConfidence: z.number(),
  topic: z.string().nullable(),
  wordCount: z.number(),
  questionCount: z.number(),
  isBookmarked: z.boolean(),
});

// ─── Reading Question ─────────────────────────────────────────────────────────
export const ReadingQuestionDtoSchema = z.object({
  id: z.string(),
  questionType: z.string(),
  prompt: z.string(),
  answer: z.string(),
  distractors: z.array(z.string()),
  explanation: z.string().nullable(),
  xpReward: z.number(),
  sortOrder: z.number(),
});

// ─── Session Complete (client → server) ──────────────────────────────────────
export const ReadingSessionCompleteSchema = z.object({
  passageId: z.string(),
  score: z.number(),
  accuracy: z.number(),
  readingTimeSec: z.number(),
  attempts: z.array(z.object({
    questionId: z.string(),
    isCorrect: z.boolean(),
    userAnswer: z.string().optional(),
  })),
});

// ─── Highlight ────────────────────────────────────────────────────────────────
export const HighlightCreateSchema = z.object({
  passageId: z.string(),
  startOffset: z.number(),
  endOffset: z.number(),
  text: z.string(),
});

// ─── Note ─────────────────────────────────────────────────────────────────────
export const NoteUpsertSchema = z.object({
  passageId: z.string(),
  content: z.string(),
});

// ─── Bookmark ─────────────────────────────────────────────────────────────────
export const BookmarkToggleSchema = z.object({
  passageId: z.string(),
});

// ─── Inferred types ───────────────────────────────────────────────────────────
export type ReadingPassageDto = z.infer<typeof ReadingPassageDtoSchema>;
export type ReadingQuestionDto = z.infer<typeof ReadingQuestionDtoSchema>;
export type ReadingSessionCompleteDto = z.infer<typeof ReadingSessionCompleteSchema>;
export type HighlightCreateDto = z.infer<typeof HighlightCreateSchema>;
export type NoteUpsertDto = z.infer<typeof NoteUpsertSchema>;
export type BookmarkToggleDto = z.infer<typeof BookmarkToggleSchema>;
```

**Barrel export addition** (packages/shared/src/index.ts line 22 — add after grammar.dto):
```typescript
// Phase 5: Reading DTOs
export * from "./reading.dto";
```

---

### `apps/api/src/app.module.ts` (modify — add ReadingModule)

**Analog:** `apps/api/src/app.module.ts`

**AppModule import pattern** (lines 1–30 — add ReadingModule same as GrammarModule):
```typescript
import { ReadingModule } from './reading/reading.module';

@Module({
  imports: [
    ConfigModule.forRoot({ ... }),
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    ProfileModule,
    VocabularyModule,
    SrsModule,
    GrammarModule,
    ReadingModule,   // ADD HERE — same pattern as GrammarModule
  ],
})
export class AppModule {}
```

---

### `apps/web/src/app/(dashboard)/reading/page.tsx` (component, request-response — browse page)

**Analog:** `apps/web/src/app/(dashboard)/grammar/page.tsx`

**Server Component browse page pattern** (grammar/page.tsx lines 1–70 — full template):
```typescript
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { fetchWithAuth, INTERNAL_API_URL } from "@/lib/api-client";
import type { ReadingPassageDto } from "@repo/shared";

async function fetchPassages(
  cookieHeader: string,
  params: { cefrLevel?: string; topic?: string; contentType?: string; page?: string },
) {
  try {
    const url = new URL(`${INTERNAL_API_URL}/api/reading/passages`);
    if (params.cefrLevel) url.searchParams.set('cefrLevel', params.cefrLevel);
    if (params.topic) url.searchParams.set('topic', params.topic);
    if (params.contentType) url.searchParams.set('contentType', params.contentType);
    if (params.page) url.searchParams.set('page', params.page);
    const res = await fetchWithAuth(cookieHeader, url.toString());
    if (!res.ok) return { passages: [], total: 0 };
    return res.json();
  } catch {
    return { passages: [], total: 0 };
  }
}

interface Props {
  searchParams: Promise<{ level?: string; topic?: string; type?: string; page?: string }>;
}

export default async function ReadingPage({ searchParams }: Props) {
  const session = await auth();
  if (!session) redirect("/login");

  const reqHeaders = await headers();
  const cookieHeader = reqHeaders.get("cookie") ?? "";
  // ... fetch + render grid of passage cards
}
```

**Empty state pattern** (grammar/page.tsx lines 61–67):
```typescript
{passages.length > 0 ? (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {passages.map(p => <PassageCard key={p.id} {...p} />)}
  </div>
) : (
  <div role="status" className="py-16 text-center">
    <p className="text-base text-muted-foreground">No passages available.</p>
  </div>
)}
```

---

### `apps/web/src/app/(dashboard)/reading/[passageId]/page.tsx` (component, request-response — detail page)

**Analog:** `apps/web/src/app/(dashboard)/grammar/[area]/[topic]/page.tsx`

**Server Component detail page pattern** (grammar/[area]/[topic]/page.tsx lines 27–73):
```typescript
async function fetchPassageDetail(
  cookieHeader: string,
  passageId: string,
): Promise<ReadingPassageDetailDto | null> {
  try {
    const res = await fetchWithAuth(
      cookieHeader,
      `${INTERNAL_API_URL}/api/reading/passages/${passageId}`,
    );
    if (!res.ok) return null;
    return res.json() as Promise<ReadingPassageDetailDto>;
  } catch {
    return null;
  }
}

interface Props {
  params: Promise<{ passageId: string }>;
}

export default async function ReadingPassagePage({ params }: Props) {
  const session = await auth();
  if (!session) redirect("/login");

  const { passageId } = await params;
  const reqHeaders = await headers();
  const cookieHeader = reqHeaders.get("cookie") ?? "";
  const data = await fetchPassageDetail(cookieHeader, passageId);

  if (!data) {
    return (
      <div className="mx-auto max-w-3xl">
        <p role="status" className="py-16 text-center text-base text-muted-foreground">
          Could not load this passage. Try refreshing the page.
        </p>
      </div>
    );
  }

  // Pass sanitized HTML + questions + annotations to client component
  return (
    <div className="mx-auto max-w-3xl">
      <PassageRenderer
        passage={data}
        highlights={data.highlights}
        note={data.note}
      />
      <QuestionsSection questions={data.questions} passageId={passageId} />
    </div>
  );
}
```

---

### `apps/web/src/components/reading/passage-renderer.tsx` (component, event-driven)

**Analog:** `apps/web/src/components/grammar/grammar-lesson-page.tsx`

**"use client" orchestrator pattern** (grammar-lesson-page.tsx lines 1–30):
```typescript
"use client";
import React, { useState, useRef, useEffect } from "react";
```

**Timer pattern** (adapt from grammar-lesson-page.tsx — start on mount, stop on last question answered):
```typescript
// Reading timer (D-03) — starts on mount, value sent in completeSession payload
const startTime = useRef<number>(Date.now());
const [elapsedSec, setElapsedSec] = useState(0);
const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

useEffect(() => {
  timerRef.current = setInterval(() => {
    setElapsedSec(Math.floor((Date.now() - startTime.current) / 1000));
  }, 1000);
  return () => { if (timerRef.current) clearInterval(timerRef.current); };
}, []);

const stopTimer = () => {
  if (timerRef.current) clearInterval(timerRef.current);
};
```

**State management pattern** (grammar-lesson-page.tsx lines 134–143):
```typescript
const [phase, setPhase] = useState<'reading' | 'complete'>('reading');
const [highlightMode, setHighlightMode] = useState(false);
// All interactive state in React state; no API calls mid-session
```

---

### `apps/web/src/components/reading/questions-section.tsx` (component, event-driven)

**Analog:** `apps/web/src/components/grammar/grammar-lesson-page.tsx`

**Per-question state + inline feedback pattern** (D-02 — immediate feedback after each answer):
```typescript
"use client";
// Inline questions — no carousel; all scroll below passage (D-01)
// Per-question state: answered, selectedAnswer, isCorrect

interface QuestionState {
  answered: boolean;
  selectedAnswer: string | null;
  isCorrect: boolean;
}

// Grammar lesson uses single currentIndex; reading uses per-question state (all visible)
const [questionStates, setQuestionStates] = useState<Record<string, QuestionState>>({});

const handleAnswer = (questionId: string, answer: string, correctAnswer: string) => {
  const isCorrect = answer === correctAnswer;
  setQuestionStates(prev => ({
    ...prev,
    [questionId]: { answered: true, selectedAnswer: answer, isCorrect },
  }));
  // Check if all questions answered → stop timer → show score card
};
```

**Session submit pattern** (grammar-lesson-page.tsx lines 177–198 — fetch POST + error handling):
```typescript
const submitSession = async (finalAttempts: Attempt[]) => {
  setSubmitting(true);
  const readingTimeSec = Math.floor((Date.now() - startTime.current) / 1000);
  try {
    const res = await fetch("/api/reading/sessions/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        passageId,
        score: correctCount,
        accuracy: (correctCount / totalCount) * 100,
        readingTimeSec,
        attempts: finalAttempts,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setSessionResult(data);
    }
  } catch {
    // Non-blocking — still show results even if submission fails
  } finally {
    setSubmitting(false);
    setPhase("complete");
  }
};
```

---

### `apps/web/src/components/reading/passage-score-card.tsx` (component — score display)

**Analog:** `apps/web/src/components/grammar/grammar-session-results.tsx`

**framer-motion entrance + score display pattern** (grammar-session-results.tsx lines 36–96):
```typescript
"use client";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export function PassageScoreCard({ score, total, readingTimeSec, masteryPct, onRestart }) {
  const percentage = total > 0 ? Math.round((score / total) * 100) : 0;

  return (
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
        <p className="mt-1 text-sm text-muted-foreground">
          {percentage}% · {readingTimeSec}s reading time
        </p>
      </div>
      {/* D-04: stays on page — no redirect; show inline below last question */}
    </motion.div>
  );
}
```

---

### `apps/web/src/components/reading/word-popover.tsx` (component — VOCAB-08)

**Analog:** `apps/web/src/components/vocabulary/session-results.tsx` (SRS enroll call pattern)

**SRS enroll call pattern** (session-results.tsx lines 86–110):
```typescript
"use client";
// VOCAB-08 word tap popover
// On mount (word click): GET /api/vocabulary/lookup?word={word}
// On "Add to SRS": POST /api/srs/enroll { wordId, contextSentence }

const handleEnroll = async (wordId: string, contextSentence: string) => {
  const res = await fetch("/api/srs/enroll-proxy", {   // via Next.js relay
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ wordId, contextSentence }),
  });
  // Disable button if word not found (Pitfall 5 — EnrollWordSchema requires wordId)
};

// Sentence extraction (D-15):
function extractSentence(text: string, wordIndex: number): string {
  // Split on [.!?] followed by space or end; find sentence containing wordIndex
  const sentences = text.split(/[.!?](?:\s|$)/);
  // Return sentence containing the tapped word
}
```

**Graceful no-match pattern** (D-13 — show fallback message, disable Add to SRS):
```typescript
// Lookup result drives button state
const [lookupResult, setLookupResult] = useState<VocabularyWordDto | null | 'loading'>('loading');

// If lookupResult is null:
// Show: "[word] — definition not yet in our vocabulary library"
// "Add to SRS" button: disabled (wordId required, no wordId available for unknown words)
```

---

### `apps/web/src/components/reading/notes-panel.tsx` (component, event-driven)

**Analog:** `apps/web/src/components/vocabulary/practice-session.tsx` (client state management pattern)

**Auto-save on blur pattern** (D-08):
```typescript
"use client";
import { useState, useCallback, useRef } from "react";

// One note per user+passage — auto-saves on blur (D-08)
const [content, setContent] = useState(initialContent ?? "");
const [saving, setSaving] = useState(false);
const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

const handleBlur = useCallback(async () => {
  if (saving) return;
  setSaving(true);
  try {
    await fetch("/api/reading/notes-proxy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passageId, content }),
    });
  } catch {
    // Non-blocking — note already in local state
  } finally {
    setSaving(false);
  }
}, [passageId, content, saving]);
```

**Sheet/sidebar pattern** (shadcn Sheet — right sidebar desktop, bottom sheet mobile per D-08):
```typescript
// Use Radix Sheet (shadcn) — not yet installed; add via: npx shadcn add sheet
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
```

---

## Shared Patterns

### Authentication Guard
**Source:** `apps/api/src/auth/jwt-auth.guard.ts`
**Apply to:** All ReadingController endpoints, updated VocabularyController lookup route
```typescript
// jwt-auth.guard.ts — implements CanActivate directly (NOT extending AuthGuard('jwt'))
// Auth.js v5 issues JWE tokens; use @auth/core/jwt decode instead of passport-jwt
@UseGuards(JwtAuthGuard)   // Apply to every endpoint in ReadingController
```

### userId from JWT Only
**Source:** `apps/api/src/grammar/grammar.controller.ts` lines 8–18
**Apply to:** All ReadingController, VocabularyController (lookup)
```typescript
// CRITICAL: userId always from req.user.userId (JWT payload), never request body
// Security: T-04-03, T-04-04
@Request() req: AuthenticatedRequest,
// userId = req.user.userId   ← always this
// userId = req.body.userId   ← NEVER this
```

### Zod Parse on All POST Bodies
**Source:** `apps/api/src/grammar/grammar.controller.ts` lines 74–80
**Apply to:** All POST endpoints in ReadingController
```typescript
// Validate with Zod schema before calling service
const dto = GrammarSessionCompleteSchema.parse(body);
// For reading: ReadingSessionCompleteSchema.parse(body), HighlightCreateSchema.parse(body), etc.
```

### fetchWithAuth — Server Component API Calls
**Source:** `apps/web/src/lib/api-client.ts` lines 69–93
**Apply to:** All reading Server Components (reading/page.tsx, reading/[passageId]/page.tsx)
```typescript
import { fetchWithAuth, INTERNAL_API_URL } from "@/lib/api-client";

// Server-to-NestJS call (Docker network URL, JWE Bearer token)
const res = await fetchWithAuth(cookieHeader, `${INTERNAL_API_URL}/api/reading/passages`);
if (!res.ok) return { passages: [], total: 0 };
```

### Auth Check + Redirect Pattern
**Source:** `apps/web/src/app/(dashboard)/grammar/page.tsx` lines 33–39
**Apply to:** All reading page.tsx Server Components
```typescript
const session = await auth();
if (!session) redirect("/login");

const reqHeaders = await headers();
const cookieHeader = reqHeaders.get("cookie") ?? "";
```

### createMany with skipDuplicates
**Source:** `packages/database/prisma/seed.ts` lines 103–119
**Apply to:** `apps/api/src/pipeline/seed.service.ts`
```typescript
await prisma.vocabularyWord.createMany({
  data: vocabularyData.map(word => ({ ... })),
  skipDuplicates: true,
});
// For reading passages: prisma.readingPassage.createMany({ data: batch, skipDuplicates: true })
```

### CefrBadge Reuse
**Source:** `apps/web/src/components/cefr-badge.tsx`
**Apply to:** Passage browse cards, passage detail header
```typescript
import { CefrBadge } from "@/components/cefr-badge";
<CefrBadge level={passage.cefrLevel} />  // works with "B1" | "B2" | "C1"
```

### NotFoundException (Service layer)
**Source:** `apps/api/src/grammar/grammar.service.ts` lines 68–70
**Apply to:** ReadingService.getPassageDetail(), ReadingService.deleteHighlight()
```typescript
if (!passage) {
  throw new NotFoundException(`Passage ${id} not found`);
}
```

### Non-Blocking Session Submit
**Source:** `apps/web/src/components/grammar/grammar-lesson-page.tsx` lines 177–198
**Apply to:** `reading/questions-section.tsx` submitSession()
```typescript
try {
  await fetch("/api/reading/sessions/complete", { ... });
} catch {
  // Non-blocking — still show results even if submission fails
} finally {
  setSubmitting(false);
  setPhase("complete");
}
```

---

## No Analog Found

Files with no close match in the codebase (planner should use RESEARCH.md patterns instead):

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `apps/web/src/components/reading/highlight-tooltip.tsx` | component | event-driven | No existing selection-to-save highlight pattern in codebase. Use Research.md Pattern 2 (dom-anchor-text-position fromRange) + window.getSelection() browser API |
| `packages/database/prisma/seed-data/cefr-word-list.json` | config | — | No existing CEFR word list; requires running one-time CSV conversion script from Words-CEFR-Dataset (Research.md Pitfall 3 — must be Wave 0 task) |

---

## Critical Warnings for Planner

1. **Route order in VocabularyController:** New `GET lookup` endpoint MUST be declared before `GET :category/words` (line 78). Mirror the existing `my-words` fixed-route at line 63. Failure causes NestJS to match "lookup" as a `:category` parameter.

2. **`@hypothesis/anchoring` does NOT exist on npm.** Any plan task installing it will fail with 404. Use `dom-anchor-text-position@5.0.0` instead.

3. **`dom-anchor-text-position` is browser-only.** Never import in Server Components or `pipeline.cli.ts`. Use only inside `"use client"` components within `useEffect` or event handlers.

4. **Words-CEFR-Dataset has no JSON export.** Wave 0 must include a task to run CSV-to-JSON conversion script before the classifier can run. Output: `packages/database/prisma/seed-data/cefr-word-list.json`.

5. **ReadingProgress uses upsert, not create.** `@@unique([userId, passageId])` in schema — second session completion with `create()` throws unique constraint violation. Use `prisma.readingProgress.upsert({ where: { userId_passageId: { userId, passageId } }, ... })`.

6. **EnrollWordSchema requires wordId (non-optional).** If vocabulary lookup returns null, disable the "Add to SRS" button in word-popover.tsx. Do not call POST /api/srs/enroll without a wordId.

7. **Crawler selectors are a Wave 0 blocker.** STATE.md flags VOA/BBC selector specificity. Wave 0 must include a manual selector inspection task before the bulk crawl runs. The `pnpm pipeline:validate` (`--validate` flag) must report ≥80% extraction success per source before proceeding.

8. **isomorphic-dompurify must be "use client" only.** jsdom ESM conflict occurs if imported in a Server Component. PassageRenderer must have `"use client"` at the top.

---

## Metadata

**Analog search scope:** `apps/api/src/`, `apps/web/src/`, `packages/database/prisma/`, `packages/shared/src/`
**Files scanned:** 24
**Pattern extraction date:** 2026-06-14
