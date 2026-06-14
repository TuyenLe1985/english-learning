# Phase 5: Reading Comprehension + Content Pipeline - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-14
**Phase:** 5-Reading Comprehension + Content Pipeline
**Areas discussed:** Comprehension questions layout, Highlight + annotation UX, Content pipeline delivery model, Tap-to-SRS word lookup (VOCAB-08)

---

## Comprehension Questions Layout

### Q1: How should comprehension questions be presented?

| Option | Description | Selected |
|--------|-------------|----------|
| Inline below passage | All questions scroll below the passage. User can scroll back up anytime to re-read. New pattern — no existing component. | ✓ |
| Quiz-mode carousel | User reads full passage, clicks 'Start Quiz'. One question at a time, passage hidden. Reuses practice-session.tsx. | |
| Side-by-side split | Passage on the left, questions on the right (sticky). Desktop only — collapses on mobile. Most complex to build. | |

**User's choice:** Inline below passage
**Notes:** User accepted the recommended option. Trade-off acknowledged: new component needed vs. more natural reading comprehension UX.

---

### Q2: When does the user see the result for each question?

| Option | Description | Selected |
|--------|-------------|----------|
| Immediate feedback per question | Each question shows correct/incorrect right away with explanation. | ✓ |
| Submit all, then review | Answer all, click Submit, then get a full results screen. Matches vocab session pattern. | |
| You decide | Claude picks — consistent with prior session behavior. | |

**User's choice:** Immediate feedback per question
**Notes:** Chosen over batch submit despite batch being the established pattern. Inline reading comprehension benefits from immediate correction before moving to next question.

---

### Q3: Where does the reading timer live?

| Option | Description | Selected |
|--------|-------------|----------|
| Passive timer in page header — auto-records | Elapsed counter starts on load, stops on session complete. Auto-saves readingTimeSec. | ✓ |
| User-controlled stopwatch | User clicks Start/Stop manually. More intentional but adds friction. | |
| You decide | Claude picks. | |

**User's choice:** Passive timer in page header — auto-records
**Notes:** Minimal friction approach. Timer runs silently, no user action needed.

---

### Q4: What happens after the user completes all questions?

| Option | Description | Selected |
|--------|-------------|----------|
| Score summary inline + continue browsing | Results card appears below last question. User stays on passage page. | ✓ |
| Full results screen (new page or modal) | Redirects to or opens results screen like session-results.tsx. | |
| Silent save, no interruption | Score saves automatically, no results shown. Check progress on dashboard. | |

**User's choice:** Score summary inline + continue browsing
**Notes:** Consistent with the "stay in context" philosophy of inline questions. User remains on the passage with access to highlights/notes after completing.

---

## Highlight + Annotation UX

### Q1: How should the passage content be rendered?

| Option | Description | Selected |
|--------|-------------|----------|
| Plain text, paragraph blocks | Styled `<p>` tags. Clean offset math. No HTML sanitization needed. | |
| HTML with formatting preserved | Basic HTML formatting (bold, italics, structure). Richer but complex offset handling. Requires DOMPurify. | ✓ |
| Markdown rendered to HTML | Content stored as Markdown, rendered via remark/rehype. Same offset complexity as HTML. | |

**User's choice:** HTML with formatting preserved
**Notes:** User chose richer formatting over simplicity. Offset handling addressed via text-position anchoring strategy (next question).

---

### Q2: How should highlight offsets be anchored with HTML rendering?

| Option | Description | Selected |
|--------|-------------|----------|
| Text-position anchoring — offsets on stripped text | Strip HTML, compute offsets on plain text, re-apply via @hypothesis/anchoring. No schema migration. | ✓ |
| XPath/range serialization | Serialize Selection as XPath + character offset. Requires schema migration (new JSON field). | |
| Paragraph + character index | {paragraphIndex, start, end} JSON. Simpler than XPath but requires schema migration. | |

**User's choice:** Text-position anchoring — offsets on stripped text
**Notes:** Fits existing schema (`startOffset`/`endOffset` integers). No migration needed.

---

### Q3: How is highlighting triggered?

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-save on text selection | Select text → tooltip with highlight icon → click saves immediately. Zero friction. | ✓ |
| Select + confirm dialog | Selection → dialog asks for confirmation. More intentional, prevents accidents. | |
| Highlight mode toggle | 'Highlight mode' button puts passage in highlight state. All selections auto-save while in mode. | |

**User's choice:** Auto-save on text selection
**Notes:** Medium/Kindle web established pattern. Chosen for UX simplicity.

---

### Q4: How are notes added?

| Option | Description | Selected |
|--------|-------------|----------|
| Floating sticky note panel | Slide-in panel (right sidebar / bottom sheet mobile). One note per user+passage. Auto-saves on blur. | ✓ |
| Paragraph-anchored notes | Margin icon per paragraph. Multiple notes. Requires schema migration (paragraphIndex on Note). | |
| Notes only in sidebar annotations panel | Single sidebar shows all annotations. Notes added there. | |

**User's choice:** Floating sticky note panel
**Notes:** One note per passage aligns with existing schema (no paragraphIndex). Simplest implementation.

---

## Content Pipeline Delivery Model

### Q1: How should the content pipeline be architected?

