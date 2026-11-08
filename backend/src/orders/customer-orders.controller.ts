import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateReturnRequestBodyDto } from './dto/rma.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  AuthenticatedUser,
  OrderAdminDetailsDto,
  PaginatedResponse,
  ReturnRequestDto,
} from '@pinnacle/contracts';

@ApiTags('orders-customer')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('orders/my-orders')
export class CustomerOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @RequirePermissions('orders:view:own')
  @ApiOperation({ summary: "List current authenticated customer's own orders" })
  async getMyOrders(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<PaginatedResponse<OrderAdminDetailsDto>> {
    if (!user.customerId) {
      throw new ForbiddenException('No customer profile associated with this account');
    }

    return this.ordersService.getCustomerOrders(user.customerId, {
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 10,
    });
  }

  @Get(':orderNumber')
  @RequirePermissions('orders:view:own')
  @ApiOperation({ summary: 'Get details and tracking for an owned order' })
  async getMyOrderDetail(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderNumber') orderNumber: string,
  ): Promise<OrderAdminDetailsDto> {
    if (!user.customerId) {
      throw new ForbiddenException('No customer profile associated with this account');
    }

    return this.ordersService.getCustomerOrderDetail(user.customerId, orderNumber);
  }

  @Post(':orderNumber/cancel')
  @RequirePermissions('orders:cancel:own')
  @ApiOperation({ summary: 'Request cancellation before picking/dispatch' })
  async requestCancellation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderNumber') orderNumber: string,
    @Body('reason') reason: string,
  ): Promise<OrderAdminDetailsDto> {
    if (!user.customerId) {
      throw new ForbiddenException('No customer profile associated with this account');
    }

    if (!reason || reason.trim().length < 3) {
      throw new BadRequestException('A cancellation reason of at least 3 characters is required');
    }

    return this.ordersService.requestCustomerCancellation(
      user.customerId,
      orderNumber,
      reason.trim(),
    );
  }

  @Post(':orderNumber/return')
  @RequirePermissions('returns:request:own')
  @ApiOperation({ summary: 'Request an RMA return for delivered parts' })
  async requestReturn(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderNumber') orderNumber: string,
    @Body() dto: CreateReturnRequestBodyDto,
  ): Promise<ReturnRequestDto> {
    if (!user.customerId) {
      throw new ForbiddenException('No customer profile associated with this account');
    }

    // Ensure orderId in body matches the requested order
    const order = await this.ordersService.getCustomerOrderDetail(user.customerId, orderNumber);
    dto.orderId = order.id;

    return this.ordersService.createReturnRequest(user.customerId, dto);
  }
}
