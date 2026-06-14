/**
 * ReadingService — NestJS service for reading browsing + session management.
 *
 * READ-01: getPassages() — returns paginated passage list filtered by cefrLevel, topic, contentType
 * READ-02: getPassageById() — returns passage detail with questions, highlights, note, progress
 * READ-03: completeSession() — upserts ReadingProgress
 * READ-04: createHighlight() / deleteHighlight() — CRUD for user highlights (IDOR protected)
 * READ-05: upsertNote() — upserts one Note per user+passage
 * READ-06: toggleBookmark() — creates or deletes bookmark
 *
 * Security (T-05-02-01, T-05-02-02, T-05-02-03):
 *   - highlights and notes queries ALWAYS include { userId } where clause (no cross-user leakage)
 *   - deleteHighlight verifies highlight.userId === requesting userId (ForbiddenException if mismatch)
 *   - userId always sourced from JWT via controller; never from request body
 */

import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type {
  ReadingSessionCompleteDto,
  HighlightCreateDto,
  NoteUpsertDto,
  BookmarkToggleDto,
} from '@repo/shared';

// ─── Query shape for getPassages ─────────────────────────────────────────────

export interface PassagesQuery {
  cefrLevel?: string;
  topic?: string;
  contentType?: string;
  page?: number;
  limit?: number;
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class ReadingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * READ-01 — GET /api/reading/passages
   * Returns paginated passage list filtered by cefrLevel, topic, contentType.
   * Only published passages returned (isPublished: true).
   * Includes _count.questions and bookmark status for the requesting user.
   */
  async getPassages(userId: string, query: PassagesQuery) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const filters: Record<string, unknown> = { isPublished: true };
    if (query.cefrLevel) filters['cefrLevel'] = query.cefrLevel;
    if (query.topic) filters['topic'] = query.topic;
    if (query.contentType) filters['contentType'] = query.contentType;

    const [passages, total] = await Promise.all([
      this.prisma.readingPassage.findMany({
        where: filters,
        skip,
        take: limit,
        include: {
          _count: { select: { questions: true } },
          bookmarks: { where: { userId }, select: { id: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.readingPassage.count({ where: filters }),
    ]);

    return {
      passages,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * READ-02 — GET /api/reading/passages/:id
   * Returns passage detail with questions (ordered by sortOrder), highlights (userId-scoped),
   * note (userId-scoped), and progress record.
   * Throws NotFoundException if passage does not exist.
   *
   * Security (T-05-02-01): highlights and note queries scoped to userId only.
   */
  async getPassageById(id: string, userId: string) {
    const passage = await this.prisma.readingPassage.findUnique({
      where: { id },
      include: {
        questions: { orderBy: { sortOrder: 'asc' } },
      },
    });

    if (!passage) {
      throw new NotFoundException(`Reading passage ${id} not found`);
    }

    const [highlights, note, progress] = await Promise.all([
      this.prisma.highlight.findMany({
        where: { passageId: id, userId },
      }),
      this.prisma.note.findFirst({
        where: { passageId: id, userId },
      }),
      this.prisma.readingProgress.findUnique({
        where: { userId_passageId: { userId, passageId: id } },
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
   * Upserts ReadingProgress (safe on second completion attempt for same userId+passageId).
   *
   * Security (T-05-02-03): userId always from JWT payload, never from DTO.
   */
  async completeSession(userId: string, dto: ReadingSessionCompleteDto) {
    const { passageId, score, accuracy, readingTimeSec } = dto;
    const now = new Date();

    return this.prisma.readingProgress.upsert({
      where: { userId_passageId: { userId, passageId } },
      create: {
        userId,
        passageId,
        score,
        accuracy,
        readingTimeSec,
        completedAt: now,
        lastViewedAt: now,
      },
      update: {
        score,
        accuracy,
        readingTimeSec,
        completedAt: now,
        lastViewedAt: now,
      },
    });
  }

  /**
   * READ-04 — POST /api/reading/highlights
   * Creates and returns a highlight for the requesting user.
   */
  async createHighlight(userId: string, dto: HighlightCreateDto) {
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
   * Deletes a highlight. Verifies ownership before deletion.
   *
   * Security (T-05-02-02): fetches highlight first; throws ForbiddenException if userId mismatch.
   * Throws NotFoundException if highlight does not exist.
   */
  async deleteHighlight(id: string, userId: string) {
    const highlight = await this.prisma.highlight.findUnique({
      where: { id },
    });

    if (!highlight) {
      throw new NotFoundException(`Highlight ${id} not found`);
    }

    if (highlight.userId !== userId) {
      throw new NotFoundException(`Highlight ${id} not found`);
    }

    return this.prisma.highlight.delete({ where: { id } });
  }

  /**
   * READ-05 — POST /api/reading/notes
   * Upserts one note per user+passage.
   * Uses the unique composite key userId_passageId on the Note table.
   */
  async upsertNote(userId: string, dto: NoteUpsertDto) {
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
   * Toggles bookmark: creates if absent, deletes if present.
   * Returns { bookmarked: true } on create, { bookmarked: false } on delete.
   */
  async toggleBookmark(userId: string, dto: BookmarkToggleDto) {
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
