---
phase: 05-reading-comprehension-content-pipeline
plan: "07"
subsystem: reading-client-components
tags: [nextjs, client-component, reading, highlights, questions, notes, framer-motion, dompurify]
dependency_graph:
  requires:
    - 05-06 (passage detail Server Component shell with dangerouslySetInnerHTML placeholder)
    - 05-02 (ReadingModule API: POST /api/reading/highlights, POST /api/reading/notes, POST /api/reading/sessions/complete)
    - 05-03 (VOCAB-08 lookupByWord — word click onWordTap prop wired for 05-08)
  provides:
    - PassageRenderer (DOMPurify sanitize + word-span + highlight restore/save)
    - HighlightTooltip (selection → POST /api/reading/highlights)
    - QuestionsSection (per-question state, inline feedback, session submit, score card)
    - PassageScoreCard (framer-motion entrance, CTAs)
    - NotesPanel (auto-save on blur, Sheet/sidebar)
    - ReadingPageClient (client coordinator wrapper)
    - /api/reading/highlights, /api/reading/notes, /api/reading/sessions/complete relay routes
  affects:
    - apps/web/src/app/(dashboard)/reading/[passageId]/page.tsx (replaced dangerouslySetInnerHTML + questions placeholder with ReadingPageClient)
    - apps/web/src/app/api/reading/ (new relay routes)
tech_stack:
  added:
    - dom-anchor-text-position@5.0.0 (already installed in 05-01; added type declarations)
    - isomorphic-dompurify@3.17.0 (already installed in 05-01; used client-side only)
    - framer-motion@12.40.0 (pre-existing; used for score card entrance + feedback expansion)
  patterns:
    - "use client" + dynamic(ssr:false) for browser-only libraries (isomorphic-dompurify, dom-anchor-text-position)
    - useEffect for DOM manipulation after mount (word tokenization, highlight restoration)
    - non-blocking try/catch/finally for session submit (score card shows regardless)
    - auto-save on blur pattern (NotesPanel)
    - framer-motion height 0→auto for feedback expansion (AnimatePresence)
    - useMediaQuery pattern for Sheet (mobile) / sidebar (desktop) responsive panel
key_files:
  created:
    - apps/web/src/components/reading/passage-renderer.tsx
    - apps/web/src/components/reading/highlight-tooltip.tsx
    - apps/web/src/components/reading/questions-section.tsx
    - apps/web/src/components/reading/passage-score-card.tsx
    - apps/web/src/components/reading/notes-panel.tsx
    - apps/web/src/components/reading/reading-page-client.tsx
    - apps/web/src/app/api/reading/highlights/route.ts
    - apps/web/src/app/api/reading/notes/route.ts
    - apps/web/src/app/api/reading/sessions/complete/route.ts
    - apps/web/src/types/dom-anchor-text-position.d.ts
  modified:
    - apps/web/src/app/(dashboard)/reading/[passageId]/page.tsx
decisions:
  - "ReadingPageClient created as thin client coordinator — Server Component page.tsx stays clean with only data fetch + header; all interactivity delegated to single client boundary"
  - "dom-anchor-text-position has no bundled TypeScript types — added custom .d.ts declaration in src/types/"
  - "PassageRenderer uses dynamic(ssr:false) via ReadingPageClient to prevent SSR of browser-only libraries"
  - "Button.asChild not supported (uses @base-ui/react/button not Radix) — PassageScoreCard uses buttonVariants + Link directly"
  - "useToast hook used for highlight save error (not sonner — app uses @radix-ui/react-toast pattern)"
  - "Word tokenization runs client-side in useEffect; initial render uses dangerouslySetInnerHTML fallback then replaces with React-controlled word spans after mount"
metrics:
  duration: "25 minutes"
  completed: "2026-06-14"
  tasks: 2
  files: 11
---

# Phase 05 Plan 07: Interactive Reading Client Components Summary

**One-liner:** Five reading client components — PassageRenderer (DOMPurify + word-span + highlight restore via dom-anchor-text-position), HighlightTooltip (selection → POST), QuestionsSection (per-question state + timer + session submit), PassageScoreCard (framer-motion entrance), NotesPanel (auto-save on blur) — plus three Next.js relay routes and a ReadingPageClient coordinator.

## What Was Built

