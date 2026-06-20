---
phase: 08-adaptive-engine-dashboard-search-analytics
plan: 01a
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/api/package.json
  - apps/web/package.json
  - apps/web/components.json
  - apps/web/src/components/ui/scroll-area.tsx
  - apps/web/src/components/ui/tabs.tsx
  - apps/web/src/components/ui/tooltip.tsx
  - packages/database/prisma/schema.prisma
  - packages/database/package.json
  - packages/database/prisma/migrations
autonomous: true
requirements: [ADPT-01, SRCH-02, ANLT-01]
user_setup: []

must_haves:
  truths:
    - "ioredis is installed in apps/api; recharts + react-activity-calendar installed in apps/web"
    - "scroll-area, tabs, tooltip shadcn components exist in apps/web"
    - "CefrHistory model exists in schema and the migration applies cleanly against the running Postgres"
    - "GIN full-text indexes exist on VocabularyWord, GrammarLesson, ReadingPassage, ListeningContent"
  artifacts:
    - path: "packages/database/prisma/schema.prisma"
      provides: "CefrHistory model"
      contains: "model CefrHistory"
    - path: "apps/web/src/components/ui/scroll-area.tsx"
      provides: "ScrollArea (D-04 horizontal rows)"
  key_links:
    - from: "packages/database/prisma/migrations"
      to: "PostgreSQL GIN indexes"
      via: "appended CREATE INDEX ... USING GIN to_tsvector statements"
      pattern: "_fts_idx"
---

<objective>
Foundation part A for Phase 8. Install all missing dependencies (ioredis, recharts, react-activity-calendar) + the three missing shadcn components (scroll-area, tabs, tooltip), add the only required schema change (`CefrHistory` model), and create + apply the Prisma migration that includes the four GIN full-text indexes.

Purpose: Unblocks the schema/DB layer for all downstream plans. The migration is [BLOCKING] — search and CEFR progression cannot pass verification without it. 08-01a (this plan) and 08-01b run in parallel in Wave 1 with NO file overlap: 08-01a owns deps + schema + migration; 08-01b owns shared DTOs + RED scaffolds + module skeletons + RolesGuard + admin seed. Wave 2 backend plans depend on BOTH.
Output: Installed deps, scroll-area/tabs/tooltip shadcn components, CefrHistory model, applied migration with 4 GIN indexes.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/08-adaptive-engine-dashboard-search-analytics/08-RESEARCH.md
@.planning/phases/08-adaptive-engine-dashboard-search-analytics/08-PATTERNS.md

<interfaces>
Existing schema facts (verified, packages/database/prisma/schema.prisma):
- enum CefrLevel { B1 B2 C1 }
- enum UserRole { STUDENT ADMIN }  — already exists; do NOT recreate
- enum SkillArea { GRAMMAR VOCABULARY READING LISTENING MIXED }
- model User has: role (UserRole @default(STUDENT)), cefrLevel, xpTotal, level, plus relation arrays
- model VocabularyWord: word (unique), definition (@db.Text), cefrLevel, topic, category
- model GrammarLesson: title, explanation (@db.Text), topicId — NO cefrLevel (join GrammarTopic for cefrLevel)
- model GrammarTopic: cefrLevel
- model ReadingPassage: title, content (@db.Text), cefrLevel, topic, isPublished
- model ListeningContent: title, transcriptText (@db.Text), cefrLevel, topic, isPublished
- CefrHistory does NOT exist — this plan adds it

Seed/migration invocation pattern (packages/database/package.json db:migrate): `prisma migrate dev --schema ./prisma/schema.prisma`.
shadcn config (apps/web/components.json): new-york/zinc, iconLibrary lucide.

