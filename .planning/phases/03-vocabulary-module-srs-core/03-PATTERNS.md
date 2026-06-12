# Phase 3: Vocabulary Module + SRS Core - Pattern Map

**Mapped:** 2026-06-12
**Files analyzed:** 28 new/modified files
**Analogs found:** 27 / 28

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `apps/api/src/vocabulary/vocabulary.module.ts` | module | — | `apps/api/src/users/users.module.ts` | exact |
| `apps/api/src/vocabulary/vocabulary.controller.ts` | controller | request-response | `apps/api/src/users/users.controller.ts` | exact |
| `apps/api/src/vocabulary/vocabulary.service.ts` | service | CRUD | `apps/api/src/users/users.service.ts` | exact |
| `apps/api/src/vocabulary/vocabulary.service.spec.ts` | test | — | `apps/api/src/users/users.service.spec.ts` | exact |
| `apps/api/src/srs/srs.module.ts` | module | — | `apps/api/src/profile/profile.module.ts` | exact |
| `apps/api/src/srs/srs.controller.ts` | controller | request-response | `apps/api/src/users/users.controller.ts` | exact |
| `apps/api/src/srs/srs.service.ts` | service | CRUD | `apps/api/src/users/users.service.ts` | role-match |
| `apps/api/src/srs/srs.service.spec.ts` | test | — | `apps/api/src/users/users.service.spec.ts` | exact |
| `apps/api/src/app.module.ts` | module (modify) | — | `apps/api/src/app.module.ts` | exact |
| `packages/shared/src/vocabulary.dto.ts` | utility | transform | `packages/shared/src/user.dto.ts` | exact |
| `packages/shared/src/index.ts` | utility (modify) | — | `packages/shared/src/index.ts` | exact |
| `packages/database/prisma/seed.ts` | utility | batch | none | no-analog |
| `packages/database/prisma/seed-data/vocabulary.json` | config | — | none | data-only |
| `packages/database/package.json` | config (modify) | — | `packages/database/package.json` | exact |
| `apps/web/src/app/(dashboard)/vocabulary/page.tsx` | component | request-response | `apps/web/src/app/(dashboard)/dashboard/page.tsx` | role-match |
| `apps/web/src/app/(dashboard)/vocabulary/[category]/page.tsx` | component | request-response | `apps/web/src/app/(dashboard)/profile/page.tsx` | role-match |
| `apps/web/src/app/(dashboard)/vocabulary/[category]/[wordId]/page.tsx` | component | request-response | `apps/web/src/app/(dashboard)/profile/page.tsx` | role-match |
| `apps/web/src/app/(dashboard)/vocabulary/[category]/practice/page.tsx` | component | event-driven | `apps/web/src/app/(dashboard)/profile/profile-form.tsx` | partial |
| `apps/web/src/app/(dashboard)/review/page.tsx` | component | event-driven | `apps/web/src/app/(dashboard)/profile/profile-form.tsx` | partial |
| `apps/web/src/app/(dashboard)/vocabulary/my-words/page.tsx` | component | request-response | `apps/web/src/app/(dashboard)/profile/page.tsx` | role-match |
| `apps/web/src/app/api/vocabulary/categories/route.ts` | route | request-response | `apps/web/src/app/api/profile/me/route.ts` | exact |
| `apps/web/src/app/api/vocabulary/[category]/words/route.ts` | route | request-response | `apps/web/src/app/api/profile/me/route.ts` | exact |
| `apps/web/src/app/api/vocabulary/[category]/[wordId]/route.ts` | route | request-response | `apps/web/src/app/api/profile/me/route.ts` | exact |
| `apps/web/src/app/api/vocabulary/enroll/route.ts` | route | request-response | `apps/web/src/app/api/profile/update/route.ts` | exact |
| `apps/web/src/app/api/vocabulary/session/complete/route.ts` | route | request-response | `apps/web/src/app/api/profile/update/route.ts` | exact |
| `apps/web/src/app/api/vocabulary/my-words/route.ts` | route | request-response | `apps/web/src/app/api/profile/me/route.ts` | exact |
| `apps/web/src/app/api/srs/queue/route.ts` | route | request-response | `apps/web/src/app/api/profile/me/route.ts` | exact |
| `apps/web/src/app/api/srs/review/route.ts` | route | request-response | `apps/web/src/app/api/profile/update/route.ts` | exact |
| `apps/web/src/components/vocabulary/category-card.tsx` | component | — | `apps/web/src/components/cefr-badge.tsx` | role-match |
| `apps/web/src/components/vocabulary/word-list-item.tsx` | component | — | `apps/web/src/components/cefr-badge.tsx` | role-match |
| `apps/web/src/components/vocabulary/word-detail.tsx` | component | event-driven | `apps/web/src/app/(dashboard)/profile/profile-form.tsx` | role-match |
| `apps/web/src/components/vocabulary/exercises/flashcard-exercise.tsx` | component | event-driven | `apps/web/src/app/(dashboard)/profile/profile-form.tsx` | partial |
| `apps/web/src/components/vocabulary/exercises/matching-exercise.tsx` | component | event-driven | `apps/web/src/app/(dashboard)/profile/profile-form.tsx` | partial |
| `apps/web/src/components/vocabulary/exercises/cloze-exercise.tsx` | component | event-driven | `apps/web/src/app/(dashboard)/profile/profile-form.tsx` | partial |
| `apps/web/src/components/vocabulary/exercises/context-selection-exercise.tsx` | component | event-driven | `apps/web/src/app/(dashboard)/profile/profile-form.tsx` | partial |
| `apps/web/src/components/vocabulary/exercises/synonym-exercise.tsx` | component | event-driven | `apps/web/src/app/(dashboard)/profile/profile-form.tsx` | partial |
| `apps/web/src/components/vocabulary/exercises/recall-exercise.tsx` | component | event-driven | `apps/web/src/app/(dashboard)/profile/profile-form.tsx` | partial |
| `apps/web/src/components/srs/review-card.tsx` | component | event-driven | `apps/web/src/app/(dashboard)/profile/profile-form.tsx` | partial |
| `apps/web/src/components/srs/rating-buttons.tsx` | component | event-driven | `apps/web/src/components/ui/button.tsx` | role-match |
| `apps/web/src/components/query-provider.tsx` | provider | — | none | no-analog |
| `apps/web/src/app/(dashboard)/layout.tsx` | layout (modify) | — | `apps/web/src/app/(dashboard)/layout.tsx` | exact |
| `apps/web/src/middleware.ts` | middleware (modify) | — | `apps/web/src/middleware.ts` | exact |

