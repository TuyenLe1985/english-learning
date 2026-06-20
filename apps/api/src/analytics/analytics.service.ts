// apps/api/src/analytics/analytics.service.ts
// Skeleton — implementation filled in by Plan 08-04.
// PrismaModule is global (imported in AppModule) — no need to import it here.

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}
}
