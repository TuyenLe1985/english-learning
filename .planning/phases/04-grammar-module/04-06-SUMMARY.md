---
phase: 04-grammar-module
plan: "06"
subsystem: api, ui
tags: [nestjs, nextjs, grammar, mastery, auth, relay-auth, server-component]

# Dependency graph
requires:
  - phase: 04-grammar-module
    provides: grammar service, grammar Server Component pages, relay Route Handlers, grammar-session-results component
provides:
  - masteryPct stored, returned, and rendered on 0-100 scale (CR-01 closed)
  - INTERNAL_API_URL export in api-client.ts for server-side Docker-network fetches
  - All 4 grammar Server Component pages use fetchWithAuth + forwarded JWE cookie (CR-03/CR-04 closed)
affects: [04-grammar-module, 05-reading-module, verification]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Grammar Server Components use fetchWithAuth(cookieHeader, INTERNAL_API_URL/api/grammar/...) pattern matching verified relay Route Handlers"
    - "INTERNAL_API_URL fallback chain: INTERNAL_API_URL ?? NEXT_PUBLIC_API_URL ?? localhost:3001"
    - "masteryPct scale: service computes (correct/attempts)*100, stored in DB and returned in DTO on 0-100 scale"

key-files:
  created: []
  modified:
    - apps/api/src/grammar/grammar.service.ts
    - apps/api/src/grammar/grammar.service.spec.ts
    - apps/web/src/components/grammar/grammar-session-results.tsx
    - apps/web/src/lib/api-client.ts
    - apps/web/src/app/(dashboard)/grammar/page.tsx
    - apps/web/src/app/(dashboard)/grammar/[area]/page.tsx
    - apps/web/src/app/(dashboard)/grammar/[area]/[topic]/page.tsx
    - apps/web/src/app/(dashboard)/grammar/[area]/[topic]/[lesson]/page.tsx

key-decisions:
  - "masteryPct multiplied by 100 at service source so DB, API response, and UI all agree on 0-100 scale — one change propagates everywhere via newMasteryPct variable"
  - "INTERNAL_API_URL env var added (not NEXT_PUBLIC_) so Server Components resolve the Docker-internal hostname without baking the public host at build time"
  - "grammar-session-results.tsx reads masteryPct directly (no client-side multiply) since the source of truth is corrected at the service"
  - "Pre-existing typecheck errors in auth-actions.test.ts (checkResendRateLimit) confirmed as pre-existing, not introduced by this plan"

patterns-established:
  - "Grammar Server Component fetch pattern: await auth() guard → await headers() → cookieHeader → fetchWithAuth(cookieHeader, INTERNAL_API_URL/...)"
  - "TDD RED commit (test(04-06): ...) before GREEN commit (feat(04-06): ...) for service-level behavior changes"

requirements-completed: [GRAM-01, GRAM-02, GRAM-03, GRAM-04, GRAM-05, GRAM-06]

# Metrics
duration: 18min
completed: 2026-06-14
---

# Phase 04 Plan 06: Gap Closure — masteryPct Scale + Relay Auth Fix Summary

**masteryPct corrected to 0-100 scale at service source and all 4 grammar Server Component pages migrated from synchronous getSessionToken()+public-host fetch to fetchWithAuth+forwarded-JWE+INTERNAL_API_URL relay auth model**

## Performance

- **Duration:** 18 min
- **Started:** 2026-06-14T09:54:00Z
- **Completed:** 2026-06-14T10:12:00Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Fixed CR-01: `(newCorrect / newAttempts) * 100` in grammar.service.ts — single change propagates to DB upsert and API response; results screen updated to remove redundant client-side `* 100`
- Added `INTERNAL_API_URL` export to api-client.ts with fallback chain for server-side Docker-network fetches
- Fixed CR-03/CR-04: all four grammar Server Component pages now use `fetchWithAuth(cookieHeader, INTERNAL_API_URL)`, matching the already-verified relay Route Handler pattern; `getSessionToken()` and direct `NEXT_PUBLIC_API_URL` references removed from these pages
- TDD RED/GREEN cycle verified: 2 failing tests (masteryPct=80, masteryPct=40) confirmed before fix, all 14 tests pass after

## Task Commits

Each task was committed atomically:

