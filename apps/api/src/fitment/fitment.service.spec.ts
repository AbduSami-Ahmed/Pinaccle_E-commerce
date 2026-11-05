import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { FitmentService } from './fitment.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorefrontService } from '../catalog/storefront.service';

describe('FitmentService', () => {
  let service: FitmentService;
  let prisma: {
    vehicleMake: { findMany: jest.Mock; findFirst: jest.Mock };
    vehicleModel: { findMany: jest.Mock; findFirst: jest.Mock };
    vehicleGeneration: { findMany: jest.Mock; findFirst: jest.Mock };
    vehicleChassis: { findMany: jest.Mock; findFirst: jest.Mock };
    productFitment: {
      count: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    product: { findUnique: jest.Mock };
  };

  const mockMake = { id: 'make-1', name: 'Toyota', slug: 'toyota', _count: { models: 3 } };
  const mockModel = {
    id: 'model-1',
    makeId: 'make-1',
    name: 'RAV4',
    slug: 'rav4',
    generations: [
      { id: 'gen-1', generationName: '5th Gen (XA50)', yearStart: 2018, yearEnd: null },
    ],
  };
  const mockChassis = {
    id: 'chassis-1',
    generationId: 'gen-1',
    chassisCode: 'AXAH54',
    bodyType: 'SUV 5-Door',
    engineSpec: '2.5L Hybrid',
    generation: {
      id: 'gen-1',
      generationName: '5th Gen',
      yearStart: 2018,
      yearEnd: null,
      model: {
        id: 'model-1',
        name: 'RAV4',
        make: { id: 'make-1', name: 'Toyota', slug: 'toyota' },
      },
    },
  };

  const mockProduct = {
    id: 'prod-1',
    sku: 'SB-TOY-RAV4-FR',
    title: 'Toyota RAV4 Front Passenger Seat Belt',
    slug: 'toyota-rav4-front-passenger-seat-belt',
    brand: 'Toyota',
    productType: 'INDIVIDUALLY_SERIALIZED',
    status: 'PUBLISHED',
    category: { name: 'Seat Belts', slug: 'seat-belts' },
    media: [{ cdnUrl: 'https://cdn.example.com/sb1.jpg', isPrimary: true, displayOrder: 0 }],
    saleUnits: [
      {
        code: 'SB_COMPLETE',
        name: 'Complete Assembly',
        baseQuantityMultiplier: 1,
        retailPrice: 95.0,
        isDefault: true,
      },
    ],
    inventoryItems: [],
    serializedItems: [
      { stockBarcode: 'SB-2024-0944', conditionGrade: 'GRADE_A_LIKE_NEW', status: 'AVAILABLE' },
    ],
    tyreSpecification: null,
    seatBeltSpecification: {
      position: 'FRONT_RIGHT_PASSENGER',
      componentType: 'RETRACTOR_ASSEMBLY',
      mountingPoints: 3,
      webbingColor: 'Black',
      oemReferenceTag: '73210-42170',
    },
  };

  const mockFitment = {
    id: 'fitment-1',
    productId: 'prod-1',
    vehicleChassisId: 'chassis-1',
    verificationStatus: 'VERIFIED_OEM_DIRECT',
    fitmentNotes: 'Direct OEM match for AXAH54 hybrid',
    verifiedByUserId: 'user-admin',
    verifiedAt: new Date('2026-01-01'),
    createdAt: new Date('2026-01-01'),
    product: mockProduct,
    vehicleChassis: mockChassis,
    verifier: {
      id: 'user-admin',
      email: 'admin@pinnacle.test',
      profile: { firstName: 'Sarah', lastName: 'Admin' },
    },
  };

  beforeEach(async () => {
    prisma = {
      vehicleMake: {
        findMany: jest.fn().mockResolvedValue([mockMake]),
        findFirst: jest.fn().mockResolvedValue(mockMake),
      },
      vehicleModel: {
        findMany: jest.fn().mockResolvedValue([mockModel]),
        findFirst: jest.fn().mockResolvedValue(mockModel),
      },
      vehicleGeneration: { findMany: jest.fn(), findFirst: jest.fn() },
      vehicleChassis: {
        findMany: jest.fn().mockResolvedValue([mockChassis]),
        findFirst: jest.fn().mockResolvedValue(mockChassis),
      },
      productFitment: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([mockFitment]),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(mockFitment),
        update: jest.fn().mockResolvedValue(mockFitment),
        delete: jest.fn().mockResolvedValue(mockFitment),
      },
      product: {
        findUnique: jest.fn().mockResolvedValue({ ...mockProduct, fitments: [mockFitment] }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FitmentService,
        { provide: PrismaService, useValue: prisma },
        { provide: StorefrontService, useValue: {} },
      ],
    }).compile();

    service = module.get<FitmentService>(FitmentService);
  });

  describe('Vehicle Taxonomy Cascading', () => {
    it('returns normalized vehicle makes', async () => {
      const makes = await service.getMakes({});
      expect(makes).toHaveLength(1);
      expect(makes[0]!.name).toBe('Toyota');
      expect(makes[0]!.modelsCount).toBe(3);
    });

    it('returns dependent models for a make', async () => {
      const models = await service.getModels({ make: 'toyota' });
      expect(models).toHaveLength(1);
      expect(models[0]!.name).toBe('RAV4');
      expect(models[0]!.yearsRange).toBe('2018–Current');
    });

    it('returns years and generations for a model', async () => {
      const res = await service.getYears({ model: 'rav4' });
      expect(res.years).toContain(2018);
      expect(res.years).toContain(2024);
      expect(res.generations[0]!.name).toBe('5th Gen (XA50)');
    });

    it('returns dependent variants for model and year', async () => {
      prisma.vehicleModel.findFirst.mockResolvedValueOnce({
        ...mockModel,
        make: mockMake,
        generations: [
          {
            id: 'gen-1',
            generationName: '5th Gen',
            yearStart: 2018,
            yearEnd: null,
            chassis: [mockChassis],
          },
        ],
      });

      const variants = await service.getVariants({ model: 'rav4', year: 2021 });
      expect(variants).toHaveLength(1);
      expect(variants[0]!.chassisCode).toBe('AXAH54');
    });
  });

  describe('searchFitment', () => {
    it('rejects query without any vehicle parameters', async () => {
      await expect(service.searchFitment({})).rejects.toThrow(BadRequestException);
    });

    it('returns verified OEM exact match with CONFIRMED_EXACT confidence', async () => {
      const res = await service.searchFitment({ make: 'toyota', model: 'rav4' });
      expect(res.data).toHaveLength(1);
      expect(res.data[0]!.fitmentConfidence).toBe('CONFIRMED_EXACT');
      expect(res.data[0]!.isOemDirect).toBe(true);
      expect(res.data[0]!.verificationStatus).toBe('VERIFIED_OEM_DIRECT');
      expect(res.data[0]!.matchedChassisCode).toBe('AXAH54');
      expect(res.data[0]!.product.sku).toBe('SB-TOY-RAV4-FR');
    });

    it('returns universal fitment with UNIVERSAL_COMPATIBLE confidence', async () => {
      prisma.productFitment.findMany.mockResolvedValueOnce([
        { ...mockFitment, verificationStatus: 'UNIVERSAL_FIT' },
      ]);

      const res = await service.searchFitment({ make: 'toyota' });
      expect(res.data[0]!.fitmentConfidence).toBe('UNIVERSAL_COMPATIBLE');
      expect(res.data[0]!.isOemDirect).toBe(false);
    });

    it('returns partial match with PARTIAL_REQUIRES_CHECK confidence', async () => {
      prisma.productFitment.findMany.mockResolvedValueOnce([
        { ...mockFitment, verificationStatus: 'REQUIRES_CHECK' },
      ]);

      const res = await service.searchFitment({ make: 'toyota' });
      expect(res.data[0]!.fitmentConfidence).toBe('PARTIAL_REQUIRES_CHECK');
      expect(res.data[0]!.isOemDirect).toBe(false);
    });

    it('filters out non-exact matches when minConfidence is CONFIRMED_EXACT', async () => {
      prisma.productFitment.findMany.mockResolvedValueOnce([
        { ...mockFitment, verificationStatus: 'REQUIRES_CHECK' },
      ]);

      const res = await service.searchFitment({
        make: 'toyota',
        minConfidence: 'CONFIRMED_EXACT',
      });
      expect(res.data).toHaveLength(0);
    });
  });

  describe('checkProductFitment', () => {
    it('confirms compatibility when product matches vehicle chassis', async () => {
      const check = await service.checkProductFitment({
        productId: 'prod-1',
        make: 'toyota',
        model: 'rav4',
        year: 2021,
      });

      expect(check.isCompatible).toBe(true);
      expect(check.confidence).toBe('CONFIRMED_EXACT');
      expect(check.message).toContain('Guaranteed exact OEM fitment');
    });

    it('rejects compatibility when vehicle is not supported', async () => {
      const check = await service.checkProductFitment({
        productId: 'prod-1',
        make: 'ford',
        model: 'ranger',
      });

      expect(check.isCompatible).toBe(false);
      expect(check.message).toContain('not confirmed compatible');
    });
  });

  describe('Admin Fitment Workflows', () => {
    it('creates a new fitment mapping', async () => {
      const user = {
        sub: 'admin-1',
        id: 'admin-1',
        email: 'admin@pinnacle.test',
        permissions: ['fitment:matrix:manage'],
      } as any;
      const res = await service.createFitment(
        {
          productId: 'prod-1',
          vehicleChassisId: 'chassis-1',
          verificationStatus: 'VERIFIED_OEM_DIRECT',
        },
        user,
      );

      expect(res.productId).toBe('prod-1');
      expect(prisma.productFitment.create).toHaveBeenCalled();
    });

    it('prevents duplicate fitment mappings', async () => {
      prisma.productFitment.findUnique.mockResolvedValueOnce(mockFitment);
      const user = { sub: 'admin-1', id: 'admin-1', email: 'admin@pinnacle.test' } as any;

      await expect(
        service.createFitment({ productId: 'prod-1', vehicleChassisId: 'chassis-1' }, user),
      ).rejects.toThrow(ConflictException);
    });

    it('updates verification state and records reviewer metadata', async () => {
      prisma.productFitment.findUnique.mockResolvedValueOnce(mockFitment);
      const user = { sub: 'admin-1', id: 'admin-1', email: 'admin@pinnacle.test' } as any;

      const res = await service.updateVerification(
        'fitment-1',
        {
          verificationStatus: 'VERIFIED_OEM_DIRECT',
          fitmentNotes: 'Verified against OEM parts catalog',
        },
        user,
      );

      expect(res.verificationStatus).toBe('VERIFIED_OEM_DIRECT');
      expect(prisma.productFitment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            verificationStatus: 'VERIFIED_OEM_DIRECT',
            verifiedByUserId: 'admin-1',
          }),
        }),
      );
    });

    it('deletes fitment mapping', async () => {
      prisma.productFitment.findUnique.mockResolvedValueOnce(mockFitment);
      const res = await service.deleteFitment('fitment-1');
      expect(res.success).toBe(true);
      expect(prisma.productFitment.delete).toHaveBeenCalledWith({ where: { id: 'fitment-1' } });
    });
  });
});
