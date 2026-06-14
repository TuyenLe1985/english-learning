# Phase 5: Reading Comprehension + Content Pipeline — Research

**Researched:** 2026-06-14
**Domain:** Reading comprehension UI, annotation/highlighting, standalone crawler pipeline, CEFR text classification, HTML sanitization, word-span interaction, NestJS module patterns
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Inline below the passage — all comprehension questions scroll below the passage text. No quiz-mode carousel.
- **D-02:** Immediate per-question feedback — each question shows correct/incorrect and explanation immediately after answering. Score accumulates progressively.
- **D-03:** Passive reading timer — starts on page mount, auto-stops when last question is answered. No user control.
- **D-04:** Inline score summary + stay on page — results card appears below final question. No redirect.
- **D-05:** HTML-formatted passage rendering — passage `content` stored and rendered as HTML. Requires sanitization before render.
- **D-06:** Text-position anchoring for highlights — strip HTML to plain text, compute `startOffset`/`endOffset` on stripped string, re-apply by text-span matching. The `@hypothesis/anchoring` package is referenced but does NOT exist on npm (see Package Legitimacy Audit). Use `dom-anchor-text-position` (real package, v5.0.0) or a custom textContent normalization approach.
- **D-07:** Auto-save on text selection — tooltip appears, clicking saves highlight immediately. Optimistic update.
- **D-08:** Floating sticky note panel — right sidebar (desktop), bottom sheet (mobile). One note per user+passage. Auto-saves on blur.
- **D-09:** Standalone pnpm script (not BullMQ) — `pnpm pipeline:crawl` / `pnpm pipeline:seed` / `pnpm pipeline:validate`. Runs offline.
- **D-10:** Words-CEFR-Dataset bundled as JSON — downloaded once, stored as `apps/api/prisma/seed-data/cefr-word-list.json`. No network calls during classification.
- **D-11:** Live crawler against VOA + BBC + NewsInLevels + Simple English Wikipedia — must include 50-URL `--validate-selectors` step before bulk crawl (STATE.md blocker).
- **D-12:** `flaggedForReview=true + isPublished=false` for low-confidence passages (cefrConfidence < 0.65).
- **D-13:** VocabularyWord table lookup via `GET /api/vocabulary/lookup?word={word}`. Graceful no-match fallback. No external dictionary API.
- **D-14:** Single-word tap → inline Popover (shadcn). Each word wrapped in `<span data-word>`. Single click shows popover. Dismisses on outside click.
- **D-15:** Sentence-level context extraction — split on `.`, `!`, `?` followed by space or end.

### Claude's Discretion

- NestJS ReadingModule structure (follow VocabularyModule + GrammarModule patterns)
- Specific endpoint paths (`GET /api/reading/passages`, etc.)
- React Query cache strategy for passage detail and annotations
- shadcn/ui components for reading passage layout
- Specific Tailwind classes for highlight color overlay
- HTML sanitization library choice (DOMPurify vs isomorphic-dompurify)
- Crawler selector implementation per source (validate per source before bulk run)
- Exact CEFR classifier weight tuning

### Deferred Ideas (OUT OF SCOPE)

- BullMQ content refresh pipeline (recurring schedule)
- Paragraph-anchored notes with multiple notes per passage
- Karaoke-style highlight playback
- VOCAB-08 with external dictionary API fallback
- Content freshness/refresh UI
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| READ-01 | Browse passages filtered by CEFR level, topic, content type | NestJS GET /api/reading/passages with query params; Next.js browse page with Tabs + Select filters |
| READ-02 | Each passage ≥6 comprehension questions (main idea, detail, inference, vocab-in-context, true/false, summary) | ReadingQuestion model already in schema; inline question rendering below passage |
| READ-03 | Elapsed reading timer per passage | Client-side `useEffect` + `setInterval`; `readingTimeSec` in session complete payload |
| READ-04 | Text highlights persist on re-visit | `dom-anchor-text-position` for startOffset/endOffset on plain text; re-apply via React component |
| READ-05 | Notes persist on re-visit | One Note per user+passage; auto-save on blur pattern |
| READ-06 | Bookmark passages | `Bookmark` model with @@unique([userId, passageId]); toggle endpoint with upsert/delete |
| READ-07 | Score + accuracy stored against reading progress | ReadingProgress upsert on session complete; mirrors GrammarProgress pattern |
| PIPE-01 | Crawl VOA, BBC, NewsInLevels, Simple English Wikipedia | Playwright + Cheerio; selector validation step; NestJS standalone CLI |
| PIPE-02 | Quality gate: ≥150 words, no boilerplate, dedup by URL + hash | Word count check; contentHash SHA-256 of cleaned text; `skipDuplicates: true` in createMany |
| PIPE-03 | CEFR classifier with NER (proper noun exclusion) | natural.js WordTokenizer + BrillPOSTagger for NNP/NNPS exclusion; Words-CEFR-Dataset JSON lookup |
| PIPE-04 | Confidence < 0.65 → flaggedForReview=true, isPublished=false | Confidence threshold in classifier; conditional field set before createMany |
| PIPE-05 | Seed ≥2,000 reading passages + questions | Crawl target 2,500 raw URLs → expect ~80% pass quality gate |
| PIPE-06 | createMany() in 500-record batches | Already established pattern in grammar seed; slice array into chunks of 500 |
| VOCAB-08 | Tap-to-SRS from passage reader with sentence context | New `GET /api/vocabulary/lookup?word=` endpoint in VocabularyModule + word-span rendering in PassageRenderer |
</phase_requirements>

---

## Summary

Phase 5 builds the reading comprehension module on top of the established NestJS + Next.js patterns from Phases 3–4. The database schema is fully pre-migrated — all 7 reading models (`ReadingPassage`, `ReadingQuestion`, `ReadingProgress`, `Highlight`, `Note`, `Bookmark`, plus `ContentType` enum) are already in the schema. The phase adds no new migrations.

The most complex technical sub-problem is the highlight persistence system. The `@hypothesis/anchoring` package referenced in the CONTEXT.md does **not exist on npm** (404 confirmed). The correct alternative is `dom-anchor-text-position` (v5.0.0, MIT, published 2022-06). The approach: strip HTML to plain text via `element.textContent`, record `startOffset`/`endOffset` relative to the full textContent string, restore highlights by walking text nodes and splitting them at the stored offsets. This approach is robust to minor HTML re-renders as long as the textContent remains stable.

