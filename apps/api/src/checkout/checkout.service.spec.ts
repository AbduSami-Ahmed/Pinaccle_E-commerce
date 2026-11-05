import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CheckoutService } from './checkout.service';
import { PrismaService } from '../prisma/prisma.service';
import { CartService } from '../cart/cart.service';
import { PricingTaxService } from './pricing-tax.service';
import { ShippingCalculatorService } from './shipping-calculator.service';
import { InventoryService } from '../inventory/inventory.service';

describe('CheckoutService', () => {
  let service: CheckoutService;
  let prisma: any;
  let cartService: any;
  let inventoryService: any;

  beforeEach(async () => {
    prisma = {
      order: {
        create: jest.fn(),
        findUnique: jest.fn(),
      },
      orderItem: {
        create: jest.fn(),
      },
      $transaction: jest.fn(async (cb: (tx: any) => Promise<any>) => cb(prisma)),
    };

    cartService = {
      getCart: jest.fn(),
      clearCart: jest.fn().mockResolvedValue(undefined),
    };

    inventoryService = {
      reserveStock: jest.fn().mockResolvedValue({
        reservationId: 'res-1',
        reservedBaseQuantity: 2,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CheckoutService,
        PricingTaxService,
        ShippingCalculatorService,
        { provide: PrismaService, useValue: prisma },
        { provide: CartService, useValue: cartService },
        { provide: InventoryService, useValue: inventoryService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'TAX_RATE_PERCENT') return '10';
              if (key === 'TAX_INCLUSIVE_PRICING') return 'true';
              if (key === 'SHIPPING_STANDARD_FEE') return '25.00';
              if (key === 'SHIPPING_EXPRESS_FEE') return '45.00';
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<CheckoutService>(CheckoutService);
  });

  describe('validateCheckout', () => {
    it('returns invalid state for an empty cart', async () => {
      cartService.getCart.mockResolvedValue({
        items: [],
        totals: { subtotal: 0, taxIncluded: 0, total: 0 },
      });

      const res = await service.validateCheckout('sess-1', {
        shippingMethod: 'CLICK_AND_COLLECT',
      });

      expect(res.isValid).toBe(false);
      expect(res.errors).toContain(
        'Cart is empty. Please add items before proceeding to checkout.',
      );
    });

    it('calculates totals with 10% GST breakdown and standard freight shipping', async () => {
      cartService.getCart.mockResolvedValue({
        items: [
          {
            productId: 'prod-1',
            productTitle: 'Michelin Pilot Sport 4',
            productSku: 'TYRE-MIC-225-45-17',
            saleUnitName: 'Pair of 2',
            quantity: 1,
            unitPrice: 290.0,
            lineTotal: 290.0,
            isAvailable: true,
          },
        ],
        totals: { subtotal: 290.0 },
      });

      const res = await service.validateCheckout('sess-1', {
        shippingMethod: 'STANDARD_COURIER',
      });

      expect(res.isValid).toBe(true);
      expect(res.totals.subtotal).toBe(290.0);
      expect(res.totals.shippingFee).toBe(25.0);
      // 290.0 * 10 / 110 = 26.36
      expect(res.totals.taxAmount).toBe(26.36);
      // 290.0 + 25.0 = 315.0
      expect(res.totals.totalAmount).toBe(315.0);
    });
  });

  describe('createOrder', () => {
    it('rejects order initiation if cart has out-of-stock items', async () => {
      cartService.getCart.mockResolvedValue({
        items: [
          {
            productId: 'prod-out',
            isAvailable: false,
            stockAvailabilityMessage: 'Out of stock',
          },
        ],
        hasUnavailableItems: true,
      });

      await expect(
        service.createOrder('sess-1', {
          customerEmail: 'customer@example.com.au',
          customerPhone: '0412345678',
          customerFirstName: 'Bruce',
          customerLastName: 'Wayne',
          shippingMethod: 'CLICK_AND_COLLECT',
          shippingAddress: {
            firstName: 'Bruce',
            lastName: 'Wayne',
            line1: '10 Wayne Manor',
            city: 'Prestons',
            state: 'NSW',
            postalCode: '2170',
            country: 'AU',
            phone: '0412345678',
          },
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates Order with immutable snapshots and places 15-minute stock reservations', async () => {
      const mockCartItem = {
        id: 'cart-item-1',
        productId: 'prod-tyre-1',
        productTitle: 'Michelin Pilot Sport 4 225/45R17',
        productSku: 'TYRE-MIC-225-45-17',
        saleUnitConfigId: 'su-pair',
        saleUnitName: 'Pair of 2 Tyres',
        saleUnitMultiplier: 2,
        quantity: 1,
        totalPhysicalUnits: 2,
        unitPrice: 290.0,
        lineTotal: 290.0,
        isAvailable: true,
        serializedItemId: null,
      };

      cartService.getCart.mockResolvedValue({
        id: 'cart-123',
        items: [mockCartItem],
        hasUnavailableItems: false,
      });

      const mockCreatedOrder = {
        id: 'order-uuid-1',
        orderNumber: 'PIN-2026-888888',
        customerId: 'cust-1',
        customerEmail: 'bruce@wayne.com.au',
        customerPhone: '0412345678',
        orderStatus: 'PENDING_PAYMENT',
        paymentStatus: 'UNPAID',
        fulfillmentStatus: 'UNFULFILLED',
        subtotal: 290.0,
        discountAmount: 0,
        shippingFee: 0,
        taxAmount: 26.36,
        totalAmount: 290.0,
        currency: 'AUD',
        shippingAddress: {
          firstName: 'Bruce',
          lastName: 'Wayne',
          line1: '42 Jedda Road',
          city: 'Prestons',
          state: 'NSW',
          postalCode: '2170',
          country: 'AU',
          phone: '0412345678',
        },
        billingAddress: {
          firstName: 'Bruce',
          lastName: 'Wayne',
          line1: '42 Jedda Road',
          city: 'Prestons',
          state: 'NSW',
          postalCode: '2170',
          country: 'AU',
          phone: '0412345678',
        },
        items: [],
        stockReservations: [
          {
            id: 'res-1',
            status: 'ACTIVE',
            expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.order.create.mockResolvedValue(mockCreatedOrder);
      prisma.order.findUnique.mockResolvedValue(mockCreatedOrder);

      const order = await service.createOrder(
        'sess-1',
        {
          customerEmail: 'bruce@wayne.com.au',
          customerPhone: '0412345678',
          customerFirstName: 'Bruce',
          customerLastName: 'Wayne',
          shippingMethod: 'CLICK_AND_COLLECT',
          shippingAddress: {
            firstName: 'Bruce',
            lastName: 'Wayne',
            line1: '10 Wayne Manor',
            city: 'Prestons',
            state: 'NSW',
            postalCode: '2170',
            country: 'AU',
            phone: '0412345678',
          },
        },
        'cust-1',
      );

      // Verify order creation
      expect(order.orderNumber).toBe('PIN-2026-888888');
      expect(order.subtotal).toBe(290.0);
      expect(order.totalAmount).toBe(290.0);
      expect(order.orderStatus).toBe('PENDING_PAYMENT');
      expect(order.paymentStatus).toBe('UNPAID');

      // Verify immutable snapshots were passed to OrderItem creation
      expect(prisma.orderItem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          skuSnapshot: 'TYRE-MIC-225-45-17',
          titleSnapshot: 'Michelin Pilot Sport 4 225/45R17',
          saleUnitNameSnapshot: 'Pair of 2 Tyres',
          baseQuantityMultiplierSnapshot: 2,
          quantity: 1,
          baseUnitsConsumed: 2,
          unitPrice: 290.0,
          totalPrice: 290.0,
        }),
      });

      // Verify 15-min inventory reservation
      expect(inventoryService.reserveStock).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: mockCreatedOrder.id,
          productId: 'prod-tyre-1',
          quantity: 1,
        }),
        'cust-1',
      );

      // Verify cart was cleared
      expect(cartService.clearCart).toHaveBeenCalledWith('cart-123');
    });
  });
});
