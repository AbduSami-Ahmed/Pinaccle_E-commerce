import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../common/cache/cache.service';
import { ReceiveBulkStockDto } from './dto/receive-bulk-stock.dto';
import { ReceiveSerializedPartDto } from './dto/receive-serialized-part.dto';
import { StockAdjustmentDto } from './dto/stock-adjustment.dto';
import { StockTransferDto } from './dto/stock-transfer.dto';
import { StockReservationDto } from './dto/stock-reservation.dto';
import { InventoryQueryDto } from './dto/inventory-query.dto';
import {
  AuthenticatedUser,
  GlobalInventoryMovementDto,
  InventoryItemDto,
  InventoryMovementDto,
  InventoryMovementType,
  PaginatedResponse,
  ProductStockSummaryDto,
  ReconciliationResultDto,
  SellableUnitBreakdown,
  SerializedInventoryItemDto,
  WarehouseDto,
} from '@pinnacle/contracts';
import { randomBytes } from 'crypto';

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * 1. Receive Bulk Stock into a specific warehouse and bin location.
   */
  async receiveBulkStock(dto: ReceiveBulkStockDto, operatorId: string): Promise<InventoryItemDto> {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });
    if (!product) {
      throw new NotFoundException(`Product with ID ${dto.productId} not found`);
    }

    const warehouse = await this.prisma.warehouse.findUnique({
      where: { id: dto.warehouseId },
    });
    if (!warehouse) {
      throw new NotFoundException(`Warehouse with ID ${dto.warehouseId} not found`);
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // Find existing item in bin or create
      const existing = await tx.inventoryItem.findUnique({
        where: {
          productId_warehouseId_locationBin: {
            productId: dto.productId,
            warehouseId: dto.warehouseId,
            locationBin: dto.locationBin.trim().toUpperCase(),
          },
        },
      });

      const prevQty = existing ? existing.quantityOnHand : 0;
      const newQty = prevQty + dto.quantity;

      const item = await tx.inventoryItem.upsert({
        where: {
          productId_warehouseId_locationBin: {
            productId: dto.productId,
            warehouseId: dto.warehouseId,
            locationBin: dto.locationBin.trim().toUpperCase(),
          },
        },
        create: {
          productId: dto.productId,
          warehouseId: dto.warehouseId,
          locationBin: dto.locationBin.trim().toUpperCase(),
          quantityOnHand: dto.quantity,
          quantityReserved: 0,
          costPrice: new Prisma.Decimal(dto.costPrice),
        },
        update: {
          quantityOnHand: { increment: dto.quantity },
          costPrice: new Prisma.Decimal(dto.costPrice),
        },
        include: { warehouse: true },
      });

      // Write immutable movement audit ledger
      await tx.inventoryMovement.create({
        data: {
          inventoryItemId: item.id,
          movementType: 'RECEIPT',
          quantityChange: dto.quantity,
          previousQuantity: prevQty,
          newQuantity: newQty,
          reasonCode: dto.reasonCode?.trim() || 'INWARD_PURCHASE_RECEIPT',
          operatorId,
          referenceOrderId: dto.referencePo?.trim() || null,
        },
      });

      return item;
    });

    this.cacheService.invalidatePattern('storefront:*');
    return {
      id: result.id,
      productId: result.productId,
      warehouseId: result.warehouseId,
      warehouseCode: result.warehouse.code,
      warehouseName: result.warehouse.name,
      locationBin: result.locationBin,
      quantityOnHand: result.quantityOnHand,
      quantityReserved: result.quantityReserved,
      quantityAvailable: Math.max(0, result.quantityOnHand - result.quantityReserved),
      costPrice: result.costPrice.toString(),
      createdAt: result.createdAt.toISOString(),
      updatedAt: result.updatedAt.toISOString(),
    };
  }

  /**
   * 2. Receive Individually Serialized Physical Part (Used Seat Belts with photos and grade).
   */
  async receiveSerializedPart(
    dto: ReceiveSerializedPartDto,
    operatorId: string,
  ): Promise<SerializedInventoryItemDto> {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });
    if (!product) {
      throw new NotFoundException(`Product with ID ${dto.productId} not found`);
    }

    const warehouse = await this.prisma.warehouse.findUnique({
      where: { id: dto.warehouseId },
    });
    if (!warehouse) {
      throw new NotFoundException(`Warehouse with ID ${dto.warehouseId} not found`);
    }

    // Generate unique barcode if omitted
    const stockBarcode =
      dto.stockBarcode?.trim().toUpperCase() ||
      `BC-${Date.now().toString(36).toUpperCase()}-${randomBytes(2).toString('hex').toUpperCase()}`;

    // Ensure barcode uniqueness
    const barcodeCollision = await this.prisma.serializedInventoryItem.findUnique({
      where: { stockBarcode },
    });
    if (barcodeCollision) {
      throw new ConflictException(`Stock barcode "${stockBarcode}" is already in use`);
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const serialized = await tx.serializedInventoryItem.create({
        data: {
          productId: dto.productId,
          warehouseId: dto.warehouseId,
          stockBarcode,
          donorVehicleVin: dto.donorVehicleVin?.trim().toUpperCase() || null,
          conditionGrade: dto.conditionGrade,
          conditionNotes: dto.conditionNotes.trim(),
          pretensionerResistanceOhms: dto.pretensionerResistanceOhms
            ? new Prisma.Decimal(dto.pretensionerResistanceOhms)
            : null,
          actualPhotos: dto.actualPhotos ?? [],
          locationBin: dto.locationBin.trim().toUpperCase(),
          costPrice: new Prisma.Decimal(dto.costPrice),
          status: 'AVAILABLE',
        },
        include: { warehouse: true },
      });

      // Write immutable movement audit ledger
      await tx.inventoryMovement.create({
        data: {
          serializedItemId: serialized.id,
          movementType: 'RECEIPT',
          quantityChange: 1,
          previousQuantity: 0,
          newQuantity: 1,
          reasonCode: dto.reasonCode?.trim() || 'SERIALIZED_PART_INWARD',
          operatorId,
          referenceOrderId: dto.referencePo?.trim() || null,
        },
      });

      return serialized;
    });

    this.cacheService.invalidatePattern('storefront:*');
    return {
      id: result.id,
      productId: result.productId,
      warehouseId: result.warehouseId,
      warehouseCode: result.warehouse.code,
      warehouseName: result.warehouse.name,
      stockBarcode: result.stockBarcode,
      donorVehicleVin: result.donorVehicleVin,
      conditionGrade: result.conditionGrade,
      conditionNotes: result.conditionNotes,
      pretensionerResistanceOhms: result.pretensionerResistanceOhms
        ? result.pretensionerResistanceOhms.toString()
        : null,
      actualPhotos: result.actualPhotos as string[],
      locationBin: result.locationBin,
      costPrice: result.costPrice.toString(),
      status: result.status,
      createdAt: result.createdAt.toISOString(),
      updatedAt: result.updatedAt.toISOString(),
    };
  }

  /**
   * 3. Explicit Stock Adjustment (Increase or Decrease with non-negative protection).
   */
  async adjustStock(
    dto: StockAdjustmentDto,
    operatorId: string,
  ): Promise<{ success: boolean; newQuantity: number; movementId: string }> {
    if (!dto.inventoryItemId && !dto.serializedItemId) {
      throw new BadRequestException('Either inventoryItemId or serializedItemId must be specified');
    }

    if (dto.inventoryItemId) {
      const result = await this.prisma.$transaction(async (tx) => {
        const item = await tx.inventoryItem.findUnique({
          where: { id: dto.inventoryItemId },
        });

        if (!item) {
          throw new NotFoundException(`Inventory item ${dto.inventoryItemId} not found`);
        }

        const newOnHand = item.quantityOnHand + dto.quantityChange;

        // Prevent negative stock
        if (newOnHand < 0) {
          throw new BadRequestException(
            `Adjustment would cause negative inventory. Current on hand: ${item.quantityOnHand}, requested change: ${dto.quantityChange}`,
          );
        }

        // Prevent on-hand from dropping below active checkout reservations
        if (newOnHand < item.quantityReserved) {
          throw new BadRequestException(
            `Cannot reduce on-hand stock to ${newOnHand} because ${item.quantityReserved} units are currently reserved by active carts.`,
          );
        }

        await tx.inventoryItem.update({
          where: { id: item.id },
          data: { quantityOnHand: newOnHand },
        });

        const movement = await tx.inventoryMovement.create({
          data: {
            inventoryItemId: item.id,
            movementType: 'MANUAL_ADJUSTMENT',
            quantityChange: dto.quantityChange,
            previousQuantity: item.quantityOnHand,
            newQuantity: newOnHand,
            reasonCode: dto.reasonCode,
            operatorId,
            referenceOrderId: dto.referenceNote || null,
          },
        });

        return {
          success: true,
          newQuantity: newOnHand,
          movementId: movement.id,
        };
      });
      this.cacheService.invalidatePattern('storefront:*');
      return result;
    }

    // Serialized adjustment (e.g. scrap or mark under inspection)
    const result = await this.prisma.$transaction(async (tx) => {
      const serialized = await tx.serializedInventoryItem.findUnique({
        where: { id: dto.serializedItemId },
      });

      if (!serialized) {
        throw new NotFoundException(`Serialized item ${dto.serializedItemId} not found`);
      }

      if (dto.quantityChange < 0) {
        if (serialized.status === 'RESERVED' || serialized.status === 'SOLD') {
          throw new BadRequestException(
            `Cannot write off serialized item ${serialized.stockBarcode} in ${serialized.status} status`,
          );
        }

        await tx.serializedInventoryItem.update({
          where: { id: serialized.id },
          data: { status: 'SCRAPPED' },
        });

        const movement = await tx.inventoryMovement.create({
          data: {
            serializedItemId: serialized.id,
            movementType: 'SCRAP_WRITEOFF',
            quantityChange: -1,
            previousQuantity: 1,
            newQuantity: 0,
            reasonCode: dto.reasonCode,
            operatorId,
            referenceOrderId: dto.referenceNote || null,
          },
        });

        return {
          success: true,
          newQuantity: 0,
          movementId: movement.id,
        };
      }

      throw new BadRequestException('Cannot increase quantity of a serialized single-unit part');
    });

    this.cacheService.invalidatePattern('storefront:*');
    return result;
  }

  /**
   * 4. Transfer Stock between warehouse locations.
   */
  async transferStock(
    dto: StockTransferDto,
    operatorId: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.prisma.$transaction(async (tx) => {
      const sourceItem = await tx.inventoryItem.findUnique({
        where: {
          productId_warehouseId_locationBin: {
            productId: dto.productId,
            warehouseId: dto.sourceWarehouseId,
            locationBin: dto.sourceBin.trim().toUpperCase(),
          },
        },
      });

      if (!sourceItem) {
        throw new NotFoundException('Source inventory item not found');
      }

      const availableAtSource = sourceItem.quantityOnHand - sourceItem.quantityReserved;
      if (availableAtSource < dto.quantity) {
        throw new BadRequestException(
          `Insufficient available stock at source bin (${availableAtSource} available, ${dto.quantity} requested for transfer)`,
        );
      }

      const newSourceOnHand = sourceItem.quantityOnHand - dto.quantity;
      await tx.inventoryItem.update({
        where: { id: sourceItem.id },
        data: { quantityOnHand: newSourceOnHand },
      });

      await tx.inventoryMovement.create({
        data: {
          inventoryItemId: sourceItem.id,
          movementType: 'MANUAL_ADJUSTMENT',
          quantityChange: -dto.quantity,
          previousQuantity: sourceItem.quantityOnHand,
          newQuantity: newSourceOnHand,
          reasonCode: 'TRANSFER_OUT',
          operatorId,
          referenceOrderId: dto.referenceNote || null,
        },
      });

      const destItem = await tx.inventoryItem.upsert({
        where: {
          productId_warehouseId_locationBin: {
            productId: dto.productId,
            warehouseId: dto.destinationWarehouseId,
            locationBin: dto.destinationBin.trim().toUpperCase(),
          },
        },
        create: {
          productId: dto.productId,
          warehouseId: dto.destinationWarehouseId,
          locationBin: dto.destinationBin.trim().toUpperCase(),
          quantityOnHand: dto.quantity,
          quantityReserved: 0,
          costPrice: sourceItem.costPrice,
        },
        update: {
          quantityOnHand: { increment: dto.quantity },
        },
      });

      await tx.inventoryMovement.create({
        data: {
          inventoryItemId: destItem.id,
          movementType: 'MANUAL_ADJUSTMENT',
          quantityChange: dto.quantity,
          previousQuantity: destItem.quantityOnHand - dto.quantity,
          newQuantity: destItem.quantityOnHand,
          reasonCode: 'TRANSFER_IN',
          operatorId,
          referenceOrderId: dto.referenceNote || null,
        },
      });

      return {
        success: true,
        message: `Transferred ${dto.quantity} units from ${dto.sourceBin} to ${dto.destinationBin}`,
      };
    });
  }

  /**
   * 5. Concurrency-Safe Soft Stock Reservation (e.g. 15-min cart hold).
   * Validates sale-unit multiplier: Pair consumes 2 base units, Set of 4 consumes 4 base units.
   */
  async reserveStock(
    dto: StockReservationDto,
    operatorId: string,
  ): Promise<{ reservationId: string; reservedBaseQuantity: number; expiresAt: Date }> {
    const saleUnit = await this.prisma.saleUnitConfig.findUnique({
      where: { id: dto.saleUnitConfigId },
    });
    if (!saleUnit) {
      throw new NotFoundException(`Sale unit configuration ${dto.saleUnitConfigId} not found`);
    }

    const baseUnitsToReserve = dto.quantity * saleUnit.baseQuantityMultiplier;
    const expiresAt = dto.expiresAt
      ? new Date(dto.expiresAt)
      : new Date(Date.now() + 15 * 60 * 1000);

    return this.prisma.$transaction(async (tx) => {
      // 1. Serialized Item Reservation (1:1 lock)
      if (dto.serializedItemId) {
        const serialized = await tx.serializedInventoryItem.findUnique({
          where: { id: dto.serializedItemId },
        });

        if (!serialized) {
          throw new NotFoundException(`Serialized item ${dto.serializedItemId} not found`);
        }

        if (serialized.status !== 'AVAILABLE') {
          throw new ConflictException(
            `Serialized item ${serialized.stockBarcode} is not available (Status: ${serialized.status})`,
          );
        }

        await tx.serializedInventoryItem.update({
          where: { id: serialized.id },
          data: { status: 'RESERVED' },
        });

        const reservation = await tx.stockReservation.create({
          data: {
            cartItemId: dto.cartItemId || null,
            orderId: dto.orderId || null,
            serializedItemId: serialized.id,
            reservedQuantity: 1,
            expiresAt,
            status: 'ACTIVE',
          },
        });

        await tx.inventoryMovement.create({
          data: {
            serializedItemId: serialized.id,
            movementType: 'RESERVATION_HOLD',
            quantityChange: 0,
            previousQuantity: 1,
            newQuantity: 1,
            reasonCode: 'CART_CHECKOUT_RESERVATION',
            operatorId,
          },
        });

        return {
          reservationId: reservation.id,
          reservedBaseQuantity: 1,
          expiresAt,
        };
      }

      // 2. Bulk Quantity Reservation (Concurrency-safe check & hold)
      const items = await tx.inventoryItem.findMany({
        where: {
          productId: dto.productId,
          warehouseId: dto.warehouseId ?? undefined,
        },
        orderBy: { locationBin: 'asc' },
      });

      const eligibleItem = items.find(
        (i) => i.quantityOnHand - i.quantityReserved >= baseUnitsToReserve,
      );

      if (!eligibleItem) {
        throw new ConflictException(
          `Insufficient available stock to reserve ${dto.quantity} ${saleUnit.name} (${baseUnitsToReserve} base units required)`,
        );
      }

      await tx.inventoryItem.update({
        where: { id: eligibleItem.id },
        data: {
          quantityReserved: { increment: baseUnitsToReserve },
        },
      });

      const reservation = await tx.stockReservation.create({
        data: {
          cartItemId: dto.cartItemId || null,
          orderId: dto.orderId || null,
          inventoryItemId: eligibleItem.id,
          reservedQuantity: baseUnitsToReserve,
          expiresAt,
          status: 'ACTIVE',
        },
      });

      await tx.inventoryMovement.create({
        data: {
          inventoryItemId: eligibleItem.id,
          movementType: 'RESERVATION_HOLD',
          quantityChange: 0,
          previousQuantity: eligibleItem.quantityOnHand,
          newQuantity: eligibleItem.quantityOnHand,
          reasonCode: `CART_CHECKOUT_RESERVATION_${saleUnit.code}`,
          operatorId,
        },
      });

      return {
        reservationId: reservation.id,
        reservedBaseQuantity: baseUnitsToReserve,
        expiresAt,
      };
    });
  }

  /**
   * 6. Release Stock Reservation (cart abandoned, timeout expired, or customer removed item).
   */
  async releaseStockReservation(
    reservationId: string,
    operatorId: string,
    reason?: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.prisma.$transaction(async (tx) => {
      const reservation = await tx.stockReservation.findUnique({
        where: { id: reservationId },
      });

      if (!reservation) {
        throw new NotFoundException(`Stock reservation ${reservationId} not found`);
      }

      if (reservation.status !== 'ACTIVE') {
        return {
          success: false,
          message: `Reservation is already in ${reservation.status} state`,
        };
      }

      if (reservation.serializedItemId) {
        await tx.serializedInventoryItem.update({
          where: { id: reservation.serializedItemId },
          data: { status: 'AVAILABLE' },
        });

        await tx.inventoryMovement.create({
          data: {
            serializedItemId: reservation.serializedItemId,
            movementType: 'RESERVATION_RELEASE',
            quantityChange: 0,
            previousQuantity: 1,
            newQuantity: 1,
            reasonCode: reason || 'CART_TIMEOUT_RELEASE',
            operatorId,
          },
        });
      } else if (reservation.inventoryItemId) {
        await tx.inventoryItem.update({
          where: { id: reservation.inventoryItemId },
          data: {
            quantityReserved: { decrement: reservation.reservedQuantity },
          },
        });

        await tx.inventoryMovement.create({
          data: {
            inventoryItemId: reservation.inventoryItemId,
            movementType: 'RESERVATION_RELEASE',
            quantityChange: 0,
            previousQuantity: 0,
            newQuantity: 0,
            reasonCode: reason || 'CART_TIMEOUT_RELEASE',
            operatorId,
          },
        });
      }

      await tx.stockReservation.update({
        where: { id: reservationId },
        data: { status: 'RELEASED' },
      });

      return {
        success: true,
        message: `Reservation ${reservationId} successfully released`,
      };
    });
  }

  /**
   * 7. Commit Stock Reservation upon completed order purchase.
   * Atomically deducts on-hand and reserved quantity, recording SALE_DEDUCTION.
   */
  async commitStockReservation(
    reservationId: string,
    orderId: string,
    operatorId: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.prisma.$transaction(async (tx) => {
      const reservation = await tx.stockReservation.findUnique({
        where: { id: reservationId },
      });

      if (!reservation) {
        throw new NotFoundException(`Stock reservation ${reservationId} not found`);
      }

      if (reservation.status !== 'ACTIVE') {
        throw new ConflictException(`Cannot commit reservation in ${reservation.status} status`);
      }

      if (reservation.serializedItemId) {
        await tx.serializedInventoryItem.update({
          where: { id: reservation.serializedItemId },
          data: { status: 'SOLD' },
        });

        await tx.inventoryMovement.create({
          data: {
            serializedItemId: reservation.serializedItemId,
            movementType: 'SALE_DEDUCTION',
            quantityChange: -1,
            previousQuantity: 1,
            newQuantity: 0,
            reasonCode: 'ORDER_PURCHASE_FULFILLED',
            operatorId,
            referenceOrderId: orderId,
          },
        });
      } else if (reservation.inventoryItemId) {
        const item = await tx.inventoryItem.findUniqueOrThrow({
          where: { id: reservation.inventoryItemId },
        });

        const newOnHand = item.quantityOnHand - reservation.reservedQuantity;
        const newReserved = Math.max(0, item.quantityReserved - reservation.reservedQuantity);

        await tx.inventoryItem.update({
          where: { id: item.id },
          data: {
            quantityOnHand: newOnHand,
            quantityReserved: newReserved,
          },
        });

        await tx.inventoryMovement.create({
          data: {
            inventoryItemId: item.id,
            movementType: 'SALE_DEDUCTION',
            quantityChange: -reservation.reservedQuantity,
            previousQuantity: item.quantityOnHand,
            newQuantity: newOnHand,
            reasonCode: 'ORDER_PURCHASE_FULFILLED',
            operatorId,
            referenceOrderId: orderId,
          },
        });
      }

      await tx.stockReservation.update({
        where: { id: reservationId },
        data: { status: 'CONVERTED_TO_ORDER' },
      });

      return {
        success: true,
        message: `Reservation ${reservationId} committed to order ${orderId}`,
      };
    });
  }

  /**
   * 7b. Sweep expired stock reservations (15-min soft reservation expiry).
   * Automatically releases any ACTIVE reservations where expiresAt < now.
   */
  async sweepExpiredReservations(
    operatorId?: string,
  ): Promise<{ releasedCount: number; reservationIds: string[] }> {
    const expiredReservations = await this.prisma.stockReservation.findMany({
      where: {
        status: 'ACTIVE',
        expiresAt: { lt: new Date() },
      },
      select: { id: true, orderId: true },
    });

    const releasedIds: string[] = [];
    const resolvedOperatorId = operatorId || '00000000-0000-0000-0000-000000000001';

    for (const res of expiredReservations) {
      try {
        await this.releaseStockReservation(
          res.id,
          resolvedOperatorId,
          'SOFT_RESERVATION_TIMEOUT_EXPIRED',
        );
        releasedIds.push(res.id);

        if (res.orderId) {
          const remainingActive = await this.prisma.stockReservation.count({
            where: { orderId: res.orderId, status: 'ACTIVE' },
          });
          if (remainingActive === 0) {
            await this.prisma.order.updateMany({
              where: {
                id: res.orderId,
                orderStatus: 'PENDING_PAYMENT',
              },
              data: {
                orderStatus: 'CANCELLED',
                notes: 'Order auto-cancelled due to 15-minute reservation timeout.',
              },
            });
          }
        }
      } catch {
        // Skip individual failure and continue sweeping
      }
    }

    return { releasedCount: releasedIds.length, reservationIds: releasedIds };
  }

  /**
   * 7c. Restock Order Item (Return to inventory / cancellation restock)
   * Restores quantityOnHand for bulk batches or sets serialized parts back to AVAILABLE.
   * Creates an immutable RETURN_RESTOCK InventoryMovement record.
   */
  async restockOrderItem(params: {
    orderId: string;
    orderItemId: string;
    quantity: number;
    operatorId: string;
    reasonCode: string;
  }): Promise<{ success: boolean; message: string }> {
    return this.prisma.$transaction(async (tx) => {
      const orderItem = await tx.orderItem.findUnique({
        where: { id: params.orderItemId },
      });

      if (!orderItem) {
        throw new NotFoundException(`Order item ${params.orderItemId} not found`);
      }

      if (orderItem.serializedItemId) {
        await tx.serializedInventoryItem.update({
          where: { id: orderItem.serializedItemId },
          data: { status: 'AVAILABLE' },
        });

        await tx.inventoryMovement.create({
          data: {
            serializedItemId: orderItem.serializedItemId,
            movementType: 'RETURN_RESTOCK',
            quantityChange: 1,
            previousQuantity: 0,
            newQuantity: 1,
            reasonCode: params.reasonCode,
            operatorId: params.operatorId,
            referenceOrderId: params.orderId,
          },
        });
      } else if (orderItem.productId) {
        const inventoryItem = await tx.inventoryItem.findFirst({
          where: { productId: orderItem.productId },
        });

        if (inventoryItem) {
          const unitsToRestore = params.quantity * (orderItem.baseQuantityMultiplierSnapshot || 1);
          const newOnHand = inventoryItem.quantityOnHand + unitsToRestore;

          await tx.inventoryItem.update({
            where: { id: inventoryItem.id },
            data: { quantityOnHand: newOnHand },
          });

          await tx.inventoryMovement.create({
            data: {
              inventoryItemId: inventoryItem.id,
              movementType: 'RETURN_RESTOCK',
              quantityChange: unitsToRestore,
              previousQuantity: inventoryItem.quantityOnHand,
              newQuantity: newOnHand,
              reasonCode: params.reasonCode,
              operatorId: params.operatorId,
              referenceOrderId: params.orderId,
            },
          });
        }
      }

      return {
        success: true,
        message: `Restocked order item ${params.orderItemId} to inventory`,
      };
    });
  }

  /**
   * 7d. Scrap Returned Item (Write-off after RMA inspection fails safety or functional tests)
   * Sets serialized item to SCRAPPED and records an immutable SCRAP_WRITEOFF movement.
   */
  async scrapReturnedItem(params: {
    orderId: string;
    orderItemId: string;
    operatorId: string;
    reasonCode: string;
  }): Promise<{ success: boolean; message: string }> {
    return this.prisma.$transaction(async (tx) => {
      const orderItem = await tx.orderItem.findUnique({
        where: { id: params.orderItemId },
      });

      if (!orderItem) {
        throw new NotFoundException(`Order item ${params.orderItemId} not found`);
      }

      if (orderItem.serializedItemId) {
        await tx.serializedInventoryItem.update({
          where: { id: orderItem.serializedItemId },
          data: { status: 'SCRAPPED' },
        });

        await tx.inventoryMovement.create({
          data: {
            serializedItemId: orderItem.serializedItemId,
            movementType: 'SCRAP_WRITEOFF',
            quantityChange: 0,
            previousQuantity: 0,
            newQuantity: 0,
            reasonCode: params.reasonCode,
            operatorId: params.operatorId,
            referenceOrderId: params.orderId,
          },
        });
      } else if (orderItem.productId) {
        const inventoryItem = await tx.inventoryItem.findFirst({
          where: { productId: orderItem.productId },
        });

        if (inventoryItem) {
          await tx.inventoryMovement.create({
            data: {
              inventoryItemId: inventoryItem.id,
              movementType: 'SCRAP_WRITEOFF',
              quantityChange: 0,
              previousQuantity: inventoryItem.quantityOnHand,
              newQuantity: inventoryItem.quantityOnHand,
              reasonCode: params.reasonCode,
              operatorId: params.operatorId,
              referenceOrderId: params.orderId,
            },
          });
        }
      }

      return {
        success: true,
        message: `Scrapped returned item for order item ${params.orderItemId}`,
      };
    });
  }

  /**
   * 8. Inventory Balance Reconciliation against Movement History.
   */
  async reconcileItem(inventoryItemId: string): Promise<ReconciliationResultDto> {
    const item = await this.prisma.inventoryItem.findUnique({
      where: { id: inventoryItemId },
      include: {
        warehouse: true,
        movements: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!item) {
      throw new NotFoundException(`Inventory item ${inventoryItemId} not found`);
    }

    // Sum all movements that alter on-hand balance:
    // RECEIPT (+), MANUAL_ADJUSTMENT (+/-), SALE_DEDUCTION (-), RETURN_RESTOCK (+), SCRAP_WRITEOFF (-)
    let computedOnHand = 0;
    for (const mov of item.movements) {
      if (
        mov.movementType === 'RECEIPT' ||
        mov.movementType === 'MANUAL_ADJUSTMENT' ||
        mov.movementType === 'SALE_DEDUCTION' ||
        mov.movementType === 'RETURN_RESTOCK' ||
        mov.movementType === 'SCRAP_WRITEOFF'
      ) {
        computedOnHand += mov.quantityChange;
      }
    }

    const discrepancy = item.quantityOnHand - computedOnHand;

    return {
      inventoryItemId: item.id,
      productId: item.productId,
      warehouseCode: item.warehouse.code,
      locationBin: item.locationBin,
      computedOnHand,
      actualOnHand: item.quantityOnHand,
      isReconciled: discrepancy === 0,
      discrepancy,
      totalMovementsCount: item.movements.length,
    };
  }

  /**
   * 9. Get detailed stock summary for a specific product.
   * Calculates sellable units across multipliers and scrubs cost price if unprivileged.
   */
  async getProductStockDetails(
    productId: string,
    user?: AuthenticatedUser,
  ): Promise<ProductStockSummaryDto> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        category: true,
        saleUnits: { where: { isActive: true }, orderBy: { baseQuantityMultiplier: 'asc' } },
        inventoryItems: { include: { warehouse: true } },
        serializedItems: { include: { warehouse: true } },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product ${productId} not found`);
    }

    const canViewCostPrice = user?.permissions.includes('inventory:stock:view_cost_price') ?? false;

    // Aggregate bulk totals
    const totalOnHand = product.inventoryItems.reduce((acc, i) => acc + i.quantityOnHand, 0);
    const totalReserved = product.inventoryItems.reduce((acc, i) => acc + i.quantityReserved, 0);
    const availableBulk = Math.max(0, totalOnHand - totalReserved);

    // Aggregate serialized available
    const availableSerialized = product.serializedItems.filter(
      (i) => i.status === 'AVAILABLE',
    ).length;

    const effectiveAvailable =
      product.productType === 'INDIVIDUALLY_SERIALIZED' ? availableSerialized : availableBulk;

    // Calculate sellable breakdown for each configured sale unit
    const sellableUnits: SellableUnitBreakdown[] = product.saleUnits.map((su) => {
      const sellableCount =
        product.productType === 'INDIVIDUALLY_SERIALIZED'
          ? availableSerialized
          : Math.floor(effectiveAvailable / su.baseQuantityMultiplier);

      return {
        code: su.code,
        name: su.name,
        multiplier: su.baseQuantityMultiplier,
        sellableCount,
        retailPrice: su.retailPrice.toString(),
      };
    });

    this.cacheService.invalidatePattern('storefront:*');
    return {
      productId: product.id,
      sku: product.sku,
      title: product.title,
      brand: product.brand,
      categoryName: product.category.name,
      categorySlug: product.category.slug,
      productType: product.productType,
      totalQuantityOnHand:
        product.productType === 'INDIVIDUALLY_SERIALIZED'
          ? product.serializedItems.length
          : totalOnHand,
      totalQuantityReserved:
        product.productType === 'INDIVIDUALLY_SERIALIZED'
          ? product.serializedItems.filter((i) => i.status === 'RESERVED').length
          : totalReserved,
      totalQuantityAvailable: effectiveAvailable,
      isLowStock: effectiveAvailable > 0 && effectiveAvailable <= 5,
      isOutOfStock: effectiveAvailable === 0,
      inventoryItems: product.inventoryItems.map((i) => ({
        id: i.id,
        productId: i.productId,
        warehouseId: i.warehouseId,
        warehouseCode: i.warehouse.code,
        warehouseName: i.warehouse.name,
        locationBin: i.locationBin,
        quantityOnHand: i.quantityOnHand,
        quantityReserved: i.quantityReserved,
        quantityAvailable: Math.max(0, i.quantityOnHand - i.quantityReserved),
        costPrice: canViewCostPrice ? i.costPrice.toString() : undefined,
        createdAt: i.createdAt.toISOString(),
        updatedAt: i.updatedAt.toISOString(),
      })),
      serializedItems: product.serializedItems.map((s) => ({
        id: s.id,
        productId: s.productId,
        warehouseId: s.warehouseId,
        warehouseCode: s.warehouse.code,
        warehouseName: s.warehouse.name,
        stockBarcode: s.stockBarcode,
        donorVehicleVin: s.donorVehicleVin,
        conditionGrade: s.conditionGrade,
        conditionNotes: s.conditionNotes,
        pretensionerResistanceOhms: s.pretensionerResistanceOhms
          ? s.pretensionerResistanceOhms.toString()
          : null,
        actualPhotos: s.actualPhotos as string[],
        locationBin: s.locationBin,
        costPrice: canViewCostPrice ? s.costPrice.toString() : undefined,
        status: s.status,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      })),
      sellableUnits,
    };
  }

  /**
   * 10. List inventory overview with search, status filters, and warehouse selection.
   */
  async getInventoryOverview(
    query: InventoryQueryDto,
    user?: AuthenticatedUser,
  ): Promise<PaginatedResponse<ProductStockSummaryDto>> {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));
    const skip = (page - 1) * pageSize;

    const where: Prisma.ProductWhereInput = {
      status: 'PUBLISHED',
    };

    if (query.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { title: { contains: term, mode: 'insensitive' } },
        { sku: { contains: term, mode: 'insensitive' } },
        { brand: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [total, products] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { title: 'asc' },
        include: {
          category: true,
          saleUnits: { where: { isActive: true } },
          inventoryItems: {
            where: query.warehouseId ? { warehouseId: query.warehouseId } : undefined,
            include: { warehouse: true },
          },
          serializedItems: {
            where: query.warehouseId ? { warehouseId: query.warehouseId } : undefined,
            include: { warehouse: true },
          },
        },
      }),
    ]);

    const canViewCostPrice = user?.permissions.includes('inventory:stock:view_cost_price') ?? false;

    let summaries: ProductStockSummaryDto[] = products.map((p) => {
      const totalOnHand = p.inventoryItems.reduce((acc, i) => acc + i.quantityOnHand, 0);
      const totalReserved = p.inventoryItems.reduce((acc, i) => acc + i.quantityReserved, 0);
      const availableBulk = Math.max(0, totalOnHand - totalReserved);

      const availableSerialized = p.serializedItems.filter((i) => i.status === 'AVAILABLE').length;

      const effectiveAvailable =
        p.productType === 'INDIVIDUALLY_SERIALIZED' ? availableSerialized : availableBulk;

      const sellableUnits: SellableUnitBreakdown[] = p.saleUnits.map((su) => ({
        code: su.code,
        name: su.name,
        multiplier: su.baseQuantityMultiplier,
        sellableCount:
          p.productType === 'INDIVIDUALLY_SERIALIZED'
            ? availableSerialized
            : Math.floor(effectiveAvailable / su.baseQuantityMultiplier),
        retailPrice: su.retailPrice.toString(),
      }));

      return {
        productId: p.id,
        sku: p.sku,
        title: p.title,
        brand: p.brand,
        categoryName: p.category.name,
        categorySlug: p.category.slug,
        productType: p.productType,
        totalQuantityOnHand:
          p.productType === 'INDIVIDUALLY_SERIALIZED' ? p.serializedItems.length : totalOnHand,
        totalQuantityReserved:
          p.productType === 'INDIVIDUALLY_SERIALIZED'
            ? p.serializedItems.filter((i) => i.status === 'RESERVED').length
            : totalReserved,
        totalQuantityAvailable: effectiveAvailable,
        isLowStock: effectiveAvailable > 0 && effectiveAvailable <= 5,
        isOutOfStock: effectiveAvailable === 0,
        inventoryItems: p.inventoryItems.map((i) => ({
          id: i.id,
          productId: i.productId,
          warehouseId: i.warehouseId,
          warehouseCode: i.warehouse.code,
          warehouseName: i.warehouse.name,
          locationBin: i.locationBin,
          quantityOnHand: i.quantityOnHand,
          quantityReserved: i.quantityReserved,
          quantityAvailable: Math.max(0, i.quantityOnHand - i.quantityReserved),
          costPrice: canViewCostPrice ? i.costPrice.toString() : undefined,
          createdAt: i.createdAt.toISOString(),
          updatedAt: i.updatedAt.toISOString(),
        })),
        serializedItems: p.serializedItems.map((s) => ({
          id: s.id,
          productId: s.productId,
          warehouseId: s.warehouseId,
          warehouseCode: s.warehouse.code,
          warehouseName: s.warehouse.name,
          stockBarcode: s.stockBarcode,
          donorVehicleVin: s.donorVehicleVin,
          conditionGrade: s.conditionGrade,
          conditionNotes: s.conditionNotes,
          pretensionerResistanceOhms: s.pretensionerResistanceOhms
            ? s.pretensionerResistanceOhms.toString()
            : null,
          actualPhotos: s.actualPhotos as string[],
          locationBin: s.locationBin,
          costPrice: canViewCostPrice ? s.costPrice.toString() : undefined,
          status: s.status,
          createdAt: s.createdAt.toISOString(),
          updatedAt: s.updatedAt.toISOString(),
        })),
        sellableUnits,
      };
    });

    if (query.stockStatus === 'IN_STOCK') {
      summaries = summaries.filter((s) => s.totalQuantityAvailable > 5);
    } else if (query.stockStatus === 'LOW_STOCK') {
      summaries = summaries.filter((s) => s.isLowStock);
    } else if (query.stockStatus === 'OUT_OF_STOCK') {
      summaries = summaries.filter((s) => s.isOutOfStock);
    }

    return {
      data: summaries,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize) || 1,
      },
    };
  }

  /**
   * 11. Retrieve movement history for an item.
   */
  async getItemMovements(itemId: string): Promise<InventoryMovementDto[]> {
    const movements = await this.prisma.inventoryMovement.findMany({
      where: {
        OR: [{ inventoryItemId: itemId }, { serializedItemId: itemId }],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        operator: { select: { email: true } },
      },
    });

    return movements.map((m) => ({
      id: m.id,
      inventoryItemId: m.inventoryItemId,
      serializedItemId: m.serializedItemId,
      movementType: m.movementType,
      quantityChange: m.quantityChange,
      previousQuantity: m.previousQuantity,
      newQuantity: m.newQuantity,
      reasonCode: m.reasonCode,
      operatorId: m.operatorId,
      operatorEmail: m.operator.email,
      referenceOrderId: m.referenceOrderId,
      createdAt: m.createdAt.toISOString(),
    }));
  }

  /**
   * 12. Retrieve active warehouses.
   */
  async getWarehouses(): Promise<WarehouseDto[]> {
    const warehouses = await this.prisma.warehouse.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    return warehouses.map((w) => ({
      id: w.id,
      code: w.code,
      name: w.name,
      addressLine1: w.addressLine1,
      city: w.city,
      state: w.state,
      postalCode: w.postalCode,
      country: w.country,
      isActive: w.isActive,
    }));
  }

  /**
   * 13. Query global warehouse movement ledger.
   */
  async getWarehouseMovements(query: {
    movementType?: InventoryMovementType;
    limit?: number;
    page?: number;
  }): Promise<{
    items: GlobalInventoryMovementDto[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.InventoryMovementWhereInput = {};
    if (query.movementType) {
      where.movementType = query.movementType;
    }

    const [total, movements] = await Promise.all([
      this.prisma.inventoryMovement.count({ where }),
      this.prisma.inventoryMovement.findMany({
        where,
        take: limit,
        skip,
        orderBy: { createdAt: 'desc' },
        include: {
          inventoryItem: {
            include: {
              product: { select: { id: true, title: true, sku: true } },
              warehouse: { select: { code: true } },
            },
          },
          serializedItem: {
            include: {
              product: { select: { id: true, title: true, sku: true } },
              warehouse: { select: { code: true } },
            },
          },
          operator: {
            select: {
              id: true,
              email: true,
              staffProfile: { select: { firstName: true, lastName: true } },
            },
          },
        },
      }),
    ]);

    const items: GlobalInventoryMovementDto[] = movements.map((m) => {
      const product = m.inventoryItem?.product || m.serializedItem?.product;
      const warehouse = m.inventoryItem?.warehouse || m.serializedItem?.warehouse;
      const actorName = m.operator?.staffProfile
        ? `${m.operator.staffProfile.firstName} ${m.operator.staffProfile.lastName}`
        : m.operator?.email || 'System';

      return {
        id: m.id,
        inventoryItemId: m.inventoryItemId ?? undefined,
        serializedItemId: m.serializedItemId ?? undefined,
        productId: product?.id || 'unknown',
        productName: product?.title || 'Unknown Part',
        sku: product?.sku || 'N/A',
        movementType: m.movementType as InventoryMovementType,
        quantity: m.quantityChange,
        referenceType: m.referenceOrderId ? 'ORDER' : undefined,
        referenceId: m.referenceOrderId,
        actorId: m.operatorId,
        actorName,
        warehouseCode: warehouse?.code || null,
        createdAt: m.createdAt.toISOString(),
      };
    });

    this.cacheService.invalidatePattern('storefront:*');
    return {
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }
}
