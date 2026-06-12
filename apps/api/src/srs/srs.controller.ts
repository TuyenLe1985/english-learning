/**
 * SrsController — HTTP endpoints for the SRS review lifecycle.
 *
 * POST /api/srs/enroll   — enroll a word into SRS (VOCAB-04, D-11)
 * GET  /api/srs/queue    — return due cards (VOCAB-06, D-01, D-04)
 * POST /api/srs/review   — submit a review rating (VOCAB-05, VOCAB-06)
 *
 * Security (T-03-09):
 *   - @UseGuards(JwtAuthGuard) on EVERY endpoint — 401 if no/invalid JWT.
 *   - userId always sourced from req.user.userId (JWT payload), never body.
 *   - Zod schema parse on bodies to prevent overposting (T-03-07).
 */

import {
  Body,
  Controller,
  Get,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SrsService } from './srs.service';
import { EnrollWordSchema, ReviewSubmitSchema } from '@repo/shared';
import type { EnrollWordDto, ReviewSubmitDto } from '@repo/shared';

// Type for the decoded JWT payload attached to request.user by JwtAuthGuard
interface AuthenticatedRequest {
  user: {
    userId: string;
    role?: string;
    cefrLevel?: string;
    email?: string;
  };
}

@Controller('srs')
export class SrsController {
  constructor(private readonly srsService: SrsService) {}

  /**
   * POST /api/srs/enroll
   * Enroll a word into SRS. Idempotent — safe to call multiple times (T-03-08).
   */
  @UseGuards(JwtAuthGuard)
  @Post('enroll')
  async enroll(
    @Request() req: AuthenticatedRequest,
    @Body() body: unknown,
  ) {
    const dto = EnrollWordSchema.parse(body) as EnrollWordDto;
    return this.srsService.enrollWord(
      req.user.userId,
      dto.wordId,
      dto.contextSentence,
    );
  }

  /**
   * GET /api/srs/queue
   * Returns cards due for review (due <= NOW, max 20, ordered by due ASC).
   */
  @UseGuards(JwtAuthGuard)
  @Get('queue')
  async getQueue(@Request() req: AuthenticatedRequest) {
    return this.srsService.getDueQueue(req.user.userId);
  }

  /**
   * POST /api/srs/review
   * Submit a review rating (Again/Hard/Good/Easy). FSRS reschedules the card.
   */
  @UseGuards(JwtAuthGuard)
  @Post('review')
  async submitReview(
    @Request() req: AuthenticatedRequest,
    @Body() body: unknown,
  ) {
    const dto = ReviewSubmitSchema.parse(body) as ReviewSubmitDto;
    return this.srsService.submitReview(
      req.user.userId,
      dto.cardId,
      dto.rating,
    );
  }
}
