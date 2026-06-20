// apps/api/src/search/search.module.ts
// SearchModule — provides full-text search across vocabulary, grammar, reading, listening.
// Implementation filled in by Plan 08-03.
//
// Pattern: same as GamificationModule (apps/api/src/gamification/gamification.module.ts).
// AuthModule imported to provide JwtAuthGuard for search endpoints.

import { Module } from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule], // provides JwtAuthGuard
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
