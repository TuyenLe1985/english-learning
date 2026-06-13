/**
 * GrammarService unit tests — Wave 1 RED scaffolds (Plan 04-01)
 *
 * GRAM-01: getAreas() returns areas with topicCount
 * GRAM-01: getLessonDetail(slug) returns lesson with questions / throws NotFoundException
 * GRAM-04: completeSession() stores GrammarAttempts + upserts GrammarProgress with masteryPct
 * GRAM-06: getWeakQuestions() returns questions whose most-recent attempt is incorrect
 *
 * Tests use direct instantiation with a mocked PrismaService (no NestJS DI).
 * Pattern mirrors apps/api/src/vocabulary/vocabulary.service.spec.ts.
 *
 * These tests FAIL intentionally — GrammarService does not yet exist.
 * Plans 02/03 turn these green.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { GrammarService } from './grammar.service';
import type { PrismaService } from '../prisma/prisma.service';

// ─── Mock PrismaService ───────────────────────────────────────────────────────

const mockAreaFindMany = vi.fn();
const mockLessonFindUnique = vi.fn();
const mockAttemptCreateMany = vi.fn();
const mockProgressUpsert = vi.fn();
const mockAttemptFindMany = vi.fn();
const mockProgressFindUnique = vi.fn();

const mockPrisma = {
  grammarArea: {
    findMany: mockAreaFindMany,
  },
  grammarLesson: {
    findUnique: mockLessonFindUnique,
  },
  grammarAttempt: {
    createMany: mockAttemptCreateMany,
    findMany: mockAttemptFindMany,
  },
  grammarProgress: {
    upsert: mockProgressUpsert,
    findUnique: mockProgressFindUnique,
  },
} as unknown as PrismaService;

// ─── Sample fixtures ──────────────────────────────────────────────────────────

const sampleArea = {
  id: 'area-001',
  slug: 'verb-tenses',
  name: 'Verb Tenses',
  description: 'Master present, past, and future tense forms',
  sortOrder: 1,
  topics: [
    { id: 'topic-001', slug: 'present-perfect', title: 'Present Perfect' },
    { id: 'topic-002', slug: 'past-simple', title: 'Past Simple' },
  ],
};

const sampleQuestion = {
  id: 'q-001',
  exerciseType: 'MULTIPLE_CHOICE',
  prompt: 'She ___ to Paris before.',
  answer: 'has been',
  distractors: ['is been', 'was been', 'have been'],
  explanation: "Use 'has been' for third-person singular.",
  difficulty: 1,
  xpReward: 10,
};

const sampleLesson = {
  id: 'lesson-001',
  slug: 'present-perfect-formation',
  title: 'Present Perfect: Formation',
  explanation: 'The present perfect is formed with have/has + past participle.',
  examples: ['I have visited London.', 'She has never eaten sushi.'],
  sortOrder: 1,
  topicId: 'topic-001',
  questions: [sampleQuestion],
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('GrammarService', () => {
  let service: GrammarService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new GrammarService(mockPrisma);
  });

  // ---------------------------------------------------------------------------
  // GRAM-01 — GET /api/grammar/areas
  // ---------------------------------------------------------------------------
  describe('getAreas()', () => {
    it('returns areas mapped with topicCount', async () => {
      mockAreaFindMany.mockResolvedValue([sampleArea]);

      const result = await service.getAreas();

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('topicCount', 2);
    });

    it('each area has slug, name, id, sortOrder fields', async () => {
      mockAreaFindMany.mockResolvedValue([sampleArea]);

      const result = await service.getAreas();

      expect(result[0]).toMatchObject({
        id: 'area-001',
        slug: 'verb-tenses',
        name: 'Verb Tenses',
        sortOrder: 1,
      });
    });

    it('returns empty array when no areas exist', async () => {
      mockAreaFindMany.mockResolvedValue([]);

      const result = await service.getAreas();

      expect(result).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // GRAM-01 — GET /api/grammar/lessons/:slug
  // ---------------------------------------------------------------------------
  describe('getLessonDetail(slug)', () => {
    it('returns lesson with questions array', async () => {
      mockLessonFindUnique.mockResolvedValue(sampleLesson);

      const result = await service.getLessonDetail('present-perfect-formation');

      expect(result).toHaveProperty('questions');
      expect(result.questions).toHaveLength(1);
    });

    it('returns lesson with all required fields', async () => {
      mockLessonFindUnique.mockResolvedValue(sampleLesson);

      const result = await service.getLessonDetail('present-perfect-formation');

      expect(result).toMatchObject({
        id: 'lesson-001',
        slug: 'present-perfect-formation',
        explanation: expect.any(String),
        examples: expect.any(Array),
      });
    });

    it('throws NotFoundException when slug does not exist', async () => {
      mockLessonFindUnique.mockResolvedValue(null);

      await expect(
        service.getLessonDetail('nonexistent-slug'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ---------------------------------------------------------------------------
  // GRAM-04 — POST /api/grammar/sessions/complete
  // ---------------------------------------------------------------------------
  describe('completeSession()', () => {
    const sessionPayload = {
      lessonId: 'lesson-001',
      attempts: [
        { questionId: 'q-001', isCorrect: true, userAnswer: 'has been' },
        { questionId: 'q-002', isCorrect: false, userAnswer: 'wrong' },
      ],
      timeTakenMs: 30000,
    };

    it('calls grammarAttempt.createMany with all attempts', async () => {
      mockAttemptCreateMany.mockResolvedValue({ count: 2 });
      mockProgressFindUnique.mockResolvedValue(null);
      mockProgressUpsert.mockResolvedValue({
        masteryPct: 0.5,
        attempts: 2,
        correct: 1,
      });
      mockLessonFindUnique.mockResolvedValue({ ...sampleLesson, topicId: 'topic-001' });

      await service.completeSession('user-001', sessionPayload);

      expect(mockAttemptCreateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({ questionId: 'q-001', isCorrect: true }),
            expect.objectContaining({ questionId: 'q-002', isCorrect: false }),
          ]),
        }),
      );
    });

    it('upserts grammarProgress with masteryPct = newCorrect / newAttempts', async () => {
      mockAttemptCreateMany.mockResolvedValue({ count: 2 });
      mockLessonFindUnique.mockResolvedValue({ ...sampleLesson, topicId: 'topic-001' });
      mockProgressFindUnique.mockResolvedValue({ attempts: 0, correct: 0, masteryPct: 0 });
      mockProgressUpsert.mockResolvedValue({ masteryPct: 0.5, attempts: 2, correct: 1 });

      const result = await service.completeSession('user-001', sessionPayload);

      expect(mockProgressUpsert).toHaveBeenCalled();
      expect(result).toHaveProperty('masteryPct');
    });

    it('returns score and total from session attempts', async () => {
      mockAttemptCreateMany.mockResolvedValue({ count: 2 });
      mockLessonFindUnique.mockResolvedValue({ ...sampleLesson, topicId: 'topic-001' });
      mockProgressFindUnique.mockResolvedValue({ attempts: 0, correct: 0, masteryPct: 0 });
      mockProgressUpsert.mockResolvedValue({ masteryPct: 0.5, attempts: 2, correct: 1 });

      const result = await service.completeSession('user-001', sessionPayload);

      expect(result).toMatchObject({
        score: 1,
        total: 2,
      });
    });
  });

  // ---------------------------------------------------------------------------
  // GRAM-06 — GET /api/grammar/topics/:topicId/weak-questions
  // ---------------------------------------------------------------------------
  describe('getWeakQuestions()', () => {
    it('returns only questions whose most-recent attempt isCorrect=false', async () => {
      mockAttemptFindMany.mockResolvedValue([
        {
          questionId: 'q-002',
          isCorrect: false,
          attemptedAt: new Date('2026-06-01'),
          question: { ...sampleQuestion, id: 'q-002' },
        },
        {
          questionId: 'q-001',
          isCorrect: true,
          attemptedAt: new Date('2026-06-01'),
          question: sampleQuestion,
        },
      ]);

      const result = await service.getWeakQuestions('user-001', 'topic-001');

      // Only the incorrect question should appear
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('id', 'q-002');
    });

    it('returns empty array when no incorrect attempts', async () => {
      mockAttemptFindMany.mockResolvedValue([
        {
          questionId: 'q-001',
          isCorrect: true,
          attemptedAt: new Date(),
          question: sampleQuestion,
        },
      ]);

      const result = await service.getWeakQuestions('user-001', 'topic-001');

      expect(result).toEqual([]);
    });
  });
});
