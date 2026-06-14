# Phase 5: Reading Comprehension + Content Pipeline - Context

**Gathered:** 2026-06-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can browse CEFR-filtered reading passages (B1/B2/C1) by topic and content type, read HTML-formatted passages with highlight/note/bookmark annotations that persist on re-visit, answer inline comprehension questions with immediate feedback, and tap unknown words to add them to their SRS queue with sentence context — all backed by a seeded database of 2,000+ passages produced by a standalone crawler pipeline (VOA + BBC + NewsInLevels) with CEFR classification.

**Deliverables:**
- NestJS ReadingModule: endpoints for passage browse (filtered by CEFR/topic/contentType), passage detail with questions, session completion (stores ReadingProgress), highlight CRUD, note CRUD, bookmark toggle, word lookup (VocabularyWord table)
- Standalone crawler script: Playwright + Cheerio crawl → clean → dedup → CEFR classify → seed. Runs as a pnpm script, not a BullMQ job.
- CEFR classifier: vocabulary frequency scoring (Words-CEFR-Dataset bundled) + sentence length + syntactic complexity → cefrLevel + cefrConfidence. Passages below 0.65 confidence saved with `flaggedForReview=true, isPublished=false`.
- Seed script: uses Prisma `createMany()` in 500-record batches; all 2,000+ passages seeded with `isPublished=true` (confidence ≥ 0.65) before first deploy
- Next.js reading routes: `/reading` (browse with filters) → `/reading/[passageId]` (passage page with inline questions, annotations, tap-to-SRS)
- VOCAB-08: Single-word tap popover in the passage — VocabularyWord lookup, fallback to context-only if not found, sentence-level context extraction, POST `/api/srs/enroll` with `contextSentence`

</domain>

<decisions>
## Implementation Decisions

### Comprehension Questions Layout
- **D-01:** **Inline below the passage**: All comprehension questions scroll below the passage text on the same page. User can scroll back up to re-read before answering. No quiz-mode carousel — reading comprehension benefits from passage access during answering.
- **D-02:** **Immediate per-question feedback**: Each question shows correct/incorrect and explanation immediately after answering. User sees feedback inline as they work through questions. Score accumulates progressively; no submit-all step.
- **D-03:** **Passive reading timer**: Elapsed-time counter starts when the passage loads, auto-stops when the last question is answered. `ReadingProgress.readingTimeSec` saved on session complete. No user action required.
- **D-04:** **Inline score summary + stay on page**: After the last question is answered, a results card appears below the final question (score, accuracy, reading time). No full-page redirect. User stays on the passage page and can revisit highlights/notes after completing.

### Highlight + Annotation UX
- **D-05:** **HTML-formatted passage rendering**: Passage `content` is stored and rendered as HTML (basic formatting preserved — bold, italics, paragraph structure). Richer reading experience than plain text. Requires HTML sanitization (DOMPurify or similar) before render.
- **D-06:** **Text-position anchoring for highlights**: Strip HTML to plain text, compute `startOffset`/`endOffset` on the stripped string, re-apply highlights by text-span matching in the rendered HTML. Use `@hypothesis/anchoring` (text-position strategy). Robust across minor HTML re-renders. Fits the existing `Highlight.startOffset` / `Highlight.endOffset` integer schema fields — no migration needed.
- **D-07:** **Auto-save on text selection**: User selects text in the passage, a small tooltip appears (highlight icon). Clicking the icon saves the highlight immediately (`POST /api/reading/highlights`). Zero extra clicks. Established pattern (Medium/Kindle web).
- **D-08:** **Floating sticky note panel**: A slide-in notes panel (right sidebar on desktop, bottom sheet on mobile) contains a single textarea per user+passage. Auto-saves on blur. One `Note` row per user+passage (schema already supports this). No per-paragraph anchoring — simpler and the schema doesn't require a paragraphIndex field.

