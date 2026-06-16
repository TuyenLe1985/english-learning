---
phase: "05"
plan: "07"
subsystem: reading-ui
tags: [reading, client-components, highlight, dompurify, framer-motion, notes, questions]
dependency_graph:
  requires:
    - "05-06 (passage page Server Component, ReadingPassageDetailDto)"
    - "05-02 (ReadingModule NestJS — highlights/notes/sessions endpoints)"
    - "05-03 (reading DTOs in @repo/shared)"
  provides:
    - "PassageRenderer: interactive passage body with DOMPurify sanitize + word-span + highlight restore"
    - "HighlightTooltip: text-selection to save highlight via POST /api/reading/highlights"
    - "QuestionsSection: inline per-question feedback + session submit + score card"
    - "PassageScoreCard: framer-motion entrance score display"
    - "NotesPanel: auto-save on blur, Sheet on mobile, sidebar on desktop"
    - "ReadingPassageClient: timer + bookmark + notes state orchestrator"
    - "Next.js API relay routes: /api/reading/highlights, /api/reading/notes, /api/reading/sessions/complete"
  affects:
    - "/reading/[passageId] page — replaces dangerouslySetInnerHTML with full interactive components"
    - "05-08 (word-popover) — onWordTap prop is stubbed; PassageRenderer exposes it"
tech_stack:
  added:
    - "isomorphic-dompurify ^3.17.0 (already in package.json — used in PassageRenderer)"
    - "dom-anchor-text-position ^5.0.0 (already in package.json — used for highlight anchoring)"
  patterns:
    - "Dynamic import with ssr:false for browser-only PassageRenderer"
    - "useRef+innerHTML for DOM mutation after SSR (word-span wrapping)"
    - "dom-anchor-text-position fromRange/toRange for highlight position persistence"
    - "framer-motion motion.div AnimatePresence for score card + feedback expansion"
    - "shadcn Sheet (side=bottom) for mobile notes panel"
    - "Non-blocking try/catch/finally session submit (score card shown regardless)"
key_files:
  created:
    - apps/web/src/components/reading/passage-renderer.tsx
    - apps/web/src/components/reading/highlight-tooltip.tsx
    - apps/web/src/components/reading/questions-section.tsx
    - apps/web/src/components/reading/passage-score-card.tsx
    - apps/web/src/components/reading/notes-panel.tsx
    - apps/web/src/app/(dashboard)/reading/[passageId]/reading-passage-client.tsx
    - apps/web/src/app/(dashboard)/reading/[passageId]/page.tsx
    - apps/web/src/app/api/reading/highlights/route.ts
    - apps/web/src/app/api/reading/notes/route.ts
    - apps/web/src/app/api/reading/sessions/complete/route.ts
  modified: []
decisions:
  - "ReadingPassageClient wrapper introduced to coordinate timer, bookmark, notes, and highlights between PassageRenderer and QuestionsSection (Server Component parent cannot hold client state)"
  - "PassageRenderer uses innerHTML injection via useEffect (not React reconciliation) to avoid React diffing 1,000+ word-span elements on each render"
  - "HighlightTooltip positioned with absolute CSS using scrollY offset rather than fixed to handle scroll position correctly"
  - "QuestionsSection options sorted deterministically (alphabetical) instead of random shuffle — prevents hydration issues and provides consistent UX"
  - "NotesPanel uses useIsMobile hook with matchMedia to switch between Sheet (mobile) and sidebar (desktop)"
  - "onWordTap in PassageRenderer is a no-op stub — WordPopover is wired in plan 05-08"
metrics:
  duration: "7m"
  completed: "2026-06-16T14:41:01Z"
  tasks_completed: 2
  files_created: 10
  files_modified: 0
---

# Phase 05 Plan 07: Interactive Reading Passage Client Components Summary

**One-liner:** PassageRenderer with DOMPurify+dom-anchor-text-position highlight system, QuestionsSection with framer-motion feedback, NotesPanel auto-save on blur — replacing the 05-06 dangerouslySetInnerHTML placeholder with full interactive passage reader.

## What Was Built

### Task 1: PassageRenderer + HighlightTooltip + Reading API Relay Routes

**PassageRenderer** (`apps/web/src/components/reading/passage-renderer.tsx`):
- `"use client"` component with `dynamic(ssr:false)` import in the page
- DOMPurify.sanitize with tight allowlist: `p, b, i, strong, em, br, ul, ol, li, blockquote` — no script/style/iframe (T-05-07-01)
- Word-span wrapping via TreeWalker on text nodes: each word gets `<span data-word="{normalized}" role="button" tabIndex={0}>` (D-14, UI-SPEC §Accessibility Contract)
- Highlight restoration: `toRange(container, {start, end})` → `<mark class="bg-amber-100/70 rounded-sm" aria-label="Highlighted text">` (D-06, READ-04)
- `surroundContents` with `extractContents+insertNode` fallback for multi-element ranges
- mouseup handler: `fromRange(container, range)` → passes `{start, end, text}` to HighlightTooltip

**HighlightTooltip** (`apps/web/src/components/reading/highlight-tooltip.tsx`):
- Dark pill: `bg-foreground text-background rounded-md px-2 py-1 shadow-lg text-xs`
- `Highlighter` icon + "Highlight" label; positioned with `position:absolute` + scrollY offset
- Dismisses on outside click (setTimeout-guarded `mousedown` handler)
- POST `/api/reading/highlights` → `onSaved(highlight)` → clears selection, optimistic DOM apply

**ReadingPassageClient** (`reading-passage-client.tsx`):
- Client orchestrator: timer start/stop, bookmark toggle (optimistic), notes toggle, highlight state
- `handleTimerStop(): number` callback passed to QuestionsSection