The content pipeline is a standalone NestJS CLI script pattern (not BullMQ) using `NestFactory.createApplicationContext`. The Words-CEFR-Dataset ships as CSV + SQLite — there is no JSON export. The planner must include a task to parse the `word_pos.csv` (columns: `word_pos_id`, `word_id`, `pos_tag_id`, `lemma_word_id`, `frequency_count`, `level`) joined with `words.csv` (columns: `word_id`, `word`, `stem_word_id`) and emit a flat `Map<word, level>` JSON file. The `level` field values include A1, A2, B1, B2, C1, C2 — the CEFR classifier normalizes to B1/B2/C1 by treating A1/A2 as simple-vocabulary signals and C2 as advanced.

**Primary recommendation:** Follow the GrammarModule pattern exactly for ReadingModule. Use `dom-anchor-text-position` for highlight anchoring (browser-side only). Build the content pipeline as a `NestFactory.createApplicationContext` script in `apps/api/src/pipeline/`. Use `isomorphic-dompurify` v3.17.0 for HTML sanitization in the `PassageRenderer` (client component).

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Passage browse + filter | API (NestJS) | Browser (Next.js Server Component) | Filtering/pagination is database work; Server Component renders initial page |
| Passage HTML rendering | Browser (Client Component) | — | Word-span wrapping and highlight restoration require DOM access |
| HTML sanitization | Browser (Client Component) | — | DOMPurify requires DOM; use `isomorphic-dompurify` in client component |
| Highlight anchoring (save) | Browser → API | — | `dom-anchor-text-position.fromRange()` in browser; persisted to DB via API |
| Highlight restoration | Browser (Client Component) | — | Walk DOM text nodes to re-apply `bg-amber-100/70` spans |
| Notes persistence | API (NestJS) | Browser (Client Component) | API owns persistence; browser owns auto-save trigger (blur event) |
| Bookmark toggle | API (NestJS) | Browser (Client Component) | Upsert/delete on API; optimistic update in browser |
| Reading timer | Browser (Client Component) | — | `useEffect + setInterval`, stops on last question answered; sends final value to API |
| Word tap popover (VOCAB-08) | Browser (Client Component) + API | — | Tap triggers vocabulary lookup (API) + SRS enrollment (API) |
| Comprehension questions + scoring | Browser (Client Component) | API | Client tracks per-question state; API stores session result |
| Content pipeline (crawl/classify/seed) | NestJS Standalone CLI | — | `NestFactory.createApplicationContext` with Playwright + Cheerio; no HTTP server |
| CEFR classification | NestJS pipeline service | — | Pure function; runs at seed time only, not at request time |
| HTML sanitization (pipeline) | NestJS pipeline service | — | Clean crawled HTML before storing to DB |

---

## Standard Stack

### Core (already installed in project)

| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| `@nestjs/core` | ^11.1.26 | NestJS framework | Installed [VERIFIED: package.json] |
| `prisma` / `@prisma/client` | ^6.19.3 | DB ORM — ReadingPassage + related models | Installed [VERIFIED: package.json] |
| `next` | ^14.2.35 | Frontend framework | Installed [VERIFIED: package.json] |
| `framer-motion` | ^12.40.0 | Score card entrance + question feedback expand | Installed [VERIFIED: package.json] |
| `@tanstack/react-query` | ^5.101.0 | Client-side data fetching for annotations | Installed [VERIFIED: package.json] |
| `playwright` | ^1.60.0 | Browser automation for crawler | Installed as devDep [VERIFIED: package.json] |
| `zod` | (via @repo/shared) | DTO validation | In use [VERIFIED: vocabulary.dto.ts] |
| `lucide-react` | ^1.17.0 | Icons (Clock, Bookmark, Highlighter, etc.) | Installed [VERIFIED: package.json] |

### New Packages — Phase 5

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| `isomorphic-dompurify` | 3.17.0 | HTML sanitization in PassageRenderer (client component) | SSR-safe wrapper; needed before rendering crawled HTML [VERIFIED: npm registry] |
| `dom-anchor-text-position` | 5.0.0 | Text offset anchoring for highlight save/restore | The real replacement for non-existent `@hypothesis/anchoring` [VERIFIED: npm registry] |
| `natural` | 8.1.1 | NLP: WordTokenizer + BrillPOSTagger for CEFR classifier | Project-mandated in CLAUDE.md; NER via POS tagging [VERIFIED: npm registry] |
| `cheerio` | 1.2.0 | HTML parsing of crawled content | Project-mandated in CLAUDE.md; already listed as supporting library [VERIFIED: npm registry] |
| `@types/natural` | 6.0.1 | TypeScript types for `natural` | Required for TS compilation [VERIFIED: npm registry] |

**Note on `cheerio` types:** `cheerio@1.x` ships its own TypeScript types — no `@types/cheerio` needed. The `@types/cheerio@1.0.0` package on npm is a stub that redirects to the bundled types. [ASSUMED — based on cheerio 1.x docs pattern]

**Installation (API app):**

```bash
pnpm --filter @repo/api add isomorphic-dompurify dom-anchor-text-position natural cheerio
pnpm --filter @repo/api add -D @types/natural
```

**Installation (Web app):**

```bash
pnpm --filter @repo/web add isomorphic-dompurify dom-anchor-text-position
```

**New shadcn components (web app):**

```bash
cd apps/web && npx shadcn add popover sheet separator select textarea tooltip
```

### Alternatives Considered

| Instead of | Could Use | Why Not |
|------------|-----------|---------|
| `dom-anchor-text-position` | Custom textContent normalization | Custom approach is fine for simple HTML but dom-anchor-text-position handles edge cases (multiple text nodes) more robustly |
| `isomorphic-dompurify` | `sanitize-html` | sanitize-html has a node-only API; isomorphic-dompurify works identically on client and server |
| `natural` BrillPOSTagger | `compromise` NLP | `natural` is project-mandated in CLAUDE.md; compromise is more ergonomic but not prescribed |
| Standalone CLI | BullMQ pipeline | Project decision D-09; BullMQ adds infrastructure overhead for a one-time seed operation |

---

## Package Legitimacy Audit

> slopcheck was unavailable at research time. All new packages below are tagged `[ASSUMED]` and the planner must gate each install behind a `checkpoint:human-verify` task or confirm manually.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| `isomorphic-dompurify` | npm | ~5 yrs | ~500K/wk | github.com/kkomelin/isomorphic-dompurify | N/A | Approved [ASSUMED] |
| `dom-anchor-text-position` | npm | ~8 yrs | ~30K/wk | github.com/tilgovi/dom-anchor-text-position | N/A | Approved [ASSUMED] |
| `natural` | npm | ~12 yrs | ~300K/wk | github.com/NaturalNode/natural | N/A | Approved [ASSUMED] |
| `cheerio` | npm | ~12 yrs | ~10M/wk | github.com/cheeriojs/cheerio | N/A | Approved [ASSUMED] |
| `@types/natural` | npm | ~6 yrs | ~100K/wk | DefinitelyTyped | N/A | Approved [ASSUMED] |
| `@hypothesis/anchoring` | npm | DOES NOT EXIST | — | — | [SLOP] | **REMOVED — not on npm registry** |