**PassageRenderer** (`apps/web/src/components/reading/passage-renderer.tsx`):
- DOMPurify.sanitize() with strict allowed-tags whitelist (T-05-07-01 XSS mitigation)
- Word tokenization via DOM text node walking — each word wrapped in `<span data-word="{normalized}" role="button" tabIndex={0}>` (D-14)
- Highlight restoration on mount via `dom-anchor-text-position.toRange()` → `<mark class="bg-amber-100/70 rounded-sm">` with surroundContents/extractContents fallback (D-06, READ-04)
- mouseup handler → `fromRange()` → HighlightTooltip positioned at selection endpoint (D-07)
- onWordTap prop callback for word click (wired in 05-08 for vocabulary popover)
- Initial render: dangerouslySetInnerHTML with clean HTML → replaced after mount with React word-span tree

**HighlightTooltip** (`apps/web/src/components/reading/highlight-tooltip.tsx`):
- Fixed-position dark pill at selection endpoint (UI-SPEC §2f)
- Highlighter icon + "Highlight" label
- POST /api/reading/highlights on click → onSaved callback → optimistic highlight add
- Click-outside dismiss via mousedown event listener
- Error: useToast hook "Could not save highlight. Try again." (destructive variant)

**QuestionsSection** (`apps/web/src/components/reading/questions-section.tsx`):
- All questions inline below passage (D-01) — no carousel
- Per-question state: `Record<string, { answered, selectedAnswer, isCorrect }>`
- Sequential unlock: index ≤ lastAnsweredIndex + 1 is unlocked
- Immediate per-question feedback (D-02): emerald/red Tailwind classes, framer-motion height 0→auto for explanation
- Live "N / M correct" counter in section header
- On last question: calls onTimerStop() → POST /api/reading/sessions/complete (non-blocking) → shows PassageScoreCard (D-04)
- Stable option shuffle via string hash (consistent between renders)

**PassageScoreCard** (`apps/web/src/components/reading/passage-score-card.tsx`):
- framer-motion motion.div: opacity 0→1, scale 0.95→1, duration 0.3s easeOut
- "{score}/{total} correct" at text-[28px] font-semibold
- "{pct}% · {time}s reading time" sub-line
- "Try another passage" (primary) + "Browse all passages" (outline) — both /reading links, no redirect (D-04)

**NotesPanel** (`apps/web/src/components/reading/notes-panel.tsx`):
- Desktop: fixed right sidebar w-80, CSS translateX slide-in 200ms ease-out
- Mobile: shadcn Sheet side="bottom" h-[60vh]
- MediaQueryList listener for responsive switching
- Textarea auto-saves on blur → POST /api/reading/notes
- "Saved" indicator with Check icon for 2 seconds after save
- Error: "Could not save note. Changes may not persist."

**ReadingPageClient** (`apps/web/src/components/reading/reading-page-client.tsx`):
- Thin client coordinator — holds highlights state, reading timer, notes panel open state
- Timer starts on mount (setInterval every 1s), stops via onTimerStop callback from QuestionsSection
- PassageRenderer imported as dynamic(ssr:false) to keep browser-only libs out of SSR
- Action row: live timer display (Clock icon), Bookmark button, Notes toggle

**Relay Routes:**
- `POST /api/reading/highlights` — auth-gated proxy to NestJS
- `POST /api/reading/notes` — auth-gated proxy to NestJS
- `POST /api/reading/sessions/complete` — auth-gated proxy to NestJS

**Page update** (`apps/web/src/app/(dashboard)/reading/[passageId]/page.tsx`):
- Replaced dangerouslySetInnerHTML body + questions placeholder with `<ReadingPageClient data={data} passageId={passageId} />`
- Static passage header (title, metadata row) stays server-rendered
- Action row (timer, bookmark, notes toggle) delegated to ReadingPageClient

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Button.asChild not supported — PassageScoreCard fix**
- **Found during:** Task 2 TypeScript type-check
- **Issue:** The project's `Button` component uses `@base-ui/react/button` (not Radix UI), which does not expose an `asChild` prop. Using `Button asChild` caused TS2322 type errors.
- **Fix:** PassageScoreCard uses `buttonVariants()` from `@/components/ui/button` directly on a `<Link>` element — identical visual result without the Slot pattern.
- **Files modified:** `apps/web/src/components/reading/passage-score-card.tsx`
- **Commit:** 3ace398

