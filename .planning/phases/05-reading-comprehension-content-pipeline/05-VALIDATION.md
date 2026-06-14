---
phase: 5
slug: reading-comprehension-content-pipeline
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-14
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.x |
| **Config file (API)** | `apps/api/vitest.config.ts` (exists, `environment: 'node'`) |
| **Config file (Web)** | `apps/web/vitest.config.ts` (exists, `environment: 'jsdom'`) |
| **Quick run command** | `pnpm --filter @repo/api test` |
| **Full suite command** | `pnpm test` (Turborepo) |
| **Estimated runtime** | ~30 seconds (quick), ~2 minutes (full) |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter @repo/api test`
- **After every plan wave:** Run `pnpm test` (full suite)
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds (quick run)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 05-W0-01 | W0 | 0 | READ-01–07 | T-05-01 | userId from JWT only | unit stub | `pnpm --filter @repo/api test -- reading.service` | ❌ W0 | ⬜ pending |
| 05-W0-02 | W0 | 0 | PIPE-03, PIPE-04 | — | N/A | unit stub | `pnpm --filter @repo/api test -- classifier.service` | ❌ W0 | ⬜ pending |
| 05-W0-03 | W0 | 0 | VOCAB-08 | — | N/A | unit stub | `pnpm --filter @repo/api test -- vocabulary.service` | ❌ W0 (add to existing) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/api/src/reading/reading.service.spec.ts` — RED scaffolds for READ-01 through READ-07 (getPassages, getPassageById, completeSession, createHighlight, deleteHighlight, upsertNote, toggleBookmark)
- [ ] `apps/api/src/pipeline/classifier.service.spec.ts` — RED scaffolds for PIPE-03 (correct CEFR level for known-level input), PIPE-04 (confidence < 0.65 sets flaggedForReview=true)
- [ ] Add `lookupByWord()` test to existing `apps/api/src/vocabulary/vocabulary.service.spec.ts` — VOCAB-08 (word found returns VocabularyWord; word not found returns null)

*Existing test infrastructure: `vitest.config.ts` present in both apps, setupFiles wired — no framework install needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Highlight text in passage persists on reload | READ-04 | DOM interaction + persistence requires browser session | 1. Open passage page. 2. Select text. 3. Click highlight icon in tooltip. 4. Reload page. 5. Verify highlight color overlay still visible. |
| Tap word → SRS popover appears with correct definition | VOCAB-08 | DOM interaction + cross-service lookup | 1. Open passage page. 2. Click single word present in VocabularyWord table. 3. Verify popover shows word, definition, sentence context, "Add to SRS" button. 4. Click "Add to SRS". 5. Verify success toast. |
| Tap word not in DB → graceful fallback | VOCAB-08 | End-to-end null path with UI state | 1. Click word not in VocabularyWord table. 2. Verify popover shows fallback message. 3. Verify "Add to SRS" button is disabled. |
| Notes panel opens, auto-saves, persists | READ-05 | DOM interaction + debounce + persistence | 1. Open passage. 2. Click notes icon. 3. Type in textarea. 4. Wait 2s (blur). 5. Reload. 6. Verify note content still present. |
| Crawler 50-URL validation step | PIPE-01 | Requires live internet + CSS selector validation | Run `pnpm pipeline:validate` against 50 VOA/BBC/NewsInLevels/SEWiki URLs. Verify ≥80% extraction success rate before bulk crawl. |
| Seed script completes ≤10 minutes | PIPE-05, PIPE-06 | Requires DB + clock | Run `pnpm pipeline:seed` with timer. Verify completion time and 2,000+ passages in DB. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
