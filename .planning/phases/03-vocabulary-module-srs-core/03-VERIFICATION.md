---
phase: 03-vocabulary-module-srs-core
verified: 2026-06-13T00:00:00Z
status: gaps_found
score: 10/12 must-haves verified
overrides_applied: 0
gaps:
  - truth: "GET /api/vocabulary/categories relay route exists and proxies to NestJS"
    status: failed
    reason: "apps/web/src/app/api/vocabulary/categories/route.ts is missing. The /vocabulary page fetches NestJS directly (with auth token via cookies()) rather than through the required relay. Plan 03-04 explicitly lists this file as a required artifact and key_link."
    artifacts:
      - path: "apps/web/src/app/api/vocabulary/categories/route.ts"
        issue: "File does not exist — directory apps/web/src/app/api/vocabulary/categories/ does not exist"
    missing:
      - "Create apps/web/src/app/api/vocabulary/categories/route.ts — GET relay that calls auth() for 401 gate then fetchWithAuth to NestJS /api/vocabulary/categories"
  - truth: "Pending SRS reviews appear on the dashboard (VOCAB-06 full requirement)"
    status: partial
    reason: "VOCAB-06 states: 'Pending SRS reviews appear on the dashboard AND in a dedicated review queue'. The dedicated /review page is fully implemented. However, apps/web/src/app/(dashboard)/dashboard/page.tsx is an explicit placeholder — it has no SRS review count, no 'Continue Learning' widget, no pending review indicator. The dashboard half of VOCAB-06 is deferred to Phase 8."
    artifacts:
      - path: "apps/web/src/app/(dashboard)/dashboard/page.tsx"
        issue: "Placeholder page — renders only 'Your learning dashboard is on its way — fleshed out in Phase 8.' No SRS review count or pending-reviews widget."
    missing:
      - "Add pending SRS review count to the dashboard page, OR accept this as a Phase 8 deferred item with a formal deferred entry"
deferred: []
human_verification:
  - test: "Full phase 3 end-to-end journey with seeded demo user"
    expected: "Browse 8 categories -> word list -> word detail -> pronunciation plays -> mark as learned -> practice session (all 6 exercise types visible) -> matching 4-grid works -> results screen + add-to-SRS -> /review shows due cards -> rate Good -> card removed -> /vocabulary/my-words shows status and next review dates"
    why_human: "Visual exercise rendering, audio playback, Framer Motion flip animations, and interactive session flow cannot be verified by grep"
---

# Phase 3: Vocabulary + SRS Module Verification Report

