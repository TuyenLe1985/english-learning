# Pitfalls Research

**Domain:** EFL / EdTech — Full-stack English learning platform (Next.js + PostgreSQL + Redis + BullMQ)
**Researched:** 2026-06-11
**Confidence:** HIGH (most findings verified across multiple sources or official documentation)

---

## Critical Pitfalls

### Pitfall 1: SRS Ease-Factor Hell (Anki SM-2 Floor Problem)

**What goes wrong:**
A vocabulary card that a user finds difficult gets its ease factor (EF) reduced every time they press "Again." Anki's SM-2 implementation floors EF at 1.30 (130%). Once the EF reaches the floor — roughly after 6 failed reviews — the next interval barely grows even on correct recalls. The card appears every few days indefinitely. The user never escapes low-interval purgatory because pressing "Good" (the most-used button) neither increases nor decreases EF; only "Easy" can recover it, and users rarely press it. The result: high-difficulty words dominate the review queue, making SRS feel like a punishment rather than a productivity tool.

**Why it happens:**
Developers copy the SM-2 formula verbatim without understanding that Anki modified the original SM-2 in ways that introduced this structural asymmetry. The original SuperMemo algorithm was designed for a 5-grade scale; Anki collapsed it to 4 buttons with a 0.15 EF penalty on "Hard" and no recovery on "Good." The PROJECT.md specifies "Anki-style SRS" without specifying which specific variant.

**How to avoid:**
- Implement a minimum EF floor check AND add mean-reversion: if a card has been answered "Good" 3+ consecutive times, increment EF by +0.05 per review to allow recovery
- Add a "minimum ease" safety threshold that flags cards at the EF floor so users can manually reset them
- Consider FSRS (Free Spaced Repetition Scheduler) instead of SM-2 — FSRS uses a Difficulty parameter with mean reversion that eliminates ease hell entirely. FSRS is what Anki itself migrated to as of Anki 23.10
- If sticking with SM-2: add a configurable EF recovery bonus (+0.1 EF) when a card is answered correctly after being at the floor for N consecutive reviews

**Warning signs:**
- Users report "always reviewing the same words"
- Analytics show a large cluster of vocabulary items stuck at 1-day or 3-day intervals despite multiple correct recalls
- Review queue grows rather than shrinks over time

**Phase to address:**
Content/SRS pipeline phase (the phase that implements vocabulary review scheduling). Define the exact algorithm variant in the schema design step — not after 5,000 records are scheduled.

---

### Pitfall 2: BullMQ Delayed Jobs Silently Lost on Redis Eviction

**What goes wrong:**
SRS review reminders are scheduled as BullMQ delayed jobs: "review this word in 7 days." If Redis runs under memory pressure and evicts keys (using `maxmemory-policy allkeys-lru` or similar), the delayed job entries — stored as sorted-set members in Redis — are silently deleted. No error is thrown. The user simply never receives their review. This is invisible until you notice vocabulary retention plummeting and review queues going dark.

**Why it happens:**
Teams treat Redis as a cache (ephemeral) rather than a job store (durable). The same Redis instance handling HTTP session caching often uses a volatile eviction policy. BullMQ stores delayed jobs as ZSET entries and active job data as hash entries — both are ordinary Redis keys subject to eviction.

**How to avoid:**
- Use a **dedicated Redis instance for BullMQ** with `maxmemory-policy noeviction` — never let the job store be evicted
- Alternatively, use `maxmemory-policy volatile-lru` with `persist` flag on job keys (BullMQ supports this via `removeOnComplete`/`removeOnFail` configuration)
- Set `appendonly yes` in Redis config for the BullMQ instance (AOF persistence) so restarts don't lose scheduled jobs
- Add a PostgreSQL "SRS schedule" table as a source of truth for what's due — BullMQ is the trigger mechanism, but the canonical schedule lives in Postgres. A daily reconciliation job can re-enqueue any jobs that are past-due but were never processed

**Warning signs:**
- Redis memory usage climbing toward `maxmemory` limit
- BullMQ delayed job count drops unexpectedly without corresponding processing
- Vocabulary review completion rates drop suddenly

