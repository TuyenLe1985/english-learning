# Requirements: English Learning Platform

**Defined:** 2026-06-11
**Core Value:** A learner can open the app, immediately find hundreds of exercises at their CEFR level across all skill areas, and feel their progress through XP and visible advancement — no empty screens, no placeholder data.

## v1 Requirements

### Authentication

- [x] **AUTH-01**: User can register with email and password
- [x] **AUTH-02**: User receives email verification link after signup and must verify before accessing content
- [ ] **AUTH-03**: User can sign in with Google OAuth
- [x] **AUTH-04**: User can request a password reset link sent to their email
- [x] **AUTH-05**: User session persists across browser refresh and tab close/reopen (NextAuth JWT)
- [ ] **AUTH-06**: User is redirected to login when accessing protected routes while unauthenticated

### User Profile

- [x] **PROF-01**: User has a profile storing name, email, avatar URL, CEFR level, XP total, registration date, and last activity timestamp
- [x] **PROF-02**: User can update display name and avatar
- [x] **PROF-03**: User's current CEFR level (B1/B2/C1) is displayed throughout the app and updates based on XP thresholds

### Dashboard

- [ ] **DASH-01**: Dashboard shows current CEFR level, XP progress bar toward next level, total lessons completed, and per-skill scores (grammar, vocabulary, reading, listening)
- [ ] **DASH-02**: Dashboard shows a "Continue Learning" widget with current course, recommended next lesson, and count of pending SRS vocabulary reviews
- [ ] **DASH-03**: Dashboard shows daily and weekly activity chart (Recharts bar chart) and a skill breakdown radar chart
- [ ] **DASH-04**: Dashboard shows recently viewed lessons and bookmarked content for quick re-access

### Grammar Module

- [ ] **GRAM-01**: User can browse grammar topics organized into 10 areas: verb tenses, modal verbs, conditionals, passive voice, relative clauses, reported speech, gerunds & infinitives, articles, prepositions, linking words
- [ ] **GRAM-02**: Each grammar lesson presents an explanation section with examples and visual learning blocks before exercises
- [ ] **GRAM-03**: Grammar exercises include at least 3 of: multiple choice, fill-in-the-blank, sentence transformation, error correction, drag-and-drop
- [ ] **GRAM-04**: Grammar lesson ends with an assessment quiz and stores the score against the user's profile
- [ ] **GRAM-05**: Each grammar topic has at least 20 practice questions across all exercise types
- [ ] **GRAM-06**: Grammar topic pages show user's mastery percentage and allow re-attempt of weak exercises

### Vocabulary Module

- [x] **VOCAB-01**: User can browse vocabulary sets organized into 8 categories: business, travel, technology, education, health, daily life, social topics, academic English
- [x] **VOCAB-02**: Each vocabulary entry shows word, meaning, pronunciation guide, example sentences, synonyms, and common usage patterns
- [x] **VOCAB-03**: Vocabulary practice includes: flashcard (front/back flip), matching, context selection, cloze tests, synonym identification, and recall exercises
- [x] **VOCAB-04**: User can mark a vocabulary item as "learned" which enters it into the SRS review schedule
- [x] **VOCAB-05**: SRS schedules vocabulary reviews using the FSRS algorithm at intervals: Day 1 / 3 / 7 / 14 / 30 / 90
- [x] **VOCAB-06**: Pending SRS reviews appear on the dashboard and in a dedicated review queue; each session shows card, prompts recall, then reveals answer with rating buttons (Again / Hard / Good / Easy)
- [x] **VOCAB-07**: User can see their full vocabulary list with status (new / learning / reviewing / mastered) and next review date
- [ ] **VOCAB-08**: Vocabulary-in-context: when reading a passage, user can tap an unknown word to add it directly to their SRS queue with that sentence as context

### Reading Comprehension Module

