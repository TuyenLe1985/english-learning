// apps/api/src/adaptive/adaptive.controller.ts
// Skeleton — routes filled in by Plan 08-02.

import { Controller } from '@nestjs/common';
import { AdaptiveService } from './adaptive.service';

@Controller('adaptive')
export class AdaptiveController {
  constructor(private readonly adaptiveService: AdaptiveService) {}
}
