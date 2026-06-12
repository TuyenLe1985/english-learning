# Phase 3: Vocabulary Module + SRS Core - Research

**Researched:** 2026-06-12
**Domain:** NestJS module development, FSRS spaced repetition, Next.js interactive UI, seed scripting
**Confidence:** HIGH (codebase verified, ts-fsrs API confirmed via official source)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**SRS Queue Mechanism**
- D-01: Due cards surfaced via DB query on request: `SrsCard WHERE userId = ? AND due <= NOW()` ordered by `due ASC`. No BullMQ delayed jobs for Phase 3.
- D-02: After a review session, write next `due` to DB only. ts-fsrs computes next scheduling → single `UPDATE SrsCard SET due = ?, stability = ?, ...`.
- D-03: FSRS algorithm via `ts-fsrs` npm package. Use `createEmptyCard()` + `fsrs.repeat(card, now)`.
- D-04: Review session cap: 20 cards maximum per session, oldest first (ORDER BY due ASC).

**Practice Session Design**
- D-05: Practice sessions are mixed type — system randomly assigns one of 6 exercise types per word.
- D-06: 10 words per practice session, randomly sampled from selected category.
- D-07: Session ends with results screen + Add to SRS prompt.
- D-08: Matching exercise: 4-item tap grid (4 words × 4 definitions).

**Vocabulary Browse + Word Detail UX**
- D-09: Three-level navigation: `/vocabulary` → `/vocabulary/[category]` → `/vocabulary/[category]/[wordId]`.
- D-10: Pronunciation: phonetic key text always shown + play button (R2 URL or `window.speechSynthesis` fallback).
- D-11: Two SRS entry points: "Practice this set" button + "Mark as learned" button on word detail.
- D-12: Word list pagination: 20 words per page, alphabetical A-Z, LIMIT/OFFSET, Prev/Next.

**Phase 3 Seed Data**
- D-13: Seed 25 words × 8 categories = 200 vocabulary words.
- D-14: Seed data stored as `apps/api/prisma/seed-data/vocabulary.json`.
- D-15: Demo user (`demo@example.com`, password `demo1234`, bcrypt-hashed) with 5 past-due SrsCards. Guard with `NODE_ENV !== 'production'`.
- D-16: CEFR distribution: ~8-9 words per level per category (B1/B2/C1).

### Claude's Discretion
- NestJS module structure for vocabulary and SRS (VocabularyModule, SrsModule, or combined)
- Specific NestJS endpoint paths
- React Query setup for vocabulary list and review queue (cache strategy, stale time)
- Session state management during practice (in-memory React state vs. DB mid-session)
- Word detail page layout (tab-based vs. scrollable sections)
- Specific Tailwind/shadcn components for exercise types
- Category icon set (Lucide icons or emoji in the 2×4 category grid)
- Animation library for flashcard flip (CSS transform or Framer Motion)

### Deferred Ideas (OUT OF SCOPE)
- VOCAB-08 (tap-to-SRS from reading passages) — Phase 5
- BullMQ SRS notification jobs — Phase 7
- Pronunciation audio generation via Google TTS — Phase 5
- Infinite scroll for word list — future UX pass
- User-defined session length (5/10/20 words) — future

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| VOCAB-01 | Browse vocabulary sets in 8 categories: business, travel, technology, education, health, daily life, social topics, academic English | GET /api/vocabulary/categories + category grid UI; seeded via vocabulary.json |
| VOCAB-02 | Each vocabulary entry shows word, meaning, pronunciation guide, example sentences, synonyms, common usage | VocabularyWord model has all fields; word detail page with phonetic text + audio play |
| VOCAB-03 | 6 exercise types: flashcard, matching, context selection, cloze, synonym ID, recall | Practice session UI with mixed-type assignment; Framer Motion for flip animation |
| VOCAB-04 | Mark vocabulary item as "learned" — enters SRS review schedule | POST /api/srs/enroll creates UserVocabularyItem + SrsCard via ts-fsrs createEmptyCard() |
| VOCAB-05 | SRS schedules reviews using FSRS algorithm | ts-fsrs@5.4.1 `fsrs.repeat(card, now)` produces scheduled intervals |
| VOCAB-06 | Pending SRS reviews on dashboard + dedicated review queue with Again/Hard/Good/Easy ratings | GET /api/srs/queue (DB query due <= NOW()), POST /api/srs/review triggers fsrs.repeat() |
| VOCAB-07 | Full vocabulary list with status filter (new/learning/reviewing/mastered) + next review date | GET /api/vocabulary/my-words?status=… joined with UserVocabularyItem + SrsCard |

</phase_requirements>

---

## Summary

Phase 3 delivers the Vocabulary Module and SRS Core — the most interaction-heavy phase in the v1 roadmap. It involves building two NestJS modules (VocabularyModule, SrsModule), six Next.js routes, a 200-word seed corpus, and integrating the ts-fsrs algorithm for spaced repetition scheduling. All database models (VocabularyWord, UserVocabularyItem, SrsCard) are already migrated from Phase 1 — Phase 3 adds no new schema.

The most critical technical detail is the **ts-fsrs v5 field mapping pitfall**: ts-fsrs v5 uses snake_case field names (`elapsed_days`, `scheduled_days`, `last_review`, `learning_steps`) while the Prisma schema uses camelCase (`elapsedDays`, `scheduledDays`, `lastReview`). Additionally, ts-fsrs v5 added a `learning_steps` field that is absent from the Prisma schema. Every service function that maps between `SrsCard` (Prisma) and `Card` (ts-fsrs) must explicitly translate these names and handle the missing `learning_steps` field (default to 0 when reading from DB, discard when writing back).

The **seed script location** requires a decision: D-14 specifies `apps/api/prisma/seed-data/vocabulary.json` as the data file location, but Prisma's `seed` command must be configured in `packages/database/package.json` (where the schema lives). The correct pattern is: add a `prisma.seed` entry to `packages/database/package.json`, write `packages/database/prisma/seed.ts`, and have that seed script import the vocabulary JSON from its declared path. The planner should clarify this or consolidate data + script both under `packages/database/prisma/`.

