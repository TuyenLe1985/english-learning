// apps/api/src/search/search.controller.ts
// SRCH-01, SRCH-04 — GET /api/search guarded by JWT.
// SearchModule + registration owned by 08-01b — do NOT edit search.module.ts.

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async search(
    @Query('q') q?: string,
    @Query('level') level?: string,
    @Query('topic') topic?: string,
    @Query('skill') skill?: string,
  ) {
    const query = q ?? '';
    const rows = await this.searchService.search(query, { level, topic, skill });
    return this.searchService.groupResults(query, rows);
  }
}
