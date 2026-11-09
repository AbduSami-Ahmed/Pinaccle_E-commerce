import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../common/cache/cache.service';
import { AuthenticatedUser } from '@pinnacle/contracts';
import { Prisma } from '@prisma/client';

describe('InventoryService (Phase 6 - Auditable Ledger & Concurrency)', () => {
  let service: InventoryService;
  let mockPrisma: any;

  const staffLeadUser: AuthenticatedUser = {
    sub: 'staff-lead-uuid',
    email: 'lead@pinnacle.test',
    isStaff: true,
    permissions: [
      'inventory:stock:view_quantity',
      'inventory:stock:view_cost_price',
      'inventory:stock:inward_bulk',
      'inventory:stock:serialize_item',
      'inventory:stock:adjust',
      'inventory:stock:update_location',
    ],
  };

  const staffClerkUser: AuthenticatedUser = {
    sub: 'clerk-uuid',
    email: 'clerk@pinnacle.test',
    isStaff: true,
    permissions: [
      'inventory:stock:view_quantity',
      // No view_cost_price
    ],
  };

  beforeEach(async () => {
    mockPrisma = {
      product: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      warehouse: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      inventoryItem: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
      },
      serializedInventoryItem: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      inventoryMovement: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      saleUnitConfig: {
        findUnique: jest.fn(),
      },
      stockReservation: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn((cb) => cb(mockPrisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        CacheService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
  });

  // =========================================================================
  // 1. Inward Stock & Ledger Invariants
  // =========================================================================
  describe('Inward Stock & Immutable Movement Ledger', () => {
    it('receives bulk stock and records a RECEIPT movement in the atomic ledger', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({ id: 'prod-tyre-1' });
      mockPrisma.warehouse.findUnique.mockResolvedValue({
        id: 'wh-syd',
        code: 'SYD-CENTRAL',
        name: 'Sydney Central Warehouse',
      });

      mockPrisma.inventoryItem.findUnique.mockResolvedValue({
        id: 'item-1',
        quantityOnHand: 20,
      });

      mockPrisma.inventoryItem.upsert.mockResolvedValue({
        id: 'item-1',
        productId: 'prod-tyre-1',
        warehouseId: 'wh-syd',
        locationBin: 'RACK-A1',
        quantityOnHand: 30, // 20 + 10
        quantityReserved: 0,
        costPrice: new Prisma.Decimal('95.00'),
        createdAt: new Date(),
        updatedAt: new Date(),
        warehouse: { code: 'SYD-CENTRAL', name: 'Sydney Central Warehouse' },
      });

      const res = await service.receiveBulkStock(
        {
          productId: 'prod-tyre-1',
          warehouseId: 'wh-syd',
          locationBin: 'RACK-A1',
          quantity: 10,
          costPrice: '95.00',
          referencePo: 'PO-2026-991',
        },
        staffLeadUser.sub,
      );

      expect(res.quantityOnHand).toBe(30);
      expect(mockPrisma.inventoryMovement.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          inventoryItemId: 'item-1',
          movementType: 'RECEIPT',
          quantityChange: 10,
          previousQuantity: 20,
          newQuantity: 30,
          operatorId: staffLeadUser.sub,
          referenceOrderId: 'PO-2026-991',
        }),
      });
    });

    it('receives serialized seat belt with condition grade and inspection photos', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({ id: 'prod-sblt-1' });
      mockPrisma.warehouse.findUnique.mockResolvedValue({
        id: 'wh-syd',
        code: 'SYD-CENTRAL',
        name: 'Sydney Central Warehouse',
      });

      mockPrisma.serializedInventoryItem.findUnique.mockResolvedValue(null); // No barcode collision

      mockPrisma.serializedInventoryItem.create.mockResolvedValue({
        id: 'serial-1',
        productId: 'prod-sblt-1',
        warehouseId: 'wh-syd',
        stockBarcode: 'BC-SBLT-001',
        donorVehicleVin: 'JT3HP10V277192831',
        conditionGrade: 'GRADE_A_LIKE_NEW',
        conditionNotes: 'Tested 2.15 ohms squib resistance, no fraying',
        pretensionerResistanceOhms: new Prisma.Decimal('2.15'),
        actualPhotos: ['https://s3.example.com/photos/belt1.jpg'],
        locationBin: 'BIN-S12',
        costPrice: new Prisma.Decimal('50.00'),
        status: 'AVAILABLE',
        createdAt: new Date(),
        updatedAt: new Date(),
        warehouse: { code: 'SYD-CENTRAL', name: 'Sydney Central Warehouse' },
      });

      const res = await service.receiveSerializedPart(
        {
          productId: 'prod-sblt-1',
          warehouseId: 'wh-syd',
          stockBarcode: 'BC-SBLT-001',
          donorVehicleVin: 'JT3HP10V277192831',
          conditionGrade: 'GRADE_A_LIKE_NEW',
          conditionNotes: 'Tested 2.15 ohms squib resistance, no fraying',
          pretensionerResistanceOhms: '2.15',
          actualPhotos: ['https://s3.example.com/photos/belt1.jpg'],
          locationBin: 'BIN-S12',
          costPrice: '50.00',
        },
        staffLeadUser.sub,
      );

      expect(res.stockBarcode).toBe('BC-SBLT-001');
      expect(res.conditionGrade).toBe('GRADE_A_LIKE_NEW');
      expect(mockPrisma.inventoryMovement.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          serializedItemId: 'serial-1',
          movementType: 'RECEIPT',
          quantityChange: 1,
          previousQuantity: 0,
          newQuantity: 1,
          operatorId: staffLeadUser.sub,
        }),
      });
    });
  });

  // =========================================================================
  // 2. Pair / Set Multiplier Arithmetic & Sellable Quantities
  // =========================================================================
  describe('Sale Unit Multiplier & Sellable Quantities', () => {
    it('reserves 2 base units when reserving a Pair of tyres', async () => {
      mockPrisma.saleUnitConfig.findUnique.mockResolvedValue({
        id: 'su-pair',
        code: 'TYRE_PAIR',
        name: 'Axle Pair (2x)',
        baseQuantityMultiplier: 2, // Pair consumes 2 base tyres!
      });

      mockPrisma.inventoryItem.findMany.mockResolvedValue([
        {
          id: 'item-bulk-1',
          quantityOnHand: 10,
          quantityReserved: 0, // 10 available
        },
      ]);

      mockPrisma.stockReservation.create.mockResolvedValue({
        id: 'res-1',
        reservedQuantity: 2,
      });

      const res = await service.reserveStock(
        {
          cartItemId: 'cart-item-1',
          productId: 'prod-tyre-1',
          saleUnitConfigId: 'su-pair',
          quantity: 1, // 1 Pair requested
        },
        'customer-session',
      );

      expect(res.reservedBaseQuantity).toBe(2);
      expect(mockPrisma.inventoryItem.update).toHaveBeenCalledWith({
        where: { id: 'item-bulk-1' },
        data: {
          quantityReserved: { increment: 2 },
        },
      });
    });

    it('reserves 8 base units when reserving 2 Sets of 4 tyres', async () => {
      mockPrisma.saleUnitConfig.findUnique.mockResolvedValue({
        id: 'su-set',
        code: 'TYRE_SET_OF_4',
        name: 'Set of 4 (4x)',
        baseQuantityMultiplier: 4,
      });

      mockPrisma.inventoryItem.findMany.mockResolvedValue([
        {
          id: 'item-bulk-1',
          quantityOnHand: 20,
          quantityReserved: 4, // 16 available
        },
      ]);

      mockPrisma.stockReservation.create.mockResolvedValue({
        id: 'res-2',
        reservedQuantity: 8,
      });

      const res = await service.reserveStock(
        {
          cartItemId: 'cart-item-2',
          productId: 'prod-tyre-1',
          saleUnitConfigId: 'su-set',
          quantity: 2, // 2 Sets requested = 8 base tyres!
        },
        'customer-session',
      );

      expect(res.reservedBaseQuantity).toBe(8);
      expect(mockPrisma.inventoryItem.update).toHaveBeenCalledWith({
        where: { id: 'item-bulk-1' },
        data: {
          quantityReserved: { increment: 8 },
        },
      });
    });
  });

  // =========================================================================
  // 3. Concurrency Protection & Race-Condition Overselling Prevention
  // =========================================================================
  describe('Concurrency & Race-Condition Protection', () => {
    it('blocks overselling when stock is insufficient for the requested quantity', async () => {
      mockPrisma.saleUnitConfig.findUnique.mockResolvedValue({
        id: 'su-single',
        code: 'TYRE_SINGLE',
        name: 'Single Tyre',
        baseQuantityMultiplier: 1,
      });

      // Item has 1 unit on hand, but already 1 reserved: 0 available!
      mockPrisma.inventoryItem.findMany.mockResolvedValue([
        {
          id: 'item-exhausted',
          quantityOnHand: 1,
          quantityReserved: 1,
        },
      ]);

      await expect(
        service.reserveStock(
          {
            cartItemId: 'cart-item-racer',
            productId: 'prod-tyre-1',
            saleUnitConfigId: 'su-single',
            quantity: 1,
          },
          'racer-session',
        ),
      ).rejects.toThrow(ConflictException);

      expect(mockPrisma.inventoryItem.update).not.toHaveBeenCalled();
    });

    it('blocks reservation of a serialized part that is already reserved or sold', async () => {
      mockPrisma.saleUnitConfig.findUnique.mockResolvedValue({
        id: 'su-unit',
        baseQuantityMultiplier: 1,
      });

      mockPrisma.serializedInventoryItem.findUnique.mockResolvedValue({
        id: 'serial-taken',
        stockBarcode: 'BC-TAKEN-01',
        status: 'RESERVED', // Already reserved by another shopper
      });

      await expect(
        service.reserveStock(
          {
            cartItemId: 'cart-item-racer',
            productId: 'prod-sblt-1',
            saleUnitConfigId: 'su-unit',
            serializedItemId: 'serial-taken',
            quantity: 1,
          },
          'racer-session',
        ),
      ).rejects.toThrow(ConflictException);

      expect(mockPrisma.serializedInventoryItem.update).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 4. Negative Stock Prevention
  // =========================================================================
  describe('Negative Stock Prevention', () => {
    it('rejects downward adjustment that would cause on-hand stock to become negative', async () => {
      mockPrisma.inventoryItem.findUnique.mockResolvedValue({
        id: 'item-1',
        quantityOnHand: 5,
        quantityReserved: 0,
      });

      await expect(
        service.adjustStock(
          {
            inventoryItemId: 'item-1',
            quantityChange: -10, // Attempting to deduct 10 from 5
            reasonCode: 'DAMAGED_WRITE_OFF',
          },
          staffLeadUser.sub,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(mockPrisma.inventoryItem.update).not.toHaveBeenCalled();
    });

    it('rejects downward adjustment that would drop on-hand below active reservations', async () => {
      mockPrisma.inventoryItem.findUnique.mockResolvedValue({
        id: 'item-1',
        quantityOnHand: 10,
        quantityReserved: 8, // 8 reserved by checkout holds
      });

      await expect(
        service.adjustStock(
          {
            inventoryItemId: 'item-1',
            quantityChange: -5, // New on-hand would be 5, but 8 are reserved!
            reasonCode: 'AUDIT_CORRECTION',
          },
          staffLeadUser.sub,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(mockPrisma.inventoryItem.update).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 5. Reservation Release & Commit
  // =========================================================================
  describe('Reservation Release & Commit Lifecycles', () => {
    it('releases reservation, returning quantity to available and writing RELEASE movement', async () => {
      mockPrisma.stockReservation.findUnique.mockResolvedValue({
        id: 'res-active',
        inventoryItemId: 'item-1',
        reservedQuantity: 4,
        status: 'ACTIVE',
      });

      mockPrisma.stockReservation.update.mockResolvedValue({
        id: 'res-active',
        status: 'RELEASED',
      });

      const res = await service.releaseStockReservation(
        'res-active',
        'system-cron',
        'CART_TIMEOUT',
      );

      expect(res.success).toBe(true);
      expect(mockPrisma.inventoryItem.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: {
          quantityReserved: { decrement: 4 },
        },
      });

      expect(mockPrisma.inventoryMovement.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          inventoryItemId: 'item-1',
          movementType: 'RESERVATION_RELEASE',
          reasonCode: 'CART_TIMEOUT',
        }),
      });
    });

    it('commits reservation to completed order, deducting on-hand stock and writing SALE_DEDUCTION', async () => {
      mockPrisma.stockReservation.findUnique.mockResolvedValue({
        id: 'res-to-commit',
        inventoryItemId: 'item-1',
        reservedQuantity: 2,
        status: 'ACTIVE',
      });

      mockPrisma.inventoryItem.findUniqueOrThrow.mockResolvedValue({
        id: 'item-1',
        quantityOnHand: 10,
        quantityReserved: 2,
      });

      mockPrisma.stockReservation.update.mockResolvedValue({
        id: 'res-to-commit',
        status: 'CONVERTED_TO_ORDER',
      });

      const res = await service.commitStockReservation(
        'res-to-commit',
        'PIN-2026-9001',
        staffLeadUser.sub,
      );

      expect(res.success).toBe(true);
      expect(mockPrisma.inventoryItem.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: {
          quantityOnHand: 8, // 10 - 2
          quantityReserved: 0, // 2 - 2
        },
      });

      expect(mockPrisma.inventoryMovement.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          inventoryItemId: 'item-1',
          movementType: 'SALE_DEDUCTION',
          quantityChange: -2,
          referenceOrderId: 'PIN-2026-9001',
        }),
      });
    });
  });

  // =========================================================================
  // 6. Balance Reconciliation & Audit Ledger Integrity
  // =========================================================================
  describe('Balance Reconciliation Against Movement Ledger', () => {
    it('verifies that inventoryItem onHand perfectly matches the sum of historical movements', async () => {
      mockPrisma.inventoryItem.findUnique.mockResolvedValue({
        id: 'item-audited',
        productId: 'prod-tyre-1',
        quantityOnHand: 28,
        locationBin: 'RACK-B2',
        warehouse: { code: 'SYD-CENTRAL' },
        movements: [
          { movementType: 'RECEIPT', quantityChange: 40 }, // +40
          { movementType: 'SALE_DEDUCTION', quantityChange: -10 }, // -10 (balance: 30)
          { movementType: 'MANUAL_ADJUSTMENT', quantityChange: -2 }, // -2 (balance: 28)
          { movementType: 'RESERVATION_HOLD', quantityChange: 0 }, // 0 (does not alter onHand)
          { movementType: 'RESERVATION_RELEASE', quantityChange: 0 }, // 0
        ],
      });

      const report = await service.reconcileItem('item-audited');

      expect(report.isReconciled).toBe(true);
      expect(report.computedOnHand).toBe(28);
      expect(report.actualOnHand).toBe(28);
      expect(report.discrepancy).toBe(0);
      expect(report.totalMovementsCount).toBe(5);
    });
  });

  // =========================================================================
  // 7. RBAC Cost Price Scrubbing
  // =========================================================================
  describe('RBAC Cost Price Scrubbing', () => {
    it('includes costPrice when user holds inventory:stock:view_cost_price', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        id: 'prod-tyre-1',
        sku: 'TYR-001',
        title: 'Tyre',
        brand: 'Michelin',
        productType: 'BULK_QUANTITY',
        category: { name: 'Tyres', slug: 'tyres' },
        saleUnits: [
          {
            code: 'UNIT',
            name: 'Unit',
            baseQuantityMultiplier: 1,
            retailPrice: new Prisma.Decimal('150.00'),
          },
        ],
        inventoryItems: [
          {
            id: 'item-1',
            productId: 'prod-tyre-1',
            warehouseId: 'wh-1',
            warehouse: { code: 'SYD-CENTRAL', name: 'Sydney' },
            locationBin: 'BIN-1',
            quantityOnHand: 10,
            quantityReserved: 0,
            costPrice: new Prisma.Decimal('90.00'),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        serializedItems: [],
      });

      const details = await service.getProductStockDetails('prod-tyre-1', staffLeadUser);
      expect(details.inventoryItems[0]?.costPrice).toBe('90');
    });

    it('scrubs costPrice when user lacks inventory:stock:view_cost_price', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        id: 'prod-tyre-1',
        sku: 'TYR-001',
        title: 'Tyre',
        brand: 'Michelin',
        productType: 'BULK_QUANTITY',
        category: { name: 'Tyres', slug: 'tyres' },
        saleUnits: [
          {
            code: 'UNIT',
            name: 'Unit',
            baseQuantityMultiplier: 1,
            retailPrice: new Prisma.Decimal('150.00'),
          },
        ],
        inventoryItems: [
          {
            id: 'item-1',
            productId: 'prod-tyre-1',
            warehouseId: 'wh-1',
            warehouse: { code: 'SYD-CENTRAL', name: 'Sydney' },
            locationBin: 'BIN-1',
            quantityOnHand: 10,
            quantityReserved: 0,
            costPrice: new Prisma.Decimal('90.00'),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        serializedItems: [],
      });

      const details = await service.getProductStockDetails('prod-tyre-1', staffClerkUser);
      expect(details.inventoryItems[0]?.costPrice).toBeUndefined();
    });
  });
});
