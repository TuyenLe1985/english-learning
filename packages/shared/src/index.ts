// Phase 2+ will add types, schemas, and DTOs here.
// This barrel export grows as the platform adds authentication, content, and quiz modules.

import { z } from "zod";

// Health check response schema — used by both apps/api and apps/web health routes
export const HealthResponseSchema = z.object({
  status: z.string(),
  timestamp: z.string(),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;

// Phase 2: Auth + User Profile
export * from "./auth.types";
export * from "./user.dto";

// Phase 3: Vocabulary + SRS DTOs
export * from "./vocabulary.dto";

// Phase 4: Grammar DTOs
export * from "./grammar.dto";