- [ ] **READ-01**: User can browse reading passages filtered by CEFR level (B1/B2/C1), topic, and content type (article, news, blog post, academic text, story, opinion piece)
- [ ] **READ-02**: Each reading passage includes at least 6 comprehension questions covering: main idea, detail, inference, vocabulary-in-context, true/false, and summary completion
- [ ] **READ-03**: Reading module shows elapsed time and allows user to record their reading time per passage
- [ ] **READ-04**: User can highlight text in a passage and the highlight persists on re-visit
- [ ] **READ-05**: User can take notes on a passage; notes are stored and visible on re-visit
- [ ] **READ-06**: User can bookmark a passage for later from the passage page or from browse view
- [ ] **READ-07**: Score and accuracy from comprehension questions are stored against the user's reading progress

### Listening Comprehension Module

- [ ] **LIST-01**: User can browse listening content filtered by CEFR level, topic, and content type (conversation, interview, podcast, lecture, news report)
- [ ] **LIST-02**: Each listening item includes at least 3 exercise types from: multiple choice, dictation, fill-missing-words, speaker-intention, sequence-ordering, note-taking
- [ ] **LIST-03**: Audio player supports playback speed control (0.75×, 1×, 1.25×, 1.5×) and section replay
- [ ] **LIST-04**: Full transcript is locked during the exercise and unlocks after the user completes it
- [ ] **LIST-05**: Transcript is synchronized with audio (karaoke-style highlighting of current spoken word/phrase)
- [ ] **LIST-06**: User can tap any word in the unlocked transcript to add it to their vocabulary SRS queue
- [ ] **LIST-07**: Score and accuracy from listening exercises are stored against the user's listening progress

### Quiz Center

- [ ] **QUIZ-01**: User can take a mixed-skill quiz combining grammar, vocabulary, reading, and listening questions in a single session
- [ ] **QUIZ-02**: User can take topic-based quizzes filtered by topic (technology, travel, business, daily communication)
- [ ] **QUIZ-03**: Each quiz session stores: score, accuracy percentage, time taken, list of incorrect items, and completion timestamp
- [ ] **QUIZ-04**: User can review mistakes after completing a quiz with explanations for incorrect answers
- [ ] **QUIZ-05**: Quiz results feed into the user's per-skill performance scores used by the adaptive learning engine

### Gamification

- [ ] **GAME-01**: User earns XP for completing lessons and quizzes; XP is complexity-weighted (harder exercises and higher CEFR levels award more XP than easy exercises)
- [ ] **GAME-02**: XP accumulates to a visible level (1–100) displayed on profile and dashboard; higher levels unlock advanced content and visual themes
- [ ] **GAME-03**: Achievement system awards badges for milestones: first lesson completed, 100 vocabulary words learned, 500 vocabulary words learned, grammar topic mastered, reading passage completed, listening exercise completed, 7-day activity, 30-day activity
- [ ] **GAME-04**: Achievements are displayed on the user profile page with earned date and locked/unlocked state
- [ ] **GAME-05**: XP events are logged as an audit trail (what action, how much XP, when)

### Content Pipeline

- [ ] **PIPE-01**: Crawler fetches content from VOA Learning English, BBC Learning English, News in Levels, and Simple English Wikipedia using Playwright + Cheerio
- [ ] **PIPE-02**: Crawler applies a content quality gate: minimum 150 words, no navigation/boilerplate (detected by low unique-word ratio), deduplicated by URL and content hash
- [ ] **PIPE-03**: CEFR classification engine scores each passage using vocabulary frequency lists (proper nouns excluded via NER) and sentence complexity metrics; classifies as B1/B2/C1 with confidence score
- [ ] **PIPE-04**: Content with classification confidence below 0.65 is flagged for review rather than auto-published
- [ ] **PIPE-05**: Seed scripts populate the database on first deploy with minimum: 500 grammar lessons, 5,000 vocabulary records, 2,000 reading passages, 1,000 listening transcripts, 20,000 quiz questions
- [ ] **PIPE-06**: Seed scripts use Prisma `createMany()` in batches of 500 records (not individual `create()` calls) to complete within a practical time window

### Adaptive Learning