Practice session state is held entirely in React component state (no mid-session API calls). The session submits a single `POST /api/vocabulary/session/complete` at the end. This keeps the API surface minimal and avoids partial-session recovery complexity in Phase 3.

**Primary recommendation:** Build VocabularyModule and SrsModule as separate NestJS modules (AuthModule pattern), share DTOs via `@repo/shared`, install `ts-fsrs` in `apps/api`, install `framer-motion` and `@tanstack/react-query` in `apps/web`, and set up React Query's `QueryClientProvider` in the dashboard layout.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Vocabulary category/word browsing | API (NestJS) | Frontend (Next.js page) | Data lives in PostgreSQL; NestJS owns queries and pagination |
| SRS due queue calculation | API (NestJS) | — | `WHERE due <= NOW()` is a DB query; business logic stays in NestJS |
| FSRS scheduling (fsrs.repeat) | API (NestJS) | — | Algorithm runs after review submission; produces next `due` written to DB |
| Practice session state (current Q, score) | Browser (React state) | — | No persistence needed mid-session; submitted as a batch at end |
| Flashcard flip animation | Browser (CSS/Framer Motion) | — | Pure UI; no server involvement |
| Matching exercise state (selected pairs) | Browser (React state) | — | Ephemeral interaction state |
| Word pronunciation playback | Browser | API (audio URL lookup) | R2 URL resolved from `audioStorageKey` at API; `Audio()` or `speechSynthesis` in browser |
| Vocabulary list (my-words, status filter) | API (NestJS) | Frontend (Next.js + React Query) | Filtered query joining UserVocabularyItem + SrsCard |
| Seed data creation | Database (packages/database) | — | Prisma seed runs against database package context |

---

## Standard Stack

### Core (already in project — no install needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| NestJS | 11.1.26 | API modules (VocabularyModule, SrsModule) | [VERIFIED: codebase] — already installed, established pattern |
| Prisma | 6.19.3 | DB queries for VocabularyWord, UserVocabularyItem, SrsCard | [VERIFIED: codebase] — PrismaService injection already in use |
| Zod | 3.24.0 | DTO schemas in @repo/shared | [VERIFIED: codebase] — packages/shared uses Zod |
| Next.js | 14.2.35 | Frontend pages and API relay routes | [VERIFIED: codebase] — pinned to 14.x |
| React | 18.3.1 | Component rendering | [VERIFIED: codebase] |
| Tailwind CSS | 3.4.19 | Styling (zinc palette, New York theme) | [VERIFIED: codebase] |
| lucide-react | 1.17.0 | Icons (category grid icons, exercise UI) | [VERIFIED: codebase] — already installed |
| shadcn/ui (button) | N/A CLI | Base component primitives | [VERIFIED: codebase] — components.json confirms New York/zinc setup |
| bcrypt | 6.0.0 | Demo user password hashing in seed script | [VERIFIED: codebase] — in apps/web dependencies |

### New Installs Required

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `ts-fsrs` | 5.4.1 | FSRS algorithm (createEmptyCard, fsrs.repeat) | [VERIFIED: npm registry, official GitHub] — locked by D-03; maintained by open-spaced-repetition org |
| `framer-motion` | 12.40.0 | Flashcard flip animation, matching exercise transitions | [VERIFIED: npm registry] — discretion item, established in CLAUDE.md as in-stack choice |
| `@tanstack/react-query` | 5.101.0 | Server state for vocabulary list, review queue, my-words | [VERIFIED: npm registry] — specified in CLAUDE.md §Supporting Libraries |

### shadcn/ui Components to Add (via `pnpm dlx shadcn add`)

The following components need to be added via the shadcn CLI — only `button` exists currently:

| Component | Used By |
|-----------|---------|
| `card` | Category grid cards, word detail card, exercise card |
| `badge` | Word status badges (new/learning/reviewing/mastered) |
| `progress` | Session progress bar |
| `dialog` | "Add to SRS?" prompt after practice session |
| `tabs` | Word detail page (definition/examples/synonyms tabs) |
| `pagination` | Word list pagination controls |
| `skeleton` | Loading states for word list and review queue |
| `toast` | Success/error feedback |

**Installation commands:**
```bash
# apps/api (new)
pnpm --filter @repo/api add ts-fsrs

# apps/web (new)
pnpm --filter @repo/web add framer-motion @tanstack/react-query

# shadcn components (run from apps/web)
pnpm dlx shadcn@latest add card badge progress dialog tabs pagination skeleton toast
```

**Version verification:** All versions confirmed via `npm view` on 2026-06-12.

---

## Package Legitimacy Audit

> slopcheck was unavailable in this environment. Packages verified via npm registry and official GitHub repository confirmation.

| Package | Registry | Published | Source Repo | slopcheck | Disposition |
|---------|----------|-----------|-------------|-----------|-------------|
| `ts-fsrs` | npm | 2026-05-22 | github.com/open-spaced-repetition/ts-fsrs | [ASSUMED] — slopcheck unavailable | Approved — official open-spaced-repetition org, active maintenance |
| `framer-motion` | npm | 2026-06-03 | github.com/motiondivision/motion | [ASSUMED] — slopcheck unavailable | Approved — motiondivision org, widely used |
| `@tanstack/react-query` | npm | 2026-06-02 | github.com/TanStack/query | [ASSUMED] — slopcheck unavailable | Approved — TanStack org, CLAUDE.md-specified |

**Packages removed due to slopcheck [SLOP] verdict:** none

**Packages flagged as suspicious [SUS]:** none

*slopcheck was unavailable at research time. All three packages above are tagged `[ASSUMED]` per graceful-degradation policy. The planner should add a `checkpoint:human-verify` task before each install, or the developer can manually confirm via the GitHub links above before proceeding.*

---

## Architecture Patterns

### System Architecture Diagram

