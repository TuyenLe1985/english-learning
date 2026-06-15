// Shared listening DTOs — used by NestJS controllers (response shaping) and Next.js clients (type-safe fetch).
// Covers LIST-01 through LIST-07 data contracts.
// Source: .planning/phases/06-listening-comprehension/06-RESEARCH.md §Listening DTO Schema

import { z } from "zod";

// ─── Word Timestamp (from Whisper forced alignment) ───────────────────────────

export const WordTimestampSchema = z.object({
  word: z.string(),
  start: z.number(), // seconds
  end: z.number(), // seconds
});

// ─── Listening Item (browse card) ─────────────────────────────────────────────

export const ListeningItemDtoSchema = z.object({
  id: z.string(),
  title: z.string(),
  contentType: z.enum(["CONVERSATION", "INTERVIEW", "PODCAST", "LECTURE", "NEWS_REPORT"]),
  cefrLevel: z.enum(["B1", "B2", "C1"]),
  topic: z.string().nullable(),
  durationSec: z.number().nullable(),
  questionCount: z.number(),
});

// ─── Listening Question ───────────────────────────────────────────────────────

export const ListeningQuestionDtoSchema = z.object({
  id: z.string(),
  exerciseType: z.enum(["MULTIPLE_CHOICE", "FILL_MISSING_WORDS", "DICTATION"]),
  prompt: z.string(),
  answer: z.string(),
  distractors: z.array(z.string()),
  explanation: z.string().nullable(),
  timestampSec: z.number().nullable(), // for dictation clip start
  xpReward: z.number(),
  sortOrder: z.number(),
});

// ─── Listening Item Detail (item + questions + progress) ─────────────────────

export const ListeningItemDetailDtoSchema = ListeningItemDtoSchema.extend({
  audioUrl: z.string(), // presigned S3 URL (1-hour expiry)
  transcriptText: z.string(),
  wordTimestamps: z.array(WordTimestampSchema).nullable(),
  questions: z.array(ListeningQuestionDtoSchema),
  progress: z
    .object({
      score: z.number(),
      accuracy: z.number(),
    })
    .nullable(),
});

// ─── Session Complete (client → server) ──────────────────────────────────────

export const ListeningSessionCompleteSchema = z.object({
  contentId: z.string(),
  score: z.number(),
  accuracy: z.number(),
  attempts: z.array(
    z.object({
      questionId: z.string(),
      isCorrect: z.boolean(),
      userAnswer: z.string().optional(),
    }),
  ),
});

// ─── Paginated Listening Items (server → client) ─────────────────────────────

export const PaginatedListeningItemsDtoSchema = z.object({
  items: z.array(ListeningItemDtoSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
});

// ─── Session Result (server → client) ────────────────────────────────────────

export const ListeningSessionResultDtoSchema = z.object({
  score: z.number(),
  accuracy: z.number(),
  xpEarned: z.number(),
  contentId: z.string(),
});

// ─── Inferred TypeScript types ────────────────────────────────────────────────

export type WordTimestamp = z.infer<typeof WordTimestampSchema>;
export type ListeningItemDto = z.infer<typeof ListeningItemDtoSchema>;
export type ListeningQuestionDto = z.infer<typeof ListeningQuestionDtoSchema>;
export type ListeningItemDetailDto = z.infer<typeof ListeningItemDetailDtoSchema>;
export type ListeningSessionCompleteDto = z.infer<typeof ListeningSessionCompleteSchema>;
export type PaginatedListeningItemsDto = z.infer<typeof PaginatedListeningItemsDtoSchema>;
export type ListeningSessionResultDto = z.infer<typeof ListeningSessionResultDtoSchema>;
