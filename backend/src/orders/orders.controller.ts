import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { OrderQueryBodyDto } from './dto/order-query.dto';
import {
  CancelOrderBodyDto,
  ConfirmDepotCollectionBodyDto,
  DispatchCourierShipmentBodyDto,
  PickPackOrderBodyDto,
  ProcessRefundBodyDto,
  UpdateOrderStatusBodyDto,
} from './dto/order-actions.dto';
import { RecordReturnInspectionBodyDto, ReviewReturnRequestBodyDto } from './dto/rma.dto';
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

@ApiTags('orders-admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @RequirePermissions('orders:view:all')
  @ApiOperation({ summary: 'Search and filter customer orders (Staff)' })
  async getOrders(
    @Query() query: OrderQueryBodyDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PaginatedResponse<OrderAdminDetailsDto>> {
    return this.ordersService.getOrders(query, user);
  }

  @Get(':id')
  @RequirePermissions('orders:view:all')
  @ApiOperation({ summary: 'Get full order details with timeline history (Staff)' })
  async getOrderDetails(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OrderAdminDetailsDto> {
    return this.ordersService.getOrderDetails(id, user);
  }

  @Patch(':id/status')
  @RequirePermissions('orders:status:update')
  @ApiOperation({ summary: 'Perform validated order status state machine transition' })
  async updateOrderStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusBodyDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OrderAdminDetailsDto> {
    return this.ordersService.updateOrderStatus(id, dto, user.sub);
  }

  @Post(':id/pick-pack')
  @RequirePermissions('orders:fulfill:pick_pack')
  @ApiOperation({ summary: 'Mark order as picked and packed at warehouse' })
  async pickPackOrder(
    @Param('id') id: string,
    @Body() dto: PickPackOrderBodyDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OrderAdminDetailsDto> {
    return this.ordersService.pickPackOrder(id, dto, user.sub);
  }

  @Post(':id/dispatch')
  @RequirePermissions('orders:fulfill:dispatch')
  @ApiOperation({ summary: 'Dispatch courier shipment with carrier & tracking consignment' })
  async dispatchCourierShipment(
    @Param('id') id: string,
    @Body() dto: DispatchCourierShipmentBodyDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OrderAdminDetailsDto> {
    return this.ordersService.dispatchCourierShipment(id, dto, user.sub);
  }

  @Post(':id/collect')
  @RequirePermissions('orders:fulfill:dispatch')
  @ApiOperation({ summary: 'Confirm Click & Collect trade counter pickup at Auckland Penrose depot' })
  async confirmDepotCollection(
    @Param('id') id: string,
    @Body() dto: ConfirmDepotCollectionBodyDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OrderAdminDetailsDto> {
    return this.ordersService.confirmDepotCollection(id, dto, user.sub);
  }

  @Post(':id/cancel')
  @RequirePermissions('orders:cancel:any')
  @ApiOperation({ summary: 'Cancel order and release/restock inventory' })
  async cancelOrder(
    @Param('id') id: string,
    @Body() dto: CancelOrderBodyDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OrderAdminDetailsDto> {
    return this.ordersService.cancelAndRefundOrder(id, dto, user.sub);
  }

  @Post(':id/refund')
  @RequirePermissions('payments:refund:process')
  @ApiOperation({ summary: 'Execute authorized payment refund via payment gateway' })
  async processRefund(
    @Param('id') id: string,
    @Body() dto: ProcessRefundBodyDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OrderAdminDetailsDto> {
    return this.ordersService.processOrderRefund(id, dto, user.sub);
  }

  @Patch('returns/:returnId/review')
  @RequirePermissions('returns:review:approve_reject')
  @ApiOperation({ summary: 'Review and approve/reject customer RMA return request' })
  async reviewReturnRequest(
    @Param('returnId') returnId: string,
    @Body() dto: ReviewReturnRequestBodyDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ReturnRequestDto> {
    return this.ordersService.reviewReturnRequest(returnId, dto, user.sub);
  }

  @Post('returns/items/:returnItemId/inspect')
  @RequirePermissions('returns:inspect:disposition')
  @ApiOperation({
    summary: 'Record return physical inspection disposition & execute inventory movement',
  })
  async inspectReturn(
    @Param('returnItemId') returnItemId: string,
    @Body() dto: RecordReturnInspectionBodyDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ReturnRequestDto> {
    return this.ordersService.inspectReturn(returnItemId, dto, user.sub);
  }
}