---

## Pattern Assignments

### `apps/api/src/vocabulary/vocabulary.module.ts` (module)

**Analog:** `apps/api/src/users/users.module.ts`

**Module registration pattern** (lines 1-19):
```typescript
import { Module } from '@nestjs/common';
import { VocabularyController } from './vocabulary.controller';
import { VocabularyService } from './vocabulary.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],      // exposes JwtAuthGuard
  controllers: [VocabularyController],
  providers: [VocabularyService],
  exports: [VocabularyService],
})
export class VocabularyModule {}
```

**Key point:** `AuthModule` must be in `imports` or `@UseGuards(JwtAuthGuard)` will fail with "Nest cannot find JwtAuthGuard" at runtime. PrismaModule is global (registered in AppModule) — do NOT import it here.

---

### `apps/api/src/srs/srs.module.ts` (module)

**Analog:** `apps/api/src/profile/profile.module.ts`

**Module pattern** (lines 1-19 of profile.module.ts):
```typescript
import { Module } from '@nestjs/common';
import { SrsController } from './srs.controller';
import { SrsService } from './srs.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [SrsController],
  providers: [SrsService],
})
export class SrsModule {}
```

---

### `apps/api/src/vocabulary/vocabulary.controller.ts` (controller, request-response)

**Analog:** `apps/api/src/users/users.controller.ts`

**Imports pattern** (lines 16-37 of users.controller.ts):
```typescript
import {
  Body,
  Controller,
  Get,
  Post,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { VocabularyService } from './vocabulary.service';
import type { VocabularyWordDto, PaginatedWordsDto, CategoryDto } from '@repo/shared';

interface AuthenticatedRequest {
  user: {
    userId: string;
    role?: string;
    cefrLevel?: string;
    email?: string;
  };
}
```

**Auth guard pattern** (lines 48-60 of users.controller.ts):
```typescript
@Controller('vocabulary')
export class VocabularyController {
  constructor(private readonly vocabularyService: VocabularyService) {}

  @UseGuards(JwtAuthGuard)
  @Get('categories')
  async getCategories(): Promise<CategoryDto[]> {
    return this.vocabularyService.getCategories();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':category/words')
  async getWords(
    @Param('category') category: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Request() req: AuthenticatedRequest,
  ): Promise<PaginatedWordsDto> {
    return this.vocabularyService.getWordsByCategory(category, +page, +limit);
  }
}
```

**Core pattern** — Zod validation in controller body (lines 67-75 of users.controller.ts):
```typescript
@UseGuards(JwtAuthGuard)
@Post('session/complete')
async completeSession(
  @Request() req: AuthenticatedRequest,
  @Body() body: unknown,
): Promise<SessionResultDto> {
  const dto = SessionCompleteSchema.parse(body) as SessionCompleteDto;
  return this.vocabularyService.completeSession(req.user.userId, dto);
}
```

**Security rule:** `userId` is always from `req.user.userId` (JWT payload), never from `body`. This is established in users.controller.ts lines 50 and 76.

---

### `apps/api/src/vocabulary/vocabulary.service.ts` (service, CRUD)

**Analog:** `apps/api/src/users/users.service.ts`

**Imports pattern** (lines 16-19 of users.service.ts):
```typescript
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@repo/database';
import { PrismaService } from '../prisma/prisma.service';
import type { VocabularyWordDto, PaginatedWordsDto } from '@repo/shared';
```

