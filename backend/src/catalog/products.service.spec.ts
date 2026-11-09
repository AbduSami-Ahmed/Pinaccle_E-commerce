import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { SkuService } from './sku.service';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../common/cache/cache.service';
import { AuthenticatedUser } from '@pinnacle/contracts';
import { Prisma } from '@prisma/client';

describe('ProductsService (Phase 5 Catalog)', () => {
  let service: ProductsService;
  let mockPrisma: any;
  let mockSkuService: {
    validateSkuFormat: jest.Mock;
    ensureSkuUnique: jest.Mock;
    generateUniqueSku: jest.Mock;
  };

  const staffUser: AuthenticatedUser = {
    sub: 'staff-uuid-1',
    email: 'staff@pinnacle.test',
    isStaff: true,
    permissions: [
      'catalog:product:view',
      'catalog:product:view_draft',
      'catalog:product:create',
      'catalog:product:update',
      'catalog:product:publish',
      'catalog:product:delete',
    ],
  };

  const customerUser: AuthenticatedUser = {
    sub: 'cust-uuid-1',
    email: 'customer@test.com',
    isStaff: false,
    permissions: ['catalog:product:view'],
  };

  beforeEach(async () => {
    mockPrisma = {
      category: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      product: {
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      tyreSpecification: {
        create: jest.fn(),
        upsert: jest.fn(),
      },
      seatBeltSpecification: {
        create: jest.fn(),
        upsert: jest.fn(),
      },
      productMedia: {
        createMany: jest.fn(),
        deleteMany: jest.fn(),
      },
      saleUnitConfig: {
        createMany: jest.fn(),
        deleteMany: jest.fn(),
      },
      $transaction: jest.fn((cb) => cb(mockPrisma)),
    };

    mockSkuService = {
      validateSkuFormat: jest.fn(),
      ensureSkuUnique: jest.fn(),
      generateUniqueSku: jest.fn().mockResolvedValue('TYR-MICH-2254517-A1B2'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        CacheService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: SkuService,
          useValue: mockSkuService,
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  describe('Category Specification Validation & Invariant Enforcement', () => {
    it('rejects tyre product creation when tyreSpecification is missing', async () => {
      mockPrisma.category.findUnique.mockResolvedValue({
        id: 'cat-tyres-id',
        slug: 'tyres',
        name: 'Tyres',
      });

      await expect(
        service.create({
          categoryId: 'cat-tyres-id',
          title: 'Michelin Pilot Sport 5',
          brand: 'Michelin',
          description: 'High performance summer tyre',
          productType: 'BULK_QUANTITY',
          // tyreSpecification is intentionally omitted
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects tyre product creation if seatBeltSpecification is mistakenly provided', async () => {
      mockPrisma.category.findUnique.mockResolvedValue({
        id: 'cat-tyres-id',
        slug: 'tyres',
        name: 'Tyres',
      });

      await expect(
        service.create({
          categoryId: 'cat-tyres-id',
          title: 'Michelin Pilot Sport 5',
          brand: 'Michelin',
          description: 'High performance summer tyre',
          productType: 'BULK_QUANTITY',
          tyreSpecification: {
            sectionWidth: 225,
            aspectRatio: 45,
            rimDiameter: 17,
            loadIndex: 94,
            speedRating: 'Y',
            season: 'SUMMER',
            terrainType: 'PERFORMANCE',
            runFlat: false,
            extraLoad: true,
          },
          seatBeltSpecification: {
            position: 'FRONT_LEFT_DRIVER',
            componentType: 'RETRACTOR_ASSEMBLY',
            pretensionerType: 'PYROTECHNIC',
            webbingColor: 'Black',
            mountingPoints: 3,
          },
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects seat belt product creation when seatBeltSpecification is missing', async () => {
      mockPrisma.category.findUnique.mockResolvedValue({
        id: 'cat-seat-belts-id',
        slug: 'seat-belts',
        name: 'Seat Belts',
      });

      await expect(
        service.create({
          categoryId: 'cat-seat-belts-id',
          title: 'Toyota RAV4 Seat Belt',
          brand: 'Toyota',
          description: 'Front driver retractor',
          productType: 'INDIVIDUALLY_SERIALIZED',
          // seatBeltSpecification omitted
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Product Creation & Physical Decoupling', () => {
    it('creates catalogue product without creating any inventory records or balances', async () => {
      mockPrisma.category.findUnique.mockResolvedValue({
        id: 'cat-tyres-id',
        slug: 'tyres',
        name: 'Tyres',
      });

      const mockCreatedProduct = {
        id: 'prod-new-1',
        categoryId: 'cat-tyres-id',
        sku: 'TYR-MICH-2254517-A1B2',
        title: 'Michelin Pilot Sport 5 225/45 R17',
        slug: 'michelin-pilot-sport-5-225-45-r17',
        brand: 'Michelin',
        oemPartNumber: 'MICH-9921',
        description: 'Sport tyre',
        productType: 'BULK_QUANTITY',
        status: 'DRAFT',
        createdAt: new Date(),
        updatedAt: new Date(),
        category: { id: 'cat-tyres-id', name: 'Tyres', slug: 'tyres' },
        media: [],
        saleUnits: [
          {
            id: 'su-1',
            code: 'TYRE_SINGLE',
            name: 'Single Tyre',
            baseQuantityMultiplier: 1,
            retailPrice: new Prisma.Decimal('165.00'),
            compareAtPrice: null,
            isDefault: true,
            isActive: true,
          },
        ],
        tyreSpecification: {
          id: 'ts-1',
          productId: 'prod-new-1',
          sectionWidth: 225,
          aspectRatio: 45,
          rimDiameter: 17,
          loadIndex: 94,
          speedRating: 'Y',
          season: 'SUMMER',
          terrainType: 'PERFORMANCE',
          runFlat: false,
          extraLoad: true,
          fuelEfficiencyClass: 'C',
          wetGripClass: 'A',
          noiseDb: 70,
        },
        seatBeltSpecification: null,
      };

      mockPrisma.product.create.mockResolvedValue(mockCreatedProduct);
      mockPrisma.product.findUniqueOrThrow.mockResolvedValue(mockCreatedProduct);

      const result = await service.create({
        categoryId: 'cat-tyres-id',
        title: 'Michelin Pilot Sport 5 225/45 R17',
        brand: 'Michelin',
        oemPartNumber: 'MICH-9921',
        description: 'Sport tyre',
        productType: 'BULK_QUANTITY',
        tyreSpecification: {
          sectionWidth: 225,
          aspectRatio: 45,
          rimDiameter: 17,
          loadIndex: 94,
          speedRating: 'Y',
          season: 'SUMMER',
          terrainType: 'PERFORMANCE',
          runFlat: false,
          extraLoad: true,
          fuelEfficiencyClass: 'C',
          wetGripClass: 'A',
          noiseDb: 70,
        },
        saleUnits: [
          {
            code: 'TYRE_SINGLE',
            name: 'Single Tyre',
            baseQuantityMultiplier: 1,
            retailPrice: '165.00',
            isDefault: true,
            isActive: true,
          },
        ],
      });

      expect(result.sku).toBe('TYR-MICH-2254517-A1B2');
      expect(result.tyreSpecification?.sectionWidth).toBe(225);
      expect(result.saleUnits[0]?.retailPrice).toBe('165');

      // CRITICAL ARCHITECTURAL ASSERTION: No inventory records or balances were created!
      expect(mockPrisma.inventoryItem).toBeUndefined();
      expect(mockPrisma.serializedInventoryItem).toBeUndefined();
      expect(mockPrisma.inventoryMovement).toBeUndefined();
    });
  });

  describe('Server-Side Listing, Filtering & Access Boundary', () => {
    it('restricts unauthenticated/customer queries strictly to published products', async () => {
      mockPrisma.product.count.mockResolvedValue(1);
      mockPrisma.product.findMany.mockResolvedValue([
        {
          id: 'prod-pub-1',
          sku: 'TYR-PUB-01',
          title: 'Published Tyre',
          slug: 'published-tyre',
          brand: 'Pirelli',
          productType: 'BULK_QUANTITY',
          status: 'PUBLISHED',
          createdAt: new Date(),
          updatedAt: new Date(),
          category: { name: 'Tyres', slug: 'tyres' },
          media: [],
          saleUnits: [{ retailPrice: new Prisma.Decimal('120.00') }],
        },
      ]);

      const res = await service.findAll({ page: 1, pageSize: 10 }, customerUser);

      expect(res.data).toHaveLength(1);
      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'PUBLISHED' },
        }),
      );
    });

    it('allows staff with view_draft permission to query draft and archived products', async () => {
      mockPrisma.product.count.mockResolvedValue(1);
      mockPrisma.product.findMany.mockResolvedValue([
        {
          id: 'prod-draft-1',
          sku: 'TYR-DFT-01',
          title: 'Draft Tyre',
          slug: 'draft-tyre',
          brand: 'Goodyear',
          productType: 'BULK_QUANTITY',
          status: 'DRAFT',
          createdAt: new Date(),
          updatedAt: new Date(),
          category: { name: 'Tyres', slug: 'tyres' },
          media: [],
          saleUnits: [{ retailPrice: new Prisma.Decimal('110.00') }],
        },
      ]);

      const res = await service.findAll({ status: 'DRAFT' }, staffUser);

      expect(res.data).toHaveLength(1);
      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'DRAFT' },
        }),
      );
    });
  });

  describe('Status Transitions & Publishing Prerequisites', () => {
    it('rejects publishing a product if all active sale units have 0.00 retail price', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        id: 'prod-draft-1',
        category: { slug: 'tyres' },
        tyreSpecification: { id: 'ts-1' },
        saleUnits: [
          {
            code: 'UNIT',
            isActive: true,
            retailPrice: new Prisma.Decimal('0.00'),
          },
        ],
      });

      await expect(service.updateStatus('prod-draft-1', { status: 'PUBLISHED' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('publishes successfully when all domain prerequisites are met', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        id: 'prod-draft-1',
        category: { slug: 'tyres' },
        tyreSpecification: { id: 'ts-1' },
        saleUnits: [
          {
            code: 'TYRE_SINGLE',
            isActive: true,
            retailPrice: new Prisma.Decimal('150.00'),
          },
        ],
      });

      mockPrisma.product.update.mockResolvedValue({
        id: 'prod-draft-1',
        categoryId: 'cat-1',
        sku: 'TYR-123',
        title: 'Ready Tyre',
        slug: 'ready-tyre',
        brand: 'Michelin',
        description: 'Ready',
        productType: 'BULK_QUANTITY',
        status: 'PUBLISHED',
        createdAt: new Date(),
        updatedAt: new Date(),
        category: { id: 'cat-1', name: 'Tyres', slug: 'tyres' },
        media: [],
        saleUnits: [
          {
            id: 'su-1',
            code: 'TYRE_SINGLE',
            name: 'Single',
            baseQuantityMultiplier: 1,
            retailPrice: new Prisma.Decimal('150.00'),
            compareAtPrice: null,
            isDefault: true,
            isActive: true,
          },
        ],
        tyreSpecification: {
          id: 'ts-1',
          productId: 'prod-draft-1',
          sectionWidth: 225,
          aspectRatio: 45,
          rimDiameter: 17,
          loadIndex: 94,
          speedRating: 'Y',
          season: 'SUMMER',
          terrainType: 'PERFORMANCE',
          runFlat: false,
          extraLoad: true,
        },
        seatBeltSpecification: null,
      });

      const updated = await service.updateStatus('prod-draft-1', { status: 'PUBLISHED' });
      expect(updated.status).toBe('PUBLISHED');
    });
  });

  describe('Safe Product Deletion & Archiving Policy', () => {
    it('archives rather than deletes product when historical order items exist', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        id: 'prod-historic-1',
        title: 'Historic Michelin Tyre',
        sku: 'TYR-HIST-01',
        orderItems: [{ id: 'order-item-1' }, { id: 'order-item-2' }],
      });

      mockPrisma.product.update.mockResolvedValue({
        id: 'prod-historic-1',
        status: 'ARCHIVED',
      });

      const res = await service.remove('prod-historic-1');

      expect(res.archived).toBe(true);
      expect(mockPrisma.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-historic-1' },
        data: { status: 'ARCHIVED' },
      });
      expect(mockPrisma.product.delete).not.toHaveBeenCalled();
    });

    it('permanently deletes product when zero historical orders exist', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        id: 'prod-clean-1',
        title: 'Unpurchased Test Product',
        sku: 'TYR-TEST-01',
        orderItems: [],
      });

      mockPrisma.product.delete.mockResolvedValue({ id: 'prod-clean-1' });

      const res = await service.remove('prod-clean-1');

      expect(res.archived).toBe(false);
      expect(mockPrisma.product.delete).toHaveBeenCalledWith({
        where: { id: 'prod-clean-1' },
      });
    });
  });
});
