// Shared analytics DTOs — used by NestJS AnalyticsController and Next.js analytics clients.
// Covers ANLT-01 (student analytics) and ANLT-02 (admin analytics) data contracts.
// Source: .planning/phases/08-adaptive-engine-dashboard-search-analytics/08-01c-PLAN.md

import { z } from "zod";
import { SkillScoreDtoSchema } from "./adaptive.dto";

// ─── Student Analytics ────────────────────────────────────────────────────────
// ANLT-01: CEFR progression, vocab retention, learning time, activity heatmap, skill breakdown

export const CefrProgressionPointSchema = z.object({
  month: z.string(), // e.g. "Jan 2026"
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]), // B1=1, B2=2, C1=3
});

export type CefrProgressionPoint = z.infer<typeof CefrProgressionPointSchema>;

export const VocabRetentionPointSchema = z.object({
  week: z.string(), // e.g. "Week 1", "Jun 14"
  rate: z.number().min(0).max(1), // retention rate 0.0–1.0
});

export type VocabRetentionPoint = z.infer<typeof VocabRetentionPointSchema>;

export const LearningTimePointSchema = z.object({
  date: z.string(), // ISO date string YYYY-MM-DD
  minutes: z.number().min(0),
});

export type LearningTimePoint = z.infer<typeof LearningTimePointSchema>;

export const ActivityHeatmapPointSchema = z.object({
  date: z.string(), // ISO date string YYYY-MM-DD
  count: z.number().int().min(0),
  level: z.union([
    z.literal(0),
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
  ]), // 0=none, 1=low, 2=medium, 3=medium-high, 4=high
});

export type ActivityHeatmapPoint = z.infer<typeof ActivityHeatmapPointSchema>;

export const AnalyticsDtoSchema = z.object({
  cefrProgression: z.array(CefrProgressionPointSchema),
  vocabRetention: z.array(VocabRetentionPointSchema),
  learningTime: z.array(LearningTimePointSchema),
  activityHeatmap: z.array(ActivityHeatmapPointSchema),
  // ANLT-01 "skill breakdown" — per-skill accuracy/isWeak for the student analytics page
  skillBreakdown: z.array(SkillScoreDtoSchema),
});

export type AnalyticsDto = z.infer<typeof AnalyticsDtoSchema>;

// ─── Admin Analytics ──────────────────────────────────────────────────────────
// ANLT-02: DAU/WAU/MAU, retention rate, top content, completion rates, user growth

export const TopContentItemSchema = z.object({
  title: z.string(),
  module: z.string(), // 'grammar' | 'vocabulary' | 'reading' | 'listening' | 'quiz'
  completions: z.number().int().min(0),
});

export type TopContentItem = z.infer<typeof TopContentItemSchema>;

export const CompletionRateByModuleSchema = z.object({
  module: z.string(), // 'grammar' | 'vocabulary' | 'reading' | 'listening' | 'quiz'
  rate: z.number().min(0).max(1), // average completion rate 0.0–1.0
});

export type CompletionRateByModule = z.infer<typeof CompletionRateByModuleSchema>;

export const UserGrowthPointSchema = z.object({
  date: z.string(), // ISO date string YYYY-MM-DD
  total: z.number().int().min(0),
});

export type UserGrowthPoint = z.infer<typeof UserGrowthPointSchema>;

export const AdminAnalyticsDtoSchema = z.object({
  dau: z.number().int().min(0), // daily active users
  wau: z.number().int().min(0), // weekly active users
  mau: z.number().int().min(0), // monthly active users
  retentionRate: z.number().min(0).max(1), // 0.0–1.0
  topContent: z.array(TopContentItemSchema),
  // ANLT-02 "average completion rates by module"
  completionRateByModule: z.array(CompletionRateByModuleSchema),
  userGrowth: z.array(UserGrowthPointSchema),
  lastUpdated: z.string(), // ISO date string — cache timestamp
});

export type AdminAnalyticsDto = z.infer<typeof AdminAnalyticsDtoSchema>;