**Prisma injection** (lines 51-53 of users.service.ts):
```typescript
@Injectable()
export class VocabularyService {
  constructor(private readonly prisma: PrismaService) {}
```

**Select constant pattern** (lines 22-34 of users.service.ts):
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

**Prisma pagination pattern** (RESEARCH Pattern established via Prisma docs):
```typescript
async getWordsByCategory(
  category: string,
  page: number,
  limit: number,
): Promise<PaginatedWordsDto> {
  const skip = (page - 1) * limit;
  const [words, total] = await Promise.all([
    this.prisma.vocabularyWord.findMany({
      where: { category },
      select: WORD_SELECT,
      orderBy: { word: 'asc' },
      skip,
      take: limit,
    }),
    this.prisma.vocabularyWord.count({ where: { category } }),
  ]);
  return { words, total, page, limit, totalPages: Math.ceil(total / limit) };
}
```

**P2025 error handling pattern** (lines 99-113 of users.service.ts):
```typescript
try {
  return await this.prisma.vocabularyWord.findUniqueOrThrow({
    where: { id: wordId },
    select: WORD_SELECT,
  });
} catch (err) {
  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === 'P2025'
  ) {
    throw new NotFoundException(`Word ${wordId} not found`);
  }
  throw err;
}
```

---

### `apps/api/src/vocabulary/vocabulary.service.spec.ts` (test)

**Analog:** `apps/api/src/users/users.service.spec.ts`

**Test file structure** (lines 1-50 of users.service.spec.ts):
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { VocabularyService } from './vocabulary.service';
import type { PrismaService } from '../prisma/prisma.service';

// Mock PrismaService — direct instantiation, no NestJS DI
const mockFindMany = vi.fn();
const mockFindUnique = vi.fn();
const mockCount = vi.fn();

const mockPrisma = {
  vocabularyWord: {
    findMany: mockFindMany,
    findUnique: mockFindUnique,
    count: mockCount,
  },
  userVocabularyItem: { upsert: vi.fn() },
} as unknown as PrismaService;