**Phase to address:**
Infrastructure setup phase (Docker/Redis config) and the SRS scheduling phase. The Docker Compose file must define separate Redis services for caching vs. queuing with different memory policies.

---

### Pitfall 3: CEFR Classifier Systematically Miscategorizing Mixed-Level Content

**What goes wrong:**
The custom CEFR classifier (vocabulary difficulty + sentence complexity + grammar complexity) assigns a single CEFR level to an entire passage. VOA Learning English already targets B1/B2, but individual sentences vary wildly — a news article might have a B1 headline and C1 body. The classifier averages these signals and consistently places content 1 level too high (B2 content classified as C1) for two reasons: (1) proper nouns, technical terms, and place names score as C1 vocabulary but carry no learner difficulty, and (2) compound sentences with coordinating conjunctions ("and," "but") score as syntactically complex. The result: B1 learners see no reading material, B2 learners see content labeled C1 and feel outmatched.

**Why it happens:**
Research shows LLMs and automated classifiers frequently overpredict B2 while struggling with idiomatic expressions and proper nouns. A vocabulary-lookup approach using frequency wordlists (e.g., Oxford 5000) misclassifies proper nouns — "Kazakhstan" is not in Oxford 5000, scoring as C2, but a B1 learner can read around it.

**How to avoid:**
- Exclude proper nouns (NER: PERSON, GPE, ORG, LOC tags) from vocabulary difficulty scoring
- Exclude numbers, dates, and currency from the complexity score
- Use a two-stage classifier: first check source-level metadata (VOA Learning English specifically labels articles as "Everyday Grammar," "Words & Their Stories" by level) before running the local classifier. Trust the source label when available
- Apply sentence-level (not passage-level) scoring; take the 75th percentile difficulty level rather than the mean to avoid outlier drag
- Build a manual override table in the DB: editors can reclassify content that the classifier gets wrong without re-running the pipeline

**Warning signs:**
- B1 level shows fewer than 200 reading passages after crawling 2,000 articles from VOA
- Distribution of CEFR levels after seeding is skewed: >60% C1, <10% B1
- Rejection rate during manual spot-check is >20%

**Phase to address:**
Content pipeline phase. Classifier accuracy must be validated with a stratified sample before bulk seeding — not after.

---

### Pitfall 4: AI Exercise Generation Produces Homogeneous "About Technology" Distractors

**What goes wrong:**
When generating 20–50 exercises per grammar lesson or vocabulary set with an LLM, the model defaults to the same semantic domain for all examples. Grammar exercises all use tech/business contexts ("The report was written by the team"); vocabulary exercises always have distractor synonyms from the same register. After 50 questions in a row featuring "the manager," "the report," and "the deadline," learners notice the content feels machine-generated and disengage. Additionally, LLMs asked to generate exercises without explicit difficulty constraints produce wildly inconsistent CEFR levels within the same set.

**Why it happens:**
LLMs trained on internet text are biased toward common professional contexts. Without explicit diversity constraints in prompts, the model pattern-matches to the most statistically likely context (business/technology). GPT-4 has been documented to fail at generating content that consistently matches specified difficulty levels, producing overly simplistic text at lower levels and excessively complex text at higher ones.

**How to avoid:**
- Rotate topic context in the generation prompt explicitly: maintain a list of 8+ topic domains per module (travel, health, social, environment, history, arts, etc.) and cycle through them across question batches
- Include a "previously used vocabulary" exclusion list in each generation batch prompt to prevent the same 10 words appearing across 50 questions
- Add a CEFR validation step after generation: run generated exercises through the CEFR classifier and discard/regenerate any that fall more than 1 level outside the target
- Specify grammatical structure explicitly: "generate 5 passive-voice sentences using a health-care context at B2 level, none of which use the words 'doctor,' 'patient,' or 'hospital'"
- Store generation provenance (prompt version, model, timestamp) alongside each exercise for future quality auditing

**Warning signs:**
- All exercises for a lesson use the same 3–4 nouns
- Topic distribution histogram across a module shows >40% in one semantic category
- CEFR level variance within a single exercise set spans more than 2 levels

