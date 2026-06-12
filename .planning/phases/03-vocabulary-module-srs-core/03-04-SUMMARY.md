---
plan: 03-04
phase: 03-vocabulary-module-srs-core
status: complete
completed: 2026-06-12
requirements: [VOCAB-01, VOCAB-02, VOCAB-04]
---

# Plan 03-04 Summary — Vocabulary Browse Vertical Slice

## What Was Built

Vocabulary browsing end-to-end: category grid → word list → word detail → mark as learned.

### Relay Routes (Next.js → NestJS)
- `GET /api/vocabulary/categories` — category list with word counts
- `GET /api/vocabulary/[category]/words` — paginated word list (page + limit forwarded)
- `GET /api/vocabulary/[category]/[wordId]` — full word detail
- `POST /api/vocabulary/enroll` — enroll word into SRS (proxies to NestJS `/api/srs/enroll`)

### Pages
- `/vocabulary` — category grid (8 categories with icons, word counts)
- `/vocabulary/[category]` — paginated word list with "Practice this set" CTA
- `/vocabulary/[category]/[wordId]` — full word detail with pronunciation + mark-as-learned

### Components
- `CategoryCard` — icon + name + word count, links to category word list
- `WordListItem` — word + definition preview + CEFR badge, links to detail
- `WordDetail` — full definition, examples, synonyms, pronunciation (browser TTS fallback), mark-as-learned button that enrolls into SRS

## Self-Check

- [x] All relay routes auth-gated (auth() → 401)
- [x] All pages redirect to /login when unauthenticated
- [x] enroll relay proxies to NestJS /api/srs/enroll via fetchWithAuth
- [x] category-card and word-list-item use shadcn zinc design tokens
- [x] word-detail plays pronunciation via audioStorageKey URL or SpeechSynthesis fallback

## Key Files
- `apps/web/src/app/(dashboard)/vocabulary/page.tsx`
- `apps/web/src/app/(dashboard)/vocabulary/[category]/page.tsx`
- `apps/web/src/app/(dashboard)/vocabulary/[category]/[wordId]/page.tsx`
- `apps/web/src/app/api/vocabulary/` (4 relay routes)
- `apps/web/src/components/vocabulary/` (3 components)
