// apps/api/src/analytics/redis-cache.service.ts
// RedisCacheService — ioredis-backed cache service for AnalyticsModule.
//
// Security (T-08-11): admin aggregate queries cached here to prevent DB DoS.
// Pattern: profile.service.ts external-client constructor init (PATTERNS.md partial-match).
// REDIS_URL_CACHE default: redis://localhost:6380 — docker-compose redis-cache on port 6380.

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisCacheService implements OnModuleInit, OnModuleDestroy {
  private client!: Redis;
  private readonly logger = new Logger(RedisCacheService.name);

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    this.client = new Redis(
      this.config.get<string>('REDIS_URL_CACHE') ?? 'redis://localhost:6380',
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }

  // WR-05: Wrap get/set in try/catch so a transient Redis failure
  // falls through to the DB instead of crashing the request with a 500.
  async get<T>(key: string): Promise<T | null> {
    try {
      const val = await this.client.get(key);
      return val ? (JSON.parse(val) as T) : null;
    } catch (err) {
      this.logger.warn(`Redis get failed for key "${key}": ${(err as Error).message} — treating as cache miss`);
      return null; // cache miss fallthrough
    }
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    try {
      await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (err) {
      // WR-05: cache write failure is non-fatal — log and continue
      this.logger.warn(`Redis set failed for key "${key}": ${(err as Error).message}`);
    }
  }
}
