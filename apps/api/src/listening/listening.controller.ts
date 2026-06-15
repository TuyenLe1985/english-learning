/**
 * ListeningController — NestJS controller for listening comprehension browsing + session management.
 *
 * LIST-01: GET /api/listening/items       — paginated list with filters
 * LIST-01: GET /api/listening/items/:id  — item detail with presigned audio URL
 * LIST-07: POST /api/listening/sessions/complete — record session + upsert progress + emit XP
 *
 * Security (T-06-02):
 *   - @UseGuards(JwtAuthGuard) applied to every endpoint
 *   - userId always sourced from req.user.userId (JWT payload), never request body
 *
 * Route order (Pitfall 7): fixed-string POST 'sessions/complete' declared BEFORE
 * parameterized GET 'items/:id' to prevent NestJS from treating literal "sessions"
 * as the :id param value.
 */

import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ListeningService } from './listening.service';
import type {
  ListeningItemDetailDto,
  PaginatedListeningItemsDto,
  ListeningSessionResultDto,
} from '@repo/shared';
import { ListeningSessionCompleteSchema } from '@repo/shared';

// Type for the decoded JWT payload attached to request.user by JwtAuthGuard
interface AuthenticatedRequest {
  user: {
    userId: string;
    role?: string;
    cefrLevel?: string;
    email?: string;
  };
}

@Controller('listening')
export class ListeningController {
  constructor(private readonly listeningService: ListeningService) {}

  /**
   * LIST-01 — GET /api/listening/items
   * Returns paginated listening items filtered by cefrLevel, topic, contentType.
   * Fixed-string route — declared FIRST.
   */
  @UseGuards(JwtAuthGuard)
  @Get('items')
  async getItems(
    @Request() req: AuthenticatedRequest,
    @Query('cefrLevel') cefrLevel?: string,
    @Query('topic') topic?: string,
    @Query('contentType') contentType?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<PaginatedListeningItemsDto> {
    return this.listeningService.getItems(req.user.userId, {
      cefrLevel,
      topic,
      contentType,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  /**
   * LIST-07 — POST /api/listening/sessions/complete
   * Records session, upserts ListeningProgress, emits XpEvent.
   * Fixed-string POST — declared BEFORE parameterized GET items/:id (Pitfall 7).
   *
   * Security (T-06-02): userId from JWT only; body.userId is ignored.
   * Security (T-06-03): ListeningSessionCompleteSchema.parse rejects malformed payloads.
   */
  @UseGuards(JwtAuthGuard)
  @Post('sessions/complete')
  async completeSession(
    @Request() req: AuthenticatedRequest,
    @Body() body: unknown,
  ): Promise<ListeningSessionResultDto> {
    const dto = ListeningSessionCompleteSchema.parse(body);
    return this.listeningService.completeSession(req.user.userId, dto);
  }

  /**
   * LIST-01 — GET /api/listening/items/:id
   * Returns item detail with questions, progress, and presigned audio URL.
   * Parameterized route — declared LAST (after all fixed-string routes).
   * Throws 404 if the content does not exist.
   *
   * Security: userId from JWT for progress lookup.
   */
  @UseGuards(JwtAuthGuard)
  @Get('items/:id')
  async getItemById(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<ListeningItemDetailDto> {
    return this.listeningService.getItemById(id, req.user.userId);
  }
}
