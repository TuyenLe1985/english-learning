# Feature Research

**Domain:** EFL/EdTech platform — B1/B2/C1 adult learners
**Researched:** 2026-06-11
**Confidence:** HIGH (multi-source verified against competitor analysis, peer-reviewed research, and official platform documentation)

---

## Research Context

This research addresses eight targeted questions about the EFL feature landscape for intermediate-to-advanced adult learners. The platform targets CEFR B1 (Intermediate), B2 (Upper Intermediate), and C1 (Advanced) — a segment that mainstream apps (Duolingo, Babbel) mostly abandon at B2, and that Anki/LingQ serve technically but not holistically. This is the platform's primary competitive opportunity.

---

## Competitor Feature Gap Analysis

### What Duolingo Has vs. Gaps at B1–C1

**Has:** Daily habit mechanics (streak + XP), listening exercises, adaptive difficulty within units, large-scale gamification, CEFR-aligned units up to B2 for major languages.

**Missing for B1–C1:**
- Genuine vocabulary depth: covers ~3,000 high-frequency words, leaves collocations, phrasal verbs, idioms, and academic registers entirely untouched
- Authentic input: all sentences are editorially composed, not sourced from real-world content
- Register awareness: no distinction between formal, informal, written, and spoken register
- Context-based vocabulary: teaches words in isolation, not in natural chunks ("make a decision" vs. "do a decision")
- Production over recognition: tile-selection exercises require recognition; real fluency demands production
- Content ceiling at B2: course design maxes out; no C1 pathway exists

**Verdict:** Duolingo is a habit machine for A1–B1. The platform described in PROJECT.md targets the level Duolingo cannot serve.

### What Quizlet Has vs. Gaps

**Has:** Best-in-class SRS flashcard engine, multiple review modes (Flashcard, Learn, Test, Match, Gravity), user-generated and official study sets, image support, audio pronunciation.

**Missing:**
- Contextual vocabulary learning: cards are decontextualized by default; no reading passage integration
- Structured curriculum: a tool, not a course; no learning path
- Listening comprehension module
- Grammar instruction
- CEFR classification of content
- Adaptive scheduling based on production difficulty (not just binary known/unknown)

**Verdict:** Quizlet's SRS is the reference implementation for flashcard UX. Adopt its multi-mode review system; differentiate by embedding vocabulary into reading/listening contexts.

### What ELSA Speak Has vs. Gaps

**Has:** AI phoneme-level pronunciation scoring, 8,000+ lessons, real-time feedback on individual sounds, word stress, sentence fluency, AI-powered roleplay, bilingual tutoring, progress tracking per sound cluster.

