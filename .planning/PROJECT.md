# English Learning Platform

## What This Is

A modern, production-quality English learning web application for Intermediate (B1), Upper Intermediate (B2), and Advanced (C1) learners. The platform delivers five integrated learning modules — grammar, vocabulary-in-context, reading comprehension, listening comprehension, and mixed-skill quizzes — backed by automatically crawled and seeded content, a gamification layer, and adaptive spaced repetition. Built as a personal/portfolio project designed to look and feel like a commercial EdTech SaaS from day one.

## Core Value

A learner can open the app, immediately find hundreds of exercises at their CEFR level across all skill areas, and feel their progress through XP, streaks, and visible advancement — no empty screens, no placeholder data.

## Requirements

### Validated

(None yet — ship to validate)

### Active

**Authentication & User Accounts**
- [ ] Email/password login and registration with email verification
- [ ] Google OAuth login
- [ ] Password reset via email
- [ ] Session management (JWT + NextAuth)
- [ ] User profile: name, email, avatar, CEFR level, XP, streak, registration date, last activity

**Learning Dashboard**
- [ ] Dashboard shows current CEFR level, XP progress, streak, lessons completed, skill breakdown
- [ ] "Continue learning" widget: current course, recommended next lesson, recently viewed, pending reviews
- [ ] Analytics charts: daily/weekly/monthly activity, skill breakdown, learning trends (Recharts)

**Grammar Module**
- [ ] 10 grammar topic areas (verb tenses, modals, conditionals, passive voice, relative clauses, reported speech, gerunds/infinitives, articles, prepositions, linking words)
- [ ] Each lesson: explanation + examples + visual blocks + practice exercises + assessment quiz
- [ ] Exercise types: multiple choice, fill-in-the-blank, sentence transformation, error correction, drag-and-drop

**Vocabulary-in-Context Module**
- [ ] 8 vocabulary categories (business, travel, technology, education, health, daily life, social topics, academic English)
- [ ] Each set: contextual reading, word meaning, pronunciation guide, example sentences, synonyms, common usage
- [ ] Practice: flashcards, matching, context selection, cloze tests, synonym identification, recall exercises
- [ ] Anki-style SRS scheduling: Day 1 / 3 / 7 / 14 / 30 / 90 reviews

**Reading Comprehension Module**
- [ ] Content types: articles, news, blog posts, academic texts, stories, opinion pieces
- [ ] Question types: main idea, detail, inference, vocabulary-in-context, true/false, summary completion
- [ ] Features: reading timer, text highlighting, notes, bookmarking

**Listening Comprehension Module**
- [ ] Content types: conversations, interviews, podcasts, lectures, news reports
- [ ] Exercise types: multiple choice, dictation, fill-missing-words, speaker intention, sequence ordering, note-taking
- [ ] Features: playback speed control, replay, transcript unlock after completion, vocabulary extraction

**Quiz Center**
- [ ] Mixed-skill quiz combining grammar, vocabulary, reading, listening
- [ ] Topic-based quizzes (technology, travel, business, daily communication)
- [ ] Placement test determining CEFR level, strengths, weaknesses, and recommended path
- [ ] Quiz results stored: score, accuracy, time taken, mistakes, completion date

**Adaptive Learning System**
- [ ] Track performance per skill area (grammar accuracy, vocabulary retention, reading/listening scores)
- [ ] Auto-recommend lessons, gradually increase difficulty, surface weak topics
- [ ] Personalized learning path based on placement and ongoing performance

**Gamification**
- [ ] XP awarded for lesson completion, quiz completion, reviews, daily activity, streak maintenance
- [ ] Achievement system (first lesson, 100/500 words learned, grammar/reading/listening master, 30-day streak)
- [ ] Level system (1–100) that unlocks badges, themes, advanced content

**Content Pipeline**
- [ ] Web crawler (Playwright + Cheerio) targeting public EFL sources: VOA Learning English, BBC Learning English, News in Levels, Simple English Wikipedia
- [ ] Processing pipeline: crawl → clean → dedup → normalize → extract metadata → CEFR classify → store
- [ ] CEFR classification engine (vocabulary difficulty + sentence complexity + grammar complexity)
- [ ] Seed scripts producing minimum: 500 grammar lessons, 5,000 vocabulary records, 2,000 reading passages, 1,000 listening transcripts, 20,000 quiz questions

