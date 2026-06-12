/**
 * UsersService unit tests — TDD RED → GREEN (Plan 06)
 *
 * PROF-01 (GET /me returns profile fields): implemented in Plan 06
 * PROF-02 (PATCH /me updates name + avatarKey): implemented in Plan 06
 *
 * Tests use direct instantiation with a mocked PrismaService (no NestJS DI).
 * This matches the existing test pattern (jwt.guard.spec.ts) and avoids
 * emitDecoratorMetadata issues with Vitest's default transformer.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import type { PrismaService } from '../prisma/prisma.service';

// ─── Mock PrismaService ───────────────────────────────────────────────────────
const mockFindUnique = vi.fn();
const mockUpdate = vi.fn();

const mockPrisma = {
  user: {
    findUnique: mockFindUnique,
    update: mockUpdate,
  },
} as unknown as PrismaService;

// ─── Sample data ──────────────────────────────────────────────────────────────
const now = new Date('2026-06-01T00:00:00.000Z');

const baseUser = {
  id: 'user-001',
  email: 'alice@example.com',
  name: 'Alice',
  avatarUrl: null,
  image: null,
  cefrLevel: 'B1' as const,
  xpTotal: 0,
  level: 1,
  createdAt: now,
  lastActiveAt: now,
  emailVerified: now,
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new UsersService(mockPrisma);
  });

  // ---------------------------------------------------------------------------
  // PROF-01 — GET /api/users/me returns user profile fields
  // ---------------------------------------------------------------------------
  describe('getMe()', () => {
    it('returns all UserProfileDto fields for a valid userId', async () => {
      mockFindUnique.mockResolvedValue(baseUser);

      const result = await service.getMe('user-001');

      expect(result).toMatchObject({
        id: 'user-001',
        email: 'alice@example.com',
        name: 'Alice',
        avatarUrl: null,
        cefrLevel: 'B1',
        xpTotal: 0,
        level: 1,
      });
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { id: 'user-001' },
        select: expect.objectContaining({
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
        }),
      });
    });

    it('throws NotFoundException when userId does not exist', async () => {
      mockFindUnique.mockResolvedValue(null);

      await expect(service.getMe('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns null for avatarUrl when no avatar has been uploaded', async () => {
      mockFindUnique.mockResolvedValue({
        ...baseUser,
        avatarUrl: null,
      });

      const result = await service.getMe('user-001');
      expect(result.avatarUrl).toBeNull();
    });

    it('returns both avatarUrl and image for Google OAuth avatar precedence', async () => {
      const googleUser = {
        ...baseUser,
        avatarUrl: 'avatars/user-001/123-photo.jpg',
        image: 'https://lh3.googleusercontent.com/a/photo.jpg',
      };
      mockFindUnique.mockResolvedValue(googleUser);

      const result = await service.getMe('user-001');
      expect(result.avatarUrl).toBe('avatars/user-001/123-photo.jpg');
      expect(result.image).toBe(
        'https://lh3.googleusercontent.com/a/photo.jpg',
      );
    });
  });

  // ---------------------------------------------------------------------------
  // PROF-02 — PATCH /api/users/me updates display name and avatarKey
  // ---------------------------------------------------------------------------
  describe('updateMe()', () => {
    it('updates display name when a valid name is provided', async () => {
      const updated = { ...baseUser, name: 'Alice Updated' };
      mockUpdate.mockResolvedValue(updated);

      const result = await service.updateMe('user-001', { name: 'Alice Updated' });

      expect(result.name).toBe('Alice Updated');
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'user-001' },
        data: { name: 'Alice Updated' },
        select: expect.objectContaining({ id: true, email: true }),
      });
    });

    it('updates avatarUrl when avatarKey is provided', async () => {
      const storageKey = 'avatars/user-001/1234567890-photo.jpg';
      const updated = { ...baseUser, avatarUrl: storageKey };
      mockUpdate.mockResolvedValue(updated);

      const result = await service.updateMe('user-001', { avatarKey: storageKey });

      expect(result.avatarUrl).toBe(storageKey);
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'user-001' },
        data: { avatarUrl: storageKey },
        select: expect.objectContaining({ id: true }),
      });
    });

    it('does not allow updating email via updateMe (email not in UpdateProfileDto)', async () => {
      const updated = { ...baseUser };
      mockUpdate.mockResolvedValue(updated);

      await service.updateMe('user-001', {
        name: 'Alice',
        // avatarKey is not set — only name
      });

      const updateCall = mockUpdate.mock.calls[0] as [{ data: Record<string, unknown> }];
      const dataArg = updateCall[0].data;
      expect(dataArg).not.toHaveProperty('email');
    });

    it('updates both name and avatarKey in a single call', async () => {
      const storageKey = 'avatars/user-001/1234567890-photo.jpg';
      const updated = {
        ...baseUser,
        name: 'Bob',
        avatarUrl: storageKey,
      };
      mockUpdate.mockResolvedValue(updated);

      const result = await service.updateMe('user-001', {
        name: 'Bob',
        avatarKey: storageKey,
      });

      expect(result.name).toBe('Bob');
      expect(result.avatarUrl).toBe(storageKey);
    });
  });
});
