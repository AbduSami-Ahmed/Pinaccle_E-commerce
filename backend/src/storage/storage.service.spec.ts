import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageService } from './storage.service';

describe('StorageService (Path Traversal & Security Hardening)', () => {
  let service: StorageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'STORAGE_CDN_URL') return 'http://localhost:4000/uploads';
              if (key === 'API_BASE_URL') return 'http://localhost:4000/api/v1';
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<StorageService>(StorageService);
  });

  describe('Path Traversal Prevention', () => {
    it('blocks path traversal attempt with ../ sequence', async () => {
      const buffer = Buffer.from('fake image content');
      await expect(
        service.saveUploadedFile('../../../etc/passwd', buffer),
      ).rejects.toThrow(BadRequestException);
    });

    it('blocks path traversal with windows backslash ..\\ sequence', async () => {
      const buffer = Buffer.from('fake image content');
      await expect(
        service.saveUploadedFile('..\\..\\windows\\system32\\cmd.exe', buffer),
      ).rejects.toThrow(BadRequestException);
    });

    it('blocks storage keys containing null bytes', async () => {
      const buffer = Buffer.from('fake image content');
      await expect(
        service.saveUploadedFile('products/image\0.jpg', buffer),
      ).rejects.toThrow(BadRequestException);
    });

    it('blocks file deletion with path traversal key', async () => {
      await expect(
        service.deleteFile('../../../sensitive.key'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Upload Request Validation', () => {
    it('rejects disallowed file mime types (e.g. application/x-msdownload or text/html)', () => {
      expect(() =>
        service.validateUploadRequest({
          fileName: 'malicious.exe',
          fileType: 'application/x-msdownload',
          fileSizeBytes: 1024,
        }),
      ).toThrow(BadRequestException);

      expect(() =>
        service.validateUploadRequest({
          fileName: 'exploit.html',
          fileType: 'text/html',
          fileSizeBytes: 1024,
        }),
      ).toThrow(BadRequestException);
    });

    it('accepts legitimate image types (jpeg, png, webp)', () => {
      expect(() =>
        service.validateUploadRequest({
          fileName: 'seatbelt-sensor.jpg',
          fileType: 'image/jpeg',
          fileSizeBytes: 50000,
        }),
      ).not.toThrow();
    });

    it('rejects files exceeding maximum size limit', () => {
      expect(() =>
        service.validateUploadRequest({
          fileName: 'huge-file.png',
          fileType: 'image/png',
          fileSizeBytes: 20 * 1024 * 1024, // 20MB exceeds 10MB limit
        }),
      ).toThrow(BadRequestException);
    });
  });
});