NOTE: Shared DTOs are NOT created here — 08-01b owns packages/shared/*.dto.ts. This plan must NOT touch packages/shared.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Install dependencies + shadcn components</name>
  <files>apps/api/package.json, apps/web/package.json, apps/web/components.json</files>
  <read_first>
    - apps/api/package.json (confirm ioredis absent)
    - apps/web/package.json (confirm recharts + react-activity-calendar absent; confirm framer-motion/lucide-react present)
    - apps/web/components.json (shadcn config — new-york/zinc, iconLibrary lucide)
    - .planning/phases/08-adaptive-engine-dashboard-search-analytics/08-RESEARCH.md (Package Legitimacy Audit — all three packages approved; versions recharts 3.8.1, react-activity-calendar 3.2.0, ioredis 5.11.1)
  </read_first>
  <action>
    Install via pnpm workspace filters: `pnpm --filter @repo/api add ioredis` (NestJS Redis client for admin stats cache — Pitfall 8: ioredis is NOT yet in apps/api). `pnpm --filter @repo/web add recharts react-activity-calendar` (charts + activity heatmap). Add shadcn components: `pnpm --filter @repo/web dlx shadcn@latest add scroll-area tabs tooltip` (scroll-area is required by D-04 horizontal rows and is currently missing — resolves RESEARCH Open Q #2). All three packages are pre-approved in RESEARCH.md Package Legitimacy Audit — no legitimacy checkpoint required. Do NOT install @hypothesis/anchoring or any other package. Pin recharts to a 3.x range (React 18 compatible per CLAUDE.md version table).
  </action>
  <verify>
    <automated>cd /home/tuyen/Desktop/Apps/english-learning && grep -q '"ioredis"' apps/api/package.json && grep -q '"recharts"' apps/web/package.json && grep -q '"react-activity-calendar"' apps/web/package.json && test -f apps/web/src/components/ui/scroll-area.tsx && test -f apps/web/src/components/ui/tabs.tsx && test -f apps/web/src/components/ui/tooltip.tsx && echo OK</automated>
  </verify>
  <acceptance_criteria>
    - `apps/api/package.json` dependencies include `ioredis`
    - `apps/web/package.json` dependencies include `recharts` and `react-activity-calendar`
    - `apps/web/src/components/ui/scroll-area.tsx`, `tabs.tsx`, `tooltip.tsx` all exist
    - `pnpm install` completes with no error (lockfile updated)
  </acceptance_criteria>
  <done>All Phase 8 dependencies installed; scroll-area/tabs/tooltip shadcn components present.</done>
</task>

<task type="auto">
  <name>Task 2: Add CefrHistory model to schema</name>
  <files>packages/database/prisma/schema.prisma</files>
  <read_first>
    - packages/database/prisma/schema.prisma (Phase 8 section ~line 564 — add CefrHistory near SkillScore/ActivityLog; add `cefrHistory CefrHistory[]` to User relations ~line 100)
    - .planning/phases/08-adaptive-engine-dashboard-search-analytics/08-RESEARCH.md (Pattern 7 CefrHistory model; Pitfalls 1/2 field names)
  </read_first>
  <action>
    Add `model CefrHistory { id String @id @default(cuid()); userId String; cefrLevel CefrLevel; recordedAt DateTime @default(now()); user User @relation(fields: [userId], references: [id], onDelete: Cascade); @@index([userId, recordedAt]) }` to schema.prisma. Add `cefrHistory CefrHistory[]` to the User model relations list. Do NOT add UserRole enum or User.role (Pitfall 4 — already exist). Do NOT run the migration here (Task 3 owns it). Do NOT touch packages/shared (08-01b owns DTOs).
  </action>
  <verify>
    <automated>cd /home/tuyen/Desktop/Apps/english-learning && grep -q "model CefrHistory" packages/database/prisma/schema.prisma && grep -q "cefrHistory" packages/database/prisma/schema.prisma && pnpm --filter @repo/database exec prisma validate --schema ./prisma/schema.prisma && echo OK</automated>
  </verify>
  <acceptance_criteria>
    - `grep "model CefrHistory"` matches; model has userId, cefrLevel, recordedAt, @@index([userId, recordedAt])
    - User relations include `cefrHistory CefrHistory[]`
    - No new UserRole enum / User.role line added
    - `prisma validate` passes
  </acceptance_criteria>
  <done>CefrHistory model added; schema validates.</done>
</task>

<task type="auto">
  <name>Task 3: [BLOCKING] Run Prisma migration + GIN index SQL</name>
  <files>packages/database/package.json, packages/database/prisma/migrations</files>
  <read_first>
    - packages/database/package.json (db:migrate script: `prisma migrate dev --schema ./prisma/schema.prisma`)
    - packages/database/prisma/migrations (existing migration directory structure)
    - .planning/phases/08-adaptive-engine-dashboard-search-analytics/08-RESEARCH.md (Pattern 2 GIN SQL block; Pitfalls 1 & 2 — GrammarLesson `explanation`, ListeningContent `transcriptText`)
  </read_first>
  <action>
    [BLOCKING] Ensure Postgres is running (`docker compose up -d postgres` if needed). Create the migration without applying: `pnpm --filter @repo/database exec prisma migrate dev --name phase-08-cefr-history-and-gin --schema ./prisma/schema.prisma --create-only`. APPEND the four GIN statements to the generated migration.sql exactly: `CREATE INDEX IF NOT EXISTS "VocabularyWord_fts_idx" ON "VocabularyWord" USING GIN (to_tsvector('english', word || ' ' || definition));`, `CREATE INDEX IF NOT EXISTS "GrammarLesson_fts_idx" ON "GrammarLesson" USING GIN (to_tsvector('english', title || ' ' || explanation));` (Pitfall 1: `explanation` not `content`), `CREATE INDEX IF NOT EXISTS "ReadingPassage_fts_idx" ON "ReadingPassage" USING GIN (to_tsvector('english', title || ' ' || content));`, `CREATE INDEX IF NOT EXISTS "ListeningContent_fts_idx" ON "ListeningContent" USING GIN (to_tsvector('english', title || ' ' || "transcriptText"));` (Pitfall 2: model ListeningContent, quoted camelCase column). Apply: `pnpm --filter @repo/database exec prisma migrate dev --schema ./prisma/schema.prisma`. Run `pnpm db:generate`. Non-TTY fallback: place SQL then `prisma migrate deploy`.
  </action>
  <verify>
    <automated>cd /home/tuyen/Desktop/Apps/english-learning && DBQ() { docker compose exec -T postgres psql -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-english_learning}" -tAc "$1"; }; DBQ "SELECT to_regclass('public.\"CefrHistory\"');" | grep -q CefrHistory && DBQ "SELECT indexname FROM pg_indexes WHERE indexname LIKE '%_fts_idx';" | grep -c fts_idx | grep -q 4 && echo OK</automated>
  </verify>
  <acceptance_criteria>
    - `CefrHistory` table exists in the live DB
    - All four `*_fts_idx` GIN indexes exist
    - GrammarLesson GIN uses `explanation`; ListeningContent uses `"transcriptText"`
    - `prisma.cefrHistory` available after regenerate (compiles in apps/api)
  </acceptance_criteria>
  <done>Migration applied; CefrHistory + 4 GIN indexes live; client regenerated.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| migration SQL → Postgres | GIN index SQL is author-controlled (not user input) |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-08-SC | Tampering | npm/pnpm installs (ioredis, recharts, react-activity-calendar) | accept | pre-verified in RESEARCH.md Package Legitimacy Audit (official repos, >5yr age, no postinstall) — no [ASSUMED]/[SUS] gate required |
</threat_model>

<verification>
- `pnpm install` clean; deps present; scroll-area/tabs/tooltip present
- `prisma validate` passes; migration applied; CefrHistory + 4 GIN indexes live
</verification>

<success_criteria>
DB layer ready: deps installed, shadcn components present, CefrHistory + 4 GIN indexes migrated. Wave 2 backend plans unblocked on the schema/DB side (paired with 08-01b for DTOs + skeletons).
</success_criteria>

<output>
Create `.planning/phases/08-adaptive-engine-dashboard-search-analytics/08-01a-SUMMARY.md` when done.
</output>
