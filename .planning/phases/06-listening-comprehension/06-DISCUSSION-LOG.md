# Phase 6: Listening Comprehension - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-15
**Phase:** 6-listening-comprehension
**Areas discussed:** Transcript sync approach, Audio content source + pipeline, Audio player implementation, Exercise flow vs. audio

---

## Transcript Sync Approach

| Option | Description | Selected |
|--------|-------------|----------|
| Word-level | Each word highlights as spoken. Requires per-word timestamps via WebVTT word-level or Whisper forced alignment. Best experience. | ✓ |
| Sentence/phrase level | Highlight one sentence at a time. Simpler, standard WebVTT cue granularity. | |
| Paragraph / cue level | One cue block at a time. Simplest — no reprocessing of standard WebVTT files. | |

**User's choice:** Word-level

---

| Option | Description | Selected |
|--------|-------------|----------|
| Whisper forced alignment | Run openai/whisper in Docker; free, local, works on any audio source, produces per-word timestamps. | ✓ |
| Source WebVTT/SRT only | Use only sources that provide WebVTT. Simpler pipeline but sentence-level only. | |
| Manual annotation / pre-generated JSON | Supply pre-processed timestamps bundled with seed data. No pipeline step but limits content. | |

**User's choice:** Whisper forced alignment (Docker container in pipeline)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Docker container in pipeline | Add whisper-worker service to docker-compose.yml; pipeline calls it. Self-contained. CPU-only acceptable for one-time seed run. | ✓ |
| Pre-run offline, import JSON | Run Whisper once outside Docker; commit word-timestamp JSONs to seed-data/. No runtime dependency. | |
| faster-whisper via Python subprocess | Python subprocess from NestJS pipeline. Complex cross-language integration. | |

**User's choice:** Docker container in pipeline

---

| Option | Description | Selected |
|--------|-------------|----------|
| Json column on ListeningItem | `wordTimestamps: Json` column — `[{word, start, end}]`. One DB read. Prisma Json type. | ✓ |
| Separate TranscriptWord table | Normalized table per word. Better query flexibility but JOIN overhead. | |
| External file in R2/MinIO | Store .json file alongside MP3. Keeps DB clean but extra HTTP request per item. | |

**User's choice:** JSON column on ListeningItem

---

## Audio Content Source + Pipeline

| Option | Description | Selected |
|--------|-------------|----------|
| Crawl sources with public audio + transcripts | VOA Learning English, BBC Learning English, ESLPod and other sources for all 5 content types. | ✓ |
| TTS-generate from reading passages | Google Cloud TTS on Phase 5 passages. No separate crawler but lacks natural conversation rhythm. | |
| Mix: crawl authentic + TTS for fill | Two pipelines. Better CEFR coverage but more complexity. | |

**User's choice:** Crawl authentic sources (VOA + BBC + ESLPod + lecture source)

---

| Option | Description | Selected |
|--------|-------------|----------|
| 200–300 items | ~50–100 per CEFR level. ~30 min seed run. ~900 MB storage. | ✓ |
| 500–600 items | Richer library, 60–90 min seed run, ~1.5 GB storage. | |
| 50–80 items (minimal seed) | ~10 min. Just enough for smoke test. | |

**User's choice:** 200–300 items

---

| Option | Description | Selected |
|--------|-------------|----------|
| Extend Phase 5's PipelineModule | Add ListeningCrawlerService + ListeningSeedService to existing apps/api/src/pipeline/. Same CLI pattern. | ✓ |
| Separate standalone pipeline CLI | New apps/api/src/pipeline-listening/ module. Cleaner separation, duplicates bootstrap. | |
| Single combined pipeline with --type flag | DRY but couples two independent pipelines. | |

**User's choice:** Extend Phase 5's PipelineModule

---

| Option | Description | Selected |
|--------|-------------|----------|
| News + educational only | VOA + BBC. Consistent MP3+transcript. Covers news report, conversation, interview types. | |
| All 5 types from day one | Actively target all 5: conversation, interview, podcast, lecture, news report. | ✓ |
| You decide | Choose sources and content type coverage based on crawlability. | |

**User's choice:** All 5 content types from day one

---

## Audio Player Implementation

