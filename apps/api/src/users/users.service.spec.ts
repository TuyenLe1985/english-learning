/**
 * Wave 0 RED scaffolds for UsersService
 * These tests fail until the owning plans implement the service.
 *
 * PROF-01 (GET /me returns profile fields): implemented in Plan 06
 * PROF-02 (PATCH /me updates name + avatarKey): implemented in Plan 06
 */

import { describe, it, expect } from 'vitest';

describe('UsersService', () => {
  // ---------------------------------------------------------------------------
  // PROF-01 — GET /api/users/me returns user profile fields
  // Owning plan: Plan 06
  // ---------------------------------------------------------------------------
  describe('getProfile()', () => {
    it('returns all UserProfileDto fields for a valid userId [RED: implemented in Plan 06]', () => {
      // RED: UsersService does not exist yet. Plan 06 will implement getProfile()
      // that queries the DB and returns UserProfileDto shape:
      // { id, email, name, avatarUrl, cefrLevel, xpTotal, level, createdAt, lastActiveAt, emailVerified }
      expect(false).toBe(true); // RED: implemented in Plan 06
    });

    it('throws NotFoundException when userId does not exist [RED: implemented in Plan 06]', () => {
      // RED: implemented in Plan 06
      expect(false).toBe(true); // RED: implemented in Plan 06
    });

    it('returns null for avatarUrl when no avatar has been uploaded [RED: implemented in Plan 06]', () => {
      // RED: implemented in Plan 06
      expect(false).toBe(true); // RED: implemented in Plan 06
    });
  });

  // ---------------------------------------------------------------------------
  // PROF-02 — PATCH /api/users/me updates display name and avatarKey
  // Owning plan: Plan 06
  // ---------------------------------------------------------------------------
  describe('updateProfile()', () => {
    it('updates display name when a valid name is provided [RED: implemented in Plan 06]', () => {
      // RED: Plan 06 will implement updateProfile(userId, UpdateProfileDto).
      // When name is provided, the user record name field must be updated.
      expect(false).toBe(true); // RED: implemented in Plan 06
    });

    it('updates avatarKey and resolves avatarUrl when avatarKey is provided [RED: implemented in Plan 06]', () => {
      // RED: Plan 06 will resolve the storage key to a public URL and persist
      // the avatarUrl alongside the avatarKey in the DB.
      expect(false).toBe(true); // RED: implemented in Plan 06
    });

    it('does not allow updating email via PATCH /me [RED: implemented in Plan 06]', () => {
      // RED: The UpdateProfileDtoSchema does not include email — this test
      // verifies the service enforces the DTO boundary.
      expect(false).toBe(true); // RED: implemented in Plan 06
    });
  });
});