| Option | Description | Selected |
|--------|-------------|----------|
| Standalone pnpm script (Recommended) | NestJS CLI command. Runs offline, deterministic. Easy to test 50-URL sample before bulk run. | ✓ |
| NestJS BullMQ pipeline service | Crawler jobs in BullMQ queues. Production-grade for recurring refresh, complex for seeding phase. | |
| Pre-bundled JSON dataset — no live crawler | Skip live crawler entirely. Fastest delivery. No ongoing refresh capability. | |

**User's choice:** Standalone NestJS CLI script
**Notes:** STATE.md VOA/BBC selector validation concern addressed by the sample-first approach in the standalone script.

---

### Q2: Which CEFR word list?

| Option | Description | Selected |
|--------|-------------|----------|
| GitHub Words-CEFR-Dataset (bundled) | Download once, bundle as JSON. No API calls during classification. Already in CLAUDE.md. | ✓ |
| EVP online API | Cambridge's EVP via API. Authoritative but requires API key + network + rate limits. | |
| Custom simplified word list | Build from COCA corpus. Control but significant upfront effort. | |

**User's choice:** GitHub Words-CEFR-Dataset (bundled)
**Notes:** Offline classifier — no network dependency during pipeline runs.

---

### Q3: Where does the seed content come from?

| Option | Description | Selected |
|--------|-------------|----------|
| Live crawler — VOA + BBC + NewsInLevels (Recommended) | All 4 PIPE-01 sources. Selector validation step first. | ✓ |
| Crawler against VOA only | Limit Phase 5 to one source. BBC/NewsInLevels added later. | |
| Crawler + AI-generated fallback | Run crawler, AI fills gap if yield < 2,000. | |

**User's choice:** Live crawler against all 4 sources
**Notes:** Full PIPE-01 scope. 50-URL validation required per source before bulk run (STATE.md blocker).

---

### Q4: What happens to passages below 0.65 confidence?

| Option | Description | Selected |
|--------|-------------|----------|
| Store with flaggedForReview=true, isPublished=false (Recommended) | DB stored but excluded from UI. Future manual review. | ✓ |
| Discard flagged passages entirely | Drop during pipeline. Simpler but risks < 2,000 publishable passages. | |
| Publish all, flag in UI for admin review | All passages live with admin warning badge. | |

**User's choice:** Store with flaggedForReview=true, isPublished=false
**Notes:** Uses existing schema fields. Quality gate without data loss.

---

## Tap-to-SRS Word Lookup (VOCAB-08)

### Q1: What definition source is used?

| Option | Description | Selected |
|--------|-------------|----------|
| VocabularyWord table lookup + no-match graceful fallback (Recommended) | Check VocabularyWord table. If found: show definition. If not: show word + context, offer "Add to SRS". | ✓ |
| Free Dictionary API fallback | api.dictionaryapi.dev if word not in table. Always shows definition but adds external dependency. | |
| No definition — just add to SRS | Popover with just 'Add [word] to SRS?' and confirm. Zero complexity but no definition. | |

**User's choice:** VocabularyWord table lookup + no-match graceful fallback
**Notes:** No external API dependency. As Phase 5 seeds more vocabulary via the pipeline, lookup hit rate increases over time.

---

### Q2: How is the word tap interaction triggered?

| Option | Description | Selected |
|--------|-------------|----------|
| Single-word tap → inline popover (Recommended) | Wrap each word in `<span data-word>`. Single tap shows popover with definition + Add to SRS. | ✓ |
| Long-press or double-click only | More deliberate but less discoverable. | |
| Highlight-first, then add | Must highlight word first. Integrates with highlight flow but adds steps. | |

**User's choice:** Single-word tap → inline popover
**Notes:** Most discoverable interaction. Consistent with mobile-first design goal.

---

### Q3: What sentence is passed as contextSentence?

| Option | Description | Selected |
|--------|-------------|----------|
| The sentence containing the tapped word (Recommended) | Extract surrounding sentence (split on . / ! / ?). Most relevant context for recall. | ✓ |
| Full passage title + first sentence | '[Title] — [First 100 chars]'. Consistent but less targeted. | |
| User types their own context note | Text field in popover. Most intentional but highest friction. | |

**User's choice:** The sentence containing the tapped word
**Notes:** Reuses Phase 3 SRS enrollment endpoint unchanged — just passes the extracted sentence.

---

## Claude's Discretion

- NestJS ReadingModule structure (controller, service, DTOs — follow GrammarModule as closest template)
- Specific endpoint paths for reading, highlights, notes, bookmarks
- React Query cache strategy for passage data and annotations
- HTML sanitization library choice (DOMPurify vs isomorphic-dompurify)
- Tailwind classes for highlight color overlay
- Specific Lucide icons for passage content types
- Crawler CSS selector implementation per source
- CEFR classifier weight tuning (vocabulary 50%, sentence length 25%, syntactic 25% from CLAUDE.md)

## Deferred Ideas

- BullMQ content refresh pipeline for recurring crawls (post-v1)
- Paragraph-anchored notes with multiple notes per passage (schema migration needed)
- Karaoke-style highlight playback
- External dictionary API fallback for tap-to-SRS
- Content freshness/refresh UI for admin
