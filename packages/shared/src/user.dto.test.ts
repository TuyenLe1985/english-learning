/**
 * Tests for shared user DTOs (UserProfileDtoSchema, UpdateProfileDtoSchema, AvatarUploadUrlRequestSchema)
 *
 * These schemas were implemented in Plan 01 (packages/shared/src/user.dto.ts).
 * This test file was scaffolded in Plan 02 (Wave 0) and can be GREEN immediately
 * because the schemas exist.
 *
 * Note: If Plan 01 has not been merged/executed, mark as RED until it is.
 */

import { describe, it, expect } from 'vitest';
import {
  UserProfileDtoSchema,
  UpdateProfileDtoSchema,
  AvatarUploadUrlRequestSchema,
} from './user.dto';

// ---------------------------------------------------------------------------
// UserProfileDtoSchema
// ---------------------------------------------------------------------------
describe('UserProfileDtoSchema', () => {
  const validProfile = {
    id: 'user-123',
    email: 'learner@example.com',
    name: 'Alice',
    avatarUrl: null,
    cefrLevel: 'B1' as const,
    xpTotal: 1240,
    level: 5,
    createdAt: '2026-06-01T00:00:00.000Z',
    lastActiveAt: '2026-06-12T10:00:00.000Z',
    emailVerified: '2026-06-01T00:01:00.000Z',
  };

  it('parses a valid UserProfileDto object', () => {
    const result = UserProfileDtoSchema.safeParse(validProfile);
    expect(result.success).toBe(true);
  });

  it('accepts null for avatarUrl', () => {
    const result = UserProfileDtoSchema.safeParse({ ...validProfile, avatarUrl: null });
    expect(result.success).toBe(true);
  });

  it('accepts null for emailVerified', () => {
    const result = UserProfileDtoSchema.safeParse({ ...validProfile, emailVerified: null });
    expect(result.success).toBe(true);
  });

  it('accepts B2 cefrLevel', () => {
    const result = UserProfileDtoSchema.safeParse({ ...validProfile, cefrLevel: 'B2' });
    expect(result.success).toBe(true);
  });

  it('accepts C1 cefrLevel', () => {
    const result = UserProfileDtoSchema.safeParse({ ...validProfile, cefrLevel: 'C1' });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid cefrLevel (e.g. A1)', () => {
    const result = UserProfileDtoSchema.safeParse({ ...validProfile, cefrLevel: 'A1' });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid email address', () => {
    const result = UserProfileDtoSchema.safeParse({ ...validProfile, email: 'not-an-email' });
    expect(result.success).toBe(false);
  });

  it('rejects a missing required field (id)', () => {
    const { id: _id, ...withoutId } = validProfile;
    const result = UserProfileDtoSchema.safeParse(withoutId);
    expect(result.success).toBe(false);
  });

  it('rejects an invalid datetime for createdAt', () => {
    const result = UserProfileDtoSchema.safeParse({ ...validProfile, createdAt: 'not-a-date' });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// UpdateProfileDtoSchema
// ---------------------------------------------------------------------------
describe('UpdateProfileDtoSchema', () => {
  it('parses an object with only name', () => {
    const result = UpdateProfileDtoSchema.safeParse({ name: 'Bob' });
    expect(result.success).toBe(true);
  });

  it('parses an object with only avatarKey', () => {
    const result = UpdateProfileDtoSchema.safeParse({ avatarKey: 'avatars/user-123.jpg' });
    expect(result.success).toBe(true);
  });

  it('parses an object with both name and avatarKey', () => {
    const result = UpdateProfileDtoSchema.safeParse({
      name: 'Bob',
      avatarKey: 'avatars/user-123.jpg',
    });
    expect(result.success).toBe(true);
  });

  it('parses an empty object (both fields are optional)', () => {
    const result = UpdateProfileDtoSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('rejects a name that is empty string (min length 1)', () => {
    const result = UpdateProfileDtoSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects a name exceeding 100 characters (max length 100)', () => {
    const result = UpdateProfileDtoSchema.safeParse({ name: 'A'.repeat(101) });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// AvatarUploadUrlRequestSchema
// ---------------------------------------------------------------------------
describe('AvatarUploadUrlRequestSchema', () => {
  const valid2MbJpeg = {
    filename: 'avatar.jpg',
    contentType: 'image/jpeg' as const,
    sizeBytes: 1024 * 1024, // 1 MB
  };

  it('parses a valid JPEG upload request', () => {
    const result = AvatarUploadUrlRequestSchema.safeParse(valid2MbJpeg);
    expect(result.success).toBe(true);
  });

  it('parses a valid PNG upload request', () => {
    const result = AvatarUploadUrlRequestSchema.safeParse({
      ...valid2MbJpeg,
      filename: 'avatar.png',
      contentType: 'image/png',
    });
    expect(result.success).toBe(true);
  });

  it('parses a valid WebP upload request', () => {
    const result = AvatarUploadUrlRequestSchema.safeParse({
      ...valid2MbJpeg,
      filename: 'avatar.webp',
      contentType: 'image/webp',
    });
    expect(result.success).toBe(true);
  });

  it('parses a file exactly at the 2MB limit', () => {
    const result = AvatarUploadUrlRequestSchema.safeParse({
      ...valid2MbJpeg,
      sizeBytes: 2 * 1024 * 1024, // exactly 2 MB
    });
    expect(result.success).toBe(true);
  });

  it('rejects a file exceeding the 2MB limit', () => {
    const result = AvatarUploadUrlRequestSchema.safeParse({
      ...valid2MbJpeg,
      sizeBytes: 2 * 1024 * 1024 + 1, // 1 byte over 2 MB
    });
    expect(result.success).toBe(false);
  });

  it('rejects an unsupported contentType (image/gif)', () => {
    const result = AvatarUploadUrlRequestSchema.safeParse({
      ...valid2MbJpeg,
      contentType: 'image/gif',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an unsupported contentType (image/svg+xml)', () => {
    const result = AvatarUploadUrlRequestSchema.safeParse({
      ...valid2MbJpeg,
      contentType: 'image/svg+xml',
    });
    expect(result.success).toBe(false);
  });

  it('rejects when filename is missing', () => {
    const { filename: _f, ...withoutFilename } = valid2MbJpeg;
    const result = AvatarUploadUrlRequestSchema.safeParse(withoutFilename);
    expect(result.success).toBe(false);
  });
});
