/**
 * SrsService — FSRS spaced-repetition core.
 *
 * VOCAB-04: enrollWord() — upserts UserVocabularyItem + creates SrsCard via ts-fsrs createEmptyCard().
 *           Idempotent: returns existing card on repeat enroll (D-11, Pitfall 5).
 * VOCAB-05: submitReview() — fsrs().repeat() to compute next scheduling; writes next due to DB only (D-02).
 *           Awards 3 flat XP on Good/Easy via GamificationService (D-10, no CEFR multiplier).
 * VOCAB-06: getDueQueue() — WHERE due <= NOW(), ORDER BY due ASC, LIMIT 20 (D-01, D-04).
 * D-07:     completeSession() — records batch practice result, returns SessionResultDto.
 *
 * CRITICAL: ts-fsrs v5 uses snake_case (elapsed_days, scheduled_days, last_review, learning_steps).
 *           SrsCard schema uses camelCase and has NO learningSteps column.
 *           dbCardToFsrsCard and fsrsCardToDbUpdate handle the translation explicitly.
 *           See RESEARCH Pitfalls 1, 2 and Pattern 3.
 *
 * Security (T-03-06, T-03-07, T-03-08, T-03-09):
 *   - submitReview uses findFirst { id, userId } — user can never mutate another user's cards.
 *   - getDueQueue scopes by userId from JWT.
 *   - enrollWord is idempotent (upsert) — no mass-create attack.
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GamificationService } from '../gamification/gamification.service';
import { XP_RATES } from '../gamification/gamification.constants';
import { createEmptyCard, fsrs, Rating, State, type Card, type Grade } from 'ts-fsrs';
import type { SessionCompleteDto, SessionResultDto } from '@repo/shared';

// ─── Field mapping functions (CRITICAL — RESEARCH Pattern 3) ─────────────────

/**
 * Map a Prisma SrsCard (camelCase) to a ts-fsrs Card (snake_case).
 *
 * Pitfall 1: ts-fsrs v5 expects learning_steps but SrsCard has no such column.
 *            Default to 0 on read.
 * Pitfall 2: Prisma stores state as a string enum ('New', 'Learning', 'Review', 'Relearning').
 *            ts-fsrs expects a numeric State enum value (New=0, Learning=1, Review=2, Relearning=3).
 *            Use State[dbCard.state as keyof typeof State] to convert.
 */
function dbCardToFsrsCard(dbCard: {
  due: Date;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  reps: number;
  lapses: number;
  state: string;
  lastReview: Date | null;
}): Card {
  return {
    due: dbCard.due,
    stability: dbCard.stability,
    difficulty: dbCard.difficulty,
    elapsed_days: dbCard.elapsedDays,
    scheduled_days: dbCard.scheduledDays,
    learning_steps: 0, // field absent from schema — default to 0 (RESEARCH Pitfall 1)
    reps: dbCard.reps,
    lapses: dbCard.lapses,
    state: State[dbCard.state as keyof typeof State], // string→numeric (RESEARCH Pitfall 2)
    last_review: dbCard.lastReview ?? undefined,
  };
}

/**
 * Map a ts-fsrs Card result back to a Prisma update payload (camelCase).
 *
 * Pitfall 1: learning_steps is intentionally NOT written to DB (no column).
 * Pitfall 2: state is numeric in ts-fsrs; convert back to Prisma string enum.
 *            State[card.state] resolves numeric→string: 2 → 'Review', etc.
 */
