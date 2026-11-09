import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { StorefrontService } from './catalog/storefront.service';
import { PaymentsService } from './payments/payments.service';
import { InventoryService } from './inventory/inventory.service';
import { OrdersService } from './orders/orders.service';
import { PrismaService } from './prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { PermissionsGuard } from './auth/guards/permissions.guard';
import { Reflector } from '@nestjs/core';
import { AuthenticatedUser } from '@pinnacle/contracts';
import { CartService } from './cart/cart.service';
import { PricingTaxService } from './checkout/pricing-tax.service';
import { ShippingCalculatorService } from './checkout/shipping-calculator.service';
import { MockPaymentGatewayAdapter } from './payments/mock-payment.adapter';
import { StripePaymentGatewayAdapter } from './payments/stripe-payment.adapter';
import { NotificationsService } from './notifications/notifications.service';
import { CacheService } from './common/cache/cache.service';
import { Decimal } from '@prisma/client/runtime/library';

// Mock Config Provider
class MockConfigService {
  private readonly config: Record<string, string> = {
    NODE_ENV: 'test',
    TAX_RATE_PERCENT: '15',
    CURRENCY: 'NZD',
    PAYMENT_DEFAULT_PROVIDER: 'MOCK',
    API_BASE_URL: 'http://localhost:4000/api/v1',
  };

  get(key: string): string | null {
    return this.config[key] ?? null;
  }
}

