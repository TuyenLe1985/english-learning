/**
 * UsersController — NestJS controller for user profile endpoints.
 *
 * PROF-01: GET /api/users/me — returns the authenticated user's profile.
 * PROF-02: PATCH /api/users/me — updates display name and/or avatar storage key.
 *
 * Security (T-02-14):
 *   - @UseGuards(JwtAuthGuard) protects both endpoints — 401 if no/invalid token.
 *   - userId is always read from request.user (validated JWT token), never from body.
 *   - UpdateProfileDto (from @repo/shared) excludes email; email cannot be changed here.
 *
 * DTO validation: NestJS global ValidationPipe (whitelist+transform) strips unknown fields.
 * Zod schemas from @repo/shared are used for manual validation in the service layer.
 */

import {
  Body,
  Controller,
  Get,
  Patch,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';
import { UpdateProfileDtoSchema } from '@repo/shared';
import type { UpdateProfileDto, UserProfileDto } from '@repo/shared';

// Type for the decoded JWT payload attached to request.user by JwtAuthGuard (Plan 01)
interface AuthenticatedRequest {
  user: {
    userId: string;
    role?: string;
    cefrLevel?: string;
    email?: string;
  };
}

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * PROF-01 — GET /api/users/me
   * Returns the authenticated user's full profile.
   * Responds with UserProfileDto shape (id, email, name, avatarUrl, image, CEFR, XP, etc.)
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Request() req: AuthenticatedRequest): Promise<UserProfileDto> {
    const profile = await this.usersService.getMe(req.user.userId);
    return {
      ...profile,
      createdAt: profile.createdAt.toISOString(),
      lastActiveAt: profile.lastActiveAt.toISOString(),
      emailVerified: profile.emailVerified
        ? profile.emailVerified.toISOString()
        : null,
    };
  }

  /**
   * PROF-02 — PATCH /api/users/me
   * Updates display name and/or avatar storage key.
   * Email is excluded from UpdateProfileDto — cannot be changed via this endpoint.
   */
  @UseGuards(JwtAuthGuard)
  @Patch('me')
  async updateMe(
    @Request() req: AuthenticatedRequest,
    @Body() body: unknown,
  ): Promise<UserProfileDto> {
    // Validate with Zod schema from @repo/shared (strips unknown fields including email)
    const dto = UpdateProfileDtoSchema.parse(body) as UpdateProfileDto;
    const profile = await this.usersService.updateMe(req.user.userId, dto);
    return {
      ...profile,
      createdAt: profile.createdAt.toISOString(),
      lastActiveAt: profile.lastActiveAt.toISOString(),
      emailVerified: profile.emailVerified
        ? profile.emailVerified.toISOString()
        : null,
    };
  }
}