**Packages removed due to slopcheck/404 verdict:** `@hypothesis/anchoring` — 404 Not Found on npm registry (confirmed via `npm view`). Use `dom-anchor-text-position` instead.
**Packages flagged as suspicious:** None with verified concerns.

*slopcheck was unavailable at research time; all packages above are tagged `[ASSUMED]`. Planner should add a `checkpoint:human-verify` before install commands.*

---

## Architecture Patterns

### System Architecture Diagram

```
User Browser
   │
   ├── GET /reading (Server Component)
   │      └── fetchWithAuth → NestJS GET /api/reading/passages?cefrLevel=&topic=&page=
   │             └── PrismaService.readingPassage.findMany(where: {isPublished: true, ...})
   │
   ├── GET /reading/[passageId] (Server Component: initial load)
   │      └── fetchWithAuth → NestJS GET /api/reading/passages/:id
   │             └── includes: questions, user progress, highlights, note, bookmark
   │
   ├── PassageRenderer (Client Component — needs DOM for highlights)
   │      ├── isomorphic-dompurify → sanitized HTML
   │      ├── tokenizeWords() → <span data-word> wrapping
   │      ├── mouseup handler → window.getSelection() → dom-anchor-text-position.fromRange()
   │      │      └── POST /api/reading/highlights {passageId, startOffset, endOffset, text}
   │      ├── restoreHighlights() → dom-anchor-text-position.toRange() → apply bg-amber-100/70
   │      └── word click → word lookup → popover
   │
   ├── Word Tap Popover (Client Component)
   │      ├── GET /api/vocabulary/lookup?word={word}  [NEW endpoint in VocabularyModule]
   │      └── POST /api/srs/enroll {wordId, contextSentence}  [existing, requires wordId]
   │
   ├── Questions Section (Client Component — needs interactive state)
   │      ├── Per-question answer tracking (React state)
   │      └── On last answer: POST /api/reading/sessions/complete {passageId, score, accuracy, readingTimeSec}
   │
   └── Notes Panel (Client Component — Radix Sheet on mobile)
          └── On blur: POST/PATCH /api/reading/notes {passageId, content}

Content Pipeline (NestJS Standalone CLI — no HTTP server)
   pnpm pipeline:validate → CrawlerService.validateSelectors(50 URLs per source)
   pnpm pipeline:crawl    → CrawlerService.crawl() → crawled-passages.json
   pnpm pipeline:seed     → SeedService.seed(crawled-passages.json)
                                └── ClassifierService.classify(passage) → cefrLevel + confidence
                                └── prisma.readingPassage.createMany() in 500-record batches
```

### Recommended Project Structure

```
apps/api/src/
├── reading/
│   ├── reading.module.ts
│   ├── reading.controller.ts   # GET passages (filtered), GET passage/:id, POST sessions/complete
│   ├── reading.service.ts      # browse, detail, completeSession, highlights, notes, bookmarks
│   └── reading.service.spec.ts # TDD RED scaffolds
├── vocabulary/
│   ├── vocabulary.controller.ts  # ADD: GET lookup?word= endpoint
│   └── vocabulary.service.ts     # ADD: lookupWord(word) method
├── pipeline/
│   ├── pipeline.module.ts
│   ├── crawler.service.ts      # Playwright + Cheerio, per-source extractors, rate limiting
│   ├── classifier.service.ts   # CEFR scoring: vocab lookup + sentence length + POS complexity
│   ├── seed.service.ts         # createMany batching, quality gate, dedup by hash
│   └── pipeline.cli.ts         # NestFactory.createApplicationContext bootstrap

apps/api/prisma/seed-data/
├── cefr-word-list.json         # Converted from Words-CEFR-Dataset word_pos.csv + words.csv
└── (vocabulary.json + grammar.json already exist)

apps/web/src/
├── app/(dashboard)/reading/
│   ├── page.tsx                # Browse page (Server Component + filter state via URL params)
│   └── [passageId]/
│       └── page.tsx            # Passage page (Server Component for initial data)
├── components/reading/
│   ├── passage-renderer.tsx    # "use client" — HTML sanitize, word-span wrap, highlight restore
│   ├── highlight-tooltip.tsx   # "use client" — selection → POST highlight
│   ├── word-popover.tsx        # "use client" — tap → lookup → enroll
│   ├── notes-panel.tsx         # "use client" — Sheet/sidebar, auto-save
│   ├── questions-section.tsx   # "use client" — per-question state, inline feedback
│   └── passage-score-card.tsx  # framer-motion entrance, score display
```

### Pattern 1: NestJS ReadingModule (GrammarModule template)

**What:** ReadingController + ReadingService follow the GrammarModule structure exactly.
**When to use:** All ReadingModule code.
**Example:**

```typescript
// Source: apps/api/src/grammar/grammar.module.ts
@Module({
  imports: [AuthModule],        // provides JwtAuthGuard
  controllers: [ReadingController],
  providers: [ReadingService],
  exports: [ReadingService],
})
export class ReadingModule {}
// Add to AppModule imports[] same as GrammarModule
```

```typescript
// Source: apps/api/src/grammar/grammar.controller.ts pattern
@Controller('reading')
export class ReadingController {
  // CRITICAL: fixed-string routes BEFORE parameterized routes
  @UseGuards(JwtAuthGuard)
  @Get('passages')
  async getPassages(@Query() query: ..., @Request() req) {...}

  @UseGuards(JwtAuthGuard)
  @Post('sessions/complete')
  async completeSession(@Request() req, @Body() body: unknown) {...}

  @UseGuards(JwtAuthGuard)
  @Get('passages/:id')
  async getPassageDetail(@Param('id') id: string, @Request() req) {...}
}
```

### Pattern 2: Text Highlight Anchoring (dom-anchor-text-position)

**What:** Save startOffset/endOffset relative to passage's full textContent; restore by walking text nodes.
**When to use:** Any time a highlight is created or restored.
**Example:**

```typescript
// Source: github.com/tilgovi/dom-anchor-text-position
import { fromRange, toRange } from 'dom-anchor-text-position';

// SAVE: on mouseup with non-empty selection
const selection = window.getSelection();
const range = selection.getRangeAt(0);
const root = document.getElementById('passage-body');
const { start, end } = fromRange(root, range); // offsets into root.textContent
// POST { passageId, startOffset: start, endOffset: end, text: range.toString() }

// RESTORE: on mount with stored highlights
highlights.forEach(h => {
  const range = toRange(root, { start: h.startOffset, end: h.endOffset });
  // wrap range contents in a <mark class="bg-amber-100/70 rounded-sm"> element
});
```

