// apps/api/src/adaptive/adaptive.service.ts
// Skeleton — implementation filled in by Plan 08-02.
// PrismaModule is global (imported in AppModule) — no need to import it here.

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdaptiveService {
  constructor(private readonly prisma: PrismaService) {}
}
