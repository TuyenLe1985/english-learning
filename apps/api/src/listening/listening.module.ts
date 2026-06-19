/**
 * ListeningModule — registers ListeningController and ListeningService.
 *
 * AuthModule is imported to expose JwtAuthGuard for @UseGuards(JwtAuthGuard).
 * GamificationModule is imported to provide GamificationService injection.
 * PrismaService is provided globally via PrismaModule (imported in AppModule) — do NOT import here.
 */

import { Module } from '@nestjs/common';
import { ListeningController } from './listening.controller';
import { ListeningService } from './listening.service';
import { AuthModule } from '../auth/auth.module';
import { GamificationModule } from '../gamification/gamification.module';

@Module({
  imports: [AuthModule, GamificationModule],
  controllers: [ListeningController],
  providers: [ListeningService],
  exports: [ListeningService],
})
export class ListeningModule {}
