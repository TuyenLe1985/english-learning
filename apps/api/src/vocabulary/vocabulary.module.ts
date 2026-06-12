/**
 * VocabularyModule — registers VocabularyController and VocabularyService.
 *
 * AuthModule is imported to expose JwtAuthGuard for @UseGuards(JwtAuthGuard).
 * PrismaService is provided globally via PrismaModule (imported in AppModule) — do NOT import here.
 */

import { Module } from '@nestjs/common';
import { VocabularyController } from './vocabulary.controller';
import { VocabularyService } from './vocabulary.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [VocabularyController],
  providers: [VocabularyService],
  exports: [VocabularyService],
})
export class VocabularyModule {}