**Phase to address:**
AI exercise generation phase. The prompt templates are as critical as the code — treat them as first-class artifacts with version control and a validation gate.

---

### Pitfall 5: Content Crawler Silently Ingesting Navigation/Boilerplate Text as "Content"

**What goes wrong:**
Cheerio extracts all text from CSS selectors that match the article body, but BBC Learning English and VOA Learning English pages include: navigation menus, "You Might Also Like" widgets, cookie consent text, social share labels, footer links, and "Load More" button labels — all inside the DOM region that looks like article content. These get stored as "reading passages." The crawler runs, the seed count hits 2,000, but 30–40% of "passages" are junk: navigation strings, metadata, or partial fragments under 100 words.

**Why it happens:**
Developers test the scraper on 2–3 pages that are cleanly structured, write the selector, and move on. They don't test against the full distribution of page templates, which includes redesigned pages, mobile variants, A/B test variants, and error pages.

**How to avoid:**
- Add a content quality gate to the pipeline: reject any extracted passage with word count <100, readability score indicating non-prose content (very high or very low ratio of function words to total words), or a domain-specific blocklist of strings ("Share this article," "Related content," "Subscribe," "Cookie Policy")
- Use minimum viable selector specificity: prefer `.article-body p` over `.article-body` to capture only paragraph-level text, not all descendant nodes
- Run the first crawler pass on 50 URLs, manually inspect 20 results, and fix selectors before the full 2,000-URL crawl
- Store `raw_html_snapshot` of the crawled page alongside the extracted text for re-processing when selectors change (VOA and BBC update their templates periodically)
- Implement deduplication using a fast content hash (MD5 of normalized text) stored in a `content_hash` column with a unique index — prevents re-ingesting the same article on re-crawl

**Warning signs:**
- Extracted passages contain "Share," "Follow," "Subscribe," or "All rights reserved" strings
- Average word count of stored passages is under 150
- Multiple passages have identical or near-identical content_hash collisions

**Phase to address:**
Content pipeline phase. Quality gate validation must run before bulk DB insert, not after.

---

### Pitfall 6: PostgreSQL Progress Tracking Tables Without Composite Indexes Cause Full Table Scans at Scale

**What goes wrong:**
A `user_progress` or `srs_reviews` table stores one row per user per vocabulary item per review event. At 1,000 users × 5,000 vocab items × 6 review intervals, that is 30 million rows. A query like "get all vocabulary due for review today for user X" requires a scan over millions of rows if the table only has an index on `user_id`. Dashboard queries like "get accuracy over last 30 days grouped by skill" are even worse — they require full table scans across the reviews table. At seed time (before users exist) this is invisible; at 500 users it becomes a visible bottleneck.

**Why it happens:**
Prisma schema definition focuses on data relationships (foreign keys, cascades). Developers add individual column indexes but miss composite indexes for the most common query patterns. The query pattern is always `WHERE user_id = ? AND due_date <= NOW()` — both columns together — but indexes are defined separately on `user_id` and `due_date`.

**How to avoid:**
- Define composite indexes for every multi-column WHERE clause used in production queries. At minimum:
  - `(user_id, due_date)` on the SRS schedule/review table
  - `(user_id, skill_type, created_at)` on the progress events table
  - `(content_id, cefr_level)` on the content tables
- Use Prisma's `@@index` syntax (not `@unique`) for composite indexes — define them at schema design time, not after performance complaints
- Add a partial index `WHERE status = 'due'` on the SRS reviews table — only pending reviews are queried at runtime, reducing the effective index size by ~80%
- Plan for table partitioning on `user_id` for the reviews table if the project scales to 10,000 concurrent users (required by PROJECT.md constraints)

**Warning signs:**
- `EXPLAIN ANALYZE` on `SELECT * FROM srs_reviews WHERE user_id = $1 AND due_date <= NOW()` shows `Seq Scan` rather than `Index Scan`
- Dashboard API responses >300ms at 100 concurrent users
- Prisma schema has no `@@index` blocks on the progress/review tables

**Phase to address:**
Database schema phase — before any data is inserted. Composite indexes are schema decisions, not performance tuning afterthoughts.

