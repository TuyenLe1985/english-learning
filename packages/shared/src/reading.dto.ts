// Shared reading DTOs — used by NestJS controllers (response shaping) and Next.js clients (type-safe fetch).
// Covers READ-01 through READ-07 data contracts.
// Source: .planning/phases/05-reading-comprehension-content-pipeline/05-PATTERNS.md §packages/shared/src/reading.dto.ts

import { z } from "zod";

// ─── Reading Passage (browse card) ───────────────────────────────────────────

export const ReadingPassageDtoSchema = z.object({
  id: z.string(),
  title: z.string(),
  contentType: z.enum(["ARTICLE", "NEWS", "BLOG_POST", "ACADEMIC", "STORY", "OPINION"]),
  cefrLevel: z.enum(["B1", "B2", "C1"]),
  cefrConfidence: z.number(),
  topic: z.string().nullable(),
  wordCount: z.number(),
  questionCount: z.number(),
  isBookmarked: z.boolean(),
});

// ─── Reading Question ─────────────────────────────────────────────────────────

export const ReadingQuestionDtoSchema = z.object({
  id: z.string(),
  questionType: z.string(),
  prompt: z.string(),
  answer: z.string(),
  distractors: z.array(z.string()),
  explanation: z.string().nullable(),
  xpReward: z.number(),
  sortOrder: z.number(),
});

// ─── Highlight ────────────────────────────────────────────────────────────────

export const HighlightDtoSchema = z.object({
  id: z.string(),
  passageId: z.string(),
  startOffset: z.number(),
  endOffset: z.number(),
  text: z.string(),
});

// ─── Reading Passage Detail (passage + questions + annotations) ───────────────

export const ReadingPassageDetailDtoSchema = ReadingPassageDtoSchema.extend({
  content: z.string(),
  questions: z.array(ReadingQuestionDtoSchema),
  highlights: z.array(HighlightDtoSchema),
  note: z.string().nullable(),
  progress: z
    .object({
      score: z.number(),
      accuracy: z.number(),
      readingTimeSec: z.number(),
    })
    .nullable(),
});

// ─── Session Complete (client → server) ──────────────────────────────────────

export const ReadingSessionCompleteSchema = z.object({
  passageId: z.string(),
  score: z.number(),
  accuracy: z.number(),
  readingTimeSec: z.number(),
  attempts: z.array(
    z.object({
      questionId: z.string(),
      isCorrect: z.boolean(),
      userAnswer: z.string().optional(),
    }),
  ),
});

// ─── Highlight Create (client → server) ──────────────────────────────────────

export const HighlightCreateSchema = z.object({
  passageId: z.string(),
  startOffset: z.number(),
  endOffset: z.number(),
  text: z.string(),
});

// ─── Note Upsert (client → server) ───────────────────────────────────────────

export const NoteUpsertSchema = z.object({
  passageId: z.string(),
  content: z.string(),
});

// ─── Bookmark Toggle (client → server) ───────────────────────────────────────

export const BookmarkToggleSchema = z.object({
  passageId: z.string(),
});

// ─── Inferred TypeScript types ────────────────────────────────────────────────

export type ReadingPassageDto = z.infer<typeof ReadingPassageDtoSchema>;
export type ReadingPassageDetailDto = z.infer<typeof ReadingPassageDetailDtoSchema>;
export type ReadingQuestionDto = z.infer<typeof ReadingQuestionDtoSchema>;
export type HighlightDto = z.infer<typeof HighlightDtoSchema>;
export type ReadingSessionCompleteDto = z.infer<typeof ReadingSessionCompleteSchema>;
export type HighlightCreateDto = z.infer<typeof HighlightCreateSchema>;
export type NoteUpsertDto = z.infer<typeof NoteUpsertSchema>;
export type BookmarkToggleDto = z.infer<typeof BookmarkToggleSchema>;
