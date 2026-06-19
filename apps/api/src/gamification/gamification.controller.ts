/**
 * GamificationController — NestJS controller for gamification data endpoints.
 *
 * GAME-03/04: GET /api/gamification/achievements returns all 8 achievement
 * definitions merged with the user's earned state (earnedAt or null).
 *
 * Security (T-07-16, T-07-17):
 *   - @UseGuards(JwtAuthGuard) on all endpoints
 *   - userId ALWAYS from req.user.userId (JWT payload) — never from path/query params (IDOR prevention)
 *
 * Route order: no parameterized routes here — all fixed-string.
 */

import {
  Controller,
  Get,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GamificationService } from './gamification.service';
import type { AchievementWithEarnedAtDto } from './gamification.service';

// Type for the decoded JWT payload attached to request.user by JwtAuthGuard
interface AuthenticatedRequest {
  user: {
    userId: string;
    role?: string;
    cefrLevel?: string;
    email?: string;
  };
}

@Controller('gamification')
export class GamificationController {
  constructor(private readonly gamificationService: GamificationService) {}

  /**
   * GAME-03/04 — GET /api/gamification/achievements
   * Returns all 8 achievement definitions merged with the user's UserAchievement rows.
   * earnedAt: Date if earned, null if locked.
   *
   * Security (T-07-16): userId from JWT only — no path/query param accepted.
   */
  @UseGuards(JwtAuthGuard)
  @Get('achievements')
  async getAchievements(
    @Request() req: AuthenticatedRequest,
  ): Promise<AchievementWithEarnedAtDto[]> {
    return this.gamificationService.getUserAchievements(req.user.userId);
  }
}
