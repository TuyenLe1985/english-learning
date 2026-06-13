// Shared grammar DTOs — used by NestJS controllers (response shaping) and Next.js clients (type-safe fetch).
// Covers GRAM-01 through GRAM-06 data contracts.
// Source: .planning/phases/04-grammar-module/04-RESEARCH.md — Pattern 6

import { z } from "zod";

// ─── Grammar Area ─────────────────────────────────────────────────────────────

export const GrammarAreaDtoSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  topicCount: z.number(),
  sortOrder: z.number(),
});

// ─── Grammar Topic ────────────────────────────────────────────────────────────

export const GrammarTopicDtoSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  cefrLevel: z.enum(["B1", "B2", "C1"]),
  lessonCount: z.number(),
  masteryPct: z.number().nullable(),
  sortOrder: z.number(),
});

// ─── Grammar Lesson ───────────────────────────────────────────────────────────

export const GrammarLessonDtoSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  explanation: z.string(),
  examples: z.array(z.string()),
  sortOrder: z.number(),
});

// ─── Grammar Question ─────────────────────────────────────────────────────────

export const GrammarQuestionDtoSchema = z.object({
  id: z.string(),
  exerciseType: z.enum([
    "MULTIPLE_CHOICE",
    "FILL_IN_THE_BLANK",
    "SENTENCE_TRANSFORMATION",
    "ERROR_CORRECTION",
    "DRAG_AND_DROP",
  ]),
  prompt: z.string(),
  answer: z.string(),
  distractors: z.array(z.string()),
  explanation: z.string().nullable(),
  difficulty: z.number(),
  xpReward: z.number(),
});

// ─── Grammar Lesson Detail (lesson + questions) ───────────────────────────────

export const GrammarLessonDetailDtoSchema = GrammarLessonDtoSchema.extend({
  questions: z.array(GrammarQuestionDtoSchema),
});

// ─── Grammar Topic Detail (topic + lessons with question count) ───────────────

export const GrammarTopicDetailDtoSchema = z.object({
  topic: GrammarTopicDtoSchema,
  lessons: z.array(
    GrammarLessonDtoSchema.extend({
      questionCount: z.number(),
    }),
  ),
});

// ─── Session Complete (client → server) ──────────────────────────────────────

export const GrammarSessionCompleteSchema = z.object({
  lessonId: z.string(),
  attempts: z.array(
    z.object({
      questionId: z.string(),
      isCorrect: z.boolean(),
      userAnswer: z.string().optional(),
    }),
  ),
  timeTakenMs: z.number().optional(),
});

// ─── Session Result (server → client) ────────────────────────────────────────

export const GrammarSessionResultDtoSchema = z.object({
  score: z.number(),
  total: z.number(),
  masteryPct: z.number(),
});

// ─── Inferred TypeScript types ────────────────────────────────────────────────

export type GrammarAreaDto = z.infer<typeof GrammarAreaDtoSchema>;
export type GrammarTopicDto = z.infer<typeof GrammarTopicDtoSchema>;
export type GrammarLessonDto = z.infer<typeof GrammarLessonDtoSchema>;
export type GrammarQuestionDto = z.infer<typeof GrammarQuestionDtoSchema>;
export type GrammarLessonDetailDto = z.infer<typeof GrammarLessonDetailDtoSchema>;
export type GrammarTopicDetailDto = z.infer<typeof GrammarTopicDetailDtoSchema>;
export type GrammarSessionCompleteDto = z.infer<typeof GrammarSessionCompleteSchema>;
export type GrammarSessionResultDto = z.infer<typeof GrammarSessionResultDtoSchema>;
