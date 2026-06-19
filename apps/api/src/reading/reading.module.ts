/**
 * ReadingModule — registers ReadingController and ReadingService.
 *
 * AuthModule is imported to expose JwtAuthGuard for @UseGuards(JwtAuthGuard).
 * GamificationModule is imported to provide GamificationService injection.
 * PrismaService is provided globally via PrismaModule (imported in AppModule) — do NOT import here.
 */

import { Module } from '@nestjs/common';
import { ReadingController } from './reading.controller';
import { ReadingService } from './reading.service';
import { AuthModule } from '../auth/auth.module';
import { GamificationModule } from '../gamification/gamification.module';

@Module({
  imports: [AuthModule, GamificationModule],
  controllers: [ReadingController],
  providers: [ReadingService],
  exports: [ReadingService],
})
export class ReadingModule {}
