/**
 * RED tests for auth-actions server actions (Plan 02-03)
 * Covers: registerUser, createVerificationToken, verifyEmailToken, resend rate-limit
 *
 * Requirements: AUTH-01 (registration + bcrypt), AUTH-02 (email verification gate)
 * STRIDE mitigations: T-02-04, T-02-05, T-02-06, T-02-07
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Module mocks — must be set up before dynamic imports of the module under test
// ---------------------------------------------------------------------------

const mockPrismaUserCreate = vi.fn();
const mockPrismaUserFindUnique = vi.fn();
const mockPrismaVerificationTokenCreate = vi.fn();
const mockPrismaVerificationTokenFindFirst = vi.fn();
const mockPrismaVerificationTokenDelete = vi.fn();
const mockPrismaUserUpdate = vi.fn();

vi.mock('@repo/database', () => ({
  prisma: {
    user: {
      create: mockPrismaUserCreate,
      findUnique: mockPrismaUserFindUnique,
      update: mockPrismaUserUpdate,
    },
    verificationToken: {
      create: mockPrismaVerificationTokenCreate,
      findFirst: mockPrismaVerificationTokenFindFirst,
      delete: mockPrismaVerificationTokenDelete,
    },
  },
}));

// ioredis mock — INCR returns current count, EXPIRE sets TTL
const mockRedisIncr = vi.fn();
const mockRedisExpire = vi.fn();
const mockRedisGet = vi.fn();
const mockRedisTtl = vi.fn();

vi.mock('ioredis', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      incr: mockRedisIncr,
      expire: mockRedisExpire,
      get: mockRedisGet,
      ttl: mockRedisTtl,
    })),
  };
});

// resend mock — SDK returns { data, error }; never throws (Pitfall 6)
const mockResendEmailsSend = vi.fn();

vi.mock('resend', () => {
  return {
    Resend: vi.fn().mockImplementation(() => ({
      emails: {
        send: mockResendEmailsSend,
      },
    })),
  };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    email: 'alice@example.com',
    emailVerified: null,
    name: 'Alice',
    passwordHash: null,
    role: 'STUDENT',
    cefrLevel: 'B1',
    xpTotal: 0,
    level: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastActiveAt: new Date(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// AUTH-01 — registerUser: bcrypt + duplicate guard + input validation
// ---------------------------------------------------------------------------

describe('registerUser()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: no existing user with that email
    mockPrismaUserFindUnique.mockResolvedValue(null);
    mockPrismaUserCreate.mockResolvedValue(makeUser());
    mockResendEmailsSend.mockResolvedValue({ data: { id: 'email-id' }, error: null });
    mockPrismaVerificationTokenCreate.mockResolvedValue({
      identifier: 'alice@example.com',
      token: 'random-token-hex',
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    // Rate limit: first call allowed
    mockRedisIncr.mockResolvedValue(1);
    mockRedisExpire.mockResolvedValue(1);
    mockRedisTtl.mockResolvedValue(-2); // key doesn't exist
  });

  it('rejects a password shorter than 8 characters', async () => {
    const { registerUser } = await import('./auth-actions');

    const result = await registerUser({
      name: 'Alice',
      email: 'alice@example.com',
      password: 'short',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/8 char/i);
    }
    expect(mockPrismaUserCreate).not.toHaveBeenCalled();
  });

  it('rejects a duplicate email with a clear error message', async () => {
    mockPrismaUserFindUnique.mockResolvedValue(makeUser({ email: 'alice@example.com' }));

    const { registerUser } = await import('./auth-actions');

    const result = await registerUser({
      name: 'Alice',
      email: 'alice@example.com',
      password: 'ValidPass1!',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/account.*already exists/i);
    }
    expect(mockPrismaUserCreate).not.toHaveBeenCalled();
  });

  it('stores a bcrypt hash, never the plaintext password (T-02-04)', async () => {
    const plainPassword = 'ValidPass1!';

    mockPrismaUserCreate.mockImplementation(({ data }: { data: { passwordHash: string } }) => {
      return Promise.resolve(makeUser({ passwordHash: data.passwordHash }));
    });

    const { registerUser } = await import('./auth-actions');
    const result = await registerUser({
      name: 'Alice',
      email: 'alice@example.com',
      password: plainPassword,
    });

    expect(result.success).toBe(true);

    // Verify the stored hash is NOT the plaintext
    const storedHash = mockPrismaUserCreate.mock.calls[0]?.[0].data.passwordHash as string;
    expect(storedHash).not.toBe(plainPassword);
    expect(storedHash).toMatch(/^\$2[aby]\$\d{2}\$/); // bcrypt prefix
  });

  it('bcrypt hash verifies against the original password (T-02-04)', async () => {
    const plainPassword = 'ValidPass1!';
    let capturedHash = '';

    mockPrismaUserCreate.mockImplementation(({ data }: { data: { passwordHash: string } }) => {
      capturedHash = data.passwordHash;
      return Promise.resolve(makeUser({ passwordHash: data.passwordHash as string }));
    });

    const { registerUser } = await import('./auth-actions');
    await registerUser({
      name: 'Alice',
      email: 'alice@example.com',
      password: plainPassword,
    });

    // Import bcrypt directly to verify (it's available in the test environment)
    const bcrypt = await import('bcrypt');
    const isValid = await bcrypt.compare(plainPassword, capturedHash);
    expect(isValid).toBe(true);
  });

  it('sets emailVerified to null at creation (Credentials users must verify)', async () => {
    const { registerUser } = await import('./auth-actions');
    await registerUser({
      name: 'Alice',
      email: 'alice@example.com',
      password: 'ValidPass1!',
    });

    const createCall = mockPrismaUserCreate.mock.calls[0]?.[0] as { data: { emailVerified: unknown } };
    expect(createCall.data.emailVerified).toBeNull();
  });

  it('returns success with the created user id on valid registration', async () => {
    const { registerUser } = await import('./auth-actions');
    const result = await registerUser({
      name: 'Alice',
      email: 'alice@example.com',
      password: 'ValidPass1!',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.userId).toBe('user-1');
    }
  });
});

// ---------------------------------------------------------------------------
// AUTH-01/02 — createVerificationToken: crypto token + 24h expiry (D-03, T-02-05)
// ---------------------------------------------------------------------------

describe('createVerificationToken()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrismaVerificationTokenCreate.mockResolvedValue({
      identifier: 'alice@example.com',
      token: 'abc123',
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
  });

  it('creates a token that expires ~24h from now (D-03)', async () => {
    const { createVerificationToken } = await import('./auth-actions');
    const before = Date.now();
    await createVerificationToken('user-1', 'alice@example.com');
    const after = Date.now();

    const createCall = mockPrismaVerificationTokenCreate.mock.calls[0]?.[0] as { data: { expires: Date } };
    const expiresMs = createCall.data.expires.getTime();
    const expectedMs = before + 24 * 60 * 60 * 1000;

    // Allow 1-second tolerance
    expect(expiresMs).toBeGreaterThanOrEqual(expectedMs - 1000);
    expect(expiresMs).toBeLessThanOrEqual(after + 24 * 60 * 60 * 1000 + 1000);
  });

  it('generates a hex token using crypto.randomBytes (not static/predictable)', async () => {
    // Call twice — tokens must be different
    const tokens: string[] = [];
    mockPrismaVerificationTokenCreate.mockImplementation(
      ({ data }: { data: { token: string } }) => {
        tokens.push(data.token);
        return Promise.resolve({ identifier: 'alice@example.com', token: data.token, expires: new Date() });
      }
    );

    const { createVerificationToken } = await import('./auth-actions');
    await createVerificationToken('user-1', 'alice@example.com');
    await createVerificationToken('user-1', 'alice@example.com');

    const [token0, token1] = tokens;
    expect(token0).not.toBe(token1);
    // Should be hex string
    expect(token0).toMatch(/^[0-9a-f]+$/);
  });
});

// ---------------------------------------------------------------------------
// AUTH-02 — verifyEmailToken: sets emailVerified, deletes token, handles expiry (T-02-05)
// ---------------------------------------------------------------------------

describe('verifyEmailToken()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sets emailVerified to now() and deletes the token for a valid+unexpired token', async () => {
    const validToken = {
      identifier: 'alice@example.com',
      token: 'valid-token',
      expires: new Date(Date.now() + 1000), // still valid
    };
    mockPrismaVerificationTokenFindFirst.mockResolvedValue(validToken);
    mockPrismaUserFindUnique.mockResolvedValue(makeUser({ email: 'alice@example.com' }));
    mockPrismaUserUpdate.mockResolvedValue(makeUser({ emailVerified: new Date() }));
    mockPrismaVerificationTokenDelete.mockResolvedValue(validToken);

    const { verifyEmailToken } = await import('./auth-actions');
    const result = await verifyEmailToken('valid-token');

    expect(result).toMatchObject({ success: true });
    // emailVerified must be set
    expect(mockPrismaUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          emailVerified: expect.any(Date),
        }),
      })
    );
    // Token must be deleted after use (T-02-05)
    expect(mockPrismaVerificationTokenDelete).toHaveBeenCalled();
  });

  it('returns expired error for an expired token (D-03)', async () => {
    const expiredToken = {
      identifier: 'alice@example.com',
      token: 'expired-token',
      expires: new Date(Date.now() - 1000), // in the past
    };
    mockPrismaVerificationTokenFindFirst.mockResolvedValue(expiredToken);

    const { verifyEmailToken } = await import('./auth-actions');
    const result = await verifyEmailToken('expired-token');

    expect(result).toMatchObject({ success: false, expired: true });
    // Should NOT set emailVerified
    expect(mockPrismaUserUpdate).not.toHaveBeenCalled();
  });

  it('rejects an unknown token (T-02-05)', async () => {
    mockPrismaVerificationTokenFindFirst.mockResolvedValue(null);

    const { verifyEmailToken } = await import('./auth-actions');
    const result = await verifyEmailToken('unknown-token');

    expect(result).toMatchObject({ success: false });
    expect(mockPrismaUserUpdate).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// AUTH-02 — resend rate-limiting: 1/60s + max 3/hour via Redis (D-02, T-02-06)
// ---------------------------------------------------------------------------

describe('checkResendRateLimit()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows the first resend call', async () => {
    // Key does not exist yet → INCR returns 1
    mockRedisIncr.mockResolvedValue(1);
    mockRedisExpire.mockResolvedValue(1);
    mockRedisTtl.mockResolvedValue(-2); // cooldown key: doesn't exist

    const { checkResendRateLimit } = await import('./auth-actions');
    const result = await checkResendRateLimit('user-1');

    expect(result).toMatchObject({ allowed: true });
  });

  it('denies a second call within 60s (D-02 — 1/60s)', async () => {
    // Cooldown key exists with TTL > 0 meaning a recent send happened
    mockRedisTtl.mockResolvedValue(45); // 45 seconds left in cooldown

    const { checkResendRateLimit } = await import('./auth-actions');
    const result = await checkResendRateLimit('user-1');

    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.retryAfter).toBe(45);
    }
  });

  it('denies a 4th call within the same hour (max 3/hour, D-02)', async () => {
    // No cooldown key (cooldown expired) but hourly count is 3
    mockRedisTtl.mockResolvedValue(-2); // cooldown: not active
    mockRedisGet.mockResolvedValue('3'); // hourly counter: already at max

    const { checkResendRateLimit } = await import('./auth-actions');
    const result = await checkResendRateLimit('user-1');

    expect(result).toMatchObject({ allowed: false, maxReached: true });
  });

  it('uses separate Redis keys for cooldown (60s) and hourly (3600s) (Pitfall 5)', async () => {
    mockRedisTtl.mockResolvedValue(-2);
    mockRedisGet.mockResolvedValue(null);
    mockRedisIncr.mockResolvedValue(1);
    mockRedisExpire.mockResolvedValue(1);

    const { checkResendRateLimit } = await import('./auth-actions');
    await checkResendRateLimit('user-1');

    // Both key patterns must be referenced
    const allCalls = [
      ...mockRedisIncr.mock.calls.flat(),
      ...mockRedisExpire.mock.calls.flat(),
      ...mockRedisGet.mock.calls.flat(),
      ...mockRedisTtl.mock.calls.flat(),
    ];
    const usesRateKey = allCalls.some(
      (arg) => typeof arg === 'string' && arg.includes('email-resend:rate:user-1')
    );
    const usesHourlyKey = allCalls.some(
      (arg) => typeof arg === 'string' && arg.includes('email-resend:hourly:user-1')
    );

    expect(usesRateKey).toBe(true);
    expect(usesHourlyKey).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// AUTH-02 — sendVerificationEmail: checks Resend error (Pitfall 6)
// ---------------------------------------------------------------------------

describe('sendVerificationEmail()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrismaVerificationTokenCreate.mockResolvedValue({
      identifier: 'alice@example.com',
      token: 'test-token',
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
  });

  it('throws an error when Resend SDK returns an error object (Pitfall 6)', async () => {
    mockResendEmailsSend.mockResolvedValue({
      data: null,
      error: { message: 'Invalid API key', name: 'api_key_invalid', statusCode: 403 },
    });

    const { sendVerificationEmail } = await import('./auth-actions');
    await expect(
      sendVerificationEmail('alice@example.com', 'test-token')
    ).rejects.toThrow(/Failed to send/i);
  });

  it('resolves successfully when Resend returns no error', async () => {
    mockResendEmailsSend.mockResolvedValue({ data: { id: 'email-id' }, error: null });

    const { sendVerificationEmail } = await import('./auth-actions');
    await expect(
      sendVerificationEmail('alice@example.com', 'test-token')
    ).resolves.not.toThrow();
  });
});