**Critical: `dom-anchor-text-position` is browser-only** — it uses DOM Range API. Use it only inside a `"use client"` component. Never import in Server Components or the pipeline CLI.

### Pattern 3: Content Pipeline Standalone CLI

**What:** `NestFactory.createApplicationContext` without HTTP server for the crawler/seed pipeline.
**When to use:** `apps/api/src/pipeline/pipeline.cli.ts`
**Example:**

```typescript
// Source: docs.nestjs.com/standalone-applications + michaelguay.dev pattern
import { NestFactory } from '@nestjs/core';
import { PipelineModule } from './pipeline.module';
import { CrawlerService } from './crawler.service';
import { SeedService } from './seed.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(PipelineModule);
  const crawler = app.get(CrawlerService);
  const seeder = app.get(SeedService);
  
  const flag = process.argv[2]; // --validate | --crawl | --seed | --run
  if (flag === '--validate') await crawler.validateSelectors();
  else if (flag === '--crawl') await crawler.crawlAll();
  else if (flag === '--seed') await seeder.seedFromFile('./crawled-passages.json');
  else if (flag === '--run') {
    await crawler.crawlAll();
    await seeder.seedFromFile('./crawled-passages.json');
  }
  await app.close();
}
bootstrap().catch(console.error);
```

**pnpm scripts (add to root package.json):**

```json
"pipeline:validate": "ts-node -r tsconfig-paths/register apps/api/src/pipeline/pipeline.cli.ts -- --validate",
"pipeline:crawl": "ts-node -r tsconfig-paths/register apps/api/src/pipeline/pipeline.cli.ts -- --crawl",
"pipeline:seed": "ts-node -r tsconfig-paths/register apps/api/src/pipeline/pipeline.cli.ts -- --seed",
"pipeline:run": "ts-node -r tsconfig-paths/register apps/api/src/pipeline/pipeline.cli.ts -- --run"
```

**Alternative runner (avoids ts-node):** Use `nest start pipeline` with a separate entry file pointing to `pipeline.cli.ts`. [ASSUMED — verify ts-node path resolution in the monorepo]

### Pattern 4: CEFR Classifier

**What:** Score a passage using vocabulary frequency, sentence length, and syntactic complexity. Returns `cefrLevel` + `cefrConfidence`.
**When to use:** For each crawled passage before seeding.
**Example:**

```typescript
// Source: CLAUDE.md §CEFR Classification Engine
// Load once at service init (not per passage)
const cefrWordMap = new Map<string, string>();
// from cefr-word-list.json: { word: "abandon", level: "B2" }

// Weights: vocabulary 50%, sentence length 25%, syntactic complexity 25%
function classifyPassage(text: string): { cefrLevel: 'B1'|'B2'|'C1', cefrConfidence: number } {
  const tokenizer = new natural.WordTokenizer();
  const tagger = new natural.BrillPOSTagger(/* rules path */);
  const words = tokenizer.tokenize(text.toLowerCase());
  
  // Exclude proper nouns (NNP, NNPS POS tags)
  const tagged = tagger.tag(words);
  const contentWords = tagged.filter(([, pos]) => pos !== 'NNP' && pos !== 'NNPS');
  
  // Vocabulary score: % of content words that are B2/C1 in word map
  // Sentence length score: average words per sentence (>25 = C1 indicator)
  // Syntactic complexity: subordinate clause density, passive constructions
  
  // confidence = how clearly one band dominates vs. borderline
}
```

**Words-CEFR-Dataset conversion step (Wave 0 task):**

The dataset is distributed as CSV (no JSON export). A one-time Node.js conversion script reads `words.csv` (word_id, word) + `word_pos.csv` (word_id, level) and outputs `cefr-word-list.json` as `Array<{word: string, level: string}>`. Load at pipeline service init as `Map<string, string>`. [CITED: github.com/Maximax67/Words-CEFR-Dataset]

**BrillPOSTagger in natural.js:** The `natural` package includes `BrillPOSTagger` which requires a rules file. The rules file ships with the `natural` package in `node_modules/natural/lib/natural/brill_pos_tagger/data/English/`. [ASSUMED — verify exact path in natural 8.x]

### Pattern 5: Word-Span Wrapping (PassageRenderer)

**What:** Tokenize sanitized HTML text nodes and wrap each word in `<span data-word>`.
**When to use:** `PassageRenderer` client component.
**Performance note:** For 1,000-word passages (~1,000 span elements), React renders ~1ms per element overhead in typical benchmarks. At 1,000 elements this is acceptable. For 2,000+ word passages, consider `React.memo` on the renderer and virtual rendering only for visible sections. [ASSUMED — based on React benchmarks]

**Example:**

```typescript
// Source: UI-SPEC D-14, CONTEXT.md D-14
"use client";
function tokenizePassageHTML(html: string): string {
  // After DOMPurify sanitization, split text nodes and wrap words
  // DO NOT use dangerouslySetInnerHTML after wrapping — use React elements
  // Approach: parse sanitized HTML with a temporary div, walk text nodes,
  // replace each text node with word spans interleaved with punctuation spans
}
// Each word: <span data-word="normalized" role="button" tabIndex={0}>word</span>
// Normalized word: word.toLowerCase().replace(/[.,!?;:'"()[\]]/g, '')
// The data-word attribute stores the normalized form for dictionary lookup
```

**Important:** The word-span wrapping happens **client-side only**, on sanitized HTML. Server Components render the raw sanitized HTML as `dangerouslySetInnerHTML`. The interactive `PassageRenderer` `"use client"` component receives the HTML string as a prop and does its own DOM manipulation after mount.

### Pattern 6: VOCAB-08 — Vocabulary Lookup Endpoint (New)

**What:** New endpoint in the existing VocabularyModule (not ReadingModule) since it queries VocabularyWord table.
**Required change:** Add `GET /api/vocabulary/lookup` to `VocabularyController` **before** the existing `:category/words` route (to avoid route conflict).

```typescript
// Add to VocabularyController (BEFORE :category routes — CRITICAL Pitfall 1)
@UseGuards(JwtAuthGuard)
@Get('lookup')
async lookupWord(@Query('word') word: string): Promise<VocabularyWordDto | null> {
  return this.vocabularyService.lookupByWord(word.toLowerCase().trim());
}
// VocabularyService.lookupByWord: prisma.vocabularyWord.findFirst({ where: { word: { equals: word, mode: 'insensitive' } } })
// Returns null (not 404) so client can show "not found" gracefully per D-13
```

