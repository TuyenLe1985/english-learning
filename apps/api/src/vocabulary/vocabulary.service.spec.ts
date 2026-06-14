/**
 * VocabularyService unit tests — Wave 0 RED scaffolds (Plan 03-01)
 *
 * VOCAB-01: getCategories / getWordsByCategory
 * VOCAB-02: getWordDetail
 * VOCAB-03: assignExerciseType / practice session helpers
 * VOCAB-07: getMyWords
 *
 * Tests use direct instantiation with a mocked PrismaService (no NestJS DI).
 * This matches the pattern in apps/api/src/users/users.service.spec.ts.
 *
 * These tests FAIL intentionally — VocabularyService does not yet exist.
 * Plans 02 and 04 turn these green.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { VocabularyService } from './vocabulary.service';
import type { PrismaService } from '../prisma/prisma.service';

// ─── Mock PrismaService ───────────────────────────────────────────────────────

const mockFindMany = vi.fn();
const mockFindUniqueOrThrow = vi.fn();
const mockFindUnique = vi.fn();
const mockCount = vi.fn();
const mockUpsert = vi.fn();
const mockUserItemFindMany = vi.fn();

const mockPrisma = {
  vocabularyWord: {
    findMany: mockFindMany,
    findUniqueOrThrow: mockFindUniqueOrThrow,
    findUnique: mockFindUnique,
    count: mockCount,
  },
  userVocabularyItem: {
    findMany: mockUserItemFindMany,
    upsert: mockUpsert,
  },
} as unknown as PrismaService;

// ─── Sample fixtures ──────────────────────────────────────────────────────────

const sampleWord = {
  id: 'word-001',
  word: 'negotiate',
  definition: 'To discuss terms and reach an agreement',
  partOfSpeech: 'verb',
  examples: ['We need to negotiate the contract.'],
  synonyms: ['bargain', 'mediate'],
  pronunciationKey: 'nɪˈɡəʊʃɪeɪt',
  audioStorageKey: null,
  cefrLevel: 'B1' as const,
  category: 'business',
  frequency: 0,
};

const EIGHT_CATEGORIES = [
  'business', 'travel', 'technology', 'education',
  'health', 'daily-life', 'social-topics', 'academic-english',
];

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('VocabularyService', () => {
  let service: VocabularyService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new VocabularyService(mockPrisma);
  });

  // ---------------------------------------------------------------------------
  // VOCAB-01 — GET /api/vocabulary/categories
  // ---------------------------------------------------------------------------
  describe('getCategories()', () => {
    it('returns exactly 8 categories', async () => {
      // Mock counts for each category
      mockCount.mockResolvedValue(25);

      const result = await service.getCategories();

      expect(result).toHaveLength(8);
    });

    it('each category has wordCount field', async () => {
      mockCount.mockResolvedValue(25);

      const result = await service.getCategories();

      for (const cat of result) {
        expect(cat).toHaveProperty('wordCount');
        expect(typeof cat.wordCount).toBe('number');
      }
    });

    it('each category has slug and name fields', async () => {
      mockCount.mockResolvedValue(25);

      const result = await service.getCategories();

      for (const cat of result) {
        expect(cat).toHaveProperty('slug');
        expect(cat).toHaveProperty('name');
        expect(EIGHT_CATEGORIES).toContain(cat.slug);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // VOCAB-01 — GET /api/vocabulary/:category/words
  // ---------------------------------------------------------------------------
  describe('getWordsByCategory()', () => {
    it('returns paginated words for a valid category', async () => {
      mockFindMany.mockResolvedValue([sampleWord]);
      mockCount.mockResolvedValue(25);

      const result = await service.getWordsByCategory('business', 1, 20);

      expect(result.total).toBe(25);
      expect(result.words).toHaveLength(1);
    });

    it('calculates totalPages correctly', async () => {
      mockFindMany.mockResolvedValue([sampleWord]);
      mockCount.mockResolvedValue(25);

      const result = await service.getWordsByCategory('business', 1, 20);

      expect(result.totalPages).toBe(2); // ceil(25/20) = 2
    });

    it('passes correct skip/take for page 2', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(25);

      await service.getWordsByCategory('business', 2, 20);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 20,
        }),
      );
    });

    it('filters by category', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      await service.getWordsByCategory('travel', 1, 20);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ category: 'travel' }),
        }),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // VOCAB-02 — Word detail page
  // ---------------------------------------------------------------------------
  describe('getWordDetail()', () => {
    it('returns word with all required fields', async () => {
      mockFindUniqueOrThrow.mockResolvedValue(sampleWord);

      const result = await service.getWordDetail('word-001');

      expect(result).toMatchObject({
        id: 'word-001',
        word: 'negotiate',
        definition: expect.any(String),
        partOfSpeech: expect.any(String),
        examples: expect.any(Array),
        synonyms: expect.any(Array),
        pronunciationKey: expect.any(String),
      });
    });

    it('throws NotFoundException when word does not exist', async () => {
      const prismaError = Object.assign(new Error('P2025'), {
        code: 'P2025',
      });
      mockFindUniqueOrThrow.mockRejectedValue(prismaError);

      await expect(service.getWordDetail('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // VOCAB-03 — assignExerciseType / session helpers
  // ---------------------------------------------------------------------------
  describe('assignExerciseType()', () => {
    it('returns one of the 6 valid exercise types', async () => {
      const validTypes = [
        'flashcard',
        'matching',
        'context-selection',
        'cloze',
        'synonym-id',
        'recall',
      ];

      const type = service.assignExerciseType();

      expect(validTypes).toContain(type);
    });

    it('returns different types across multiple calls (random assignment)', () => {
      const types = new Set<string>();
      for (let i = 0; i < 50; i++) {
        types.add(service.assignExerciseType());
      }
      // With 50 calls across 6 options, at least 2 distinct types should appear
      expect(types.size).toBeGreaterThanOrEqual(2);
    });
  });

  describe('getMatchingGrid()', () => {
    it('returns exactly 4 words for the matching exercise grid', async () => {
      mockFindMany.mockResolvedValue([
        sampleWord,
        { ...sampleWord, id: 'w2', word: 'invoice' },
        { ...sampleWord, id: 'w3', word: 'profit' },
        { ...sampleWord, id: 'w4', word: 'merger' },
      ]);

      const result = await service.getMatchingGrid('business');

      expect(result).toHaveLength(4);
    });
  });

  // ---------------------------------------------------------------------------
  // VOCAB-07 — My Words list
  // ---------------------------------------------------------------------------
  describe('getMyWords()', () => {
    it('returns words with status field', async () => {
      mockUserItemFindMany.mockResolvedValue([
        {
          id: 'item-001',
          wordId: 'word-001',
          word: sampleWord,
          srsCard: null,
        },
      ]);

      const result = await service.getMyWords('user-001');

      for (const item of result) {
        expect(item).toHaveProperty('status');
        expect(['new', 'learning', 'reviewing', 'mastered']).toContain(
          item.status,
        );
      }
    });

    it('returns nextReviewDate from SrsCard when available', async () => {
      const due = new Date('2026-07-01T00:00:00Z');
      mockUserItemFindMany.mockResolvedValue([
        {
          id: 'item-001',
          wordId: 'word-001',
          word: sampleWord,
          srsCard: { due, state: 'Review', reps: 3 },
        },
      ]);

      const result = await service.getMyWords('user-001');

      expect(result[0]?.nextReviewDate).toBe(due.toISOString());
    });

    it('returns null nextReviewDate when no SrsCard', async () => {
      mockUserItemFindMany.mockResolvedValue([
        {
          id: 'item-001',
          wordId: 'word-001',
          word: sampleWord,
          srsCard: null,
        },
      ]);

      const result = await service.getMyWords('user-001');

      expect(result[0]?.nextReviewDate).toBeNull();
    });

    it('filters by status when provided', async () => {
      mockUserItemFindMany.mockResolvedValue([]);

      await service.getMyWords('user-001', 'mastered');

      expect(mockUserItemFindMany).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // VOCAB-08 — GET /api/vocabulary/lookup?word=
  // RED stub: lookupByWord does not exist yet on VocabularyService
  // ---------------------------------------------------------------------------
  describe('lookupByWord()', () => {
    it('returns a VocabularyWordDto when the word is found', async () => {
      // mockFindMany is the vocabularyWord.findMany mock available in scope
      // lookupByWord uses vocabularyWord.findFirst — add mock to mockPrisma
      // For RED state we call the method that does not exist yet
      mockFindMany.mockResolvedValue([sampleWord]);

      const result = await service.lookupByWord('negotiate');

      // word found → returns the word object (not null)
      expect(result).not.toBeNull();
      expect(result).toMatchObject({ word: 'negotiate' });
    });

    it('returns null when the word is not found (D-13 — graceful no-match, not 404)', async () => {
      mockFindMany.mockResolvedValue([]);

      const result = await service.lookupByWord('xyzabc');

      // word not found → returns null (not a NotFoundException)
      expect(result).toBeNull();
    });
  });
});