---

### Pitfall 7: Prisma Seeding 20,000+ Records With `create()` in a Loop Runs for Hours

**What goes wrong:**
A seeding script that calls `prisma.quizQuestion.create()` for each of 20,000 questions in a for-loop generates 20,000 individual INSERT statements executed sequentially over the Prisma connection. On a local Docker PostgreSQL instance this runs in ~2–4 hours. On a fresh cloud deployment it may time out. The seed script becomes the single biggest blocker to "deploy and demo" — the project is effectively undemoable.

**Why it happens:**
Prisma's `create()` generates one INSERT per call. Developers write seed scripts that look like application code (create one entity at a time) rather than treating seeding as a bulk-data problem. The performance issue is invisible when seeding 50 records in development.

**How to avoid:**
- Use `prisma.quizQuestion.createMany()` with batch sizes of 500–1,000 records for flat tables
- For tables with relations, use raw SQL via `prisma.$executeRaw` with multi-row VALUES syntax: `INSERT INTO quiz_questions (...) VALUES (...), (...), (...)` — single-round-trip bulk insert
- Seed foreign-key-independent tables first, then child tables in dependency order (grammar_topics → grammar_lessons → exercises → quiz_questions)
- Disable foreign key checks during seeding using a transaction with `SET session_replication_role = replica` for PostgreSQL (re-enable after)
- Target: full seed (500 grammar lessons, 5K vocab, 2K passages, 20K questions) should complete in under 10 minutes

**Warning signs:**
- Seed script has been running for >20 minutes
- `prisma.$queryRaw` is never used in the seed file
- `createMany()` is not used anywhere in the seeding scripts

**Phase to address:**
Seeding phase (infrastructure / data seeding). Verify with a benchmark (seed 1,000 records, measure elapsed time) before scaling to 20,000.

---

### Pitfall 8: Over-Gamification Turning XP/Streaks Into Anxiety Mechanics for Adult Learners

**What goes wrong:**
Implementing Duolingo-style streak anxiety mechanics (streak freeze purchases, "your streak is at risk" push notifications, XP league tables) in a B1/B2/C1 adult learner context backfires. Adults respond to streaks with anxiety and obligation rather than motivation; intermediate and advanced learners particularly resent systems that don't acknowledge their real progress because visible XP gains per lesson shrink as difficulty increases. The result: learners churn at B2 level because the gamification suggests they're making no progress, even as they're making significant linguistic gains.

**Why it happens:**
Duolingo's gamification was designed for casual A1/A2 learners doing 5 minutes/day. The PROJECT.md aesthetic goal ("Duolingo / Quizlet aesthetic") is correct for visual style but should not be taken as a signal to copy motivational mechanics wholesale. Adult professional learners are particularly resistant to patronizing game-like feedback.

**How to avoid:**
- Decouple visual streak display from streak anxiety: show the streak as a positive indicator ("32 days learning") without email/push notifications when it breaks
- XP should be awarded in meaningful chunks proportional to cognitive load — not flat per-lesson. A difficult C1 grammar exercise should award significantly more XP than a B1 flashcard review
- Provide a "competence dashboard" alongside gamification: concrete metrics like "words you now retain for 30+ days" and "reading speed increase" satisfy the adult need for evidence of real improvement
- Avoid league tables and public leaderboards entirely for v1 — the research on adult learners shows these create comparison anxiety without the peer-competition motivation that works for younger learners
- Make streaks "soft" — a 1-day grace period and a visible "streak shield" mechanism that users can unlock rather than buy reduces loss aversion without dark patterns

**Warning signs:**
- The project spec for notifications includes "streak protection alert" — this is a Duolingo dark pattern
- All XP awards are flat (same XP for easy and hard exercises)
- Users in user testing describe feeling "guilty" about the streak

**Phase to address:**
Gamification phase. Make these design decisions explicit before coding the XP system — they are harder to undo than any technical decision.

---

### Pitfall 9: Next.js App Router Caching Serves Stale SRS Due Counts and Progress Data

