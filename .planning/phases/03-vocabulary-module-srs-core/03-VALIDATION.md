---
phase: 3
slug: vocabulary-module-srs-core
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-12
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.x (NestJS + Next.js) |
| **Config file** | `apps/api/vitest.config.ts` + `apps/web/vitest.config.ts` |
| **Quick run command** | `pnpm --filter @repo/api test:unit --run` |
| **Full suite command** | `pnpm turbo test --filter='./apps/*'` |
| **Estimated runtime** | ~30 seconds (unit) / ~90 seconds (full) |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter @repo/api test:unit --run`
- **After every plan wave:** Run `pnpm turbo test --filter='./apps/*'`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 0 | VOCAB-01 | — | N/A | unit | `pnpm --filter @repo/api test:unit --run -- vocabulary.service` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 0 | VOCAB-02 | — | N/A | unit | `pnpm --filter @repo/api test:unit --run -- vocabulary.service` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 1 | VOCAB-03 | — | Session state never persisted server-side mid-session | unit | `pnpm --filter @repo/api test:unit --run -- practice.service` | ❌ W0 | ⬜ pending |
| 03-03-01 | 03 | 2 | VOCAB-04 | T-03-01 | POST /api/srs/enroll requires valid JWT; upsert is idempotent | unit | `pnpm --filter @repo/api test:unit --run -- srs.service` | ❌ W0 | ⬜ pending |
| 03-03-02 | 03 | 2 | VOCAB-05 | — | FSRS repeat() returns correct scheduling | unit | `pnpm --filter @repo/api test:unit --run -- fsrs` | ❌ W0 | ⬜ pending |
| 03-04-01 | 04 | 2 | VOCAB-06 | T-03-02 | GET /api/srs/queue requires JWT; returns only caller's cards | unit | `pnpm --filter @repo/api test:unit --run -- srs.service` | ❌ W0 | ⬜ pending |
| 03-05-01 | 05 | 3 | VOCAB-07 | — | N/A | unit | `pnpm --filter @repo/api test:unit --run -- vocabulary.service` | ❌ W0 | ⬜ pending |
| 03-06-01 | 06 | 0 | VOCAB-01–07 | — | Seed idempotent; demo user only in non-production | unit | `pnpm --filter @repo/database db:seed -- --dry-run 2>&1 | grep "200 words"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/api/src/vocabulary/vocabulary.service.spec.ts` — stubs for VOCAB-01, VOCAB-02, VOCAB-07
- [ ] `apps/api/src/srs/srs.service.spec.ts` — stubs for VOCAB-04, VOCAB-05, VOCAB-06
- [ ] `apps/api/src/vocabulary/practice.service.spec.ts` — stubs for VOCAB-03
- [ ] `ts-fsrs` installed in `apps/api` — if missing, unit tests cannot compile
- [ ] `@tanstack/react-query` installed in `apps/web` — required for vocabulary list + review queue
- [ ] `framer-motion` installed in `apps/web` — required for flashcard flip animation

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Flashcard flip animation renders correctly | VOCAB-03 | Visual/animation; not unit-testable | Start dev server, navigate to `/vocabulary/[category]/practice`, confirm flip transition occurs on card click |
| Matching exercise tap grid: word→definition matching, pairs disappear | VOCAB-03 | DOM interaction sequence; Playwright preferred | Navigate to practice session with matching exercise type, tap a word then tap its definition, confirm pair disappears |
| Pronunciation play button fires R2 audio or falls back to SpeechSynthesis | VOCAB-02 | Browser audio API; not unit-testable | Navigate to `/vocabulary/[category]/[wordId]`, click play, verify audio plays (or check DevTools for SpeechSynthesis call when R2 URL is null) |
| Review queue persists reschedule across page refresh | VOCAB-06 | E2E; requires real DB | Complete a review session, refresh, confirm reviewed cards no longer appear in queue |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
