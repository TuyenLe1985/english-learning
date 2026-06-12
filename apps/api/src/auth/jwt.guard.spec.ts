/**
 * GREEN tests for JwtAuthGuard (implemented in Plan 01)
 * Tests for AUTH-05 (session maxAge) and Plan-04 admission path remain
 * RED until Plan 04 wires the full protected-route flow.
 *
 * Mock boundary: @auth/core/jwt decode is mocked to isolate guard logic.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from './jwt-auth.guard';

// Mock the JWT decode boundary from @auth/core/jwt.
vi.mock('@auth/core/jwt', () => ({
  decode: vi.fn(),
}));

import { decode } from '@auth/core/jwt';

const mockDecode = vi.mocked(decode);

function makeContext(headers: Record<string, string>): ExecutionContext {
  const req = { headers, user: undefined as unknown };
  return {
    switchToHttp: () => ({
      getRequest: () => req,
    }),
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  beforeEach(() => {
    vi.clearAllMocks();
    const configService = {
      get: (key: string) => {
        if (key === 'NEXTAUTH_SECRET') return 'test-secret';
        if (key === 'NODE_ENV') return 'test';
        return undefined;
      },
    } as unknown as ConfigService;
    guard = new JwtAuthGuard(configService);
  });

  // ---------------------------------------------------------------------------
  // AUTH-06 — Unauthenticated requests return 401
  // Plans 01 tests are now GREEN; Plan 04 test stays RED
  // ---------------------------------------------------------------------------
  describe('canActivate()', () => {
    it('rejects a request with no Authorization header (throws UnauthorizedException)', async () => {
      const ctx = makeContext({});
      await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    });

    it('rejects a request with a non-Bearer Authorization header (throws UnauthorizedException)', async () => {
      const ctx = makeContext({ authorization: 'Basic dXNlcjpwYXNz' });
      await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    });

    it('rejects a request when decode returns null (invalid token — throws UnauthorizedException)', async () => {
      mockDecode.mockResolvedValue(null);
      const ctx = makeContext({ authorization: 'Bearer some.invalid.token' });
      await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    });

    it('rejects a request when decode throws (expired/malformed — throws UnauthorizedException)', async () => {
      mockDecode.mockRejectedValue(new Error('JWE decryption failed'));
      const ctx = makeContext({ authorization: 'Bearer some.expired.token' });
      await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
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
