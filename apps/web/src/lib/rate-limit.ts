/**
 * Redis-based rate limiting for email resend operations.
 *
 * D-02: 1 resend per 60 seconds, max 3 resends per hour per user.
 * Pitfall 5: Counters in Redis (REDIS_URL_CACHE) — survive process restarts and horizontal scaling.
 * T-02-06: Redis counter keys have TTL so they expire automatically.
 *
 * Key patterns:
 * - `email-resend:rate:{userId}`   — 60s cooldown lock (INCR + EXPIRE 60)
 * - `email-resend:hourly:{userId}` — hourly counter (INCR + EXPIRE 3600 on first call)
 */

import Redis from 'ioredis';

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
 * Check and record a resend attempt for the given user.
 *
 * Returns { allowed: true } if the request is permitted.
 * Returns { allowed: false, retryAfter: N } if within the 60s cooldown.
 * Returns { allowed: false, maxReached: true } if hourly limit reached.
 *
 * When allowed=true, the counters are incremented as a side effect.
 */
export async function checkEmailResendRateLimit(userId: string): Promise<RateLimitCheck> {
  const redis = getRateLimitRedis();

  const cooldownKey = `email-resend:rate:${userId}`;
  const hourlyKey = `email-resend:hourly:${userId}`;

  // 1. Check 60s per-call cooldown
  const cooldownTtl = await redis.ttl(cooldownKey);
  if (cooldownTtl > 0) {
    return { allowed: false, retryAfter: cooldownTtl };
  }

  // 2. Check hourly limit
  const hourlyCountStr = await redis.get(hourlyKey);
  if (hourlyCountStr !== null && parseInt(hourlyCountStr, 10) >= RATE_LIMIT_HOURLY_MAX) {
    return { allowed: false, maxReached: true };
  }

  // 3. Record the attempt — increment both counters
  await redis.incr(cooldownKey);
  await redis.expire(cooldownKey, RATE_LIMIT_COOLDOWN_SECONDS);

  const newHourlyCount = await redis.incr(hourlyKey);
  if (newHourlyCount === 1) {
    // Set TTL only on first increment so the window slides correctly
    await redis.expire(hourlyKey, RATE_LIMIT_HOURLY_WINDOW_SECONDS);
  }

  return { allowed: true };
}
