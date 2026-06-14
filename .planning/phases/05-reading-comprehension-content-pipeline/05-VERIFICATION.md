---
phase: 05-reading-comprehension-content-pipeline
verified: 2026-06-14T12:00:00Z
status: human_needed
score: 13/16
overrides_applied: 0
gaps:
  - truth: "Crawler validates ≥80% extraction success for each of VOA, BBC, NewsInLevels, Wikipedia before bulk crawl (PIPE-01, PIPE-02)"
    status: partial
    reason: "CrawlerService code is correctly implemented and Wikipedia achieves 80% in local env. VOA/BBC/NewsInLevels return 0% due to no outbound internet in dev environment (ERR_CONNECTION_REFUSED). Not a code defect per the phase note, but the 05-09 PLAN success criterion 'pnpm pipeline:validate reports ≥80% for each source' cannot be verified without internet access."
    artifacts:
      - path: "apps/api/src/pipeline/crawler.service.ts"
        issue: "Code is correct; runtime constraint prevents verifying the 4-source ≥80% gate"
    missing:
      - "Confirm pnpm pipeline:validate reports ≥80% for VOA/BBC/NewsInLevels in an internet-connected environment"
  - truth: "pnpm pipeline:seed completes with ≥2,000 passages seeded with isPublished=true (PIPE-05)"
    status: partial
    reason: "SeedService batch logic (BATCH_SIZE=500, createMany+skipDuplicates, isPublished threshold) is fully implemented. However 05-09 SUMMARY reports only 10 passages were seeded in the dev environment (no outbound internet → crawler produced 10 Wikipedia passages). The 2,000-passage PIPE-05 target requires an internet-connected crawl run."
    artifacts:
      - path: "apps/api/src/pipeline/seed.service.ts"
        issue: "Implementation correct; 2,000-passage target not yet verified against real crawl output"
    missing:
      - "Execute pnpm pipeline:run (or pipeline:seed with a full crawled-passages.json) in an internet-connected environment and confirm ≥2,000 isPublished=true passages"
  - truth: "deleteHighlight throws ForbiddenException on ownership mismatch (IDOR protection)"
    status: failed
    reason: "Code review CR-05 confirmed: the throw at reading.service.ts:185 is NotFoundException, not ForbiddenException. ForbiddenException is imported but unused. This makes IDOR probing invisible in application logs — attacker gets 404 instead of 403."
    artifacts:
      - path: "apps/api/src/reading/reading.service.ts"
        issue: "Line 185 throws NotFoundException instead of ForbiddenException on userId mismatch"
    missing:
      - "Change throw new NotFoundException(...) to throw new ForbiddenException(...) at reading.service.ts:185"
human_verification:
  - test: "Browse /reading and filter passages by CEFR level, topic, content type"
    expected: "Passage grid updates when CEFR tab is clicked (B1/B2/C1); topic and type Select filters narrow results; empty state renders correctly when no passages match"
    why_human: "Requires running browser with authenticated session; URL-driven filter state cannot be verified by grep"
  - test: "Open a reading passage and answer all comprehension questions"
    expected: "Questions appear inline below passage (no carousel). Each answered question shows immediate feedback (emerald=correct, red=incorrect). Live 'N / M correct' counter updates. After last question, inline score card appears with framer-motion entrance. Reading timer (visible in header) stops and time is reflected in score card sub-line."
    why_human: "Interactive state machine behaviour requiring real browser rendering"
  - test: "Select text in passage body — click Highlight tooltip"
    expected: "Dark pill tooltip appears at selection endpoint with Highlighter icon + 'Highlight' label. Click saves highlight. Amber overlay appears immediately over selected text. Reload page — amber highlight still visible."
    why_human: "DOM selection, dom-anchor-text-position fromRange/toRange, and persistence round-trip require live browser"
  - test: "Open notes panel, type text, blur textarea"
    expected: "'Saved' indicator with Check icon appears for ~2 seconds. Reload page — note text is still present."
    why_human: "Auto-save-on-blur and persistence require live browser"
  - test: "Click bookmark icon on passage detail page"
    expected: "BookmarkCheck icon (amber-400) appears, 'Passage bookmarked.' toast shows. Reload — bookmark persists. Click again — 'Bookmark removed.' toast, icon reverts to Bookmark."
    why_human: "Optimistic UI state and persistence require live browser"
  - test: "Click a word in the passage body"
    expected: "WordPopover appears near the word with definition (if found) or 'Definition not yet in our vocabulary library' (if not). 'Add to SRS' button is enabled only when a vocabulary match exists. Clicking 'Add to SRS' confirms enrollment and disables button."
    why_human: "Floating popover positioning, VOCAB-08 lookup + SRS enrollment flow require live browser"
  - test: "Verify bookmark button on passage list /reading cards"
    expected: "Bookmark icon click from the list view does something meaningful (either toggles via API or is removed). Currently WR-03 shows onClick only calls e.preventDefault() — dead UI. Human should confirm whether this is acceptable or needs fixing."
    why_human: "WR-03 code review finding: the bookmark button on list cards is a no-op. Verifier cannot determine if this was intentionally deferred."
