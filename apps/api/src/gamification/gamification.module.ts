/**
 * GamificationModule — no controller; GamificationService is a cross-cutting concern
 * injected by Grammar, Vocabulary, Reading, Listening, and Quiz modules.
 *
 * PrismaModule is global (imported in AppModule) — do NOT import here.
 */

import { Module } from "@nestjs/common";
import { GamificationService } from "./gamification.service";

@Module({
  imports: [], // PrismaModule is global — no import needed
  providers: [GamificationService],
  exports: [GamificationService], // exported so other modules can inject GamificationService
})
export class GamificationModule {}
