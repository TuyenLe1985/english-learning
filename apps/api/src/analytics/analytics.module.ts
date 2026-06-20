// apps/api/src/analytics/analytics.module.ts
// AnalyticsModule — student analytics (GET /api/analytics/me) + admin analytics (GET /api/analytics/admin).
//
// Pattern: same as GamificationModule (apps/api/src/gamification/gamification.module.ts).
// AuthModule imported to provide JwtAuthGuard.
// RolesGuard registered as a provider so Plan 08-04 can use @UseGuards(JwtAuthGuard, RolesGuard)
// on the admin endpoint without importing it from a separate module.
// RedisCacheService registered here — NOT in app.module.ts (plan constraint).

import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { RedisCacheService } from './redis-cache.service';
import { AuthModule } from '../auth/auth.module';
import { RolesGuard } from '../auth/roles.guard';

@Module({
  imports: [AuthModule], // provides JwtAuthGuard
  controllers: [AnalyticsController],
  providers: [AnalyticsService, RedisCacheService, RolesGuard],
})
export class AnalyticsModule {}
