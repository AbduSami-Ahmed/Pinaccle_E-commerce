import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { StorageService } from '../storage/storage.service';
import { PresignedUploadRequestDto } from './dto/presign-upload.dto';
import { PresignedUploadResponse } from '@pinnacle/contracts';

@ApiTags('Catalog - Media & Object Storage')
@Controller('catalog/media')
export class MediaController {
  constructor(private readonly storageService: StorageService) {}

  @Post('presign')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('catalog:product:update')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtain pre-signed upload URL for product media' })
  @HttpCode(HttpStatus.OK)
  async getPresignedUploadUrl(
    @Body() dto: PresignedUploadRequestDto,
  ): Promise<PresignedUploadResponse> {
    return this.storageService.generatePresignedUploadUrl(dto);
  }

  @Post('upload')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('catalog:product:update')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Direct binary/base64 upload endpoint (Development / Fallback)' })
  @HttpCode(HttpStatus.CREATED)
  async uploadDirect(
    @Body() body: { s3Key: string; base64Data: string; mimeType: string },
  ): Promise<{ s3Key: string; cdnUrl: string }> {
    if (!body.s3Key || !body.base64Data) {
      throw new BadRequestException('s3Key and base64Data are required');
    }

    const buffer = Buffer.from(body.base64Data, 'base64');
    this.storageService.validateUploadRequest({
      fileName: body.s3Key,
      fileType: body.mimeType || 'image/jpeg',
      fileSizeBytes: buffer.length,
    });

    const cdnUrl = await this.storageService.saveUploadedFile(body.s3Key, buffer);
    return { s3Key: body.s3Key, cdnUrl };
  }
}