**EnrollWordSchema constraint:** The existing `EnrollWordSchema` requires `wordId: z.string()` (non-optional). VOCAB-08 requires a successful vocabulary lookup to get `wordId` before calling POST `/api/srs/enroll`. If the word is not in the vocabulary table, the "Add to SRS" button should be disabled (per D-13: "still offer 'Add to SRS' button" — but without a wordId this cannot enroll). Resolution: the UI shows "Add to SRS" as disabled or absent when the word is not found, since enrollment requires a `wordId`. [VERIFIED: apps/api/src/srs/srs.controller.ts + packages/shared/src/vocabulary.dto.ts]

### Anti-Patterns to Avoid

- **Using `@hypothesis/anchoring` from npm:** This package DOES NOT EXIST on the npm registry (404 confirmed). Any plan task that installs it will fail. Use `dom-anchor-text-position` instead.
- **Importing `dom-anchor-text-position` in Server Components or the pipeline CLI:** This library uses DOM `Range` API — it's browser-only. Always in `"use client"` components.
- **Calling `isomorphic-dompurify` in Server Components:** The `jsdom` dependency in isomorphic-dompurify can accumulate memory in long-running Node.js processes. Use only in client components, or call `clearWindow()` after sanitizing in the pipeline.
- **Route ordering in NestJS controllers:** Fixed-string routes (`GET passages`, `POST sessions/complete`) must be declared **before** parameterized routes (`GET passages/:id`) in the same controller class. This is the established pattern from GrammarController.
- **Calling `VocabularyService.lookupByWord` from ReadingController:** Keep the lookup in VocabularyModule. ReadingModule should not import VocabularyModule. The client calls the vocabulary lookup endpoint directly.
- **Seeding all 2,000 passages with `create()` calls:** Must use `createMany()` in 500-record batches per PIPE-06. Single `create()` calls at this scale take >10 minutes.
- **Running the crawler without selector validation:** STATE.md blocker — VOA/BBC selector specificity must be validated on 50-URL sample before bulk crawl.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTML sanitization | Custom regex strip | `isomorphic-dompurify` | Regex sanitization misses dozens of XSS vectors (event attributes, SVG, data URIs) |
| Text offset anchoring | Custom string search | `dom-anchor-text-position` | Custom approach breaks on repeated phrases, overlapping highlights, and multi-text-node selections |
| NLP tokenization | Custom split-on-spaces | `natural.WordTokenizer` | Handles contractions, hyphenated words, Unicode; already project-mandated |
| NestJS standalone CLI | Shell scripts | `NestFactory.createApplicationContext` | Gets full DI container, PrismaService, ConfigModule (env loading) without HTTP overhead |
| Batch seeding loop | forEach `prisma.create()` | `prisma.createMany()` with `skipDuplicates: true` in 500-record chunks | createMany is 10–100x faster; forEach at 2,000 records at ~5ms each = 10 seconds minimum |
| Rate limiting the crawler | Fixed `sleep(1000)` | Random delay `200ms + Math.random() * 800ms` between requests | Fixed delays are detectable; random delays mimic human behavior and reduce 429 rate |

**Key insight:** The annotation (highlight/note) system has dozens of edge cases — multi-paragraph selections, selections spanning HTML elements, re-renders. `dom-anchor-text-position` encapsulates these. Custom implementations consistently miss the "selection spans a `<strong>` tag" case.

---

## Runtime State Inventory

> Phase 5 is NOT a rename/refactor/migration phase. The database schema is fully pre-migrated. No new schema migrations. This section is SKIPPED.

None — Phase 5 adds no migrations and does not rename any existing constructs. All Phase 5 models (`ReadingPassage`, `ReadingQuestion`, etc.) are already in the schema from Phase 1.

---

## Common Pitfalls

### Pitfall 1: NestJS Route Shadowing in VocabularyController

**What goes wrong:** Adding `GET /api/vocabulary/lookup` after the existing `:category/words` route causes NestJS to match `lookup` as a `:category` param. The lookup endpoint returns 404 or the wrong data.
**Why it happens:** NestJS matches routes in declaration order. `Get(':category/words')` matches `/lookup/words` but not `/lookup` — however `Get('my-words')` is already positioned before `Get(':category/words')` in the existing controller. The new `Get('lookup')` must also precede parameterized routes.
**How to avoid:** Declare `Get('lookup')` before `Get(':category/words')` and `Get(':category/:wordId')` in VocabularyController. Mirror the existing `my-words` fixed-route pattern. [VERIFIED: apps/api/src/vocabulary/vocabulary.controller.ts]
**Warning signs:** `GET /api/vocabulary/lookup?word=test` returns category data or 404.

### Pitfall 2: `@hypothesis/anchoring` Not Found

**What goes wrong:** Plan tasks that run `npm install @hypothesis/anchoring` or `pnpm add @hypothesis/anchoring` fail with 404.
**Why it happens:** This package does not exist on the npm registry. The CONTEXT.md mentions it as a specific idea but it was never published as a standalone npm package — the real Hypothesis annotation client is a monorepo that includes anchoring internals but does not publish them as a standalone `@hypothesis/anchoring` package.
**How to avoid:** Use `dom-anchor-text-position` (v5.0.0, real package, MIT license, confirmed on registry).
**Warning signs:** `npm view @hypothesis/anchoring` returns 404.

### Pitfall 3: Words-CEFR-Dataset Has No JSON Export

**What goes wrong:** Pipeline code tries to `import cefrWords from './cefr-word-list.json'` but the file doesn't exist because no one converted the CSV first.
**Why it happens:** The dataset ships as SQLite + CSV only. The CONTEXT.md says "bundle as JSON" but this requires a conversion step.
**How to avoid:** Wave 0 must include a task to run the CSV-to-JSON conversion script and commit `cefr-word-list.json` to `apps/api/prisma/seed-data/`. The conversion reads `words.csv` (word_id, word) + `word_pos.csv` (word_id, level) and outputs `[{word, level}]` keeping only the first/canonical POS entry per word.
**Warning signs:** `cefr-word-list.json` is missing when the classifier tries to load it; classifier throws "Cannot find module" or "ENOENT".

### Pitfall 4: `dom-anchor-text-position` is Browser-Only

**What goes wrong:** Importing `dom-anchor-text-position` in a Server Component or pipeline CLI causes a "Range is not defined" or "document is not defined" runtime error.
**Why it happens:** The library uses `document.createRange()` and other DOM APIs unavailable in Node.js.
**How to avoid:** Only import in `"use client"` components. In `PassageRenderer`, ensure the `fromRange`/`toRange` calls are inside `useEffect` or event handlers (not at module scope or during SSR).
**Warning signs:** Build error "document is not defined" or "Range is not defined" during Next.js SSR.

