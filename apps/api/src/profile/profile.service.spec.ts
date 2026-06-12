/**
 * ProfileService unit tests — TDD RED → GREEN (Plan 06)
 *
 * PROF-02 (avatar upload constraints — 2MB max, JPEG/PNG/WebP only): implemented in Plan 06
 *
 * Tests use direct instantiation with mocked S3Client (no NestJS DI).
 * This matches the existing test pattern (jwt.guard.spec.ts) and avoids
 * emitDecoratorMetadata issues with Vitest's default transformer.
 *
 * S3Client and getSignedUrl are mocked so no real MinIO/R2 connection is needed.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';

// ─── Mock @aws-sdk before imports ─────────────────────────────────────────────
// NOTE: vi.mock is hoisted to top of file; factory must not reference variables
// declared with const/let that haven't been initialized at hoist time.
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(() => ({})),
  PutObjectCommand: vi.fn().mockImplementation((args: unknown) => ({ ...(args as object) })),
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://minio.local/avatars/signed-url'),
}));

import { ProfileService } from './profile.service';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const mockGetSignedUrl = vi.mocked(getSignedUrl);

// ─── Mock ConfigService ───────────────────────────────────────────────────────
const mockConfig = {
  get: vi.fn((key: string) => {
    const config: Record<string, string> = {
      MINIO_ENDPOINT: 'http://localhost:9000',
      MINIO_ACCESS_KEY: 'minioadmin',
      MINIO_SECRET_KEY: 'minioadmin',
      MINIO_BUCKET: 'english-learning',
    };
    return config[key];
  }),
} as unknown as ConfigService;

describe('ProfileService', () => {
  let service: ProfileService;

  beforeEach(() => {
    vi.clearAllMocks();
    // Restore implementation after clearAllMocks resets it
    mockGetSignedUrl.mockResolvedValue('https://minio.local/avatars/signed-url');
    service = new ProfileService(mockConfig);
  });

  // ---------------------------------------------------------------------------
  // PROF-02 — Avatar upload constraints (2MB max, JPEG/PNG/WebP only)
  // ---------------------------------------------------------------------------
  describe('generateAvatarUploadUrl()', () => {
    it('returns a presigned upload URL and key for a valid JPEG under 2MB', async () => {
      const result = await service.generateAvatarUploadUrl(
        'user-001',
        'photo.jpg',
        'image/jpeg',
        1024 * 1024, // 1 MB
      );

      expect(result).toHaveProperty('uploadUrl');
      expect(result).toHaveProperty('key');
      expect(result.key).toMatch(/^avatars\/user-001\/.+-photo\.jpg$/);
      expect(typeof result.uploadUrl).toBe('string');
    });

    it('returns a presigned upload URL for a valid PNG under 2MB', async () => {
      const result = await service.generateAvatarUploadUrl(
        'user-001',
        'avatar.png',
        'image/png',
        500 * 1024, // 500 KB
      );

      expect(result).toHaveProperty('uploadUrl');
      expect(result).toHaveProperty('key');
      expect(result.key).toMatch(/^avatars\/user-001\//);
    });

    it('returns a presigned upload URL for a valid WebP under 2MB', async () => {
      const result = await service.generateAvatarUploadUrl(
        'user-001',
        'face.webp',
        'image/webp',
        800 * 1024, // 800 KB
      );

      expect(result).toHaveProperty('uploadUrl');
      expect(result.key).toMatch(/^avatars\/user-001\//);
    });

    it('rejects a file that exceeds 2MB (throws BadRequestException)', async () => {
      const MAX_BYTES = 2 * 1024 * 1024; // 2,097,152 bytes

      await expect(
        service.generateAvatarUploadUrl(
          'user-001',
          'large.jpg',
          'image/jpeg',
          MAX_BYTES + 1, // 1 byte over 2MB
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a file with an unsupported MIME type (e.g. image/gif)', async () => {
      await expect(
        service.generateAvatarUploadUrl(
          'user-001',
          'anim.gif',
          'image/gif' as never,
          1024,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a file with contentType image/gif', async () => {
      await expect(
        service.generateAvatarUploadUrl(
          'user-001',
          'animation.gif',
          'image/gif' as never,
          200 * 1024,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a file with contentType image/svg+xml', async () => {
      await expect(
        service.generateAvatarUploadUrl(
          'user-001',
          'icon.svg',
          'image/svg+xml' as never,
          10 * 1024,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('key format is avatars/{userId}/{timestamp}-{filename}', async () => {
      const before = Date.now();
      const result = await service.generateAvatarUploadUrl(
        'user-abc',
        'myfile.jpg',
        'image/jpeg',
        100,
      );
      const after = Date.now();

      // Key must start with avatars/user-abc/
      expect(result.key).toMatch(/^avatars\/user-abc\//);

      // Extract the timestamp part from the key
      const keyParts = result.key.split('/');
      const filenamePart = keyParts[keyParts.length - 1] ?? ''; // e.g. "1234567890-myfile.jpg"
      const ts = parseInt(filenamePart.split('-')[0] ?? '0', 10);
      expect(ts).toBeGreaterThanOrEqual(before);
      expect(ts).toBeLessThanOrEqual(after);
    });
  });
});
