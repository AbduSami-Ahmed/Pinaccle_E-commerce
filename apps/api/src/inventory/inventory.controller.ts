import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { InventoryService } from './inventory.service';
import { ReceiveBulkStockDto } from './dto/receive-bulk-stock.dto';
import { ReceiveSerializedPartDto } from './dto/receive-serialized-part.dto';
import { StockAdjustmentDto } from './dto/stock-adjustment.dto';
import { StockTransferDto } from './dto/stock-transfer.dto';
import { StockReservationDto } from './dto/stock-reservation.dto';
import { InventoryQueryDto } from './dto/inventory-query.dto';
import {
  AuthenticatedUser,
  InventoryItemDto,
  InventoryMovementDto,
  PaginatedResponse,
  ProductStockSummaryDto,
  ReconciliationResultDto,
  SerializedInventoryItemDto,
  WarehouseDto,
} from '@pinnacle/contracts';

@ApiTags('Inventory & Stock Movements')
@Controller('inventory')
@UseGuards(PermissionsGuard)
@ApiBearerAuth()
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('overview')
  @RequirePermissions('inventory:stock:view_quantity')
  @ApiOperation({ summary: 'List inventory overview across products and warehouses' })
  async getOverview(
    @Query() query: InventoryQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PaginatedResponse<ProductStockSummaryDto>> {
    return this.inventoryService.getInventoryOverview(query, user);
  }

  @Get('products/:productId')
  @RequirePermissions('inventory:stock:view_quantity')
  @ApiOperation({ summary: 'Get stock summary and sellable unit breakdowns for a product' })
  async getProductStock(
    @Param('productId') productId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ProductStockSummaryDto> {
    return this.inventoryService.getProductStockDetails(productId, user);
  }

  @Get('items/:id/movements')
  @RequirePermissions('inventory:stock:view_quantity')
  @ApiOperation({ summary: 'Audit movement ledger for an inventory or serialized item' })
  async getItemMovements(@Param('id') id: string): Promise<InventoryMovementDto[]> {
    return this.inventoryService.getItemMovements(id);
  }

  @Get('items/:id/reconcile')
  @RequirePermissions('inventory:stock:view_quantity')
  @ApiOperation({ summary: 'Reconcile physical stock balance against movement history' })
  async reconcileItem(@Param('id') id: string): Promise<ReconciliationResultDto> {
    return this.inventoryService.reconcileItem(id);
  }

  @Get('warehouses')
  @RequirePermissions('inventory:stock:view_quantity')
  @ApiOperation({ summary: 'List active fulfillment warehouses' })
  async getWarehouses(): Promise<WarehouseDto[]> {
    return this.inventoryService.getWarehouses();
  }

  @Post('receive-bulk')
  @RequirePermissions('inventory:stock:inward_bulk')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Inward receive bulk quantity stock (Tyres / Commodity)' })
  async receiveBulkStock(
    @Body() dto: ReceiveBulkStockDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<InventoryItemDto> {
    return this.inventoryService.receiveBulkStock(dto, user.sub);
  }

  @Post('receive-serialized')
  @RequirePermissions('inventory:stock:serialize_item')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Inward receive individually serialized item (Used Seat Belts)' })
  async receiveSerialized(
    @Body() dto: ReceiveSerializedPartDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SerializedInventoryItemDto> {
    return this.inventoryService.receiveSerializedPart(dto, user.sub);
  }

  @Post('adjust')
  @RequirePermissions('inventory:stock:adjust')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Explicit stock increase/decrease adjustment with audit reason' })
  async adjustStock(
    @Body() dto: StockAdjustmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ success: boolean; newQuantity: number; movementId: string }> {
    return this.inventoryService.adjustStock(dto, user.sub);
  }

  @Post('transfer')
  @RequirePermissions('inventory:stock:update_location')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Transfer stock between locations' })
  async transferStock(
    @Body() dto: StockTransferDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ success: boolean; message: string }> {
    return this.inventoryService.transferStock(dto, user.sub);
  }

  @Post('reservations')
  @RequirePermissions('inventory:stock:view_quantity')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create soft stock reservation (checkout hold)' })
  async reserveStock(
    @Body() dto: StockReservationDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ reservationId: string; reservedBaseQuantity: number; expiresAt: Date }> {
    return this.inventoryService.reserveStock(dto, user.sub);
  }

  @Post('reservations/:id/release')
  @RequirePermissions('inventory:stock:adjust')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Release stock reservation' })
  async releaseReservation(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ success: boolean; message: string }> {
    return this.inventoryService.releaseStockReservation(id, user.sub);
  }

  @Post('reservations/:id/commit')
  @RequirePermissions('inventory:stock:adjust')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Commit stock reservation upon order completion' })
  async commitReservation(
    @Param('id') id: string,
    @Body() body: { orderId: string },
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ success: boolean; message: string }> {
    return this.inventoryService.commitStockReservation(id, body.orderId, user.sub);
  }
}
