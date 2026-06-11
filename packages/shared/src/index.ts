// Phase 2+ will add types, schemas, and DTOs here.
// This barrel export grows as the platform adds authentication, content, and quiz modules.

import { z } from "zod";

// Health check response schema — used by both apps/api and apps/web health routes
export const HealthResponseSchema = z.object({
  status: z.string(),
  timestamp: z.string(),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;