**Phase Goal:** Deliver the complete Vocabulary + SRS module — 8 browsable categories, word detail pages, 5-exercise-type practice sessions, spaced repetition review queue, and personal word list — so a logged-in user can browse, learn, and review vocabulary end-to-end with no empty states.
**Verified:** 2026-06-13
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | ts-fsrs, framer-motion, @tanstack/react-query installed and importable | VERIFIED | packages listed in package.json; framer-motion used in flashcard-exercise.tsx (rotateY); react-query used in review/page.tsx |
| 2 | Vocabulary/SRS Zod DTOs exported from @repo/shared | VERIFIED | packages/shared/src/vocabulary.dto.ts has 8 schemas, 8 type exports; barrel re-exports via index.ts |
| 3 | Seed populates 200 words (25/category x 8) with CEFR distribution + demo user + 5 past-due SRS cards | VERIFIED | vocabulary.json confirmed 200 records, 25 per each of 8 categories; seed.ts uses createMany + NODE_ENV guard for demo user with 5 SrsCards due 1h ago |
| 4 | React Query QueryClientProvider wraps the (dashboard) layout | VERIFIED | apps/web/src/app/(dashboard)/layout.tsx imports QueryProvider and wraps {children} |
| 5 | Unauthenticated users visiting /vocabulary or /review are redirected to /login | VERIFIED | middleware.ts matcher includes /vocabulary, /vocabulary/:path*, /review, /review/:path* |
| 6 | GET /api/vocabulary/categories returns the 8 categories with word counts | VERIFIED | NestJS VocabularyService.getCategories() iterates CATEGORY_MAP (8 slugs), counts per category from DB; VocabularyController exposes guarded endpoint |
| 7 | GET /api/vocabulary/:category/words returns paginated A-Z word list | VERIFIED | VocabularyService.getWordsByCategory() uses Promise.all([findMany, count]), orderBy word ASC, Math.ceil(total/limit) |
| 8 | GET /api/vocabulary/categories relay route exists and proxies to NestJS | FAILED | apps/web/src/app/api/vocabulary/categories/route.ts is missing. The vocabulary page fetches NestJS directly via API_URL — the relay artifact the plan required is absent |
| 9 | POST /api/srs/enroll is idempotent; GET /api/srs/queue is capped at 20; POST /api/srs/review uses FSRS | VERIFIED | srs.service.ts: enrollWord uses upsert + findUnique; getDueQueue take:20, orderBy due asc, lte now; submitReview uses fsrs().repeat() with field mappers; learning_steps:0 read / not written |
| 10 | All SRS endpoints JWT-guarded and userId-scoped | VERIFIED | SrsController has 7 UseGuards references; submitReview uses findFirst {id, userId} for security scope |
| 11 | All 6 exercise types present in a mixed 10-word practice session | VERIFIED | flashcard-exercise.tsx (rotateY), matching-exercise.tsx (aria-selected, 4-item grid), cloze/context-selection/synonym/recall exercise files exist; practice-session.tsx samples 10 words (SESSION_SIZE=10), exercise-assignment.ts implements D-05 cap logic |
| 12 | Pending SRS reviews appear on the dashboard AND in a dedicated review queue (VOCAB-06) | PARTIAL | /review page is fully implemented with React Query useQuery(["srs-queue"]), useMutation + cache invalidation, ReviewCard flip, RatingButtons (Again/Hard/Good/Easy). Dashboard page is an explicit placeholder ("fleshed out in Phase 8") — no SRS count widget |

