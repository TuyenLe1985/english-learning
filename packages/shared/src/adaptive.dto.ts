// Shared adaptive/dashboard DTOs — used by NestJS AdaptiveController and Next.js dashboard clients.
// Covers ADPT-01 through ADPT-05 and DASH-01 through DASH-04 data contracts.
// Source: .planning/phases/08-adaptive-engine-dashboard-search-analytics/08-01c-PLAN.md

import { z } from "zod";

// ─── Skill Score ──────────────────────────────────────────────────────────────

export const SkillScoreDtoSchema = z.object({
  skillArea: z.string(), // e.g. 'GRAMMAR' | 'VOCABULARY' | 'READING' | 'LISTENING' | 'MIXED'
  accuracy: z.number().min(0).max(1), // 0.0–1.0
  isWeak: z.boolean(),
});

export type SkillScoreDto = z.infer<typeof SkillScoreDtoSchema>;

// ─── Continue Learning Recommendation ────────────────────────────────────────
// ADPT-03: surfaces lowest-accuracy weak skill; ADPT-04: surfacing next tier when mastery >= 80%
// ADPT-05: preThreshold=true when ActivityLog count < 5

export const ContinueLearningDtoSchema = z.object({
  preThreshold: z.boolean(),
  weakestSkill: z.string().optional(), // SkillArea enum value
  accuracy: z.number().min(0).max(1).optional(),
  recommendedModule: z.string().optional(), // e.g. 'GRAMMAR', 'VOCABULARY'
  recommendedNextTier: z.string().optional(), // e.g. 'B2', 'C1' — returned when accuracy >= 0.8
});

export type ContinueLearningDto = z.infer<typeof ContinueLearningDtoSchema>;

// ─── Recently Viewed / Bookmarked Items ──────────────────────────────────────

export const ContentItemDtoSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: z.string(), // 'reading' | 'listening' | 'grammar' | 'vocabulary' | 'quiz'
  cefrLevel: z.enum(["B1", "B2", "C1"]).nullable(),
});

export type ContentItemDto = z.infer<typeof ContentItemDtoSchema>;

// ─── Dashboard DTO ────────────────────────────────────────────────────────────
// DASH-01: user stats + skill scores + lessons completed + recommendation
// DASH-02: recommendation + recently viewed + bookmarked + pending reviews
// DASH-04: recently viewed (last 4) + bookmarked (last 4)

export const DashboardDtoSchema = z.object({
  user: z.object({
    name: z.string(),
    xpTotal: z.number().int().min(0),
    level: z.number().int().min(1),
    cefrLevel: z.enum(["B1", "B2", "C1"]),
    streak: z.number().int().min(0), // current streak in days
  }),
  skillScores: z.array(SkillScoreDtoSchema),
  lessonsCompleted: z.number().int().min(0),
  recommendation: ContinueLearningDtoSchema,
  recentlyViewed: z.array(ContentItemDtoSchema), // last 4 items
  bookmarked: z.array(ContentItemDtoSchema), // last 4 items
  pendingReviews: z.number().int().min(0), // pending SRS reviews
});

export type DashboardDto = z.infer<typeof DashboardDtoSchema>;
