---
phase: 04-grammar-module
plan: "04"
subsystem: frontend
tags: [grammar, browse, relay, mastery, server-components]
dependency_graph:
  requires: ["04-02"]
  provides: ["grammar-browse-vertical-slice", "grammar-relay-routes"]
  affects: ["04-05"]
tech_stack:
  added: []
  patterns:
    - Server Component fetch with getSessionToken()
    - Next.js relay route with await headers() + fetchWithAuth()
    - Dynamic route params as Promise in Next.js 14 App Router
key_files:
  created:
    - apps/web/src/components/grammar/grammar-area-card.tsx
    - apps/web/src/app/(dashboard)/grammar/page.tsx
    - apps/web/src/app/(dashboard)/grammar/[area]/page.tsx
    - apps/web/src/app/(dashboard)/grammar/[area]/[topic]/page.tsx
    - apps/web/src/app/api/grammar/areas/route.ts
    - apps/web/src/app/api/grammar/areas/[areaSlug]/topics/route.ts
    - apps/web/src/app/api/grammar/topics/[topicSlug]/lessons/route.ts
  modified:
    - apps/web/src/components/ui/pagination.tsx
    - apps/web/src/components/grammar/drag-and-drop-exercise.tsx
    - apps/web/src/app/(auth)/verify-email/page.tsx
    - apps/web/src/app/(auth)/reset-password/confirm/page.tsx
decisions:
  - "Button asChild prop not available in @base-ui/react/button — weak-review CTA uses styled Link instead; matches UI-SPEC visuals with custom Tailwind classes"
  - "Area display name derived from slug (split-capitalize) since GrammarAreaDto is not fetched on [area]/page.tsx — acceptable for v1"
metrics:
  duration: "~5 minutes"
  completed_date: "2026-06-14"
  tasks: 2
  files: 7
---

# Phase 4 Plan 04: Grammar Browse Vertical Slice Summary

Grammar browse vertical slice — GrammarAreaCard, 3 Server Component pages, and 3 relay routes so a logged-in user can navigate /grammar → area → topic and see live seeded data and their mastery progress.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | GrammarAreaCard + area grid + areas relay | 77820ad | grammar-area-card.tsx, /grammar/page.tsx, /api/grammar/areas/route.ts |
| 2 | Topic list + lesson-mastery pages + relay routes | 3c5d5f2 | [area]/page.tsx, [area]/[topic]/page.tsx, 2 relay routes |

## What Was Built

**GrammarAreaCard** (`apps/web/src/components/grammar/grammar-area-card.tsx`): Client component extending the CategoryCard pattern. Defines `AREA_ICONS` mapping all 10 grammar area slugs to Lucide icons per UI-SPEC (Clock, HelpCircle, GitBranch, RefreshCw, Link, MessageSquare, AlignCenter, Type, MapPin, Shuffle). Links to `/grammar/[slug]` with `data-testid="grammar-area-card"`.

**Grammar area grid page** (`/grammar`): Server Component, auth-gated. Fetches areas from NestJS via `getSessionToken()`. Renders responsive 2/4-column grid with GrammarAreaCard. Empty state with `role="status"`.

**Grammar area page** (`/grammar/[area]`): Server Component, auth-gated. Awaits `params`. Fetches topics from NestJS. Renders topic list with CefrBadge, mastery percentage (when > 0), and ChevronRight. Each row links to `/grammar/${area}/${topic.slug}`.

**Grammar topic page** (`/grammar/[area]/[topic]`): Server Component, auth-gated. Fetches `GrammarTopicDetailDto` from NestJS. Shows topic heading + inline CefrBadge, mastery Progress bar when `masteryPct != null`, "Review weak exercises" CTA when `masteryPct < 100 AND lessons.length > 0` — deep-linked to `/grammar/${area}/${topicSlug}/${lessons[0].slug}?review=weak`. Lesson cards link to the 4-segment lesson route.

**3 GET relay routes**: All auth-gated with `await auth()`, use `await headers()` + `fetchWithAuth()` pattern. Return 401 when unauthenticated.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Pre-existing `ButtonProps` export missing from button.tsx**
- **Found during:** Task 1 build verification
- **Issue:** `pagination.tsx` imported `ButtonProps` from `@/components/ui/button` which doesn't export that type (uses `@base-ui/react` not shadcn)
- **Fix:** Changed `PaginationLinkProps` to use `VariantProps<typeof buttonVariants>["size"]` instead of `Pick<ButtonProps, "size">`
- **Files modified:** `apps/web/src/components/ui/pagination.tsx`
- **Commit:** 77820ad

**2. [Rule 1 - Bug] Pre-existing DragStartEvent type mismatch in drag-and-drop-exercise.tsx**
- **Found during:** Task 1 build verification
- **Issue:** Handler typed as `{ active: { id: string } }` but dnd-kit uses `UniqueIdentifier` (string | number)
- **Fix:** Import `DragStartEvent` from `@dnd-kit/core` and cast `active.id as string`
- **Files modified:** `apps/web/src/components/grammar/drag-and-drop-exercise.tsx`
- **Commit:** 77820ad

**3. [Rule 1 - Bug] Pre-existing useSearchParams prerender failures in auth pages**
- **Found during:** Task 1 build verification
- **Issue:** `/verify-email` and `/reset-password/confirm` use `useSearchParams()` in client components without Suspense boundary — Next.js 14 prerender fails
- **Fix:** Extracted page content to `*Content` components, wrapped in `<Suspense>` in page default export
- **Files modified:** `apps/web/src/app/(auth)/verify-email/page.tsx`, `apps/web/src/app/(auth)/reset-password/confirm/page.tsx`
- **Commit:** 77820ad

**4. [Rule 1 - Bug] Button `asChild` prop not supported**
- **Found during:** Task 2 build verification
- **Issue:** `Button` uses `@base-ui/react/button` which does not expose `asChild` (Radix UI pattern)
- **Fix:** Replaced Button+asChild+Link with a plain styled `Link` using equivalent Tailwind classes matching UI-SPEC "outline" variant
- **Files modified:** `apps/web/src/app/(dashboard)/grammar/[area]/[topic]/page.tsx`
- **Commit:** 3c5d5f2

## Threat Surface Scan

All 3 new relay routes (`/api/grammar/areas`, `/api/grammar/areas/[areaSlug]/topics`, `/api/grammar/topics/[topicSlug]/lessons`) are already registered in the plan's threat model as T-04-10. No unregistered threat surface introduced.

## Known Stubs

None — all pages render live data from NestJS (empty state shown when no data returned). The area display name on `[area]/page.tsx` is derived from the slug (split-capitalize) rather than from the API; this is acceptable since the area name in the slug already matches the display name.

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| `apps/web/src/components/grammar/grammar-area-card.tsx` | FOUND |
| `apps/web/src/app/(dashboard)/grammar/page.tsx` | FOUND |
| `apps/web/src/app/(dashboard)/grammar/[area]/page.tsx` | FOUND |
| `apps/web/src/app/(dashboard)/grammar/[area]/[topic]/page.tsx` | FOUND |
| `apps/web/src/app/api/grammar/areas/route.ts` | FOUND |
| `apps/web/src/app/api/grammar/areas/[areaSlug]/topics/route.ts` | FOUND |
| `apps/web/src/app/api/grammar/topics/[topicSlug]/lessons/route.ts` | FOUND |
| Commit 77820ad exists | VERIFIED |
| Commit 3c5d5f2 exists | VERIFIED |
| `pnpm --filter @repo/web build` exits 0 | PASSED |