describe('VocabularyService', () => {
  let service: VocabularyService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new VocabularyService(mockPrisma);
  });

  describe('getWordsByCategory()', () => {
    it('returns paginated words for a valid category', async () => {
      mockFindMany.mockResolvedValue([/* fixtures */]);
      mockCount.mockResolvedValue(25);
      const result = await service.getWordsByCategory('business', 1, 20);
      expect(result.total).toBe(25);
      expect(result.totalPages).toBe(2);
    });
  });
});
```

**Key rule:** Tests use direct instantiation (`new VocabularyService(mockPrisma)`) to avoid `emitDecoratorMetadata` issues with Vitest. This pattern is established in users.service.spec.ts line 48.

---

### `apps/api/src/srs/srs.controller.ts` (controller, request-response)

**Analog:** `apps/api/src/users/users.controller.ts`

**Core pattern** — all three SRS endpoints follow the `@UseGuards` + `@Request() req` pattern:
```typescript
@Controller('srs')
export class SrsController {
  constructor(private readonly srsService: SrsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('enroll')
  async enroll(
    @Request() req: AuthenticatedRequest,
    @Body() body: unknown,
  ): Promise<SrsCardDto> {
    const dto = EnrollWordSchema.parse(body) as EnrollWordDto;
    return this.srsService.enrollWord(req.user.userId, dto.wordId, dto.contextSentence);
  }

  @UseGuards(JwtAuthGuard)
  @Get('queue')
  async getQueue(@Request() req: AuthenticatedRequest): Promise<SrsCardWithWordDto[]> {
    return this.srsService.getDueQueue(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('review')
  async submitReview(
    @Request() req: AuthenticatedRequest,
    @Body() body: unknown,
  ): Promise<SrsCardDto> {
    const dto = ReviewSubmitSchema.parse(body) as ReviewSubmitDto;
    return this.srsService.submitReview(req.user.userId, dto.cardId, dto.rating);
  }
}
```

---

### `apps/api/src/srs/srs.service.ts` (service, CRUD)

**Analog:** `apps/api/src/users/users.service.ts` (structure only — SRS logic is unique)

**Imports pattern**:
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { createEmptyCard, fsrs, Rating, State, type Card } from 'ts-fsrs';
```

**Field mapping functions** (RESEARCH Pattern 3 — CRITICAL):
```typescript
// SrsCard DB row (camelCase) → ts-fsrs Card (snake_case + learning_steps)
function dbCardToFsrsCard(dbCard: {
  due: Date; stability: number; difficulty: number;
  elapsedDays: number; scheduledDays: number;
  reps: number; lapses: number; state: string; lastReview: Date | null;
}): Card {
  return {
    due: dbCard.due,
    stability: dbCard.stability,
    difficulty: dbCard.difficulty,
    elapsed_days: dbCard.elapsedDays,
    scheduled_days: dbCard.scheduledDays,
    learning_steps: 0,          // field absent from schema — default to 0
    reps: dbCard.reps,
    lapses: dbCard.lapses,
    state: State[dbCard.state as keyof typeof State],
    last_review: dbCard.lastReview ?? undefined,
  };
}

// ts-fsrs Card result → Prisma update payload (drop learning_steps)
function fsrsCardToDbUpdate(card: Card) {
  return {
    due: card.due,
    stability: card.stability,
    difficulty: card.difficulty,
    elapsedDays: card.elapsed_days,
    scheduledDays: card.scheduled_days,
    // learning_steps intentionally NOT persisted (field not in schema)
    reps: card.reps,
    lapses: card.lapses,
    state: State[card.state] as 'New' | 'Learning' | 'Review' | 'Relearning',
    lastReview: card.last_review ?? null,
  };
}
```

**Enroll pattern** (RESEARCH Code Examples):
```typescript
async enrollWord(userId: string, wordId: string, contextSentence?: string) {
  // Upsert UserVocabularyItem (idempotent — @@unique([userId, wordId]))
  const item = await this.prisma.userVocabularyItem.upsert({
    where: { userId_wordId: { userId, wordId } },
    create: { userId, wordId, contextSentence },
    update: {},  // don't overwrite existing contextSentence
  });

  const existing = await this.prisma.srsCard.findUnique({
    where: { userVocabItemId: item.id },
  });
  if (existing) return existing;  // already enrolled

  const empty = createEmptyCard();
  return this.prisma.srsCard.create({
    data: {
      userId,
      wordId,
      userVocabItemId: item.id,
      due: empty.due,
      stability: empty.stability,
      difficulty: empty.difficulty,
      elapsedDays: empty.elapsed_days,
      scheduledDays: empty.scheduled_days,
      reps: empty.reps,
      lapses: empty.lapses,
      state: 'New',
    },
  });
}
```

**Due queue pattern** (D-01, D-04):
```typescript
async getDueQueue(userId: string) {
  return this.prisma.srsCard.findMany({
    where: { userId, due: { lte: new Date() } },
    orderBy: { due: 'asc' },
    take: 20,
    include: { word: true },
  });
}
```

**Review submission pattern** (RESEARCH Code Examples):
```typescript
async submitReview(userId: string, cardId: string, rating: 'Again' | 'Hard' | 'Good' | 'Easy') {
  const dbCard = await this.prisma.srsCard.findFirst({
    where: { id: cardId, userId },  // always filter by userId (security)
  });
  if (!dbCard) throw new NotFoundException('Card not found');

  const f = fsrs();
  const now = new Date();
  const scheduling = f.repeat(dbCardToFsrsCard(dbCard), now);
  const ratingEnum = Rating[rating as keyof typeof Rating];
  const nextCard = scheduling[ratingEnum].card;

  return this.prisma.srsCard.update({
    where: { id: cardId },
    data: fsrsCardToDbUpdate(nextCard),
  });
}
```

---

### `apps/api/src/srs/srs.service.spec.ts` (test)

**Analog:** `apps/api/src/users/users.service.spec.ts`

**Mock structure** (lines 18-26 of users.service.spec.ts):
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { SrsService } from './srs.service';
import type { PrismaService } from '../prisma/prisma.service';

const mockFindFirst = vi.fn();
const mockFindMany = vi.fn();
const mockFindUnique = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockUpsert = vi.fn();

const mockPrisma = {
  srsCard: { findFirst: mockFindFirst, findMany: mockFindMany, findUnique: mockFindUnique, create: mockCreate, update: mockUpdate },
  userVocabularyItem: { upsert: mockUpsert },
} as unknown as PrismaService;

describe('SrsService', () => {
  let service: SrsService;
  beforeEach(() => {
    vi.clearAllMocks();
    service = new SrsService(mockPrisma);
  });
  // tests for enrollWord, getDueQueue, submitReview
});
```

**ts-fsrs mock pattern** — mock the module to avoid real algorithm calls in unit tests:
```typescript
vi.mock('ts-fsrs', () => ({
  createEmptyCard: vi.fn().mockReturnValue({
    due: new Date(), stability: 0, difficulty: 0,
    elapsed_days: 0, scheduled_days: 0, learning_steps: 0,
    reps: 0, lapses: 0, state: 0, last_review: undefined,
  }),
  fsrs: vi.fn().mockReturnValue({
    repeat: vi.fn().mockReturnValue({
      3: { card: { due: new Date('2026-06-20'), stability: 1.5, difficulty: 5, elapsed_days: 0, scheduled_days: 7, learning_steps: 0, reps: 1, lapses: 0, state: 2, last_review: new Date() } },
    }),
  }),
  Rating: { Again: 1, Hard: 2, Good: 3, Easy: 4 },
  State: { New: 0, Learning: 1, Review: 2, Relearning: 3, 0: 'New', 1: 'Learning', 2: 'Review', 3: 'Relearning' },
}));
```

---

### `apps/api/src/app.module.ts` (module — modify)

**Analog:** `apps/api/src/app.module.ts` (existing file)

**Module registration pattern** (lines 1-23 of app.module.ts):
```typescript
import { VocabularyModule } from './vocabulary/vocabulary.module';
import { SrsModule } from './srs/srs.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    ProfileModule,
    VocabularyModule,   // ADD
    SrsModule,          // ADD
  ],
})
export class AppModule {}
```

---

### `packages/shared/src/vocabulary.dto.ts` (utility — new Zod DTOs)

**Analog:** `packages/shared/src/user.dto.ts`

**Zod schema pattern** (lines 1-37 of user.dto.ts):
```typescript
import { z } from "zod";

