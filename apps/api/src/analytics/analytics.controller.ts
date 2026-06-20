// apps/api/src/analytics/analytics.controller.ts
// AnalyticsController — student and admin analytics endpoints.
//
// Security:
//   T-08-09: admin endpoint guarded by @UseGuards(JwtAuthGuard, RolesGuard) + @Roles('ADMIN')
//   T-08-10: student endpoint reads userId from JWT only (req.user.userId) — IDOR prevention
//
// Guard order: JwtAuthGuard MUST precede RolesGuard in @UseGuards() so req.user is populated
// before RolesGuard reads req.user.role. (RESEARCH.md Pattern 3)
//
// Pitfall 3: Use 'ADMIN' literal (not 'USER') — UserRole enum is STUDENT | ADMIN.

import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AnalyticsService } from './analytics.service';

// Type for the decoded JWT payload attached to request.user by JwtAuthGuard
interface AuthenticatedRequest {
  user: {
    userId: string;
    role?: string;
    cefrLevel?: string;
    email?: string;
  };
}

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * ANLT-01 — GET /api/analytics/me
   * Returns student analytics for the authenticated user.
   * Security (T-08-10): userId from JWT only — never from path/query params (IDOR prevention).
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getStudentAnalytics(@Request() req: AuthenticatedRequest) {
    return this.analyticsService.getStudentAnalytics(req.user.userId);
  }

  /**
   * ANLT-02 — GET /api/analytics/admin
   * Returns admin analytics (DAU/WAU/MAU, retention, top content, user growth).
   * Security (T-08-09): guarded by JwtAuthGuard + RolesGuard('ADMIN').
   * Guard order: JwtAuthGuard first (populates req.user), then RolesGuard checks req.user.role.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('admin')
  async getAdminAnalytics() {
    return this.analyticsService.getAdminAnalytics();
  }
}
