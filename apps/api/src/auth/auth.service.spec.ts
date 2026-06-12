/**
 * Wave 0 RED scaffolds for AuthService
 * These tests fail until the owning plans implement the service.
 *
 * AUTH-01 (bcrypt hash): implemented in Plan 03
 * AUTH-02 (email verification gate): implemented in Plan 03
 * AUTH-04 (reset token expiry 24h): implemented in Plan 05
 */

import { describe, it, expect } from 'vitest';

describe('AuthService', () => {
  // ---------------------------------------------------------------------------
  // AUTH-01 — Password hashed with bcrypt, never stored in plaintext
  // Owning plan: Plan 03
  // ---------------------------------------------------------------------------
  describe('register()', () => {
    it('stores a bcrypt hash, not the plaintext password [RED: implemented in Plan 03]', () => {
      // RED: AuthService does not exist yet. This test will remain red until
      // Plan 03 creates the AuthService with bcrypt password hashing.
      expect(false).toBe(true); // RED: implemented in Plan 03
    });

    it('stored hash verifies against the original password via bcrypt.compare [RED: implemented in Plan 03]', () => {
      // RED: implemented in Plan 03
      expect(false).toBe(true); // RED: implemented in Plan 03
    });
  });

  // ---------------------------------------------------------------------------
  // AUTH-02 — Unverified user blocked from signing in
  // Owning plan: Plan 03
  // ---------------------------------------------------------------------------
  describe('login()', () => {
    it('throws an error when user email is not verified [RED: implemented in Plan 03]', () => {
      // RED: AuthService does not exist yet. Plan 03 will implement login()
      // with emailVerified check that redirects to /verify-email.
      expect(false).toBe(true); // RED: implemented in Plan 03
    });

    it('returns a session token when email is verified and password is correct [RED: implemented in Plan 03]', () => {
      // RED: implemented in Plan 03
      expect(false).toBe(true); // RED: implemented in Plan 03
    });
  });

  // ---------------------------------------------------------------------------
  // AUTH-04 — Password reset token expires after 24h
  // Owning plan: Plan 05
  // ---------------------------------------------------------------------------
  describe('requestPasswordReset()', () => {
    it('creates a reset token with a 24-hour expiry [RED: implemented in Plan 05]', () => {
      // RED: Plan 05 will implement requestPasswordReset() that generates a
      // time-limited token stored in DB with expiresAt = now + 24h.
      expect(false).toBe(true); // RED: implemented in Plan 05
    });

    it('rejects an expired reset token [RED: implemented in Plan 05]', () => {
      // RED: implemented in Plan 05
      expect(false).toBe(true); // RED: implemented in Plan 05
    });
  });
});
