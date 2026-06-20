// apps/api/src/analytics/redis-cache.service.ts
// RedisCacheService — ioredis-backed cache service for AnalyticsModule.
//
// Security (T-08-11): admin aggregate queries cached here to prevent DB DoS.
// Pattern: profile.service.ts external-client constructor init (PATTERNS.md partial-match).
// REDIS_URL_CACHE default: redis://localhost:6380 — docker-compose redis-cache on port 6380.

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisCacheService implements OnModuleInit, OnModuleDestroy {
  private client!: Redis;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    this.client = new Redis(
      this.config.get<string>('REDIS_URL_CACHE') ?? 'redis://localhost:6380',
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }

  async get<T>(key: string): Promise<T | null> {
    const val = await this.client.get(key);
    return val ? (JSON.parse(val) as T) : null;
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  }
}
