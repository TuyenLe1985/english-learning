/**
 * GrammarModule — registers GrammarController and GrammarService.
 *
 * AuthModule is imported to expose JwtAuthGuard for @UseGuards(JwtAuthGuard).
 * PrismaService is provided globally via PrismaModule (imported in AppModule) — do NOT import here.
 */

import { Module } from '@nestjs/common';
import { GrammarController } from './grammar.controller';
import { GrammarService } from './grammar.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [GrammarController],
  providers: [GrammarService],
  exports: [GrammarService],
})
export class GrammarModule {}