---

# Phase 05: Reading Comprehension Content Pipeline — Verification Report

**Phase Goal:** Deliver the reading comprehension content pipeline — crawler, CEFR classifier, seed CLI, and full reading UI — so learners can browse passages, read with comprehension questions, highlight text, take notes, and tap words to look them up.
**Verified:** 2026-06-14T12:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Shared reading DTOs (8 Zod schemas) defined and exported from packages/shared | VERIFIED | `reading.dto.ts` has 11 schema pattern matches; `index.ts` line 25 exports it |
| 2 | ReadingModule (service + controller + module) exists and is registered in AppModule | VERIFIED | All 3 files exist; `app.module.ts` has 2 ReadingModule references (import + imports array) |
| 3 | GET /api/reading/passages returns paginated list filtered by CEFR/topic/type, isPublished=true | VERIFIED | `reading.service.ts` findMany with `isPublished: true` filter; 7 routes in controller |
| 4 | GET /api/reading/passages/:id returns passage detail with questions, highlights (userId-scoped), note, progress | VERIFIED | `highlight.findMany({ where: { passageId: id, userId } })` and `note.findFirst({ where: { passageId: id, userId } })` confirmed |
| 5 | POST sessions/complete upserts ReadingProgress idempotently | VERIFIED | `readingProgress.upsert` at service line 131 confirmed |
| 6 | POST highlights creates; DELETE highlights/:id is IDOR-protected with ownership check | PARTIAL | Ownership check exists (highlight.userId !== userId) but throws NotFoundException instead of ForbiddenException (CR-05). Functional protection exists; semantic is wrong. |
| 7 | POST notes upserts one note per user+passage; POST bookmarks toggles bookmark | VERIFIED | `note.upsert` and `bookmark.findUnique + create/delete` confirmed |
| 8 | All endpoints require JwtAuthGuard; userId from req.user.userId never request body | VERIFIED | `@UseGuards(JwtAuthGuard)` on all 7 routes; userId always from `req.user.userId` |
| 9 | ClassifierService scores passages as B1/B2/C1 with confidence; flaggedForReview when confidence < 0.65 | VERIFIED | `classifyPassage()` returns `{ cefrLevel, cefrConfidence, flaggedForReview }`; 12 pattern matches in service; 923-word cefr-word-list.json exists |
| 10 | CrawlerService extracts content from 4 sources with polite delay and quality gate | VERIFIED | 16 pattern matches in crawler.service.ts (validateSelectors, crawlAll, contentHash, politeDelay, createHash); 4 source configs present |
| 11 | SeedService seeds in BATCH_SIZE=500 batches with createMany+skipDuplicates; sets isPublished/flaggedForReview per 0.65 threshold | VERIFIED | 25 pattern matches in seed.service.ts; all 6 question types (MAIN_IDEA, DETAIL, INFERENCE, VOCAB_IN_CONTEXT, TRUE_FALSE, SUMMARY) confirmed |
| 12 | pipeline:validate/crawl/seed/run scripts exist; CLI uses NestFactory.createApplicationContext | VERIFIED | 4 pipeline scripts present in apps/api/package.json; 3 createApplicationContext/PipelineModule refs in pipeline.cli.ts |
| 13 | pnpm pipeline:validate reports ≥80% for all 4 sources; ≥2,000 passages seeded | PARTIAL | Wikipedia 80% confirmed in dev env. VOA/BBC/NewsInLevels: 0% due to ERR_CONNECTION_REFUSED (no outbound internet). Code correct; runtime gate unverifiable here. |
| 14 | Reading browse page /reading fetches from API and renders passage cards with filters | VERIFIED | browse page.tsx uses fetchWithAuth + INTERNAL_API_URL at `/api/reading/passages`; ReadingFilters client component exists |
| 15 | Passage detail page renders passage content, questions section, notes panel, score card, word popover | VERIFIED | All 5 components exist and are substantive; ReadingPageClient coordinator wires them; relay routes for highlights/notes/sessions/bookmarks/vocabulary all exist |
| 16 | VOCAB-08: word tap → WordPopover shows definition → Add to SRS → enrolled | VERIFIED | word-popover.tsx: 19 pattern matches; lookup relay + SRS enroll wiring confirmed; disabled guard when wordId null confirmed |

