/**
 * ListeningService unit tests — Wave 1 RED scaffolds (Plan 06-01)
 * Updated in Plan 04 to wire gamification assertions.
 *
 * LIST-01: getItems() returns paginated item list with filters
 * LIST-01: getItemById() throws NotFoundException when content not found
 * LIST-07: completeSession() upserts ListeningProgress + calls gamification.awardXp (replaces direct xpEvent.create)
 *
 * Tests use direct instantiation with a mocked PrismaService (no NestJS DI).
 * Pattern mirrors apps/api/src/reading/reading.service.spec.ts.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { ListeningService } from './listening.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { GamificationService } from '../gamification/gamification.service';
import type { AdaptiveService } from '../adaptive/adaptive.service';

// ─── Mock PrismaService ───────────────────────────────────────────────────────

const mockContentFindMany = vi.fn();
const mockContentCount = vi.fn();
const mockContentFindUnique = vi.fn();
const mockProgressUpsert = vi.fn();
const mockProgressFindUnique = vi.fn();
const mockUserFindUniqueOrThrow = vi.fn();

const mockPrisma = {
  listeningContent: {
    findMany: mockContentFindMany,
    count: mockContentCount,
    findUnique: mockContentFindUnique,
  },
  listeningProgress: {
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

const sampleContent = {
  id: 'content-001',
  title: 'Business English: Meetings',
  contentType: 'PODCAST',
  cefrLevel: 'B2',
  cefrConfidence: 0.85,
  topic: 'business',
  durationSec: 240,
  isPublished: true,
  _count: { questions: 8 },
};

const sampleQuestion = {
  id: 'q-001',
  contentId: 'content-001',
  exerciseType: 'MULTIPLE_CHOICE',
  prompt: 'What is the main topic of the conversation?',
  answer: 'Planning a business trip',
  distractors: ['Hiring new staff', 'Budget review', 'Client presentation'],
  explanation: 'The speakers discuss their upcoming business trip.',
  timestampSec: 30,
  xpReward: 15,
  sortOrder: 1,
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ListeningService', () => {
  let service: ListeningService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ListeningService(mockPrisma, mockGamification, mockAdaptive);
    // Default gamification mocks
    mockAwardXp.mockResolvedValue({ xpEarned: 30, oldLevel: 1, newLevel: 1, levelUp: false });
    mockCheckAchievements.mockResolvedValue([]);
    mockUserFindUniqueOrThrow.mockResolvedValue({ id: 'user-001', cefrLevel: 'B2' });
  });

  // ---------------------------------------------------------------------------
  // LIST-01 — GET /api/listening/items
  // ---------------------------------------------------------------------------
  describe('getItems()', () => {
    it('returns paginated object with { items, total, page, limit, totalPages }', async () => {
      mockContentFindMany.mockResolvedValue([sampleContent]);
      mockContentCount.mockResolvedValue(50);

      const result = await service.getItems('user-001', {});

      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('total', 50);
      expect(result).toHaveProperty('page');
      expect(result).toHaveProperty('limit');
      expect(result).toHaveProperty('totalPages');
    });

    it('calculates totalPages from total and limit', async () => {
      mockContentFindMany.mockResolvedValue([]);
      mockContentCount.mockResolvedValue(50);

      const result = await service.getItems('user-001', { limit: 10 });

      expect(result.totalPages).toBe(5); // ceil(50/10) = 5
    });

    it('applies cefrLevel filter to prisma where clause', async () => {
      mockContentFindMany.mockResolvedValue([]);
      mockContentCount.mockResolvedValue(0);

      await service.getItems('user-001', { cefrLevel: 'B2' });

      expect(mockContentFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ cefrLevel: 'B2' }),
        }),
      );
    });

    it('applies topic filter to prisma where clause', async () => {
      mockContentFindMany.mockResolvedValue([]);
      mockContentCount.mockResolvedValue(0);

      await service.getItems('user-001', { topic: 'business' });

      expect(mockContentFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ topic: 'business' }),
        }),
      );
    });

    it('applies contentType filter to prisma where clause', async () => {
      mockContentFindMany.mockResolvedValue([]);
      mockContentCount.mockResolvedValue(0);

      await service.getItems('user-001', { contentType: 'PODCAST' });

      expect(mockContentFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ contentType: 'PODCAST' }),
        }),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // LIST-01 — GET /api/listening/items/:id
  // ---------------------------------------------------------------------------
  describe('getItemById()', () => {
    it('returns item detail with questions and progress', async () => {
      mockContentFindUnique.mockResolvedValue({
        ...sampleContent,
        transcriptText: 'Test transcript content.',
        audioStorageKey: 'audio/content-001.mp3',
        wordTimestamps: null,
        questions: [sampleQuestion],
      });
      mockProgressFindUnique.mockResolvedValue(null);

      const result = await service.getItemById('content-001', 'user-001');

      expect(result).toHaveProperty('questions');
      expect(result).toHaveProperty('progress');
    });

    it('throws NotFoundException when content does not exist', async () => {
      mockContentFindUnique.mockResolvedValue(null);

      await expect(
        service.getItemById('nonexistent-id', 'user-001'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ---------------------------------------------------------------------------
  // LIST-07 — POST /api/listening/sessions/complete
  // ---------------------------------------------------------------------------
  describe('completeSession()', () => {
    const sessionPayload = {
      contentId: 'content-001',
      score: 6,
      accuracy: 75,
      attempts: [
        { questionId: 'q-001', isCorrect: true, userAnswer: 'Planning a business trip' },
        { questionId: 'q-002', isCorrect: false, userAnswer: 'wrong answer' },
      ],
    };

    it('calls listeningProgress.upsert with where: { userId_contentId: { userId, contentId } }', async () => {
      mockProgressUpsert.mockResolvedValue({
        id: 'prog-001',
        score: 6,
        accuracy: 75,
        completedAt: new Date(),
      });

      await service.completeSession('user-001', sessionPayload);

      expect(mockProgressUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId_contentId: { userId: 'user-001', contentId: 'content-001' } },
        }),
      );
    });

    it('calls gamification.awardXp with skillArea LISTENING (replaces direct xpEvent.create)', async () => {
      mockProgressUpsert.mockResolvedValue({
        id: 'prog-001',
        score: 6,
        accuracy: 75,
        completedAt: new Date(),
      });

      await service.completeSession('user-001', sessionPayload);

      expect(mockAwardXp).toHaveBeenCalledWith(
        'user-001',
        expect.any(Number),
        'listening_session',
        'LISTENING',
        'content-001',
      );
    });

    it('calls gamification.checkAchievements after awardXp', async () => {
      mockProgressUpsert.mockResolvedValue({
        id: 'prog-001',
        score: 6,
        accuracy: 75,
        completedAt: new Date(),
      });

      await service.completeSession('user-001', sessionPayload);

      expect(mockCheckAchievements).toHaveBeenCalledWith(
        'user-001',
        expect.objectContaining({ type: 'LISTENING' }),
      );
    });

    it('returns score, accuracy, xpEarned, contentId', async () => {
      mockProgressUpsert.mockResolvedValue({
        id: 'prog-001',
        score: 6,
        accuracy: 75,
        completedAt: new Date(),
      });

      const result = await service.completeSession('user-001', sessionPayload);

      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('accuracy');
      expect(result).toHaveProperty('xpEarned');
      expect(result).toHaveProperty('contentId');
    });
  });
});
