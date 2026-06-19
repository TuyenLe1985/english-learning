/**
 * ReadingService unit tests — Wave 0 RED scaffolds (Plan 05-01)
 * Updated in Plan 04 to wire gamification assertions.
 *
 * READ-01: getPassages() returns paginated passage list
 * READ-02: getPassageById() returns passage detail with questions, highlights, note, progress
 * READ-03: completeSession() upserts ReadingProgress + calls gamification.awardXp with skillArea READING
 * READ-04: createHighlight() creates and returns highlight with id
 * READ-04: deleteHighlight() deletes highlight; throws NotFoundException if not found or userId mismatch
 * READ-05: upsertNote() calls prisma.note.upsert with correct userId and passageId
 * READ-06: toggleBookmark() creates if not exists, deletes if exists; returns { bookmarked }
 *
 * Tests use direct instantiation with a mocked PrismaService (no NestJS DI).
 * Pattern mirrors apps/api/src/grammar/grammar.service.spec.ts.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { ReadingService } from './reading.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { GamificationService } from '../gamification/gamification.service';

// ─── Mock PrismaService ───────────────────────────────────────────────────────

const mockPassageFindMany = vi.fn();
const mockPassageCount = vi.fn();
const mockPassageFindUnique = vi.fn();
const mockProgressUpsert = vi.fn();
const mockProgressFindUnique = vi.fn();
const mockHighlightCreate = vi.fn();
const mockHighlightFindMany = vi.fn();
const mockHighlightFindUnique = vi.fn();
const mockHighlightDelete = vi.fn();
const mockNoteUpsert = vi.fn();
const mockNoteFindFirst = vi.fn();
const mockBookmarkUpsert = vi.fn();
const mockBookmarkDelete = vi.fn();
const mockBookmarkFindUnique = vi.fn();
const mockUserFindUniqueOrThrow = vi.fn();

const mockPrisma = {
  readingPassage: {
    findMany: mockPassageFindMany,
    count: mockPassageCount,
    findUnique: mockPassageFindUnique,
  },
  readingProgress: {
    upsert: mockProgressUpsert,
    findUnique: mockProgressFindUnique,
  },
  highlight: {
    create: mockHighlightCreate,
    findMany: mockHighlightFindMany,
    findUnique: mockHighlightFindUnique,
    delete: mockHighlightDelete,
  },
  note: {
    upsert: mockNoteUpsert,
    findFirst: mockNoteFindFirst,
  },
  bookmark: {
    upsert: mockBookmarkUpsert,
    delete: mockBookmarkDelete,
    findUnique: mockBookmarkFindUnique,
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

// ─── Sample fixtures ──────────────────────────────────────────────────────────

const samplePassage = {
  id: 'passage-001',
  title: 'The Future of Remote Work',
  contentType: 'ARTICLE',
  cefrLevel: 'B2',
  cefrConfidence: 0.82,
  topic: 'technology',
  wordCount: 350,
  content: '<p>Remote work has changed the way we live.</p>',
  isPublished: true,
  bookmarks: [],
  _count: { questions: 5 },
};

const sampleHighlight = {
  id: 'hl-001',
  passageId: 'passage-001',
  userId: 'user-001',
  startOffset: 10,
  endOffset: 30,
  text: 'Remote work',
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ReadingService', () => {
  let service: ReadingService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ReadingService(mockPrisma, mockGamification);
    // Default gamification mocks
    mockAwardXp.mockResolvedValue({ xpEarned: 30, oldLevel: 1, newLevel: 1, levelUp: false });
    mockCheckAchievements.mockResolvedValue([]);
    mockUserFindUniqueOrThrow.mockResolvedValue({ id: 'user-001', cefrLevel: 'B2' });
  });

  // ---------------------------------------------------------------------------
  // READ-01 — GET /api/reading/passages
  // ---------------------------------------------------------------------------
  describe('getPassages()', () => {
    it('returns paginated passages object with { passages, total, page, limit, totalPages }', async () => {
      mockPassageFindMany.mockResolvedValue([samplePassage]);
      mockPassageCount.mockResolvedValue(40);

      const result = await service.getPassages('user-001', {});

      expect(result).toHaveProperty('passages');
      expect(result).toHaveProperty('total', 40);
      expect(result).toHaveProperty('page');
      expect(result).toHaveProperty('limit');
      expect(result).toHaveProperty('totalPages');
    });

    it('calculates totalPages from total and limit', async () => {
      mockPassageFindMany.mockResolvedValue([]);
      mockPassageCount.mockResolvedValue(40);

      const result = await service.getPassages('user-001', { limit: 20 });

      expect(result.totalPages).toBe(2); // ceil(40/20) = 2
    });
  });

  // ---------------------------------------------------------------------------
  // READ-02 — GET /api/reading/passages/:id
  // ---------------------------------------------------------------------------
  describe('getPassageById()', () => {
    it('returns passage detail with questions, highlights, note, and progress', async () => {
      mockPassageFindUnique.mockResolvedValue({
        ...samplePassage,
        questions: [],
      });
      mockHighlightFindMany.mockResolvedValue([sampleHighlight]);
      mockNoteFindFirst.mockResolvedValue({ content: 'My note' });
      mockProgressFindUnique.mockResolvedValue({ score: 4, accuracy: 80, readingTimeSec: 240 });

      const result = await service.getPassageById('passage-001', 'user-001');

      expect(result).toHaveProperty('questions');
      expect(result).toHaveProperty('highlights');
      expect(result).toHaveProperty('note');
      expect(result).toHaveProperty('progress');
    });

    it('throws NotFoundException when passage does not exist', async () => {
      mockPassageFindUnique.mockResolvedValue(null);

      await expect(
        service.getPassageById('nonexistent-id', 'user-001'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ---------------------------------------------------------------------------
  // READ-03 — POST /api/reading/sessions/complete
  // ---------------------------------------------------------------------------
  describe('completeSession()', () => {
    it('calls readingProgress.upsert with where: { userId_passageId: { userId, passageId } }', async () => {
      mockProgressUpsert.mockResolvedValue({
        id: 'prog-001',
        score: 4,
        accuracy: 80,
        readingTimeSec: 200,
      });

      await service.completeSession('user-001', {
        passageId: 'passage-001',
        score: 4,
        accuracy: 80,
        readingTimeSec: 200,
        attempts: [],
      });

      expect(mockProgressUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId_passageId: { userId: 'user-001', passageId: 'passage-001' } },
        }),
      );
    });

    it('calls gamification.awardXp with skillArea READING after session completes', async () => {
      mockProgressUpsert.mockResolvedValue({
        id: 'prog-001',
        score: 4,
        accuracy: 80,
        readingTimeSec: 200,
      });

      await service.completeSession('user-001', {
        passageId: 'passage-001',
        score: 4,
        accuracy: 80,
        readingTimeSec: 200,
        attempts: [],
      });

      expect(mockAwardXp).toHaveBeenCalledWith(
        'user-001',
        expect.any(Number),
        'reading_session',
        'READING',
        'passage-001',
      );
    });

    it('calls gamification.checkAchievements after awardXp', async () => {
      mockProgressUpsert.mockResolvedValue({
        id: 'prog-001',
        score: 4,
        accuracy: 80,
        readingTimeSec: 200,
      });

      await service.completeSession('user-001', {
        passageId: 'passage-001',
        score: 4,
        accuracy: 80,
        readingTimeSec: 200,
        attempts: [],
      });

      expect(mockCheckAchievements).toHaveBeenCalledWith(
        'user-001',
        expect.objectContaining({ type: 'READING' }),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // READ-04 — POST /api/reading/highlights
  // ---------------------------------------------------------------------------
  describe('createHighlight()', () => {
    it('calls prisma.highlight.create and returns the created highlight with id', async () => {
      mockHighlightCreate.mockResolvedValue(sampleHighlight);

      const result = await service.createHighlight('user-001', {
        passageId: 'passage-001',
        startOffset: 10,
        endOffset: 30,
        text: 'Remote work',
      });

      expect(mockHighlightCreate).toHaveBeenCalled();
      expect(result).toHaveProperty('id', 'hl-001');
    });
  });

  // ---------------------------------------------------------------------------
  // READ-04 — DELETE /api/reading/highlights/:id
  // ---------------------------------------------------------------------------
  describe('deleteHighlight()', () => {
    it('calls prisma.highlight.delete when highlight belongs to user', async () => {
      mockHighlightFindUnique.mockResolvedValue(sampleHighlight);
      mockHighlightDelete.mockResolvedValue(sampleHighlight);

      await service.deleteHighlight('hl-001', 'user-001');

      expect(mockHighlightDelete).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'hl-001' } }),
      );
    });

    it('throws NotFoundException when highlight is not found (IDOR protection)', async () => {
      mockHighlightFindUnique.mockResolvedValue(null);

      await expect(
        service.deleteHighlight('nonexistent-hl', 'user-001'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when highlight belongs to a different user (IDOR protection)', async () => {
      mockHighlightFindUnique.mockResolvedValue({
        ...sampleHighlight,
        userId: 'other-user',
      });

      await expect(
        service.deleteHighlight('hl-001', 'user-001'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ---------------------------------------------------------------------------
  // READ-05 — POST /api/reading/notes
  // ---------------------------------------------------------------------------
  describe('upsertNote()', () => {
    it('calls prisma.note.upsert with where: { userId_passageId: { userId, passageId } }', async () => {
      mockNoteUpsert.mockResolvedValue({
        id: 'note-001',
        userId: 'user-001',
        passageId: 'passage-001',
        content: 'My note',
      });

      await service.upsertNote('user-001', {
        passageId: 'passage-001',
        content: 'My note',
      });

      expect(mockNoteUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId_passageId: { userId: 'user-001', passageId: 'passage-001' } },
        }),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // READ-06 — POST /api/reading/bookmarks
  // ---------------------------------------------------------------------------
  describe('toggleBookmark()', () => {
    it('creates bookmark when it does not exist and returns { bookmarked: true }', async () => {
      mockBookmarkFindUnique.mockResolvedValue(null);
      mockBookmarkUpsert.mockResolvedValue({ id: 'bk-001', userId: 'user-001', passageId: 'passage-001' });

      const result = await service.toggleBookmark('user-001', { passageId: 'passage-001' });

      expect(result).toEqual({ bookmarked: true });
    });

    it('deletes bookmark when it exists and returns { bookmarked: false }', async () => {
      mockBookmarkFindUnique.mockResolvedValue({ id: 'bk-001', userId: 'user-001', passageId: 'passage-001' });
      mockBookmarkDelete.mockResolvedValue({ id: 'bk-001' });

      const result = await service.toggleBookmark('user-001', { passageId: 'passage-001' });

      expect(result).toEqual({ bookmarked: false });
    });
  });
});
