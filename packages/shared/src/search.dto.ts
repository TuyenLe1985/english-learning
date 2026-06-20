// Shared search DTOs — used by NestJS SearchController and Next.js search clients.
// Covers SRCH-01 through SRCH-04 data contracts.
// Source: .planning/phases/08-adaptive-engine-dashboard-search-analytics/08-01c-PLAN.md

import { z } from "zod";

// ─── Search Result ─────────────────────────────────────────────────────────────
// SRCH-04: Shows content type, CEFR level, topic tag, title, snippet

export const SearchResultDtoSchema = z.object({
  id: z.string(),
  type: z.enum(["vocabulary", "grammar", "reading", "listening", "quiz"]),
  title: z.string(),
  snippet: z.string(), // ts_headline() generated snippet with matched terms bolded
  cefrLevel: z.enum(["B1", "B2", "C1"]).nullable(),
  topic: z.string().nullable(),
});

export type SearchResultDto = z.infer<typeof SearchResultDtoSchema>;

// ─── Search Result Group ──────────────────────────────────────────────────────
// D-10: Results grouped by content type (Vocabulary, Grammar, Reading, Listening, Quiz)

export const SearchResultGroupDtoSchema = z.object({
  type: z.enum(["vocabulary", "grammar", "reading", "listening", "quiz"]),
  count: z.number().int().min(0),
  results: z.array(SearchResultDtoSchema),
});

export type SearchResultGroupDto = z.infer<typeof SearchResultGroupDtoSchema>;

// ─── Search Response ──────────────────────────────────────────────────────────
// SRCH-01: Full search response with query, total results, and grouped sections

export const SearchResponseDtoSchema = z.object({
  query: z.string(),
  total: z.number().int().min(0),
  groups: z.array(SearchResultGroupDtoSchema),
});

export type SearchResponseDto = z.infer<typeof SearchResponseDtoSchema>;
