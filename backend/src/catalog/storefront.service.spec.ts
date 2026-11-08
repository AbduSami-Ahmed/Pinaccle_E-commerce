import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { StorefrontService } from './storefront.service';
import { PrismaService } from '../prisma/prisma.service';

describe('StorefrontService', () => {
  let service: StorefrontService;
  let prisma: {
    product: {
      count: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
    };
    vehicleMake: {
      findMany: jest.Mock;
    };
  };

  const mockProduct = {
    id: 'prod-tyre-1',
    sku: 'TYRE-MIC-225-45-17',
    title: 'Michelin Pilot Sport 4',
    slug: 'michelin-pilot-sport-4',
    brand: 'Michelin',
    description: 'High-performance summer tyre',
    productType: 'BULK_QUANTITY',
    status: 'PUBLISHED',
    category: { name: 'Tyres', slug: 'tyres' },
    media: [{ cdnUrl: 'https://cdn.example.com/tyre1.jpg', isPrimary: true, displayOrder: 0 }],
    saleUnits: [
      {
        code: 'TYRE_SINGLE',
        name: 'Single Tyre',
        baseQuantityMultiplier: 1,
        retailPrice: 145.0,
        isDefault: true,
        isActive: true,
      },
      {
        code: 'TYRE_PAIR',
        name: 'Pair of 2',
        baseQuantityMultiplier: 2,
        retailPrice: 280.0,
        isDefault: false,
        isActive: true,
      },
    ],
    tyreSpecification: {
      sectionWidth: 225,
      aspectRatio: 45,
      rimDiameter: 17,
      loadIndex: 94,
      speedRating: 'Y',
      season: 'SUMMER',
      terrainType: 'PERFORMANCE',
      runFlat: false,
    },
    seatBeltSpecification: null,
    fitments: [],
    inventoryItems: [{ quantityOnHand: 20, quantityReserved: 4 }],
    serializedItems: [],
  };

  const mockSeatBelt = {
    id: 'prod-sb-1',
    sku: 'SB-FORD-TRAN-FL',
    title: 'Ford Transit Custom Front Driver Seat Belt',
    slug: 'ford-transit-custom-front-driver-seat-belt',
    brand: 'Ford',
    description: 'Genuine OEM driver seat belt assembly',
    productType: 'INDIVIDUALLY_SERIALIZED',
    status: 'PUBLISHED',
    category: { name: 'Seat Belts', slug: 'seat-belts' },
    media: [{ cdnUrl: 'https://cdn.example.com/belt1.jpg', isPrimary: true, displayOrder: 0 }],
    saleUnits: [
      {
        code: 'SB_COMPLETE',
        name: 'Complete Unit',
        baseQuantityMultiplier: 1,
        retailPrice: 89.0,
        isDefault: true,
        isActive: true,
      },
    ],
    tyreSpecification: null,
    seatBeltSpecification: {
      position: 'FRONT_LEFT_DRIVER',
      componentType: 'RETRACTOR_ASSEMBLY',
      mountingPoints: 3,
      webbingColor: 'Black',
      oemReferenceTag: 'BK21-V611B08-AC',
    },
    fitments: [
      {
        verificationStatus: 'VERIFIED_OEM_DIRECT',
        vehicleChassis: {
          chassisCode: 'VN',
          generation: {
            yearStart: 2018,
            yearEnd: 2023,
            model: {
              name: 'Transit Custom',
              make: { name: 'Ford' },
            },
          },
        },
      },
    ],
    inventoryItems: [],
    serializedItems: [
      {
        stockBarcode: 'SB-2024-0891',
        conditionGrade: 'GRADE_A_LIKE_NEW',
        status: 'AVAILABLE',
      },
    ],
  };

  beforeEach(async () => {
    prisma = {
      product: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([mockProduct]),
        findFirst: jest.fn(),
      },
      vehicleMake: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [StorefrontService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<StorefrontService>(StorefrontService);
  });

  describe('search', () => {
    it('always restricts results to PUBLISHED products only', async () => {
      await service.search({});

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'PUBLISHED',
          }),
        }),
      );
    });

    it('searches by keyword across title, SKU, brand, and serialized barcode', async () => {
      await service.search({ search: 'Pilot Sport' });

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'PUBLISHED',
            OR: expect.arrayContaining([
              { title: { contains: 'Pilot Sport', mode: 'insensitive' } },
              { sku: { contains: 'Pilot Sport', mode: 'insensitive' } },
              { brand: { contains: 'Pilot Sport', mode: 'insensitive' } },
              {
                serializedItems: {
                  some: { stockBarcode: { contains: 'Pilot Sport', mode: 'insensitive' } },
                },
              },
            ]),
          }),
        }),
      );
    });

    it('filters by categorySlug', async () => {
      await service.search({ categorySlug: 'tyres' });

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            category: { slug: 'tyres' },
          }),
        }),
      );
    });

    it('filters by tyre specifications (width, profile, rim, speed rating)', async () => {
      await service.search({
        sectionWidth: 225,
        aspectRatio: 45,
        rimDiameter: 17,
        speedRating: 'Y',
      });

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tyreSpecification: {
              sectionWidth: 225,
              aspectRatio: 45,
              rimDiameter: 17,
              speedRating: { equals: 'Y', mode: 'insensitive' },
            },
          }),
        }),
      );
    });

    it('filters by seat belt position and component type', async () => {
      await service.search({
        position: 'FRONT_LEFT_DRIVER',
        componentType: 'RETRACTOR_ASSEMBLY',
      });

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            seatBeltSpecification: {
              position: 'FRONT_LEFT_DRIVER',
              componentType: 'RETRACTOR_ASSEMBLY',
            },
          }),
        }),
      );
    });

    it('filters by vehicle fitment make, model, and year', async () => {
      await service.search({
        make: 'ford',
        model: 'transit',
        year: 2020,
      });

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            fitments: {
              some: {
                vehicleChassis: {
                  AND: expect.arrayContaining([
                    expect.objectContaining({
                      generation: expect.objectContaining({
                        model: expect.objectContaining({
                          make: expect.any(Object),
                        }),
                      }),
                    }),
                  ]),
                },
              },
            },
          }),
        }),
      );
    });

    it('calculates sellable base units and stock availability badges correctly', async () => {
      prisma.product.findMany.mockResolvedValueOnce([mockProduct, mockSeatBelt]);
      prisma.product.count.mockResolvedValueOnce(2);

      const res = await service.search({});

      expect(res.data).toHaveLength(2);
      // Bulk tyre: 20 on hand - 4 reserved = 16 sellable base units
      expect(res.data[0]!.availability.sellableBaseUnits).toBe(16);
      expect(res.data[0]!.availability.inStock).toBe(true);
      expect(res.data[0]!.availability.isLowStock).toBe(false);
      expect(res.data[0]!.condition).toBe('NEW_SURPLUS');

      // Serialized seat belt: 1 available in stock
      expect(res.data[1]!.availability.sellableBaseUnits).toBe(1);
      expect(res.data[1]!.availability.inStock).toBe(true);
      expect(res.data[1]!.availability.isLowStock).toBe(true); // <= 5 is low stock
      expect(res.data[1]!.condition).toBe('GRADE_A_LIKE_NEW');
      expect(res.data[1]!.stockNumber).toBe('SB-2024-0891');
    });

    it('sorts by price asc and desc', async () => {
      prisma.product.findMany.mockResolvedValueOnce([mockProduct, mockSeatBelt]);
      prisma.product.count.mockResolvedValueOnce(2);

      const resAsc = await service.search({ sortBy: 'price_asc' });
      // Seat belt is 89.0, Tyre is 145.0
      expect(resAsc.data[0]!.id).toBe('prod-sb-1');
      expect(resAsc.data[1]!.id).toBe('prod-tyre-1');

      prisma.product.findMany.mockResolvedValueOnce([mockProduct, mockSeatBelt]);
      prisma.product.count.mockResolvedValueOnce(2);

      const resDesc = await service.search({ sortBy: 'price_desc' });
      expect(resDesc.data[0]!.id).toBe('prod-tyre-1');
      expect(resDesc.data[1]!.id).toBe('prod-sb-1');
    });

    it('computes correct pagination metadata', async () => {
      prisma.product.count.mockResolvedValueOnce(25);
      prisma.product.findMany.mockResolvedValueOnce([mockProduct]);

      const res = await service.search({ page: 2, pageSize: 10 });

      expect(res.meta).toEqual({
        page: 2,
        pageSize: 10,
        total: 25,
        totalPages: 3,
      });
      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        }),
      );
    });
  });

  describe('findBySlug', () => {
    it('returns published product with full storefront details', async () => {
      prisma.product.findFirst.mockResolvedValueOnce({
        ...mockProduct,
        description: 'Detailed description',
      });
      prisma.product.count.mockResolvedValueOnce(1);
      prisma.product.findMany
        .mockResolvedValueOnce([mockProduct]) // for search() base summary
        .mockResolvedValueOnce([]); // for relatedProducts query

      const result = await service.findBySlug('michelin-pilot-sport-4');

      expect(result.id).toBe('prod-tyre-1');
      expect(result.description).toBe('Detailed description');
      expect(result.currency).toBe('NZD');
      expect(result.allMedia).toBeDefined();
      expect(result.warehouseLocation).toBeDefined();
      expect(result.shippingInfo).toBeDefined();
      expect(result.warrantyAndReturns).toBeDefined();
    });

    it('throws NotFoundException when slug does not exist or product is not published', async () => {
      prisma.product.findFirst.mockResolvedValueOnce(null);

      await expect(service.findBySlug('non-existent-product')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getFilterMeta', () => {
    it('aggregates available brands, price bounds, tyre specs and seat belt facets', async () => {
      prisma.product.findMany.mockResolvedValueOnce([
        {
          brand: 'Michelin',
          saleUnits: [{ retailPrice: 145.0 }],
          tyreSpecification: {
            sectionWidth: 225,
            aspectRatio: 45,
            rimDiameter: 17,
            speedRating: 'Y',
            season: 'SUMMER',
            terrainType: 'PERFORMANCE',
          },
          seatBeltSpecification: null,
          serializedItems: [],
          fitments: [],
        },
      ]);

      const meta = await service.getFilterMeta('tyres');

      expect(meta.brands).toEqual(['Michelin']);
      expect(meta.priceRange.min).toBe(145);
      expect(meta.tyreFilters?.widths).toEqual([225]);
      expect(meta.tyreFilters?.profiles).toEqual([45]);
      expect(meta.tyreFilters?.rimDiameters).toEqual([17]);
    });
  });

  describe('getVehicleTaxonomy', () => {
    it('returns hierarchical makes and models', async () => {
      prisma.vehicleMake.findMany.mockResolvedValueOnce([
        {
          id: 'make-toyota',
          name: 'Toyota',
          slug: 'toyota',
          models: [
            {
              id: 'model-rav4',
              name: 'RAV4',
              slug: 'rav4',
              generations: [{ yearStart: 2018, yearEnd: null }],
            },
          ],
        },
      ]);

      const makes = await service.getVehicleTaxonomy();

      expect(makes).toHaveLength(1);
      expect(makes[0]!.name).toBe('Toyota');
      expect(makes[0]!.models[0]!.name).toBe('RAV4');
      expect(makes[0]!.models[0]!.yearStart).toBe(2018);
    });
  });
});
