/**
 * VocabularyService — NestJS service for vocabulary browsing + personal word list.
 *
 * VOCAB-01: getCategories() — returns 8 fixed categories with live wordCount
 * VOCAB-01: getWordsByCategory() — paginated word list (20/page, A-Z)
 * VOCAB-02: getWordDetail() — full word record; NotFoundException on missing id
 * VOCAB-03: assignExerciseType() + getMatchingGrid() — practice session helpers
 * VOCAB-07: getMyWords() — user's vocabulary items with SRS status + nextReviewDate
 *
 * Security (T-03-03, T-03-04):
 *   - All endpoints protected by JwtAuthGuard (enforced in controller)
 *   - userId always sourced from JWT payload, never request body
 *   - Prisma parameterized queries only (T-03-05)
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type {
  VocabularyWordDto,
  CategoryDto,
  PaginatedWordsDto,
  MyWordDto,
} from '@repo/shared';

// ─── Fixed category map (D-09) ────────────────────────────────────────────────

const CATEGORY_MAP: Record<string, string> = {
  'business': 'Business',
  'travel': 'Travel',
  'technology': 'Technology',
  'education': 'Education',
  'health': 'Health',
  'daily-life': 'Daily Life',
  'social-topics': 'Social Topics',
  'academic-english': 'Academic English',
};

const CATEGORY_SLUGS = Object.keys(CATEGORY_MAP);

// ─── Exercise types (D-05) ────────────────────────────────────────────────────

const EXERCISE_TYPES = [
  'flashcard',
  'matching',
  'context-selection',
  'cloze',
  'synonym-id',
  'recall',
] as const;

type ExerciseType = (typeof EXERCISE_TYPES)[number];

// ─── Prisma field selector ────────────────────────────────────────────────────

const WORD_SELECT = {
  id: true,
  word: true,
  definition: true,
  partOfSpeech: true,
  examples: true,
  synonyms: true,
  pronunciationKey: true,
  audioStorageKey: true,
  cefrLevel: true,
  category: true,
  frequency: true,
} as const;

// ─── SRS status derivation (VOCAB-07) ────────────────────────────────────────

type SrsState = 'New' | 'Learning' | 'Relearning' | 'Review';
type SrsStatus = 'new' | 'learning' | 'reviewing' | 'mastered';

function deriveSrsStatus(
  state: SrsState,
  scheduledDays?: number | null,
): SrsStatus {
  if (state === 'New') return 'new';
  if (state === 'Learning' || state === 'Relearning') return 'learning';
  // Review state: mastered = scheduledDays >= 30, else reviewing
  if (state === 'Review') {
    return (scheduledDays ?? 0) >= 30 ? 'mastered' : 'reviewing';
  }
  return 'reviewing';
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class VocabularyService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * VOCAB-01 — GET /api/vocabulary/categories
   * Returns 8 fixed categories with live word count from DB.
   */
  async getCategories(): Promise<CategoryDto[]> {
    const counts = await Promise.all(
      CATEGORY_SLUGS.map((slug) =>
        this.prisma.vocabularyWord.count({ where: { category: slug } }),
      ),
    );

    return CATEGORY_SLUGS.map((slug, i) => ({
      slug,
      name: CATEGORY_MAP[slug] as string,
      wordCount: counts[i] as number,
      icon: slug, // icon name matches slug; frontend maps to Lucide icon
    }));
  }

  /**
   * VOCAB-01 — GET /api/vocabulary/:category/words
   * Paginated word list for a category, ordered A-Z (D-12).
   */
  async getWordsByCategory(
    category: string,
    page: number,
    limit: number,
  ): Promise<PaginatedWordsDto> {
    const skip = (page - 1) * limit;
    const [words, total] = await Promise.all([
      this.prisma.vocabularyWord.findMany({
        where: { category },
        select: WORD_SELECT,
        orderBy: { word: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.vocabularyWord.count({ where: { category } }),
    ]);
    return {
      words: words as VocabularyWordDto[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * VOCAB-02 — GET /api/vocabulary/:category/:wordId
   * Returns full word detail. Throws NotFoundException when word does not exist.
   */
  async getWordDetail(wordId: string): Promise<VocabularyWordDto> {
    try {
      const word = await this.prisma.vocabularyWord.findUniqueOrThrow({
        where: { id: wordId },
        select: WORD_SELECT,
      });
      return word as VocabularyWordDto;
    } catch (err) {
      // Handle Prisma P2025 (record not found).
      // Covers both real PrismaClientKnownRequestError and test mocks that set err.code.
      if (
        err != null &&
        typeof err === 'object' &&
        'code' in err &&
        (err as { code: string }).code === 'P2025'
      ) {
        throw new NotFoundException(`Word ${wordId} not found`);
      }
      throw err;
    }
  }

  /**
   * VOCAB-07 — GET /api/vocabulary/my-words
   * Returns the user's vocabulary items with derived SRS status and nextReviewDate.
   * Optionally filtered by status.
   */
  async getMyWords(userId: string, status?: string): Promise<MyWordDto[]> {
    const items = await this.prisma.userVocabularyItem.findMany({
      where: { userId },
      include: {
        word: { select: WORD_SELECT },
        srsCard: true,
      },
    });

    const mapped: MyWordDto[] = items.map((item) => {
      const card = item.srsCard as {
        due: Date;
        state: string;
        scheduledDays?: number | null;
        reps?: number;
      } | null;

      const derivedStatus = card
        ? deriveSrsStatus(card.state as SrsState, card.scheduledDays ?? null)
        : 'new';

      return {
        wordId: item.wordId,
        word: item.word.word,
        definition: item.word.definition,
        cefrLevel: item.word.cefrLevel as 'B1' | 'B2' | 'C1',
        status: derivedStatus,
        nextReviewDate: card ? card.due.toISOString() : null,
      };
    });

    if (status) {
      return mapped.filter((m) => m.status === status);
    }
    return mapped;
  }

  /**
   * VOCAB-03 — Assigns a random exercise type to a word.
   * One of: flashcard, matching, context-selection, cloze, synonym-id, recall.
   */
  assignExerciseType(): ExerciseType {
    const idx = Math.floor(Math.random() * EXERCISE_TYPES.length);
    return EXERCISE_TYPES[idx] as ExerciseType;
  }

  /**
   * VOCAB-08 — GET /api/vocabulary/lookup?word=
   * Case-insensitive word lookup. Returns the matching VocabularyWordDto or null
   * when the word is not found (D-13 graceful no-match, not 404).
   */
  async lookupByWord(word: string): Promise<VocabularyWordDto | null> {
    const words = await this.prisma.vocabularyWord.findMany({
      where: { word: { equals: word, mode: 'insensitive' } },
      select: WORD_SELECT,
      take: 1,
    });
    return (words[0] as VocabularyWordDto) ?? null;
  }

  /**
   * VOCAB-03 / D-08 — Returns 4 words for a matching exercise grid.
   * Randomly samples 4 words from the given category.
   */
  async getMatchingGrid(category: string): Promise<VocabularyWordDto[]> {
    // Fetch total to compute a random offset for variety
    const total = await this.prisma.vocabularyWord.count({ where: { category } });
    const skip = total > 4 ? Math.floor(Math.random() * (total - 4)) : 0;
    const words = await this.prisma.vocabularyWord.findMany({
      where: { category },
      select: WORD_SELECT,
      skip,
      take: 4,
    });
    return words as VocabularyWordDto[];
  }
}
