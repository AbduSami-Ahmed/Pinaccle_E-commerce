import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { SettingsService } from './settings.service';
import { UpdateBusinessSettingsDto } from './dto/update-settings.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser, BusinessSettingsDto } from '@pinnacle/contracts';

@ApiTags('Business Settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get business and store configuration' })
  getSettings(): { settings: BusinessSettingsDto } {
    const settings = this.settingsService.getSettings();
    return { settings };
  }

  @Patch()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('system:settings:manage')
  @ApiOperation({ summary: 'Update business settings (authorized staff only)' })
  async updateSettings(
    @Body() dto: UpdateBusinessSettingsDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ): Promise<{ settings: BusinessSettingsDto }> {
    const ipAddress = req.ip || (req.headers['x-forwarded-for'] as string);
    const settings = await this.settingsService.updateSettings(dto, user.sub, ipAddress);
    return { settings };
  }
}