**Score:** 10/12 truths verified (2 failed/partial)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|---------|--------|---------|
| `packages/shared/src/vocabulary.dto.ts` | 8 DTOs/schemas | VERIFIED | 95 lines, 8 z.object schemas, 8 z.infer type exports |
| `packages/database/prisma/seed.ts` | 200 words + demo user | VERIFIED | 101 lines; createMany, NODE_ENV guard, 5 past-due SrsCards |
| `packages/database/prisma/seed-data/vocabulary.json` | 200 words, 25/category | VERIFIED | 209 lines; confirmed 200 records, 8 categories x 25 |
| `apps/web/src/components/query-provider.tsx` | QueryClientProvider wrapper | VERIFIED | 32 lines; QueryClientProvider + staleTime 30s |
| `apps/api/src/vocabulary/vocabulary.service.ts` | getCategories, getWordsByCategory, getWordDetail, getMyWords | VERIFIED | 234 lines; all 4 methods + assignExerciseType + getMatchingGrid |
| `apps/api/src/vocabulary/vocabulary.controller.ts` | 5 guarded endpoints | VERIFIED | 103 lines; 8 UseGuards/JwtAuthGuard references |
| `apps/api/src/vocabulary/vocabulary.module.ts` | Imports AuthModule | VERIFIED | 19 lines; AuthModule imported |
| `apps/api/src/srs/srs.service.ts` | enrollWord, getDueQueue, submitReview + mappers | VERIFIED | 209 lines; learning_steps:0 read, not written |
| `apps/api/src/srs/srs.controller.ts` | enroll, queue, review (JWT-guarded) | VERIFIED | 86 lines; 7 UseGuards references |
| `apps/api/src/srs/srs.module.ts` | Imports AuthModule | VERIFIED | 23 lines; AuthModule imported |
| `apps/api/src/srs/session.controller.ts` | POST /vocabulary/session/complete | VERIFIED | 58 lines; JWT-guarded |
| `apps/web/src/app/api/vocabulary/categories/route.ts` | Categories GET relay | MISSING | File does not exist; directory does not exist |
| `apps/web/src/app/api/vocabulary/[category]/words/route.ts` | Words paginated GET relay | VERIFIED | 43 lines; auth() gated, fetchWithAuth, page+limit forwarded |
| `apps/web/src/app/api/vocabulary/[category]/[wordId]/route.ts` | Word detail GET relay | VERIFIED | auth() gated, fetchWithAuth |
| `apps/web/src/app/api/vocabulary/enroll/route.ts` | Enroll POST relay | VERIFIED | 52 lines; auth() + fetchWithAuth to /api/srs/enroll |
| `apps/web/src/app/(dashboard)/vocabulary/page.tsx` | Category grid page | VERIFIED | 82 lines; fetches NestJS directly with session token; renders 8 CategoryCards |
| `apps/web/src/app/(dashboard)/vocabulary/[category]/page.tsx` | Paginated word list | VERIFIED | 148 lines; pagination + "Practice this set" link |
| `apps/web/src/app/(dashboard)/vocabulary/[category]/[wordId]/page.tsx` | Word detail page | VERIFIED | 66 lines; renders WordDetail component |
| `apps/web/src/components/vocabulary/word-detail.tsx` | Pronunciation + mark-as-learned | VERIFIED | 252 lines; speechSynthesis fallback, NEXT_PUBLIC_MINIO_PUBLIC_URL URL construction, POST /api/vocabulary/enroll |
| `apps/web/src/components/vocabulary/exercises/flashcard-exercise.tsx` | Framer Motion flip | VERIFIED | 64 lines; motion.div rotateY 0→180, backfaceVisibility |
| `apps/web/src/components/vocabulary/exercises/matching-exercise.tsx` | 4-item tap grid | VERIFIED | 170 lines; aria-selected, shake/dismiss animations |
| `apps/web/src/components/vocabulary/practice-session.tsx` | Session orchestrator | VERIFIED | 374 lines; SESSION_SIZE=10, Progress bar, batch POST at completion |
| `apps/web/src/components/vocabulary/session-results.tsx` | Results + Add-to-SRS dialog | VERIFIED | 241 lines; dialog with per-word checkboxes, POST /api/vocabulary/enroll |
| `apps/web/src/app/(dashboard)/vocabulary/[category]/practice/page.tsx` | Practice page | VERIFIED | 105 lines; server component, auth guard |
| `apps/web/src/app/api/vocabulary/session/complete/route.ts` | Session complete relay | VERIFIED | 54 lines; auth() gated |
| `apps/web/src/app/(dashboard)/review/page.tsx` | SRS review queue page | VERIFIED | 204 lines; useQuery(["srs-queue"], staleTime:0), useMutation |
| `apps/web/src/components/srs/review-card.tsx` | Framer Motion flip card | VERIFIED | 81 lines |
| `apps/web/src/components/srs/rating-buttons.tsx` | Again/Hard/Good/Easy | VERIFIED | 55 lines; aria-label "Rate as {rating}", 44px min-height, UI-SPEC colors |
| `apps/web/src/app/(dashboard)/vocabulary/my-words/page.tsx` | Personal vocab list | VERIFIED | 245 lines; useQuery(["my-words", status, page]), StatusFilter |
| `apps/web/src/app/api/srs/queue/route.ts` | SRS queue GET relay | VERIFIED | 40 lines; auth() + fetchWithAuth |
| `apps/web/src/app/api/srs/review/route.ts` | SRS review POST relay | VERIFIED | 50 lines; auth() + fetchWithAuth + {cardId, rating} forwarding |
| `apps/web/src/app/api/vocabulary/my-words/route.ts` | My-words GET relay | VERIFIED | 48 lines; auth(), status+page query params forwarded |
| `apps/web/src/components/vocabulary/status-filter.tsx` | Status filter tabs | VERIFIED | 42 lines |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `apps/web/src/app/(dashboard)/layout.tsx` | `query-provider.tsx` | QueryProvider wrapping {children} | WIRED | Line 60: `<QueryProvider>` wraps children |
| `packages/database/prisma/seed.ts` | `seed-data/vocabulary.json` | import vocabularyData | WIRED | createMany imports from vocabulary.json |
| `apps/web/src/app/(dashboard)/vocabulary/page.tsx` | `/api/vocabulary/categories` | fetch in server component | PARTIAL | Page fetches NestJS directly (not via relay); relay route missing but fetch with auth token achieves same result functionally |
| `apps/web/src/components/vocabulary/word-detail.tsx` | `/api/vocabulary/enroll` | fetch POST on Mark as learned | WIRED | Line 80: fetch("/api/vocabulary/enroll", POST) |
| `apps/api/src/app.module.ts` | `VocabularyModule` | imports array | WIRED | Lines 8+22: import + register |
| `apps/api/src/app.module.ts` | `SrsModule` | imports array | WIRED | Lines 9+23: import + register |
| `apps/api/src/vocabulary/vocabulary.controller.ts` | `JwtAuthGuard` | @UseGuards(JwtAuthGuard) | WIRED | 8 UseGuards references (confirmed >= 4) |
| `apps/api/src/srs/srs.service.ts` | `ts-fsrs` | fsrs().repeat() | WIRED | submitReview calls fsrs().repeat with dbCardToFsrsCard mapper |
| `apps/web/src/app/(dashboard)/review/page.tsx` | `/api/srs/queue` and `/api/srs/review` | React Query useQuery + useMutation | WIRED | useQuery(["srs-queue"]) + useMutation POST /api/srs/review + invalidate |
| `apps/web/src/app/(dashboard)/vocabulary/my-words/page.tsx` | `/api/vocabulary/my-words` | React Query useQuery with status param | WIRED | useQuery(["my-words", status, page]) |
| `apps/web/src/components/vocabulary/practice-session.tsx` | `/api/vocabulary/session/complete` | batch POST at session end | WIRED | Line 181: fetch("/api/vocabulary/session/complete") |
| `apps/web/src/components/vocabulary/session-results.tsx` | `/api/vocabulary/enroll` | Add to SRS dialog confirm | WIRED | Line 90: fetch("/api/vocabulary/enroll") per selected word |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `vocabulary/page.tsx` | categories array | fetch NestJS /api/vocabulary/categories with auth token | DB query: getCategories() counts VocabularyWord per category | FLOWING |
| `review/page.tsx` | SrsCardWithWord[] | useQuery → /api/srs/queue relay → NestJS getDueQueue | Prisma: findMany where due lte now, take 20 | FLOWING |
| `my-words/page.tsx` | MyWordDto[] | useQuery → /api/vocabulary/my-words relay → NestJS getMyWords | Prisma: UserVocabularyItem join SrsCard include | FLOWING |
| `practice-session.tsx` | VocabularyWordDto[] | parent server component fetch via words relay | Prisma: findMany category words, paginated | FLOWING |