export const VocabularyWordDtoSchema = z.object({
  id: z.string(),
  word: z.string(),
  definition: z.string(),
  partOfSpeech: z.string().nullable(),
  examples: z.array(z.string()),
  synonyms: z.array(z.string()),
  pronunciationKey: z.string().nullable(),
  audioStorageKey: z.string().nullable(),
  cefrLevel: z.enum(["B1", "B2", "C1"]),
  category: z.string().nullable(),
  frequency: z.number(),
});

export const EnrollWordSchema = z.object({
  wordId: z.string(),
  contextSentence: z.string().optional(),
});

export const ReviewSubmitSchema = z.object({
  cardId: z.string(),
  rating: z.enum(["Again", "Hard", "Good", "Easy"]),
});

export const SessionCompleteSchema = z.object({
  categorySlug: z.string(),
  answers: z.array(z.object({
    wordId: z.string(),
    exerciseType: z.string(),
    isCorrect: z.boolean(),
  })),
  timeTakenMs: z.number().optional(),
});

export type VocabularyWordDto = z.infer<typeof VocabularyWordDtoSchema>;
export type EnrollWordDto = z.infer<typeof EnrollWordSchema>;
export type ReviewSubmitDto = z.infer<typeof ReviewSubmitSchema>;
export type SessionCompleteDto = z.infer<typeof SessionCompleteSchema>;
```

---

### `packages/shared/src/index.ts` (barrel export — modify)

**Analog:** `packages/shared/src/index.ts` (existing file, lines 14-16)

**Barrel export pattern** (lines 14-16 of index.ts):
```typescript
// Phase 3: Vocabulary + SRS DTOs
export * from "./vocabulary.dto";
```

Add this line after the existing Phase 2 exports.

---

### `packages/database/package.json` (config — modify)

**Analog:** `packages/database/package.json` (existing file)

**Seed script configuration** — add `prisma.seed` entry and `bcryptjs` dependency:
```json
{
  "scripts": {
    "db:seed": "ts-node --project tsconfig.json prisma/seed.ts"
  },
  "prisma": {
    "seed": "ts-node --project tsconfig.json prisma/seed.ts"
  },
  "devDependencies": {
    "bcryptjs": "^2.4.3",
    "@types/bcryptjs": "^2.4.6",
    "ts-node": "^10.9.2"
  }
}
```

**Note:** Use `bcryptjs` (pure-JS, no native bindings) rather than `bcrypt` to avoid native build issues in the database package context. See RESEARCH Pitfall 7.

---

### `packages/database/prisma/seed.ts` (utility — batch, new file)

**No exact analog** — seed.ts does not yet exist. Pattern inferred from RESEARCH Pattern 7 and existing Prisma upsert patterns in users.service.ts.

**Structure to copy** (from RESEARCH Code Examples + users.service.ts patterns):
```typescript
import { PrismaClient } from "../generated/client";
import * as bcrypt from "bcryptjs";
import vocabularyData from "./seed-data/vocabulary.json";

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding vocabulary words...');
  await prisma.vocabularyWord.createMany({
    data: vocabularyData,
    skipDuplicates: true,
  });
  console.log(`Seeded ${vocabularyData.length} vocabulary words`);

  if (process.env.NODE_ENV !== 'production') {
    const hash = await bcrypt.hash('demo1234', 12);
    const demo = await prisma.user.upsert({
      where: { email: 'demo@example.com' },
      create: {
        email: 'demo@example.com',
        passwordHash: hash,
        emailVerified: new Date(),
        name: 'Demo User',
        cefrLevel: 'B1',
      },
      update: {},
    });
    // 5 SrsCards due 1 hour ago
    const dueDate = new Date(Date.now() - 3600000);
    const words = await prisma.vocabularyWord.findMany({ take: 5 });
    for (const word of words) {
      const item = await prisma.userVocabularyItem.upsert({
        where: { userId_wordId: { userId: demo.id, wordId: word.id } },
        create: { userId: demo.id, wordId: word.id },
        update: {},
      });
      await prisma.srsCard.upsert({
        where: { userVocabItemId: item.id },
        create: {
          userId: demo.id, wordId: word.id, userVocabItemId: item.id,
          due: dueDate, state: 'New',
        },
        update: {},
      });
    }
    console.log('Demo user + 5 past-due SRS cards created');
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
```

---

### Next.js API Relay Routes (all 8 relay files)

**Analog:** `apps/web/src/app/api/profile/me/route.ts` (GET) and `apps/web/src/app/api/profile/update/route.ts` (POST/PATCH)

**GET relay pattern** (full content of profile/me/route.ts):
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
  const reqHeaders = await headers();
  const cookieHeader = reqHeaders.get("cookie") ?? "";
  const res = await fetchWithAuth(cookieHeader, `${API_URL}/api/vocabulary/categories`);
  if (!res.ok) {
    const body = await res.text();
    return NextResponse.json({ error: body || "Failed" }, { status: res.status });
  }
  return NextResponse.json(await res.json());
}
```

**POST relay pattern** (full content of profile/avatar-upload-url/route.ts, lines 16-51):
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
  const res = await fetchWithAuth(cookieHeader, `${API_URL}/api/srs/review`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: err || "Failed" }, { status: res.status });
  }
  return NextResponse.json(await res.json());
}
```

**GET with query params relay** — add URL construction before `fetchWithAuth`:
```typescript
const url = new URL(`${API_URL}/api/vocabulary/${category}/words`);
url.searchParams.set('page', searchParams.get('page') ?? '1');
url.searchParams.set('limit', '20');
const res = await fetchWithAuth(cookieHeader, url.toString());
```

---

### `apps/web/src/app/(dashboard)/vocabulary/page.tsx` (server component, category grid)

**Analog:** `apps/web/src/app/(dashboard)/profile/page.tsx`

**Server Component pattern** (lines 43-63 of profile/page.tsx):
```typescript
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { CategoryCard } from "@/components/vocabulary/category-card";

