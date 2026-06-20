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

// Phase 5: Reading DTOs
export * from "./reading.dto";

// Phase 6: Listening DTOs
export * from "./listening.dto";

// Phase 7: Quiz Center + Gamification DTOs
export * from "./quiz.dto";

// Phase 8: Adaptive Engine + Dashboard + Search + Analytics DTOs
export * from "./adaptive.dto";
export * from "./search.dto";
export * from "./analytics.dto";