### Behavioral Spot-Checks

Step 7b: SKIPPED — server and database services not running in this environment. Behavioral checks require NestJS + PostgreSQL.

### Probe Execution

Step 7c: No probe scripts declared. No `scripts/*/tests/probe-*.sh` found for this phase. SKIPPED.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|------------|------------|-------------|--------|----------|
| VOCAB-01 | 03-02, 03-04 | Browse 8 categories + paginated word list | SATISFIED | NestJS getCategories (8 slugs) + getWordsByCategory (paginated A-Z); /vocabulary page + /vocabulary/[category] page |
| VOCAB-02 | 03-02, 03-04 | Each vocabulary entry shows word, meaning, pronunciation, examples, synonyms, usage | SATISFIED | VocabularyService.getWordDetail; word-detail.tsx renders all fields with tabs |
| VOCAB-03 | 03-02, 03-05 | 6 exercise types: flashcard, matching, context selection, cloze, synonym, recall | SATISFIED | All 6 exercise components exist; flashcard uses Framer Motion rotateY; matching uses 4-item tap grid; practice-session.tsx SESSION_SIZE=10 |
| VOCAB-04 | 03-03, 03-04, 03-05 | Mark as learned enrolls into SRS | SATISFIED | word-detail.tsx POST /api/vocabulary/enroll; session-results.tsx Add-to-SRS dialog; NestJS enrollWord idempotent |
| VOCAB-05 | 03-03 | SRS schedules reviews using FSRS algorithm | SATISFIED | srs.service.ts uses ts-fsrs fsrs().repeat() with dbCardToFsrsCard/fsrsCardToDbUpdate mappers; learning_steps:0 on read, not persisted |
| VOCAB-06 | 03-03, 03-06 | Pending SRS reviews on dashboard AND dedicated review queue with A/H/G/E ratings | PARTIAL | /review queue: fully implemented. Dashboard: explicit placeholder, no SRS widget. "dashboard" half of VOCAB-06 not delivered in Phase 3 |
| VOCAB-07 | 03-02, 03-06 | Full vocab list with status and next review date | SATISFIED | getMyWords derives status (New/Learning/Review+scheduledDays→mastered); /vocabulary/my-words page with StatusFilter tabs + next review dates |

