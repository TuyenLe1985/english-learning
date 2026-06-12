/**
 * SrsService unit tests — Wave 0 RED scaffolds (Plan 03-01)
 *
 * VOCAB-04: enrollWord — idempotent enroll via upsert
 * VOCAB-05: submitReview — FSRS scheduling via ts-fsrs
 * VOCAB-06: getDueQueue — due cards ordered by due ASC, max 20
 *
 * Tests use direct instantiation with a mocked PrismaService (no NestJS DI).
 * ts-fsrs is mocked to avoid real algorithm calls in unit tests.
 *
 * These tests FAIL intentionally — SrsService does not yet exist.
 * Plans 02 and 04 turn these green.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { SrsService } from './srs.service';
import type { PrismaService } from '../prisma/prisma.service';

// ─── Mock ts-fsrs ─────────────────────────────────────────────────────────────
// Prevents real FSRS algorithm from running in unit tests.
// Mock returns a deterministic scheduling result for Rating.Good (3).

vi.mock('ts-fsrs', () => ({
  createEmptyCard: vi.fn().mockReturnValue({
    due: new Date('2026-06-12T00:00:00Z'),
    stability: 0,
    difficulty: 0,
    elapsed_days: 0,
    scheduled_days: 0,
    learning_steps: 0,
    reps: 0,
    lapses: 0,
    state: 0, // State.New
    last_review: undefined,
  }),
  fsrs: vi.fn().mockReturnValue({
    repeat: vi.fn().mockReturnValue({
      // Rating.Good = 3
      3: {
        card: {
          due: new Date('2026-06-20T00:00:00Z'),
          stability: 1.5,
          difficulty: 5,
          elapsed_days: 0,
          scheduled_days: 7,
          learning_steps: 0,
          reps: 1,
          lapses: 0,
          state: 2, // State.Review
          last_review: new Date('2026-06-12T00:00:00Z'),
        },
      },
      // Rating.Again = 1
      1: {
        card: {
          due: new Date('2026-06-13T00:00:00Z'),
          stability: 0.5,
          difficulty: 7,
          elapsed_days: 0,
          scheduled_days: 1,
          learning_steps: 0,
          reps: 0,
          lapses: 1,
          state: 3, // State.Relearning
          last_review: new Date('2026-06-12T00:00:00Z'),
        },
      },
    }),
  }),
  Rating: { Again: 1, Hard: 2, Good: 3, Easy: 4 },
  State: {
    New: 0, Learning: 1, Review: 2, Relearning: 3,
    0: 'New', 1: 'Learning', 2: 'Review', 3: 'Relearning',
  },
}));

// ─── Mock PrismaService ───────────────────────────────────────────────────────

const mockFindFirst = vi.fn();
const mockFindMany = vi.fn();
const mockFindUnique = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockUpsert = vi.fn();

const mockPrisma = {
  srsCard: {
    findFirst: mockFindFirst,
    findMany: mockFindMany,
    findUnique: mockFindUnique,
    create: mockCreate,
    update: mockUpdate,
  },
  userVocabularyItem: {
    upsert: mockUpsert,
  },
} as unknown as PrismaService;

// ─── Sample fixtures ──────────────────────────────────────────────────────────

const sampleCard = {
  id: 'card-001',
  userId: 'user-001',
  wordId: 'word-001',
  userVocabItemId: 'item-001',
  due: new Date(Date.now() - 3600000), // 1 hour ago — past due
  stability: 0,
  difficulty: 0,
  elapsedDays: 0,
  scheduledDays: 0,
  reps: 0,
  lapses: 0,
  state: 'New' as const,
  lastReview: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const sampleItem = {
  id: 'item-001',
  userId: 'user-001',
  wordId: 'word-001',
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SrsService', () => {
  let service: SrsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SrsService(mockPrisma);
  });

  // ---------------------------------------------------------------------------
  // VOCAB-04 — Enroll word into SRS
  // ---------------------------------------------------------------------------
  describe('enrollWord()', () => {
    it('creates UserVocabularyItem and SrsCard on first enroll', async () => {
      mockUpsert.mockResolvedValue(sampleItem);
      mockFindUnique.mockResolvedValue(null); // no existing card
      mockCreate.mockResolvedValue(sampleCard);

      const result = await service.enrollWord('user-001', 'word-001');

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId_wordId: { userId: 'user-001', wordId: 'word-001' } },
        }),
      );
      expect(mockCreate).toHaveBeenCalled();
      expect(result).toMatchObject({ userId: 'user-001', wordId: 'word-001' });
    });

    it('is idempotent — returns existing card on second enroll', async () => {
      mockUpsert.mockResolvedValue(sampleItem);
      mockFindUnique.mockResolvedValue(sampleCard); // card already exists

      const result = await service.enrollWord('user-001', 'word-001');

      expect(mockCreate).not.toHaveBeenCalled();
      expect(result).toMatchObject({ id: 'card-001' });
    });

    it('stores contextSentence on first enroll if provided', async () => {
      mockUpsert.mockResolvedValue({ ...sampleItem, contextSentence: 'Example sentence.' });
      mockFindUnique.mockResolvedValue(null);
      mockCreate.mockResolvedValue(sampleCard);

      await service.enrollWord('user-001', 'word-001', 'Example sentence.');

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            contextSentence: 'Example sentence.',
          }),
        }),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // VOCAB-05 — Submit SRS review
  // ---------------------------------------------------------------------------
  describe('submitReview()', () => {
    it('calls fsrs.repeat and updates the card with scheduled fields', async () => {
      mockFindFirst.mockResolvedValue(sampleCard);
      mockUpdate.mockResolvedValue({ ...sampleCard, reps: 1, scheduledDays: 7 });

      const result = await service.submitReview('user-001', 'card-001', 'Good');

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'card-001' },
          data: expect.objectContaining({
            due: expect.any(Date),
            stability: expect.any(Number),
            reps: expect.any(Number),
          }),
        }),
      );
      expect(result.reps).toBe(1);
    });

    it('filters by userId to prevent cross-user access (security)', async () => {
      mockFindFirst.mockResolvedValue(null); // card not found for this userId

      await expect(
        service.submitReview('wrong-user', 'card-001', 'Good'),
      ).rejects.toThrow(NotFoundException);
    });

    it('handles Again rating — lapses increment', async () => {
      mockFindFirst.mockResolvedValue(sampleCard);
      mockUpdate.mockResolvedValue({ ...sampleCard, lapses: 1, scheduledDays: 1 });

      const result = await service.submitReview('user-001', 'card-001', 'Again');

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            lapses: expect.any(Number),
          }),
        }),
      );
      expect(result.lapses).toBe(1);
    });

    it('writes state back as Prisma enum string (not numeric)', async () => {
      mockFindFirst.mockResolvedValue(sampleCard);
      mockUpdate.mockImplementation((args) => Promise.resolve({
        ...sampleCard,
        ...args.data,
      }));

      await service.submitReview('user-001', 'card-001', 'Good');

      const updateCall = mockUpdate.mock.calls[0] as [{ data: Record<string, unknown> }];
      const stateValue = updateCall[0].data['state'];
      // State must be a string ('New', 'Learning', 'Review', 'Relearning'), not a number
      expect(typeof stateValue).toBe('string');
      expect(['New', 'Learning', 'Review', 'Relearning']).toContain(stateValue);
    });
  });

  // ---------------------------------------------------------------------------
  // VOCAB-06 — Due queue
  // ---------------------------------------------------------------------------
  describe('getDueQueue()', () => {
    it('returns only cards with due <= now', async () => {
      const pastDue = { ...sampleCard, due: new Date(Date.now() - 3600000) };
      mockFindMany.mockResolvedValue([pastDue]);

      const result = await service.getDueQueue('user-001');

      expect(result).toHaveLength(1);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-001',
            due: expect.objectContaining({ lte: expect.any(Date) }),
          }),
        }),
      );
    });

    it('limits queue to maximum 20 cards (D-04)', async () => {
      mockFindMany.mockResolvedValue([]);

      await service.getDueQueue('user-001');

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 20,
        }),
      );
    });

    it('orders by due ascending — oldest cards first', async () => {
      mockFindMany.mockResolvedValue([]);

      await service.getDueQueue('user-001');

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { due: 'asc' },
        }),
      );
    });

    it('returns empty array when no cards are due', async () => {
      mockFindMany.mockResolvedValue([]);

      const result = await service.getDueQueue('user-001');

      expect(result).toEqual([]);
    });
  });
});
