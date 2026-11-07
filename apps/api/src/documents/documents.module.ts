import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DocumentsService } from './documents.service';
import { PdfGeneratorService } from './pdf-generator.service';
import { DocumentsController } from './documents.controller';

@Module({
  imports: [PrismaModule],
  controllers: [DocumentsController],
  providers: [DocumentsService, PdfGeneratorService],
  exports: [DocumentsService, PdfGeneratorService],
})
export class DocumentsModule {}

