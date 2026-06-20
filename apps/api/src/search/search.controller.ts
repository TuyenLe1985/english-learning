// apps/api/src/search/search.controller.ts
// Skeleton — routes filled in by Plan 08-03.

import { Controller } from '@nestjs/common';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}
}
