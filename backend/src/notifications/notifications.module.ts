import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DocumentsModule } from '../documents/documents.module';
import { NotificationsService } from './notifications.service';
import { MockEmailAdapter } from './adapters/mock-email.adapter';
import { SmtpEmailAdapter } from './adapters/smtp-email.adapter';
import { NotificationsController } from './notifications.controller';

@Module({
  imports: [PrismaModule, DocumentsModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    MockEmailAdapter,
    SmtpEmailAdapter,
  ],
  exports: [NotificationsService, MockEmailAdapter],
})
export class NotificationsModule {}

