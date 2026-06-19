/**
 * GamificationModule — exposes GamificationService as a cross-cutting concern
 * and registers GamificationController for the /api/gamification/* endpoints.
 *
 * GamificationService is injected by Grammar, Vocabulary, Reading, Listening, and Quiz modules.
 * GamificationController exposes GET /api/gamification/achievements (JwtAuthGuard-protected).
 * PrismaModule is global (imported in AppModule) — do NOT import here.
 *
 * AuthModule is imported to expose JwtAuthGuard (T-07-17).
 */

import { Module } from "@nestjs/common";
import { GamificationService } from "./gamification.service";
import { GamificationController } from "./gamification.controller";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [AuthModule], // AuthModule provides JwtAuthGuard
  controllers: [GamificationController],
  providers: [GamificationService],
  exports: [GamificationService], // exported so other modules can inject GamificationService
})
export class GamificationModule {}