### Content Pipeline Delivery
- **D-09:** **Standalone pnpm script (not BullMQ)**: The crawler runs as a standalone NestJS CLI command (`pnpm pipeline:crawl` or `pnpm pipeline:seed`). Not a BullMQ job. Runs offline, deterministic. Easy to validate 50-URL sample before bulk run. Can be re-run to refresh content without touching the running API.
- **D-10:** **Words-CEFR-Dataset bundled as JSON**: Download once from github.com/Maximax67/Words-CEFR-Dataset, bundle as `apps/api/prisma/seed-data/cefr-word-list.json`. CEFR classifier reads this local file — no network calls during classification. The dataset is already referenced in CLAUDE.md.
- **D-11:** **Live crawler against VOA + BBC + NewsInLevels + Simple English Wikipedia**: All 4 sources from PIPE-01. STATE.md flags VOA/BBC selector specificity — researcher/planner must include a 50-URL validation step before the bulk crawl run. The crawler runs in the Phase 5 execution sequence: validate selectors on sample → bulk crawl → classify → seed.
- **D-12:** **flaggedForReview=true + isPublished=false for low-confidence passages**: Passages with `cefrConfidence < 0.65` save to DB with `isPublished=false`. They do not appear in the UI browse or passage endpoints. Stored for future manual review. Passages at ≥ 0.65 save with `isPublished=true` and appear immediately after seeding.

### Tap-to-SRS Word Lookup (VOCAB-08)
- **D-13:** **VocabularyWord table lookup with graceful no-match**: On word tap, query `GET /api/vocabulary/lookup?word={word}` against the VocabularyWord table. If found: show word, definition, pronunciation key, part of speech in the popover. If not found: show `"[word] — definition not yet in our vocabulary library"` and still offer "Add to SRS" button. No external dictionary API.
- **D-14:** **Single-word tap → inline popover**: Each word in the passage content is wrapped in a `<span data-word>` during render. Single click/tap shows a small popover card (word, definition or fallback message, sentence context, "Add to SRS" button, dismiss). Popover dismisses on outside click. No long-press requirement.
- **D-15:** **Sentence-level context extraction**: When the user taps a word, extract the surrounding sentence by splitting on sentence boundaries (`.`, `!`, `?` followed by space or end). Pass the extracted sentence as `contextSentence` to `POST /api/srs/enroll`. Reuses the existing Phase 3 SRS enrollment endpoint (no changes needed).

### Claude's Discretion
- NestJS ReadingModule structure (controller, service, DTOs — follow VocabularyModule + GrammarModule patterns)
- Specific endpoint paths (e.g., `GET /api/reading/passages`, `GET /api/reading/passages/:id`, `POST /api/reading/sessions/complete`, `POST /api/reading/highlights`, `DELETE /api/reading/highlights/:id`, `POST /api/reading/notes`, `POST /api/reading/bookmarks`)
- React Query cache strategy for passage detail and annotations
- shadcn/ui components for the reading passage layout (Card, ScrollArea, Popover for tap-to-SRS)
- Specific Tailwind classes for highlight color overlay (yellow/amber bg with low opacity)
- HTML sanitization library choice (DOMPurify vs next-sanitize-html)
- Crawler selector implementation for each source (VOA/BBC/NewsInLevels CSS selectors — validate per source before bulk run)
- Exact CEFR classifier weight tuning (vocabulary 50%, sentence length 25%, syntactic complexity 25% as per CLAUDE.md)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Scope and Requirements
- `.planning/ROADMAP.md` — Phase 5 goal, success criteria (5 criteria), MVP mode, depends-on Phase 4, requirement IDs (READ-01–07, PIPE-01–06, VOCAB-08)
- `.planning/REQUIREMENTS.md` — READ-01 (browse filters), READ-02 (≥6 questions per passage), READ-03 (reading timer), READ-04 (highlight persistence), READ-05 (notes persistence), READ-06 (bookmarking), READ-07 (score storage), PIPE-01 (4 crawl sources), PIPE-02 (content quality gate: ≥150 words, dedup by URL + hash), PIPE-03 (CEFR classifier with NER), PIPE-04 (confidence < 0.65 flagged), PIPE-05 (seed targets: 2,000 passages + questions), PIPE-06 (createMany batches of 500), VOCAB-08 (tap-to-SRS with context sentence) — full acceptance criteria
- `.planning/PROJECT.md` — Core value, tech stack decisions, constraints

