/**
 * GrammarService — NestJS service for grammar browsing + session management.
 *
 * GRAM-01: getAreas() — returns all grammar areas with topicCount
 * GRAM-01: getLessonDetail(slug) — full lesson with questions; NotFoundException on missing slug
 * GRAM-04: completeSession() — stores GrammarAttempt rows + upserts GrammarProgress with masteryPct
 * GRAM-06: getWeakQuestions() — questions whose most-recent attempt was incorrect
 *
 * Security (T-04-03, T-04-04, T-04-05):
 *   - All endpoints protected by JwtAuthGuard (enforced in controller)
 *   - userId always sourced from JWT payload, never request body
 *   - Prisma parameterized queries only
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type {
  GrammarAreaDto,
  GrammarTopicDto,
  GrammarTopicDetailDto,
  GrammarLessonDetailDto,
  GrammarQuestionDto,
  GrammarSessionCompleteDto,
  GrammarSessionResultDto,
} from '@repo/shared';

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class GrammarService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * GRAM-01 — GET /api/grammar/areas
   * Returns all grammar areas ordered by sortOrder, each with topicCount.
   */
  async getAreas(): Promise<GrammarAreaDto[]> {
    const areas = await this.prisma.grammarArea.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { topics: { select: { id: true, slug: true, title: true } } },
    });

    return areas.map((area) => ({
      id: area.id,
      slug: area.slug,
      name: area.name,
      description: area.description ?? null,
      topicCount: area.topics.length,
      sortOrder: area.sortOrder,
    }));
  }

  /**
   * GRAM-01 — GET /api/grammar/areas/:areaSlug/topics
   * Returns topics in a grammar area ordered by sortOrder.
   */
  async getTopicsByArea(areaSlug: string): Promise<GrammarTopicDto[]> {
    const area = await this.prisma.grammarArea.findUnique({
      where: { slug: areaSlug },
      include: {
        topics: {
          orderBy: { sortOrder: 'asc' },
          include: { lessons: { select: { id: true } } },
        },
      },
    });

    if (!area) {
      throw new NotFoundException(`Grammar area ${areaSlug} not found`);
    }

    return area.topics.map((topic) => ({
      id: topic.id,
      slug: topic.slug,
      title: topic.title,
      description: topic.description ?? null,
      cefrLevel: topic.cefrLevel as GrammarTopicDto['cefrLevel'],
      lessonCount: topic.lessons.length,
      masteryPct: null,
      sortOrder: topic.sortOrder,
    }));
  }

  /**
   * GRAM-01 — GET /api/grammar/topics/:topicSlug/lessons
   * Returns topic detail + lesson list with questionCount and masteryPct for the user.
   */
  async getLessonsByTopic(
    topicSlug: string,
    userId: string,
  ): Promise<GrammarTopicDetailDto> {
    const topic = await this.prisma.grammarTopic.findUnique({
      where: { slug: topicSlug },
      include: {
        lessons: {
          orderBy: { sortOrder: 'asc' },
          include: { questions: { select: { id: true } } },
        },
        progress: {
          where: { userId },
          select: { masteryPct: true },
        },
      },
    });

    if (!topic) {
      throw new NotFoundException(`Grammar topic ${topicSlug} not found`);
    }

    const masteryPct =
      topic.progress.length > 0 ? (topic.progress[0]?.masteryPct ?? null) : null;

    return {
      topic: {
        id: topic.id,
        slug: topic.slug,
        title: topic.title,
        description: topic.description ?? null,
        cefrLevel: topic.cefrLevel as GrammarTopicDto['cefrLevel'],
        lessonCount: topic.lessons.length,
        masteryPct,
        sortOrder: topic.sortOrder,
      },
      lessons: topic.lessons.map((lesson) => ({
        id: lesson.id,
        slug: lesson.slug,
        title: lesson.title,
        explanation: lesson.explanation,
        examples: lesson.examples as string[],
        sortOrder: lesson.sortOrder,
        questionCount: lesson.questions.length,
      })),
    };
  }

  /**
   * GRAM-06 — GET /api/grammar/topics/:topicSlug/weak-questions (slug variant)
   * Resolves topicSlug to topicId then delegates to getWeakQuestions().
   */
  async getWeakQuestionsBySlug(
    userId: string,
    topicSlug: string,
  ): Promise<GrammarQuestionDto[]> {
    const topic = await this.prisma.grammarTopic.findUnique({
      where: { slug: topicSlug },
      select: { id: true },
    });

    if (!topic) {
      throw new NotFoundException(`Grammar topic ${topicSlug} not found`);
    }

    return this.getWeakQuestions(userId, topic.id);
  }

  /**
   * GRAM-01 — GET /api/grammar/lessons/:lessonSlug
   * Returns full lesson detail including questions.
   * Throws NotFoundException when the slug does not exist (null return from findUnique).
   */
  async getLessonDetail(lessonSlug: string): Promise<GrammarLessonDetailDto> {
    const lesson = await this.prisma.grammarLesson.findUnique({
      where: { slug: lessonSlug },
      include: { questions: true },
    });

    if (!lesson) {
      throw new NotFoundException(`Lesson ${lessonSlug} not found`);
    }

    return {
      id: lesson.id,
      slug: lesson.slug,
      title: lesson.title,
      explanation: lesson.explanation,
      examples: lesson.examples as string[],
      sortOrder: lesson.sortOrder,
      questions: lesson.questions.map((q) => ({
        id: q.id,
        exerciseType: q.exerciseType as GrammarQuestionDto['exerciseType'],
        prompt: q.prompt,
        answer: q.answer,
        distractors: q.distractors as string[],
        explanation: q.explanation ?? null,
        difficulty: q.difficulty,
        xpReward: q.xpReward,
      })),
    };
  }

  /**
   * GRAM-04 — POST /api/grammar/sessions/complete
   * Records GrammarAttempt rows (one per question) and upserts GrammarProgress.
   * masteryPct = (existingCorrect + newCorrect) / (existingAttempts + newAttempts)
   *
   * Security (T-04-03): userId comes from JWT, never from body.
   * Security (T-04-05): only questionId, isCorrect, userAnswer accepted from client.
   */
  async completeSession(
    userId: string,
    dto: GrammarSessionCompleteDto,
  ): Promise<GrammarSessionResultDto> {
    const { lessonId, attempts } = dto;

    // 1. Resolve topicId from lessonId (needed for GrammarProgress upsert key)
    const lesson = await this.prisma.grammarLesson.findUnique({
      where: { id: lessonId },
    });

    if (!lesson) {
      throw new NotFoundException(`Lesson ${lessonId} not found`);
    }

    const topicId = lesson.topicId;

    // 2. Bulk-insert GrammarAttempt rows — skipDuplicates: false (multiple attempts allowed)
    await this.prisma.grammarAttempt.createMany({
      data: attempts.map((a) => ({
        questionId: a.questionId,
        userId,
        isCorrect: a.isCorrect,
        userAnswer: a.userAnswer ?? null,
      })),
      skipDuplicates: false,
    });

    // 3. Calculate score for this session
    const correctCount = attempts.filter((a) => a.isCorrect).length;
    const totalCount = attempts.length;

    // 4. Read existing GrammarProgress to accumulate totals
    const existing = await this.prisma.grammarProgress.findUnique({
      where: { userId_topicId: { userId, topicId } },
    });

    const newAttempts = (existing?.attempts ?? 0) + totalCount;
    const newCorrect = (existing?.correct ?? 0) + correctCount;
    const newMasteryPct = newAttempts > 0 ? newCorrect / newAttempts : 0;

    // 5. Upsert GrammarProgress — unique on userId_topicId (Pitfall 5: use upsert, not create)
    await this.prisma.grammarProgress.upsert({
      where: { userId_topicId: { userId, topicId } },
      create: {
        userId,
        topicId,
        attempts: newAttempts,
        correct: newCorrect,
        masteryPct: newMasteryPct,
        lastAttemptAt: new Date(),
      },
      update: {
        attempts: newAttempts,
        correct: newCorrect,
        masteryPct: newMasteryPct,
        lastAttemptAt: new Date(),
      },
    });

    return {
      score: correctCount,
      total: totalCount,
      masteryPct: newMasteryPct,
    };
  }

  /**
   * GRAM-06 — GET /api/grammar/topics/:topicId/weak-questions
   * Returns GrammarQuestionDto[] for questions whose most-recent attempt was incorrect.
   * Deduplication is done in JS (most-recent per questionId, sorted by attemptedAt desc).
   *
   * Security (T-04-07): filtered by userId — cross-user attempts never returned.
   *
   * @param userId  — from JWT payload
   * @param topicId — topic ID (may be a slug resolved by controller, or direct ID from tests)
   */
  async getWeakQuestions(
    userId: string,
    topicId: string,
  ): Promise<GrammarQuestionDto[]> {
    // Fetch all attempts for this user in this topic, ordered most-recent first
    const attempts = await this.prisma.grammarAttempt.findMany({
      where: {
        userId,
        question: {
          lesson: {
            topicId,
          },
        },
      },
      include: { question: true },
      orderBy: { attemptedAt: 'desc' },
    });

    // Deduplicate to most-recent attempt per questionId (JS dedup — first seen = most recent)
    const seen = new Set<string>();
    const weakQuestions: GrammarQuestionDto[] = [];

    for (const attempt of attempts) {
      if (!seen.has(attempt.questionId)) {
        seen.add(attempt.questionId);
        if (!attempt.isCorrect) {
          weakQuestions.push({
            id: attempt.question.id,
            exerciseType: attempt.question
              .exerciseType as GrammarQuestionDto['exerciseType'],
            prompt: attempt.question.prompt,
            answer: attempt.question.answer,
            distractors: attempt.question.distractors as string[],
            explanation: attempt.question.explanation ?? null,
            difficulty: attempt.question.difficulty,
            xpReward: attempt.question.xpReward,
          });
        }
      }
    }

    return weakQuestions;
  }
}