### Anti-Patterns Found

No TBD/FIXME/XXX markers found in any phase-modified file outside test/spec files. No stub return patterns detected in key components.

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `apps/web/src/app/(dashboard)/dashboard/page.tsx` | whole file | Placeholder component ("fleshed out in Phase 8") | WARNING | VOCAB-06 requirement partially unmet — SRS review count not on dashboard |

### Human Verification Required

#### 1. Full Phase 3 End-to-End Journey

**Test:** Sign in as demo@example.com / demo1234. Visit /vocabulary, open a category, click "Practice this set", complete a 10-word session observing that all 6 exercise types appear (including matching 4-grid and flashcard flip), reach the results screen, add words to SRS. Open a word detail page, click play button, click "Mark as learned". Visit /review, reveal a card, rate Good, confirm the card leaves the queue. Visit /vocabulary/my-words, filter by status, check next review dates. Visit /vocabulary and /review without logging in and confirm redirect to /login.
**Expected:** All screens render with real seeded data, no empty states, animations work, FSRS rescheduling removes rated cards from queue.
**Why human:** Visual rendering, audio playback, Framer Motion animations, interactive session flow, and FSRS scheduling correctness cannot be verified by static analysis.

### Gaps Summary

Two gaps found:

**Gap 1 (BLOCKER): Missing categories relay route.** `apps/web/src/app/api/vocabulary/categories/route.ts` does not exist. Plan 03-04 explicitly declared it as a required artifact (key_link from vocabulary/page.tsx → /api/vocabulary/categories via relay). The vocabulary page instead fetches NestJS directly with a session token — functionally equivalent, but the relay route contract is broken. This means any client-side component that needs to fetch categories through the Next.js API layer (e.g., future components not rendered server-side) has no endpoint. Fix: create the missing relay file with auth() gate + fetchWithAuth to NestJS.

**Gap 2 (WARNING): Dashboard SRS count not implemented (VOCAB-06 partial).** The REQUIREMENTS.md VOCAB-06 specifies pending SRS reviews appear "on the dashboard AND in a dedicated review queue." The dashboard is a placeholder component explicitly deferred to Phase 8. The plan deliverables (Plan 06) only claimed VOCAB-06 for the review queue, not the dashboard widget. However, the requirement text is unambiguous. This item appears in later phases via DASH-02 ("count of pending SRS vocabulary reviews") — so this is arguably deferred.

---

_Verified: 2026-06-13_
_Verifier: Claude (gsd-verifier)_