### Technology Stack (LOCKED)
- `CLAUDE.md` §Technology Stack — Version pins and compatibility table (Next.js 14, NestJS 11, TailwindCSS 3.x, React 18.x, shadcn/ui New York/zinc)
- `CLAUDE.md` §CEFR Classification Engine — Rule-based hybrid spec: vocabulary difficulty (50%, CEFR-J/EVP word lists), sentence length (25%), syntactic complexity (25%); confidence threshold 0.65; NER exclusion of proper nouns
- `CLAUDE.md` §Supporting Libraries — `natural` 6.x for NLP tokenization/stemming, `cheerio` 1.x for HTML parsing, `playwright` 1.x for browser automation (already in project)
- `CLAUDE.md` §Sources → github.com/Maximax67/Words-CEFR-Dataset — CEFR word list to bundle as classifier input

### Database Schema (already migrated — read before writing any code)
- `packages/database/prisma/schema.prisma` — Phase 5 models: `ReadingPassage` (id, title, content, sourceUrl, contentHash, contentType, cefrLevel, cefrConfidence, topic, wordCount, isPublished, flaggedForReview), `ReadingQuestion` (id, passageId, questionType, prompt, answer, distractors[], explanation, xpReward, sortOrder), `ReadingProgress` (id, userId, passageId, score, accuracy, readingTimeSec, completedAt, lastViewedAt), `Highlight` (id, userId, passageId, startOffset, endOffset, text), `Note` (id, userId, passageId, content), `Bookmark` (id, userId, passageId). All models already exist — Phase 5 adds no new schema.
- `packages/database/prisma/schema.prisma` §ContentType enum — `ARTICLE`, `NEWS`, `BLOG_POST`, `ACADEMIC`, `STORY`, `OPINION` (verify exact values)
- `packages/database/prisma/schema.prisma` §CefrLevel enum — `B1`, `B2`, `C1`

### Prior Phase Decisions
- `.planning/phases/04-grammar-module/04-CONTEXT.md` — D-04 (linear sequential lesson flow — reading adapts this with inline questions instead of carousel), D-09 (NestJS endpoint patterns), D-10 (dnd-kit not relevant here)
- `.planning/phases/03-vocabulary-module-srs-core/03-CONTEXT.md` — D-03 (ts-fsrs for SRS), D-06 (batch submit pattern — reading session complete follows same), D-09 (deep-linkable routes), D-10 (R2 audio key for vocabulary pronunciation — not needed for reading phase), D-14 (seed data JSON file pattern in `apps/api/prisma/seed-data/`)
- `.planning/STATE.md` — §Blockers: "Crawler selector specificity for VOA/BBC needs validation against current page templates before bulk crawl" + "CEFR classifier accuracy must be empirically validated on a 50-URL sample before proceeding to bulk seeding"

### External Resources for Crawler + CEFR
- `https://github.com/Maximax67/Words-CEFR-Dataset` — CEFR word frequency dataset to download and bundle (referenced in CLAUDE.md §Sources)

### Existing Code Patterns (critical — read before implementing)
- `apps/api/src/vocabulary/vocabulary.controller.ts` — Controller pattern; ReadingController follows this structure
- `apps/api/src/vocabulary/vocabulary.service.ts` — Service with PrismaService injection; ReadingService follows this
- `apps/api/src/grammar/` — GrammarModule (most recent module) as closest template for ReadingModule
- `apps/web/src/components/vocabulary/practice-session.tsx` — Session orchestrator (React state, one-batch submit); reading question session uses the batch submit pattern but NOT the carousel UI
- `apps/web/src/lib/api-client.ts` — Axios client for NestJS API calls (JWT header injection)
- `apps/api/src/auth/jwt-auth.guard.ts` — JwtAuthGuard for all protected reading endpoints
- `apps/api/src/prisma/prisma.service.ts` — PrismaService injection pattern

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `apps/api/src/vocabulary/vocabulary.controller.ts` + `vocabulary.service.ts` — Direct template for ReadingController + ReadingService
- `apps/api/src/grammar/` — Most recent module; closest NestJS pattern to follow
- `apps/web/src/components/vocabulary/practice-session.tsx` — Batch submit pattern (record attempts, submit on completion); adapt for reading session (no carousel needed — inline questions)
- `apps/web/src/components/vocabulary/session-results.tsx` — Session results pattern; reading uses inline score card instead (D-04), but component code may be partially reusable
- `apps/web/src/components/cefr-badge.tsx` — CEFR badge; use on passage browse cards and passage header
- `apps/web/src/lib/api-client.ts` — Axios client; all NestJS calls go through this

