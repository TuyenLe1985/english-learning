/**
 * AdaptiveController — HTTP endpoints for the adaptive learning engine.
 *
 * GET /api/adaptive/dashboard  — aggregated dashboard data (DASH-01/02/04)
 * GET /api/adaptive/recommendation — Continue Learning recommendation (ADPT-03/04/05)
 *
 * Security (T-08-02 IDOR, T-08-03 Spoofing):
 *   - @UseGuards(JwtAuthGuard) on every endpoint
 *   - userId ALWAYS from req.user.userId (JWT payload) — never from query/path params
 */

import {
  Controller,
  Get,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdaptiveService } from './adaptive.service';
import type { DashboardDto, ContinueLearningDto } from '@repo/shared';

// Type for the decoded JWT payload attached to request.user by JwtAuthGuard
interface AuthenticatedRequest {
  user: {
    userId: string;
    role?: string;
    cefrLevel?: string;
    email?: string;
  };
}

@Controller('adaptive')
export class AdaptiveController {
  constructor(private readonly adaptiveService: AdaptiveService) {}

  /**
   * DASH-01/02/04 — GET /api/adaptive/dashboard
   * Returns all dashboard data: user stats, skill scores, recommendation,
   * recently viewed, bookmarked items, pending SRS reviews.
   *
   * Security (T-08-02): userId from JWT only — no path/query param accepted.
   */
  @UseGuards(JwtAuthGuard)
  @Get('dashboard')
  async getDashboard(
    @Request() req: AuthenticatedRequest,
  ): Promise<DashboardDto> {
    return this.adaptiveService.getDashboardData(req.user.userId);
  }

  /**
   * ADPT-03/04/05 — GET /api/adaptive/recommendation
   * Returns the Continue Learning recommendation for the authenticated user.
   * preThreshold=true if activity count < 5; otherwise surfaces lowest-accuracy weak skill.
   *
   * Security (T-08-02): userId from JWT only — no path/query param accepted.
   */
  @UseGuards(JwtAuthGuard)
  @Get('recommendation')
  async getRecommendation(
    @Request() req: AuthenticatedRequest,
  ): Promise<ContinueLearningDto> {
    return this.adaptiveService.getContinueLearningRecommendation(req.user.userId);
  }
}