- [ ] **ADPT-01**: System tracks per-user skill scores: grammar accuracy (% correct per topic), vocabulary retention (SRS recall rate), reading score (average comprehension %), listening score (average exercise %)
- [ ] **ADPT-02**: After each lesson or quiz, the system updates the user's skill scores and flags topics where accuracy falls below 60% as "weak"
- [ ] **ADPT-03**: Dashboard "Continue Learning" recommendation surfaces the highest-priority weak topic for the user's current CEFR level
- [ ] **ADPT-04**: Lesson difficulty within a module increases progressively as user demonstrates mastery (score ≥ 80% on current difficulty tier)
- [ ] **ADPT-05**: Adaptive recommendations activate only after user has completed at least 5 exercises (avoids routing on insufficient data)

### Search & Discovery

- [ ] **SRCH-01**: Global search returns results across vocabulary, grammar lessons, reading passages, listening content, and quizzes
- [ ] **SRCH-02**: Search uses PostgreSQL full-text search (GIN index on tsvector columns) — no external search service required
- [ ] **SRCH-03**: Search results can be filtered by CEFR level, topic, skill type, and difficulty
- [ ] **SRCH-04**: Search results show content type, CEFR level, and topic tag alongside title and snippet

### Analytics

- [ ] **ANLT-01**: Student analytics page shows CEFR level progression over time, vocabulary retention rate, total learning time, skill breakdown, and weekly activity heatmap
- [ ] **ANLT-02**: Admin dashboard shows: total active users (last 30 days), retention rate (users active in week 2 after signup), top 10 most-completed content items, average completion rates by module, and user growth chart

---

## v2 Requirements

### CEFR Placement Test

- **PLCE-01**: New user can take a CEFR placement test that adaptively classifies them as B1/B2/C1
- **PLCE-02**: Placement test covers all four skills and surfaces per-skill strengths and weaknesses
- **PLCE-03**: Placement result sets the user's initial CEFR level and seeds their learning path

### Streak System

- **STRK-01**: User has a learning streak counter for consecutive days with at least one completed exercise
- **STRK-02**: Streak has a 1-day grace period to prevent anxiety from missing a day
- **STRK-03**: Streak milestones (7-day, 30-day) award bonus XP (no loss-aversion notifications)

### AI Exercise Generation

- **AIGEN-01**: Provider-agnostic AI interface generates grammar exercises (20–50 per lesson) from crawled content
- **AIGEN-02**: Vocabulary exercise generator produces 20+ exercises per set with topic rotation to prevent semantic monoculture
- **AIGEN-03**: Reading and listening exercise generators produce question sets with CEFR-validated difficulty
- **AIGEN-04**: AI-generated exercises are validated before storage (difficulty check, dedup check)

### Push Notifications

- **NOTF-01**: Web push notification for daily learning reminder (user-configured time)
- **NOTF-02**: Push notification when SRS reviews are due
- **NOTF-03**: Push notification for new achievement unlock

### Social / Community

