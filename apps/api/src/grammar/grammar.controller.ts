/**
 * GrammarController — NestJS controller for grammar browsing + session management.
 *
 * GRAM-01: GET /api/grammar/areas — all areas with topicCount
 * GRAM-01: GET /api/grammar/areas/:areaSlug/topics — topics in an area
 * GRAM-01: GET /api/grammar/topics/:topicSlug/lessons — lessons in a topic (with masteryPct)
 * GRAM-02: GET /api/grammar/lessons/:lessonSlug — full lesson detail + questions
 * GRAM-04: POST /api/grammar/sessions/complete — record session + update mastery
 * GRAM-06: GET /api/grammar/topics/:topicSlug/weak-questions — questions with recent incorrect attempt
 *
 * Security (T-04-03, T-04-04):
 *   - @UseGuards(JwtAuthGuard) applied to every endpoint
 *   - userId always sourced from req.user.userId (JWT payload), never request body
 *
 * Route order (Pitfall 1): fixed-string routes declared BEFORE parameterized routes
 * within the same HTTP method to prevent NestJS from matching literal strings as param values.
 */

import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GrammarService } from './grammar.service';
import type {
  GrammarAreaDto,
  GrammarTopicDto,
  GrammarTopicDetailDto,
  GrammarLessonDetailDto,
  GrammarQuestionDto,
  GrammarSessionResultDto,
} from '@repo/shared';
import { GrammarSessionCompleteSchema } from '@repo/shared';

// Type for the decoded JWT payload attached to request.user by JwtAuthGuard
interface AuthenticatedRequest {
  user: {
    userId: string;
    role?: string;
    cefrLevel?: string;
    email?: string;
  };
}

@Controller('grammar')
export class GrammarController {
  constructor(private readonly grammarService: GrammarService) {}

  /**
   * GRAM-01 — GET /api/grammar/areas
   * Returns all grammar areas with topicCount.
   * Fixed-string route — declared FIRST to avoid conflict with :areaSlug routes.
   */
  @UseGuards(JwtAuthGuard)
  @Get('areas')
  async getAreas(): Promise<GrammarAreaDto[]> {
    return this.grammarService.getAreas();
  }

  /**
   * GRAM-04 — POST /api/grammar/sessions/complete
   * Records session attempts and upserts GrammarProgress mastery.
   * Fixed-string POST — declared BEFORE any param POST routes.
   *
   * Security (T-04-03): userId from JWT only; body.userId is ignored.
   * Security (T-04-06): GrammarSessionCompleteSchema.parse rejects malformed payloads.
   */
  @UseGuards(JwtAuthGuard)
  @Post('sessions/complete')
  async completeSession(
    @Request() req: AuthenticatedRequest,
    @Body() body: unknown,
  ): Promise<GrammarSessionResultDto> {
    const dto = GrammarSessionCompleteSchema.parse(body);
    return this.grammarService.completeSession(req.user.userId, dto);
  }

  /**
   * GRAM-01 — GET /api/grammar/areas/:areaSlug/topics
   * Returns topics in a grammar area.
   */
  @UseGuards(JwtAuthGuard)
  @Get('areas/:areaSlug/topics')
  async getTopicsByArea(
    @Param('areaSlug') areaSlug: string,
  ): Promise<GrammarTopicDto[]> {
    return this.grammarService.getTopicsByArea(areaSlug);
  }

  /**
   * GRAM-01 — GET /api/grammar/topics/:topicSlug/lessons
   * Returns topic detail + lesson list for a topic. Passes userId for masteryPct.
   *
   * Security: userId from JWT, not from query param.
   */
  @UseGuards(JwtAuthGuard)
  @Get('topics/:topicSlug/lessons')
  async getLessonsByTopic(
    @Param('topicSlug') topicSlug: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<GrammarTopicDetailDto> {
    return this.grammarService.getLessonsByTopic(topicSlug, req.user.userId);
  }

  /**
   * GRAM-06 — GET /api/grammar/topics/:topicSlug/weak-questions
   * Returns questions whose most-recent attempt by this user was incorrect.
   *
   * Security (T-04-07): userId from JWT; cross-user attempts never returned.
   */
  @UseGuards(JwtAuthGuard)
  @Get('topics/:topicSlug/weak-questions')
  async getWeakQuestions(
    @Param('topicSlug') topicSlug: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<GrammarQuestionDto[]> {
    return this.grammarService.getWeakQuestionsBySlug(
      req.user.userId,
      topicSlug,
    );
  }

  /**
   * GRAM-02 — GET /api/grammar/lessons/:lessonSlug
   * Returns full lesson detail (explanation, examples, questions).
   * Throws 404 if lessonSlug does not exist.
   */
  @UseGuards(JwtAuthGuard)
  @Get('lessons/:lessonSlug')
  async getLessonDetail(
    @Param('lessonSlug') lessonSlug: string,
  ): Promise<GrammarLessonDetailDto> {
    return this.grammarService.getLessonDetail(lessonSlug);
  }
}
