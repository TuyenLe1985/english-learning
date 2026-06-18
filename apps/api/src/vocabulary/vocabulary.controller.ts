/**
 * VocabularyController — NestJS controller for vocabulary browsing + personal word list.
 *
 * VOCAB-01: GET /api/vocabulary/categories — 8 categories with word counts
 * VOCAB-01: GET /api/vocabulary/:category/words — paginated word list (20/page, A-Z)
 * VOCAB-02: GET /api/vocabulary/:category/:wordId — full word detail
 * VOCAB-07: GET /api/vocabulary/my-words — personal word list filtered by SRS status
 * VOCAB-08: GET /api/vocabulary/lookup?word= — case-insensitive word lookup (null on miss)
 *
 * Security (T-03-03):
 *   - @UseGuards(JwtAuthGuard) applied to every endpoint
 *   - userId always sourced from req.user.userId (JWT payload), never request body
 */

import {
  Controller,
  Get,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { VocabularyService } from './vocabulary.service';
import type {
  VocabularyWordDto,
  PaginatedWordsDto,
  CategoryDto,
  MyWordDto,
} from '@repo/shared';

// Type for the decoded JWT payload attached to request.user by JwtAuthGuard
interface AuthenticatedRequest {
  user: {
    userId: string;
    role?: string;
    cefrLevel?: string;
    email?: string;
  };
}

@Controller('vocabulary')
export class VocabularyController {
  constructor(private readonly vocabularyService: VocabularyService) {}

  /**
   * VOCAB-01 — GET /api/vocabulary/categories
   * Returns the 8 fixed categories with live word counts.
   */
  @UseGuards(JwtAuthGuard)
  @Get('categories')
  async getCategories(): Promise<CategoryDto[]> {
    return this.vocabularyService.getCategories();
  }

  /**
   * VOCAB-07 — GET /api/vocabulary/my-words
   * Returns the authenticated user's vocabulary items with SRS status.
   * Optional query param: status (new | learning | reviewing | mastered)
   *
   * NOTE: This route must appear before :category/words to avoid NestJS
   * route matching "my-words" as a :category parameter.
   */
  @UseGuards(JwtAuthGuard)
  @Get('my-words')
  async getMyWords(
    @Request() req: AuthenticatedRequest,
    @Query('status') status?: string,
  ): Promise<MyWordDto[]> {
    return this.vocabularyService.getMyWords(req.user.userId, status);
  }

  /**
   * VOCAB-08 — GET /api/vocabulary/lookup?word=
   * Case-insensitive word lookup for the word-tap popover in the passage reader.
   * Returns null (HTTP 200) when the word is not found — NOT a 404 (D-13).
   *
   * NOTE: Declared before :category/words to prevent NestJS route shadowing.
   */
  @UseGuards(JwtAuthGuard)
  @Get('lookup')
  async lookupWord(
    @Query('word') word: string,
  ): Promise<VocabularyWordDto | null> {
    return this.vocabularyService.lookupByWord((word ?? '').toLowerCase().trim());
  }

  /**
   * VOCAB-01 — GET /api/vocabulary/:category/words
   * Returns paginated word list for a category (20/page, A-Z by default).
   * Query params: page (default 1), limit (default 20).
   */
  @UseGuards(JwtAuthGuard)
  @Get(':category/words')
  async getWordsByCategory(
    @Param('category') category: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ): Promise<PaginatedWordsDto> {
    const parsedPage = Math.max(1, parseInt(String(page), 10) || 1);
    const parsedLimit = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20));
    return this.vocabularyService.getWordsByCategory(category, parsedPage, parsedLimit);
  }

  /**
   * VOCAB-02 — GET /api/vocabulary/:category/:wordId
   * Returns full word detail (definition, examples, synonyms, pronunciation key).
   * Throws 404 if wordId does not exist.
   */
  @UseGuards(JwtAuthGuard)
  @Get(':category/:wordId')
  async getWordDetail(
    @Param('wordId') wordId: string,
  ): Promise<VocabularyWordDto> {
    return this.vocabularyService.getWordDetail(wordId);
  }
}