export default async function VocabularyPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const res = await fetch("/api/vocabulary/categories", { cache: "no-store" });
  const categories = res.ok ? await res.json() : [];

  return (
    <div className="mx-auto max-w-screen-xl">
      <h1 className="mb-8 text-2xl font-semibold text-foreground">Vocabulary</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {categories.map((cat) => <CategoryCard key={cat.slug} {...cat} />)}
      </div>
    </div>
  );
}
```

**Layout conventions** from `apps/web/src/app/(dashboard)/layout.tsx`:
- `className="mx-auto max-w-screen-xl px-4 py-8"` — outer padding applied by layout
- Page content does NOT need to repeat the padding — layout wraps `<main>` with it
- `text-foreground`, `text-muted-foreground`, `bg-background`, `border-border` — zinc palette

---

### `apps/web/src/app/(dashboard)/vocabulary/[category]/page.tsx` (server component, word list)

**Analog:** `apps/web/src/app/(dashboard)/profile/page.tsx`

**Paginated server component pattern**:
```typescript
import { redirect } from "next/navigation";
import { auth } from "@/auth";

interface Props {
  params: { category: string };
  searchParams: { page?: string };
}

export default async function CategoryWordListPage({ params, searchParams }: Props) {
  const session = await auth();
  if (!session) redirect("/login");

  const page = searchParams.page ?? "1";
  const res = await fetch(`/api/vocabulary/${params.category}/words?page=${page}`, {
    cache: "no-store",
  });
  const data = res.ok ? await res.json() : { words: [], total: 0, totalPages: 1 };

  return (
    <div className="mx-auto max-w-3xl">
      {/* word list + pagination */}
    </div>
  );
}
```

---

### `apps/web/src/app/(dashboard)/review/page.tsx` (client component, SRS review queue)

**Analog:** `apps/web/src/app/(dashboard)/profile/profile-form.tsx` (client component pattern)

**Client component with React Query pattern** (RESEARCH Pattern 6, Code Examples):
```typescript
"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function ReviewPage() {
  const queryClient = useQueryClient();

  const { data: queue, isLoading } = useQuery({
    queryKey: ["srs-queue"],
    queryFn: () => fetch("/api/srs/queue").then(r => r.json()),
    staleTime: 0,  // always fresh — SRS timing is critical
  });

  const reviewMutation = useMutation({
    mutationFn: ({ cardId, rating }: { cardId: string; rating: string }) =>
      fetch("/api/srs/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId, rating }),
      }).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["srs-queue"] }),
  });
  // ...
}
```

**Loading state pattern** (lines 187-194 of profile-form.tsx):
```typescript
if (isLoading) {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}
```

---

### `apps/web/src/components/vocabulary/category-card.tsx` (component)

**Analog:** `apps/web/src/components/cefr-badge.tsx`

**Component structure pattern** (full content of cefr-badge.tsx):
```typescript
"use client";
import { cn } from "@/lib/utils";

interface CategoryCardProps {
  slug: string;
  name: string;
  wordCount: number;
  icon: React.ReactNode;
  className?: string;
}