**What goes wrong:**
Dashboard components that show "X words due for review" and "Y lessons completed today" are built as RSC data fetches. Next.js 14 aggressively caches fetch responses and RSC payloads. After a user completes a review session, the dashboard still shows the old due count because the Router Cache (client-side) serves the stale RSC payload on navigation. The user clicks "Review 15 words" — completes 15 reviews — navigates back to dashboard — still sees "15 words due." This is not a bug: it is the intended behavior of the Router Cache's 30-second default lifetime.

**Why it happens:**
RSC caching is not intuitive. Developers expect that a Server Component refetches data on every navigation (like SSR did). In the App Router, Server Components are cached at the request level AND at the Router Cache level in the browser. A `revalidatePath('/dashboard')` call at the end of a server action only invalidates the server-side cache; the client-side Router Cache may still serve a stale payload until it expires (default: 30 seconds for dynamic routes).

**How to avoid:**
- After any server action that mutates SRS state, call both `revalidatePath('/dashboard')` and `revalidateTag('srs-due-count')` with a tag-based data cache strategy
- For real-time progress displays, use Suspense boundaries with key-based revalidation so the count re-renders independently of the rest of the dashboard
- For the SRS review session itself, use a Client Component with local state — don't rely on RSC for a stateful interactive review flow
- Read the Next.js "Data Security" guide — Server Actions that call `revalidatePath` must be called from within the action itself, not from a client-side callback

**Warning signs:**
- Dashboard data does not update after completing a review session (reproducible after navigating away and back)
- `revalidatePath` is called on the client side (not in a server action) — this has no effect
- No `cache: 'no-store'` or tag-based revalidation on the due-count query

**Phase to address:**
Core dashboard and SRS integration phase. Test the read-your-own-write scenario explicitly before marking the phase complete.

---

### Pitfall 10: Scope Paralysis — Building the Full Platform Before Anything Is Deployed

**What goes wrong:**
A project with 5 learning modules, SRS, gamification, a content crawler, AI generation, adaptive learning, and 20K questions is extremely easy to never ship. The common failure pattern: 8 weeks of schema design and data modeling, then the UI phase begins, then the AI generation pipeline turns out to require more research, then the crawler breaks because BBC changed their DOM structure, then the admin seeding UI gets built "just in case." Six months later the project has 40 half-finished features and zero deployed pages. The portfolio project never ships.

**Why it happens:**
The scope in PROJECT.md is correct for the long-term vision but dangerous if treated as a single deliverable. Developers in portfolio mode tend to over-engineer foundational layers ("the schema needs to be perfect before I write any UI") and underestimate how fast motivation evaporates when there is nothing to demo.

**How to avoid:**
- Define a hard "must be deployed and demoed" milestone that includes only authentication + dashboard + ONE complete learning module end-to-end (e.g., vocabulary only with SRS). Everything else is additive
- Build the seeding pipeline in Phase 1 alongside the first module — never have an empty database, even in development. The PROJECT.md constraint "platform must never appear empty" is correct; the failure is treating it as a late-phase concern
- Each phase must produce a deployable build. "We'll deploy at the end" means you never find real integration issues
- The crawler and AI generation pipeline should have a "stub mode" — hardcoded/static data that allows every other system to develop without waiting for the pipeline to be complete
- Treat the 20K questions and 5K vocab as a "fill the shelf" problem, not a "build the factory" problem: use the cheapest acceptable method that produces working data fast (raw SQL import from CSV), then replace with the pipeline

**Warning signs:**
- No deployed URL after 6 weeks of work
- The schema has >30 tables but the UI has <5 working pages
- The crawler is still being debugged while the UI modules are waiting for content

