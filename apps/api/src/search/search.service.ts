// apps/api/src/search/search.service.ts
// Skeleton — implementation filled in by Plan 08-03.
// PrismaModule is global (imported in AppModule) — no need to import it here.

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}
}