export function CategoryCard({ slug, name, wordCount, icon, className }: CategoryCardProps) {
  return (
    <a
      href={`/vocabulary/${slug}`}
      className={cn(
        "flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition-shadow",
        className,
      )}
    >
      <span aria-hidden="true">{icon}</span>
      <span className="text-sm font-semibold text-foreground">{name}</span>
      <span className="text-xs text-muted-foreground">{wordCount} words</span>
    </a>
  );
}
```

---

### `apps/web/src/components/vocabulary/word-detail.tsx` (component, event-driven)

**Analog:** `apps/web/src/app/(dashboard)/profile/profile-form.tsx`

**Client state management pattern** (lines 46-55 of profile-form.tsx):
```typescript
"use client";
import { useState } from "react";

export function WordDetail({ word }: { word: VocabularyWordDto }) {
  const [isPlaying, setIsPlaying] = useState(false);

  function playPronunciation() {
    setIsPlaying(true);
    if (word.audioStorageKey) {
      const url = `${process.env.NEXT_PUBLIC_MINIO_PUBLIC_URL}/${word.audioStorageKey}`;
      const audio = new Audio(url);
      audio.play()
        .catch(() => window.speechSynthesis.speak(new SpeechSynthesisUtterance(word.word)))
        .finally(() => setIsPlaying(false));
    } else {
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(word.word));
      setIsPlaying(false);
    }
  }
  // ...
}
```

**CRITICAL:** `audioStorageKey` is a storage key, not a URL. Construct full URL as `${NEXT_PUBLIC_MINIO_PUBLIC_URL}/${audioStorageKey}`. Never pass `audioStorageKey` directly to `new Audio()`. See RESEARCH Pitfall 6.

---

### `apps/web/src/components/vocabulary/exercises/flashcard-exercise.tsx` (component, event-driven)

**Analog:** `apps/web/src/app/(dashboard)/profile/profile-form.tsx` (client component + state pattern)

**Framer Motion flip pattern** (RESEARCH Pattern 5):
```typescript
"use client";
import { useState } from "react";
import { motion } from "framer-motion";

interface Props {
  word: string;
  definition: string;
  onCorrect: () => void;
  onIncorrect: () => void;
}

export function FlashcardExercise({ word, definition, onCorrect, onIncorrect }: Props) {
  const [flipped, setFlipped] = useState(false);
  return (
    <div className="perspective-1000">
      <motion.div
        className="relative cursor-pointer"
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.4 }}
        onClick={() => setFlipped(!flipped)}
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* Front face */}
        <div style={{ backfaceVisibility: "hidden" }} className="rounded-xl border border-border bg-card p-8 text-center">
          <p className="text-2xl font-bold text-foreground">{word}</p>
        </div>
        {/* Back face */}
        <div
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
          className="absolute inset-0 rounded-xl border border-border bg-card p-8 text-center"
        >
          <p className="text-base text-foreground">{definition}</p>
        </div>
      </motion.div>
    </div>
  );
}
```

---

### `apps/web/src/components/srs/review-card.tsx` (component, event-driven)

**Analog:** Combination of `apps/web/src/components/vocabulary/exercises/flashcard-exercise.tsx` (flip mechanic) and `apps/web/src/app/(dashboard)/profile/profile-form.tsx` (client state)

**Pattern**: Same Framer Motion flip mechanic as flashcard. On flip, show definition + A/H/G/E rating buttons. On rating, call `reviewMutation.mutate({ cardId, rating })`.

---

### `apps/web/src/components/query-provider.tsx` (provider — new, no analog)

**No analog in codebase** — React Query is not yet set up. Copy from RESEARCH Pattern 6:

```typescript
"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000 } },
  }));
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
```

---

### `apps/web/src/app/(dashboard)/layout.tsx` (layout — modify)

**Analog:** `apps/web/src/app/(dashboard)/layout.tsx` (existing file)

**Modification pattern** — wrap `{children}` with `<QueryProvider>`:
```typescript
import { QueryProvider } from '@/components/query-provider';

// Inside the return:
<main className="mx-auto max-w-screen-xl px-4 py-8">
  <QueryProvider>
    {children}
  </QueryProvider>
</main>
```

---

### `apps/web/src/middleware.ts` (middleware — modify)

**Analog:** `apps/web/src/middleware.ts` (existing file, lines 14-22)

**Matcher extension pattern**:
```typescript
export const config = {
  matcher: [
    "/dashboard", "/dashboard/:path*",
    "/profile", "/profile/:path*",
    "/vocabulary", "/vocabulary/:path*",  // ADD Phase 3
    "/review", "/review/:path*",          // ADD Phase 3
  ],
};
```

The `export { auth as middleware }` line at the top is unchanged — only the `config.matcher` array grows.

---

## Shared Patterns

### Authentication Guard (NestJS)
**Source:** `apps/api/src/auth/jwt-auth.guard.ts`
**Apply to:** All NestJS controllers in VocabularyModule and SrsModule — every endpoint must have `@UseGuards(JwtAuthGuard)`.

```typescript
// Import path (from controller file):
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

