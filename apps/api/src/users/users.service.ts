/**
 * UsersService — NestJS service for user profile read/write.
 *
 * PROF-01: getMe() returns the authenticated user's full profile (UserProfileDto shape).
 * PROF-02: updateMe() updates display name and avatar storage key (never email).
 *
 * Security (T-02-14): userId is always read from the validated JWT token (request.user.userId),
 * never from the request body — the controller enforces this boundary.
 *
 * Avatar precedence (RESEARCH Open Questions RESOLVED Q1):
 *   avatarUrl  — uploaded file storage key (upload-owned)
 *   image      — Google OAuth avatar URL (PrismaAdapter-owned)
 *   Both fields are returned; the client applies `avatarUrl ?? image` precedence.
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@repo/database';
import { PrismaService } from '../prisma/prisma.service';
import type { UpdateProfileDto } from '@repo/shared';

// Fields returned from DB for profile responses
const PROFILE_SELECT = {
  id: true,
  email: true,
  name: true,
  avatarUrl: true,
  image: true,
  cefrLevel: true,
  xpTotal: true,
  level: true,
  createdAt: true,
  lastActiveAt: true,
  emailVerified: true,
} as const;

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  image: string | null;
  cefrLevel: 'B1' | 'B2' | 'C1';
  xpTotal: number;
  level: number;
  createdAt: Date;
  lastActiveAt: Date;
  emailVerified: Date | null;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * PROF-01 — GET /api/users/me
   * Returns the user's full profile. Throws NotFoundException if userId not found.
   */
  async getMe(userId: string): Promise<UserProfile> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: PROFILE_SELECT,
    });

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    return user as UserProfile;
  }

  /**
   * PROF-02 — PATCH /api/users/me
   * Updates only the fields provided (name, avatarKey → avatarUrl).
   * Email is intentionally excluded from UpdateProfileDto — cannot be updated here.
   *
   * Security (T-02-14): Only `name` and `avatarUrl` are written; email is never in the data map.
   * Anti-pattern (T-02-16): avatarKey is stored as-is (storage key, NOT full URL).
   */
  async updateMe(userId: string, dto: UpdateProfileDto): Promise<UserProfile> {
    // Build data object with only defined fields — never include email
    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) {
      data['name'] = dto.name;
    }
    if (dto.avatarKey !== undefined) {
      // CR-06: Validate that the avatarKey belongs to the requesting user.
      // An authenticated user must not be able to point their profile at another
      // user's storage key or at an arbitrary path.
      if (!dto.avatarKey.startsWith(`avatars/${userId}/`)) {
        throw new BadRequestException('Avatar key does not belong to this user.');
      }
      // T-02-16: Store only the storage key (RESEARCH Anti-Pattern)
      data['avatarUrl'] = dto.avatarKey;
    }

    // WR-02: Catch P2025 (record not found) and surface it as a proper 404.
    // prisma.user.update throws PrismaClientKnownRequestError(P2025) when the
    // userId from the JWT no longer exists (e.g. account was deleted).
    try {
      const user = await this.prisma.user.update({
        where: { id: userId },
        data,
        select: PROFILE_SELECT,
      });
      return user as UserProfile;
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2025'
      ) {
        throw new NotFoundException(`User ${userId} not found`);
      }
      throw err;
    }
  }
}