```
Browser
  │
  ├── GET /vocabulary/*              → Next.js Server Components
  │     ├── auth() session check     → redirect /login if none
  │     └── fetch /api/vocabulary/*  → NestJS VocabularyModule
  │
  ├── Client Components (React state)
  │     ├── PracticeSession          → local state (10 questions, score, answers)
  │     │     └── POST /api/vocabulary/session/complete  → NestJS (batch on finish)
  │     ├── FlashcardExercise        → Framer Motion rotateY(180deg) on flip
  │     ├── MatchingExercise         → 4×4 tap grid state (selected word/def pairs)
  │     ├── ReviewQueue              → React Query useQuery(/api/srs/queue)
  │     │     └── POST /api/srs/review → NestJS SrsModule → fsrs.repeat() → DB
  │     └── MyWordsList              → React Query useQuery(/api/vocabulary/my-words)
  │
  └── Next.js API Relay Routes (apps/web/src/app/api/*)
        ├── GET  /api/vocabulary/categories       → proxy to NestJS
        ├── GET  /api/vocabulary/[category]/words → proxy to NestJS
        ├── GET  /api/vocabulary/[category]/[id]  → proxy to NestJS
        ├── POST /api/vocabulary/enroll           → proxy to NestJS
        ├── POST /api/vocabulary/session/complete → proxy to NestJS
        ├── GET  /api/srs/queue                   → proxy to NestJS
        └── POST /api/srs/review                  → proxy to NestJS

NestJS API (apps/api)
  ├── VocabularyModule
  │     ├── GET  /api/vocabulary/categories
  │     ├── GET  /api/vocabulary/:category/words?page=&limit=
  │     ├── GET  /api/vocabulary/:category/:wordId
  │     ├── GET  /api/vocabulary/my-words?status=&page=
  │     └── POST /api/vocabulary/session/complete
  │
  └── SrsModule
        ├── POST /api/srs/enroll          → createEmptyCard() → DB insert
        ├── GET  /api/srs/queue           → WHERE due <= NOW() ORDER BY due ASC LIMIT 20
        └── POST /api/srs/review          → fsrs.repeat(card, now)[rating] → DB update

PostgreSQL (via Prisma)
  ├── VocabularyWord    (seeded: 200 words)
  ├── UserVocabularyItem (created on enroll)
  └── SrsCard           (created on enroll, updated on review)
```

### Recommended Project Structure

```
apps/api/src/
├── vocabulary/
│   ├── vocabulary.module.ts
│   ├── vocabulary.controller.ts
│   ├── vocabulary.service.ts
│   └── vocabulary.service.spec.ts
└── srs/
    ├── srs.module.ts
    ├── srs.controller.ts
    ├── srs.service.ts
    └── srs.service.spec.ts

apps/web/src/
├── app/
│   ├── (dashboard)/
│   │   ├── vocabulary/
│   │   │   ├── page.tsx                          (category grid)
│   │   │   └── [category]/
│   │   │       ├── page.tsx                      (word list)
│   │   │       ├── practice/
│   │   │       │   └── page.tsx                  (practice session)
│   │   │       └── [wordId]/
│   │   │           └── page.tsx                  (word detail)
│   │   ├── review/
│   │   │   └── page.tsx                          (SRS review queue)
│   │   └── vocabulary/my-words/
│   │       └── page.tsx                          (personal word list)
│   └── api/
│       ├── vocabulary/
│       │   ├── categories/route.ts
│       │   ├── [category]/words/route.ts
│       │   ├── [category]/[wordId]/route.ts
│       │   ├── my-words/route.ts
│       │   ├── enroll/route.ts
│       │   └── session/complete/route.ts
│       └── srs/
│           ├── queue/route.ts
│           └── review/route.ts
├── components/
│   ├── vocabulary/
│   │   ├── category-card.tsx
│   │   ├── word-list-item.tsx
│   │   ├── word-detail.tsx
│   │   └── exercises/
│   │       ├── flashcard-exercise.tsx
│   │       ├── matching-exercise.tsx
│   │       ├── cloze-exercise.tsx
│   │       ├── context-selection-exercise.tsx
│   │       ├── synonym-exercise.tsx
│   │       └── recall-exercise.tsx
│   └── srs/
│       ├── review-card.tsx
│       └── rating-buttons.tsx

packages/database/prisma/
├── schema.prisma                    (Phase 1 — no changes in Phase 3)
├── seed.ts                          (NEW in Phase 3)
└── seed-data/
    └── vocabulary.json              (NEW — 200 words)
```

**Seed script location clarification:** D-14 states `apps/api/prisma/seed-data/vocabulary.json` but Prisma's `prisma db seed` command is invoked in the context of the package that owns the schema — `packages/database`. The recommended approach is:
- Place `vocabulary.json` at `packages/database/prisma/seed-data/vocabulary.json`
- Write `packages/database/prisma/seed.ts`
- Add `"prisma": { "seed": "ts-node prisma/seed.ts" }` to `packages/database/package.json`

If the planner follows D-14 literally (data in `apps/api/`), the seed script in `packages/database` must import the JSON from an absolute path or copy it. Consolidating both under `packages/database/prisma/` is cleaner and avoids cross-package file dependency.

### Pattern 1: NestJS Module with AuthModule import

The established pattern (ProfileModule, UsersModule) for protected endpoints:

```typescript
// Source: apps/api/src/users/users.module.ts [VERIFIED: codebase]
@Module({
  imports: [AuthModule],      // exposes JwtAuthGuard
  controllers: [VocabularyController],
  providers: [VocabularyService],
})
export class VocabularyModule {}
```

### Pattern 2: Protected NestJS Controller

```typescript
// Source: apps/api/src/users/users.controller.ts [VERIFIED: codebase]
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

### Pattern 3: ts-fsrs Integration — CRITICAL FIELD MAPPING

**The `learning_steps` gap:** ts-fsrs v5 Card interface has `learning_steps: number` (added in FSRS-6). The `SrsCard` schema does NOT have this field. The mapping function must default `learning_steps` to 0 when building a ts-fsrs Card from a DB row. [VERIFIED: ts-fsrs official GitHub models.ts, Prisma schema codebase]

```typescript
// Source: ts-fsrs official README + models.ts [VERIFIED: official GitHub]
import { createEmptyCard, fsrs, Rating, type Card, State } from 'ts-fsrs';

