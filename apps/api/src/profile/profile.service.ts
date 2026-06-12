/**
 * ProfileService — presigned avatar upload URL generation.
 *
 * Security (T-02-15, D-08):
 *   - contentType must be in the ALLOWED_MIME_TYPES allow-list [image/jpeg, image/png, image/webp]
 *   - sizeBytes must be <= MAX_SIZE_BYTES (2 MB = 2,097,152 bytes)
 *   - Constraints enforced BEFORE any presigned URL is issued — fails fast with 400.
 *
 * Storage key format (D-06, Pattern 4):
 *   avatars/{userId}/{timestamp}-{filename}
 *   Example: avatars/user-abc/1718180000000-photo.jpg
 *
 * Security (T-02-16): Only the storage key is returned; full URLs are reconstructed at read time.
 *
 * S3-compatible: works against MinIO (dev) and Cloudflare R2 (prod) via env vars.
 * Required env vars: MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY, MINIO_BUCKET
 */

import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB (D-08)
const PRESIGNED_URL_EXPIRY_SECONDS = 300; // 5 minutes

export interface AvatarUploadUrlResult {
  uploadUrl: string;
  key: string;
}

@Injectable()
export class ProfileService {
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService) {
    const endpoint = this.config.get<string>('MINIO_ENDPOINT');
    const accessKeyId = this.config.get<string>('MINIO_ACCESS_KEY') ?? '';
    const secretAccessKey = this.config.get<string>('MINIO_SECRET_KEY') ?? '';
    this.bucket =
      this.config.get<string>('MINIO_BUCKET') ?? 'english-learning';

    this.s3 = new S3Client({
      endpoint,
      region: 'us-east-1', // MinIO requires a region even though it ignores it
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: true, // Required for MinIO path-style URLs
    });
  }

  /**
   * D-08 / Pattern 4: Validate constraints then generate presigned PUT URL.
   *
   * @param userId    - from JWT (T-02-14 — never from request body)
   * @param filename  - original filename; included in key for debuggability
   * @param contentType - MIME type; must be in ALLOWED_MIME_TYPES
   * @param sizeBytes - declared file size; must be <= 2MB
   */
  async generateAvatarUploadUrl(
    userId: string,
    filename: string,
    contentType: AllowedMimeType | string,
    sizeBytes: number,
  ): Promise<AvatarUploadUrlResult> {
    // T-02-15: Reject disallowed MIME types before issuing URL
    if (!ALLOWED_MIME_TYPES.includes(contentType as AllowedMimeType)) {
      throw new BadRequestException(
        `Unsupported file type "${contentType}". Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }

    // T-02-15: Reject files exceeding 2MB
    if (sizeBytes > MAX_SIZE_BYTES) {
      throw new BadRequestException(
        `File size ${sizeBytes} bytes exceeds the 2 MB limit (${MAX_SIZE_BYTES} bytes)`,
      );
    }

    // D-06 key format: avatars/{userId}/{timestamp}-{filename}
    const key = `avatars/${userId}/${Date.now()}-${filename}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
      ContentLength: sizeBytes,
    });

    const uploadUrl = await getSignedUrl(this.s3, command, {
      expiresIn: PRESIGNED_URL_EXPIRY_SECONDS,
    });

    return { uploadUrl, key };
  }
}
