/**
 * QuizModule — registers QuizController and QuizService.
 *
 * AuthModule imported to expose JwtAuthGuard.
 * GamificationModule imported to inject GamificationService into QuizService.
 * PrismaService is global via PrismaModule (AppModule) — do NOT import here.
 */

import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { GamificationModule } from "../gamification/gamification.module";
import { QuizController } from "./quiz.controller";
import { QuizService } from "./quiz.service";

@Module({
  imports: [AuthModule, GamificationModule],
  controllers: [QuizController],
  providers: [QuizService],
  exports: [QuizService],
})
export class QuizModule {}