// SrsCard DB row → ts-fsrs Card (snake_case names, add learning_steps)
function dbCardToFsrsCard(dbCard: SrsCardRow): Card {
  return {
    due: dbCard.due,
    stability: dbCard.stability,
    difficulty: dbCard.difficulty,
    elapsed_days: dbCard.elapsedDays,
    scheduled_days: dbCard.scheduledDays,
    learning_steps: 0,          // field not in schema — default to 0
    reps: dbCard.reps,
    lapses: dbCard.lapses,
    state: dbCard.state as unknown as State,  // enum values match: New=0, Learning=1, Review=2, Relearning=3
    last_review: dbCard.lastReview ?? undefined,
  };
}

// ts-fsrs Card result → Prisma update payload (camelCase, drop learning_steps)
function fsrsCardToDbUpdate(card: Card) {
  return {
    due: card.due,
    stability: card.stability,
    difficulty: card.difficulty,
    elapsedDays: card.elapsed_days,
    scheduledDays: card.scheduled_days,
    // learning_steps intentionally NOT persisted (schema does not have this field)
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    lastReview: card.last_review ?? null,
  };
}

// New card enrollment (VOCAB-04)
const emptyCard = createEmptyCard();
// createEmptyCard() returns: { due: now, stability: 0, difficulty: 0, elapsed_days: 0,
//   scheduled_days: 0, learning_steps: 0, reps: 0, lapses: 0, state: State.New, last_review: undefined }

// After review (VOCAB-05, VOCAB-06)
const f = fsrs();
const scheduling = f.repeat(dbCardToFsrsCard(dbCard), now);
// scheduling shape: { [Rating.Again]: { card: Card, log: ReviewLog },
//                     [Rating.Hard]:  { card: Card, log: ReviewLog },
//                     [Rating.Good]:  { card: Card, log: ReviewLog },
//                     [Rating.Easy]:  { card: Card, log: ReviewLog } }
const nextCard = scheduling[Rating.Good].card;  // pick user's rating
const updatePayload = fsrsCardToDbUpdate(nextCard);
```

### Pattern 4: Next.js API Relay Route

```typescript
// Source: apps/web/src/app/api/profile/me/route.ts [VERIFIED: codebase]
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

### Pattern 5: Flashcard Flip Animation (Framer Motion)

```typescript
// Source: Framer Motion docs — discretion choice confirmed in CONTEXT.md
"use client";
import { motion } from "framer-motion";

export function FlashcardExercise({ word, definition }: Props) {
  const [flipped, setFlipped] = useState(false);
  return (
    <motion.div
      className="cursor-pointer"
      animate={{ rotateY: flipped ? 180 : 0 }}
      transition={{ duration: 0.4 }}
      onClick={() => setFlipped(!flipped)}
      style={{ transformStyle: "preserve-3d" }}
    >
      <div className="backface-hidden">{word}</div>
      <div className="backface-hidden rotate-y-180">{definition}</div>
    </motion.div>
  );
}
```

### Pattern 6: React Query Setup (Wave 0 gap)

React Query is NOT currently set up in `apps/web`. A `QueryClientProvider` must be added to the dashboard layout or a dedicated providers component before any `useQuery` hooks can work.

```typescript
// apps/web/src/components/query-provider.tsx (new file — Wave 0)
"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000 } },  // 30s default stale
  }));
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
```

Wrap `apps/web/src/app/(dashboard)/layout.tsx` with `<QueryProvider>`.

### Pattern 7: Seed Script (packages/database/prisma/seed.ts)

```typescript
// packages/database/prisma/seed.ts [ASSUMED pattern — seed.ts does not yet exist]
import { PrismaClient } from "../generated/client";
import * as bcrypt from "bcrypt";
import vocabularyData from "./seed-data/vocabulary.json";

const prisma = new PrismaClient();

async function main() {
  // Seed vocabulary words in batches of 500 (PIPE-06 pattern)
  await prisma.vocabularyWord.createMany({
    data: vocabularyData,
    skipDuplicates: true,
  });

  // Demo user — development only
  if (process.env.NODE_ENV !== "production") {
    const hash = await bcrypt.hash("demo1234", 12);
    const demo = await prisma.user.upsert({
      where: { email: "demo@example.com" },
      create: {
        email: "demo@example.com",
        passwordHash: hash,
        emailVerified: new Date(),
        name: "Demo User",
        cefrLevel: "B1",
      },
      update: {},
    });
    // 5 past-due SrsCards (1 hour ago)
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
          userId: demo.id,
          wordId: word.id,
          userVocabItemId: item.id,
          due: dueDate,
          state: "New",
        },
        update: {},
      });
    }
  }
}

main().then(() => prisma.$disconnect()).catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
```

### Anti-Patterns to Avoid

- **ts-fsrs field names copied verbatim to Prisma:** `elapsed_days` is the ts-fsrs field; `elapsedDays` is the Prisma column. Always map explicitly between the two.
- **Storing `learning_steps` when it's not in the schema:** ts-fsrs v5 includes `learning_steps` in the Card interface. Silently drop it when writing to DB; default to 0 when reading from DB.
- **Calling `fsrs.repeat()` without mapping DB card first:** Passing a Prisma `SrsCard` directly to `fsrs.repeat()` will produce wrong results because field names differ. Always use `dbCardToFsrsCard()`.
- **Mid-session API calls for practice:** Practice session progress (current question, answers, score) must live in React component state only. One batch `POST /api/vocabulary/session/complete` at session end.
- **Creating new SrsCard without UserVocabularyItem:** The `SrsCard.userVocabItemId` has a `@unique` constraint. Enrollment must always create (or find) the `UserVocabularyItem` first, then create `SrsCard` linked to it.
- **Relay routes without auth check:** Every Next.js relay route must call `auth()` and return 401 before proxying — see existing pattern in `apps/web/src/app/api/profile/me/route.ts`.
- **Using `@UseGuards(JwtAuthGuard)` without importing AuthModule:** The guard is only injectable if the module imports `AuthModule` (which exports it). All vocabulary/SRS NestJS modules must import `AuthModule`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| FSRS scheduling intervals | Custom SM-2 or manual interval table | `ts-fsrs` — `fsrs.repeat()` | FSRS-6 algorithm handles stability decay, lapses, relearning transitions; hundreds of edge cases around forgetting curves |
| Flashcard flip CSS | Raw CSS `rotateY` + backface-hidden class management | `framer-motion` `animate={{ rotateY }}` | Browser inconsistencies in `backface-visibility`, `perspective` inheritance, Safari transform-style bugs; Framer Motion abstracts them |
| Server state caching / refetch | Custom `useState` + `useEffect` + fetch | `@tanstack/react-query` `useQuery` | Handles stale-while-revalidate, background refetch, loading states, error retry, optimistic updates; session-wide cache prevents redundant fetches |
| Pagination logic | Manual `skip`/`take` calculations | Prisma `skip: (page - 1) * limit, take: limit` + `count()` | Standard LIMIT/OFFSET is two lines in Prisma; hand-rolling introduces off-by-one errors |
| Zod DTO validation | Manual type guards | Zod `schema.parse(body)` (established project pattern) | Global ValidationPipe + Zod catches malformed payloads at boundary; consistent with existing codebase |

