/**
 * ProfileController — handles avatar upload URL generation.
 *
 * PROF-02: POST /api/profile/avatar/upload-url
 *   - Protected by @UseGuards(JwtAuthGuard) — 401 if no/invalid token.
 *   - userId read from JWT payload (T-02-14 — never from request body).
 *   - Validates AvatarUploadUrlRequestSchema (contentType allow-list + 2MB max).
 *   - Returns { uploadUrl, key } for browser-side direct upload to MinIO/R2.
 *
 * Upload flow (D-06):
 *   1. POST /api/profile/avatar/upload-url → { uploadUrl, key }
 *   2. Browser PUTs file directly to uploadUrl (bypasses NestJS)
 *   3. Browser calls PATCH /api/users/me { avatarKey: key }
 */

import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProfileService } from './profile.service';
import { AvatarUploadUrlRequestSchema } from '@repo/shared';
import type { AvatarUploadUrlResult } from './profile.service';

interface AuthenticatedRequest {
  user: {
    userId: string;
    role?: string;
    cefrLevel?: string;
  };
}

@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  /**
   * POST /api/profile/avatar/upload-url
   * Returns a presigned MinIO/R2 PUT URL for direct browser upload.
   * Rejects requests with invalid MIME type or size > 2MB before any URL is issued.
   */
  @UseGuards(JwtAuthGuard)
  @Post('avatar/upload-url')
  async getAvatarUploadUrl(
    @Request() req: AuthenticatedRequest,
    @Body() body: unknown,
  ): Promise<AvatarUploadUrlResult> {
    // Validate constraints with Zod schema from @repo/shared (D-08)
    const dto = AvatarUploadUrlRequestSchema.parse(body);
    return this.profileService.generateAvatarUploadUrl(
      req.user.userId,
      dto.filename,
      dto.contentType,
      dto.sizeBytes,
    );
  }
}
