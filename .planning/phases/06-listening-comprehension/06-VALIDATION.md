---
phase: 6
slug: listening-comprehension
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-15
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.x |
| **Config file (API)** | `apps/api/vitest.config.ts` (exists) |
| **Config file (Web)** | `apps/web/vitest.config.ts` (exists, jsdom environment) |
| **Quick run command (API)** | `pnpm --filter @repo/api test` |
| **Quick run command (Web)** | `pnpm --filter @repo/web test` |
| **Full suite command** | `pnpm turbo test` |
| **Estimated runtime** | ~60 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter @repo/api test && pnpm --filter @repo/web test`
- **After every plan wave:** Run `pnpm turbo test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| LIST-01-a | TBD | 0 | LIST-01 | — | `getItems()` returns paginated items filtered by cefrLevel/topic/contentType | unit | `pnpm --filter @repo/api test -- --reporter verbose listening.service.spec` | ❌ W0 | ⬜ pending |
| LIST-01-b | TBD | 0 | LIST-01 | — | `getItems()` returns `{ items, total, page, limit, totalPages }` | unit | same file | ❌ W0 | ⬜ pending |
| LIST-02 | TBD | 0 | LIST-02 | — | Each ListeningContent has ≥1 MULTIPLE_CHOICE, ≥1 FILL_MISSING_WORDS, ≥1 DICTATION question | unit (seed validator) | `pnpm --filter @repo/api test -- listening-seed.service.spec` | ❌ W0 | ⬜ pending |
| LIST-03-a | TBD | 0 | LIST-03 | — | `setSpeed()` updates `audioRef.current.playbackRate` | unit (hook) | `pnpm --filter @repo/web test -- use-audio-player.test` | ❌ W0 | ⬜ pending |
| LIST-03-b | TBD | 0 | LIST-03 | — | `seek(time)` sets `audioRef.current.currentTime` | unit (hook) | same file | ❌ W0 | ⬜ pending |
| LIST-04-a | TBD | 0 | LIST-04 | — | Transcript renders blurred when `transcriptLocked=true` | component | `pnpm --filter @repo/web test -- transcript-panel.test` | ❌ W0 | ⬜ pending |
| LIST-04-b | TBD | 0 | LIST-04 | — | Blur transitions to clear when `transcriptLocked=false` | component | same file | ❌ W0 | ⬜ pending |
| LIST-05-a | TBD | 0 | LIST-05 | — | `findActiveWordIndex(words, currentTime)` returns correct index via binary search | unit | `pnpm --filter @repo/web test -- use-audio-player.test` | ❌ W0 | ⬜ pending |
| LIST-05-b | TBD | 0 | LIST-05 | — | `findActiveWordIndex` returns -1 when currentTime is between words | unit | same file | ❌ W0 | ⬜ pending |
| LIST-06 | TBD | 0 | LIST-06 | — | WordPopover renders on word tap in unlocked transcript | component | `pnpm --filter @repo/web test -- transcript-panel.test` | ❌ W0 | ⬜ pending |
| LIST-07-a | TBD | 0 | LIST-07 | — | `completeSession()` upserts `ListeningProgress` with `where: { userId_contentId }` | unit | `pnpm --filter @repo/api test -- listening.service.spec` | ❌ W0 | ⬜ pending |
| LIST-07-b | TBD | 0 | LIST-07 | — | `completeSession()` emits XpEvent with correct skillArea=LISTENING | unit | same file | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/api/src/listening/listening.service.spec.ts` — covers LIST-01, LIST-07 (mirrors `reading.service.spec.ts` exactly)
- [ ] `apps/web/src/hooks/use-audio-player.test.ts` — covers LIST-03, LIST-05 (pure logic; binary search + playbackRate/seek tests)
- [ ] `apps/web/src/components/listening/transcript-panel.test.tsx` — covers LIST-04, LIST-06 (blur state + WordPopover tap)
- [ ] `packages/shared/src/listening.dto.ts` — Zod schemas (compile-time checked; no separate test file needed)

---

## Additional Algorithm Tests (non-requirement, critical path)

| Algorithm | Inputs | Expected Output | Command |
|-----------|--------|-----------------|---------|
| Dictation scoring: exact match with punctuation | `scoreDictation('Hello world', 'Hello, world!')` | `{ isCorrect: true, distance: 0 }` | `pnpm --filter @repo/api test -- dictation` |
| Dictation scoring: typo within threshold | `scoreDictation('Helo world', 'Hello world')` | `{ isCorrect: true, distance: 1 }` | same |
| Dictation scoring: wrong answer | `scoreDictation('Goodbye', 'Hello world')` | `{ isCorrect: false, distance: 10 }` | same |
| Binary search at exact word boundary | `findActiveWordIndex([{word:'hello',start:0,end:0.5}], 0.5)` | `-1` (between words) | `pnpm --filter @repo/web test -- use-audio-player.test` |

---

## Pipeline Smoke Tests

- `pnpm --filter @repo/api pipeline:validate:listening` — 20-URL sample per source (VOA/BBC/ESLPod/TED); success criteria: ≥90% audio download rate, transcript ≥50 words, Whisper response has `words` array