1. **RED - Failing tests for masteryPct 0-100 scale** - `be0ed1b` (test)
2. **Task 1: Fix masteryPct to 0-100 scale at source and results screen** - `f7b55af` (feat)
3. **Task 2: Route grammar Server Components through relay auth model** - `4b8aee9` (feat)

_Note: Task 1 follows TDD RED→GREEN pattern with separate test commit._

## Files Created/Modified

- `apps/api/src/grammar/grammar.service.ts` - Changed `newCorrect / newAttempts` to `(newCorrect / newAttempts) * 100`
- `apps/api/src/grammar/grammar.service.spec.ts` - Added/updated tests asserting masteryPct on 0-100 scale (8/10→80, 0 attempts→0, cross-session 5/10+3/10→40)
- `apps/web/src/components/grammar/grammar-session-results.tsx` - Removed `* 100` from Progress value and label — reads masteryPct directly
- `apps/web/src/lib/api-client.ts` - Added `INTERNAL_API_URL` export with `process.env["INTERNAL_API_URL"] ?? NEXT_PUBLIC_API_URL ?? localhost:3001` fallback chain
- `apps/web/src/app/(dashboard)/grammar/page.tsx` - Replaced getSessionToken+fetch with fetchWithAuth+INTERNAL_API_URL relay auth
- `apps/web/src/app/(dashboard)/grammar/[area]/page.tsx` - Replaced getSessionToken+fetch with fetchWithAuth+INTERNAL_API_URL relay auth
- `apps/web/src/app/(dashboard)/grammar/[area]/[topic]/page.tsx` - Replaced getSessionToken+fetch with fetchWithAuth+INTERNAL_API_URL relay auth
- `apps/web/src/app/(dashboard)/grammar/[area]/[topic]/[lesson]/page.tsx` - Replaced getSessionToken+fetch with fetchWithAuth+INTERNAL_API_URL relay auth (both fetchLessonDetail and fetchWeakQuestions)

## Decisions Made

- masteryPct multiplied by 100 at service source: one-line fix propagates to DB, API response, and both UI consumers simultaneously via the shared `newMasteryPct` variable. No client-side multiply needed anywhere.
- `INTERNAL_API_URL` is a server-only env var (no `NEXT_PUBLIC_` prefix) so it resolves the Docker-internal hostname `http://api:3001` without being baked into the browser bundle at build time.
- Topic page `[area]/[topic]/page.tsx` left unchanged — it already passes `masteryPct` directly to `Math.round` and `<Progress value={...}>`, so it becomes correct automatically once the service stores 0-100.
- Pre-existing typecheck failures in `auth-actions.test.ts` (4 errors about `checkResendRateLimit`) confirmed pre-existing, not introduced by this plan; out of scope per deviation rule scope boundary.

## Deviations from Plan

None - plan executed exactly as written. The TDD RED/GREEN cycle was followed for Task 1. Topic page was confirmed unmodified. Relay Route Handlers under `apps/web/src/app/api/grammar/` were confirmed unmodified.

## Issues Encountered

- Worktree has no `node_modules`; tests run using the main repo's `node_modules` by copying modified files temporarily and running pnpm from the main repo root. Verified pre-existing typecheck errors in `auth-actions.test.ts` are unrelated to this plan's changes.

## Known Stubs

None — no placeholder data, hardcoded empty values, or TODO stubs introduced.

## Threat Flags

No new network endpoints, auth paths, or schema changes beyond what the plan's threat model covers.

## Self-Check: PASSED

- `apps/api/src/grammar/grammar.service.ts` modified — FOUND
- `apps/api/src/grammar/grammar.service.spec.ts` updated — FOUND
- `apps/web/src/components/grammar/grammar-session-results.tsx` updated — FOUND
- `apps/web/src/lib/api-client.ts` — INTERNAL_API_URL export present
- All 4 grammar Server Component pages updated — FOUND
- Commits: be0ed1b (RED tests), f7b55af (feat service+results), 4b8aee9 (feat relay auth)

## Next Phase Readiness

Phase 04 grammar module verification blockers CR-01, CR-03, and CR-04 are now closed:
- CR-01: masteryPct on 0-100 scale — CLOSED
- CR-03/CR-04: relay auth on all grammar Server Component pages — CLOSED

The grammar module is ready for full verification (13/15 truths already verified in 04-VERIFICATION.md; these 2 blockers were the remaining issues).

---
*Phase: 04-grammar-module*
*Completed: 2026-06-14*
