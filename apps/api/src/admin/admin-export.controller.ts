import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { AdminExportService } from './admin-export.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser, DashboardDateRange } from '@pinnacle/contracts';

@ApiTags('Admin Operations & Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('admin/export')
export class AdminExportController {
  constructor(private readonly exportService: AdminExportService) {}

  @Get('orders')
  @RequirePermissions('orders:view:all')
  @ApiOperation({ summary: 'Export orders report as CSV (PII masked unless permitted)' })
  async exportOrders(
    @Query('range') range: DashboardDateRange,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ): Promise<void> {
    const csvData = await this.exportService.exportOrdersCsv(range || '30d', user);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=orders-report-${Date.now()}.csv`);
    res.status(200).send(csvData);
  }

  @Get('inventory')
  @RequirePermissions('inventory:stock:view_quantity')
  @ApiOperation({ summary: 'Export inventory stock valuation report as CSV' })
  async exportInventory(
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ): Promise<void> {
    const csvData = await this.exportService.exportInventoryCsv(user);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=inventory-stock-${Date.now()}.csv`);
    res.status(200).send(csvData);
  }
}
