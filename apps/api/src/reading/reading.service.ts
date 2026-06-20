/**
 * ReadingService — NestJS service for reading passage browsing, session management,
 * highlight CRUD, note upsert, and bookmark toggle.
 *
 * READ-01: getPassages() — paginated passage list with CEFR/topic/contentType filters
 * READ-02: getPassageById() — full passage detail with questions, highlights, note, progress
 * READ-03: completeSession() — upserts ReadingProgress + awards XP via GamificationService
 * READ-04: createHighlight() — creates and returns highlight with id
 * READ-04: deleteHighlight() — IDOR-protected delete (verifies ownership before delete)
 * READ-05: upsertNote() — one note per user+passage (upsert)
 * READ-06: toggleBookmark() — creates if absent, deletes if present
 *
 * Security (T-05-02-01, T-05-02-02, T-05-02-03):
 *   - highlights and notes queries include `where: { userId }` — no cross-user data leakage
 *   - deleteHighlight verifies highlight.userId === requesting userId before delete
 *   - userId always sourced from JWT payload (enforced at controller layer)
 *   - cefrLevel resolved from DB (T-07-10 — never from request body)
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GamificationService } from '../gamification/gamification.service';
import { AdaptiveService } from '../adaptive/adaptive.service';
import { XP_RATES, calculateXp } from '../gamification/gamification.constants';
import type {
  ReadingSessionCompleteDto,
  HighlightCreateDto,
  NoteUpsertDto,
  BookmarkToggleDto,
} from '@repo/shared';

// ─── Query shape for getPassages ─────────────────────────────────────────────

interface PassagesQuery {
  cefrLevel?: string;
  topic?: string;
  contentType?: string;
  page?: number;
  limit?: number;
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class ReadingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gamification: GamificationService,
    private readonly adaptive: AdaptiveService,
  ) {}

  /**
   * READ-01 — GET /api/reading/passages
   * Returns paginated passage list filtered by cefrLevel, topic, contentType.
   * Only published passages (isPublished: true) are returned.
   *
   * Security (T-05-02-01): bookmarks included scoped to requesting userId only.
   */
  async getPassages(
    userId: string,
    query: PassagesQuery,
  ): Promise<{
    passages: unknown[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    // Build optional filter object
    const filters: Record<string, unknown> = {};
    if (query.cefrLevel) filters['cefrLevel'] = query.cefrLevel;
    if (query.topic) filters['topic'] = query.topic;
    if (query.contentType) filters['contentType'] = query.contentType;

    const [passages, total] = await Promise.all([
      this.prisma.readingPassage.findMany({
        where: { isPublished: true, ...filters },
        include: {
          _count: { select: { questions: true } },
          bookmarks: { where: { userId } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.readingPassage.count({
        where: { isPublished: true, ...filters },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return { passages, total, page, limit, totalPages };
  }

  /**
   * READ-02 — GET /api/reading/passages/:id
   * Returns full passage detail including questions (ordered by sortOrder),
   * highlights (scoped to userId), note, and progress.
   * Throws NotFoundException when passage does not exist.
   *
   * Security (T-05-02-01): highlights and note queries scoped to userId.
   */
  async getPassageById(
    passageId: string,
    userId: string,
  ): Promise<unknown> {
    const passage = await this.prisma.readingPassage.findUnique({
      where: { id: passageId, isPublished: true },
      include: {
        questions: { orderBy: { sortOrder: 'asc' }, take: 20 },
      },
    });

    if (!passage) {
      throw new NotFoundException(`Reading passage ${passageId} not found`);
    }

    // Fetch user-scoped annotations in parallel
    const [highlights, note, progress] = await Promise.all([
      this.prisma.highlight.findMany({
        where: { passageId, userId },
      }),
      this.prisma.note.findFirst({
        where: { passageId, userId },
      }),
      this.prisma.readingProgress.findUnique({
        where: { userId_passageId: { userId, passageId } },
      }),
    ]);

    return {
      ...passage,
      highlights,
      note,
      progress,
    };
  }

  /**
   * READ-03 — POST /api/reading/sessions/complete
   * Upserts ReadingProgress for the user+passage pair and awards CEFR-weighted XP.
   * Safe to call multiple times (upsert, not create — no duplicate key error).
   *
   * Security (T-05-02-03): userId comes from JWT only; not from dto body.
   * Security (T-07-10): cefrLevel resolved from DB, never from request body.
   */
  async completeSession(
    userId: string,
    dto: ReadingSessionCompleteDto,
  ): Promise<unknown> {
    const { passageId, readingTimeSec } = dto;
    const now = new Date();

    // CR-06: Clamp client-supplied values to prevent score inflation.
    // accuracy must be in [0, 1]; score must be non-negative and at most 100.
    const clampedAccuracy = Math.min(1, Math.max(0, dto.accuracy ?? 0));
    const clampedScore = Math.min(100, Math.max(0, dto.score ?? 0));

    await this.prisma.readingProgress.upsert({
      where: { userId_passageId: { userId, passageId } },
      create: {
        userId,
        passageId,
        score: clampedScore,
        accuracy: clampedAccuracy,
        readingTimeSec,
        completedAt: now,
        lastViewedAt: now,
      },
      update: {
        score: clampedScore,
        accuracy: clampedAccuracy,
        readingTimeSec,
        completedAt: now,
        lastViewedAt: now,
      },
    });

    // Award XP via GamificationService (T-07-10: cefrLevel from DB, never from body)
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const xpAmount = calculateXp(XP_RATES.LESSON_COMPLETE, user.cefrLevel ?? 'B1');
    const xpResult = await this.gamification.awardXp(
      userId,
      xpAmount,
      'reading_session',
      'READING',
      passageId,
    );

    // Update adaptive skill score (Phase 8 D-12 inline call-chain, after awardXp)
    // Use clamped accuracy to prevent adaptive engine manipulation
    await this.adaptive.updateSkillScore(userId, 'READING', clampedAccuracy);

    // Check achievements (D-12: synchronous inline after awardXp)
    const newAchievements = await this.gamification.checkAchievements(userId, {
      type: 'READING',
      metadata: { passageId },
    });

    return {
      passageId,
      score: clampedScore,
      accuracy: clampedAccuracy,
      readingTimeSec,
      xpEarned: xpResult.xpEarned,
      levelUp: xpResult.levelUp,
      newLevel: xpResult.newLevel,
      newAchievements,
    };
  }

  /**
   * READ-04 — POST /api/reading/highlights
   * Creates a new highlight for the given user and passage.
   * Returns the created highlight including its generated id.
   */
  async createHighlight(
    userId: string,
    dto: HighlightCreateDto,
  ): Promise<unknown> {
    return this.prisma.highlight.create({
      data: {
        userId,
        passageId: dto.passageId,
        startOffset: dto.startOffset,
        endOffset: dto.endOffset,
        text: dto.text,
      },
    });
  }

  /**
   * READ-04 — DELETE /api/reading/highlights/:id
   * Deletes a highlight. Verifies ownership before deletion (IDOR protection).
   * Throws NotFoundException if highlight not found or belongs to a different user.
   *
   * Security (T-05-02-02): fetch first, check userId match, then delete.
   * Note: NotFoundException used for both not-found and ownership mismatch cases
   * to avoid IDOR information leakage (consistent error for both cases).
   */
  async deleteHighlight(
    highlightId: string,
    userId: string,
  ): Promise<void> {
    const highlight = await this.prisma.highlight.findUnique({
      where: { id: highlightId },
    });

    // Not found OR owned by different user → same NotFoundException (no IDOR info leak)
    if (!highlight || highlight.userId !== userId) {
      throw new NotFoundException(`Highlight ${highlightId} not found`);
    }

    await this.prisma.highlight.delete({
      where: { id: highlightId },
    });
  }

  /**
   * READ-05 — POST /api/reading/notes
   * Upserts a single note per user+passage pair (one note per user per passage).
   * Creates the note if it doesn't exist; updates content if it does.
   */
  async upsertNote(
    userId: string,
    dto: NoteUpsertDto,
  ): Promise<unknown> {
    return this.prisma.note.upsert({
      where: { userId_passageId: { userId, passageId: dto.passageId } },
      create: {
        userId,
        passageId: dto.passageId,
        content: dto.content,
      },
      update: {
        content: dto.content,
      },
    });
  }

  /**
   * READ-06 — POST /api/reading/bookmarks
   * Toggles bookmark for the user+passage pair.
   * Creates if absent → returns { bookmarked: true }.
   * Deletes if present → returns { bookmarked: false }.
   */
  async toggleBookmark(
    userId: string,
    dto: BookmarkToggleDto,
  ): Promise<{ bookmarked: boolean }> {
    const existing = await this.prisma.bookmark.findUnique({
      where: { userId_passageId: { userId, passageId: dto.passageId } },
    });

    if (existing) {
      await this.prisma.bookmark.delete({
        where: { userId_passageId: { userId, passageId: dto.passageId } },
      });
      return { bookmarked: false };
    }

    await this.prisma.bookmark.upsert({
      where: { userId_passageId: { userId, passageId: dto.passageId } },
      create: { userId, passageId: dto.passageId },
      update: {},
    });
    return { bookmarked: true };
  }
}
