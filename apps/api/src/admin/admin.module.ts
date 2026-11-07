import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminExportService } from './admin-export.service';
import { AdminExportController } from './admin-export.controller';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [AdminDashboardController, AdminExportController],
  providers: [AdminDashboardService, AdminExportService],
  exports: [AdminDashboardService, AdminExportService],
})
export class AdminModule {}
