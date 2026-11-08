import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { PaymentsService } from '../payments/payments.service';
import { NotificationsService } from '../notifications/notifications.service';
import { OrderQueryBodyDto } from './dto/order-query.dto';
import {
  CancelOrderBodyDto,
  ConfirmDepotCollectionBodyDto,
  DispatchCourierShipmentBodyDto,
  PickPackOrderBodyDto,
  ProcessRefundBodyDto,
  UpdateOrderStatusBodyDto,
} from './dto/order-actions.dto';
import {
  CreateReturnRequestBodyDto,
  RecordReturnInspectionBodyDto,
  ReviewReturnRequestBodyDto,
} from './dto/rma.dto';
import {
  AuthenticatedUser,
  OrderAddressSnapshot,
  OrderAdminDetailsDto,
  OrderItemSnapshotDto,
  OrderStatus,
  OrderTimelineEventDto,
  PaginatedResponse,
  ReturnRequestDto,
  ShipmentDto,
} from '@pinnacle/contracts';

// Permitted order lifecycle state transitions (strictly validated state machine)
const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ['PAID', 'CANCELLED'],
  PAID: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'DELIVERED', 'CANCELLED'],
  SHIPPED: ['DELIVERED', 'REFUNDED'],
  DELIVERED: ['REFUNDED'],
  CANCELLED: [], // Terminal
  REFUNDED: [], // Terminal
};

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
    private readonly paymentsService: PaymentsService,
    @Optional() private readonly notificationsService?: NotificationsService,
  ) {}

  // ---------------------------------------------------------------------------
  // 1. Staff Order Query & Listing (with server-side filters & PII masking)
  // ---------------------------------------------------------------------------

  async getOrders(
    query: OrderQueryBodyDto,
    user: AuthenticatedUser,
  ): Promise<PaginatedResponse<OrderAdminDetailsDto>> {
    const page = Math.max(1, query.page || 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize || 20));
    const skip = (page - 1) * pageSize;

    const where: any = {};

    if (query.orderStatus) {
      where.orderStatus = query.orderStatus;
    }

    if (query.paymentStatus) {
      where.paymentStatus = query.paymentStatus;
    }

    if (query.fulfillmentStatus) {
      where.fulfillmentStatus = query.fulfillmentStatus;
    }

    if (query.search) {
      const term = query.search.trim();
      where.OR = [
        { orderNumber: { contains: term, mode: 'insensitive' } },
        { customerEmail: { contains: term, mode: 'insensitive' } },
        { customerPhone: { contains: term, mode: 'insensitive' } },
      ];
    }

    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};
      if (query.dateFrom) {
        where.createdAt.gte = new Date(query.dateFrom);
      }
      if (query.dateTo) {
        where.createdAt.lte = new Date(query.dateTo);
      }
    }

    const orderByField = query.sortBy || 'createdAt';
    const orderDirection = query.sortDirection || 'desc';

    const [total, orders] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { [orderByField]: orderDirection },
        include: {
          items: true,
          shipments: {
            include: { items: true },
          },
          returnRequests: {
            include: {
              returnItems: {
                include: {
                  inspection: {
                    include: { inspector: { include: { staffProfile: true } } },
                  },
                  orderItem: true,
                },
              },
            },
          },
          paymentTransactions: {
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
    ]);

    const canViewPii = user.permissions.includes('customers:view:pii_contact');

    const dtos: OrderAdminDetailsDto[] = orders.map((order) =>
      this.mapOrderToAdminDto(order, canViewPii),
    );

    return {
      data: dtos,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  // ---------------------------------------------------------------------------
  // 2. Staff Order Detail View with Complete Audit Timeline
  // ---------------------------------------------------------------------------

  async getOrderDetails(orderId: string, user: AuthenticatedUser): Promise<OrderAdminDetailsDto> {
    const order = await this.prisma.order.findFirst({
      where: {
        OR: [{ id: orderId }, { orderNumber: orderId }],
      },
      include: {
        items: true,
        shipments: {
          include: { items: true },
        },
        returnRequests: {
          include: {
            returnItems: {
              include: {
                inspection: {
                  include: { inspector: { include: { staffProfile: true } } },
                },
                orderItem: true,
              },
            },
          },
        },
        paymentTransactions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    const canViewPii = user.permissions.includes('customers:view:pii_contact');
    return this.mapOrderToAdminDto(order, canViewPii);
  }

  // ---------------------------------------------------------------------------
  // 3. Status Transition Enforcement
  // ---------------------------------------------------------------------------

  async updateOrderStatus(
    orderId: string,
    dto: UpdateOrderStatusBodyDto,
    operatorId: string,
  ): Promise<OrderAdminDetailsDto> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    const currentStatus = order.orderStatus as OrderStatus;
    const allowed = VALID_TRANSITIONS[currentStatus] || [];

    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Invalid order status transition from "${currentStatus}" to "${dto.status}". Permitted transitions: ${
          allowed.length > 0 ? allowed.join(', ') : 'none (terminal status)'
        }`,
      );
    }

    if (dto.status === 'CANCELLED') {
      return this.cancelAndRefundOrder(
        orderId,
        { reason: dto.notes || 'Status updated to CANCELLED by staff' },
        operatorId,
      );
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        orderStatus: dto.status,
        notes: dto.notes
          ? `${order.notes ? order.notes + '\n' : ''}[${new Date().toISOString()}] ${dto.notes}`
          : order.notes,
      },
      include: {
        items: true,
        shipments: { include: { items: true } },
        returnRequests: {
          include: {
            returnItems: {
              include: {
                inspection: {
                  include: { inspector: { include: { staffProfile: true } } },
                },
                orderItem: true,
              },
            },
          },
        },
        paymentTransactions: true,
      },
    });

    this.logger.log(
      `[Orders] Operator ${operatorId} transitioned order ${order.orderNumber} from ${currentStatus} to ${dto.status}`,
    );

    return this.mapOrderToAdminDto(updated, true);
  }

  // ---------------------------------------------------------------------------
  // 4. Fulfillment: Pick & Pack
  // ---------------------------------------------------------------------------

  async pickPackOrder(
    orderId: string,
    dto: PickPackOrderBodyDto,
    operatorId: string,
  ): Promise<OrderAdminDetailsDto> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    if (order.orderStatus !== 'PAID' && order.orderStatus !== 'PROCESSING') {
      throw new BadRequestException(
        `Order ${order.orderNumber} must be in PAID or PROCESSING status to begin picking/packing (current: ${order.orderStatus})`,
      );
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        orderStatus: 'PROCESSING',
        notes: dto.notes
          ? `${order.notes ? order.notes + '\n' : ''}[${new Date().toISOString()} Pick/Pack] ${dto.notes}`
          : order.notes,
      },
      include: {
        items: true,
        shipments: { include: { items: true } },
        returnRequests: {
          include: {
            returnItems: {
              include: {
                inspection: {
                  include: { inspector: { include: { staffProfile: true } } },
                },
                orderItem: true,
              },
            },
          },
        },
        paymentTransactions: true,
      },
    });

    this.logger.log(
      `[Orders] Order ${order.orderNumber} marked as PROCESSING (Pick & Pack initiated) by ${operatorId}`,
    );
    return this.mapOrderToAdminDto(updated, true);
  }

  // ---------------------------------------------------------------------------
  // 5. Fulfillment: Dispatch Courier Shipment with Carrier & Tracking
  // ---------------------------------------------------------------------------

  async dispatchCourierShipment(
    orderId: string,
    dto: DispatchCourierShipmentBodyDto,
    operatorId: string,
  ): Promise<OrderAdminDetailsDto> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    if (order.orderStatus !== 'PAID' && order.orderStatus !== 'PROCESSING') {
      throw new BadRequestException(
        `Cannot dispatch order ${order.orderNumber} in status ${order.orderStatus}. Must be PAID or PROCESSING.`,
      );
    }

    const trackingUrl =
      dto.trackingUrl || this.resolveTrackingUrl(dto.carrierName, dto.trackingNumber);

    await this.prisma.$transaction(async (tx) => {
      const shipment = await tx.shipment.create({
        data: {
          orderId: order.id,
          warehouseId: dto.warehouseId || null,
          carrierName: dto.carrierName.trim(),
          trackingNumber: dto.trackingNumber.trim(),
          trackingUrl,
          status: 'IN_TRANSIT',
          shippedAt: new Date(),
        },
      });

      for (const item of order.items) {
        await tx.shipmentItem.create({
          data: {
            shipmentId: shipment.id,
            orderItemId: item.id,
            quantityShipped: item.quantity,
          },
        });
      }

      await tx.order.update({
        where: { id: order.id },
        data: {
          orderStatus: 'SHIPPED',
          fulfillmentStatus: 'FULFILLED',
          notes: dto.notes
            ? `${order.notes ? order.notes + '\n' : ''}[${new Date().toISOString()} Dispatched] ${dto.carrierName} ${dto.trackingNumber}: ${dto.notes}`
            : order.notes,
        },
      });
    });

    this.logger.log(
      `[Orders] Dispatched order ${order.orderNumber} via ${dto.carrierName} (${dto.trackingNumber}) by ${operatorId}`,
    );

    this.notificationsService
      ?.notifyDispatch(order.id, 'COURIER_DISPATCH', dto.carrierName, dto.trackingNumber, trackingUrl)
      .catch((err) => this.logger.warn(`Could not dispatch courier notification: ${err.message}`));

    return this.getOrderDetails(orderId, {
      sub: operatorId,
      email: 'staff@pinnacleparts.co.nz',
      isStaff: true,
      permissions: ['customers:view:pii_contact', 'orders:view:all'],
    });
  }

  // ---------------------------------------------------------------------------
  // 6. Fulfillment: Depot Click & Collect Pickup Confirmation
  // ---------------------------------------------------------------------------

  async confirmDepotCollection(
    orderId: string,
    dto: ConfirmDepotCollectionBodyDto,
    operatorId: string,
  ): Promise<OrderAdminDetailsDto> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    if (order.orderStatus !== 'PAID' && order.orderStatus !== 'PROCESSING') {
      throw new BadRequestException(
        `Cannot confirm depot collection for order ${order.orderNumber} in status ${order.orderStatus}`,
      );
    }

    const depotReference = `DEPOT-COLLECT-${order.orderNumber.replace(/[^0-9]/g, '').slice(-6) || Date.now().toString().slice(-6)}`;
    const collectionNote = `Collected by: ${dto.collectedBy.trim()}${dto.idDocumentType ? ` (ID: ${dto.idDocumentType}${dto.idReferenceLast4 ? ` ending ${dto.idReferenceLast4}` : ''})` : ''}${dto.notes ? ` - ${dto.notes}` : ''}`;

    await this.prisma.$transaction(async (tx) => {
      const shipment = await tx.shipment.create({
        data: {
          orderId: order.id,
          carrierName: 'Customer Depot Collection (Trade Counter, Penrose Auckland)',
          trackingNumber: depotReference,
          status: 'DELIVERED',
          shippedAt: new Date(),
          deliveredAt: new Date(),
        },
      });

      for (const item of order.items) {
        await tx.shipmentItem.create({
          data: {
            shipmentId: shipment.id,
            orderItemId: item.id,
            quantityShipped: item.quantity,
          },
        });
      }

      await tx.order.update({
        where: { id: order.id },
        data: {
          orderStatus: 'DELIVERED',
          fulfillmentStatus: 'FULFILLED',
          notes: `${order.notes ? order.notes + '\n' : ''}[${new Date().toISOString()} Trade Counter Collection] ${collectionNote}`,
        },
      });
    });

    this.logger.log(
      `[Orders] Depot collection verified for order ${order.orderNumber} by operator ${operatorId} (${collectionNote})`,
    );

    this.notificationsService
      ?.notifyDispatch(order.id, 'DEPOT_READY')
      .catch((err) => this.logger.warn(`Could not dispatch collection notification: ${err.message}`));

    return this.getOrderDetails(orderId, {
      sub: operatorId,
      email: 'staff@pinnacleparts.co.nz',
      isStaff: true,
      permissions: ['customers:view:pii_contact', 'orders:view:all'],
    });
  }

  // ---------------------------------------------------------------------------
  // 7. Cancellation & Refunds (with auditable stock movements)
  // ---------------------------------------------------------------------------

  async cancelAndRefundOrder(
    orderId: string,
    dto: CancelOrderBodyDto,
    operatorId: string,
  ): Promise<OrderAdminDetailsDto> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        stockReservations: true,
        paymentTransactions: {
          where: { status: 'SUCCESS' },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    if (order.orderStatus === 'CANCELLED') {
      throw new ConflictException(`Order ${order.orderNumber} is already CANCELLED`);
    }

    if (order.orderStatus === 'REFUNDED') {
      throw new ConflictException(`Order ${order.orderNumber} has already been REFUNDED`);
    }

    if (order.orderStatus === 'SHIPPED' || order.orderStatus === 'DELIVERED') {
      throw new BadRequestException(
        `Order ${order.orderNumber} has already been dispatched. Dispatched orders must be processed through an RMA Return Request.`,
      );
    }

    // Step A: Stock restitution
    if (order.orderStatus === 'PENDING_PAYMENT') {
      // Release soft reservations
      const activeReservations = order.stockReservations.filter((r) => r.status === 'ACTIVE');
      for (const res of activeReservations) {
        await this.inventoryService.releaseStockReservation(
          res.id,
          operatorId,
          `ORDER_CANCELLED: ${dto.reason}`,
        );
      }
    } else if (order.orderStatus === 'PAID' || order.orderStatus === 'PROCESSING') {
      // Stock was already committed; restock each line item to inventory
      for (const item of order.items) {
        await this.inventoryService.restockOrderItem({
          orderId: order.id,
          orderItemId: item.id,
          quantity: item.quantity,
          operatorId,
          reasonCode: `ORDER_CANCELLED_RESTOCK: ${dto.reason.slice(0, 50)}`,
        });
      }
    }

    // Step B: Refund payment if order was paid and refund requested
    let paymentStatus = order.paymentStatus;
    if (
      dto.refundPayment !== false &&
      (order.paymentStatus === 'PAID' || order.paymentStatus === 'PARTIALLY_REFUNDED') &&
      order.paymentTransactions.length > 0
    ) {
      const refundResult = await this.paymentsService.processRefund(
        order.id,
        Number(order.totalAmount),
        dto.reason,
      );
      paymentStatus = refundResult.success ? 'REFUNDED' : order.paymentStatus;
    }

    const updated = await this.prisma.order.update({
      where: { id: order.id },
      data: {
        orderStatus: 'CANCELLED',
        paymentStatus,
        notes: `${order.notes ? order.notes + '\n' : ''}[${new Date().toISOString()} Cancelled] Reason: ${dto.reason}`,
      },
      include: {
        items: true,
        shipments: { include: { items: true } },
        returnRequests: {
          include: {
            returnItems: {
              include: {
                inspection: {
                  include: { inspector: { include: { staffProfile: true } } },
                },
                orderItem: true,
              },
            },
          },
        },
        paymentTransactions: true,
      },
    });

    this.logger.log(
      `[Orders] Order ${order.orderNumber} cancelled by ${operatorId}. Reason: ${dto.reason}`,
    );

    const refundAmount = paymentStatus === 'REFUNDED' ? Number(order.totalAmount) : 0;
    this.notificationsService
      ?.notifyCancellation(order.id, dto.reason, refundAmount)
      .catch((err) => this.logger.warn(`Could not dispatch cancellation notification: ${err.message}`));

    return this.mapOrderToAdminDto(updated, true);
  }

  // ---------------------------------------------------------------------------
  // 8. Process Direct Refund
  // ---------------------------------------------------------------------------

  async processOrderRefund(
    orderId: string,
    dto: ProcessRefundBodyDto,
    operatorId: string,
  ): Promise<OrderAdminDetailsDto> {
    await this.paymentsService.processRefund(orderId, dto.amount, dto.reason);

    this.logger.log(
      `[Orders] Refund of $${dto.amount ?? 'FULL'} processed on order ${orderId} by operator ${operatorId}`,
    );

    return this.getOrderDetails(orderId, {
      sub: operatorId,
      email: 'staff@pinnacleparts.co.nz',
      isStaff: true,
      permissions: ['customers:view:pii_contact', 'orders:view:all', 'payments:refund:process'],
    });
  }

  // ---------------------------------------------------------------------------
  // 9. Returns & RMA Lifecycle
  // ---------------------------------------------------------------------------

  async createReturnRequest(
    customerId: string,
    dto: CreateReturnRequestBodyDto,
  ): Promise<ReturnRequestDto> {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException(`Order ${dto.orderId} not found`);
    }

    // Verify ownership
    if (order.customerId && order.customerId !== customerId) {
      throw new ForbiddenException('You cannot submit returns for orders placed by other accounts');
    }

    if (order.orderStatus !== 'DELIVERED' && order.orderStatus !== 'SHIPPED') {
      throw new BadRequestException(
        `Returns can only be requested for SHIPPED or DELIVERED orders (current: ${order.orderStatus})`,
      );
    }

    // Validate return item quantities
    for (const returnItem of dto.items) {
      const lineItem = order.items.find((i) => i.id === returnItem.orderItemId);
      if (!lineItem) {
        throw new BadRequestException(
          `Order line item ${returnItem.orderItemId} does not belong to this order`,
        );
      }
      if (returnItem.quantity > lineItem.quantity) {
        throw new BadRequestException(
          `Requested return quantity (${returnItem.quantity}) exceeds purchased quantity (${lineItem.quantity}) for ${lineItem.titleSnapshot}`,
        );
      }
    }

    const year = new Date().getFullYear();
    const rmaNumber = `RMA-${year}-${Math.floor(10000 + Math.random() * 90000)}`;

    const rma = await this.prisma.returnRequest.create({
      data: {
        rmaNumber,
        orderId: order.id,
        customerId,
        reasonCode: dto.reasonCode,
        customerNotes: dto.customerNotes.trim(),
        proofPhotos: (dto.proofPhotos || []) as any,
        status: 'PENDING_REVIEW',
        returnItems: {
          create: dto.items.map((i) => ({
            orderItemId: i.orderItemId,
            quantity: i.quantity,
          })),
        },
      },
      include: {
        order: true,
        customer: { include: { user: true } },
        returnItems: {
          include: {
            orderItem: true,
            inspection: {
              include: { inspector: { include: { staffProfile: true } } },
            },
          },
        },
      },
    });

    this.logger.log(
      `[RMA] Created RMA ${rma.rmaNumber} for order ${order.orderNumber} (Customer ${customerId})`,
    );
    return this.mapReturnRequestToDto(rma);
  }

  async reviewReturnRequest(
    returnId: string,
    dto: ReviewReturnRequestBodyDto,
    operatorId: string,
  ): Promise<ReturnRequestDto> {
    const rma = await this.prisma.returnRequest.findUnique({
      where: { id: returnId },
    });

    if (!rma) {
      throw new NotFoundException(`RMA ${returnId} not found`);
    }

    if (rma.status !== 'PENDING_REVIEW') {
      throw new BadRequestException(`RMA ${rma.rmaNumber} is already in status ${rma.status}`);
    }

    const nextStatus = dto.action === 'APPROVE' ? 'APPROVED' : 'REJECTED';

    const updated = await this.prisma.returnRequest.update({
      where: { id: returnId },
      data: {
        status: nextStatus,
        customerNotes: dto.staffNotes
          ? `${rma.customerNotes}\n[Staff Review ${new Date().toISOString()}]: ${dto.staffNotes}`
          : rma.customerNotes,
      },
      include: {
        order: true,
        customer: { include: { user: true } },
        returnItems: {
          include: {
            orderItem: true,
            inspection: {
              include: { inspector: { include: { staffProfile: true } } },
            },
          },
        },
      },
    });

    this.logger.log(`[RMA] Staff ${operatorId} marked RMA ${rma.rmaNumber} as ${nextStatus}`);

    this.notificationsService
      ?.notifyReturnStatus(returnId)
      .catch((err) => this.logger.warn(`Could not dispatch return status update notification: ${err.message}`));

    return this.mapReturnRequestToDto(updated);
  }

  async inspectReturn(
    returnItemId: string,
    dto: RecordReturnInspectionBodyDto,
    operatorId: string,
  ): Promise<ReturnRequestDto> {
    const item = await this.prisma.returnItem.findUnique({
      where: { id: returnItemId },
      include: {
        returnRequest: {
          include: { order: true },
        },
        orderItem: true,
      },
    });

    if (!item) {
      throw new NotFoundException(`Return item ${returnItemId} not found`);
    }

    // Record inspection
    await this.prisma.returnInspection.upsert({
      where: { returnItemId },
      create: {
        returnItemId,
        inspectorId: operatorId,
        disposition: dto.disposition,
        inspectionNotes: dto.inspectionNotes.trim(),
        refundEligible: dto.refundEligible,
      },
      update: {
        inspectorId: operatorId,
        disposition: dto.disposition,
        inspectionNotes: dto.inspectionNotes.trim(),
        refundEligible: dto.refundEligible,
      },
    });

    // Execute auditable inventory movement based on disposition
    if (dto.disposition === 'RESTOCK_TO_INVENTORY') {
      await this.inventoryService.restockOrderItem({
        orderId: item.returnRequest.orderId,
        orderItemId: item.orderItemId,
        quantity: item.quantity,
        operatorId,
        reasonCode: `RMA_RESTOCK_APPROVED_${item.returnRequest.rmaNumber}`,
      });
    } else if (dto.disposition === 'SCRAP_WRITEOFF') {
      await this.inventoryService.scrapReturnedItem({
        orderId: item.returnRequest.orderId,
        orderItemId: item.orderItemId,
        operatorId,
        reasonCode: `RMA_SCRAP_WRITEOFF_${item.returnRequest.rmaNumber}`,
      });
    }

    // Check if all items in this RMA have been inspected
    const allItems = await this.prisma.returnItem.findMany({
      where: { returnRequestId: item.returnRequestId },
      include: { inspection: true },
    });

    const allInspected = allItems.every((i) => i.id === returnItemId || i.inspection !== null);
    if (allInspected) {
      await this.prisma.returnRequest.update({
        where: { id: item.returnRequestId },
        data: { status: 'RESOLVED' },
      });
    }

    const reloaded = await this.prisma.returnRequest.findUniqueOrThrow({
      where: { id: item.returnRequestId },
      include: {
        order: true,
        customer: { include: { user: true } },
        returnItems: {
          include: {
            orderItem: true,
            inspection: {
              include: { inspector: { include: { staffProfile: true } } },
            },
          },
        },
      },
    });

    this.logger.log(
      `[RMA] Return item ${returnItemId} inspected by ${operatorId} -> Disposition: ${dto.disposition}`,
    );

    this.notificationsService
      ?.notifyReturnStatus(item.returnRequestId)
      .catch((err) => this.logger.warn(`Could not dispatch return status update notification: ${err.message}`));

    return this.mapReturnRequestToDto(reloaded);
  }

  // ---------------------------------------------------------------------------
  // 10. Customer Self-Service Endpoints
  // ---------------------------------------------------------------------------

  async getCustomerOrders(
    customerId: string,
    query: { page?: number; pageSize?: number },
  ): Promise<PaginatedResponse<OrderAdminDetailsDto>> {
    const page = Math.max(1, query.page || 1);
    const pageSize = Math.min(50, Math.max(1, query.pageSize || 10));
    const skip = (page - 1) * pageSize;

    const [total, orders] = await Promise.all([
      this.prisma.order.count({ where: { customerId } }),
      this.prisma.order.findMany({
        where: { customerId },
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          items: true,
          shipments: { include: { items: true } },
          returnRequests: {
            include: {
              returnItems: {
                include: {
                  inspection: {
                    include: { inspector: { include: { staffProfile: true } } },
                  },
                  orderItem: true,
                },
              },
            },
          },
          paymentTransactions: { orderBy: { createdAt: 'desc' } },
        },
      }),
    ]);

    return {
      data: orders.map((o) => this.mapOrderToAdminDto(o, true)),
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async getCustomerOrderDetail(
    customerId: string,
    orderNumber: string,
  ): Promise<OrderAdminDetailsDto> {
    const order = await this.prisma.order.findUnique({
      where: { orderNumber },
      include: {
        items: true,
        shipments: { include: { items: true } },
        returnRequests: {
          include: {
            returnItems: {
              include: {
                inspection: {
                  include: { inspector: { include: { staffProfile: true } } },
                },
                orderItem: true,
              },
            },
          },
        },
        paymentTransactions: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderNumber} not found`);
    }

    if (order.customerId !== customerId) {
      throw new ForbiddenException('You do not have permission to view this order');
    }

    return this.mapOrderToAdminDto(order, true);
  }

  async requestCustomerCancellation(
    customerId: string,
    orderNumber: string,
    reason: string,
  ): Promise<OrderAdminDetailsDto> {
    const order = await this.prisma.order.findUnique({
      where: { orderNumber },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderNumber} not found`);
    }

    if (order.customerId !== customerId) {
      throw new ForbiddenException('You cannot cancel orders placed by other customers');
    }

    if (order.orderStatus !== 'PENDING_PAYMENT' && order.orderStatus !== 'PAID') {
      throw new BadRequestException(
        `Order ${orderNumber} cannot be cancelled because it is in status "${order.orderStatus}". Orders in processing or transit must be returned after delivery.`,
      );
    }

    return this.cancelAndRefundOrder(
      order.id,
      { reason: `Customer initiated cancellation: ${reason}` },
      customerId,
    );
  }

  // ---------------------------------------------------------------------------
  // Helpers & Mappers
  // ---------------------------------------------------------------------------

  private resolveTrackingUrl(carrierName: string, trackingNumber: string): string {
    const carrier = carrierName.toLowerCase();
    if (carrier.includes('courierpost') || carrier.includes('nzpost') || carrier.includes('nz post')) {
      return `https://www.nzpost.co.nz/tools/tracking?track=${encodeURIComponent(trackingNumber)}`;
    }
    if (carrier.includes('mainfreight')) {
      return `https://www.mainfreight.com/tracking?trackingNumber=${encodeURIComponent(trackingNumber)}`;
    }
    if (carrier.includes('aramex')) {
      return `https://www.aramex.co.nz/tools/track?trackingNumber=${encodeURIComponent(trackingNumber)}`;
    }
    if (carrier.includes('startrack')) {
      return `https://startrack.com.au/track/search?id=${encodeURIComponent(trackingNumber)}`;
    }
    if (carrier.includes('aust') || carrier.includes('auspost')) {
      return `https://auspost.com.au/mypost/track/#/details/${encodeURIComponent(trackingNumber)}`;
    }
    if (carrier.includes('toll')) {
      return `https://www.mytoll.com/#/tracking?trackingNumbers=${encodeURIComponent(trackingNumber)}`;
    }
    return `https://www.nzpost.co.nz/tools/tracking?track=${encodeURIComponent(trackingNumber)}`;
  }

  private mapOrderToAdminDto(order: any, canViewPii: boolean): OrderAdminDetailsDto {
    const rawShipping = order.shippingAddress as OrderAddressSnapshot;
    const rawBilling = order.billingAddress as OrderAddressSnapshot;

    const shippingAddress: OrderAddressSnapshot = canViewPii
      ? rawShipping
      : {
          ...rawShipping,
          line1: '*** (Protected Contact Info)',
          line2: undefined,
        };

    const billingAddress: OrderAddressSnapshot = canViewPii
      ? rawBilling
      : {
          ...rawBilling,
          line1: '*** (Protected Contact Info)',
          line2: undefined,
        };

    const customerEmail = canViewPii ? order.customerEmail : this.maskEmail(order.customerEmail);
    const customerPhone = canViewPii ? order.customerPhone : this.maskPhone(order.customerPhone);

    const items: OrderItemSnapshotDto[] = (order.items || []).map((i: any) => ({
      id: i.id,
      productId: i.productId,
      skuSnapshot: i.skuSnapshot,
      titleSnapshot: i.titleSnapshot,
      saleUnitCodeSnapshot: i.saleUnitCodeSnapshot,
      saleUnitNameSnapshot: i.saleUnitNameSnapshot,
      baseQuantityMultiplierSnapshot: i.baseQuantityMultiplierSnapshot,
      quantity: i.quantity,
      baseUnitsConsumed: i.baseUnitsConsumed,
      unitPrice: Number(i.unitPrice),
      discountAmount: Number(i.discountAmount),
      taxAmount: Number(i.taxAmount),
      totalPrice: Number(i.totalPrice),
      serializedItemId: i.serializedItemId,
    }));

    const shipments: ShipmentDto[] = (order.shipments || []).map((s: any) => ({
      id: s.id,
      orderId: s.orderId,
      warehouseId: s.warehouseId,
      carrierName: s.carrierName,
      trackingNumber: s.trackingNumber,
      trackingUrl: s.trackingUrl,
      status: s.status,
      shippedAt: s.shippedAt ? s.shippedAt.toISOString() : null,
      deliveredAt: s.deliveredAt ? s.deliveredAt.toISOString() : null,
      createdAt: s.createdAt.toISOString(),
      items: (s.items || []).map((si: any) => ({
        id: si.id,
        orderItemId: si.orderItemId,
        quantityShipped: si.quantityShipped,
      })),
    }));

    const returnRequests: ReturnRequestDto[] = (order.returnRequests || []).map((r: any) =>
      this.mapReturnRequestToDto(r),
    );

    const paymentTransactions = (order.paymentTransactions || []).map((pt: any) => ({
      id: pt.id,
      provider: pt.provider,
      transactionReference: pt.transactionReference,
      amount: Number(pt.amount),
      currency: pt.currency,
      status: pt.status,
      createdAt:
        pt.createdAt instanceof Date
          ? pt.createdAt.toISOString()
          : pt.createdAt
            ? new Date(pt.createdAt).toISOString()
            : new Date().toISOString(),
    }));

    const isClickAndCollect =
      shippingAddress.company?.includes('Click & Collect') ||
      ((shippingAddress.city === 'Auckland' || shippingAddress.city === 'Penrose') && shippingAddress.postalCode === '1061');

    const timeline = this.buildOrderTimeline(order, shipments, returnRequests, paymentTransactions);

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      customerId: order.customerId,
      customerEmail,
      customerPhone,
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      fulfillmentStatus: order.fulfillmentStatus,
      subtotal: Number(order.subtotal),
      discountAmount: Number(order.discountAmount),
      shippingFee: Number(order.shippingFee),
      taxAmount: Number(order.taxAmount),
      totalAmount: Number(order.totalAmount),
      currency: order.currency,
      shippingMethod: isClickAndCollect ? 'CLICK_AND_COLLECT' : 'STANDARD_COURIER',
      shippingAddress,
      billingAddress,
      notes: order.notes,
      items,
      shipments,
      returnRequests,
      paymentTransactions,
      timeline,
      allowedTransitions: VALID_TRANSITIONS[order.orderStatus as OrderStatus] || [],
      isPiiMasked: !canViewPii,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    };
  }

  private mapReturnRequestToDto(rma: any): ReturnRequestDto {
    return {
      id: rma.id,
      rmaNumber: rma.rmaNumber,
      orderId: rma.orderId,
      orderNumber: rma.order?.orderNumber || 'UNKNOWN',
      customerId: rma.customerId,
      customerEmail: rma.order?.customerEmail || rma.customer?.user?.email || '',
      customerName: rma.customer ? `${rma.customer.firstName} ${rma.customer.lastName}` : undefined,
      reasonCode: rma.reasonCode,
      customerNotes: rma.customerNotes,
      proofPhotos: Array.isArray(rma.proofPhotos) ? (rma.proofPhotos as string[]) : [],
      status: rma.status,
      createdAt: rma.createdAt.toISOString(),
      updatedAt: rma.updatedAt.toISOString(),
      items: (rma.returnItems || []).map((ri: any) => ({
        id: ri.id,
        orderItemId: ri.orderItemId,
        productTitle: ri.orderItem?.titleSnapshot || 'Auto Part',
        sku: ri.orderItem?.skuSnapshot || '',
        quantity: ri.quantity,
        unitPrice: ri.orderItem ? Number(ri.orderItem.unitPrice) : 0,
        inspection: ri.inspection
          ? {
              id: ri.inspection.id,
              returnItemId: ri.inspection.returnItemId,
              inspectorId: ri.inspection.inspectorId,
              inspectorName: ri.inspection.inspector?.staffProfile
                ? `${ri.inspection.inspector.staffProfile.firstName} ${ri.inspection.inspector.staffProfile.lastName}`
                : ri.inspection.inspector?.email || 'Pinnacle Quality Inspector',
              disposition: ri.inspection.disposition,
              inspectionNotes: ri.inspection.inspectionNotes,
              refundEligible: ri.inspection.refundEligible,
              completedAt: ri.inspection.completedAt.toISOString(),
            }
          : null,
      })),
    };
  }

  private buildOrderTimeline(
    order: any,
    shipments: ShipmentDto[],
    returnRequests: ReturnRequestDto[],
    paymentTransactions: any[],
  ): OrderTimelineEventDto[] {
    const events: OrderTimelineEventDto[] = [];

    events.push({
      id: `evt_created_${order.id}`,
      type: 'ORDER_PLACED',
      title: 'Order Placed',
      description: `Order ${order.orderNumber} initiated for $${Number(order.totalAmount).toFixed(2)} ${order.currency || 'NZD'}`,
      timestamp: order.createdAt.toISOString(),
      actor: 'Customer',
    });

    for (const pt of paymentTransactions) {
      if (pt.status === 'SUCCESS') {
        events.push({
          id: `evt_pay_${pt.id}`,
          type: 'PAYMENT_CONFIRMED',
          title: 'Payment Succeeded',
          description: `Received $${Number(pt.amount).toFixed(2)} ${pt.currency || 'NZD'} via ${pt.provider} (${pt.transactionReference})`,
          timestamp: pt.createdAt,
          actor: 'Payment Gateway',
        });
      } else if (pt.status === 'REFUNDED') {
        events.push({
          id: `evt_ref_${pt.id}`,
          type: 'REFUND_PROCESSED',
          title: 'Refund Processed',
          description: `Refund of $${Number(pt.amount).toFixed(2)} ${pt.currency || 'NZD'} recorded (${pt.transactionReference})`,
          timestamp: pt.createdAt,
          actor: 'Accounts & Refunds',
        });
      }
    }

    if (['PROCESSING', 'SHIPPED', 'DELIVERED'].includes(order.orderStatus)) {
      events.push({
        id: `evt_proc_${order.id}`,
        type: 'PROCESSING_STARTED',
        title: 'Fulfillment In Progress',
        description: 'Order sent to Auckland Penrose warehouse pick & pack station',
        timestamp: order.updatedAt.toISOString(),
        actor: 'Warehouse Dispatcher',
      });
    }

    for (const s of shipments) {
      if (s.carrierName.includes('Customer Depot Collection')) {
        events.push({
          id: `evt_collect_${s.id}`,
          type: 'COLLECTED_AT_DEPOT',
          title: 'Collected from Trade Counter',
          description: `Customer collected parts from Gate 2 trade counter (Ref: ${s.trackingNumber})`,
          timestamp: s.deliveredAt || s.createdAt,
          actor: 'Trade Counter Supervisor',
        });
      } else {
        events.push({
          id: `evt_ship_${s.id}`,
          type: 'DISPATCHED',
          title: `Dispatched with ${s.carrierName}`,
          description: `Consignment tracking: ${s.trackingNumber}`,
          timestamp: s.shippedAt || s.createdAt,
          actor: 'Logistics Team',
        });
        if (s.status === 'DELIVERED') {
          events.push({
            id: `evt_deliv_${s.id}`,
            type: 'DELIVERED',
            title: 'Delivered',
            description: `Courier confirmed delivery of consignment ${s.trackingNumber}`,
            timestamp: s.deliveredAt || s.createdAt,
            actor: s.carrierName,
          });
        }
      }
    }

    if (order.orderStatus === 'CANCELLED') {
      events.push({
        id: `evt_cancel_${order.id}`,
        type: 'CANCELLED',
        title: 'Order Cancelled',
        description: order.notes?.includes('Cancelled')
          ? order.notes
              .split('\n')
              .filter((l: string) => l.includes('Cancelled'))
              .pop() || 'Order cancelled'
          : 'Order cancelled and stock released/restocked to inventory',
        timestamp: order.updatedAt.toISOString(),
        actor: 'Operations Team',
      });
    }

    for (const rma of returnRequests) {
      events.push({
        id: `evt_rma_req_${rma.id}`,
        type: 'RETURN_REQUESTED',
        title: `RMA Return Requested (${rma.rmaNumber})`,
        description: `Reason: ${rma.reasonCode}. Notes: ${rma.customerNotes}`,
        timestamp: rma.createdAt,
        actor: 'Customer',
      });

      if (rma.status === 'APPROVED') {
        events.push({
          id: `evt_rma_appr_${rma.id}`,
          type: 'RETURN_APPROVED',
          title: `RMA Approved (${rma.rmaNumber})`,
          description: 'Return authorized for physical return to Auckland depot',
          timestamp: rma.updatedAt,
          actor: 'Support Team',
        });
      } else if (rma.status === 'REJECTED') {
        events.push({
          id: `evt_rma_rej_${rma.id}`,
          type: 'RETURN_REJECTED',
          title: `RMA Rejected (${rma.rmaNumber})`,
          description: 'Return request was declined after review',
          timestamp: rma.updatedAt,
          actor: 'Support Team',
        });
      }

      for (const item of rma.items) {
        if (item.inspection) {
          events.push({
            id: `evt_rma_insp_${item.inspection.id}`,
            type: 'RETURN_INSPECTED',
            title: `Part Inspected (${item.sku})`,
            description: `Disposition: ${item.inspection.disposition}. Inspector notes: ${item.inspection.inspectionNotes}`,
            timestamp: item.inspection.completedAt,
            actor: item.inspection.inspectorName,
          });
        }
      }
    }

    // Sort chronologically ascending
    return events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  private maskEmail(email: string): string {
    const parts = email.split('@');
    if (parts.length !== 2) return '***@***.com';
    const name = parts[0]!;
    const domain = parts[1]!;
    const maskedName = name.length > 2 ? `${name.slice(0, 2)}***` : '***';
    const domainParts = domain.split('.');
    const tld = domainParts.length > 1 ? domainParts.pop() : 'com';
    return `${maskedName}@***.${tld}`;
  }

  private maskPhone(phone: string | null): string | null {
    if (!phone) return null;
    const digits = phone.replace(/\s+/g, '');
    if (digits.length <= 4) return '****';
    return `${digits.slice(0, 4)}***${digits.slice(-2)}`;
  }
}
