import { PresignedUploadRequest, PresignedUploadResponse } from '@pinnacle/contracts';

export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 Megabytes

export interface IStorageService {
  /**
   * Validate requested file upload attributes against security constraints.
   */
  validateUploadRequest(request: PresignedUploadRequest): void;

  /**
   * Generates a pre-signed S3/MinIO upload URL or local upload URL
   * with secure key namespacing.
   */
  generatePresignedUploadUrl(request: PresignedUploadRequest): Promise<PresignedUploadResponse>;

  /**
   * Delete an object from storage by its S3/object key.
   */
  deleteFile(s3Key: string): Promise<void>;
}