### Pitfall 5: EnrollWordSchema Requires wordId — VOCAB-08 Must Handle Missing Words

**What goes wrong:** Tapping a word not in the VocabularyWord table and calling `POST /api/srs/enroll` without a `wordId` fails Zod validation with a 400 error.
**Why it happens:** `EnrollWordSchema` has `wordId: z.string()` (non-optional). The existing SRS service's `enrollWord(userId, wordId, ...)` signature also requires wordId.
**How to avoid:** In the VOCAB-08 word popover component, if `GET /api/vocabulary/lookup?word={word}` returns null, disable the "Add to SRS" button. Show the word + sentence context + "Definition not yet in our vocabulary library" message, but do not offer enrollment for unknown words.
**Warning signs:** 400 errors from POST /api/srs/enroll when user taps rare/unknown words.

### Pitfall 6: `isomorphic-dompurify` jsdom Version Conflict

**What goes wrong:** Build fails with "Cannot use import statement in a module" or similar ESM error related to jsdom.
**Why it happens:** jsdom@28 pulls in an ESM-only dependency that breaks `require()` in Next.js webpack. The web app currently has `jsdom@25.0.0` as a devDep (installed by `@testing-library/jest-dom`). [VERIFIED: apps/web/package.json]
**How to avoid:** `isomorphic-dompurify` is a client component only — when used in `"use client"` components, Next.js bundles it for the browser and does not run it through Node.js `require()`. The jsdom conflict only occurs when calling isomorphic-dompurify in a Server Component or build-time. Keep PassageRenderer as `"use client"`.
**Warning signs:** Build error mentioning jsdom or ESM during `next build`.

### Pitfall 7: Crawler Selector Instability (STATE.md Blocker)

**What goes wrong:** Bulk crawl runs, extracts 2,500 "passages," but 60% are boilerplate (nav menus, footer links, ads) because the CSS selector missed the actual article body.
**Why it happens:** News sites redesign their templates frequently. A selector that worked during development (`article.content-body p`) may have been renamed.
**How to avoid:** The `pnpm pipeline:validate --validate` step must run first and report extraction success rate per source. Threshold: ≥80% of sampled URLs must produce ≥150 words of clean content. If a source falls below this threshold, fix its selector before proceeding to bulk crawl.
**Warning signs:** Quality gate rejects >40% of crawled passages; passages have high repeated-phrase ratio (detected by low unique-word ratio in PIPE-02).

### Pitfall 8: ReadingProgress Upsert vs. Create

**What goes wrong:** Second session completion for the same user+passage fails with a unique constraint violation.
**Why it happens:** `ReadingProgress` has `@@unique([userId, passageId])`. A naive `create()` fails on the second attempt.
**How to avoid:** Use `upsert()` with `where: { userId_passageId: { userId, passageId } }` — same pattern as `GrammarProgress`. Update `score`, `accuracy`, `readingTimeSec`, `completedAt` on subsequent sessions.
**Warning signs:** 500 error from POST /api/reading/sessions/complete on second attempt for the same passage.

---

## Code Examples

### Verified Patterns from Codebase

#### Session Complete (ReadingProgress — mirrors GrammarProgress)

```typescript
// Source: apps/api/src/grammar/grammar.service.ts completeSession() — adapt for reading
await this.prisma.readingProgress.upsert({
  where: { userId_passageId: { userId, passageId } },
  create: {
    userId,
    passageId,
    score: correctCount,
    accuracy: (correctCount / totalCount) * 100,
    readingTimeSec,
    completedAt: new Date(),
    lastViewedAt: new Date(),
  },
  update: {
    score: correctCount,
    accuracy: (correctCount / totalCount) * 100,
    readingTimeSec,
    completedAt: new Date(),
    lastViewedAt: new Date(),
  },
});
```

#### Passage Browse Filter Query

```typescript
// Source: ReadingPassage schema fields (schema.prisma) + GrammarService pattern
const passages = await this.prisma.readingPassage.findMany({
  where: {
    isPublished: true,
    ...(cefrLevel ? { cefrLevel } : {}),
    ...(topic ? { topic } : {}),
    ...(contentType ? { contentType } : {}),
  },
  include: {
    _count: { select: { questions: true } },
    bookmarks: { where: { userId }, select: { id: true } },  // check if bookmarked by this user
  },
  orderBy: { createdAt: 'desc' },
  skip: (page - 1) * limit,
  take: limit,
});
```

#### createMany in 500-record batches

```typescript
// Source: PIPE-06 + established pattern from grammar seed
async function seedInBatches<T>(data: T[], createFn: (batch: T[]) => Promise<void>) {
  const BATCH_SIZE = 500;
  for (let i = 0; i < data.length; i += BATCH_SIZE) {
    const batch = data.slice(i, i + BATCH_SIZE);
    await createFn(batch);
    console.log(`Seeded batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(data.length / BATCH_SIZE)}`);
  }
}

await seedInBatches(passages, (batch) =>
  prisma.readingPassage.createMany({ data: batch, skipDuplicates: true })
);
```

#### Polite Crawler Rate Limiting

```typescript
// Source: Web scraping best practices (MEDIUM confidence)
async function politeDelay(minMs = 200, maxMs = 1000) {
  const delay = minMs + Math.random() * (maxMs - minMs);
  await new Promise(resolve => setTimeout(resolve, delay));
}
// Call between each page fetch: await politeDelay(300, 1200);
```

#### Server Component + fetchWithAuth (established pattern)