function fsrsCardToDbUpdate(card: Card) {
  return {
    due: card.due,
    stability: card.stability,
    difficulty: card.difficulty,
    elapsedDays: card.elapsed_days,
    scheduledDays: card.scheduled_days,
    // learning_steps intentionally NOT persisted (field not in SrsCard schema)
    reps: card.reps,
    lapses: card.lapses,
    state: State[card.state] as 'New' | 'Learning' | 'Review' | 'Relearning', // numeric→string
    lastReview: card.last_review ?? null,
  };
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class SrsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gamification: GamificationService,
  ) {}

  /**
   * VOCAB-04 — Enroll a word into the user's SRS schedule.
   *
   * Step 1: Upsert UserVocabularyItem (idempotent on @@unique userId_wordId).
   * Step 2: findUnique SrsCard by userVocabItemId — return existing if found.
   * Step 3: createEmptyCard() → create new SrsCard linked to the UserVocabularyItem.
   *
   * contextSentence is stored only on first enroll (upsert update: {} — do not overwrite).
   */
  async enrollWord(userId: string, wordId: string, contextSentence?: string) {
    // Upsert UserVocabularyItem — idempotent, keyed on @@unique([userId, wordId])
    const item = await this.prisma.userVocabularyItem.upsert({
      where: { userId_wordId: { userId, wordId } },
      create: { userId, wordId, contextSentence },
      update: {}, // don't overwrite existing contextSentence on repeat enroll
    });

    // Return existing SrsCard if already enrolled (idempotent — Pitfall 5)
    const existing = await this.prisma.srsCard.findUnique({
      where: { userVocabItemId: item.id },
    });
    if (existing) return existing;

    // Create new SrsCard from ts-fsrs createEmptyCard()
    const empty = createEmptyCard();
    return this.prisma.srsCard.create({
      data: {
        userId,
        wordId,
        userVocabItemId: item.id,
        due: empty.due,
        stability: empty.stability,
        difficulty: empty.difficulty,
        elapsedDays: empty.elapsed_days,
        scheduledDays: empty.scheduled_days,
        reps: empty.reps,
        lapses: empty.lapses,
        state: 'New', // createEmptyCard() → State.New
      },
    });
  }

  /**
   * VOCAB-06 — Return cards due for review.
   *
   * D-01: Query WHERE due <= NOW() (DB query on request, no BullMQ).
   * D-04: Cap at 20 cards, ordered by due ASC (oldest first).
   * Includes word relation for the review UI.
   */
  async getDueQueue(userId: string) {
    return this.prisma.srsCard.findMany({
      where: {
        userId,
        due: { lte: new Date() },
      },
      orderBy: { due: 'asc' },
      take: 20, // D-04: max 20 per session
      include: { word: true },
    });
  }

  /**
   * VOCAB-05 — Submit a review rating and reschedule via FSRS.
   * Awards 3 flat XP on Good or Easy ratings (D-10: no CEFR multiplier).
   *
   * Security (T-03-06): findFirst { id: cardId, userId } — user can never
   *   reschedule another user's card.
   * D-02: Only writes next due/stability/state to DB — no BullMQ job enqueued.
   */
  async submitReview(
    userId: string,
    cardId: string,
    rating: 'Again' | 'Hard' | 'Good' | 'Easy',
  ) {
    // Security scope: always filter by userId to prevent cross-user access (T-03-06)
    const dbCard = await this.prisma.srsCard.findFirst({
      where: { id: cardId, userId },
    });
    if (!dbCard) throw new NotFoundException('Card not found');

    const f = fsrs();
    const now = new Date();
    const scheduling = f.repeat(dbCardToFsrsCard(dbCard), now);
    // Rating.Manual (0) is excluded from RecordLog's Grade type — cast is safe
    // because the controller only allows Again/Hard/Good/Easy (all are Grade values)
    const ratingEnum = Rating[rating as keyof typeof Rating] as Grade;
    const nextCard = scheduling[ratingEnum].card;

    const updatedCard = await this.prisma.srsCard.update({
      where: { id: cardId },
      data: {
        ...fsrsCardToDbUpdate(nextCard),
        lastReview: now, // always record exact review time
      },
    });

    // D-10: Award 3 flat XP on Good/Easy — no CEFR multiplier
    // SRS word difficulty is already captured in the FSRS ease factor
    if (rating === 'Good' || rating === 'Easy') {
      await this.gamification.awardXp(
        userId,
        XP_RATES.SRS_REVIEW,
        'srs_review',
        'VOCABULARY',
        cardId,
      );
    }

    return updatedCard;
  }

  /**
   * D-07 — Record a practice session result.
   *
   * No dedicated table in Phase 3 schema. Compute and return SessionResultDto.
   * The enroll flow (Plan 05 UI) will call enrollWord for wrong/uncertain words.
   */
  async completeSession(
    _userId: string,
    dto: SessionCompleteDto,
  ): Promise<SessionResultDto> {
    const total = dto.answers.length;
    const wrongWordIds = dto.answers
      .filter((a) => !a.isCorrect)
      .map((a) => a.wordId);
    const score = total - wrongWordIds.length;

    return {
      score,
      total,
      wrongWordIds,
      timeTakenMs: dto.timeTakenMs,
    };
  }
}
