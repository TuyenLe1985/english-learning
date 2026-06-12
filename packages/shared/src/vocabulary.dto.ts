// Shared vocabulary + SRS DTOs — used by NestJS controllers (response shaping) and Next.js clients (type-safe fetch).
// Covers VOCAB-01 through VOCAB-07 data contracts.
// Source: .planning/phases/03-vocabulary-module-srs-core/03-PATTERNS.md — vocabulary.dto.ts section

import { z } from "zod";

// ─── Vocabulary Word ──────────────────────────────────────────────────────────

export const VocabularyWordDtoSchema = z.object({
  id: z.string(),
  word: z.string(),
  definition: z.string(),
  partOfSpeech: z.string().nullable(),
  examples: z.array(z.string()),
  synonyms: z.array(z.string()),
  pronunciationKey: z.string().nullable(),
  audioStorageKey: z.string().nullable(),
  cefrLevel: z.enum(["B1", "B2", "C1"]),
  category: z.string().nullable(),
  frequency: z.number(),
});

// ─── Category ────────────────────────────────────────────────────────────────

export const CategoryDtoSchema = z.object({
  slug: z.string(),
  name: z.string(),
  wordCount: z.number(),
  icon: z.string(), // Lucide icon name string
});

// ─── Paginated Words ──────────────────────────────────────────────────────────

export const PaginatedWordsDtoSchema = z.object({
  words: z.array(VocabularyWordDtoSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
});

// ─── Enroll / Review / Session ───────────────────────────────────────────────

export const EnrollWordSchema = z.object({
  wordId: z.string(),
  contextSentence: z.string().optional(),
});

export const ReviewSubmitSchema = z.object({
  cardId: z.string(),
  rating: z.enum(["Again", "Hard", "Good", "Easy"]),
});

export const SessionCompleteSchema = z.object({
  categorySlug: z.string(),
  answers: z.array(
    z.object({
      wordId: z.string(),
      exerciseType: z.string(),
      isCorrect: z.boolean(),
    }),
  ),
  timeTakenMs: z.number().optional(),
});

// ─── Session Result ───────────────────────────────────────────────────────────

export const SessionResultDtoSchema = z.object({
  score: z.number(),
  total: z.number(),
  wrongWordIds: z.array(z.string()),
  timeTakenMs: z.number().optional(),
});

// ─── My Words ────────────────────────────────────────────────────────────────

export const MyWordDtoSchema = z.object({
  wordId: z.string(),
  word: z.string(),
  definition: z.string(),
  cefrLevel: z.enum(["B1", "B2", "C1"]),
  status: z.enum(["new", "learning", "reviewing", "mastered"]),
  nextReviewDate: z.string().nullable(),
});

// ─── Inferred TypeScript types ────────────────────────────────────────────────

export type VocabularyWordDto = z.infer<typeof VocabularyWordDtoSchema>;
export type CategoryDto = z.infer<typeof CategoryDtoSchema>;
export type PaginatedWordsDto = z.infer<typeof PaginatedWordsDtoSchema>;
export type EnrollWordDto = z.infer<typeof EnrollWordSchema>;
export type ReviewSubmitDto = z.infer<typeof ReviewSubmitSchema>;
export type SessionCompleteDto = z.infer<typeof SessionCompleteSchema>;
export type SessionResultDto = z.infer<typeof SessionResultDtoSchema>;
export type MyWordDto = z.infer<typeof MyWordDtoSchema>;
