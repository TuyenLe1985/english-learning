/**
 * ProfileModule — registers ProfileController and ProfileService.
 *
 * AuthModule imported to expose JwtAuthGuard.
 * ConfigModule is global (registered in AppModule) — ConfigService is auto-available.
 * PrismaModule is global — no import needed here.
 */

import { Module } from '@nestjs/common';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ProfileController],
  providers: [ProfileService],
})
export class ProfileModule {}
