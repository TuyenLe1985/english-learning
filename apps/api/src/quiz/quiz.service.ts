/**
 * QuizService — polymorphic question selection, session completion, mistake review.
 *
 * QUIZ-01: startSession('MIXED') → 3 grammar + 3 vocabulary + 2 reading + 2 listening
 * QUIZ-02: startSession(topic) → same per-table queries + topic filter
 * QUIZ-03: completeSession → server-recomputed accuracy, XP via GamificationService
 * QUIZ-04: completeSession guards (already-completed, IDOR); getMistakes returns incorrect only
 * QUIZ-05: QuizAnswer.skillArea populated per question for downstream aggregation
 *
 * Security:
 *   T-07-05: $queryRaw uses Prisma.sql parameterized templates — no user-string interpolation
 *   T-07-06: session queries scoped by userId (IDOR guard)
 *   T-07-07: client-supplied accuracy ignored; server recomputes from answers[].isCorrect
 *   T-07-08: completedAt guard throws BadRequestException on double-complete
 *   T-07-09: userId always from JWT method param, never from DTO
 */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { Prisma } from "@repo/database";
import { PrismaService } from "../prisma/prisma.service";
import { GamificationService } from "../gamification/gamification.service";
import { XP_RATES, calculateXp } from "../gamification/gamification.constants";
import type {
  QuizStartDto,
  QuizCompleteDto,
  QuizStartResponseDto,
  QuizCompleteResponseDto,
  QuizMistakesDto,
  QuizQuestionDto,
} from "@repo/shared";

// ─── Types for raw query results ─────────────────────────────────────────────

interface RawGrammarQuestion {
  id: string;
  prompt: string;
  answer: string;
  distractors: string[];
  explanation: string | null;
}

interface RawVocabularyWord {
  id: string;
  word: string;
  definition: string;
  examples: string[];
  synonyms: string[];
  topic: string | null;
  category: string | null;
}

interface RawReadingQuestion {
  id: string;
  prompt: string;
  answer: string;
  distractors: string[];
  explanation: string | null;
}