**Missing (for this platform's scope):**
- Reading comprehension module
- Grammar instruction
- Listening comprehension exercises
- SRS vocabulary system tied to content
- CEFR-classified content library

**Verdict:** ELSA Speak is pronunciation-only; it is not a general EFL platform. Speaking/pronunciation is explicitly out of scope for v1 — do not compete here.

### What LingQ Has vs. Gaps

**Has:** Comprehensible-input reading at authentic difficulty, color-coded word-status system (blue=unknown, yellow=learning, white=known), integrated SRS triggered by reading, sentence-level audio, content library at multiple CEFR levels.

**Missing:**
- Grammar instruction module
- Structured listening comprehension exercises (beyond passive listening)
- Adaptive difficulty routing based on performance
- Gamification that motivates non-intrinsically-motivated learners
- Modern UI (consistently criticized as cluttered and dated)

**Verdict:** LingQ proves word-status tracking during reading is extremely powerful for vocabulary acquisition. The reading module should implement a version of this pattern.

### What Busuu Has vs. Gaps

**Has:** Community peer corrections on writing exercises, CEFR-aligned courses A1–C1, McGraw-Hill CEFR certificates, spaced repetition vocabulary reviews, conversation lessons.

**Missing:**
- Consistent content quality at C1 (peer corrections unreliable at advanced levels)
- Deep grammar explanation at B2/C1
- Authentic reading content library

**Verdict:** Busuu's community correction feature drives engagement but is difficult to bootstrap without users. Avoid social features in v1. Their CEFR-aligned course structure is the right model.

### What Coursera / Khan Academy Have

Neither is a primary EFL competitor at B1–C1. Coursera offers academic skills courses (A2–B2) through partners. Khan Academy is K-12 ELA, not adult EFL. Irrelevant to this platform's direct competitive landscape.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features that adult B1–C1 learners have come to expect from any EFL platform. Absence = product feels incomplete or amateurish.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| CEFR level placement test | Every serious EFL platform gates content by level; users expect to start at their actual level, not A1 | MEDIUM | Needs grammar, vocabulary, reading, and listening sub-tests; 20–30 min; adaptive difficulty; outputs B1/B2/C1 + sub-level (e.g., "high B1") |
| Content organized by CEFR level | Users will not browse unfiltered content; they expect to find their level immediately | LOW | Filter/tag all content at ingestion; surface by level on all browse screens |
| Multiple exercise types per skill | Monotony (only multiple choice) signals low quality; users expect variety | MEDIUM | At minimum: fill-blank, MC, matching, drag-drop, and sentence transformation per module |
| SRS vocabulary review with scheduling | Anki and Quizlet have trained adult learners to expect scientific scheduling | MEDIUM | SM-2 or similar algorithm; at minimum Day 1/3/7/14/30/90 intervals; visual "due today" queue |
| Progress tracking dashboard | Users need to see growth; dashboard is expected from day one | MEDIUM | XP, streak, skill breakdown, items learned, review queue size |
| Playback speed control for listening | Standard in every audio player and listening app; absence feels broken | LOW | 0.5x, 0.75x, 1x, 1.25x, 1.5x; HTML5 audio API; trivial to implement |
| Transcript for listening exercises | Research confirms 30%+ comprehension improvement; users with lower level expect it | LOW | Lock transcript until first attempt; then reveal as scaffold; clickable words a differentiator |
| Text highlighting and notes in reading | Users learning from authentic text expect to annotate; absence causes abandonment | MEDIUM | Simple highlight + note-attach; persisted per user per passage |
| Bookmarking / saving content | Adult learners plan study sessions; they bookmark to return | LOW | Single-action save to "My List"; show saved count |
| Vocabulary in context (not isolated) | B1+ learners know that decontextualized word lists are ineffective | MEDIUM | Each vocabulary item shows 2–3 authentic example sentences from real corpus |
| CEFR progress indicator | Users explicitly want to see B1 → B2 → C1 movement, not just abstract levels | MEDIUM | Map XP/accuracy thresholds to CEFR bands; show "X% to B2" |
| Streak with protection mechanic | Habit-critical; users will leave if one missed day resets weeks of work | LOW | Streak freeze (1 free per 7 days or purchasable); consistent with Duolingo expectation |
| Mobile-responsive design | Over 60% of EdTech sessions are mobile; non-responsive = immediate abandonment | MEDIUM | Mobile-first layout; all exercises touchable; audio controls thumb-accessible |
| Dark mode | Expected by modern app users, especially for evening study sessions | LOW | CSS variables + next-themes; one-day implementation |
| Email reminders / notifications | Learners who set study goals need external prompts; opt-in, not forced | LOW | Daily reminder + SRS due-today alert; push via email and optionally browser notification |
| Search across content | Users remember a topic or word; they need to find it | LOW | Full-text search across lessons, vocabulary, passages; filter by CEFR + skill |
| Quiz results history | Adult learners are progress-oriented; they want to review past performance | LOW | Store: score, accuracy, time, mistakes, date; accessible from profile |
| Error correction in exercises | Immediate corrective feedback is non-negotiable; no feedback = no learning signal | LOW | Show correct answer + brief explanation on wrong attempt; required for all exercise types |

### Differentiators (Competitive Advantage)

Features that distinguish this platform from what Duolingo, Babbel, and Quizlet offer. Focus competitive energy here.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Authentic crawled content at CEFR level | VOA, BBC, News in Levels content is real-world English — this is the gap Duolingo never fills | HIGH | Content pipeline (Playwright + Cheerio + CEFR classifier) is already in scope; the differentiator is the reading/listening experience built on top |
| Vocabulary-in-context extraction during reading | While reading, user taps unknown words; they enter the SRS automatically with that sentence as context | HIGH | Word-status tracking (inspired by LingQ) makes vocabulary acquisition passive during reading; sentences become the review card context; strong retention signal |
| Collocations, phrasal verbs, and idioms as first-class vocabulary items | B1–C1 learners plateau precisely because apps teach single words; collocations ("make a decision", "call off a meeting") are what actually sound native | MEDIUM | Tag vocabulary records with type: collocation/phrasal_verb/idiom/single; surface in vocabulary module as primary drill type |
| Adaptive difficulty routing between lessons | 2025 research: learners using adaptive content algorithms are 47.6% more likely to return within 7 days | HIGH | Track accuracy per skill per CEFR level; surface "weak topic" re-drills; block C1 content until B2 accuracy threshold met |
| Synchronized interactive transcript for listening | Click any word in the transcript to replay that sentence; highlight unfamiliar words to add to SRS | MEDIUM | Karaoke-style word highlighting synchronized to audio timestamp; word-click → SRS add; stronger than plain transcript |
| Post-listening vocabulary extraction | After completing listening exercise, surface 5–10 key words from the transcript for optional SRS addition | MEDIUM | Pipeline extracts vocabulary from transcript during content processing; exercise completion triggers "vocabulary harvest" modal |
| Reading difficulty scaffolding (same content, scaled) | Advanced users can read C1 text; B1 users see the same article with vocabulary hints inline | HIGH | Requires content difficulty annotation + UI hint injection; complex but differentiating |
| Mastery-based skill badges (not just XP) | Adult learners respond to mastery framing ("Grammar: Conditionals — Mastered") more than numeric XP | LOW | Achievement system tied to accuracy thresholds per grammar topic and vocabulary category; shown on profile |
| Weekly skill challenge (time-boxed sprint) | Research: time-boxed sprints maintain momentum and create re-engagement trigger for lapsed users | LOW | 7-day challenge with specific goal (e.g., "Complete 3 B2 reading exercises"); push notification for progress |
| Sentence-level audio in vocabulary module | Vocabulary review card plays audio of the example sentence, not just the word; trains listening-vocabulary link | LOW | Text-to-speech or pre-recorded audio for example sentences on flashcard |
| "Continue where you left off" state persistence | Adult learners study in fragmented sessions; losing progress mid-lesson is a critical drop-off point | LOW | Persist lesson progress in DB; resume from last completed exercise item, not lesson start |
| Sub-level progress indicator (e.g., "High B1") | Standard CEFR tests don't show sub-level; this platform shows "high B1 / 75% to B2" — uniquely motivating | MEDIUM | Map XP + accuracy combinations to percentile within CEFR band; visible on dashboard and profile |
| AI-generated exercise variety | Pre-generated via pipeline means zero latency; 30–50 exercises per grammar lesson vs. Duolingo's 5–10 | HIGH | Already in PRD; differentiator is the volume and variety (20 exercise types vs. 3–4 in mainstream apps) |
| CEFR placement test with skill breakdown output | Most placement tests output a single level; this outputs B1 Reading / B2 Grammar / B1 Listening separately | MEDIUM | Sub-scores per skill; map to recommended learning path; resurface after 30 days of activity |
| Mixed-skill quiz combining all modules | Integrated skill practice (reading + grammar + vocabulary in one quiz) is rare; reflects IELTS/TOEIC structure | MEDIUM | Quiz Center feature already in PRD; differentiator is the integration and topic-based framing |

### Anti-Features (Commonly Requested, Often Problematic)

Features that appear in competitor wishlists and user forums but should be deliberately excluded from v1.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Live peer correction / community writing board | Busuu has it; social learning appeals to adult learners | Requires critical mass of active users to be useful; a ghost town social feature is worse than no social feature; moderation cost is high; cold-start problem kills it | Defer to v2 when user base exists; v1: AI-based grammar hints on exercise mistakes instead |
| Real-time AI chat tutor (conversational AI) | ChatGPT has trained users to expect this; appears natural | Requires live LLM API calls at runtime = significant cost and latency; complex conversation state management; out of scope per PROJECT.md explicitly | Pre-generated AI exercises cover the learning need without the infrastructure cost; defer |
| Speaking / pronunciation evaluation | ELSA Speak is popular; users want feedback on speaking | ASR pipeline, audio recording, phoneme analysis — entire separate infrastructure; out of scope per PROJECT.md | Mark as v2 roadmap item clearly visible on the platform ("Coming Soon: Speaking Practice") |
| Downloadable lesson PDFs | Common request on course platforms | Creates content version drift; encourages passive consumption over active practice; adds maintenance overhead | Ensure offline-friendly SRS review mode works; users get portability through mobile-responsive app |
| Social leaderboard / competitive ranking | Duolingo's weekly leagues drive engagement | Only works with active users competing at similar levels; a leaderboard of one (new user) is demotivating; research shows it decreases motivation for lower-confidence learners | Individual challenge streaks and weekly personal goals provide the competitive hook without requiring other users |
| Editable user-generated vocabulary sets | Quizlet built its business on this; users know it | Requires moderation, storage, content safety, sharing infrastructure; out-of-scope content may dilute quality | Vocabulary-in-context extraction from curated content achieves the personalization goal without UGC infrastructure |
| Infinite scrolling content feeds | Engagement-maximizing pattern from social media | Undermines lesson completion; users browse without engaging; creates "snack learning" where depth is replaced by volume | Structured lesson/unit navigation with explicit start/end; progress completion tracked per lesson |
| Over-instrumented analytics dashboard | Learner data is rich; tempting to display everything | Research (Valle, 2022) shows dashboards can decrease motivation for lower-confidence learners; predictive dashboards backfire for students with lower initial motivation | Show 4–5 core metrics: streak, XP, items learned today, review queue, skill breakdown. Actionable "what to do next" recommendation more valuable than raw charts |
| Video lessons / lecture content | MOOCs are popular; learners expect video | High production cost, no differentiation from YouTube/Coursera; passive consumption; does not improve interactive practice quality | Grammar explanations as structured text + visual examples; interactive exercises are the actual differentiator |
| Certification / official CEFR certificate | Busuu offers McGraw-Hill certificates; prestige appeal | Legally and procedurally complex to issue certified credentials; requires secure, proctored testing infrastructure; misleading without proper accreditation | Show CEFR level estimate prominently on profile; link to official testing centers (Cambridge English, IELTS) for formal certification |

---

## Feature Dependencies

```
CEFR Placement Test
    └──requires──> Grammar Module (provides grammar accuracy signal)
    └──requires──> Vocabulary Module (provides lexical density signal)
    └──requires──> Listening Module (provides listening comprehension signal)
    └──produces──> Adaptive Learning System (placement feeds the recommended path)

Adaptive Learning System
    └──requires──> Progress Tracking (needs historical accuracy data)
    └──requires──> Content CEFR Classification (needs tagged content to route)
    └──enhances──> All Modules (surfaces weak-area content)

SRS Vocabulary System
    └──requires──> Vocabulary Records (words, example sentences, audio)
    └──enhances──> Reading Module (vocabulary extraction during reading)
    └──enhances──> Listening Module (vocabulary harvest post-exercise)
    └──requires──> BullMQ job scheduler (review scheduling; in PROJECT.md)

Reading Comprehension Module
    └──requires──> Crawled + CEFR-classified content (content pipeline)
    └──enhances──> SRS Vocabulary System (word-status tracking)
    └──requires──> User session persistence (resume mid-passage)

Listening Comprehension Module
    └──requires──> Audio content + transcript pairs
    └──enhances──> SRS Vocabulary System (post-exercise vocabulary harvest)
    └──requires──> Synchronized transcript (interactive transcript is a differentiator)

Grammar Module
    └──requires──> AI-generated exercises (pipeline)
    └──feeds──> Placement Test accuracy (grammar sub-score)

Vocabulary-in-Context Module
    └──requires──> SRS engine
    └──requires──> Contextual example sentences (corpus sourced)
    └──enhances──> Reading Module (words encountered in reading auto-added)

Gamification Layer
    └──requires──> Progress Tracking (needs events to award XP)
    └──requires──> Achievement system (streak, XP, badges)
    └──enhances──> All Modules (XP events on completion)

Quiz Center
    └──requires──> Grammar + Vocabulary + Reading + Listening modules
    └──requires──> Results storage
    └──provides──> Placement Test (a specialized quiz type)

Analytics Dashboard
    └──requires──> Progress Tracking (all event data)
    └──requires──> Quiz results
    └──requires──> SRS review history
```

### Dependency Notes

- **Adaptive Learning requires Progress Tracking:** Cannot recommend next content without historical accuracy data. Progress Tracking must be in a phase before adaptive routing is activated.
- **SRS requires Vocabulary Records:** The SRS is only as valuable as the vocabulary corpus behind it. Content pipeline seeding (5,000 vocabulary records) must complete before SRS is usable.
- **Reading's vocabulary extraction enhances SRS:** These two modules compound each other's value — build both in same phase or ensure vocabulary module ships first.
- **Placement Test requires all four skill modules:** Cannot run a meaningful placement test until grammar, vocabulary, reading, and listening exercises all exist. This places placement test as a later-phase feature despite its logical position as "first thing user does."
- **Interactive transcript requires synchronized timestamps:** Transcript display is table stakes; click-to-replay requires timestamp data in the audio/transcript pipeline. These are two separate implementation tasks with a dependency.
- **Gamification conflicts with over-instrumented analytics:** Showing too many metrics alongside gamification elements creates cognitive overload. Keep analytics minimal on the learning dashboard; detailed analytics belong in a separate profile/stats view.

---

## MVP Definition

### Launch With (v1)

Minimum viable product — what's needed for the platform to feel complete and differentiated from day one.

- [ ] CEFR placement test (grammar + vocabulary + reading + listening sub-scores) — users cannot engage meaningfully without knowing their level
- [ ] Grammar module with 10 topic areas, multiple exercise types, AI-generated questions — table stakes for any EFL platform
- [ ] Vocabulary-in-context module with SRS scheduling — the primary daily engagement loop
- [ ] Reading comprehension module with text highlighting, notes, and bookmarking — differentiator through authentic crawled content
- [ ] Listening comprehension module with speed control and synchronized interactive transcript — differentiator through interactive transcript
- [ ] Quiz center with topic-based and mixed-skill quizzes — required to demonstrate skill integration
- [ ] Progress dashboard with streak, XP, skill breakdown, review queue — retention mechanism
- [ ] Achievement system with badges tied to mastery thresholds — adult learner motivation anchor
- [ ] Content pipeline seeded to minimum viable data (500 grammar lessons, 5,000 vocabulary, 2,000 reading passages, 1,000 listening transcripts) — platform must never be empty
- [ ] CEFR level indicator showing sub-level progress (e.g., "High B1 / 75% to B2") — core differentiator vs. Duolingo

### Add After Validation (v1.x)

Features to add once core learning loop is confirmed working.

- [ ] Vocabulary extraction from reading passages (word-status tracking, click-to-add-to-SRS) — requires reading module stable first
- [ ] Post-listening vocabulary harvest modal — requires listening module and SRS in production
- [ ] Weekly skill challenge (time-boxed sprint) — requires user activity data to calibrate
- [ ] Adaptive difficulty routing between modules — requires several weeks of accuracy data per user
- [ ] Collocation / phrasal verb / idiom tagging in vocabulary module — content enrichment layer
- [ ] "Continue where you left off" state persistence across sessions — requires UX testing to confirm pain point

### Future Consideration (v2+)

Features to defer until the platform has proven retention and learner outcomes.

- [ ] Social features / community corrections — requires user base to be useful
- [ ] AI chat tutor — requires live LLM infrastructure and cost management
- [ ] Speaking / pronunciation evaluation — requires ASR pipeline (out of scope per PROJECT.md)
- [ ] Peer discussion / writing board — requires moderation infrastructure
- [ ] Official CEFR certification — requires accreditation process
- [ ] Native mobile app (iOS/Android) — out of scope per PROJECT.md; API-first architecture supports it

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| CEFR placement test | HIGH | MEDIUM | P1 |
| Grammar module (10 topics, multi-type exercises) | HIGH | HIGH | P1 |
| SRS vocabulary review system | HIGH | MEDIUM | P1 |
| Vocabulary-in-context with example sentences | HIGH | MEDIUM | P1 |
| Reading comprehension module | HIGH | HIGH | P1 |
| Listening comprehension with interactive transcript | HIGH | HIGH | P1 |
| Progress dashboard (streak, XP, skill breakdown) | HIGH | MEDIUM | P1 |
| Content pipeline + seed data | HIGH | HIGH | P1 — platform is useless without data |
| Achievement / badge system | MEDIUM | LOW | P1 — retention mechanism |
| Sub-level CEFR progress indicator | HIGH | LOW | P1 — unique differentiator, low cost |
| Quiz center (mixed-skill + topic) | MEDIUM | MEDIUM | P1 |
| Dark mode | MEDIUM | LOW | P1 — expected by users |
| Mobile-responsive design | HIGH | MEDIUM | P1 — 60%+ sessions mobile |
| Text highlighting + notes in reading | HIGH | LOW | P1 |
| Playback speed control | HIGH | LOW | P1 |
| Email reminders for review + streak | MEDIUM | LOW | P2 |
| Vocabulary extraction from reading (word-status) | HIGH | HIGH | P2 — v1.x |
| Adaptive difficulty routing | HIGH | HIGH | P2 — needs data to work |
| Post-listening vocabulary harvest | MEDIUM | MEDIUM | P2 |
| Collocations / phrasal verbs tagging | HIGH | MEDIUM | P2 — content enrichment |
| Weekly challenge sprints | MEDIUM | LOW | P2 |
| AI chat tutor | HIGH (requested) | HIGH (infrastructure) | P3 |
| Social / peer features | MEDIUM | HIGH (cold-start) | P3 |
| Speaking / pronunciation | HIGH (requested) | HIGH (ASR pipeline) | P3 |

---

## Key Findings by Research Question

### Q1: What features are competitors missing that this platform can own?

The dominant gap in the market is the **B2/C1 ceiling**. Duolingo, Babbel, and Busuu all falter or stop at B2. The platform in PROJECT.md can own the B1–C1 adult learner segment by:
1. Offering authentic, real-world content at all three CEFR levels
2. Teaching collocations, phrasal verbs, and idioms as first-class vocabulary (the core B1→C1 gap)
3. Providing a clear sub-level progression indicator ("High B1 / 75% to B2")
4. Integrating reading + vocabulary + SRS so acquiring words from context is the primary mechanic

### Q2: Table stakes for B1–C1 adult learners (vs. beginner-focused apps)

Beginners accept childlike UX (Duolingo's owl). Adult intermediate learners will not. Table stakes shift at B1+:
- Content must feel authentic, not classroom-composed
- Register awareness matters (formal vs. informal English)
- Vocabulary depth: collocations, not single words
- Grammar explanations must include why, not just what
- Progress must be CEFR-mapped (not abstract "Level 42")
- No translation reliance: exercises must be English-in / English-out at B1+

### Q3: Gamification that works for adult language learners

Research (Frontiers, 2024; Yu-kai Chou framework) establishes that XP + streaks alone are insufficient. What actually works for adults:
- **Mastery progression** — "Grammar: Conditionals — Mastered" framing (Core Drive: Development)
- **Loss aversion** — streak protection mechanic (Core Drive: Avoidance) — works strongly across all adults
- **Progress maps** — visible skill tree showing B1 → B2 → C1 pathway (Core Drive: Development + Empowerment)
- **Time-boxed challenges** — weekly sprints with specific goals maintain momentum between sessions
- **Badges tied to skill thresholds** — "250 Words Learned" is motivating; "10,000 XP" is abstract
- Avoid: global leaderboards (research shows they decrease motivation for lower-confidence learners)
- Avoid: narrative/storyline gamification — adult professional learners find it infantilizing

### Q4: Ideal SRS UI and best review formats for vocabulary retention

Research (Karpicke & Roediger, 2008; multiple meta-analyses) is clear:
- **Production beats recognition**: recall-based exercises outperform multiple-choice for long-term retention
- **Context beats isolation**: example sentences in cards produce stronger retention than word-definition pairs
- **Format variety within sessions**: rotate between recall (type answer), cloze (fill blank), and recognition to prevent pattern-matching
- **Best review card structure**: Target word → Example sentence with word blanked → Tap to reveal → Rate confidence (Again / Hard / Good / Easy) → SM-2 schedules next review
- **Audio on the card**: sentence-level audio (not just word audio) bridges vocabulary to listening

Implement: multi-format SRS (Flashcard → Learn → Cloze → Recall) inspired by Quizlet but with contextual sentences as the anchor.

### Q5: Ideal reading comprehension experience

Based on LingQ, Readlang, and research findings:
- **Word-status tracking** during reading is the highest-leverage feature: visual progress (blue → white) provides immediate gratification and drives vocabulary acquisition passively
- **Tap-to-translate / tap-to-define**: immediate definition without leaving the page; annotation should be instant-friction-free
- **Text highlighting + persistent notes**: standard expectation, not optional
- **Difficulty-leveled access**: filter by CEFR; ideally same article exists at multiple difficulty levels (v1.x)
- **Timer mode** (optional): some adult learners practice reading speed; show WPM at end
- **Post-reading questions**: 3–5 comprehension questions after every passage (main idea, detail, inference, vocabulary-in-context)
- **Bookmarking**: allow returning to passages mid-study session

### Q6: Features that distinguish good listening platforms from mediocre ones

Mediocre: static audio file + multiple-choice questions.

Good platforms add:
- **Synchronized interactive transcript**: word-level highlighting as audio plays; click any word to replay that sentence
- **Playback speed control**: 0.5x to 1.5x; required for all difficulty levels
- **Transcript reveal as scaffold**: lock transcript until attempt; unlock as assistance; motivates initial unaided try
- **Vocabulary extraction**: after completion, surface key words from transcript for SRS
- **Difficulty labeling**: conversation vs. lecture vs. news report; B1 vs. B2 vs. C1 labeled before play
- **Content variety**: conversations, lectures, news reports — different prosodic patterns build different listening skills

### Q7: What a CEFR placement test needs for accurate B1/B2/C1 classification

Key findings from placement test research:
- **Multi-skill sub-scores** required (grammar, vocabulary, reading, listening each scored separately) — users are often B2 in grammar and B1 in listening; a single score is misleading
- **Adaptive question selection**: questions should increase in difficulty as user answers correctly (CAT — Computer Adaptive Testing approach)
- **Minimum 20–30 questions** per session to reduce statistical noise; shorter tests have high error rates at transitional levels
- **Transitional level accuracy**: B1/B2 and B2/C1 boundaries are hardest to classify accurately; use more questions in these ranges
- **No production tasks in automated placement** (speaking/writing require human evaluation which is out of scope for v1); compensate with varied reading/grammar/vocabulary tasks
- **Output: sub-level within band**: "High B1" or "Low B2" is more informative than just "B1" — and motivating
- **Re-assess prompt**: after 30 days of activity, prompt user to retake placement test; level drift is real and expected

### Q8: Analytics learners find motivating vs. overwhelming

Research (SoLAR, 2022; MDPI LAD study, 2025) findings:
- **Motivating**: streak length, items learned today, review queue count ("5 cards due"), weekly activity heatmap, skill breakdown bar chart
- **Neutral to harmful**: percentile comparisons vs. other users (demotivating for below-average performers), predictive statements ("at this rate, you'll reach B2 in 4 months") — backfire for low-confidence learners
- **Principle**: actionable > descriptive; "You have 5 vocabulary reviews due" drives action; "You studied 47 minutes this week" is interesting but inert
- **Max 5–6 metrics on dashboard**: cognitive overload from data density reduces engagement
- **"What to do next" recommendation** is more valuable than any single chart: surfaces one specific next lesson, quiz, or review

---

## Competitor Feature Analysis

| Feature | Duolingo | Quizlet | LingQ | Busuu | This Platform |
|---------|----------|---------|-------|-------|---------------|
| CEFR ceiling | B2 | None (tool) | C2+ | C1 | C1 (target) |
| Authentic content | No | No | Yes | Partial | Yes (crawled) |
| Collocations/phrasal verbs | No | User-created | Yes (via reading) | Partial | Yes (tagged, first-class) |
| SRS vocabulary | Basic | Strong (multi-mode) | Yes (reading-integrated) | Basic | Strong + context-anchored |
| Interactive transcript | No | No | Sentence audio | No | Yes (synchronized, clickable) |
| Grammar module | Implicit | No | No | Yes | Yes (10 topics, multi-type) |
| Reading comprehension | Basic | No | Yes (core feature) | Basic | Yes (annotated, authenticated) |
| Listening comprehension | Yes | No | Partial | Yes | Yes (interactive transcript) |
| CEFR sub-level progress | No | No | No | Partial | Yes (differentiator) |
| Adaptive difficulty | Basic | No | Implicit | Yes | Yes (performance-based) |
| Placement test (multi-skill) | Basic | No | No | Yes | Yes (sub-scores per skill) |
| Modern UI / polish | High | Medium | Low | Medium | High (target) |
| B1–C1 content depth | Poor | Depends on UGC | Good | Good | Good (crawled + AI-generated) |

---

## Sources

- [Duolingo Intermediate English: What It Does Well, Where It Falls Short](https://www.clozemaster.com/blog/duolingo-intermediate-english/) — Duolingo gap analysis
- [Taalhammer vs Duolingo, Busuu, Babbel, Anki, LingQ: Which reaches C1/C2 fastest?](https://www.taalhammer.com/taalhammer-vs-duolingo-busuu-babbel-anki-lingq-which-language-learning-app-reaches-c1c2-in-english-fastest/) — Multi-platform comparison
- [Frontiers: Gamification influence on motivation and learning outcomes](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2024.1295709/full) — Gamification research
- [Frontiers: Enhancing EFL/ESL through gamification — empirical review](https://www.frontiersin.org/journals/education/articles/10.3389/feduc.2024.1395155/full) — Gamification meta-analysis
- [Spaced Repetition for Language Learners: 2026 Guide — Migaku](https://migaku.com/blog/language-fun/spaced-repetition-for-language-learners-a-2026-guide) — SRS formats and retention
- [Best Reading Apps for Language Learning 2026 — Eppika](https://eppika.com/en/blog/best-reading-apps-language-learning-2026) — Reading feature comparison
- [Placement Tests for Language Courses — YourFutureCareer](https://yourfuturecareer.org/placement-tests-for-language-courses-how-to-accurately-assess-cefr-levels) — CEFR placement test design
- [Learning Analytics Dashboards for Learners — SoLAR Research](https://www.solaresearch.org/2022/03/dashboards-for-learners-dont-always-motivate-them/) — Analytics motivation research
- [Babbel vs. Busuu Review — FluentU](https://www.fluentu.com/blog/reviews/babbel-vs-busuu/) — Competitor feature analysis
- [SRS Cards vs. Cloze vs. Dictation vs. Multiple Choice — LingQ Forums](https://forum.lingq.com/t/cards-vs-cloze-vs-dictation-vs-multiple-choice/24856) — Review format comparison
- [Gamification in 2026: Beyond Stars, Badges, Points — Tesseract Learning](https://tesseractlearning.com/blogs/view/gamification-in-2026-going-beyond-stars-badges-and-points/) — Modern gamification principles
- [Enhancing Reading Engagement via AI — ScienceDirect 2025](https://www.sciencedirect.com/science/article/abs/pii/S0346251X25003161) — Reading annotation research
- [Adaptive Learning in EFL: Reinforcement Learning Approach — ACM 2025](https://dl.acm.org/doi/10.1145/3785987.3786031) — Adaptive difficulty research
- [LingQ Review 2026 — LingQ Blog](https://www.lingq.com/blog/lingq-review/) — LingQ word-status system
- [ELSA Speak Product Page](https://elsaspeak.com/en/product-learn-english-elsa-speak/) — ELSA features
- [Demotivation and Dropout in Adult EFL Learners — TESL-EJ](https://tesl-ej.org/wordpress/issues/volume23/ej92/ej92a8/) — Adult learner dropout research
- [Design Principles of Learning Analytics Dashboards — MDPI 2025](https://www.mdpi.com/2076-3417/15/21/11493) — Dashboard design principles

---

*Feature research for: English Learning Platform (B1/B2/C1 adult EFL)*
*Researched: 2026-06-11*
