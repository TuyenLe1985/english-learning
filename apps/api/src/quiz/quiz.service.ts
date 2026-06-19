/**
 * QuizService stub — full implementation in Plan 07-03.
 *
 * This stub exists so quiz.service.spec.ts compiles and imports correctly.
 * All methods throw 'not implemented' — tests should FAIL (RED state).
 */

import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { GamificationService } from "../gamification/gamification.service";
import type {
  QuizStartDto,
  QuizCompleteDto,
  QuizStartResponseDto,
  QuizCompleteResponseDto,
  QuizMistakesDto,
} from "@repo/shared";

@Injectable()
export class QuizService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gamification: GamificationService,
  ) {}

  async startSession(
    _userId: string,
    _dto: QuizStartDto,
  ): Promise<QuizStartResponseDto> {
    throw new Error("not implemented");
  }

  async completeSession(
    _userId: string,
    _sessionId: string,
    _dto: QuizCompleteDto,
  ): Promise<QuizCompleteResponseDto> {
    throw new Error("not implemented");
  }

  async getMistakes(
    _userId: string,
    _sessionId: string,
  ): Promise<QuizMistakesDto> {
    throw new Error("not implemented");
  }
}
