---
phase: "07-quiz-center-gamification"
plan: "06"
subsystem: "gamification-ui-profile"
tags: [gamification, xp-toast, level-up-modal, achievements, profile, mistake-review, framer-motion]
dependency_graph:
  requires:
    - apps/api/src/gamification/gamification.service.ts (awardXp, checkAchievements, seedAchievements — from 07-02)
    - packages/shared/src/quiz.dto.ts (QuizCompleteResponseDto, AchievementDto — from 07-01)
    - apps/web/src/components/quiz/quiz-results-client.tsx (results page client — from 07-05)
  provides:
    - apps/web/src/components/gamification/xp-toast.tsx (Framer Motion +XP toast, bottom-right, 4s)
    - apps/web/src/components/gamification/level-up-modal.tsx (shadcn Dialog level-up modal)
    - apps/web/src/components/gamification/level-badge.tsx (Lv.N pill badge with tier colors)
    - apps/web/src/components/gamification/xp-progress-bar.tsx (shadcn Progress, D-09 formula)
    - apps/web/src/components/gamification/achievement-badge.tsx (single achievement tile, locked/unlocked)
    - apps/web/src/components/gamification/achievement-grid.tsx (8-badge 4-col grid)
    - apps/web/src/components/quiz/mistake-review.tsx (QUIZ-04 re-render with correct/incorrect highlighting)
    - apps/web/src/components/quiz/mistake-review-client.tsx (sessionStorage + API fallback loader)
    - apps/web/src/app/(dashboard)/quiz/[sessionId]/results/mistakes/page.tsx (Screen 4 route)
    - apps/api/src/gamification/gamification.controller.ts (GET /api/gamification/achievements)
    - apps/web/src/app/api/profile/achievements/route.ts (relay route, auth() gate)
  affects:
    - apps/web/src/components/quiz/quiz-results-client.tsx (updated — wired XpToast, LevelUpModal, AchievementToast)
    - apps/api/src/gamification/gamification.service.ts (updated — OnModuleInit + getUserAchievements)
    - apps/api/src/gamification/gamification.module.ts (updated — registered controller + AuthModule)
    - apps/web/src/app/(dashboard)/profile/profile-form.tsx (updated — LevelBadge + XpProgressBar + AchievementGrid)
    - 07-07 (verifier can now test GET /api/gamification/achievements + profile gamification UI)
tech_stack:
  added: []
  patterns:
    - Framer Motion AnimatePresence + motion.div for XP toast (initial y50 opacity0, animate y0 opacity1, exit opacity0, 0.3s)
    - shadcn Dialog for level-up modal (1s open delay, 5s auto-close)
    - CefrBadge color tier pattern adapted for LevelBadge (blue/emerald/violet tiers)
    - NestJS OnModuleInit for idempotent seedAchievements on every boot
    - Achievement locked/unlocked pattern (opacity-60 grayscale Lock icon vs full opacity trophy)
    - sessionStorage primary + API GET fallback pattern for mistake review
key_files:
  created:
    - apps/web/src/components/gamification/xp-toast.tsx
    - apps/web/src/components/gamification/level-up-modal.tsx
    - apps/web/src/components/gamification/level-badge.tsx
    - apps/web/src/components/gamification/xp-progress-bar.tsx
    - apps/web/src/components/gamification/achievement-badge.tsx
    - apps/web/src/components/gamification/achievement-grid.tsx
    - apps/web/src/components/quiz/mistake-review.tsx
    - apps/web/src/components/quiz/mistake-review-client.tsx
    - apps/web/src/app/(dashboard)/quiz/[sessionId]/results/mistakes/page.tsx
    - apps/api/src/gamification/gamification.controller.ts
    - apps/web/src/app/api/profile/achievements/route.ts
  modified:
    - apps/web/src/components/quiz/quiz-results-client.tsx
    - apps/api/src/gamification/gamification.service.ts
    - apps/api/src/gamification/gamification.module.ts
    - apps/web/src/app/(dashboard)/profile/profile-form.tsx
