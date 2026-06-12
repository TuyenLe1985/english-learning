/**
 * Wave 0 RED scaffolds for JwtAuthGuard
 * These tests fail until the owning plans implement the guard.
 *
 * AUTH-05 (JWT session maxAge 30 days): implemented in Plan 01 / Plan 04
 * AUTH-06 (unauthenticated requests return 401): implemented in Plan 01 / Plan 04
 *
 * Mock boundary: @auth/core/jwt decode is mocked to isolate guard logic.
 */

import { describe, it, expect, vi } from 'vitest';

// Mock the JWT decode boundary from @auth/core/jwt.
// JwtAuthGuard will call this to validate Bearer tokens.
vi.mock('@auth/core/jwt', () => ({
  decode: vi.fn().mockResolvedValue(null), // default: invalid/expired token
}));

describe('JwtAuthGuard', () => {
  // ---------------------------------------------------------------------------
  // AUTH-06 — Unauthenticated requests return 401
  // Owning plan: Plan 01 (guard built) + Plan 04 (protected-route exercise)
  // ---------------------------------------------------------------------------
  describe('canActivate()', () => {
    it('rejects a request with no Authorization header (returns false / throws UnauthorizedException) [RED: implemented in Plan 01]', () => {
      // RED: JwtAuthGuard does not exist yet. Plan 01 will create the NestJS
      // JwtAuthGuard that reads the Authorization header and calls canActivate().
      // Expected: canActivate() throws UnauthorizedException (HTTP 401) when
      // no Authorization: Bearer <token> header is present.
      expect(false).toBe(true); // RED: implemented in Plan 01
    });

    it('rejects a request with an invalid Bearer token (throws UnauthorizedException 401) [RED: implemented in Plan 01]', () => {
      // RED: Plan 01 will implement token validation. An invalid or malformed
      // JWT (decode returns null) must result in 401 UnauthorizedException.
      expect(false).toBe(true); // RED: implemented in Plan 01
    });

    it('rejects a request with an expired Bearer token (throws UnauthorizedException 401) [RED: implemented in Plan 01]', () => {
      // RED: Plan 01 will implement expiry check. An expired JWT must result
      // in 401 UnauthorizedException, not a 500 internal error.
      expect(false).toBe(true); // RED: implemented in Plan 01
    });

    it('admits a request whose Bearer token decodes to a valid JwtPayload [RED: implemented in Plan 04]', () => {
      // RED: Plan 04 will wire the full protected-route flow. A token that
      // decodes to { userId, role, cefrLevel } must call next() / return true.
      expect(false).toBe(true); // RED: implemented in Plan 04
    });
  });

  // ---------------------------------------------------------------------------
  // AUTH-05 — JWT session maxAge is 30 days
  // Owning plan: Plan 04
  // ---------------------------------------------------------------------------
  describe('session token maxAge', () => {
    it('session token is configured with a 30-day maxAge [RED: implemented in Plan 04]', () => {
      // RED: Plan 04 will configure NextAuth session strategy (jwt) with
      // maxAge: 30 * 24 * 60 * 60 (30 days). This test verifies the config.
      expect(false).toBe(true); // RED: implemented in Plan 04
    });
  });
});
