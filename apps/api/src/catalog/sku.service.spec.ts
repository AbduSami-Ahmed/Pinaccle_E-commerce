import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { SkuService } from './sku.service';
import { PrismaService } from '../prisma/prisma.service';

describe('SkuService (Phase 5 Catalog)', () => {
  let service: SkuService;
  let mockPrisma: {
    product: {
      findUnique: jest.Mock;
    };
  };

  beforeEach(async () => {
    mockPrisma = {
      product: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SkuService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<SkuService>(SkuService);
  });

  describe('validateSkuFormat', () => {
    it('accepts compliant uppercase alphanumeric SKUs with hyphens and underscores', () => {
      expect(() => service.validateSkuFormat('TYR-MICH-2254517-PS5')).not.toThrow();
      expect(() => service.validateSkuFormat('SBLT_TOY_RAV4_01')).not.toThrow();
      expect(() => service.validateSkuFormat('ABC-123')).not.toThrow();
    });

    it('rejects SKUs shorter than 3 characters', () => {
      expect(() => service.validateSkuFormat('AB')).toThrow(BadRequestException);
    });

    it('rejects SKUs with whitespace, lowercase letters, or illegal punctuation', () => {
      expect(() => service.validateSkuFormat('TYR MICH 225')).toThrow(BadRequestException);
      expect(() => service.validateSkuFormat('tyr-mich-225')).toThrow(BadRequestException);
      expect(() => service.validateSkuFormat('TYR#123@XYZ')).toThrow(BadRequestException);
    });
  });

  describe('ensureSkuUnique', () => {
    it('succeeds when SKU is not in use', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);
      await expect(service.ensureSkuUnique('TYR-NEW-001')).resolves.not.toThrow();
    });

    it('throws ConflictException when SKU is already assigned to another product', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({ id: 'prod-existing-123' });
      await expect(service.ensureSkuUnique('TYR-COLLISION')).rejects.toThrow(ConflictException);
    });

    it('succeeds when SKU belongs to the excluded product (self during update)', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({ id: 'prod-self-123' });
      await expect(
        service.ensureSkuUnique('TYR-COLLISION', 'prod-self-123'),
      ).resolves.not.toThrow();
    });
  });

  describe('generateUniqueSku', () => {
    it('generates a compliant Tyre SKU format: TYR-<BRAND>-<DIMS>-<SUFFIX>', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      const sku = await service.generateUniqueSku({
        categorySlug: 'tyres',
        brand: 'Michelin',
        tyreSpec: {
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
      });

      expect(sku).toMatch(/^TYR-MICH-2254517-[A-F0-9]{4}$/);
    });

    it('generates a compliant Seat Belt SKU format: SBLT-<MAKE>-<POS>-<SUFFIX>', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      const sku = await service.generateUniqueSku({
        categorySlug: 'seat-belts',
        brand: 'Toyota',
        seatBeltSpec: {
          position: 'FRONT_LEFT_DRIVER',
          componentType: 'RETRACTOR_ASSEMBLY',
          pretensionerType: 'PYROTECHNIC',
          webbingColor: 'Black',
          mountingPoints: 3,
        },
      });

      expect(sku).toMatch(/^SBLT-TOYO-FLD-[A-F0-9]{4}$/);
    });

    it('generates a compliant General Product SKU when category is unmapped', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      const sku = await service.generateUniqueSku({
        categorySlug: 'accessories',
        brand: 'Brembo',
      });

      expect(sku).toMatch(/^PRD-BREM-[A-F0-9]{6}$/);
    });
  });
});
