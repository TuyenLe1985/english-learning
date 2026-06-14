/**
 * ReadingController — NestJS controller for reading browsing + session management.
 *
 * READ-01: GET /api/reading/passages — paginated passage list with filters
 * READ-02: GET /api/reading/passages/:id — passage detail with questions, highlights, note, progress
 * READ-03: POST /api/reading/sessions/complete — record comprehension session
 * READ-04: POST /api/reading/highlights — create highlight
 * READ-04: DELETE /api/reading/highlights/:id — delete highlight (IDOR protected)
 * READ-05: POST /api/reading/notes — upsert note per user+passage
 * READ-06: POST /api/reading/bookmarks — toggle bookmark
 *
 * Security (T-05-02-01, T-05-02-02, T-05-02-03):
 *   - @UseGuards(JwtAuthGuard) applied to every endpoint
 *   - userId always sourced from req.user.userId (JWT payload), never request body
 *
 * Route order (Pitfall 1): fixed-string routes declared BEFORE parameterized routes
 * within the same HTTP method to prevent NestJS from matching literal strings as param values.
 */

import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Request,
  UseGuards,
  Query,
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
   * Fixed-string route — declared FIRST to avoid conflict with :id parameterized route.
   *
   * Security: userId from JWT for bookmark status.
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
  ) {
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
   * Records comprehension session and upserts ReadingProgress.
   * Fixed-string POST — declared BEFORE any param POST routes.
   *
   * Security (T-05-02-03): userId from JWT only; body.userId is ignored.
   */
  @UseGuards(JwtAuthGuard)
  @Post('sessions/complete')
  async completeSession(
    @Request() req: AuthenticatedRequest,
    @Body() body: unknown,
  ) {
    const dto = ReadingSessionCompleteSchema.parse(body);
    return this.readingService.completeSession(req.user.userId, dto);
  }

  /**
   * READ-04 — POST /api/reading/highlights
   * Creates a highlight for the requesting user.
   *
   * Security: userId from JWT, not body.
   */
  @UseGuards(JwtAuthGuard)
  @Post('highlights')
  async createHighlight(
    @Request() req: AuthenticatedRequest,
    @Body() body: unknown,
  ) {
    const dto = HighlightCreateSchema.parse(body);
    return this.readingService.createHighlight(req.user.userId, dto);
  }

  /**
   * READ-04 — DELETE /api/reading/highlights/:id
   * Deletes a highlight. Verifies ownership (IDOR protection — ForbiddenException if mismatch).
   *
   * Security (T-05-02-02): deleteHighlight verifies highlight.userId === req.user.userId.
   */
  @UseGuards(JwtAuthGuard)
  @Delete('highlights/:id')
  async deleteHighlight(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.readingService.deleteHighlight(id, req.user.userId);
  }

  /**
   * READ-05 — POST /api/reading/notes
   * Upserts one note per user+passage.
   *
   * Security: userId from JWT, not body.
   */
  @UseGuards(JwtAuthGuard)
  @Post('notes')
  async upsertNote(
    @Request() req: AuthenticatedRequest,
    @Body() body: unknown,
  ) {
    const dto = NoteUpsertSchema.parse(body);
    return this.readingService.upsertNote(req.user.userId, dto);
  }

  /**
   * READ-06 — POST /api/reading/bookmarks
   * Toggles bookmark: creates if absent, deletes if present.
   *
   * Security: userId from JWT, not body.
   */
  @UseGuards(JwtAuthGuard)
  @Post('bookmarks')
  async toggleBookmark(
    @Request() req: AuthenticatedRequest,
    @Body() body: unknown,
  ) {
    const dto = BookmarkToggleSchema.parse(body);
    return this.readingService.toggleBookmark(req.user.userId, dto);
  }

  /**
   * READ-02 — GET /api/reading/passages/:id
   * Returns passage detail with questions, highlights, note, and progress.
   * Parameterized route — declared LAST to avoid shadowing fixed-string routes.
   *
   * Security (T-05-02-01): highlights and notes scoped to req.user.userId.
   */
  @UseGuards(JwtAuthGuard)
  @Get('passages/:id')
  async getPassageDetail(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.readingService.getPassageById(id, req.user.userId);
  }
}
