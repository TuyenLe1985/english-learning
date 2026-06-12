// Shared user DTOs — used by NestJS controllers (response shaping) and Next.js clients (type-safe fetch).
// AvatarUploadUrlRequest enforces D-08 constraints (2 MB max, JPEG/PNG/WebP only) at the type level.
// Source: .planning/phases/02-authentication-user-profile/02-RESEARCH.md — Code Examples

import { z } from "zod";

export const UserProfileDtoSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  // RESEARCH Open Questions RESOLVED Q1: image is the Google OAuth avatar URL
  // set by PrismaAdapter on first Google sign-in. Both avatarUrl and image are
  // returned so the client can apply `avatarUrl ?? image` display precedence.
  image: z.string().nullable().optional(),
  cefrLevel: z.enum(["B1", "B2", "C1"]),
  xpTotal: z.number(),
  level: z.number(),
  createdAt: z.string().datetime(),
  lastActiveAt: z.string().datetime(),
  emailVerified: z.string().datetime().nullable(),
});

export const UpdateProfileDtoSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  avatarKey: z.string().optional(), // storage key from presigned upload (D-06)
});

export const AvatarUploadUrlRequestSchema = z.object({
  filename: z.string(),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]), // D-08: JPEG/PNG/WebP only
  sizeBytes: z.number().max(2 * 1024 * 1024), // D-08: 2 MB max
});

export type UserProfileDto = z.infer<typeof UserProfileDtoSchema>;
export type UpdateProfileDto = z.infer<typeof UpdateProfileDtoSchema>;
export type AvatarUploadUrlRequest = z.infer<typeof AvatarUploadUrlRequestSchema>;
