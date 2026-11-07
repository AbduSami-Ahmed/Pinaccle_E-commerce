import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { NotificationsService } from './notifications.service';
import {
  NotificationPageDto,
  NotificationQueryDto,
  NotificationRecordDto,
} from '@pinnacle/contracts';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @RequirePermissions('orders:view:all')
  @ApiOperation({ summary: 'List notification event history with filtering (Staff)' })
  async getNotifications(
    @Query() query: NotificationQueryDto,
  ): Promise<NotificationPageDto> {
    return this.notificationsService.getNotifications(query);
  }

  @Get(':id')
  @RequirePermissions('orders:view:all')
  @ApiOperation({ summary: 'Get notification record details by ID (Staff)' })
  async getNotificationById(
    @Param('id') id: string,
  ): Promise<NotificationRecordDto> {
    return this.notificationsService.getNotificationById(id);
  }

  @Post(':id/retry')
  @RequirePermissions('orders:status:update')
  @ApiOperation({ summary: 'Retry a failed notification delivery (Staff)' })
  async retryNotification(
    @Param('id') id: string,
  ): Promise<NotificationRecordDto> {
    return this.notificationsService.retryNotification(id);
  }
}