### Established Patterns
- NestJS global prefix `/api` — all reading endpoints at `/api/reading/*`
- Global ValidationPipe (`whitelist: true`, `transform: true`) — all DTOs auto-validated
- shadcn/ui New York theme with zinc color palette — Card, Badge, Button, Progress, Popover (for tap-to-SRS)
- Dashboard route group `(dashboard)` — all reading routes go under `apps/web/src/app/(dashboard)/reading/`
- Session state in React component state, batch submit on complete (Phase 3 D-06 + Phase 4 D-07)
- Seed data as JSON file in `apps/api/prisma/seed-data/` (Phase 3 D-14 pattern)
- `prisma.createMany()` in batches of 500 (PIPE-06)

### Integration Points
- `apps/web/src/app/(dashboard)/` — New routes: `/reading` (browse), `/reading/[passageId]` (passage + questions + annotations)
- `apps/api/src/app.module.ts` — Add `ReadingModule` to imports array (same as VocabularyModule + GrammarModule)
- `packages/shared/src/index.ts` — Add reading DTOs to barrel export (ReadingPassageDto, ReadingQuestionDto, ReadingSessionResultDto, HighlightDto, NoteDto, BookmarkDto)
- `packages/database/prisma/schema.prisma` — All reading models already exist; Phase 5 adds no new schema
- Phase 3 SRS: `POST /api/srs/enroll` accepts `{ wordId?, word, contextSentence }` — VOCAB-08 calls this directly from the reading passage page
- Future: Phase 8 Adaptive Engine reads `ReadingProgress` scores for per-user skill tracking

</code_context>

<specifics>
## Specific Ideas

- **@hypothesis/anchoring for highlight offsets**: Use the `text-position` strategy from `@hypothesis/anchoring` npm package. This handles the HTML-to-plain-text offset translation and re-application cleanly. Alternative: implement a simple custom version using `textContent` normalization.
- **HTML sanitization**: Apply DOMPurify (browser) or `isomorphic-dompurify` (SSR-safe) before rendering passage HTML to prevent XSS. All crawled content must be sanitized before storage and again before render.
- **Word span wrapping**: During passage render, tokenize the text nodes and wrap each word token in `<span data-word="word">`. Punctuation attached to words should be stripped (`word.replace(/[.,!?;:'"]/g, '')`) before the data-word attribute. Use a React component (`PassageRenderer`) that does this transformation.
- **50-URL validation step**: Crawler should include a `--validate-selectors` flag that runs against a 50-URL sample per source and reports extraction success rate before the bulk run. This addresses the STATE.md blocker directly.
- **Seed script command**: `pnpm pipeline:crawl` (runs crawler), `pnpm pipeline:seed` (seeds from crawled JSON), `pnpm pipeline:validate` (50-URL sample validation). Or a combined `pnpm pipeline:run` with flags.
- **CEFR word list load**: At pipeline startup, load `apps/api/prisma/seed-data/cefr-word-list.json` into a Map<word, cefrLevel> for O(1) lookup during classification. Do not reload per passage.
- **Passage browse route**: `/reading?level=B2&topic=technology&type=article` — query params drive filters. NestJS endpoint: `GET /api/reading/passages?cefrLevel=B2&topic=technology&contentType=ARTICLE&page=1&limit=20`.

</specifics>

<deferred>
## Deferred Ideas

- **BullMQ content refresh pipeline**: Running the crawler on a recurring schedule via BullMQ jobs. Phase 5 uses the standalone script approach. The BullMQ architecture would be appropriate for a production content refresh cycle in a post-v1 phase.
- **Paragraph-anchored notes**: Multiple notes per passage anchored to specific paragraphs. Phase 5 ships one note per passage (floating panel). Anchored notes would need a `paragraphIndex` field added to `Note` model — schema migration deferred.
- **Karaoke-style highlight playback**: Animating through highlights for review. Interesting for gamification but out of scope for Phase 5.
- **VOCAB-08 with external dictionary API fallback**: If the VocabularyWord table lookup misses, calling api.dictionaryapi.dev to show a definition. Deferred — adds network dependency and the graceful fallback (show word + context without definition) is sufficient for v1.
- **Content freshness/refresh UI**: Showing users when content was last crawled or how fresh the passages are. Admin feature — deferred to Phase 8 Analytics or a future admin phase.

</deferred>

---

*Phase: 5-Reading Comprehension + Content Pipeline*
*Context gathered: 2026-06-14*
