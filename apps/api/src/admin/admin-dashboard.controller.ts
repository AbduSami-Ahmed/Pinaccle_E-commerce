import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminDashboardService } from './admin-dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { DashboardDateRange, DashboardSummaryDto } from '@pinnacle/contracts';

@ApiTags('Admin Operations & Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('admin/dashboard')
export class AdminDashboardController {
  constructor(private readonly dashboardService: AdminDashboardService) {}

  @Get('summary')
  @RequirePermissions('orders:view:all')
  @ApiOperation({
    summary: 'Get unified business dashboard performance summary and operational queues',
  })
  async getSummary(
    @Query('range') range?: DashboardDateRange,
  ): Promise<{ summary: DashboardSummaryDto }> {
    const summary = await this.dashboardService.getDashboardSummary(range || '30d');
    return { summary };
  }
}