- **SOCL-01**: User can see a leaderboard filtered to their CEFR level (opt-in only — not default)
- **SOCL-02**: User can share a completed achievement card as an image

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| AI Tutor / conversational chat | Requires real-time LLM inference infrastructure; separate product surface |
| Speaking practice / pronunciation evaluation | Requires audio recording pipeline and ASR model; separate skill domain |
| AI writing feedback | Requires dedicated writing evaluation model; separate phase entirely |
| IELTS / TOEIC preparation tracks | Specialized content structure with copyright constraints; future milestone |
| Native mobile app (iOS/Android) | API-first architecture supports this; defer after web is proven |
| Real-time multiplayer / battle mode | High infrastructure complexity; not aligned with adult solo-learner persona |
| Duolingo-style streak anxiety notifications | Research confirms this harms adult B1–C1 learner motivation and causes churn |
| Live AI exercise generation at request time | Pre-generated pipeline avoids latency and API cost at runtime |
| Elasticsearch / Meilisearch | PostgreSQL FTS sufficient for dataset size; eliminates infrastructure dependency |

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 2 | Complete |
| AUTH-02 | Phase 2 | Complete |
| AUTH-03 | Phase 2 | Pending |
| AUTH-04 | Phase 2 | Complete |
| AUTH-05 | Phase 2 | Complete |
| AUTH-06 | Phase 2 | Pending |
| PROF-01 | Phase 2 | Complete |
| PROF-02 | Phase 2 | Complete |
| PROF-03 | Phase 2 | Complete |
| VOCAB-01 | Phase 3 | Complete |
| VOCAB-02 | Phase 3 | Complete |
| VOCAB-03 | Phase 3 | Complete |
| VOCAB-04 | Phase 3 | Complete |
| VOCAB-05 | Phase 3 | Complete |
| VOCAB-06 | Phase 3 | Complete |
| VOCAB-07 | Phase 3 | Complete |
| VOCAB-08 | Phase 5 | Pending |
| GRAM-01 | Phase 4 | Pending |
| GRAM-02 | Phase 4 | Pending |
| GRAM-03 | Phase 4 | Pending |
| GRAM-04 | Phase 4 | Pending |
| GRAM-05 | Phase 4 | Pending |
| GRAM-06 | Phase 4 | Pending |
| READ-01 | Phase 5 | Pending |
| READ-02 | Phase 5 | Pending |
| READ-03 | Phase 5 | Pending |
| READ-04 | Phase 5 | Pending |
| READ-05 | Phase 5 | Pending |
| READ-06 | Phase 5 | Pending |
| READ-07 | Phase 5 | Pending |
| PIPE-01 | Phase 5 | Pending |
| PIPE-02 | Phase 5 | Pending |
| PIPE-03 | Phase 5 | Pending |
| PIPE-04 | Phase 5 | Pending |
| PIPE-05 | Phase 5 | Pending |
| PIPE-06 | Phase 5 | Pending |
| LIST-01 | Phase 6 | Pending |
| LIST-02 | Phase 6 | Pending |
| LIST-03 | Phase 6 | Pending |
| LIST-04 | Phase 6 | Pending |
| LIST-05 | Phase 6 | Pending |
| LIST-06 | Phase 6 | Pending |
| LIST-07 | Phase 6 | Pending |
| QUIZ-01 | Phase 7 | Pending |
| QUIZ-02 | Phase 7 | Pending |
| QUIZ-03 | Phase 7 | Pending |
| QUIZ-04 | Phase 7 | Pending |
| QUIZ-05 | Phase 7 | Pending |
| GAME-01 | Phase 7 | Pending |
| GAME-02 | Phase 7 | Pending |
| GAME-03 | Phase 7 | Pending |
| GAME-04 | Phase 7 | Pending |
| GAME-05 | Phase 7 | Pending |
| ADPT-01 | Phase 8 | Pending |
| ADPT-02 | Phase 8 | Pending |
| ADPT-03 | Phase 8 | Pending |
| ADPT-04 | Phase 8 | Pending |
| ADPT-05 | Phase 8 | Pending |
| DASH-01 | Phase 8 | Pending |
| DASH-02 | Phase 8 | Pending |
| DASH-03 | Phase 8 | Pending |
| DASH-04 | Phase 8 | Pending |
| SRCH-01 | Phase 8 | Pending |
| SRCH-02 | Phase 8 | Pending |
| SRCH-03 | Phase 8 | Pending |
| SRCH-04 | Phase 8 | Pending |
| ANLT-01 | Phase 8 | Pending |
| ANLT-02 | Phase 8 | Pending |

**Coverage:**
- v1 requirements: 68 total (file header stated 66; actual count by ID is 68 — AUTH×6, PROF×3, DASH×4, GRAM×6, VOCAB×8, READ×7, LIST×7, QUIZ×5, GAME×5, PIPE×6, ADPT×5, SRCH×4, ANLT×2)
- Mapped to phases: 68 ✓
- Unmapped: 0 ✓

---
*Requirements defined: 2026-06-11*
*Last updated: 2026-06-11 — traceability populated by roadmapper; all 68 v1 requirements mapped to phases 2–8*