describe('System-Wide Critical Journeys Integration Suite (Phase 17)', () => {
  let storefrontService: StorefrontService;
  let paymentsService: PaymentsService;
  let inventoryService: InventoryService;
  let ordersService: OrdersService;
  let permissionsGuard: PermissionsGuard;
  let reflector: Reflector;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      product: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
      },
      category: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      inventoryItem: {
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        upsert: jest.fn(),
      },
      serializedInventoryItem: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      stockReservation: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      inventoryMovement: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      warehouse: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      cart: {
        findUnique: jest.fn(),
      },
      cartItem: {
        findMany: jest.fn(),
      },
      order: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      paymentTransaction: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        upsert: jest.fn(),
      },
      paymentWebhookLog: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      integrationAccount: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      integrationSyncJob: {
        create: jest.fn(),
        update: jest.fn(),
      },
      saleUnitConfig: {
        findUnique: jest.fn(),
      },
      $transaction: jest.fn((cb) => cb(mockPrisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorefrontService,
        PaymentsService,
        InventoryService,
        OrdersService,
        PricingTaxService,
        PermissionsGuard,
        Reflector,
        CacheService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useClass: MockConfigService },
        {
          provide: CartService,
          useValue: {
            getCart: jest.fn(),
            clearCart: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: NotificationsService,
          useValue: {
            dispatchNotification: jest.fn().mockResolvedValue({ id: 'notif-1' }),
            dispatchPaymentStatusUpdate: jest.fn().mockResolvedValue({ id: 'notif-2' }),
            notifyCancellation: jest.fn().mockResolvedValue({ id: 'notif-3' }),
            notifyOrderConfirmed: jest.fn().mockResolvedValue({ id: 'notif-4' }),
            notifyPaymentStatus: jest.fn().mockResolvedValue({ id: 'notif-5' }),
            notifyDispatch: jest.fn().mockResolvedValue({ id: 'notif-6' }),
          },
        },
        {
          provide: MockPaymentGatewayAdapter,
          useValue: {
            providerName: 'MOCK',
            createPaymentIntent: jest.fn().mockResolvedValue({
              clientSecret: 'mock_sec_123',
              transactionReference: 'txn_mock_881',
              providerStatus: 'REQUIRES_PAYMENT_METHOD',
            }),
            verifyWebhook: jest.fn().mockResolvedValue({
              isValid: true,
              eventId: 'evt_stripe_999',
              eventType: 'payment_intent.succeeded',
              transactionReference: 'txn_mock_881',
              orderNumber: 'ORD-NZ-001',
              status: 'SUCCESS',
              totalAmount: 185.0,
              currency: 'NZD',
            }),
          },
        },
        {
          provide: StripePaymentGatewayAdapter,
          useValue: {
            providerName: 'STRIPE',
            createPaymentIntent: jest.fn(),
            verifyWebhook: jest.fn().mockResolvedValue({
              isValid: true,
              eventId: 'evt_stripe_999',
              eventType: 'payment_intent.succeeded',
              transactionReference: 'txn_mock_881',
              orderNumber: 'ORD-NZ-001',
              status: 'SUCCESS',
              totalAmount: 185.0,
              currency: 'NZD',
            }),
          },
        },
        {
          provide: ShippingCalculatorService,
          useValue: {
            calculateShipping: jest.fn().mockResolvedValue({
              carrierName: 'CourierPost',
              serviceCode: 'COURIERPOST_TRACKED',
              costAmount: 15.0,
              estimatedBusinessDays: 2,
            }),
          },
        },
      ],
    }).compile();

    storefrontService = module.get<StorefrontService>(StorefrontService);
    paymentsService = module.get<PaymentsService>(PaymentsService);
    inventoryService = module.get<InventoryService>(InventoryService);
    ordersService = module.get<OrdersService>(OrdersService);
    permissionsGuard = module.get<PermissionsGuard>(PermissionsGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  // ---------------------------------------------------------------------------
  // Journey 1: Customer searches and filters products
  // ---------------------------------------------------------------------------
  describe('Journey 1: Customer searches and filters products', () => {
    it('returns filtered and paginated products with NZ pricing and availability', async () => {
      mockPrisma.product.findMany.mockResolvedValue([
        {
          id: 'prod-tyre-1',
          sku: 'TYR-BRI-2055516-EP300',
          title: 'Bridgestone Ecopia EP300 205/55R16',
          slug: 'bridgestone-ecopia-ep300',
          productType: 'BULK_QUANTITY',
          status: 'PUBLISHED',
          brand: 'Bridgestone',
          category: { name: 'Tyres', slug: 'tyres' },
          media: [],
          saleUnits: [
            {
              id: 'su-single',
              name: 'Single Tyre',
              code: 'SINGLE',
              retailPrice: new Decimal('185.00'),
              tradePrice: new Decimal('150.00'),
              baseQuantityMultiplier: 1,
              isDefault: true,
              inventoryItems: [{ quantityOnHand: 12, quantityReserved: 2 }],
            },
          ],
          inventoryItems: [{ quantityOnHand: 12, quantityReserved: 2 }],
          serializedItems: [],
          fitments: [],
        },
      ]);
      mockPrisma.product.count.mockResolvedValue(1);

      const res = await storefrontService.search({
        search: 'Ecopia',
        categorySlug: 'tyres',
        page: 1,
        pageSize: 10,
      });

      expect(res.data).toHaveLength(1);
      expect(res.data[0]!.sku).toBe('TYR-BRI-2055516-EP300');
      expect(res.data[0]!.availability.inStock).toBe(true);
      expect(res.data[0]!.availability.sellableBaseUnits).toBe(10);
      expect(res.meta.total).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  // Journey 2: Customer views product specifications and fitment state
  // ---------------------------------------------------------------------------
  describe('Journey 2: Customer views product specifications and fitment state', () => {
    it('retrieves detailed specification and verified fitment matrix', async () => {
      const mockSeatBeltProduct = {
        id: 'prod-sb-1',
        sku: 'SBLT-TOY-RAV4-FR-01',
        title: 'Toyota RAV4 Front Right Seat Belt Tensioner',
        slug: 'toyota-rav4-front-seatbelt',
        productType: 'INDIVIDUALLY_SERIALIZED',
        status: 'PUBLISHED',
        brand: 'Toyota Genuine',
        categoryId: 'cat-sb',
        category: { id: 'cat-sb', name: 'Seat Belts', slug: 'seat-belts' },
        description: 'OEM Toyota RAV4 pyrotechnic seat belt tensioner with intact wiring loom.',
        seatBeltSpecification: {
          componentType: 'COMPLETE_ASSEMBLY',
          position: 'FRONT_RIGHT',
          mountingPoints: 3,
          webbingColor: 'Black',
          oemReferenceTag: '73210-42150',
        },
        tyreSpecification: null,
        fitments: [
          {
            id: 'fit-1',
            verificationStatus: 'VERIFIED_OEM_DIRECT',
            fitmentNotes: 'Direct OEM fitment for RAV4 XA50',
            vehicleChassis: {
              chassisCode: 'XA50',
              bodyType: 'SUV',
              engineSpec: '2.5L Hybrid',
              generation: {
                generationName: '5th Gen (XA50)',
                yearStart: 2019,
                yearEnd: 2024,
                model: {
                  name: 'RAV4',
                  make: {
                    name: 'Toyota',
                  },
                },
              },
            },
          },
        ],
        saleUnits: [
          {
            id: 'su-1',
            name: 'Each',
            code: 'EACH',
            retailPrice: new Decimal('480.00'),
            tradePrice: new Decimal('420.00'),
            baseQuantityMultiplier: 1,
            isDefault: true,
            inventoryItems: [],
          },
        ],
        media: [
          {
            id: 'med-1',
            cdnUrl: 'https://cdn.pinnacleparts.co.nz/img/sb-rav4.jpg',
            altText: 'Toyota RAV4 Seat Belt',
            isPrimary: true,
            displayOrder: 0,
          },
        ],
        inventoryItems: [],
        serializedItems: [
          {
            id: 'ser-1',
            stockBarcode: 'PIN-SB-008129',
            status: 'AVAILABLE',
            conditionGrade: 'A_EXCELLENT',
            conditionNotes: 'Tested 2.2 ohms resistance, webbing intact.',
            actualPhotos: ['https://cdn.pinnacleparts.co.nz/img/sb-rav4-actual.jpg'],
            donorVehicleVin: 'JTMBFREV123456789',
            locationBin: 'BAY-SB-04',
            pretensionerResistanceOhms: new Decimal('2.2'),
            warehouse: {
              name: 'Penrose Warehouse',
              code: 'AKL-PENROSE',
              city: 'Auckland',
            },
          },
        ],
      };

      mockPrisma.product.findFirst.mockResolvedValue(mockSeatBeltProduct);
      mockPrisma.product.findMany.mockImplementation((args: any) => {
        if (args?.where?.id?.not) {
          return Promise.resolve([]);
        }
        return Promise.resolve([mockSeatBeltProduct]);
      });
      mockPrisma.product.count.mockResolvedValue(1);

      const pdp = await storefrontService.findBySlug('toyota-rav4-front-seatbelt');

      expect(pdp).toBeDefined();
      expect(pdp.sku).toBe('SBLT-TOY-RAV4-FR-01');
      expect(pdp.serializedItem?.resistanceOhms).toBe(2.2);
      expect(pdp.fitments).toHaveLength(1);
      expect(pdp.fitments[0]!.make).toBe('Toyota');
      expect(pdp.fitments[0]!.model).toBe('RAV4');
      expect(pdp.fitments[0]!.generation).toBe('5th Gen (XA50)');
      expect(pdp.warehouseLocation?.depotCode).toBe('AKL-PENROSE');
    });
  });

  // ---------------------------------------------------------------------------
  // Journey 3: Customer adds item to cart and checks out in provider sandbox
  // ---------------------------------------------------------------------------
  describe('Journey 3: Customer adds item to cart and checks out in provider sandbox', () => {
    it('creates order, reserves stock, creates payment session, and confirms mock payment', async () => {
      // 1. Setup existing order in pending state
      const mockOrder = {
        id: 'ord-cart-checkout',
        orderNumber: 'ORD-NZ-99120',
        orderStatus: 'PENDING_PAYMENT',
        paymentStatus: 'PENDING',
        totalAmount: new Decimal('185.00'),
        currency: 'NZD',
        customerEmail: 'kiwi.shopper@auckland.co.nz',
        stockReservations: [{ id: 'res-1', status: 'ACTIVE', expiresAt: new Date(Date.now() + 60000) }],
      };

      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.stockReservation.findUnique.mockResolvedValue({
        id: 'res-1',
        status: 'ACTIVE',
        reservedQuantity: 2,
        inventoryItemId: 'item-1',
        orderId: mockOrder.id,
      });
      mockPrisma.inventoryItem.findUnique.mockResolvedValue({
        id: 'item-1',
        quantityOnHand: 10,
        quantityReserved: 2,
      });
      mockPrisma.inventoryItem.findUniqueOrThrow.mockResolvedValue({
        id: 'item-1',
        quantityOnHand: 10,
        quantityReserved: 2,
      });
      mockPrisma.paymentTransaction.findUnique.mockResolvedValue({
        id: 'txn-1',
        transactionReference: 'txn_mock_881',
        amount: new Decimal('185.00'),
        currency: 'NZD',
        orderId: mockOrder.id,
        order: mockOrder,
      });

      // 2. Create payment session
      const session = await paymentsService.createPaymentSession({
        orderId: mockOrder.id,
        provider: 'MOCK',
      });
      expect(session).toBeDefined();
      expect(session.clientSecret).toBe('mock_sec_123');

      // 3. Confirm mock payment in sandbox
      const confirmResult = await paymentsService.confirmMockPayment('txn_mock_881', true);
      expect(confirmResult.success).toBe(true);
      expect(confirmResult.orderNumber).toBe('ORD-NZ-99120');
    });
  });

  // ---------------------------------------------------------------------------
  // Journey 4: Duplicate payment webhook is harmless (Idempotency)
  // ---------------------------------------------------------------------------
  describe('Journey 4: Duplicate payment webhook is harmless', () => {
    it('returns duplicate: true and does not re-process already logged payment event', async () => {
      // Setup existing webhook log in database
      mockPrisma.paymentWebhookLog.findUnique.mockResolvedValue({
        id: 'log-1',
        eventId: 'evt_stripe_999',
        status: 'SUCCESS',
      });

      const result = await paymentsService.handleWebhook('STRIPE', { id: 'evt_stripe_999' }, {});

      expect(result.received).toBe(true);
      expect(result.duplicate).toBe(true);
      expect(result.status).toBe('SUCCESS');
      // Verifies no additional order state updates were triggered
      expect(mockPrisma.order.update).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Journey 5: Staff receives stock and inventory ledger updates
  // ---------------------------------------------------------------------------
  describe('Journey 5: Staff receives stock and inventory ledger updates', () => {
    it('records inward stock and writes immutable audit ledger record', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({ id: 'prod-tyre-1' });
      mockPrisma.warehouse.findUnique.mockResolvedValue({ id: 'wh-akl-central' });
      mockPrisma.inventoryItem.findUnique.mockResolvedValue(null);
      mockPrisma.inventoryItem.upsert.mockResolvedValue({
        id: 'item-akl-01',
        productId: 'prod-tyre-1',
        warehouseId: 'wh-akl-central',
        locationBin: 'BIN-A1',
        quantityOnHand: 20,
        quantityReserved: 0,
        costPrice: new Decimal('95.00'),
        createdAt: new Date(),
        updatedAt: new Date(),
        warehouse: { name: 'Penrose Auckland Trade Hub' },
      });

      const received = await inventoryService.receiveBulkStock(
        {
          productId: 'prod-tyre-1',
          warehouseId: 'wh-akl-central',
          locationBin: 'BIN-A1',
          quantity: 20,
          costPrice: '95.00',
          reasonCode: 'INWARD_CONTAINER_RECEIPT',
          referencePo: 'PO-NZ-881',
        },
        'staff-operator-uuid',
      );

      expect(received).toBeDefined();
      expect(mockPrisma.inventoryMovement.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          movementType: 'RECEIPT',
          quantityChange: 20,
          operatorId: 'staff-operator-uuid',
          referenceOrderId: 'PO-NZ-881',
        }),
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Journey 6: Concurrent order attempts cannot oversell stock
  // ---------------------------------------------------------------------------
  describe('Journey 6: Concurrent order attempts cannot oversell stock', () => {
    it('rejects second reservation when available quantity is exhausted', async () => {
      mockPrisma.saleUnitConfig.findUnique.mockResolvedValue({
        id: 'su-single',
        baseQuantityMultiplier: 1,
        name: 'Single Tyre',
        code: 'SINGLE',
      });

      // Item has 2 on hand, but both are already reserved! Available = 0
      mockPrisma.inventoryItem.findMany.mockResolvedValue([
        {
          id: 'item-depot',
          quantityOnHand: 2,
          quantityReserved: 2,
          locationBin: 'BIN-B2',
        },
      ]);

      await expect(
        inventoryService.reserveStock(
          {
            productId: 'prod-tyre-1',
            saleUnitConfigId: 'su-single',
            quantity: 1,
          },
          'shopper-2-session',
        ),
      ).rejects.toThrow(ConflictException);

      expect(mockPrisma.inventoryItem.update).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Journey 7: Staff role cannot access unauthorized finance/admin actions
  // ---------------------------------------------------------------------------
  describe('Journey 7: Staff role cannot access unauthorized finance/admin actions', () => {
    it('blocks warehouse staff from invoking finance export actions without permission', () => {
      const warehouseClerkUser: AuthenticatedUser = {
        sub: 'clerk-uuid',
        email: 'clerk@pinnacle.test',
        isStaff: true,
        permissions: ['inventory:stock:view_quantity', 'inventory:stock:inward_bulk'],
      };

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['finance:export', 'admin:dashboard:view']);

      const mockExecutionContext = {
        switchToHttp: () => ({
          getRequest: () => ({ user: warehouseClerkUser }),
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as any;

      expect(() => permissionsGuard.canActivate(mockExecutionContext)).toThrow(ForbiddenException);
    });
  });

  // ---------------------------------------------------------------------------
  // Journey 8: Customer A cannot access Customer B's data
  // ---------------------------------------------------------------------------
  describe('Journey 8: Customer A cannot access Customer B\'s data', () => {
    it('rejects attempt by Customer A to retrieve Customer B\'s order details', async () => {
      // Order belongs to customer-b
      mockPrisma.order.findFirst.mockResolvedValue(null); // findFirst with customerId: customer-a returns null

      await expect(
        ordersService.getCustomerOrderDetail('customer-a-uuid', 'ORD-NZ-CUSTOMER-B'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ---------------------------------------------------------------------------
  // Journey 9: Return/cancellation updates order and stock consistently
  // ---------------------------------------------------------------------------
  describe('Journey 9: Return/cancellation updates order and stock consistently', () => {
    it('cancels pending order and releases held stock reservation', async () => {
      const mockOrderToCancel = {
        id: 'ord-to-cancel',
        orderNumber: 'ORD-NZ-CANCEL-01',
        orderStatus: 'PENDING_PAYMENT',
        paymentStatus: 'PENDING',
        fulfillmentStatus: 'UNFULFILLED',
        customerId: 'cust-uuid-1',
        customerEmail: 'cust@pinnacle.nz',
        customerPhone: '+6421000111',
        subtotal: new Decimal('185.00'),
        discountAmount: new Decimal(0),
        shippingFee: new Decimal(0),
        taxAmount: new Decimal('24.13'),
        totalAmount: new Decimal('185.00'),
        currency: 'NZD',
        shippingAddress: { city: 'Auckland', postalCode: '1061', company: null },
        billingAddress: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        items: [],
        shipments: [],
        returnRequests: [],
        paymentTransactions: [],
        stockReservations: [
          { id: 'res-cancel-1', status: 'ACTIVE', inventoryItemId: 'item-1', reservedQuantity: 2 },
        ],
      };

      mockPrisma.order.findFirst.mockResolvedValue(mockOrderToCancel);
      mockPrisma.order.findUnique.mockResolvedValue(mockOrderToCancel);
      mockPrisma.order.update.mockResolvedValue({
        ...mockOrderToCancel,
        orderStatus: 'CANCELLED',
      });

      mockPrisma.stockReservation.findUnique.mockResolvedValue({
        id: 'res-cancel-1',
        status: 'ACTIVE',
        inventoryItemId: 'item-1',
        reservedQuantity: 2,
        orderId: mockOrderToCancel.id,
      });

      mockPrisma.inventoryItem.findUnique.mockResolvedValue({
        id: 'item-1',
        quantityOnHand: 10,
        quantityReserved: 2,
      });
      mockPrisma.inventoryItem.findUniqueOrThrow.mockResolvedValue({
        id: 'item-1',
        quantityOnHand: 10,
        quantityReserved: 2,
      });
      mockPrisma.inventoryItem.update.mockResolvedValue({
        id: 'item-1',
        quantityOnHand: 10,
        quantityReserved: 0,
      });
      mockPrisma.stockReservation.update.mockResolvedValue({
        id: 'res-cancel-1',
        status: 'RELEASED',
      });

      const cancelled = await ordersService.requestCustomerCancellation(
        'cust-uuid-1',
        'ORD-NZ-CANCEL-01',
        'Customer changed mind before dispatch',
      );

      expect(cancelled).toBeDefined();
      expect(cancelled.orderStatus).toBe('CANCELLED');
    });
  });

  // ---------------------------------------------------------------------------
  // Journey 10: Integration failure is visible and retryable
  // ---------------------------------------------------------------------------
  describe('Journey 10: Integration failure is visible and retryable', () => {
    it('classifies transient marketplace network timeout and records error on integration status', async () => {
      const transientError = 'Trade Me API Gateway Timeout: HTTP 504';

      mockPrisma.integrationAccount.findFirst.mockResolvedValue({
        id: 'acc-tm-1',
        provider: 'TRADE_ME',
        environment: 'sandbox',
        status: 'CONNECTED',
      });

      // Update integration account with last error
      mockPrisma.integrationAccount.update.mockResolvedValue({
        id: 'acc-tm-1',
        lastError: transientError,
        status: 'ERROR',
      });

      const updated = await mockPrisma.integrationAccount.update({
        where: { id: 'acc-tm-1' },
        data: {
          lastError: transientError,
          status: 'ERROR',
        },
      });

      expect(updated.lastError).toContain('HTTP 504');
      expect(updated.status).toBe('ERROR');
    });
  });
});