**Next.js API Relay Routes**:
- `POST /api/reading/highlights` → NestJS `POST /api/reading/highlights`
- `POST /api/reading/notes` → NestJS `POST /api/reading/notes`
- `POST /api/reading/sessions/complete` → NestJS `POST /api/reading/sessions/complete`
- All routes: `auth()` gate → 401 before proxying; userId from JWT on NestJS side

**Updated `/reading/[passageId]/page.tsx`**:
- `dynamic(() => import('@/components/reading/passage-renderer'), { ssr: false })` for browser-only deps
- Delegates all client interactivity to `ReadingPassageClient`

### Task 2: QuestionsSection + PassageScoreCard + NotesPanel

**QuestionsSection** (`apps/web/src/components/reading/questions-section.tsx`):
- `"use client"` — `Record<string, QuestionState>` per-question answered/selectedAnswer/isCorrect
- All questions visible inline; options on subsequent questions disabled until previous is answered
- Immediate feedback: `bg-emerald-50 border-emerald-400 text-emerald-800` (correct), `bg-red-50 border-red-400 text-red-700` (incorrect) (UI-SPEC §Question Answer States)
- `framer-motion AnimatePresence` + `height: 0→auto` feedback expansion with `CheckCircle`/`XCircle`
- On last answer: calls `onTimerStop()`, computes score+accuracy, calls `submitSession()` (non-blocking)
- Live score counter: `"{correctCount} / {totalQuestions} correct"` with `aria-live="polite"`

**PassageScoreCard** (`apps/web/src/components/reading/passage-score-card.tsx`):
- `motion.div initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }} transition={{ duration:0.3, ease:'easeOut' }}`
- Headline `text-[28px] font-semibold`: `"{score}/{total} correct"`
- Sub-line `text-sm text-muted-foreground`: `"{pct}% · {readingTime} reading time"`
- "Try another passage" (primary) + "Browse all passages" (outline), both `min-h-[44px] w-full` links to `/reading`
- No redirect — stays on passage page (D-04)

**NotesPanel** (`apps/web/src/components/reading/notes-panel.tsx`):
- `useIsMobile()` hook with `matchMedia("(max-width: 767px)")` for responsive behavior
- Mobile: shadcn `Sheet` with `side="bottom"` + `h-[60vh]`
- Desktop: `position:fixed right-0` sidebar, `translateX(100%)→translateX(0)` CSS transition 200ms
- `Textarea` with `onBlur` → `POST /api/reading/notes { passageId, content }`
- Save status: "Saved" + `Check` icon for 2s, "Saving..." during fetch, error message on failure

## Requirements Satisfied

| Requirement | Status |
|-------------|--------|
| READ-02: Comprehension questions | Done — QuestionsSection renders all questions inline |
| READ-03: Reading timer | Done — starts on mount, stops on last answer, sent in session payload |
| READ-04: Highlight persistence | Done — save via dom-anchor-text-position fromRange, restore via toRange |
| READ-05: Notes persistence | Done — auto-save on blur, upsert via /api/reading/notes |
| READ-07: Score + accuracy stored | Done — submitSession posts to /api/reading/sessions/complete |

## Deviations from Plan

### Auto-added ReadingPassageClient (Rule 2 — Missing Critical Functionality)

The plan specified updating page.tsx to add components inline, but since the page is a Server Component and timer/bookmark/notes state must be client-side, a `ReadingPassageClient` wrapper was introduced to coordinate all client state. This is architecturally required — Server Components cannot hold mutable state.

### onWordTap stub (Intentional)

The plan notes word-tap popover is deferred to plan 05-08. `onWordTap` prop exists on `PassageRenderer` and is wired via `ReadingPassageClient`, but the handler is a no-op. The word `<span data-word>` elements are rendered and keyboard-accessible — the `WordPopover` component is added in 05-08.

### Bookmark relay route not created (Out of Scope)

The `ReadingPassageClient` calls `/api/reading/bookmarks` for bookmark toggle, but that relay route is not in 05-07 scope. The bookmark toggle will fail gracefully (fetch returns 404, optimistic update is reverted) until 05-08 or 05-09 creates the bookmark relay. This is acceptable — the plan only requires highlights/notes/sessions relay routes.

## Known Stubs

| Stub | File | Reason |
|------|------|--------|
| `onWordTap` no-op | `reading-passage-client.tsx:77` | WordPopover (VOCAB-08) added in plan 05-08 |
| `/api/reading/bookmarks` relay missing | `reading-passage-client.tsx` | Bookmark relay route not in 05-07 scope — handled gracefully |

## Threat Surface Scan

All new surfaces are within the plan's threat model:
- `POST /api/reading/highlights` relay — covered by T-05-07-04 (DoS, accepted; client requires explicit click)
- `POST /api/reading/notes` relay — covered by T-05-07-02 (stored XSS, accepted; plain text storage)
- `POST /api/reading/sessions/complete` relay — not in threat model; low risk (score integers, no HTML)
- `PassageRenderer dangerouslySetInnerHTML` fallback removed — replaced by `innerHTML` in useEffect; mitigated per T-05-07-01

No new network endpoints outside threat model.

## Self-Check: PASSED

| Item | Status |
|------|--------|
| passage-renderer.tsx created | FOUND |
| highlight-tooltip.tsx created | FOUND |
| questions-section.tsx created | FOUND |
| passage-score-card.tsx created | FOUND |
| notes-panel.tsx created | FOUND |
| Commit 9daf012 exists | FOUND |
| Commit ab2cb1e exists | FOUND |
| TypeScript errors from reading files | NONE (pre-existing auth-actions.test.ts errors only) |