**Phase to address:**
Phase 1 (MVP foundation). The roadmap must enforce deployability as a phase exit condition — not polish, but a running, seeded, accessible URL.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Single Redis instance for cache + BullMQ jobs | Simpler Docker Compose | SRS reviews lost on Redis memory pressure; silent data loss | Never — the cost is invisible until it causes data loss |
| Flat SM-2 without EF floor mitigation | Fast to implement | Ease hell; users churn on hard vocabulary | Never — fix at implementation time, not after seeding 5K vocab |
| `prisma.create()` loop in seed scripts | Readable code | 4-hour seeding runs block every deployment | Acceptable only for <500 records in dev; never for production seed |
| Single CEFR level per passage (no per-sentence scoring) | Simple schema | Systematic mis-classification causing empty B1 content shelf | Acceptable for MVP if manual override column is added |
| `revalidatePath('/')` in every server action | Easy cache bust | Over-invalidation; unnecessary full-page re-renders | Never — use granular `revalidateTag` per data domain |
| Flat XP per lesson completed | Fast gamification implementation | Kills motivation for difficult content; B2+ learners disengage | Never — complexity-weighted XP is a schema decision, not a feature |
| Skip exercise deduplication in generation pipeline | Faster pipeline | Users see the same question in multiple quiz sessions | Acceptable in MVP if a `exercise_hash` unique column is added to prevent exact duplicates |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| BullMQ + Redis | Same Redis for session cache and job queue, with `allkeys-lru` eviction | Separate Redis service for BullMQ; `maxmemory-policy noeviction` + AOF persistence |
| Prisma + PostgreSQL seeding | Using `create()` in a loop for 20K+ records | `createMany()` in batches of 500–1,000 or `$executeRaw` multi-row INSERT |
| Next.js server actions + mutations | Calling `revalidatePath` from the client | Call `revalidatePath` / `revalidateTag` inside the server action itself |
| BullMQ delayed jobs + timezones | Scheduling review in "7 days" using local time without UTC normalization | Store all due dates in UTC in PostgreSQL; compute delay offsets from UTC timestamps |
| VOA crawler + AP/Reuters content | Crawling all VOA content assuming it is all public domain | Filter out AP/Reuters-credited stories (detectable by byline pattern); VOA's own content is public domain, syndicated content is not |
| OpenAI/AI provider + exercise generation | Single prompt generates 50 questions in one call — hits token limit | Batch into 10 questions per call; include seed/temperature for reproducibility; store raw response alongside parsed exercises |
| NextAuth v5 + App Router | Using `getServerSession()` (v4 pattern) inside RSC | Use `auth()` from NextAuth v5 inside server components and server actions |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| No composite index on `(user_id, due_date)` in SRS table | Dashboard due-count query >500ms; "Review" page slow to load | Add `@@index([userId, dueDate])` in Prisma schema before first migration | ~500 users with full review history |
| N+1 on reading passage with associated questions | `/reading/[id]` page generates 20+ queries (one per question) | Eager load questions with `include: { questions: true }` in single Prisma query | Any page load |
| Full vocabulary table scan for flashcard session | Flashcard load slow on paginated vocabulary sets | Index on `(userId, categoryId, masteryLevel)` for SRS flashcard query | ~2,000 vocabulary records per user |
| Seeding without disabling triggers/indexes | 8+ hour seed run | Wrap large inserts in a transaction; use `SET session_replication_role = replica` to skip FK triggers during bulk load | Any seed run >5,000 records |
| Unbatched BullMQ job creation | Enqueueing 5,000 SRS review jobs one-by-one during vocab import | Use `queue.addBulk()` — single Redis pipeline call for all jobs | Any vocabulary import >100 records |
| CEFR classifier runs synchronously on HTTP request | Crawler POST endpoint times out | Classifier must run in BullMQ worker, never on the HTTP thread | Any crawl run with >10 URLs queued simultaneously |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Exposing admin seed/crawl endpoints without auth guard | Any visitor can trigger a full recrawl or reseed, hammering the database | Protect all `/api/admin/*` routes with middleware auth check + role = `ADMIN` |
| Server actions without Zod input validation | Malformed SRS quality scores (e.g., -999) corrupt EF calculations; prompt injection if user input reaches AI generation prompt | Validate all server action inputs with Zod schemas before processing |
| CVE-2025-29927: Skipping middleware via `x-middleware-subrequest` header | Authentication bypass on all protected routes | Upgrade Next.js to patched version (15.2.3+ / 14.2.25+); never rely on middleware alone for data authorization — validate session in the server action/route handler too |
| Crawled content stored raw with script tags | Stored XSS if scraped content is rendered without sanitization | Sanitize all crawled HTML with a library like DOMPurify or use a plain-text extraction step (strip all HTML) before storing |
| BullMQ job data contains full user-provided strings | If job processor `eval`s or dynamically constructs queries from job data, injection risk | Job data should contain only IDs (userId, vocabId, reviewScore) — never raw text from user input |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Streak-break notification as guilt mechanic | Adult learners feel anxiety and avoid opening app after missing one day | Show streak as positive milestone display only; no push notifications for streak loss; offer "streak shield" grace periods |
| Flat XP rewards regardless of exercise difficulty | B2/C1 learners feel their hard work is invisible; they earn the same XP as B1 learners for significantly harder exercises | Weight XP by CEFR level and exercise type: C1 grammar transformation = 3× XP of B1 multiple choice |
| Empty CEFR level shelf on first login | New user sees "No content available at your level" — app appears broken | Seed validation must confirm >100 items at every CEFR level (B1, B2, C1) before a seed is considered successful |
| Placement test result locked in | User placed at wrong level has no way to change it | Allow manual CEFR override from profile settings; placement test result is a starting point, not a gate |
| SRS review queue shows 150 cards on first login | Overwhelming backlog causes immediate churn | Cap daily new card introductions at 20; backlog of due cards at 50 max shown per session |
| Reading timer displayed as a stress inducer | Users rush and skim; comprehension drops | Timer should be opt-in, displayed as a personal pace reference, not as a pass/fail countdown |