**2. [Rule 1 - Bug] `sonner` not installed — HighlightTooltip fix**
- **Found during:** Task 1 TypeScript type-check
- **Issue:** Plan specified `toast.error()` (sonner API) but the project uses `@radix-ui/react-toast` with a `useToast` hook pattern. `sonner` is not in `package.json`.
- **Fix:** Replaced `import { toast } from 'sonner'` with `const { toast } = useToast()` from `@/hooks/use-toast`. Toast called with `{ title, variant: "destructive" }`.
- **Files modified:** `apps/web/src/components/reading/highlight-tooltip.tsx`
- **Commit:** 707dccf

**3. [Rule 2 - Missing] dom-anchor-text-position type declarations**
- **Found during:** Task 1 TypeScript type-check
- **Issue:** `dom-anchor-text-position@5.0.0` ships no TypeScript type declarations; TS7016 "implicitly has 'any' type" errors.
- **Fix:** Added `apps/web/src/types/dom-anchor-text-position.d.ts` with accurate type signatures for `fromRange()` and `toRange()`.
- **Files modified:** `apps/web/src/types/dom-anchor-text-position.d.ts`
- **Commit:** 707dccf

**4. [Rule 2 - Missing] ReadingPageClient coordinator not in original plan**
- **Found during:** Task 1 implementation
- **Issue:** The plan specified updating `page.tsx` to import PassageRenderer directly, but the page is a Server Component. Coordinating highlights state, timer state, and notes panel state across PassageRenderer + QuestionsSection + NotesPanel requires a client boundary. A thin `ReadingPageClient` wrapper was created to hold shared state and coordinate the three interactive regions.
- **Fix:** Created `reading-page-client.tsx` as the client boundary; `page.tsx` renders server content (header, metadata) then mounts `<ReadingPageClient>`.
- **Files modified:** `apps/web/src/components/reading/reading-page-client.tsx` (new), `apps/web/src/app/(dashboard)/reading/[passageId]/page.tsx`
- **Commit:** 3ace398

## Security Mitigations Applied

| Threat ID | Status | Implementation |
|-----------|--------|----------------|
| T-05-07-01 | Mitigated | `DOMPurify.sanitize()` in PassageRenderer with `ALLOWED_TAGS: ['p','b','i','strong','em','br','ul','ol','li','blockquote']`, `ALLOWED_ATTR: []`; no script/style/iframe/object permitted |
| T-05-07-02 | Accepted | Notes rendered as textarea value (plain text); never rendered as innerHTML |
| T-05-07-03 | Accepted | Offset integers are non-sensitive; passage already visible to authenticated user |
| T-05-07-04 | Accepted | Throttler on NestJS is global; highlights only save on explicit tooltip click (not on every selection) |

## Known Stubs

None — all relay routes proxy to real NestJS endpoints (implemented in 05-02). No hardcoded data or placeholder text flows to UI rendering.

## Threat Flags

None — all new network endpoints and auth paths are covered by the plan's threat model. No new surface beyond the three relay routes documented in the plan.

## Self-Check: PASSED

Files created/exist:
- FOUND: apps/web/src/components/reading/passage-renderer.tsx
- FOUND: apps/web/src/components/reading/highlight-tooltip.tsx
- FOUND: apps/web/src/components/reading/questions-section.tsx
- FOUND: apps/web/src/components/reading/passage-score-card.tsx
- FOUND: apps/web/src/components/reading/notes-panel.tsx
- FOUND: apps/web/src/components/reading/reading-page-client.tsx
- FOUND: apps/web/src/app/api/reading/highlights/route.ts
- FOUND: apps/web/src/app/api/reading/notes/route.ts
- FOUND: apps/web/src/app/api/reading/sessions/complete/route.ts
- FOUND: apps/web/src/types/dom-anchor-text-position.d.ts

Commits exist:
- FOUND: 707dccf (feat(05-07): PassageRenderer + HighlightTooltip client components)
- FOUND: 3ace398 (feat(05-07): QuestionsSection, PassageScoreCard, NotesPanel, relay routes)

Verification criteria:
- dom-anchor-text-position usage in passage-renderer.tsx: 7 occurrences (≥2 ✓)
- isomorphic-dompurify/DOMPurify in passage-renderer.tsx: 5 occurrences (≥1 ✓)
- sessions/complete + submitSession in questions-section.tsx: 5 occurrences (≥1 ✓)
- motion.div + framer-motion in passage-score-card.tsx: 4 occurrences (≥1 ✓)
- onBlur + handleBlur in notes-panel.tsx: 2 occurrences (≥1 ✓)

TypeScript: exits 0 (only pre-existing Phase 4 RED stubs in auth-actions.test.ts — 4 errors — are out of scope)