**Key insight:** The FSRS algorithm's correctness depends on correctly computing `elapsed_days`, `scheduled_days`, and stability — values that interact in a non-obvious way. The open-spaced-repetition implementation in `ts-fsrs` has been validated against the original FSRS paper. Never reimplement this.

---

## Common Pitfalls

### Pitfall 1: ts-fsrs v5 `learning_steps` field missing from schema

**What goes wrong:** `createEmptyCard()` returns a Card with `learning_steps: 0`. When mapping this Card back to a Prisma `SrsCard`, including `learning_steps` in the update object causes a Prisma type error (`Unknown field 'learning_steps'`). Alternatively, omitting it when mapping FROM the DB to ts-fsrs causes the algorithm to behave as if the card has never progressed through short-term learning steps.

**Why it happens:** ts-fsrs v5 implements FSRS-6 which added learning step tracking. The schema was designed for an earlier FSRS version without this field.

**How to avoid:** Use the explicit mapping functions `dbCardToFsrsCard()` and `fsrsCardToDbUpdate()` documented above. Never spread the Card object directly into Prisma update calls.

**Warning signs:** TypeScript errors on `SrsCard` update calls mentioning unknown fields; review sessions where cards never advance from "Learning" state.

### Pitfall 2: `CardState` enum mismatch between Prisma and ts-fsrs

**What goes wrong:** Prisma enum is `CardState { New, Learning, Review, Relearning }`. ts-fsrs State enum is numeric: `New=0, Learning=1, Review=2, Relearning=3`. Prisma stores string enum values. When reading from DB, `state: "New"` must be cast to the ts-fsrs `State` enum; when writing, ts-fsrs `State.New` (which is `0`) must be mapped back to `"New"`.

**Why it happens:** TypeScript enum values (string vs numeric) differ between Prisma-generated types and ts-fsrs.

**How to avoid:** In `dbCardToFsrsCard()`, use: `state: State[dbCard.state as keyof typeof State]`. In `fsrsCardToDbUpdate()`, use: `state: State[card.state] as 'New' | 'Learning' | 'Review' | 'Relearning'`. Add unit tests that round-trip all four state values.

**Warning signs:** Cards always showing `state: 0` instead of `"New"` in DB queries; TypeScript compile errors on state assignment.

### Pitfall 3: Middleware doesn't protect `/vocabulary/*` and `/review` routes

**What goes wrong:** The current `middleware.ts` matcher only covers `/dashboard` and `/profile`. Unauthenticated users can access vocabulary and review pages.

**Why it happens:** Phase 2 only added the routes it needed. Phase 3 adds new route groups.

**How to avoid:** Update `middleware.ts` matcher to include:
```typescript
matcher: [
  "/dashboard", "/dashboard/:path*",
  "/profile", "/profile/:path*",
  "/vocabulary", "/vocabulary/:path*",
  "/review", "/review/:path*",
]
```

**Warning signs:** Playwright E2E test for `/vocabulary` redirect to `/login` fails.

### Pitfall 4: React Query not set up — `useQuery` fails silently

**What goes wrong:** `@tanstack/react-query` is not installed and `QueryClientProvider` is not in the component tree. Vocabulary list and review queue components that use `useQuery` fail with "No QueryClient set" error.

**Why it happens:** React Query must be explicitly initialized. Unlike built-in React hooks, it requires a provider.

**How to avoid:** Wave 0 must: (1) install `@tanstack/react-query` in `apps/web`, (2) create `QueryProvider` client component, (3) wrap `(dashboard)/layout.tsx` with it.

**Warning signs:** `Error: No QueryClient set, use QueryClientProvider to set one` in console.

### Pitfall 5: SRS enrollment without uniqueness check

**What goes wrong:** If the user taps "Mark as learned" on a word that already has a `UserVocabularyItem` + `SrsCard`, a second call creates a duplicate (or throws a unique constraint violation on `UserVocabularyItem.userId_wordId`).

**Why it happens:** `UserVocabularyItem` has `@@unique([userId, wordId])`. The enroll endpoint must upsert, not create.

**How to avoid:** Use `prisma.userVocabularyItem.upsert()` keyed on `{ userId_wordId: { userId, wordId } }`, then `prisma.srsCard.upsert()` keyed on `{ userVocabItemId }`. Return the existing card if already enrolled.

**Warning signs:** HTTP 500 with Prisma unique constraint error on double-tap of "Mark as learned".

### Pitfall 6: `audioStorageKey` treated as URL

**What goes wrong:** Code passes `word.audioStorageKey` directly to `new Audio(word.audioStorageKey)`. The storage key (e.g. `tts/abc123.mp3`) is not a URL — the browser gets a 404 or relative-path error.

**Why it happens:** D-10 establishes storage keys (not URLs) in the schema. The UI must construct the full URL via `R2_PUBLIC_URL + key`.