---

## "Looks Done But Isn't" Checklist

- [ ] **SRS scheduling:** Ease factor floor mitigation is implemented — verify by simulating 10 "Again" responses on a single card and checking EF does not permanently floor
- [ ] **BullMQ persistence:** Redis for BullMQ uses `maxmemory-policy noeviction` and AOF persistence — verify with `redis-cli CONFIG GET maxmemory-policy`
- [ ] **Seed completeness:** Each CEFR level (B1/B2/C1) has >100 entries in every module (grammar lessons, vocab sets, reading passages, listening transcripts) — run a seed validation query before marking seeding phase complete
- [ ] **CEFR classifier:** Proper noun exclusion is implemented — verify by running the classifier on a sentence containing "Barack Obama" and confirming the name is excluded from vocabulary difficulty
- [ ] **Content crawler:** Boilerplate filter is active — verify by inspecting 20 random extracted passages for navigation/footer strings
- [ ] **Exercise generation:** Topic rotation is implemented — verify that 50 exercises across a single module use at least 5 distinct semantic domains
- [ ] **Server actions cache:** Dashboard due counts update immediately after a review session — verify by completing a review, navigating away, and navigating back within 5 seconds
- [ ] **Next.js CVE-2025-29927:** Project uses Next.js ≥14.2.25 or ≥15.2.3 — verify `package.json`
- [ ] **Database indexes:** `EXPLAIN ANALYZE` on the SRS due-count query confirms `Index Scan` not `Seq Scan`
- [ ] **Seed script speed:** Full seed completes in <10 minutes — verify with `time npx prisma db seed` on a clean DB

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| SRS ease-factor hell already deployed | MEDIUM | Write a migration that resets EF to 2.5 for all users where EF = 1.3 AND correct_streak >= 3; add the mean-reversion logic; re-deploy |
| BullMQ jobs lost from Redis eviction | HIGH | Query PostgreSQL `srs_schedule` table (if you built the source-of-truth pattern) to find all reviews past-due; re-enqueue via `queue.addBulk()`; if no source-of-truth exists, force all users to review all vocabulary once as a "refresh" |
| Crawler ingested boilerplate content | MEDIUM | Write a cleanup query that deletes passages where word count < 100 or content matches boilerplate regex; re-run crawler with fixed selectors; re-classify CEFR levels for remaining content |
| Seed script takes 4+ hours | LOW | Stop the script; rewrite to use `createMany()` / raw SQL bulk insert; truncate tables; re-seed |
| CEFR over-classification (B2 content labeled C1) | MEDIUM | Add a manual override column; bulk update obvious mis-classifications via SQL; implement the proper noun exclusion fix; run re-classification on the affected content only |
| Next.js middleware auth bypass (CVE-2025-29927) | HIGH | Patch Next.js immediately; audit all routes that relied only on middleware for authorization; add server-side session validation to every server action and route handler that touches user data |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| SRS ease-factor hell | SRS / vocabulary review phase | Simulate 10 "Again" responses; confirm EF recovery path exists |
| BullMQ Redis eviction | Infrastructure / Docker setup | `redis-cli CONFIG GET maxmemory-policy` returns `noeviction` for BullMQ Redis |
| CEFR classifier over-classification | Content pipeline phase | Sample 50 classified passages manually; B1 shelf has >100 items |
| AI exercise homogeneity | AI exercise generation phase | Topic distribution audit: 5+ distinct domains per 50 exercises |
| Crawler boilerplate ingestion | Content pipeline phase | Spot-check 20 passages; word count >100; no nav/footer strings |
| PostgreSQL missing composite indexes | Database schema phase (before first migration) | `EXPLAIN ANALYZE` confirms Index Scan on SRS due-count query |
| Prisma seeding performance | Data seeding phase | Full seed completes in <10 minutes |
| Over-gamification / streak anxiety | Gamification phase design | No "streak at risk" push notification exists; XP is complexity-weighted |
| Next.js RSC stale data | Core dashboard / SRS integration phase | Read-your-own-write test passes after review session |
| Scope paralysis / never ships | Phase 1 (MVP foundation) | A deployed URL with auth + one working module exists by end of Phase 1 |

