import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes, randomUUID } from 'crypto';
import * as path from 'path';
import * as fs from 'fs';
import { ALLOWED_MIME_TYPES, IStorageService, MAX_FILE_SIZE_BYTES } from './storage.interface';
import { PresignedUploadRequest, PresignedUploadResponse } from '@pinnacle/contracts';

@Injectable()
export class StorageService implements IStorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly uploadDir: string;
  private readonly cdnBaseUrl: string;
  private readonly apiBaseUrl: string;

  constructor(private readonly config: ConfigService) {
    this.cdnBaseUrl =
      this.config.get<string>('STORAGE_CDN_URL') ??
      this.config.get<string>('AWS_CLOUDFRONT_URL') ??
      'http://localhost:4000/uploads';

    this.apiBaseUrl = this.config.get<string>('API_BASE_URL') ?? 'http://localhost:4000/api/v1';

    this.uploadDir = path.resolve(process.cwd(), 'uploads');
    if (!fs.existsSync(this.uploadDir)) {
      try {
        fs.mkdirSync(this.uploadDir, { recursive: true });
      } catch (err) {
        this.logger.warn(`Could not create uploads directory: ${(err as Error).message}`);
      }
    }
  }

  validateUploadRequest(request: PresignedUploadRequest): void {
    if (!request.fileName || typeof request.fileName !== 'string') {
      throw new BadRequestException('File name is required and must be a string');
    }

    if (!ALLOWED_MIME_TYPES.includes(request.fileType as any)) {
      throw new BadRequestException(
        `Invalid file type "${request.fileType}". Allowed formats: ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }

    if (
      !request.fileSizeBytes ||
      typeof request.fileSizeBytes !== 'number' ||
      request.fileSizeBytes <= 0
    ) {
      throw new BadRequestException('File size in bytes must be a positive number');
    }

    if (request.fileSizeBytes > MAX_FILE_SIZE_BYTES) {
      const maxMb = MAX_FILE_SIZE_BYTES / (1024 * 1024);
      throw new BadRequestException(`File size exceeds maximum allowed limit of ${maxMb}MB`);
    }
  }

  async generatePresignedUploadUrl(
    request: PresignedUploadRequest,
  ): Promise<PresignedUploadResponse> {
    this.validateUploadRequest(request);

    // Sanitize file name
    const ext = path.extname(request.fileName).toLowerCase() || '.jpg';
    const baseName = path
      .basename(request.fileName, ext)
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '-')
      .slice(0, 40);

    const s3Key = `products/${Date.now()}-${randomUUID().slice(0, 8)}-${baseName}${ext}`;
    const token = randomBytes(16).toString('hex');
    const expiresInSeconds = 900; // 15 minutes

    const uploadUrl = `${this.apiBaseUrl}/catalog/media/upload?key=${encodeURIComponent(
      s3Key,
    )}&token=${token}`;

    const cdnUrl = `${this.cdnBaseUrl}/${s3Key}`;

    return {
      uploadUrl,
      s3Key,
      cdnUrl,
      expiresInSeconds,
    };
  }

  async saveUploadedFile(s3Key: string, buffer: Buffer): Promise<string> {
    const filePath = path.join(this.uploadDir, s3Key);
    const dir = path.dirname(filePath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    await fs.promises.writeFile(filePath, buffer);
    return `${this.cdnBaseUrl}/${s3Key}`;
  }

  async deleteFile(s3Key: string): Promise<void> {
    const filePath = path.join(this.uploadDir, s3Key);
    try {
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
    } catch (err) {
      this.logger.warn(`Failed to delete file ${s3Key}: ${(err as Error).message}`);
    }
  }
}
