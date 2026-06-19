/**
 * SrsModule — registers SrsController, SessionController, and SrsService.
 *
 * AuthModule imported to expose JwtAuthGuard for @UseGuards(JwtAuthGuard).
 * GamificationModule imported to provide GamificationService injection.
 * PrismaService is provided globally via PrismaModule (imported in AppModule) — do NOT import here.
 *
 * SessionController is declared here (not in VocabularyModule) to avoid cross-plan
 * file contention — Plan 02 owns vocabulary.module.ts.
 */

import { Module } from '@nestjs/common';
import { SrsController } from './srs.controller';
import { SessionController } from './session.controller';
import { SrsService } from './srs.service';
import { AuthModule } from '../auth/auth.module';
import { GamificationModule } from '../gamification/gamification.module';

@Module({
  imports: [AuthModule, GamificationModule],
  controllers: [SrsController, SessionController],
  providers: [SrsService],
  exports: [SrsService],
})
export class SrsModule {}
