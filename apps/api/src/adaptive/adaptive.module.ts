// apps/api/src/adaptive/adaptive.module.ts
// AdaptiveModule — exports AdaptiveService so Grammar/Vocabulary/Reading/Listening/Quiz
// modules can inject it to call updateSkillScore() (Plan 08-02 fills the implementation).
//
// Pattern: identical to GamificationModule (apps/api/src/gamification/gamification.module.ts).
// AuthModule imported to provide JwtAuthGuard for future controller endpoints.

import { Module } from '@nestjs/common';
import { AdaptiveService } from './adaptive.service';
import { AdaptiveController } from './adaptive.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule], // provides JwtAuthGuard
  controllers: [AdaptiveController],
  providers: [AdaptiveService],
  exports: [AdaptiveService], // exported so Grammar/Vocabulary/Reading/Listening/Quiz can inject
})
export class AdaptiveModule {}