// Usage on every endpoint:
@UseGuards(JwtAuthGuard)
@Get('categories')
async getCategories(@Request() req: AuthenticatedRequest) { ... }
```

**AuthenticatedRequest interface** — copy verbatim from users.controller.ts lines 30-37; define locally in each controller file (no shared import needed):
```typescript
interface AuthenticatedRequest {
  user: {
    userId: string;
    role?: string;
    cefrLevel?: string;
    email?: string;
  };
}
```

### Authentication Check (Next.js relay routes)
**Source:** `apps/web/src/app/api/profile/me/route.ts` lines 16-20
**Apply to:** Every Next.js relay route in `apps/web/src/app/api/vocabulary/**` and `apps/web/src/app/api/srs/**`.

```typescript
const session = await auth();
if (!session) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

### Authentication Check (Server Components)
**Source:** `apps/web/src/app/(dashboard)/profile/page.tsx` lines 43-45
**Apply to:** Every new Server Component page in `apps/web/src/app/(dashboard)/vocabulary/**` and `apps/web/src/app/(dashboard)/review/**`.

```typescript
const session = await auth();
if (!session) redirect("/login");
```

### API Client (fetchWithAuth)
**Source:** `apps/web/src/lib/api-client.ts`
**Apply to:** All Next.js relay routes — always use `fetchWithAuth(cookieHeader, url)` instead of raw `fetch()` to NestJS.

```typescript
import { fetchWithAuth, API_URL } from "@/lib/api-client";
```

### Error Handling (NestJS service)
**Source:** `apps/api/src/users/users.service.ts` lines 99-113
**Apply to:** All service methods that do `findUnique`/`findFirst` by ID — wrap in try/catch for Prisma P2025.

```typescript
try {
  return await this.prisma.someModel.update({ where: { id } });
} catch (err) {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
    throw new NotFoundException(`Resource ${id} not found`);
  }
  throw err;
}
```

### Zod DTO Validation (NestJS controller)
**Source:** `apps/api/src/users/users.controller.ts` lines 73-75
**Apply to:** All NestJS controller methods that accept a request body.

```typescript
const dto = SomeSchema.parse(body) as SomeDtoType;
```

### Storage Key to URL Construction
**Source:** `apps/web/src/app/(dashboard)/profile/profile-form.tsx` lines 180-183
**Apply to:** `word-detail.tsx` (audioStorageKey) and any component that displays a stored file.

```typescript
const minioPublicUrl =
  process.env["NEXT_PUBLIC_MINIO_PUBLIC_URL"] ?? "http://localhost:9000/english-learning";
const audioUrl = word.audioStorageKey ? `${minioPublicUrl}/${word.audioStorageKey}` : null;
```

### Prisma Upsert for Unique Constraint
**Source:** `apps/api/src/users/users.service.ts` (upsert pattern); established in RESEARCH Code Examples
**Apply to:** `enrollWord()` in srs.service.ts — must use `upsert` not `create` to handle double-tap on "Mark as learned".

```typescript
await this.prisma.userVocabularyItem.upsert({
  where: { userId_wordId: { userId, wordId } },
  create: { userId, wordId },
  update: {},
});
```

### Client Component Loading State
**Source:** `apps/web/src/app/(dashboard)/profile/profile-form.tsx` lines 187-194
**Apply to:** All client components that fetch data (`review/page.tsx`, `my-words/page.tsx`, `word-detail.tsx`).

```typescript
if (isLoading) {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}
```

### Toast Notification
**Source:** `apps/web/src/app/(dashboard)/profile/profile-form.tsx` lines 341-351
**Apply to:** Practice session completion, "Added to SRS" confirmation, review session completion.

```typescript
{toast && (
  <div
    role="status"
    aria-live="polite"
    className="fixed bottom-4 right-4 z-50 rounded-lg border border-border bg-background px-4 py-3 text-sm font-medium shadow-lg"
  >
    {toast}
  </div>
)}
```

---

## No Analog Found

Files with no close match in the codebase — planner should use RESEARCH.md patterns:

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `apps/web/src/components/query-provider.tsx` | provider | — | React Query not yet set up in the codebase; RESEARCH Pattern 6 provides the complete implementation |
| `packages/database/prisma/seed.ts` | utility | batch | No seed script exists yet; RESEARCH Pattern 7 provides the complete implementation |
| `packages/database/prisma/seed-data/vocabulary.json` | data | — | Static JSON data file; no code pattern needed |
| `apps/web/src/components/vocabulary/exercises/*.tsx` (6 files) | component | event-driven | No exercise components exist; profile-form.tsx provides the client state pattern but exercise interaction logic is unique to each type |

---

## Metadata

**Analog search scope:** `apps/api/src/**`, `apps/web/src/**`, `packages/shared/src/**`, `packages/database/**`
**Files scanned:** 19 API source files, 34 web source files, 8 shared/database source files
**Pattern extraction date:** 2026-06-12