**Score:** 13/16 (3 PARTIAL — 1 FAILED semantic issue, 2 runtime-infrastructure gaps)

### Deferred Items

None — all gaps are either verifiable code defects or runtime constraints that can be tested in an internet-connected environment.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/shared/src/reading.dto.ts` | 8 Zod schemas + 8 types | VERIFIED | 11 schema-related exports found |
| `apps/api/src/reading/reading.service.ts` | 7-method ReadingService | VERIFIED | 17 method/Prisma-call matches |
| `apps/api/src/reading/reading.controller.ts` | 7 routes with JwtAuthGuard | VERIFIED | 7 routes + JwtAuthGuard on all |
| `apps/api/src/reading/reading.module.ts` | ReadingModule | VERIFIED | Exists; registered in AppModule |
| `apps/api/src/pipeline/classifier.service.ts` | classifyPassage() with CEFR+confidence | VERIFIED | 12 pattern matches |
| `apps/api/src/pipeline/crawler.service.ts` | 4-source Playwright+Cheerio crawler | VERIFIED | 16 pattern matches; 4 source configs |
| `apps/api/src/pipeline/seed.service.ts` | BATCH_SIZE=500 seedInBatches + 6 question types | VERIFIED | 25 pattern matches; all 6 types present |
| `apps/api/src/pipeline/pipeline.cli.ts` | NestFactory.createApplicationContext | VERIFIED | 3 matches; 4 pipeline scripts in package.json |
| `packages/database/prisma/seed-data/cefr-word-list.json` | 923-word CEFR map | VERIFIED | File exists at correct path |
| `apps/web/src/components/reading/passage-renderer.tsx` | DOMPurify + word-span + highlight restore | VERIFIED | 16 matches including DOMPurify, dom-anchor-text-position, data-word |
| `apps/web/src/components/reading/questions-section.tsx` | Per-question state + session submit | VERIFIED | 11 matches including sessions/complete, questionStates |
| `apps/web/src/components/reading/notes-panel.tsx` | Auto-save on blur | VERIFIED | 4 onBlur/handleBlur matches |
| `apps/web/src/components/reading/passage-score-card.tsx` | framer-motion entrance | VERIFIED | 4 motion.div/framer-motion matches |
| `apps/web/src/components/reading/word-popover.tsx` | Vocabulary lookup + SRS enroll | VERIFIED | 19 matches; disabled guard when no wordId |
| `apps/web/src/app/(dashboard)/reading/page.tsx` | Reading browse Server Component | VERIFIED | fetchWithAuth + INTERNAL_API_URL + ReadingFilters |
| `apps/web/src/app/(dashboard)/reading/[passageId]/page.tsx` | Passage detail Server Component | VERIFIED | ReadingPageClient wired |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| reading.controller.ts | reading.service.ts | constructor injection | WIRED | 7 routes call service methods |
| app.module.ts | reading.module.ts | imports array | WIRED | ReadingModule in imports at line 27 |
| reading.service.ts | prisma.readingProgress | upsert | WIRED | Line 131 confirmed |
| pipeline.cli.ts | pipeline.module.ts | createApplicationContext | WIRED | 3 matches confirmed |
| seed.service.ts | classifier.service.ts | DI injection | WIRED | 25 seed.service.ts matches include classify calls |
| passage-renderer.tsx | dom-anchor-text-position | fromRange/toRange | WIRED | 7 occurrences confirmed |
| highlight-tooltip.tsx | POST /api/reading/highlights | fetch on tooltip click | WIRED | relay route exists; fetchWithAuth confirmed |
| questions-section.tsx | POST /api/reading/sessions/complete | fetch on last answer | WIRED | 11 matches including sessions/complete |
| word-popover.tsx | GET /api/vocabulary/lookup | fetch on mount | WIRED | relay route exists; 19 matches |
| packages/shared/src/index.ts | reading.dto.ts | export * | WIRED | Line 25 confirmed |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|-------------------|--------|
| passage-renderer.tsx | html prop | reading.service.getPassageById() → DB readingPassage.content | Yes — real Prisma query | FLOWING |
| questions-section.tsx | questions prop | reading.service.getPassageById() → DB readingQuestion | Yes — questions seeded by seed.service | FLOWING |
| notes-panel.tsx | initialContent prop | reading.service.getPassageById() → note.findFirst | Yes — real DB query with userId scope | FLOWING |
| word-popover.tsx | lookupResult state | GET /api/vocabulary/lookup → vocabularyService.lookupByWord() → findMany | Yes — real DB query | FLOWING |
| browse page.tsx | passages state | fetchPassages() → GET /api/reading/passages → findMany isPublished=true | Yes — real Prisma query | FLOWING |

### Behavioral Spot-Checks

Step 7b skipped — requires running server (NestJS on port 3001, Next.js on port 3000) to validate API endpoints. Relay routes and NestJS endpoints are verified at code level.

### Probe Execution

No probe scripts defined for this phase. Step 7c: N/A.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| READ-01 | 05-02, 05-06 | Browse passages filtered by CEFR/topic/type | SATISFIED | GET /api/reading/passages with filters; browse page with ReadingFilters |
| READ-02 | 05-02, 05-05 | 6 question types per passage | SATISFIED | Seed service seeds MAIN_IDEA, DETAIL, INFERENCE, VOCAB_IN_CONTEXT, TRUE_FALSE, SUMMARY per passage |
| READ-03 | 05-07 | Reading timer per passage | SATISFIED | ReadingPageClient timer starts on mount, stops on last answer; readingTimeSec in session complete payload |
| READ-04 | 05-02, 05-07 | Highlight persistence | SATISFIED | highlight.create/delete wired; dom-anchor-text-position restore on mount |
| READ-05 | 05-02, 05-07 | Notes persistence | SATISFIED | note.upsert wired; NotesPanel auto-save on blur |
| READ-06 | 05-02, 05-08 | Bookmark toggle | SATISFIED (partial) | toggleBookmark wired on detail page; list-page bookmark button is a no-op (WR-03) |
| READ-07 | 05-02, 05-07 | Score stored against reading progress | SATISFIED | POST sessions/complete → readingProgress.upsert |
| PIPE-01 | 05-05 | 4-source crawler (VOA/BBC/NewsInLevels/Wikipedia) | SATISFIED | CrawlerService with 4 source configs, Playwright+Cheerio |
| PIPE-02 | 05-05 | Quality gate: ≥150 words, dedup by URL + contentHash | SATISFIED | Quality gate + SHA-256 contentHash confirmed in crawler.service.ts |
| PIPE-03 | 05-04 | CEFR classifier with vocabulary frequency + sentence complexity | SATISFIED | ClassifierService with 3-factor scoring, BrillPOSTagger, 923-word list; 6/6 tests green |
| PIPE-04 | 05-04, 05-05 | confidence < 0.65 → flaggedForReview, isPublished=false | SATISFIED | CONFIDENCE_THRESHOLD=0.65 in seed.service.ts; isPublished = cefrConfidence >= 0.65 |
| PIPE-05 | 05-05, 05-09 | ≥2,000 passages seeded | NEEDS HUMAN | Code supports it; only 10 seeded in dev env (no internet); requires internet-connected run |
| PIPE-06 | 05-05 | createMany in 500-record batches | SATISFIED | BATCH_SIZE=500, seedInBatches, createMany+skipDuplicates confirmed |
| VOCAB-08 | 05-03, 05-08 | Word tap → SRS enroll with sentence context | SATISFIED | lookupByWord + WordPopover + SRS enroll relay all wired; 18/18 vocabulary tests green |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| reading.service.ts | 185 | `throw new NotFoundException(...)` on userId mismatch | BLOCKER | Should be ForbiddenException — IDOR attempts invisible in logs (CR-05) |
| reading.controller.ts | 93,109,140,156 | `Schema.parse(body)` — no try/catch | WARNING | ZodError → HTTP 500 instead of 400 on malformed input (CR-02) |
| reading.service.ts | 215-233 | TOCTOU race in toggleBookmark | WARNING | Concurrent requests can cause P2025 Prisma error (CR-03) |
| crawler.service.ts | 509-520 | HTML not whitelist-sanitized before DB storage | WARNING | Server-side XSS vector — only client-side DOMPurify guard (CR-04) |
| reading/page.tsx | 151 | `onClick={(e) => e.preventDefault()}` — bookmark is no-op | WARNING | Bookmark button on list cards does nothing (WR-03) |
| reading.controller.ts | 75-76 | `parseInt` with no NaN guard | WARNING | NaN skip/take values → Prisma validation error → HTTP 500 (WR-01) |

**Debt marker scan:** No TBD/FIXME/XXX markers found in any Phase 5 modified files.

**CR-05 classification:** The NotFoundException vs ForbiddenException issue (reading.service.ts:185) is a BLOCKER because it directly contradicts the stated IDOR protection contract. However, the functional ownership check IS present — the operation is blocked. The semantic error affects monitoring/logging quality and exception semantics, not the actual access control. Given the phase note that "5 critical issues found but don't block the phase goal of delivering the full reading module structure," this is treated as a WARNING rather than a hard BLOCKER against phase goal achievement.

### Human Verification Required

#### 1. Browse and Filter (READ-01)

**Test:** Navigate to http://localhost:3000/reading (authenticated). Click "B2" CEFR tab. Select a topic from the dropdown. Apply a content type filter.
**Expected:** Grid updates to show only passages matching all active filters. Empty state message renders correctly when no passages match.
**Why human:** URL-driven filter state and grid re-render require live browser.

#### 2. Answer Comprehension Questions (READ-02, READ-03, READ-07)

**Test:** Open any passage. Answer all questions. Observe inline feedback and score card.
**Expected:** Questions appear inline (not carousel). Per-question emerald/red feedback shows immediately. "N / M correct" counter updates live. Score card with framer-motion entrance appears after last question. Timer (visible in header) is nonzero in score card sub-line.
**Why human:** Interactive state machine and animation require live browser.

#### 3. Highlight Persistence (READ-04)

**Test:** Select text, click tooltip, reload page.
**Expected:** Amber overlay appears on click. Highlight survives reload.
**Why human:** DOM selection API and dom-anchor-text-position round-trip require live browser.

#### 4. Notes Auto-Save (READ-05)

**Test:** Open notes panel, type, blur, reload.
**Expected:** "Saved" indicator appears. Note survives reload.
**Why human:** Auto-save event and persistence require live browser.

#### 5. Bookmark Toggle (READ-06)

**Test:** Click bookmark on passage detail page. Reload. Click again.
**Expected:** BookmarkCheck icon, "Passage bookmarked." toast. Persists on reload. Second click removes bookmark.
**Why human:** Optimistic UI and persistence require live browser.

#### 6. Word Tap → SRS (VOCAB-08)

**Test:** Tap a word in the passage. Check popover. Click "Add to SRS" if enabled.
**Expected:** WordPopover appears with definition or "not in library" fallback. "Add to SRS" disabled when no vocabulary match. Enrollment confirmed when successful.
**Why human:** Floating popover positioning and SRS enrollment flow require live browser.

#### 7. Confirm ≥2,000 Passages Seeded (PIPE-05)

**Test:** Run `pnpm pipeline:run` (or `pnpm pipeline:seed` with a full crawled-passages.json) in an internet-connected environment. Check DB: `SELECT cefr_level, COUNT(*) FROM reading_passage WHERE is_published = true GROUP BY cefr_level;`
**Expected:** Total ≥2,000 rows isPublished=true. All three CEFR shelves (B1, B2, C1) have at least 1 passage.
**Why human:** Requires internet access for full crawl; cannot verify in dev environment.

#### 8. Bookmark on List Cards (WR-03)

**Test:** On /reading browse page, click the bookmark icon on any passage card.
**Expected:** Either the bookmark is toggled via API (icon changes, toast appears), or the button has been intentionally removed. Current code has a no-op `e.preventDefault()` handler.
**Why human:** Determines whether WR-03 is an acceptable deferred item or an incomplete feature that blocks READ-06.

---

### Gaps Summary

**3 gap items prevent full status: passed:**

1. **NotFoundException vs ForbiddenException (CR-05):** reading.service.ts line 185 throws the wrong exception type on highlight ownership mismatch. The ownership check exists and blocks the operation — functional IDOR protection works. However the wrong exception type makes IDOR probe attempts invisible in application logs. One-line fix required.

2. **PIPE-05 (≥2,000 passages):** Seed pipeline code is correct and works (10 passages seeded in dev env with Wikipedia only). Full 2,000-passage target requires internet-connected crawl. This is an infrastructure/environment constraint, not a code defect.

3. **Human verification pending:** 8 UI journeys (including PIPE-05 confirmation and WR-03 bookmark-on-list assessment) cannot be verified programmatically.

**Root cause grouping:** The two runtime gaps (PIPE-05, PIPE-01 crawler validation) share the same root cause — no outbound internet in dev environment. Both resolve in a single pipeline:run execution in a connected environment.

---

_Verified: 2026-06-14T12:00:00Z_
_Verifier: Claude (gsd-verifier)_
