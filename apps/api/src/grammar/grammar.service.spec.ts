/**
 * GrammarService unit tests — Wave 1 RED scaffolds (Plan 04-01)
 * Updated in Plan 04 to add gamification wiring assertions.
 *
 * GRAM-01: getAreas() returns areas with topicCount
 * GRAM-01: getLessonDetail(slug) returns lesson with questions / throws NotFoundException
 * GRAM-04: completeSession() stores GrammarAttempts + upserts GrammarProgress with masteryPct
 * GRAM-04+GAME-01: completeSession() calls gamification.awardXp with skillArea GRAMMAR
 * GRAM-06: getWeakQuestions() returns questions whose most-recent attempt is incorrect
 *
 * Tests use direct instantiation with a mocked PrismaService (no NestJS DI).
 * Pattern mirrors apps/api/src/vocabulary/vocabulary.service.spec.ts.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { GrammarService } from './grammar.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { GamificationService } from '../gamification/gamification.service';
import type { AdaptiveService } from '../adaptive/adaptive.service';

// ─── Mock PrismaService ───────────────────────────────────────────────────────

const mockAreaFindMany = vi.fn();
const mockLessonFindUnique = vi.fn();
const mockAttemptCreateMany = vi.fn();
const mockProgressUpsert = vi.fn();
const mockAttemptFindMany = vi.fn();
const mockProgressFindUnique = vi.fn();
const mockUserFindUniqueOrThrow = vi.fn();

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
  user: {
    findUniqueOrThrow: mockUserFindUniqueOrThrow,
  },
} as unknown as PrismaService;

// ─── Mock GamificationService ─────────────────────────────────────────────────

const mockAwardXp = vi.fn();
const mockCheckAchievements = vi.fn();

const mockGamification = {
  awardXp: mockAwardXp,
  checkAchievements: mockCheckAchievements,
} as unknown as GamificationService;

// ─── Mock AdaptiveService ─────────────────────────────────────────────────────

const mockUpdateSkillScore = vi.fn().mockResolvedValue(undefined);

const mockAdaptive = {
  updateSkillScore: mockUpdateSkillScore,
} as unknown as AdaptiveService;

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
    service = new GrammarService(mockPrisma, mockGamification, mockAdaptive);
    // Default gamification mocks
    mockAwardXp.mockResolvedValue({ xpEarned: 20, oldLevel: 1, newLevel: 1, levelUp: false });
    mockCheckAchievements.mockResolvedValue([]);
    mockUserFindUniqueOrThrow.mockResolvedValue({ id: 'user-001', cefrLevel: 'B1' });
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
        masteryPct: 50,
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

    it('upserts grammarProgress with masteryPct on 0-100 scale', async () => {
      mockAttemptCreateMany.mockResolvedValue({ count: 2 });
      mockLessonFindUnique.mockResolvedValue({ ...sampleLesson, topicId: 'topic-001' });
      mockProgressFindUnique.mockResolvedValue({ attempts: 0, correct: 0, masteryPct: 0 });
      mockProgressUpsert.mockResolvedValue({ masteryPct: 50, attempts: 2, correct: 1 });

      const result = await service.completeSession('user-001', sessionPayload);

      expect(mockProgressUpsert).toHaveBeenCalled();
      expect(result).toHaveProperty('masteryPct');
    });

    it('returns score and total from session attempts', async () => {
      mockAttemptCreateMany.mockResolvedValue({ count: 2 });
      mockLessonFindUnique.mockResolvedValue({ ...sampleLesson, topicId: 'topic-001' });
      mockProgressFindUnique.mockResolvedValue({ attempts: 0, correct: 0, masteryPct: 0 });
      mockProgressUpsert.mockResolvedValue({ masteryPct: 50, attempts: 2, correct: 1 });

      const result = await service.completeSession('user-001', sessionPayload);

      expect(result).toMatchObject({
        score: 1,
        total: 2,
      });
    });

    it('returns masteryPct === 80 for 8/10 correct with no prior progress', async () => {
      const payload8of10 = {
        lessonId: 'lesson-001',
        attempts: [
          ...Array.from({ length: 8 }, (_, i) => ({
            questionId: `q-00${i + 1}`,
            isCorrect: true,
            userAnswer: 'correct',
          })),
          ...Array.from({ length: 2 }, (_, i) => ({
            questionId: `q-00${i + 9}`,
            isCorrect: false,
            userAnswer: 'wrong',
          })),
        ],
        timeTakenMs: 60000,
      };
      mockAttemptCreateMany.mockResolvedValue({ count: 10 });
      mockLessonFindUnique.mockResolvedValue({ ...sampleLesson, topicId: 'topic-001' });
      mockProgressFindUnique.mockResolvedValue(null); // no prior progress
      mockProgressUpsert.mockResolvedValue({ masteryPct: 80, attempts: 10, correct: 8 });

      const result = await service.completeSession('user-001', payload8of10);

      expect(result.masteryPct).toBe(80);
      // Verify the upsert was called with masteryPct === 80 (0-100 scale)
      expect(mockProgressUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ masteryPct: 80 }),
          update: expect.objectContaining({ masteryPct: 80 }),
        }),
      );
    });

    it('returns masteryPct === 0 when 0 attempts (divide-by-zero guard)', async () => {
      const emptyPayload = {
        lessonId: 'lesson-001',
        attempts: [],
        timeTakenMs: 0,
      };
      mockAttemptCreateMany.mockResolvedValue({ count: 0 });
      mockLessonFindUnique.mockResolvedValue({ ...sampleLesson, topicId: 'topic-001' });
      mockProgressFindUnique.mockResolvedValue(null);
      mockProgressUpsert.mockResolvedValue({ masteryPct: 0, attempts: 0, correct: 0 });

      const result = await service.completeSession('user-001', emptyPayload);

      expect(result.masteryPct).toBe(0);
      expect(Number.isNaN(result.masteryPct)).toBe(false);
    });

    it('accumulates masteryPct across sessions (5/10 then 3/10 → 40)', async () => {
      // Simulate second session: prior progress has 5/10, new session has 3/10
      const payload3of10 = {
        lessonId: 'lesson-001',
        attempts: [
          ...Array.from({ length: 3 }, (_, i) => ({
            questionId: `q-00${i + 1}`,
            isCorrect: true,
            userAnswer: 'correct',
          })),
          ...Array.from({ length: 7 }, (_, i) => ({
            questionId: `q-00${i + 4}`,
            isCorrect: false,
            userAnswer: 'wrong',
          })),
        ],
        timeTakenMs: 45000,
      };
      mockAttemptCreateMany.mockResolvedValue({ count: 10 });
      mockLessonFindUnique.mockResolvedValue({ ...sampleLesson, topicId: 'topic-001' });
      // Prior progress: 5 correct of 10 attempts
      mockProgressFindUnique.mockResolvedValue({ attempts: 10, correct: 5, masteryPct: 50 });
      mockProgressUpsert.mockResolvedValue({ masteryPct: 40, attempts: 20, correct: 8 });

      const result = await service.completeSession('user-001', payload3of10);

      // 5 + 3 = 8 correct / 10 + 10 = 20 total = 40%
      expect(result.masteryPct).toBe(40);
      expect(mockProgressUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ masteryPct: 40, attempts: 20, correct: 8 }),
          update: expect.objectContaining({ masteryPct: 40, attempts: 20, correct: 8 }),
        }),
      );
    });

    // ─── Gamification wiring assertions (07-04 RED) ────────────────────────────

    it('calls gamification.awardXp with skillArea GRAMMAR after session completes', async () => {
      mockAttemptCreateMany.mockResolvedValue({ count: 2 });
      mockLessonFindUnique.mockResolvedValue({ ...sampleLesson, topicId: 'topic-001' });
      mockProgressFindUnique.mockResolvedValue(null);
      mockProgressUpsert.mockResolvedValue({ masteryPct: 50, attempts: 2, correct: 1 });

      await service.completeSession('user-001', sessionPayload);

      expect(mockAwardXp).toHaveBeenCalledWith(
        'user-001',
        expect.any(Number),
        'grammar_lesson',
        'GRAMMAR',
        'lesson-001',
      );
    });

    it('calls gamification.checkAchievements after awardXp', async () => {
      mockAttemptCreateMany.mockResolvedValue({ count: 2 });
      mockLessonFindUnique.mockResolvedValue({ ...sampleLesson, topicId: 'topic-001' });
      mockProgressFindUnique.mockResolvedValue(null);
      mockProgressUpsert.mockResolvedValue({ masteryPct: 50, attempts: 2, correct: 1 });

      await service.completeSession('user-001', sessionPayload);

      expect(mockCheckAchievements).toHaveBeenCalledWith(
        'user-001',
        expect.objectContaining({ type: 'LESSON_COMPLETE' }),
      );
    });

    it('returns xpEarned and newAchievements in the result', async () => {
      mockAttemptCreateMany.mockResolvedValue({ count: 2 });
      mockLessonFindUnique.mockResolvedValue({ ...sampleLesson, topicId: 'topic-001' });
      mockProgressFindUnique.mockResolvedValue(null);
      mockProgressUpsert.mockResolvedValue({ masteryPct: 50, attempts: 2, correct: 1 });
      mockAwardXp.mockResolvedValue({ xpEarned: 20, oldLevel: 1, newLevel: 1, levelUp: false });
      mockCheckAchievements.mockResolvedValue([{ slug: 'first-lesson' }]);

      const result = await service.completeSession('user-001', sessionPayload);

      expect(result).toHaveProperty('xpEarned', 20);
      expect(result).toHaveProperty('newAchievements');
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
