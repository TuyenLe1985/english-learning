// apps/api/src/analytics/analytics.controller.ts
// Skeleton — routes filled in by Plan 08-04.
// RolesGuard registered in AnalyticsModule providers for use on admin endpoint.

import { Controller } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}
}