---

## Sources

- BullMQ documentation — delayed jobs and stalled job recovery: https://docs.bullmq.io/guide/jobs/delayed
- BullMQ production guide: https://docs.bullmq.io/guide/going-to-production
- Prisma bulk insert performance issue (GitHub #3835): https://github.com/prisma/prisma/issues/3835
- Prisma high memory usage on upsert (GitHub #16912): https://github.com/prisma/prisma/issues/16912
- Anki SM-2 ease factor floor / ease hell: https://faqs.ankiweb.net/what-spaced-repetition-algorithm
- FSRS vs SM-2 comparison: https://www.mindomax.com/fsrs-vs-sm2-spaced-repetition-algorithm
- CEFR automated classification consistency study (ResearchGate 2025): https://www.researchgate.net/publication/393805731_Evaluating_the_consistency_of_automated_CEFR_analyzers_a_study_of_English_language_text_classification
- LLM CEFR generation accuracy (ScienceDirect 2025): https://www.sciencedirect.com/science/article/pii/S2772766125000205
- Gamification dark patterns and adult learners: https://medium.com/@neil_62402/gamification-dark-patterns-light-patterns-and-psychology-9442d49f8b56
- Streak mechanics and adult learner anxiety (2026): https://www.taalhammer.com/why-daily-streak-apps-often-fail-serious-learners-and-which-language-learning-app-works-better-instead-in-2026
- Gamification fatigue in adult education (ScienceDirect 2025): https://www.sciencedirect.com/article/pii/S2666374025000317
- Next.js App Router RSC best practices (2025): https://www.youngju.dev/blog/culture/2026-04-15-react-server-components-nextjs-app-router-rsc-protocol-server-actions-ppr-streaming-deep-dive-guide-2025.en
- CVE-2025-29927 Next.js middleware bypass: https://nextjs.org/blog/security-update-2025-12-11
- React Server Components critical vulnerability (December 2025): https://react.dev/blog/2025/12/03/critical-security-vulnerability-in-react-server-components
- VOA Learning English copyright/licensing: https://learningenglish.voanews.com/p/6861.html
- ELRC legal analysis of web crawling: https://www.elra.info/media/filer_public/2021/02/12/elrc-legal-analysis-webcrawling_report-v11.pdf
- AI-generated content repetitiveness: https://beomniscient.com/blog/pitfalls-ai-generated-content/
- Language learning app burnout and streak culture: https://fluentrebel.com/language-learning-app-burnout-manufactured-streak-culture/

---
*Pitfalls research for: EFL / EdTech — English Learning Platform (Next.js + PostgreSQL + Redis + BullMQ)*
*Researched: 2026-06-11*