**AI Exercise Generation**
- [ ] Provider-agnostic AI interface (concrete provider wired up in a later phase)
- [ ] Grammar: 20–50 questions per lesson (multiple choice, fill-blank, error detection, sentence rewriting)
- [ ] Vocabulary: 20+ exercises per set (meaning matching, synonym matching, context-based, cloze)
- [ ] Reading: 10–20 questions per passage (main idea, detail, inference, vocabulary)
- [ ] Listening: 10–15 questions per transcript (dictation, missing word, comprehension)

**Search & Discovery**
- [ ] Global search across vocabulary, grammar, reading, listening, quizzes
- [ ] Filters: CEFR level, topic, skill, difficulty

**Notifications**
- [ ] Daily learning reminder, vocabulary review reminder, streak protection alert, new achievement notification

**Analytics**
- [ ] Student view: CEFR progress, vocabulary retention, learning time, skill breakdown, weekly activity
- [ ] Admin view: active users, retention rate, popular content, completion rates, user growth

**UI / UX**
- [ ] Mobile-first design, dark mode toggle
- [ ] Animated components (Framer Motion), beautiful progress tracking, interactive flashcards
- [ ] Feels like a commercial EdTech SaaS (Duolingo / Quizlet aesthetic) — NOT a CRUD admin panel

### Out of Scope

- AI Tutor / conversational chat — future roadmap; requires separate AI infrastructure
- Speaking practice / pronunciation evaluation — requires audio recording pipeline and ASR model; future phase
- AI Writing feedback — requires dedicated writing eval; future phase
- IELTS / TOEIC-specific preparation tracks — specialized content structure; future milestone
- Native mobile app (iOS/Android) — future; architecture designed to support it via API-first approach
- Live AI generation at request time (v1) — exercises pre-generated via pipeline, not on-demand

## Context

- **Portfolio project**: should demonstrate full-stack engineering depth, clean architecture, and polished UI — the codebase will be showcased publicly
- **Content strategy**: all content crawled from publicly available EFL sources under permissive licenses; CEFR classification applied in-pipeline so content is categorized before it reaches the UI
- **Data requirement**: platform must never appear empty — seed scripts are a first-class deliverable, not an afterthought
- **AI generation**: exercise generation pipeline is architected with an abstracted provider interface; v1 can use a placeholder or real provider; the seeding pipeline runs offline/background, not on user request
- **Tech stack already decided**: Next.js 14 (App Router), TypeScript, TailwindCSS, Shadcn UI, Framer Motion, Recharts, PostgreSQL, Prisma, NextAuth v5, Redis, BullMQ, Playwright, Cheerio, Docker

## Constraints

- **Tech Stack**: Next.js + NestJS/Next.js API + PostgreSQL + Prisma + NextAuth + Redis + BullMQ — already specified, not up for debate
- **Performance**: Initial load < 2s, API response < 300ms, Lighthouse score > 90
- **Scale**: Architecture must support 10,000+ concurrent users and horizontal scaling (even if v1 runs on a single VPS)
- **Security**: JWT/auth protection on all private routes, rate limiting, bcrypt password hashing, input validation
- **Deployment**: Docker-first; cloud/VPS ready
- **No empty states**: seed scripts must populate all modules with realistic production-scale data on first deploy

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Next.js App Router (not Pages Router) | Modern patterns, RSC support, built-in layouts — aligns with 2024 Next.js best practices | — Pending |
| Provider-agnostic AI interface | Avoid vendor lock-in for exercise generation; can swap OpenAI ↔ Claude ↔ Ollama without re-architecture | — Pending |
| Pre-generate exercises offline (pipeline) | Ensures zero latency on exercise load, no API costs at runtime, works fully offline after seeding | — Pending |
| Crawl public EFL sources (VOA, BBC, News in Levels) | Free, legal, high-quality content designed for language learners at target CEFR levels | — Pending |
| SRS scheduling in BullMQ | Vocabulary review jobs scheduled as delayed BullMQ tasks — scales independently of web process | — Pending |
| PostgreSQL + Prisma | Relational model suits progress tracking, SRS scheduling, quiz history; Prisma gives type-safe ORM | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-06-11 after initialization*
