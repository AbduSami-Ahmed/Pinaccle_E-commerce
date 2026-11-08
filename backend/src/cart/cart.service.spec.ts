import { Test, TestingModule } from '@nestjs/testing';
import { CartService } from './cart.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

describe('CartService', () => {
  let service: CartService;
  let prisma: {
    cart: {
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    cartItem: {
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      deleteMany: jest.Mock;
    };
    product: {
      findUnique: jest.Mock;
    };
    serializedInventoryItem: {
      findUnique: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      cart: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      cartItem: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
      product: {
        findUnique: jest.fn(),
      },
      serializedInventoryItem: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [CartService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<CartService>(CartService);
  });

  describe('getCart', () => {
    it('recalculates prices and inventory strictly on the server', async () => {
      const now = new Date();
      const mockCart = {
        id: 'cart-1',
        sessionToken: 'sess-abc',
        customerId: 'cust-1',
        currency: 'NZD',
        expiresAt: new Date(Date.now() + 100000),
        updatedAt: now,
        items: [
          {
            id: 'item-1',
            cartId: 'cart-1',
            productId: 'prod-tyre-1',
            saleUnitConfigId: 'su-pair',
            serializedItemId: null,
            quantity: 2,
            unitPrice: 200, // Stored in DB
            createdAt: now,
            product: {
              id: 'prod-tyre-1',
              title: 'Michelin Pilot Sport 4',
              slug: 'michelin-pilot-sport-4',
              sku: 'TYRE-MIC-225-45-17',
              brand: 'Michelin',
              status: 'PUBLISHED',
              media: [{ cdnUrl: 'https://cdn.example.com/tyre.jpg' }],
              category: { slug: 'tyres' },
              inventoryItems: [
                { quantityOnHand: 20, quantityReserved: 4 }, // Sellable base = 16
              ],
            },
            saleUnit: {
              id: 'su-pair',
              name: 'Pair of 2',
              baseQuantityMultiplier: 2,
              retailPrice: 290.0,
            },
            serializedItem: null,
          },
        ],
      };

      prisma.cart.findFirst.mockResolvedValue(mockCart);
      prisma.cart.findUnique.mockResolvedValue(mockCart);

      const cartDto = await service.getCart('sess-abc', 'cust-1');

      expect(cartDto.items).toHaveLength(1);
      const item = cartDto.items[0]!;
      expect(item.unitPrice).toBe(290.0);
      expect(item.lineTotal).toBe(580.0); // 290.0 * 2 packs
      expect(item.totalPhysicalUnits).toBe(4); // 2 packs * 2 multiplier
      expect(item.isAvailable).toBe(true);
      expect(item.maxAvailableQuantity).toBe(8); // floor(16 sellable / 2)
      expect(cartDto.totals.subtotal).toBe(580.0);
      expect(cartDto.totals.taxIncluded).toBe(75.65); // 580 * 15 / 115
    });
  });

  describe('addItem', () => {
    it('rejects adding inactive product', async () => {
      prisma.cart.findUnique.mockResolvedValue({
        id: 'cart-1',
        sessionToken: 'sess-1',
        expiresAt: new Date(Date.now() + 100000),
      });

      prisma.product.findUnique.mockResolvedValue({
        id: 'prod-1',
        status: 'ARCHIVED',
      });

      await expect(
        service.addItem('sess-1', {
          productId: 'prod-1',
          saleUnitConfigId: 'su-1',
          quantity: 1,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects adding quantity that exceeds sellable physical stock', async () => {
      prisma.cart.findUnique.mockResolvedValue({
        id: 'cart-1',
        sessionToken: 'sess-1',
        expiresAt: new Date(Date.now() + 100000),
      });

      prisma.product.findUnique.mockResolvedValue({
        id: 'prod-1',
        status: 'PUBLISHED',
        saleUnits: [{ id: 'su-set', baseQuantityMultiplier: 4, retailPrice: 100, isActive: true }],
        inventoryItems: [{ quantityOnHand: 6, quantityReserved: 0 }], // 6 base units = 1 set max
      });

      prisma.cartItem.findFirst.mockResolvedValue(null);

      // Attempt to add 2 sets (requires 8 base units, only 6 available)
      await expect(
        service.addItem('sess-1', {
          productId: 'prod-1',
          saleUnitConfigId: 'su-set',
          quantity: 2,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects adding serialized part with quantity > 1', async () => {
      prisma.cart.findUnique.mockResolvedValue({
        id: 'cart-1',
        sessionToken: 'sess-1',
        expiresAt: new Date(Date.now() + 100000),
      });

      prisma.product.findUnique.mockResolvedValue({
        id: 'prod-sb-1',
        status: 'PUBLISHED',
        saleUnits: [{ id: 'su-1', baseQuantityMultiplier: 1, retailPrice: 150, isActive: true }],
        inventoryItems: [],
      });

      await expect(
        service.addItem('sess-1', {
          productId: 'prod-sb-1',
          saleUnitConfigId: 'su-1',
          quantity: 2,
          serializedItemId: 'ser-1',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('ownership checks', () => {
    it('throws ForbiddenException when updating cart item of another customer', async () => {
      prisma.cartItem.findUnique.mockResolvedValue({
        id: 'item-99',
        cartId: 'cart-OTHER',
        cart: {
          id: 'cart-OTHER',
          customerId: 'cust-OTHER',
          sessionToken: 'sess-other',
        },
      });

      await expect(
        service.updateItemQuantity('sess-attacker', 'item-99', 3, 'cust-attacker'),
      ).rejects.toThrow(ForbiddenException);

      expect(prisma.cartItem.update).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when removing cart item of another customer', async () => {
      prisma.cartItem.findUnique.mockResolvedValue({
        id: 'item-99',
        cartId: 'cart-OTHER',
        cart: {
          id: 'cart-OTHER',
          customerId: 'cust-OTHER',
          sessionToken: 'sess-other',
        },
      });

      await expect(service.removeItem('sess-attacker', 'item-99', 'cust-attacker')).rejects.toThrow(
        ForbiddenException,
      );

      expect(prisma.cartItem.delete).not.toHaveBeenCalled();
    });
  });
});
