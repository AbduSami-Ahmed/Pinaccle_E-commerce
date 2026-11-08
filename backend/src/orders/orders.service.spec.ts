import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { PaymentsService } from '../payments/payments.service';
import { AuthenticatedUser } from '@pinnacle/contracts';

describe('OrdersService', () => {
  let service: OrdersService;
  let prisma: any;
  let inventoryService: any;
  let paymentsService: any;

  const mockAdminUser: AuthenticatedUser = {
    sub: 'staff-admin-uuid-1',
    email: 'ops@pinnacleparts.co.nz',
    isStaff: true,
    permissions: [
      'orders:view:all',
      'orders:status:update',
      'orders:fulfill:pick_pack',
      'orders:fulfill:dispatch',
      'orders:cancel:any',
      'payments:refund:process',
      'returns:view:all',
      'returns:review:approve_reject',
      'returns:inspect:disposition',
      'customers:view:pii_contact',
    ],
  };

  const mockRestrictedStaff: AuthenticatedUser = {
    sub: 'staff-restricted-uuid-2',
    email: 'support@pinnacleparts.co.nz',
    isStaff: true,
    permissions: ['orders:view:all', 'returns:view:all'],
    // Note: lacks 'customers:view:pii_contact'
  };

  const sampleOrder = {
    id: 'order-uuid-1',
    orderNumber: 'PIN-2026-10042',
    customerId: 'cust-uuid-1',
    customerEmail: 'jordan.miller@example.co.nz',
    customerPhone: '021890123',
    shippingAddress: {
      name: 'Jordan Miller',
      line1: '18 Industry Road',
      city: 'Penrose',
      state: 'Auckland',
      postalCode: '1061',
      country: 'NZ',
    },
    billingAddress: {
      name: 'Jordan Miller',
      line1: '18 Industry Road',
      city: 'Penrose',
      state: 'Auckland',
      postalCode: '1061',
      country: 'NZ',
    },
    orderStatus: 'PENDING_PAYMENT',
    paymentStatus: 'UNPAID',
    fulfillmentStatus: 'UNFULFILLED',
    subtotal: 350.0,
    discountAmount: 0.0,
    shippingFee: 25.0,
    taxAmount: 34.09,
    totalAmount: 375.0,
    currency: 'NZD',
    notes: 'Please leave at front door if unattended',
    createdAt: new Date('2026-11-01T10:00:00Z'),
    updatedAt: new Date('2026-11-01T10:00:00Z'),
    items: [
      {
        id: 'order-item-uuid-1',
        orderId: 'order-uuid-1',
        productId: 'prod-tyre-1',
        serializedItemId: null,
        skuSnapshot: 'BS-TUR-2255018',
        titleSnapshot: 'Bridgestone Turanza T005A 225/50R18 95V',
        saleUnitCodeSnapshot: 'PAIR',
        saleUnitNameSnapshot: 'Pair (2 Tyres)',
        baseQuantityMultiplierSnapshot: 2,
        quantity: 1,
        baseUnitsConsumed: 2,
        unitPrice: 350.0,
        discountAmount: 0.0,
        taxAmount: 31.82,
        totalPrice: 350.0,
      },
    ],
    shipments: [],
    returnRequests: [],
    stockReservations: [
      {
        id: 'res-uuid-1',
        orderId: 'order-uuid-1',
        status: 'ACTIVE',
        reservedQuantity: 2,
        expiresAt: new Date('2026-11-01T10:15:00Z'),
      },
    ],
    paymentTransactions: [],
  };

  beforeEach(async () => {
    prisma = {
      order: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      shipment: {
        create: jest.fn(),
      },
      shipmentItem: {
        create: jest.fn(),
      },
      returnRequest: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
      },
      returnItem: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      returnInspection: {
        upsert: jest.fn(),
      },
      $transaction: jest.fn(async (cb) => cb(prisma)),
    };

    inventoryService = {
      releaseStockReservation: jest.fn().mockResolvedValue({ success: true }),
      restockOrderItem: jest.fn().mockResolvedValue({ success: true }),
      scrapReturnedItem: jest.fn().mockResolvedValue({ success: true }),
    };

    paymentsService = {
      processRefund: jest.fn().mockResolvedValue({
        success: true,
        refundAmount: 375.0,
        transactionReference: 're_mock_123',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: prisma },
        { provide: InventoryService, useValue: inventoryService },
        { provide: PaymentsService, useValue: paymentsService },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  describe('Order Listing & PII Masking', () => {
    it('returns orders with full details for staff holding pii_contact permission', async () => {
      prisma.order.count.mockResolvedValue(1);
      prisma.order.findMany.mockResolvedValue([sampleOrder]);

      const result = await service.getOrders({ page: 1, pageSize: 20 }, mockAdminUser);

      expect(result.data).toHaveLength(1);
      expect(result.data[0]!.customerEmail).toBe('jordan.miller@example.co.nz');
      expect(result.data[0]!.customerPhone).toBe('021890123');
      expect(result.data[0]!.shippingAddress.line1).toBe('18 Industry Road');
      expect(result.data[0]!.isPiiMasked).toBe(false);
    });

    it('masks customer email, phone, and street address for staff lacking pii_contact permission', async () => {
      prisma.order.count.mockResolvedValue(1);
      prisma.order.findMany.mockResolvedValue([sampleOrder]);

      const result = await service.getOrders({ page: 1, pageSize: 20 }, mockRestrictedStaff);

      expect(result.data).toHaveLength(1);
      expect(result.data[0]!.customerEmail).toBe('jo***@***.nz');
      expect(result.data[0]!.customerPhone).toBe('0218***23');
      expect(result.data[0]!.shippingAddress.line1).toBe('*** (Protected Contact Info)');
      expect(result.data[0]!.isPiiMasked).toBe(true);
    });
  });

  describe('Order State Machine Transitions', () => {
    it('permits valid state transition from PAID to PROCESSING', async () => {
      const paidOrder = { ...sampleOrder, orderStatus: 'PAID', paymentStatus: 'PAID' };
      prisma.order.findUnique.mockResolvedValue(paidOrder);
      prisma.order.update.mockResolvedValue({
        ...paidOrder,
        orderStatus: 'PROCESSING',
      });

      const res = await service.updateOrderStatus(
        'order-uuid-1',
        { status: 'PROCESSING', notes: 'Picking in progress' },
        mockAdminUser.sub,
      );

      expect(res.orderStatus).toBe('PROCESSING');
      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'order-uuid-1' },
          data: expect.objectContaining({ orderStatus: 'PROCESSING' }),
        }),
      );
    });

    it('rejects invalid state transition from PENDING_PAYMENT directly to DELIVERED', async () => {
      prisma.order.findUnique.mockResolvedValue(sampleOrder);

      await expect(
        service.updateOrderStatus('order-uuid-1', { status: 'DELIVERED' }, mockAdminUser.sub),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects transition from terminal CANCELLED state', async () => {
      const cancelledOrder = { ...sampleOrder, orderStatus: 'CANCELLED' };
      prisma.order.findUnique.mockResolvedValue(cancelledOrder);

      await expect(
        service.updateOrderStatus('order-uuid-1', { status: 'PAID' }, mockAdminUser.sub),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Fulfilment: Pick, Pack & Dispatch Workflows', () => {
    it('sets order to PROCESSING when pick & pack initiated', async () => {
      const paidOrder = { ...sampleOrder, orderStatus: 'PAID' };
      prisma.order.findUnique.mockResolvedValue(paidOrder);
      prisma.order.update.mockResolvedValue({ ...paidOrder, orderStatus: 'PROCESSING' });

      const res = await service.pickPackOrder(
        'order-uuid-1',
        { notes: 'Packed in Bay 4' },
        mockAdminUser.sub,
      );

      expect(res.orderStatus).toBe('PROCESSING');
    });

    it('dispatches courier shipment with CourierPost tracking and transitions order to SHIPPED', async () => {
      const processingOrder = { ...sampleOrder, orderStatus: 'PROCESSING' };
      prisma.order.findUnique.mockResolvedValue(processingOrder);
      prisma.shipment.create.mockResolvedValue({
        id: 'shipment-uuid-1',
        carrierName: 'CourierPost / NZ Post',
        trackingNumber: 'NZP-100234',
        status: 'IN_TRANSIT',
      });
      prisma.order.findFirst.mockResolvedValue({
        ...processingOrder,
        orderStatus: 'SHIPPED',
        fulfillmentStatus: 'FULFILLED',
        shipments: [
          {
            id: 'shipment-uuid-1',
            carrierName: 'CourierPost / NZ Post',
            trackingNumber: 'NZP-100234',
            trackingUrl: 'https://www.nzpost.co.nz/tools/tracking?track=NZP-100234',
            status: 'IN_TRANSIT',
            createdAt: new Date(),
            items: [],
          },
        ],
      });

      await service.dispatchCourierShipment(
        'order-uuid-1',
        { carrierName: 'CourierPost / NZ Post', trackingNumber: 'NZP-100234' },
        mockAdminUser.sub,
      );

      expect(prisma.shipment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            carrierName: 'CourierPost / NZ Post',
            trackingNumber: 'NZP-100234',
            trackingUrl: 'https://www.nzpost.co.nz/tools/tracking?track=NZP-100234',
            status: 'IN_TRANSIT',
          }),
        }),
      );
      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            orderStatus: 'SHIPPED',
            fulfillmentStatus: 'FULFILLED',
          }),
        }),
      );
    });

    it('verifies click & collect depot collection at Auckland Penrose counter and marks DELIVERED', async () => {
      const processingOrder = { ...sampleOrder, orderStatus: 'PROCESSING' };
      prisma.order.findUnique.mockResolvedValue(processingOrder);
      prisma.shipment.create.mockResolvedValue({
        id: 'depot-shipment-1',
        carrierName: 'Customer Depot Collection (Trade Counter, Penrose Auckland)',
        trackingNumber: 'DEPOT-COLLECT-10042',
        status: 'DELIVERED',
      });
      prisma.order.findFirst.mockResolvedValue({
        ...processingOrder,
        orderStatus: 'DELIVERED',
        fulfillmentStatus: 'FULFILLED',
        shipments: [
          {
            id: 'depot-shipment-1',
            carrierName: 'Customer Depot Collection (Trade Counter, Penrose Auckland)',
            trackingNumber: 'DEPOT-COLLECT-10042',
            status: 'DELIVERED',
            createdAt: new Date(),
            items: [],
          },
        ],
      });

      await service.confirmDepotCollection(
        'order-uuid-1',
        {
          collectedBy: 'Jordan Miller',
          idDocumentType: 'NZ Driver Licence',
          idReferenceLast4: '8842',
        },
        mockAdminUser.sub,
      );

      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            orderStatus: 'DELIVERED',
            fulfillmentStatus: 'FULFILLED',
          }),
        }),
      );
    });
  });

  describe('Cancellations & Auditable Restocking', () => {
    it('releases soft stock reservations when cancelling an unpaid order', async () => {
      prisma.order.findUnique.mockResolvedValue(sampleOrder);
      prisma.order.update.mockResolvedValue({ ...sampleOrder, orderStatus: 'CANCELLED' });

      await service.cancelAndRefundOrder(
        'order-uuid-1',
        { reason: 'Customer requested cancellation prior to payment' },
        mockAdminUser.sub,
      );

      expect(inventoryService.releaseStockReservation).toHaveBeenCalledWith(
        'res-uuid-1',
        mockAdminUser.sub,
        expect.stringContaining('ORDER_CANCELLED'),
      );
    });

    it('restocks order items to inventory and executes refund when cancelling a paid order', async () => {
      const paidOrder = {
        ...sampleOrder,
        orderStatus: 'PAID',
        paymentStatus: 'PAID',
        paymentTransactions: [{ id: 'tx-1', status: 'SUCCESS', createdAt: new Date() }],
      };
      prisma.order.findUnique.mockResolvedValue(paidOrder);
      prisma.order.update.mockResolvedValue({
        ...paidOrder,
        orderStatus: 'CANCELLED',
        paymentStatus: 'REFUNDED',
      });

      await service.cancelAndRefundOrder(
        'order-uuid-1',
        { reason: 'Duplicate order placed by mistake', refundPayment: true },
        mockAdminUser.sub,
      );

      expect(inventoryService.restockOrderItem).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: 'order-uuid-1',
          orderItemId: 'order-item-uuid-1',
          quantity: 1,
          operatorId: mockAdminUser.sub,
        }),
      );
      expect(paymentsService.processRefund).toHaveBeenCalledWith(
        'order-uuid-1',
        375.0,
        'Duplicate order placed by mistake',
      );
    });

    it('rejects direct cancellation on SHIPPED orders, demanding RMA return process', async () => {
      const shippedOrder = { ...sampleOrder, orderStatus: 'SHIPPED' };
      prisma.order.findUnique.mockResolvedValue(shippedOrder);

      await expect(
        service.cancelAndRefundOrder(
          'order-uuid-1',
          { reason: 'Tried to cancel in transit' },
          mockAdminUser.sub,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('RMA Returns & Physical Inspection Lifecycle', () => {
    it('creates a valid RMA return request for a delivered order', async () => {
      const deliveredOrder = { ...sampleOrder, orderStatus: 'DELIVERED' };
      prisma.order.findUnique.mockResolvedValue(deliveredOrder);
      prisma.returnRequest.create.mockResolvedValue({
        id: 'rma-uuid-1',
        rmaNumber: 'RMA-2026-00042',
        orderId: 'order-uuid-1',
        customerId: 'cust-uuid-1',
        reasonCode: 'INCORRECT_FITMENT',
        customerNotes: 'Wrong rim size for my vehicle',
        proofPhotos: [],
        status: 'PENDING_REVIEW',
        createdAt: new Date(),
        updatedAt: new Date(),
        order: deliveredOrder,
        returnItems: [
          {
            id: 'rma-item-1',
            orderItemId: 'order-item-uuid-1',
            quantity: 1,
            orderItem: sampleOrder.items[0],
            inspection: null,
          },
        ],
      });

      const res = await service.createReturnRequest('cust-uuid-1', {
        orderId: 'order-uuid-1',
        reasonCode: 'INCORRECT_FITMENT',
        customerNotes: 'Wrong rim size for my vehicle',
        items: [{ orderItemId: 'order-item-uuid-1', quantity: 1 }],
      });

      expect(res.rmaNumber).toBe('RMA-2026-00042');
      expect(res.status).toBe('PENDING_REVIEW');
    });

    it('rejects RMA return request if return quantity exceeds purchased quantity', async () => {
      const deliveredOrder = { ...sampleOrder, orderStatus: 'DELIVERED' };
      prisma.order.findUnique.mockResolvedValue(deliveredOrder);

      await expect(
        service.createReturnRequest('cust-uuid-1', {
          orderId: 'order-uuid-1',
          reasonCode: 'DEFECTIVE_PART',
          customerNotes: 'Defective item',
          items: [{ orderItemId: 'order-item-uuid-1', quantity: 99 }], // Exceeds purchased quantity of 1
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('approves RMA request during staff review', async () => {
      prisma.returnRequest.findUnique.mockResolvedValue({
        id: 'rma-uuid-1',
        rmaNumber: 'RMA-2026-00042',
        status: 'PENDING_REVIEW',
        customerNotes: 'Customer fitment issue',
      });
      prisma.returnRequest.update.mockResolvedValue({
        id: 'rma-uuid-1',
        rmaNumber: 'RMA-2026-00042',
        status: 'APPROVED',
        customerNotes: 'Customer fitment issue',
        createdAt: new Date(),
        updatedAt: new Date(),
        returnItems: [],
      });

      const res = await service.reviewReturnRequest(
        'rma-uuid-1',
        { action: 'APPROVE', staffNotes: 'Approved for return to Auckland depot' },
        mockAdminUser.sub,
      );

      expect(res.status).toBe('APPROVED');
    });

    it('executes RESTOCK_TO_INVENTORY on successful return physical inspection', async () => {
      prisma.returnItem.findUnique.mockResolvedValue({
        id: 'rma-item-1',
        returnRequestId: 'rma-uuid-1',
        orderItemId: 'order-item-uuid-1',
        quantity: 1,
        returnRequest: { id: 'rma-uuid-1', orderId: 'order-uuid-1', rmaNumber: 'RMA-2026-00042' },
        orderItem: sampleOrder.items[0],
      });
      prisma.returnItem.findMany.mockResolvedValue([
        {
          id: 'rma-item-1',
          inspection: { id: 'insp-1' },
        },
      ]);
      prisma.returnRequest.findUniqueOrThrow.mockResolvedValue({
        id: 'rma-uuid-1',
        rmaNumber: 'RMA-2026-00042',
        orderId: 'order-uuid-1',
        customerId: 'cust-uuid-1',
        status: 'RESOLVED',
        createdAt: new Date(),
        updatedAt: new Date(),
        returnItems: [],
      });

      await service.inspectReturn(
        'rma-item-1',
        {
          returnItemId: 'rma-item-1',
          disposition: 'RESTOCK_TO_INVENTORY',
          inspectionNotes: 'Tyres unmounted, brand new tread depth verified at 8.2mm',
          refundEligible: true,
        },
        mockAdminUser.sub,
      );

      expect(inventoryService.restockOrderItem).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: 'order-uuid-1',
          orderItemId: 'order-item-uuid-1',
          quantity: 1,
          reasonCode: expect.stringContaining('RMA_RESTOCK_APPROVED'),
        }),
      );
    });

    it('executes SCRAP_WRITEOFF on damaged return physical inspection', async () => {
      prisma.returnItem.findUnique.mockResolvedValue({
        id: 'rma-item-1',
        returnRequestId: 'rma-uuid-1',
        orderItemId: 'order-item-uuid-1',
        quantity: 1,
        returnRequest: { id: 'rma-uuid-1', orderId: 'order-uuid-1', rmaNumber: 'RMA-2026-00042' },
        orderItem: sampleOrder.items[0],
      });
      prisma.returnItem.findMany.mockResolvedValue([
        {
          id: 'rma-item-1',
          inspection: { id: 'insp-1' },
        },
      ]);
      prisma.returnRequest.findUniqueOrThrow.mockResolvedValue({
        id: 'rma-uuid-1',
        rmaNumber: 'RMA-2026-00042',
        orderId: 'order-uuid-1',
        customerId: 'cust-uuid-1',
        status: 'RESOLVED',
        createdAt: new Date(),
        updatedAt: new Date(),
        returnItems: [],
      });

      await service.inspectReturn(
        'rma-item-1',
        {
          returnItemId: 'rma-item-1',
          disposition: 'SCRAP_WRITEOFF',
          inspectionNotes: 'Pretensioner deployed / damaged during transit',
          refundEligible: true,
        },
        mockAdminUser.sub,
      );

      expect(inventoryService.scrapReturnedItem).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: 'order-uuid-1',
          orderItemId: 'order-item-uuid-1',
          reasonCode: expect.stringContaining('RMA_SCRAP_WRITEOFF'),
        }),
      );
    });
  });

  describe('Customer Isolation & Boundary Enforcement', () => {
    it('throws ForbiddenException when a customer attempts to view another customer order', async () => {
      prisma.order.findUnique.mockResolvedValue({
        ...sampleOrder,
        customerId: 'different-customer-uuid',
      });

      await expect(service.getCustomerOrderDetail('cust-uuid-1', 'PIN-2026-10042')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws ForbiddenException when a customer attempts to cancel another customer order', async () => {
      prisma.order.findUnique.mockResolvedValue({
        ...sampleOrder,
        customerId: 'different-customer-uuid',
      });

      await expect(
        service.requestCustomerCancellation('cust-uuid-1', 'PIN-2026-10042', 'Changed mind'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