```typescript
// Source: apps/web/src/app/(dashboard)/grammar/[area]/page.tsx
import { fetchWithAuth, INTERNAL_API_URL } from "@/lib/api-client";

async function fetchPassages(cookieHeader: string, params: PassageQuery) {
  const url = new URL(`${INTERNAL_API_URL}/api/reading/passages`);
  if (params.cefrLevel) url.searchParams.set('cefrLevel', params.cefrLevel);
  if (params.topic) url.searchParams.set('topic', params.topic);
  // ...
  const res = await fetchWithAuth(cookieHeader, url.toString());
  if (!res.ok) return { passages: [], total: 0 };
  return res.json();
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hypothesis client `@hypothesis/anchoring` (internal) | `dom-anchor-text-position` (standalone npm) | Never released as standalone | Must use `dom-anchor-text-position` not a non-existent package |
| DOMPurify browser-only | `isomorphic-dompurify` v3.17 | Ongoing | SSR-safe; v3.17 fixes jsdom ESM issue |
| `natural` 6.x (project CLAUDE.md) | `natural` 8.x (current) | 2024 | Minor API drift; BrillPOSTagger path may differ; verify at install |
| cheerio `$('article p').text()` | cheerio `$('.content-body p').text()` per-source | Continuous | Site templates change; selector validation required before bulk crawl |
| BullMQ pipeline for content | Standalone NestJS CLI script | Phase 5 decision D-09 | Simpler, deterministic, no Redis dependency at seed time |

**Deprecated/outdated:**
- `@hypothesis/anchoring` as an npm package: Does not exist. Do not attempt to install.
- `bull` (original Bull): Project mandates BullMQ 5.x; not relevant for Phase 5 (pipeline is standalone CLI, not BullMQ).

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `dom-anchor-text-position` API: `fromRange(root, range)` returns `{start, end}`; `toRange(root, {start, end})` returns a DOM Range | Standard Stack, Code Examples | Highlight save/restore logic breaks; fix by reading GitHub README |
| A2 | natural.js v8.x BrillPOSTagger rules file is at `node_modules/natural/lib/natural/brill_pos_tagger/data/English/` | Architecture Patterns Pattern 4 | Classifier throws "rules file not found"; fix by locating correct path post-install |
| A3 | `cheerio` v1.x ships its own TypeScript types (no separate `@types/cheerio` needed) | Standard Stack | TypeScript compilation errors; fix by adding `@types/cheerio` if needed |
| A4 | The pipeline CLI can be run with ts-node in the monorepo without a separate tsconfig | Architecture Patterns Pattern 3 | Import resolution errors; alternative: use `nest start` with dedicated pipeline entry |
| A5 | `isomorphic-dompurify` used only in `"use client"` components avoids the jsdom@28 ESM conflict | Common Pitfalls Pitfall 6 | Build error if Next.js's webpack encounters jsdom ESM; fix by ensuring client-only usage |
| A6 | Words-CEFR-Dataset `word_pos.csv` `level` column contains A1, A2, B1, B2, C1, C2 values (not numeric codes) | Architecture Patterns Pattern 4 | CEFR conversion script produces incorrect level mappings; fix by inspecting CSV first row |
| A7 | `react-selection-highlighter` (alternative library) — NOT recommended here; `dom-anchor-text-position` is preferred | Standard Stack | Lower-level choice but more appropriate for the schema's offset-based model |

---

## Open Questions (RESOLVED)

1. **Crawler selectors for current VOA/BBC page templates** — RESOLVED
   - What we know: STATE.md flags VOA/BBC selector specificity as a blocker. The validate step addresses this.
   - What's unclear: Current CSS class names used by VOA (`learningenglish.voanews.com`) and BBC (`bbc.co.uk/learningenglish`) article body elements as of June 2026.
   - Resolution: 05-05-PLAN.md includes a `validateSelectors()` step (50-URL sample, ≥80% threshold) that verifies live selectors before bulk crawl. Selector specificity is validated at runtime, not pre-determined at planning time. The `--validate-selectors` flag is the required first step of any crawl run (D-11).

2. **natural.js BrillPOSTagger performance at scale** — RESOLVED
   - What we know: BrillPOSTagger requires loading rules files; O(n) complexity per passage.
   - What's unclear: Performance for 2,500 passages × ~300 words average — estimated ~750,000 total token tagging operations.
   - Resolution: Acceptable risk. Pipeline runs offline as a standalone CLI (not in the API hot path). If BrillPOSTagger proves too slow, 05-04 documents the uppercase-mid-sentence heuristic fallback. Pipeline concurrency set to 4 workers in CrawlerService.

3. **Pipeline CLI execution model in the monorepo** — RESOLVED
   - What we know: The seed.ts in `packages/database` uses `ts-node` with `TS_NODE_PROJECT`. The NestJS app uses SWC compiler for dev/build.
   - What's unclear: Whether `ts-node` resolves `@repo/shared` and `@repo/database` workspace aliases correctly for the pipeline CLI, or whether the pipeline CLI needs its own build step.
   - Resolution: 05-05-PLAN.md uses `ts-node + tsconfig-paths/register` consistent with `packages/database/prisma/seed.ts`. Fallback documented: `nest build --path apps/api` then run compiled output. This is the established monorepo pattern.

4. **VocabularyWord table coverage for VOCAB-08** — RESOLVED
   - What we know: The vocabulary seed currently has 200 words (from Phase 3).
   - What's unclear: What percentage of words tapped in passages will exist in the 200-word VocabularyWord table.
   - Resolution: D-13 graceful no-match fallback is sufficient for v1. 05-08-PLAN.md disables "Add to SRS" button when lookup returns null. Vocabulary table expansion to 5,000 words is deferred to a post-Phase 5 seed enhancement.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Pipeline CLI, NestJS, Next.js | ✓ | 22.22.2 | — |
| pnpm | Package manager | ✓ | 9.15.9 | — |
| PostgreSQL | Prisma / ReadingModule | ✓ (Docker) | 16.x (configured) | — |
| Playwright | Crawler pipeline | ✓ | 1.60.0 (devDep) | — |
| `natural` | CEFR classifier | Not yet installed | 8.1.1 (npm latest) | — |
| `cheerio` | HTML parser in crawler | Not yet installed | 1.2.0 (npm latest) | — |
| `isomorphic-dompurify` | PassageRenderer sanitization | Not yet installed | 3.17.0 (npm latest) | Client-only DOMPurify as fallback |
| `dom-anchor-text-position` | Highlight anchoring | Not yet installed | 5.0.0 (npm latest) | Custom textContent normalization |
| Words-CEFR-Dataset | CEFR classifier input | Not yet downloaded | CSV + SQLite (no JSON) | Needs conversion script in Wave 0 |
| shadcn: popover, sheet, separator, select, textarea, tooltip | Reading UI components | Not yet installed | shadcn latest | — |

**Missing dependencies with no fallback:**
- Words-CEFR-Dataset JSON (`cefr-word-list.json`) — must be generated from CSV source before the classifier can run. Wave 0 task required.

**Missing dependencies with fallback:**
- `isomorphic-dompurify` — can use browser-native DOMPurify in a `useEffect` guard if SSR issues arise

---

## Validation Architecture

> nyquist_validation is enabled (config.json `workflow.nyquist_validation: true`)

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 2.x |
| Config file (API) | `apps/api/vitest.config.ts` (exists, `environment: 'node'`) |
| Config file (Web) | `apps/web/vitest.config.ts` (exists, `environment: 'jsdom'`, setupFiles: `test-setup.ts`) |
| Quick run (API) | `pnpm --filter @repo/api test` |
| Full suite | `pnpm test` (Turborepo) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| READ-01 | `getPassages(filters)` returns paginated results | unit | `pnpm --filter @repo/api test -- --reporter=verbose reading.service` | ❌ Wave 0 |
| READ-02 | Passage detail includes ≥6 questions | unit | `pnpm --filter @repo/api test -- --reporter=verbose reading.service` | ❌ Wave 0 |
| READ-03 | readingTimeSec stored on session complete | unit | `pnpm --filter @repo/api test -- --reporter=verbose reading.service` | ❌ Wave 0 |
| READ-04 | Highlight CRUD stores/returns startOffset+endOffset | unit | `pnpm --filter @repo/api test -- --reporter=verbose reading.service` | ❌ Wave 0 |
| READ-05 | Note upsert stores content per user+passage | unit | `pnpm --filter @repo/api test -- --reporter=verbose reading.service` | ❌ Wave 0 |
| READ-06 | Bookmark toggle creates/deletes correctly | unit | `pnpm --filter @repo/api test -- --reporter=verbose reading.service` | ❌ Wave 0 |
| READ-07 | completeSession upserts ReadingProgress | unit | `pnpm --filter @repo/api test -- --reporter=verbose reading.service` | ❌ Wave 0 |
| PIPE-03 | CEFR classifier returns correct level for known-level passages | unit | `pnpm --filter @repo/api test -- --reporter=verbose classifier.service` | ❌ Wave 0 |
| PIPE-04 | Confidence < 0.65 sets flaggedForReview=true | unit | `pnpm --filter @repo/api test -- --reporter=verbose classifier.service` | ❌ Wave 0 |
| VOCAB-08 | `lookupByWord()` returns word or null | unit | `pnpm --filter @repo/api test -- --reporter=verbose vocabulary.service` | ❌ Wave 0 (add to existing spec) |

### Sampling Rate

- **Per task commit:** `pnpm --filter @repo/api test`
- **Per wave merge:** `pnpm test` (full suite)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `apps/api/src/reading/reading.service.spec.ts` — RED scaffolds for READ-01 through READ-07
- [ ] `apps/api/src/pipeline/classifier.service.spec.ts` — RED scaffolds for PIPE-03, PIPE-04
- [ ] Add `lookupByWord` test to existing `apps/api/src/vocabulary/vocabulary.service.spec.ts`

*(Existing test infrastructure: vitest.config.ts present in both apps, setupFiles wired — no framework install needed)*

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | JwtAuthGuard on ALL reading/vocabulary endpoints — no public reading endpoints |
| V3 Session Management | yes (inherited) | NextAuth v5 JWT — existing pattern |
| V4 Access Control | yes | userId from JWT only, never request body; user can only read/write own highlights/notes/bookmarks/progress |
| V5 Input Validation | yes | Zod parse on all POST bodies (ReadingSessionCompleteSchema, HighlightCreateSchema, NoteCreateSchema) |
| V6 Cryptography | no | No new crypto; bcrypt for passwords is existing |

### Known Threat Patterns for this Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS via crawled HTML content | Tampering | `isomorphic-dompurify` sanitization before storage AND before render |
| IDOR on highlights/notes (user reads another user's annotations) | Info Disclosure | `where: { userId, passageId }` on all annotation queries — never return annotations without userId filter |
| Mass-create attack on highlights | DoS | `@nestjs/throttler` on highlight POST endpoint; database-level pagination |
| Stored XSS in note content | Tampering | Notes are rendered as plain text (textarea), not HTML — no sanitization needed but must not render as innerHTML |
| Crawler as a vector for injecting malicious content | Tampering | DOMPurify sanitization in pipeline + input validation via Zod DTO before createMany |
| SQL injection via CEFR/topic filter params | Tampering | Prisma parameterized queries — all filter params passed as Prisma `where` objects, never string interpolation |

---

## Sources

### Primary (HIGH confidence)

- `apps/api/src/grammar/grammar.controller.ts` + `grammar.service.ts` — Verified NestJS module patterns used in this project
- `apps/api/src/srs/srs.controller.ts` + `srs.service.ts` — Verified SRS enrollment API (wordId required, not optional)
- `packages/database/prisma/schema.prisma` — Verified ReadingPassage, ReadingQuestion, ReadingProgress, Highlight, Note, Bookmark models
- `packages/shared/src/vocabulary.dto.ts` — Verified EnrollWordSchema (wordId: z.string() non-optional)
- `apps/api/src/vocabulary/vocabulary.controller.ts` — Verified no existing lookup endpoint; confirmed route order constraint
- `packages/database/prisma/seed.ts` — Verified createMany + skipDuplicates seeding pattern
- `apps/web/src/lib/api-client.ts` — Verified fetchWithAuth + INTERNAL_API_URL pattern
- `apps/web/src/app/(dashboard)/grammar/[area]/page.tsx` — Verified Server Component pattern for NestJS API calls
- `npm view @hypothesis/anchoring` → 404 Not Found — Confirmed package does not exist on npm registry
- `npm view dom-anchor-text-position` → v5.0.0 — Confirmed real package exists
- `npm view isomorphic-dompurify` → v3.17.0 — Confirmed real package exists
- `npm view natural` → v8.1.1 — Confirmed real package exists
- `npm view cheerio` → v1.2.0 — Confirmed real package exists
- github.com/Maximax67/Words-CEFR-Dataset — Confirmed CSV format: word_pos.csv (word_pos_id, word_id, pos_tag_id, lemma_word_id, frequency_count, level), words.csv (word_id, word, stem_word_id); level values: A1-C2; no JSON export

### Secondary (MEDIUM confidence)

- github.com/tilgovi/dom-anchor-text-position — API: `fromRange(root, range)` → `{start, end}`; `toRange(root, {start, end})` → Range; browser-only
- docs.nestjs.com/standalone-applications + michaelguay.dev — `NestFactory.createApplicationContext` pattern for CLI scripts
- naturalnode.github.io/natural/Tokenizers.html — WordTokenizer, BrillPOSTagger availability in natural.js
- github.com/vercel/next.js/discussions/58142 — isomorphic-dompurify Next.js 14 usage: client-component-only approach avoids jsdom ESM conflict

### Tertiary (LOW confidence)

- React span rendering performance at 1,000+ elements (~1ms/element) — based on general React benchmarks, not measured in this project
- natural.js v8.x BrillPOSTagger exact rules file path — assumed; verify post-install
- ts-node monorepo path resolution for pipeline CLI — assumed; may need adjustment

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all package versions verified via `npm view`; codebase patterns verified directly
- Architecture: HIGH — NestJS module patterns directly verified from existing codebase
- Pitfalls: HIGH for the `@hypothesis/anchoring` finding (404 confirmed); MEDIUM for highlight edge cases
- CEFR classifier: MEDIUM — natural.js API verified; BrillPOSTagger path assumed

**Research date:** 2026-06-14
**Valid until:** 2026-07-14 (stable tech stack; crawler selectors may change sooner)
