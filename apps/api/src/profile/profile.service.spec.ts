/**
 * Wave 0 RED scaffolds for ProfileService (avatar upload)
 * These tests fail until the owning plans implement the service.
 *
 * PROF-02 (avatar upload constraints — 2MB, JPEG/PNG/WebP): implemented in Plan 06
 */

import { describe, it, expect } from 'vitest';

describe('ProfileService', () => {
  // ---------------------------------------------------------------------------
  // PROF-02 — Avatar upload constraints (2MB max, JPEG/PNG/WebP only)
  // Owning plan: Plan 06
  // ---------------------------------------------------------------------------
  describe('getAvatarUploadUrl()', () => {
    it('returns a presigned upload URL for a valid JPEG under 2MB [RED: implemented in Plan 06]', () => {
      // RED: ProfileService does not exist yet. Plan 06 will implement
      // getAvatarUploadUrl() that validates AvatarUploadUrlRequestSchema
      // and returns a presigned URL from MinIO/R2.
      expect(false).toBe(true); // RED: implemented in Plan 06
    });

    it('returns a presigned upload URL for a valid PNG under 2MB [RED: implemented in Plan 06]', () => {
      // RED: implemented in Plan 06
      expect(false).toBe(true); // RED: implemented in Plan 06
    });

    it('returns a presigned upload URL for a valid WebP under 2MB [RED: implemented in Plan 06]', () => {
      // RED: implemented in Plan 06
      expect(false).toBe(true); // RED: implemented in Plan 06
    });

    it('rejects a file that exceeds 2MB (throws BadRequestException) [RED: implemented in Plan 06]', () => {
      // RED: Plan 06 will validate sizeBytes <= 2 * 1024 * 1024 (2,097,152 bytes).
      // Files exceeding this limit must be rejected with BadRequestException.
      expect(false).toBe(true); // RED: implemented in Plan 06
    });

    it('rejects a file with an unsupported MIME type (e.g. image/gif) [RED: implemented in Plan 06]', () => {
      // RED: Plan 06 will validate contentType against ["image/jpeg", "image/png", "image/webp"].
      // Any other MIME type (gif, bmp, tiff, svg, etc.) must be rejected.
      expect(false).toBe(true); // RED: implemented in Plan 06
    });

    it('rejects a file with contentType image/gif [RED: implemented in Plan 06]', () => {
      // RED: implemented in Plan 06
      expect(false).toBe(true); // RED: implemented in Plan 06
    });

    it('rejects a file with contentType image/svg+xml [RED: implemented in Plan 06]', () => {
      // RED: implemented in Plan 06
      expect(false).toBe(true); // RED: implemented in Plan 06
    });
  });
});