decisions:
  - "AchievementToast implemented inline in quiz-results-client.tsx (reuses XpToast styling) rather than separate component — avoids prop-threading complexity for a simple one-off pattern"
  - "MistakeReviewClient wraps MistakeReview to handle sessionStorage loading + API fallback, keeping MistakeReview purely presentational"
  - "GamificationService uses OnModuleInit (not separate CLI) to invoke seedAchievements — portfolio-friendly approach; idempotent upsert makes repeated boot-time calls safe"
  - "profile-form.tsx fetches achievements separately from profile data to avoid extending UserProfileDto schema — achievements have their own relay route"
metrics:
  duration: "28 minutes"
  completed_date: "2026-06-19"
  tasks: 2
  files: 15
---

# Phase 7 Plan 6: Gamification UI + Profile Additions Summary

**One-liner:** Framer Motion XP toast, shadcn Dialog level-up modal, CEFR-tiered LevelBadge, mistake review screen with correct/wrong answer highlighting, achievement grid with locked/unlocked states, and profile page augmented with all gamification components backed by a new NestJS achievements endpoint.

## What Was Built

### Task 1: Gamification Feedback Components + Results Wiring + Mistake Review

**XpToast (`apps/web/src/components/gamification/xp-toast.tsx`):**
- Framer Motion AnimatePresence + motion.div, fixed bottom-right z-50
- Animation: initial `{y: 50, opacity: 0}`, animate `{y: 0, opacity: 1}`, exit `{opacity: 0}`, 0.3s transition
- 4-second useEffect auto-dismiss; onClick immediate dismiss
- Copy "+{n} XP" with role="status" aria-live="polite" for accessibility

**LevelUpModal (`apps/web/src/components/gamification/level-up-modal.tsx`):**
- shadcn Dialog, opens 1s after mount (D-11 stagger after XP toast)
- Auto-closes at 6s total (1s delay + 5s display) via dual useEffect timers
- DialogTitle "Level {n}!", DialogDescription with copy contract text
- Renders LevelBadge size="lg" with ring-2 ring-primary

**LevelBadge (`apps/web/src/components/gamification/level-badge.tsx`):**
- Color tiers mirroring CefrBadge: blue (1-33), emerald (34-66), violet (67-100)
- Sizes sm/md/lg; role="img" aria-label="Level {n}"
- "Lv. {level}" display text

**MistakeReview (`apps/web/src/components/quiz/mistake-review.tsx`):**
- QUIZ-04: re-displays each incorrect QuizQuestionDto with all answer options
- User's wrong answer: `border-destructive/30 bg-destructive/10 text-destructive` + `aria-label="Your answer (incorrect): {text}"`
- Correct answer: `border-green-300 bg-green-50 text-green-700` + `aria-label="Correct answer: {text}"`
- Explanation: `text-sm text-muted-foreground italic` below correct answer
- Empty state: "All correct! No mistakes to review."
- min-h-[44px] touch targets per UI-SPEC

**MistakeReviewClient + mistakes/page.tsx:**
- Server Component route at `/quiz/[sessionId]/results/mistakes` with auth() guard
- Client reads `sessionStorage[quiz-result-{sessionId}]` first; falls back to GET `/api/quiz/sessions/[id]/mistakes`
- Builds userAnswers map from SessionAnswer[] for wrong answer highlighting

**quiz-results-client.tsx updates:**
- XpToast always rendered on results mount (xpEarned from QuizCompleteResponseDto)
- AchievementToast (inline component): fires 500ms + index*150ms after XP toast for each newAchievement, z-51 stacked above XP toast; emerald styling "{name} unlocked"
- LevelUpModal: rendered only when `result.levelUp === true` with `result.newLevel`

### Task 2: Achievements Endpoint + Relay + Profile UI

**GamificationController (`apps/api/src/gamification/gamification.controller.ts`):**
- `GET /api/gamification/achievements` with JwtAuthGuard
- userId exclusively from `req.user.userId` (T-07-16 IDOR protection)
- Returns `AchievementWithEarnedAtDto[]` — all 8 with earnedAt: Date | null

**GamificationService updates:**
- Added `OnModuleInit` — calls `seedAchievements()` on every boot (idempotent upsert, T-07-18 accepted)
- Added `getUserAchievements(userId)`: loads all Achievement rows + user's UserAchievement rows, merges into array ordered by id asc

**GamificationModule updates:**
- Registered GamificationController in controllers array
- Imported AuthModule to provide JwtAuthGuard (T-07-17)

