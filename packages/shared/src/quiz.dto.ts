// Shared quiz DTOs — used by NestJS controllers (response shaping) and Next.js clients (type-safe fetch).
// Covers QUIZ-01 through QUIZ-05 and GAME-01 through GAME-05 data contracts.
// Source: .planning/phases/07-quiz-center-gamification/07-PATTERNS.md §quiz.dto.ts section

import { z } from "zod";

// ─── Inbound DTOs (client → API) ─────────────────────────────────────────────

export const QuizStartSchema = z.object({
  type: z.enum([
    "MIXED",
    "technology",
    "travel",
    "business",
    "daily-communication",
    "education",
  ]),
});

export const QuizAnswerItemSchema = z.object({
  questionRef: z.string(), // "{type}:{id}" e.g. "grammar:clxyz123"
  skillArea: z.enum(["GRAMMAR", "VOCABULARY", "READING", "LISTENING"]),
  userAnswer: z.string(),
  correctAnswer: z.string(),
  isCorrect: z.boolean(),
});

export const QuizCompleteSchema = z.object({
  timeTakenSec: z.number().int().min(0),
  answers: z.array(QuizAnswerItemSchema).min(1).max(10),
});

// ─── Inferred TypeScript types ─────────────────────────────────────────────────

export type QuizStartDto = z.infer<typeof QuizStartSchema>;
export type QuizCompleteDto = z.infer<typeof QuizCompleteSchema>;
export type QuizAnswerItemDto = z.infer<typeof QuizAnswerItemSchema>;

// ─── Outbound DTOs (API → client) — plain TS interfaces ──────────────────────

export interface QuizQuestionDto {
  questionRef: string; // "{type}:{id}"
  skillArea: "GRAMMAR" | "VOCABULARY" | "READING" | "LISTENING";
  prompt: string;
  answer: string;
  distractors: string[];
  explanation: string | null;
}

export interface QuizStartResponseDto {
  sessionId: string;
  questions: QuizQuestionDto[];
}

export interface AchievementDto {
  id: string;
  slug: string;
  name: string;
  description: string;
  iconUrl: string | null;
  xpReward: number;
}

export interface QuizCompleteResponseDto {
  score: number;
  accuracy: number;
  xpEarned: number;
  levelUp: boolean;
  newLevel: number;
  newAchievements: AchievementDto[];
  incorrectAnswers: QuizQuestionDto[]; // for client-side mistake review (Pitfall 4)
}

export interface QuizMistakesDto {
  incorrectAnswers: QuizQuestionDto[];
}
