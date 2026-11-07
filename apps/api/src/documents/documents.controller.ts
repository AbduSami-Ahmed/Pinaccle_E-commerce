import {
  Controller,
  Get,
  Param,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser, DocumentRecordDto } from '@pinnacle/contracts';
import { DocumentsService } from './documents.service';

@ApiTags('Documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get(':id/download')
  @ApiOperation({ summary: 'Securely download or view a PDF invoice/receipt' })
  async downloadDocument(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const file = await this.documentsService.getDocumentFile(id, user);

    res.setHeader('Content-Type', file.mimeType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${file.fileName}"`,
    );
    res.setHeader('Content-Length', file.buffer.length);
    res.end(file.buffer);
  }

  @Get('order/:orderNumber/invoice')
  @ApiOperation({ summary: 'Get or generate invoice metadata for an order' })
  async getInvoiceByOrderNumber(
    @Param('orderNumber') orderNumber: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DocumentRecordDto> {
    return this.documentsService.getInvoiceByOrderNumber(orderNumber, user);
  }

  @Get('customer/:customerId')
  @ApiOperation({ summary: 'List customer documents (Customer/Staff)' })
  async getCustomerDocuments(
    @Param('customerId') customerId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DocumentRecordDto[]> {
    return this.documentsService.getCustomerDocuments(customerId, user);
  }
}