**`/api/profile/achievements` relay (`apps/web/src/app/api/profile/achievements/route.ts`):**
- GET with auth() guard (401 if unauthenticated)
- Relays to `${INTERNAL_API_URL}/api/gamification/achievements` via fetchWithAuth

**AchievementBadge, AchievementGrid, XpProgressBar (new gamification components):**
- AchievementBadge: locked (border-border bg-muted opacity-60, Lock icon, "Locked") vs earned (border-emerald-200 bg-emerald-50, trophy emoji, earned date)
- AchievementGrid: 2-col mobile / 4-col md+, empty state "Complete lessons and quizzes to earn achievement badges."
- XpProgressBar: shadcn Progress, D-09 formula `xpIntoLevel = xpTotal % 100`, label "Level N · X/100 XP to Level N+1"

**profile-form.tsx updates (GAME-02/03/04):**
- Added LevelBadge (md size) below avatar
- Added XpProgressBar below CEFR badge/XP row
- Added Achievements section with AchievementGrid + separate fetch from `/api/profile/achievements`
- Loader state while achievements load

## Deviations from Plan

None — plan executed exactly as written. The `MistakeReviewClient` component (parallel to `QuizResultsClient` from 07-05) is an implementation detail that cleanly separates sessionStorage concerns from the pure presentational `MistakeReview` component.

## Known Stubs

None. All components are fully wired:
- XpToast/LevelUpModal/AchievementToast render from real QuizCompleteResponseDto data
- Profile fetches achievements from real NestJS endpoint (seeded on boot)
- MistakeReview shows real incorrectAnswers from stored session result

## Threat Flags

None. All new endpoints enforce T-07-16 (IDOR: userId from JWT), T-07-17 (auth() guard on relay), T-07-18 (idempotent upsert accepted risk).

## Self-Check

### Files Created/Modified

- [x] `apps/web/src/components/gamification/xp-toast.tsx` — FOUND
- [x] `apps/web/src/components/gamification/level-up-modal.tsx` — FOUND
- [x] `apps/web/src/components/gamification/level-badge.tsx` — FOUND
- [x] `apps/web/src/components/gamification/xp-progress-bar.tsx` — FOUND
- [x] `apps/web/src/components/gamification/achievement-badge.tsx` — FOUND
- [x] `apps/web/src/components/gamification/achievement-grid.tsx` — FOUND
- [x] `apps/web/src/components/quiz/mistake-review.tsx` — FOUND
- [x] `apps/web/src/components/quiz/mistake-review-client.tsx` — FOUND
- [x] `apps/web/src/app/(dashboard)/quiz/[sessionId]/results/mistakes/page.tsx` — FOUND
- [x] `apps/api/src/gamification/gamification.controller.ts` — FOUND
- [x] `apps/web/src/app/api/profile/achievements/route.ts` — FOUND

### Commits Verified

- [x] `87a3d3a` — feat(07-06): build gamification feedback components + results wiring + mistake review
- [x] `45d6e7e` — feat(07-06): achievements endpoint + relay + profile gamification UI

### Acceptance Criteria Verified

- [x] xp-toast.tsx uses AnimatePresence + motion.div, fixed bottom-right, 4s auto-dismiss, copy "+{n} XP"
- [x] level-up-modal.tsx uses shadcn Dialog, title "Level {n}!", renders LevelBadge
- [x] mistake-review.tsx renders prompt + options + correct-answer highlight + explanation, "All correct!" empty state
- [x] quiz-results-client.tsx fires XpToast on mount, LevelUpModal only when levelUp is true, achievement toasts for newAchievements
- [x] gamification.controller.ts exposes JwtAuthGuard-protected GET /api/gamification/achievements
- [x] GamificationService has getUserAchievements + seedAchievements via OnModuleInit
- [x] /api/profile/achievements relay exists with auth() guard
- [x] profile-form.tsx renders LevelBadge, XpProgressBar, AchievementGrid (grep count = 8 >= 3)
- [x] AchievementBadge shows locked vs earned state
- [x] XpProgressBar uses xpTotal % 100 for in-level progress
- [x] Both tsc --noEmit checks clean for new files (pre-existing errors in unrelated files only)

## Self-Check: PASSED