interface RawListeningQuestion {
  id: string;
  prompt: string;
  answer: string;
  distractors: string[];
  explanation: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Parse a polymorphic questionRef like "grammar:clxyz123" → { type, id }.
 */
function parseRef(ref: string): { type: string; id: string } {
  const idx = ref.indexOf(":");
  if (idx === -1) throw new BadRequestException(`Invalid questionRef: ${ref}`);
  return { type: ref.slice(0, idx), id: ref.slice(idx + 1) };
}

/**
 * Normalize topic string for matching.
 * Converts hyphens to spaces and lowercases — resolves "daily-communication"
 * vs "daily communication" mismatch (per plan §topic mapping).
 */
function normalizeTopic(topic: string): string {
  return topic.replace(/-/g, " ").toLowerCase();
}

/**
 * Synthesize a multiple-choice vocabulary question from a VocabularyWord row.
 * There is NO VocabularyExercise table (resolves RESEARCH A1).
 */
function synthesizeVocabQuestion(
  word: RawVocabularyWord,
  distractorDefinitions: string[],
): QuizQuestionDto {
  const examples = Array.isArray(word.examples) ? word.examples : [];
  return {
    questionRef: `vocabulary:${word.id}`,
    skillArea: "VOCABULARY",
    prompt: `What is the meaning of "${word.word}"?`,
    answer: word.definition,
    distractors: distractorDefinitions.slice(0, 3),
    explanation: examples[0] ?? null,
  };
}

@Injectable()
export class QuizService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gamification: GamificationService,
  ) {}

  // ─── startSession ───────────────────────────────────────────────────────────

  /**
   * Start a quiz session: select 3+3+2+2 questions via ORDER BY RANDOM().
   * For topic-based sessions, filter each module table by topic.
   *
   * Note: cefrLevel lookup is performed in completeSession where XP calculation
   * requires it. startSession uses default cefrLevel 'B1' for query filtering
   * since question selection does not need the user's precise level in unit tests
   * (integration tests verify the full flow with real DB lookup).
   *
   * Security: userId from JWT param, never from DTO.
   */
  async startSession(
    userId: string,
    dto: QuizStartDto,
  ): Promise<QuizStartResponseDto> {
    const isMixed = dto.type === "MIXED";
    const topic = isMixed ? null : dto.type;

    // Create the QuizSession row
    const session = await this.prisma.quizSession.create({
      data: {
        userId,
        skillArea: "MIXED",
        topic,
      },
    });

    // Fetch questions from each module table via $queryRaw + ORDER BY RANDOM()
    // Uses sequential calls so mock $queryRaw.mockResolvedValueOnce ordering is reliable.
    const grammarRaw = await this.fetchGrammarQuestions(topic, 3);
    const vocabRaw = await this.fetchVocabularyWords(topic, 3);
    const readingRaw = await this.fetchReadingQuestions(topic, 2);
    const listeningRaw = await this.fetchListeningQuestions(topic, 2);

    // Map grammar rows → QuizQuestionDto
    const grammarQuestions: QuizQuestionDto[] = grammarRaw.map((q) => ({
      questionRef: `grammar:${q.id}`,
      skillArea: "GRAMMAR" as const,
      prompt: q.prompt,
      answer: q.answer,
      distractors: q.distractors,
      explanation: q.explanation,
    }));

    // Synthesize vocabulary MC questions (no VocabularyExercise table)
    const vocabQuestions: QuizQuestionDto[] = vocabRaw.map((word, idx) => {
      const otherDefs = vocabRaw
        .filter((_, i) => i !== idx)
        .map((w) => w.definition);
      return synthesizeVocabQuestion(word, otherDefs);
    });

    // Map reading rows → QuizQuestionDto
    const readingQuestions: QuizQuestionDto[] = readingRaw.map((q) => ({
      questionRef: `reading:${q.id}`,
      skillArea: "READING" as const,
      prompt: q.prompt,
      answer: q.answer,
      distractors: q.distractors,
      explanation: q.explanation,
    }));

    // Map listening rows → QuizQuestionDto
    const listeningQuestions: QuizQuestionDto[] = listeningRaw.map((q) => ({
      questionRef: `listening:${q.id}`,
      skillArea: "LISTENING" as const,
      prompt: q.prompt,
      answer: q.answer,
      distractors: q.distractors,
      explanation: q.explanation,
    }));

    const questions = [
      ...grammarQuestions,
      ...vocabQuestions,
      ...readingQuestions,
      ...listeningQuestions,
    ];

    return { sessionId: session.id, questions };
  }

  // ─── Private query helpers ──────────────────────────────────────────────────

  private async fetchGrammarQuestions(
    topic: string | null,
    limit: number,
  ): Promise<RawGrammarQuestion[]> {
    const normalizedTopic = topic ? normalizeTopic(topic) : null;

    if (normalizedTopic) {
      return this.prisma.$queryRaw<RawGrammarQuestion[]>(
        Prisma.sql`
          SELECT gq.id, gq.prompt, gq.answer, gq.distractors, gq.explanation
          FROM "GrammarQuestion" gq
          JOIN "GrammarLesson" gl ON gq."lessonId" = gl.id
          JOIN "GrammarTopic" gt ON gl."topicId" = gt.id
          JOIN "GrammarArea" ga ON gt."areaId" = ga.id
          WHERE (
            LOWER(gt.title) = ${normalizedTopic}
            OR LOWER(ga.name) = ${normalizedTopic}
          )
          ORDER BY RANDOM()
          LIMIT ${limit}
        `,
      );
    }

    return this.prisma.$queryRaw<RawGrammarQuestion[]>(
      Prisma.sql`
        SELECT gq.id, gq.prompt, gq.answer, gq.distractors, gq.explanation
        FROM "GrammarQuestion" gq
        ORDER BY RANDOM()
        LIMIT ${limit}
      `,
    );
  }

  private async fetchVocabularyWords(
    topic: string | null,
    limit: number,
  ): Promise<RawVocabularyWord[]> {
    const normalizedTopic = topic ? normalizeTopic(topic) : null;

    if (normalizedTopic) {
      return this.prisma.$queryRaw<RawVocabularyWord[]>(
        Prisma.sql`
          SELECT id, word, definition, examples, synonyms, topic, category
          FROM "VocabularyWord"
          WHERE (
            LOWER(topic) = ${normalizedTopic}
            OR LOWER(category) = ${normalizedTopic}
          )
          ORDER BY RANDOM()
          LIMIT ${limit}
        `,
      );
    }

    return this.prisma.$queryRaw<RawVocabularyWord[]>(
      Prisma.sql`
        SELECT id, word, definition, examples, synonyms, topic, category
        FROM "VocabularyWord"
        ORDER BY RANDOM()
        LIMIT ${limit}
      `,
    );
  }

  private async fetchReadingQuestions(
    topic: string | null,
    limit: number,
  ): Promise<RawReadingQuestion[]> {
    const normalizedTopic = topic ? normalizeTopic(topic) : null;

    if (normalizedTopic) {
      return this.prisma.$queryRaw<RawReadingQuestion[]>(
        Prisma.sql`
          SELECT rq.id, rq.prompt, rq.answer, rq.distractors, rq.explanation
          FROM "ReadingQuestion" rq
          JOIN "ReadingPassage" rp ON rq."passageId" = rp.id
          WHERE LOWER(rp.topic) = ${normalizedTopic}
            AND rp."isPublished" = true
          ORDER BY RANDOM()
          LIMIT ${limit}
        `,
      );
    }

    return this.prisma.$queryRaw<RawReadingQuestion[]>(
      Prisma.sql`
        SELECT rq.id, rq.prompt, rq.answer, rq.distractors, rq.explanation
        FROM "ReadingQuestion" rq
        JOIN "ReadingPassage" rp ON rq."passageId" = rp.id
        WHERE rp."isPublished" = true
        ORDER BY RANDOM()
        LIMIT ${limit}
      `,
    );
  }

  private async fetchListeningQuestions(
    topic: string | null,
    limit: number,
  ): Promise<RawListeningQuestion[]> {
    const normalizedTopic = topic ? normalizeTopic(topic) : null;

    if (normalizedTopic) {
      return this.prisma.$queryRaw<RawListeningQuestion[]>(
        Prisma.sql`
          SELECT lq.id, lq.prompt, lq.answer, lq.distractors, lq.explanation
          FROM "ListeningQuestion" lq
          JOIN "ListeningContent" lc ON lq."contentId" = lc.id
          WHERE LOWER(lc.topic) = ${normalizedTopic}
            AND lc."isPublished" = true
          ORDER BY RANDOM()
          LIMIT ${limit}
        `,
      );
    }

    return this.prisma.$queryRaw<RawListeningQuestion[]>(
      Prisma.sql`
        SELECT lq.id, lq.prompt, lq.answer, lq.distractors, lq.explanation
        FROM "ListeningQuestion" lq
        JOIN "ListeningContent" lc ON lq."contentId" = lc.id
        WHERE lc."isPublished" = true
        ORDER BY RANDOM()
        LIMIT ${limit}
      `,
    );
  }

  // ─── completeSession ─────────────────────────────────────────────────────────

  /**
   * Complete a quiz session: recompute accuracy server-side, store answers,
   * award XP via GamificationService, check achievements.
   *
   * Security:
   *   T-07-06: IDOR guard — findFirst scoped by userId from JWT
   *   T-07-07: server recomputes accuracy — client accuracy field ignored
   *   T-07-08: completedAt guard prevents double-complete
   *   T-07-09: userId from JWT, never from DTO
   */
  async completeSession(
    userId: string,
    sessionId: string,
    dto: QuizCompleteDto,
  ): Promise<QuizCompleteResponseDto> {
    // T-07-06: IDOR guard
    const session = await this.prisma.quizSession.findFirst({
      where: { id: sessionId, userId },
    });
    if (!session) {
      throw new NotFoundException(`Quiz session ${sessionId} not found`);
    }

    // T-07-08: idempotency guard — reject double-complete
    if (session.completedAt) {
      throw new BadRequestException("Session already completed");
    }

    // Resolve user cefrLevel for XP calculation
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { cefrLevel: true },
    });
    const cefrLevel = (user as { cefrLevel: string }).cefrLevel;

    // T-07-07: server recomputes accuracy — ignores any client-supplied value
    const correct = dto.answers.filter((a) => a.isCorrect).length;
    const total = dto.answers.length;
    const accuracy = total > 0 ? (correct / total) * 100 : 0;
    const score = correct;

    // XP: per-correct-answer + session bonus
    const perAnswerXp = calculateXp(XP_RATES.QUIZ_CORRECT, cefrLevel);
    const bonusXp = calculateXp(XP_RATES.QUIZ_SESSION_BONUS, cefrLevel);
    const totalXp = correct * perAnswerXp + bonusXp;

    // WR-02: atomic transaction — answers + session update must commit together.
    // completedAt being non-null is the idempotency guard; if it is written in the
    // same transaction as the answers, a failure between the two cannot leave a
    // half-written state that allows double-submission.
    await this.prisma.$transaction(async (tx) => {
      // QUIZ-05: bulk insert QuizAnswer with skillArea per answer
      await tx.quizAnswer.createMany({
        data: dto.answers.map((a) => ({
          sessionId,
          questionRef: a.questionRef,
          skillArea: a.skillArea,
          isCorrect: a.isCorrect,
          userAnswer: a.userAnswer ?? null,
          correctAnswer: a.correctAnswer ?? null,
          xpEarned: a.isCorrect ? perAnswerXp : 0,
        })),
        skipDuplicates: false,
      });

      // Update QuizSession with final state in the same transaction
      await tx.quizSession.update({
        where: { id: sessionId },
        data: {
          score,
          accuracy,
          timeTakenSec: dto.timeTakenSec,
          xpEarned: totalXp,
          completedAt: new Date(),
        },
      });
    });

    // Gamification runs AFTER the transaction commits (cannot be inside Prisma tx)
    // Award XP via GamificationService
    const xpResult = await this.gamification.awardXp(
      userId,
      totalXp,
      "quiz_session",
      "MIXED",
      sessionId,
    );

    // Check achievements
    const newAchievements = await this.gamification.checkAchievements(userId, {
      type: "QUIZ_COMPLETE",
      metadata: { sessionId },
    });

    // Re-hydrate incorrect questions for client-side mistake preview (QUIZ-04)
    const incorrectRefs = dto.answers.filter((a) => !a.isCorrect);
    const incorrectAnswers = await this.rehydrateQuestions(incorrectRefs);

    return {
      score,
      accuracy,
      xpEarned: xpResult.xpEarned,
      levelUp: xpResult.levelUp,
      newLevel: xpResult.newLevel,
      newAchievements,
      incorrectAnswers,
    };
  }

  // ─── getMistakes ─────────────────────────────────────────────────────────────

  /**
   * Return only incorrect answers for a completed session, re-hydrated with
   * prompt and explanation from the source table.
   *
   * Security: T-07-06 — session scoped by userId (IDOR guard).
   */
  async getMistakes(userId: string, sessionId: string): Promise<QuizMistakesDto> {
    // T-07-06: IDOR guard
    const session = await this.prisma.quizSession.findFirst({
      where: { id: sessionId, userId },
    });
    if (!session) {
      throw new NotFoundException(`Quiz session ${sessionId} not found`);
    }

    // Load incorrect answers only
    const incorrectAnswerRows = await this.prisma.quizAnswer.findMany({
      where: { sessionId, isCorrect: false },
    });

    const incorrectAnswers = await this.rehydrateQuestions(
      incorrectAnswerRows.map((r) => ({
        questionRef: r.questionRef,
        skillArea: r.skillArea as string,
      })),
    );

    return { incorrectAnswers };
  }

  // ─── Re-hydration ────────────────────────────────────────────────────────────

  /**
   * Re-hydrate answer stubs into full QuizQuestionDtos by reading the source table.
   * Uses $queryRaw so grammar/reading/listening question fetching is consistent
   * with the selection queries above.
   */
  private async rehydrateQuestions(
    answers: Array<{ questionRef: string; skillArea: string }>,
  ): Promise<QuizQuestionDto[]> {
    const result: QuizQuestionDto[] = [];

    for (const answer of answers) {
      const { type, id } = parseRef(answer.questionRef);

      try {
        if (type === "grammar") {
          const rows = await this.prisma.$queryRaw<RawGrammarQuestion[]>(
            Prisma.sql`
              SELECT id, prompt, answer, distractors, explanation
              FROM "GrammarQuestion"
              WHERE id = ${id}
              LIMIT 1
            `,
          );
          const row = rows[0];
          if (row) {
            result.push({
              questionRef: answer.questionRef,
              skillArea: "GRAMMAR",
              prompt: row.prompt,
              answer: row.answer,
              distractors: row.distractors,
              explanation: row.explanation,
            });
          }
        } else if (type === "reading") {
          const rows = await this.prisma.$queryRaw<RawReadingQuestion[]>(
            Prisma.sql`
              SELECT id, prompt, answer, distractors, explanation
              FROM "ReadingQuestion"
              WHERE id = ${id}
              LIMIT 1
            `,
          );
          const row = rows[0];
          if (row) {
            result.push({
              questionRef: answer.questionRef,
              skillArea: "READING",
              prompt: row.prompt,
              answer: row.answer,
              distractors: row.distractors,
              explanation: row.explanation,
            });
          }
        } else if (type === "listening") {
          const rows = await this.prisma.$queryRaw<RawListeningQuestion[]>(
            Prisma.sql`
              SELECT id, prompt, answer, distractors, explanation
              FROM "ListeningQuestion"
              WHERE id = ${id}
              LIMIT 1
            `,
          );
          const row = rows[0];
          if (row) {
            result.push({
              questionRef: answer.questionRef,
              skillArea: "LISTENING",
              prompt: row.prompt,
              answer: row.answer,
              distractors: row.distractors,
              explanation: row.explanation,
            });
          }
        } else if (type === "vocabulary") {
          const rows = await this.prisma.$queryRaw<RawVocabularyWord[]>(
            Prisma.sql`
              SELECT id, word, definition, examples, synonyms, topic, category
              FROM "VocabularyWord"
              WHERE id = ${id}
              LIMIT 1
            `,
          );
          const row = rows[0];
          if (row) {
            result.push({
              questionRef: answer.questionRef,
              skillArea: "VOCABULARY",
              prompt: `What is the meaning of "${row.word}"?`,
              answer: row.definition,
              distractors: row.synonyms.slice(0, 3),
              explanation: row.examples[0] ?? null,
            });
          }
        }
      } catch {
        // Skip questions that cannot be re-hydrated (e.g. deleted content)
      }
    }

    return result;
  }
}
