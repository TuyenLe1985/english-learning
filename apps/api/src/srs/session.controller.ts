/**
 * SessionController — POST /api/vocabulary/session/complete
 *
 * Declared in SrsModule (not VocabularyModule) to avoid cross-plan file contention.
 * Plan 02 owns vocabulary.module.ts; Plan 03 owns SrsModule.
 * By declaring SessionController here, the /api/vocabulary/session/complete route
 * is correctly registered under the VocabularyModule-registered prefix.
 *
 * D-07: Records the batch practice result and returns a SessionResultDto
 *       (score, total, wrongWordIds, timeTakenMs).
 *
 * Security (T-03-09):
 *   - @UseGuards(JwtAuthGuard) — requires valid JWT.
 *   - userId from req.user.userId only.
 *   - SessionCompleteSchema (Zod) validates body.
 */

import {
  Body,
  Controller,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SrsService } from './srs.service';
import { SessionCompleteSchema } from '@repo/shared';
import type { SessionCompleteDto, SessionResultDto } from '@repo/shared';

// Type for the decoded JWT payload attached to request.user by JwtAuthGuard
interface AuthenticatedRequest {
  user: {
    userId: string;
    role?: string;
    cefrLevel?: string;
    email?: string;
  };
}

@Controller('vocabulary')
export class SessionController {
  constructor(private readonly srsService: SrsService) {}

  /**
   * POST /api/vocabulary/session/complete
   * Records the batch practice session result.
   * Returns SessionResultDto: { score, total, wrongWordIds, timeTakenMs }.
   */
  @UseGuards(JwtAuthGuard)
  @Post('session/complete')
  async completeSession(
    @Request() req: AuthenticatedRequest,
    @Body() body: unknown,
  ): Promise<SessionResultDto> {
    const dto = SessionCompleteSchema.parse(body) as SessionCompleteDto;
    return this.srsService.completeSession(req.user.userId, dto);
  }
}