| Option | Description | Selected |
|--------|-------------|----------|
| Custom HTML5 + React hooks | Native `<audio>` + `useAudioPlayer()` hook. Full control, no extra bundle weight, straightforward karaoke wiring. | ✓ |
| Plyr.js wrapper | Polished player (~25 KB). Handles accessibility out of the box but customizing karaoke requires hooking into its event API. | |
| Howler.js | Audio-only library. Still need full UI from scratch. Better for game audio. | |

**User's choice:** Custom HTML5 + React hooks

---

| Option | Description | Selected |
|--------|-------------|----------|
| Transcript-cue sections | Click any sentence → seek to that timestamp. Natural for language learners. | ✓ |
| Fixed-time intervals (10-second chunks) | "Replay last 10s" button. Simpler but less useful for specific sentences. | |
| User-defined A–B loop markers | Powerful but complex UI. | |

**User's choice:** Transcript-cue sections (click sentence → jump to timestamp)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Sticky header player + scrollable transcript below | Player fixed at top, transcript scrolls with auto-scroll to active word. Standard podcast/audiobook UX. | ✓ |
| Split view: player left, transcript right | Two-column on desktop, stacked on mobile. Good desktop use but adds responsive complexity. | |
| Player at bottom (Spotify style) | Mini-player at bottom, transcript fills main area. Familiar but requires persistent layout context. | |

**User's choice:** Sticky header player + scrollable transcript below

---

| Option | Description | Selected |
|--------|-------------|----------|
| Speed toggle buttons in player bar | Four pill buttons: 0.75× / 1× / 1.25× / 1.5× inline in player bar. Touch-friendly. | ✓ |
| Dropdown/select in player bar | Single button showing current speed, opens dropdown. Saves space but extra tap. | |
| You decide | Choose based on player layout. | |

**User's choice:** Speed toggle buttons in player bar

---

## Exercise Flow vs. Audio

| Option | Description | Selected |
|--------|-------------|----------|
| Listen fully first, then answer (IELTS style) | "Start Exercises" button activates after 50% listened. Transcript locked throughout. | ✓ |
| Interleaved: pause at timestamps, answer, resume | Questions appear at markers. Complex to implement, may feel disruptive. | |
| Simultaneous: questions visible from start | Question panel always visible. Most flexible but less structured. | |

**User's choice:** Listen-first flow (IELTS/TOEFL style)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Multiple choice + fill-missing-words + dictation | Standard MC, transcript-derived fill-blank, and short-clip typing exercise. | ✓ |
| Multiple choice + fill-missing-words + speaker-intention | Higher-order comprehension for C1. Harder to author at scale. | |
| All 6 types from day one | Above LIST-02 requirement. Significant additional scope. | |

**User's choice:** Multiple choice + fill-missing-words + dictation

---

| Option | Description | Selected |
|--------|-------------|----------|
| Full transcript interaction unlocks together | Transcript text + karaoke + section-jump all unlock simultaneously after submit. | ✓ |
| Transcript reveals, section-jump stays disabled | Extra "Review mode" toggle needed. | |
| You decide | Handle unlock interaction however makes most sense. | |

**User's choice:** Full transcript unlock together after submission

---

| Option | Description | Selected |
|--------|-------------|----------|
| Inline score card, stay on page | Results card below last question. Same as Phase 5 D-04. User reviews transcript immediately. | ✓ |
| Dedicated results screen (full page redirect) | Clean separation but breaks flow back to transcript. | |
| Modal overlay | Results pop up in modal. Keeps context but adds a layer. | |

**User's choice:** Inline score card, stay on page

---

## Claude's Discretion

- NestJS ListeningModule structure (follow ReadingModule from Phase 5)
- Specific endpoint paths (e.g., `/api/listening/items`, `/api/listening/items/:id`, `/api/listening/sessions/complete`)
- React Query cache strategy for listening item detail
- Exact Prisma schema for ListeningItem, ListeningExercise, ListeningProgress models
- Whisper model size (tiny/base/small — `base` recommended)
- Specific CSS for transcript word highlighting
- Playwright selectors for each audio source (validate before bulk crawl)
- ContentType enum values in Prisma schema

## Deferred Ideas

- BullMQ recurring pipeline for content refresh (post-v1)
- Speaker diarization (multi-speaker attribution)
- A–B loop repeat (user-defined timestamp loop markers)
- Adaptive exercise difficulty based on user CEFR level (Phase 8)
- Offline playback / Service Worker audio caching (post-v1)
