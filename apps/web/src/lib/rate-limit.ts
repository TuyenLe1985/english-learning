/**
 * Redis-based rate limiting for email operations.
 *
 * D-02: 1 resend per 60 seconds, max 3 resends per hour per user.
 * Pitfall 5: Counters in Redis (REDIS_URL_CACHE) — survive process restarts and horizontal scaling.
 * T-02-06: Redis counter keys have TTL so they expire automatically.
 *
 * CR-04 fix: Replaced non-atomic check-then-set with a Lua script that executes
 * the full check + increment atomically in a single Redis round-trip. This
 * prevents concurrent requests from bypassing the rate limit by both passing
 * the TTL/count checks before either increments the counters.
 *
 * Key patterns:
 * - `email-resend:rate:{userId}`   — 60s cooldown lock (INCR + EXPIRE 60)
 * - `email-resend:hourly:{userId}` — hourly counter (INCR + EXPIRE 3600 on first call)
 * - `password-reset:rate:{email}`  — 60s cooldown lock for password reset
 * - `password-reset:hourly:{email}`— hourly counter for password reset
 */

import Redis from 'ioredis';

// Single shared Redis client — both auth-actions.ts and rate-limit.ts use this.
// CR-04 fix: eliminated the duplicate _redis in auth-actions.ts; all callers
// import getRateLimitRedis() from this module.
let _redis: Redis | null = null;

export function getRateLimitRedis(): Redis {
  if (!_redis) {
    _redis = new Redis(process.env.REDIS_URL_CACHE ?? 'redis://localhost:6380');
  }
  return _redis;
}

export const RATE_LIMIT_COOLDOWN_SECONDS = 60;
export const RATE_LIMIT_HOURLY_MAX = 3;
export const RATE_LIMIT_HOURLY_WINDOW_SECONDS = 3600;

export interface RateLimitCheck {
  allowed: boolean;
  retryAfter?: number; // seconds until cooldown expires (if cooldown-blocked)
  maxReached?: boolean; // true if hourly max hit
}

/**
 * Lua script for atomic rate-limit check + increment.
 *
 * KEYS[1] = cooldownKey
 * KEYS[2] = hourlyKey
 * ARGV[1] = hourly max (e.g. "3")
 * ARGV[2] = cooldown window seconds (e.g. "60")
 * ARGV[3] = hourly window seconds (e.g. "3600")
 *
 * Returns a 3-element array: [allowed, retryAfter, maxReached]
 *   allowed    = 1 (allowed) | 0 (blocked)
 *   retryAfter = seconds remaining on cooldown (0 if not cooldown-blocked)
 *   maxReached = 1 if hourly limit hit, 0 otherwise
 */
const LUA_RATE_LIMIT = `
  local cooldown = redis.call('TTL', KEYS[1])
  if cooldown > 0 then return {0, cooldown, 0} end
  local hourly = tonumber(redis.call('GET', KEYS[2]) or '0')
  if hourly >= tonumber(ARGV[1]) then return {0, 0, 1} end
  redis.call('INCR', KEYS[1])
  redis.call('EXPIRE', KEYS[1], ARGV[2])
  local newHourly = redis.call('INCR', KEYS[2])
  if newHourly == 1 then redis.call('EXPIRE', KEYS[2], ARGV[3]) end
  return {1, 0, 0}
`;

/**
 * Internal helper — runs the atomic Lua rate-limit check against the given keys.
 */
async function atomicRateLimit(
  cooldownKey: string,
  hourlyKey: string,
): Promise<RateLimitCheck> {
  const redis = getRateLimitRedis();
  const result = (await redis.eval(
    LUA_RATE_LIMIT,
    2,
    cooldownKey,
    hourlyKey,
    String(RATE_LIMIT_HOURLY_MAX),
    String(RATE_LIMIT_COOLDOWN_SECONDS),
    String(RATE_LIMIT_HOURLY_WINDOW_SECONDS),
  )) as [number, number, number];

  const [allowed, retryAfter, maxReached] = result;
  if (allowed === 1) return { allowed: true };
  if (retryAfter > 0) return { allowed: false, retryAfter };
  return { allowed: false, maxReached: true };
}

/**
 * Check and record an email-resend attempt for the given user.
 *
 * Returns { allowed: true } if the request is permitted.
 * Returns { allowed: false, retryAfter: N } if within the 60s cooldown.
 * Returns { allowed: false, maxReached: true } if hourly limit reached.
 *
 * When allowed=true, the counters are incremented as a side effect.
 * The check + increment is performed atomically via a Lua script (CR-04).
 */
export async function checkEmailResendRateLimit(userId: string): Promise<RateLimitCheck> {
  return atomicRateLimit(
    `email-resend:rate:${userId}`,
    `email-resend:hourly:${userId}`,
  );
}

/**
 * Check and record a password-reset request for the given email.
 * CR-05: Rate-limits password reset requests to prevent email flooding.
 *
 * Uses email (lowercased) as the key namespace — not userId — so the check
 * happens before the DB lookup and prevents enumeration via timing differences.
 *
 * Returns { allowed: true } if the request is permitted.
 * Returns { allowed: false, retryAfter: N } if within the 60s cooldown.
 * Returns { allowed: false, maxReached: true } if hourly limit reached.
 */
export async function checkPasswordResetRateLimit(email: string): Promise<RateLimitCheck> {
  return atomicRateLimit(
    `password-reset:rate:${email}`,
    `password-reset:hourly:${email}`,
  );
}
