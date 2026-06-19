/**
 * QuizController — NestJS controller for quiz session management.
 *
 * QUIZ-01: POST /api/quiz/sessions/start    — start a new quiz session
 * QUIZ-03: POST /api/quiz/sessions/:id/complete — submit answers + get results
 * QUIZ-04: GET  /api/quiz/sessions/:id/mistakes — return incorrect answers
 *
 * Security:
 *   - @UseGuards(JwtAuthGuard) on every endpoint
 *   - userId ALWAYS from req.user.userId (JWT payload), NEVER from request body (T-07-09)
 *   - Zod parse in controller body rejects malformed payloads before service layer
 *
 * Route ordering (Pitfall 5): fixed-string route 'sessions/start' declared BEFORE
 * parameterized routes 'sessions/:id/complete' and 'sessions/:id/mistakes' to prevent
 * NestJS from treating the literal "start" as the :id param value.
 */

import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Request,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { QuizService } from "./quiz.service";
import type {
  QuizStartResponseDto,
  QuizCompleteResponseDto,
  QuizMistakesDto,
} from "@repo/shared";
import { QuizStartSchema, QuizCompleteSchema } from "@repo/shared";

// Type for the decoded JWT payload attached to request.user by JwtAuthGuard
interface AuthenticatedRequest {
  user: {
    userId: string;
    role?: string;
    cefrLevel?: string;
    email?: string;
  };
}

@Controller("quiz")
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  /**
   * FIXED-STRING route — declared FIRST (Pitfall 5 / Route Shadowing).
   * POST /api/quiz/sessions/start
   */
  @UseGuards(JwtAuthGuard)
  @Post("sessions/start")
  async startSession(
    @Request() req: AuthenticatedRequest,
    @Body() body: unknown,
  ): Promise<QuizStartResponseDto> {
    const dto = QuizStartSchema.parse(body);
    return this.quizService.startSession(req.user.userId, dto);
  }

  /**
   * PARAMETERIZED route — declared AFTER fixed-string routes.
   * POST /api/quiz/sessions/:id/complete
   */
  @UseGuards(JwtAuthGuard)
  @Post("sessions/:id/complete")
  async completeSession(
    @Param("id") id: string,
    @Request() req: AuthenticatedRequest,
    @Body() body: unknown,
  ): Promise<QuizCompleteResponseDto> {
    const dto = QuizCompleteSchema.parse(body);
    return this.quizService.completeSession(req.user.userId, id, dto);
  }

  /**
   * PARAMETERIZED route — declared AFTER fixed-string routes.
   * GET /api/quiz/sessions/:id/mistakes
   */
  @UseGuards(JwtAuthGuard)
  @Get("sessions/:id/mistakes")
  async getMistakes(
    @Param("id") id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<QuizMistakesDto> {
    return this.quizService.getMistakes(req.user.userId, id);
  }
}
