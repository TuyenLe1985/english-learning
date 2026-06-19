# Phase 8: Adaptive Engine + Dashboard + Search + Analytics - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-20
**Phase:** 08-adaptive-engine-dashboard-search-analytics
**Areas discussed:** Dashboard layout, Adaptive engine logic, Search UX + implementation, Analytics scope + admin access

---

## Dashboard layout

| Option | Description | Selected |
|--------|-------------|----------|
| XP + level bar | Lead with gamification hook — level badge, XP bar, streak flame. Duolingo/Quizlet aesthetic. | ✓ |
| Skill breakdown radar chart | Lead with radar chart showing skill scores. Emphasizes learning depth over reward. | |
| Continue Learning widget | Lead with one recommended action only. Minimalist. | |

**User's choice:** XP + level bar
**Notes:** Gamification-first approach consistent with Phase 7 aesthetic.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Two-column grid | Left: skill scores + radar. Right: activity chart + Continue Learning. | ✓ |
| Single-column scroll | Cards stack vertically. Simpler, mobile-first. | |
| Three-column bento grid | Masonry-style bento cards. High visual interest, more complex. | |

**User's choice:** Two-column grid on desktop.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Weakest skill area lesson | Adaptive recommendation: lowest-accuracy skill, default before threshold. | ✓ |
| Pending SRS review count + link | SRS reviews are time-sensitive; surface if > 0. | |
| Both: SRS if due, otherwise weak skill | Priority order: SRS first, then adaptive. | |

**User's choice:** Weakest skill area lesson (adaptive-first).

---

| Option | Description | Selected |
|--------|-------------|----------|
| Horizontal scroll row per category | Two rows (Recently Viewed / Bookmarked), last 4 items each, 'View all' link. | ✓ |
| Single combined card with tabs | One card, two tabs. Takes up one grid cell. | |
| Dedicated section at bottom | Full-width section, flat card list. | |

**User's choice:** Horizontal scroll rows below two-column grid.

---

## Adaptive engine logic

| Option | Description | Selected |
|--------|-------------|----------|
| Inline synchronous in session-complete | Called right after awardXp(). ~5ms overhead. | ✓ |
| BullMQ async job | Queue job fires asynchronously. ~1s lag before dashboard updates. | |

**User's choice:** Inline, synchronous.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Surfacing recommendation only (no gate) | No API restrictions; engine changes what it recommends. | ✓ |
| Soft gate in UI (greyed cards + padlock) | Visual lock with tooltip; no server enforcement. | |
| Hard gate in API (403 until threshold) | Server-side guard. More work, can frustrate exploration. | |

**User's choice:** Surfacing recommendation only.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Lowest accuracy skill area | Sort SkillScore by accuracy ASC where isWeak=true. Ties by updatedAt DESC. | ✓ |
| Lowest recent trend (last 7 days) | Accuracy from ActivityLog last 7 days. More nuanced, heavier query. | |
| Skill area practiced least recently | Sort by SkillScore.updatedAt ASC. Covers new users too. | |

**User's choice:** Lowest accuracy, ties broken by most recently practiced.

---

| Option | Description | Selected |
|--------|-------------|----------|
| < 60% accuracy | Matches ROADMAP success criterion 2 exactly. | ✓ |
| < 70% accuracy | More aggressive flagging. May feel discouraging. | |
| You decide | Claude sets threshold from spec. | |

**User's choice:** < 60% accuracy.

---

## Search UX + implementation

| Option | Description | Selected |
|--------|-------------|----------|
| Persistent nav bar → /search page | Search input in header, navigates to /search. Bookmarkable. | ✓ |
| cmd-K modal | Floating search modal. Modern UX, requires Cmdk library. | |
| Dedicated /search page only | No nav element. Worst discoverability. | |

**User's choice:** Persistent nav bar → /search page.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Grouped by content type with section headers | Sections per module, top 3-5 results, 'Show more' link. | ✓ |
| Flat ranked list with type badges | All results in one list, sorted by relevance. | |
| Tabbed results (one tab per content type) | Tabs: All / Vocabulary / Grammar / Reading / Listening. | |

**User's choice:** Grouped by content type with section headers.

---

| Option | Description | Selected |
|--------|-------------|----------|
| title + content/definition columns per module | VocabularyWord: (word, definition); GrammarLesson: (title, content); ReadingPassage: (title, content); ListeningItem: (title, transcript). | ✓ |
| Title only across all modules | Simpler index, misses content/definition keywords. | |
| You decide | Claude picks columns from schema. | |

**User's choice:** title + content/definition columns per module.

---

| Option | Description | Selected |
|--------|-------------|----------|
| PostgreSQL ts_headline() | Built-in highlighted snippet with matched terms bolded. Runs in same query. | ✓ |
| Truncate first N characters | First 150 chars. May not show relevant matching text. | |
| You decide | Claude picks most practical snippet approach. | |

**User's choice:** ts_headline().

---

## Analytics scope + admin access

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated /analytics route | Separate page in (dashboard) route group, linked from sidebar. | ✓ |
| Tab on profile page | Analytics as /profile?tab=analytics. | |
| Section in dashboard | Charts embedded below two-column grid. | |

**User's choice:** Dedicated /analytics route.

---

| Option | Description | Selected |
|--------|-------------|----------|
| User.role field with ADMIN enum | Role in DB; seed script; RolesGuard. Portfolio-demonstrable. | ✓ |
| Environment variable (ADMIN_EMAIL) | Single admin email in .env. No DB change. | |
| .env flag (no DB role) | ADMIN_ENABLED=true; any logged-in user sees admin. | |

**User's choice:** User.role with ADMIN enum.

---

| Option | Description | Selected |
|--------|-------------|----------|
| GitHub-style contribution grid | 52×7 year-at-a-glance grid, colored by activity intensity. | ✓ |
| Recharts bar chart (7 days) | Simple 7-day bar chart. 'Heatmap' label loose. | |
| Recharts bar chart (4 weeks) | Per-week for last 4 weeks. More context, still a bar chart. | |

**User's choice:** GitHub-style contribution grid (52 cols × 7 rows).

---

| Option | Description | Selected |
|--------|-------------|----------|
| /admin route, sidebar link ADMIN-only | Admin page with conditional nav link for ADMIN role. | ✓ |
| /admin route, direct URL only | Page exists but no nav link. Poor discoverability. | |
| You decide | Claude picks access pattern. | |

**User's choice:** /admin route with ADMIN-only sidebar link.

---

## Claude's Discretion

- NestJS AdaptiveModule, SearchModule, AnalyticsModule internal structure
- Exact Prisma `$queryRaw` vs. Prisma extension for FTS queries
- Redis caching strategy for admin analytics stats
- Recharts chart types (RadarChart, BarChart, LineChart) and exact configs
- shadcn/ui component specifics for dashboard layout
- Top-nav search input placement and styling
- `RolesGuard` implementation details
- Activity contribution grid: SVG vs. `react-activity-calendar` library
- Framer Motion animations for dashboard hero (if any)
- Admin seed script email/password defaults
- GIN index migration SQL syntax

## Deferred Ideas

- Leaderboard (v2/SOCL-01 in REQUIREMENTS.md)
- Push notifications / daily learning reminders (NOTIF requirements)
- AI Tutor / conversational chat (explicitly out of v1 scope)
- Placement test routing (QUIZ-06 — not in Phase 8 success criteria)
- Hard content gating / 403 guards by level (D-06 locks this as recommendation-only for v1)
- Export analytics as PDF/CSV (not in current requirements)