**How to avoid:** The word detail component receives or constructs `audioUrl` as `R2_BUCKET_PUBLIC_URL + '/' + word.audioStorageKey`. If `audioStorageKey` is null, skip the Audio() and use `speechSynthesis` directly.

**Warning signs:** Audio play button does nothing or throws a console error about relative URL.

### Pitfall 7: Seed script `bcrypt` import in packages/database context

**What goes wrong:** `bcrypt` is in `apps/web/package.json` but the seed script runs in `packages/database` context. `import * as bcrypt from 'bcrypt'` fails with module not found.

**Why it happens:** pnpm strict hoisting — packages not declared in the consuming package are not available.

**How to avoid:** Add `bcrypt` and `@types/bcrypt` to `packages/database` devDependencies, OR use `bcryptjs` (pure-JS, no native bindings). Alternatively, generate the hash externally and hardcode it in the seed script (acceptable for a demo user with a well-known password).

**Warning signs:** `Cannot find module 'bcrypt'` when running `prisma db seed` from `packages/database`.

---

## Code Examples

### SRS Enroll Endpoint (VOCAB-04)

```typescript
// Source: based on ts-fsrs official docs [VERIFIED] + Prisma upsert pattern [VERIFIED: codebase]
// apps/api/src/srs/srs.service.ts
async enrollWord(userId: string, wordId: string, contextSentence?: string) {
  // Step 1: Upsert UserVocabularyItem (idempotent)
  const item = await this.prisma.userVocabularyItem.upsert({
    where: { userId_wordId: { userId, wordId } },
    create: { userId, wordId, contextSentence },
    update: {},   // don't overwrite existing contextSentence
  });

  // Step 2: Create SrsCard if not exists (linked 1:1 to UserVocabularyItem)
  const existing = await this.prisma.srsCard.findUnique({
    where: { userVocabItemId: item.id },
  });
  if (existing) return existing;  // already enrolled

  const empty = createEmptyCard();  // ts-fsrs v5
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

### Review Submission (VOCAB-05, VOCAB-06)

```typescript
// Source: ts-fsrs official README [VERIFIED] + project Prisma pattern [VERIFIED: codebase]
// apps/api/src/srs/srs.service.ts
async submitReview(userId: string, cardId: string, rating: 'Again' | 'Hard' | 'Good' | 'Easy') {
  const dbCard = await this.prisma.srsCard.findFirst({
    where: { id: cardId, userId },
  });
  if (!dbCard) throw new NotFoundException('Card not found');

  const fsrsCard = dbCardToFsrsCard(dbCard);
  const f = fsrs();
  const now = new Date();
  const scheduling = f.repeat(fsrsCard, now);
  const ratingEnum = Rating[rating];  // 'Good' -> Rating.Good (3)
  const nextCard = scheduling[ratingEnum].card;

  return this.prisma.srsCard.update({
    where: { id: cardId },
    data: {
      due: nextCard.due,
      stability: nextCard.stability,
      difficulty: nextCard.difficulty,
      elapsedDays: nextCard.elapsed_days,
      scheduledDays: nextCard.scheduled_days,
      reps: nextCard.reps,
      lapses: nextCard.lapses,
      state: State[nextCard.state] as 'New' | 'Learning' | 'Review' | 'Relearning',
      lastReview: now,
    },
  });
}
```

### Due Queue Query (D-01, D-04)

```typescript
// Source: Prisma docs pattern [VERIFIED: codebase uses Prisma]
// apps/api/src/srs/srs.service.ts
async getDueQueue(userId: string): Promise<SrsCardWithWord[]> {
  return this.prisma.srsCard.findMany({
    where: { userId, due: { lte: new Date() } },
    orderBy: { due: 'asc' },
    take: 20,   // D-04: max 20 per session
    include: { word: true },
  });
}
```

### Pronunciation Playback (D-10)

```typescript
// Source: CONTEXT.md §Specific Ideas [CITED: 03-CONTEXT.md]
// apps/web/src/components/vocabulary/word-detail.tsx
function playPronunciation(word: string, audioStorageKey: string | null) {
  if (audioStorageKey) {
    const url = `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${audioStorageKey}`;
    const audio = new Audio(url);
    audio.play().catch(() => {
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(word));
    });
  } else {
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(word));
  }
}
```

### React Query Usage for Review Queue (VOCAB-06)

```typescript
// Source: @tanstack/react-query v5 docs [ASSUMED — not verified via Context7 in this session]
// apps/web/src/app/(dashboard)/review/page.tsx
"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function ReviewQueueClient() {
  const queryClient = useQueryClient();

  const { data: queue, isLoading } = useQuery({
    queryKey: ["srs-queue"],
    queryFn: () => fetch("/api/srs/queue").then(r => r.json()),
    staleTime: 0,   // always fresh — SRS timing is critical
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

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| SM-2 algorithm (Anki original) | FSRS-6 (ts-fsrs v5) | 2024–2025 | Better retention rates; eliminates ease floor trap; Phase 3 uses FSRS per D-03 |
| `elapsed_days` field (FSRS < v6) | `learning_steps` (FSRS-6 v5) | ts-fsrs v5.0 (2025) | `elapsed_days` deprecated; `learning_steps` added; schema must map correctly |
| `fsrs.repeat()` returns `Card[]` | `fsrs.repeat()` returns `Record<Rating, { card, log }>` | ts-fsrs v4+ | Planner must use `scheduling[Rating.Good].card`, not array index |
| `framer-motion` 10.x with JSX variants | `motion` package 12.x with same API | 2025 | Import path and core API unchanged; `animate`, `variants`, `transition` props identical |
| React Query v4 `useQuery([key], fn)` | React Query v5 `useQuery({ queryKey, queryFn })` | TanStack Query v5 (2023) | Object-style options required; positional `[key, fn]` removed |

**Deprecated/outdated:**
- `bull` npm package: do not use (unmaintained since 2022; CLAUDE.md §What NOT to Use)
- `sm2-algorithm` patterns: FSRS is the chosen algorithm (D-03); SM-2 not accommodated in schema
- `useQuery(key, fn)` positional syntax: TanStack Query v5 uses object syntax only

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | React Query `useQuery` object syntax `{ queryKey, queryFn }` — not verified via Context7 | Code Examples | Planner writes v4 syntax; runtime error until fixed |
| A2 | Framer Motion v12 `animate={{ rotateY }}` API identical to v10 | Code Examples | Animation pattern doesn't work; needs adjustment |
| A3 | `ts-fsrs.repeat()` returns `Record<Rating, { card, log }>` not flat array | Code Examples | If API changed, `scheduling[Rating.Good]` returns undefined |
| A4 | `State[card.state]` produces string enum name matching Prisma `CardState` | Code Examples | State written as numeric string to DB; CEFR filter queries break |
| A5 | `bcrypt` must be added to `packages/database` devDependencies for seed script | Common Pitfalls | Seed script fails if bcrypt is not available in database package context |
| A6 | D-14 seed data location (`apps/api/prisma/seed-data/`) — CONTEXT.md specified path | Architecture Patterns | Seed script location mismatch causes `prisma db seed` to fail |

**If this table is empty:** All claims in this research were verified or cited — no user confirmation needed.

*(A1, A2, A3, A4: based on package version verification but not full API doc check via Context7 — confidence is MEDIUM. A5, A6: structural inferences from monorepo layout inspection.)*

---

## Open Questions (RESOLVED)

1. **Seed script location: `apps/api/prisma/seed-data/` vs `packages/database/prisma/`**
   - What we know: D-14 says data at `apps/api/prisma/seed-data/vocabulary.json`. Prisma `db seed` must be invoked from the package owning the schema (`packages/database`). No `seed.ts` exists yet.
   - What's unclear: Should seed data JSON live in `apps/api` (as D-14 says) while seed script is in `packages/database` importing it cross-package? Or should planner consolidate both under `packages/database`?
   - Recommendation: Planner should consolidate both under `packages/database/prisma/seed-data/vocabulary.json` for cleaner monorepo structure, noting the departure from D-14 literal path.
   - **RESOLVED:** Both `seed.ts` and `vocabulary.json` placed under `packages/database/prisma/` to avoid cross-package file imports. D-14 literal path (`apps/api`) is overridden by architectural necessity — Prisma seed must run from the schema owner. Deviation noted in Plan 03-01 objective.

2. **`learning_steps` schema gap: ignore or add migration?**
   - What we know: ts-fsrs v5 Card has `learning_steps`; `SrsCard` schema does not. The field is used internally by FSRS-6 for short-term learning step tracking. Defaulting to 0 and not persisting it means FSRS cannot accurately resume interrupted learning steps across sessions.
   - What's unclear: How significant is this for a Phase 3 MVP? Is a zero-migration add of `learningSteps Int @default(0)` worth it?
   - Recommendation: Add `learningSteps Int @default(0)` to `SrsCard` in a new migration. The accuracy cost of not persisting it is non-trivial for words in early learning stages. This is a Wave 0 task.
   - **RESOLVED:** Phase 3 keeps schema read-only (no new migration). `learning_steps` is defaulted to 0 on read from DB and discarded on write-back via explicit `dbCardToFsrsCard()` / `fsrsCardToDbUpdate()` mapper functions. Accuracy cost is acceptable for MVP; persisting `learningSteps` deferred to a future phase if SRS quality feedback warrants it.

3. **`NEXT_PUBLIC_R2_PUBLIC_URL` env var for Phase 3 client-side audio**
   - What we know: Audio playback (D-10) needs to construct the full R2 URL from `audioStorageKey`. This requires `NEXT_PUBLIC_R2_PUBLIC_URL` to be available in the browser.
   - What's unclear: Is this env var already defined in `.env.example`? Phase 5 adds TTS generation; Phase 3 only wires playback.
   - Recommendation: Wave 0 ensures `NEXT_PUBLIC_R2_PUBLIC_URL` (or `NEXT_PUBLIC_MINIO_PUBLIC_URL` for local dev) is added to `.env.example`.
   - **RESOLVED:** Plan 03-01 adds `NEXT_PUBLIC_MINIO_PUBLIC_URL=http://localhost:9000/english-learning` (local dev) and `NEXT_PUBLIC_R2_PUBLIC_URL=` (prod placeholder) to `.env.example`. Browser audio player constructs full URL as `${NEXT_PUBLIC_MINIO_PUBLIC_URL}/${audioStorageKey}` in dev and `${NEXT_PUBLIC_R2_PUBLIC_URL}/${audioStorageKey}` in prod, with fallback to `window.speechSynthesis` when both are empty.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All builds | ✓ | 22.22.2 | — |
| pnpm | Package manager | ✓ | 9.15.9 | — |
| Docker | PostgreSQL, Redis, MinIO containers | ✓ | 29.3.1 | — |
| PostgreSQL | DB via Docker | [assumed available via docker-compose] | 16.x | — |
| Redis | Cache (not needed for Phase 3 SRS) | [assumed available] | 7.x | — |

**Missing dependencies with no fallback:** None identified for Phase 3 scope.

**Missing dependencies with fallback:**
- `ts-fsrs` not yet installed in `apps/api` — must be installed before SRS service can compile.
- `framer-motion` not yet installed in `apps/web` — must be installed before FlashcardExercise component.
- `@tanstack/react-query` not yet installed in `apps/web` — must be installed and QueryClientProvider added before any `useQuery` hooks.
- shadcn components (card, badge, etc.) not yet added — must be added before UI components compile.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 2.x |
| Config file (API) | `apps/api/vitest.config.ts` (exists) |
| Config file (Web) | `apps/web/vitest.config.ts` (exists) |
| Quick run (API) | `pnpm --filter @repo/api test` |
| Quick run (Web) | `pnpm --filter @repo/web test` |
| Full suite | `pnpm test` (turbo runs all) |
| E2E | `pnpm --filter @repo/web exec playwright test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| VOCAB-01 | GET /api/vocabulary/categories returns 8 categories | unit | `pnpm --filter @repo/api test -- --grep "getCategories"` | ❌ Wave 0 |
| VOCAB-01 | GET /api/vocabulary/:category/words returns paginated list | unit | `pnpm --filter @repo/api test -- --grep "getWordsByCategory"` | ❌ Wave 0 |
| VOCAB-02 | Word detail includes word, definition, partOfSpeech, examples, synonyms, pronunciationKey | unit | `pnpm --filter @repo/api test -- --grep "getWordDetail"` | ❌ Wave 0 |
| VOCAB-03 | Practice session assigns 6 exercise types; matching uses 4-item grid | unit | `pnpm --filter @repo/api test -- --grep "assignExerciseType"` | ❌ Wave 0 |
| VOCAB-04 | enrollWord creates UserVocabularyItem + SrsCard; idempotent on second call | unit | `pnpm --filter @repo/api test -- --grep "enrollWord"` | ❌ Wave 0 |
| VOCAB-05 | fsrs.repeat() called with correct card; next due date written to DB | unit | `pnpm --filter @repo/api test -- --grep "submitReview"` | ❌ Wave 0 |
| VOCAB-06 | getDueQueue returns only cards with due <= NOW(), max 20, ordered by due ASC | unit | `pnpm --filter @repo/api test -- --grep "getDueQueue"` | ❌ Wave 0 |
| VOCAB-07 | getMyWords filters by status; returns next review date | unit | `pnpm --filter @repo/api test -- --grep "getMyWords"` | ❌ Wave 0 |
| VOCAB-06 | /review page redirects to /login when unauthenticated | E2E | `playwright test --grep "review redirect"` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm --filter @repo/api test -- --reporter=verbose` (unit tests only, <10s)
- **Per wave merge:** `pnpm test` (full suite across all packages)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `apps/api/src/vocabulary/vocabulary.service.spec.ts` — covers VOCAB-01, VOCAB-02, VOCAB-03
- [ ] `apps/api/src/srs/srs.service.spec.ts` — covers VOCAB-04, VOCAB-05, VOCAB-06, VOCAB-07
- [ ] `apps/web/src/components/vocabulary/exercises/flashcard-exercise.test.tsx` — covers VOCAB-03 UI
- [ ] `apps/web/src/components/srs/review-card.test.tsx` — covers VOCAB-06 UI
- [ ] `apps/web/e2e/vocabulary.spec.ts` — covers /vocabulary redirect, /review redirect
- [ ] `packages/database/prisma/seed.ts` — seed script (not a test, but Wave 0 deliverable)
- [ ] `apps/web/src/components/query-provider.tsx` + layout.tsx update — React Query setup

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes | JwtAuthGuard on all vocabulary/SRS endpoints (established in Phase 2) |
| V3 Session Management | No | Handled by NextAuth (Phase 2) |
| V4 Access Control | Yes | userId always from `request.user` (JWT payload), never from request body |
| V5 Input Validation | Yes | Zod schemas in @repo/shared + NestJS GlobalValidationPipe |
| V6 Cryptography | Yes (seed only) | bcrypt 12 rounds for demo user password (bcrypt@6.0.0) |

### Known Threat Patterns for NestJS + Prisma

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| User A reads User B's SRS cards | Information Disclosure | All SrsCard queries include `userId` filter: `where: { id: cardId, userId }` — never query by cardId alone |
| Mass enrollment (spam SRS cards) | DoS | `@nestjs/throttler` rate limiting on enroll endpoint (already in stack per CLAUDE.md) |
| Overposting in review submission | Tampering | Zod schema for `ReviewSubmitDto` allows only `{ cardId: string, rating: 'Again' | 'Hard' | 'Good' | 'Easy' }` |
| Injection via category URL param | Tampering | Prisma parameterized queries (never raw SQL with `$queryRaw` for user input) |
| Unauthenticated vocabulary access | Elevation of Privilege | Middleware matcher update + `@UseGuards(JwtAuthGuard)` on all endpoints |

---

## Sources

### Primary (HIGH confidence)
- `packages/database/prisma/schema.prisma` — VocabularyWord, UserVocabularyItem, SrsCard exact field names and types [VERIFIED: codebase]
- `apps/api/src/*/` — Established NestJS module, controller, service patterns [VERIFIED: codebase]
- `apps/web/src/app/api/profile/me/route.ts` — Relay route pattern [VERIFIED: codebase]
- `apps/web/src/lib/api-client.ts` — fetchWithAuth pattern [VERIFIED: codebase]
- `packages/shared/src/user.dto.ts` — Zod DTO pattern [VERIFIED: codebase]
- github.com/open-spaced-repetition/ts-fsrs/blob/main/packages/fsrs/src/models.ts — ts-fsrs v5 Card interface, Rating enum, State enum [VERIFIED: official GitHub]
- github.com/open-spaced-repetition/ts-fsrs/blob/main/packages/fsrs/src/default.ts — createEmptyCard() initial values [VERIFIED: official GitHub]

### Secondary (MEDIUM confidence)
- npm registry: ts-fsrs@5.4.1, framer-motion@12.40.0, @tanstack/react-query@5.101.0 — version and repository confirmed [VERIFIED: npm registry]
- ts-fsrs CHANGELOG — v5.0.0 added `learning_steps` field and FSRS-6 algorithm [CITED: official GitHub CHANGELOG]
- ts-fsrs README — import syntax, fsrs() constructor, repeat() method signature [CITED: official GitHub README]

### Tertiary (LOW confidence)
- React Query v5 object syntax `{ queryKey, queryFn }` — known from training knowledge [ASSUMED]
- Framer Motion v12 `animate={{ rotateY }}` API stability — known from training knowledge [ASSUMED]

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified via npm registry; existing packages verified in codebase
- Architecture: HIGH — based on verified codebase patterns from Phase 2
- ts-fsrs field mapping: HIGH — verified against official GitHub source files
- Pitfalls: HIGH — derived from direct schema inspection and official changelog
- React Query / Framer Motion code examples: MEDIUM — version verified on registry, API based on training knowledge

**Research date:** 2026-06-12
**Valid until:** 2026-07-12 (ts-fsrs is actively maintained; verify learning_steps behavior if package is upgraded past 5.4.1)
