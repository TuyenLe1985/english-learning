/**
 * ReadingController — NestJS controller for reading passage browsing + annotations.
 *
 * READ-01: GET /api/reading/passages — paginated passage list (cefrLevel, topic, contentType filters)
 * READ-02: GET /api/reading/passages/:id — full passage detail (questions, highlights, note, progress)
 * READ-03: POST /api/reading/sessions/complete — record session result, upsert ReadingProgress
 * READ-04: POST /api/reading/highlights — create highlight
 * READ-04: DELETE /api/reading/highlights/:id — delete highlight (IDOR protected)
 * READ-05: POST /api/reading/notes — upsert note (one per user+passage)
 * READ-06: POST /api/reading/bookmarks — toggle bookmark
 *
 * Security (T-05-02-01, T-05-02-02, T-05-02-03):
 *   - @UseGuards(JwtAuthGuard) applied to every endpoint
 *   - userId always sourced from req.user.userId (JWT payload), NEVER from request body
 *   - Zod parse applied to all POST bodies
 *
 * Route order: fixed-string routes declared BEFORE parameterized routes
 * to prevent NestJS from matching literal strings as param values.
 */

import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Request,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReadingService } from './reading.service';
import {
  ReadingSessionCompleteSchema,
  HighlightCreateSchema,
  NoteUpsertSchema,
  BookmarkToggleSchema,
} from '@repo/shared';

// Type for the decoded JWT payload attached to request.user by JwtAuthGuard
interface AuthenticatedRequest {
  user: {
    userId: string;
    role?: string;
    cefrLevel?: string;
    email?: string;
  };
}

@Controller('reading')
export class ReadingController {
  constructor(private readonly readingService: ReadingService) {}

  /**
   * READ-01 — GET /api/reading/passages
   * Returns paginated passage list filtered by cefrLevel, topic, contentType.
   * Fixed-string GET route — declared FIRST to avoid conflict with :id route.
   *
   * Security: userId from JWT for bookmark inclusion check.
   */
  @UseGuards(JwtAuthGuard)
  @Get('passages')
  async getPassages(
    @Request() req: AuthenticatedRequest,
    @Query('cefrLevel') cefrLevel?: string,
    @Query('topic') topic?: string,
    @Query('contentType') contentType?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<unknown> {
    return this.readingService.getPassages(req.user.userId, {
      cefrLevel,
      topic,
      contentType,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  /**
   * READ-03 — POST /api/reading/sessions/complete
   * Records session result and upserts ReadingProgress.
   * Fixed-string POST route — declared BEFORE any parameterized POST routes.
   *
   * Security (T-05-02-03): userId from JWT; body MUST NOT contain userId field.
   */
  @UseGuards(JwtAuthGuard)
  @Post('sessions/complete')
  async completeSession(
    @Request() req: AuthenticatedRequest,
    @Body() body: unknown,
  ): Promise<unknown> {
    const dto = ReadingSessionCompleteSchema.parse(body);
    return this.readingService.completeSession(req.user.userId, dto);
  }

  /**
   * READ-04 — POST /api/reading/highlights
   * Creates a highlight for the requesting user.
   *
   * Security: userId from JWT; passageId, offsets, and text from Zod-validated body.
   */
  @UseGuards(JwtAuthGuard)
  @Post('highlights')
  async createHighlight(
    @Request() req: AuthenticatedRequest,
    @Body() body: unknown,
  ): Promise<unknown> {
    const dto = HighlightCreateSchema.parse(body);
    return this.readingService.createHighlight(req.user.userId, dto);
  }

  /**
   * READ-04 — DELETE /api/reading/highlights/:id
   * Deletes a highlight. Service verifies ownership before deletion (IDOR protection).
   * Throws 404 if highlight not found or belongs to a different user.
   *
   * Security (T-05-02-02): ownership check in service layer, not here.
   */
  @UseGuards(JwtAuthGuard)
  @Delete('highlights/:id')
  async deleteHighlight(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<void> {
    return this.readingService.deleteHighlight(id, req.user.userId);
  }

  /**
   * READ-05 — POST /api/reading/notes
   * Upserts a note for the requesting user and passage (one note per user+passage).
   *
   * Security: userId from JWT; passageId and content from Zod-validated body.
   */
  @UseGuards(JwtAuthGuard)
  @Post('notes')
  async upsertNote(
    @Request() req: AuthenticatedRequest,
    @Body() body: unknown,
  ): Promise<unknown> {
    const dto = NoteUpsertSchema.parse(body);
    return this.readingService.upsertNote(req.user.userId, dto);
  }

  /**
   * READ-06 — POST /api/reading/bookmarks
   * Toggles bookmark for the requesting user and passage.
   * Creates if absent, deletes if present.
   *
   * Security: userId from JWT; passageId from Zod-validated body.
   */
  @UseGuards(JwtAuthGuard)
  @Post('bookmarks')
  async toggleBookmark(
    @Request() req: AuthenticatedRequest,
    @Body() body: unknown,
  ): Promise<{ bookmarked: boolean }> {
    const dto = BookmarkToggleSchema.parse(body);
    return this.readingService.toggleBookmark(req.user.userId, dto);
  }

  /**
   * READ-02 — GET /api/reading/passages/:id
   * Returns full passage detail (questions, highlights, note, progress).
   * Parameterized route — declared LAST to prevent shadowing fixed-string routes.
   * Throws 404 if passage does not exist.
   *
   * Security (T-05-02-01): highlights and note scoped to requesting userId in service.
   */
  @UseGuards(JwtAuthGuard)
  @Get('passages/:id')
  async getPassageDetail(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<unknown> {
    return this.readingService.getPassageById(id, req.user.userId);
  }
}
