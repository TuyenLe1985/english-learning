// Shared JWT payload type — used by both Next.js (NextAuth callbacks) and NestJS (JwtAuthGuard).
// Defines exactly what fields are embedded in the Auth.js v5 JWE session token per D-13.
// Source: .planning/phases/02-authentication-user-profile/02-RESEARCH.md — Code Examples

import { z } from "zod";

export const JwtPayloadSchema = z.object({
  userId: z.string(),
  role: z.enum(["STUDENT", "ADMIN"]),
  cefrLevel: z.enum(["B1", "B2", "C1"]),
  email: z.string().email().optional(),
});

export type JwtPayload = z.infer<typeof JwtPayloadSchema>;
