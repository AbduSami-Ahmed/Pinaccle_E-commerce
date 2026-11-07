import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { AuditService } from './audit.service';
import { AuditQueryDto } from './dto/audit-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { AuditLogPageDto } from '@pinnacle/contracts';

@ApiTags('Audit Logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @RequirePermissions('audit:logs:view')
  @ApiOperation({ summary: 'List and search immutable audit logs (staff only)' })
  async getAuditLogs(@Query() query: AuditQueryDto): Promise<AuditLogPageDto> {
    return this.auditService.findLogs(query);
  }

  @Get('export')
  @RequirePermissions('audit:logs:view')
  @ApiOperation({ summary: 'Export audit logs as CSV' })
  async exportAuditLogs(@Query() query: AuditQueryDto, @Res() res: Response): Promise<void> {
    const csvData = await this.auditService.exportLogsCsv(query);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${Date.now()}.csv`);
    res.status(200).send(csvData);
  }
}
