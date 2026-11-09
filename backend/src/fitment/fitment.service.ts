import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../common/cache/cache.service';
import {
  MakesQueryDto,
  ModelsQueryDto,
  YearsQueryDto,
  VariantsQueryDto,
} from './dto/vehicle-query.dto';
import { CheckProductFitmentDto, FitmentSearchDto } from './dto/fitment-search.dto';
import {
  CreateFitmentDto,
  FitmentQueryDto,
  UpdateFitmentVerificationDto,
} from './dto/create-fitment.dto';
import {
  AuthenticatedUser,
  FitmentConfidence,
  FitmentSearchResultDto,
  PaginatedResponse,
  ProductFitmentDto,
  VehicleChassisDto,
  VehicleMakeDto,
  VehicleModelDto,
} from '@pinnacle/contracts';

@Injectable()
export class FitmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  // =========================================================================
  // 1. Customer Dependent Vehicle Taxonomy
  // =========================================================================

  /**
   * Return normalized vehicle makes (Cached for 1800s).
   */
  async getMakes(query: MakesQueryDto): Promise<VehicleMakeDto[]> {
    const cacheKey = `fitment:makes:${query.search?.trim().toLowerCase() || 'all'}`;
    return this.cacheService.getOrSet(cacheKey, () => this.executeGetMakes(query), 1800);
  }

  private async executeGetMakes(query: MakesQueryDto): Promise<VehicleMakeDto[]> {
    const where: Prisma.VehicleMakeWhereInput = query.search
      ? {
          OR: [
            { name: { contains: query.search.trim(), mode: 'insensitive' } },
            { slug: { contains: query.search.trim().toLowerCase() } },
          ],
        }
      : {};

    const makes = await this.prisma.vehicleMake.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { models: true },
        },
      },
    });

    return makes.map((m) => ({
      id: m.id,
      name: m.name,
      slug: m.slug,
      modelsCount: m._count.models,
    }));
  }

  /**
   * Return dependent vehicle models for a selected make (Cached for 1800s).
   */
  async getModels(query: ModelsQueryDto): Promise<VehicleModelDto[]> {
    const cacheKey = `fitment:models:${query.makeId || ''}:${query.make?.trim().toLowerCase() || ''}`;
    return this.cacheService.getOrSet(cacheKey, () => this.executeGetModels(query), 1800);
  }

  private async executeGetModels(query: ModelsQueryDto): Promise<VehicleModelDto[]> {
    if (!query.makeId && !query.make) {
      throw new BadRequestException('Either makeId or make slug/name is required');
    }

    const make = await this.prisma.vehicleMake.findFirst({
      where: {
        OR: [
          ...(query.makeId ? [{ id: query.makeId }] : []),
          ...(query.make
            ? [
                { slug: query.make.toLowerCase().trim() },
                { name: { equals: query.make.trim(), mode: 'insensitive' as const } },
              ]
            : []),
        ],
      },
    });

    if (!make) {
      return [];
    }

    const models = await this.prisma.vehicleModel.findMany({
      where: { makeId: make.id },
      orderBy: { name: 'asc' },
      include: {
        generations: {
          orderBy: { yearStart: 'asc' },
        },
      },
    });

    return models.map((m) => {
      let yearsRange = '';
      if (m.generations.length > 0) {
        const start = m.generations[0]?.yearStart;
        const last = m.generations[m.generations.length - 1];
        const end = last?.yearEnd ? last.yearEnd : 'Current';
        yearsRange = `${start}–${end}`;
      }

      return {
        id: m.id,
        makeId: make.id,
        makeName: make.name,
        name: m.name,
        slug: m.slug,
        yearsRange: yearsRange || undefined,
      };
    });
  }

  /**
   * Return available model years for a selected model based on generations (Cached for 1800s).
   */
  async getYears(
    query: YearsQueryDto,
  ): Promise<{ years: number[]; generations: { id: string; name: string; range: string }[] }> {
    const cacheKey = `fitment:years:${query.modelId || ''}:${query.model?.trim().toLowerCase() || ''}`;
    return this.cacheService.getOrSet(cacheKey, () => this.executeGetYears(query), 1800);
  }

  private async executeGetYears(
    query: YearsQueryDto,
  ): Promise<{ years: number[]; generations: { id: string; name: string; range: string }[] }> {
    if (!query.modelId && !query.model) {
      throw new BadRequestException('Either modelId or model slug/name is required');
    }

    const model = await this.prisma.vehicleModel.findFirst({
      where: {
        OR: [
          ...(query.modelId ? [{ id: query.modelId }] : []),
          ...(query.model
            ? [
                { slug: query.model.toLowerCase().trim() },
                { name: { equals: query.model.trim(), mode: 'insensitive' as const } },
              ]
            : []),
        ],
      },
      include: {
        generations: {
          orderBy: { yearStart: 'desc' },
        },
      },
    });

    if (!model) {
      return { years: [], generations: [] };
    }

    const currentYear = new Date().getFullYear();
    const yearsSet = new Set<number>();
    const generationsList: { id: string; name: string; range: string }[] = [];

    model.generations.forEach((gen) => {
      const maxYear = gen.yearEnd ? gen.yearEnd : currentYear + 1;
      for (let y = gen.yearStart; y <= maxYear; y++) {
        yearsSet.add(y);
      }
      generationsList.push({
        id: gen.id,
        name: gen.generationName,
        range: `${gen.yearStart}–${gen.yearEnd || 'Current'}`,
      });
    });

    const sortedYears = Array.from(yearsSet).sort((a, b) => b - a);

    return {
      years: sortedYears,
      generations: generationsList,
    };
  }

  /**
   * Return dependent chassis variants for a selected model and year (Cached for 1800s).
   */
  async getVariants(query: VariantsQueryDto): Promise<VehicleChassisDto[]> {
    const cacheKey = `fitment:variants:${query.modelId || ''}:${query.model?.trim().toLowerCase() || ''}:${query.year || 'all'}`;
    return this.cacheService.getOrSet(cacheKey, () => this.executeGetVariants(query), 1800);
  }

  private async executeGetVariants(query: VariantsQueryDto): Promise<VehicleChassisDto[]> {
    if (!query.modelId && !query.model) {
      throw new BadRequestException('Either modelId or model is required');
    }

    const model = await this.prisma.vehicleModel.findFirst({
      where: {
        OR: [
          ...(query.modelId ? [{ id: query.modelId }] : []),
          ...(query.model
            ? [
                { slug: query.model.toLowerCase().trim() },
                { name: { equals: query.model.trim(), mode: 'insensitive' as const } },
              ]
            : []),
        ],
      },
      include: {
        make: true,
        generations: {
          include: {
            chassis: true,
          },
        },
      },
    });

    if (!model) {
      return [];
    }

    const targetYear = query.year ? Number(query.year) : undefined;
    const chassisList: VehicleChassisDto[] = [];

    model.generations.forEach((gen) => {
      if (
        !targetYear ||
        (gen.yearStart <= targetYear && (!gen.yearEnd || gen.yearEnd >= targetYear))
      ) {
        gen.chassis.forEach((c) => {
          chassisList.push({
            id: c.id,
            generationId: gen.id,
            generationName: gen.generationName,
            chassisCode: c.chassisCode,
            bodyType: c.bodyType,
            engineSpec: c.engineSpec,
            yearStart: gen.yearStart,
            yearEnd: gen.yearEnd,
            makeName: model.make.name,
            modelName: model.name,
          });
        });
      }
    });

    return chassisList.sort((a, b) => a.chassisCode.localeCompare(b.chassisCode));
  }

  // =========================================================================
  // 2. Customer Fitment Search Workflows
  // =========================================================================

  /**
   * Search compatible products with explicit fitment confidence grading.
   */
  async searchFitment(query: FitmentSearchDto): Promise<PaginatedResponse<FitmentSearchResultDto>> {
    if (
      !query.make &&
      !query.makeId &&
      !query.model &&
      !query.modelId &&
      !query.year &&
      !query.chassisCode &&
      !query.chassisId
    ) {
      throw new BadRequestException(
        'At least one vehicle search filter (make, model, year, or chassis) is required',
      );
    }

    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 12;
    const skip = (page - 1) * pageSize;

    // Build chassis match criteria
    const chassisWhere: Prisma.VehicleChassisWhereInput = {};

    if (query.chassisId) {
      chassisWhere.id = query.chassisId;
    }
    if (query.chassisCode) {
      chassisWhere.chassisCode = {
        contains: query.chassisCode.trim(),
        mode: 'insensitive',
      };
    }

    const generationWhere: Prisma.VehicleGenerationWhereInput = {};
    if (query.year) {
      generationWhere.yearStart = { lte: Number(query.year) };
      generationWhere.OR = [{ yearEnd: null }, { yearEnd: { gte: Number(query.year) } }];
    }

    const modelWhere: Prisma.VehicleModelWhereInput = {};
    if (query.modelId) {
      modelWhere.id = query.modelId;
    } else if (query.model) {
      modelWhere.OR = [
        { slug: query.model.toLowerCase().trim() },
        { name: { contains: query.model.trim(), mode: 'insensitive' } },
      ];
    }

    if (query.makeId) {
      modelWhere.makeId = query.makeId;
    } else if (query.make) {
      modelWhere.make = {
        OR: [
          { slug: query.make.toLowerCase().trim() },
          { name: { contains: query.make.trim(), mode: 'insensitive' } },
        ],
      };
    }

    if (Object.keys(modelWhere).length > 0) {
      generationWhere.model = modelWhere;
    }
    if (Object.keys(generationWhere).length > 0) {
      chassisWhere.generation = generationWhere;
    }

    // Query matching product fitments where product is PUBLISHED
    const fitmentWhere: Prisma.ProductFitmentWhereInput = {
      product: {
        status: 'PUBLISHED',
        ...(query.categorySlug ? { category: { slug: query.categorySlug.toLowerCase() } } : {}),
      },
      vehicleChassis: chassisWhere,
    };

    const [total, fitments] = await Promise.all([
      this.prisma.productFitment.count({ where: fitmentWhere }),
      this.prisma.productFitment.findMany({
        where: fitmentWhere,
        skip,
        take: pageSize,
        orderBy: [
          { verificationStatus: 'asc' }, // VERIFIED_OEM_DIRECT first
          { createdAt: 'desc' },
        ],
        include: {
          product: {
            include: {
              category: { select: { name: true, slug: true } },
              media: {
                orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }],
                take: 1,
              },
              saleUnits: {
                where: { isActive: true },
                orderBy: [{ isDefault: 'desc' }, { baseQuantityMultiplier: 'asc' }],
              },
              inventoryItems: { select: { quantityOnHand: true, quantityReserved: true } },
              serializedItems: {
                select: { stockBarcode: true, conditionGrade: true, status: true },
              },
              tyreSpecification: true,
              seatBeltSpecification: true,
            },
          },
          vehicleChassis: {
            include: {
              generation: {
                include: {
                  model: {
                    include: { make: true },
                  },
                },
              },
            },
          },
        },
      }),
    ]);

    const results: FitmentSearchResultDto[] = [];

    for (const f of fitments) {
      const p = f.product;
      const c = f.vehicleChassis;
      const model = c.generation.model;
      const make = model.make;

      // Determine confidence label
      let fitmentConfidence: FitmentConfidence = 'PARTIAL_REQUIRES_CHECK';
      let isOemDirect = false;

      if (f.verificationStatus === 'VERIFIED_OEM_DIRECT') {
        fitmentConfidence = 'CONFIRMED_EXACT';
        isOemDirect = true;
      } else if (f.verificationStatus === 'UNIVERSAL_FIT') {
        fitmentConfidence = 'UNIVERSAL_COMPATIBLE';
        isOemDirect = false;
      } else {
        fitmentConfidence = 'PARTIAL_REQUIRES_CHECK';
        isOemDirect = false;
      }

      // If client asked for minimum confidence, check threshold
      if (query.minConfidence === 'CONFIRMED_EXACT' && fitmentConfidence !== 'CONFIRMED_EXACT') {
        continue;
      }

      // Format product summary
      const primaryMedia = p.media[0];
      const defaultUnit = p.saleUnits.find((su) => su.isDefault) || p.saleUnits[0];
      const defaultPrice = defaultUnit ? Number(defaultUnit.retailPrice) : 0;
      const prices = p.saleUnits.map((su) => Number(su.retailPrice));

      let totalOnHand = 0;
      let totalReserved = 0;
      let sellableBaseUnits = 0;
      let barcode: string | undefined = undefined;

      if (p.productType === 'BULK_QUANTITY') {
        totalOnHand = p.inventoryItems.reduce((acc, i) => acc + i.quantityOnHand, 0);
        totalReserved = p.inventoryItems.reduce((acc, i) => acc + i.quantityReserved, 0);
        sellableBaseUnits = Math.max(0, totalOnHand - totalReserved);
      } else {
        const avail = p.serializedItems.filter((i) => i.status === 'AVAILABLE');
        totalOnHand = avail.length;
        sellableBaseUnits = avail.length;
        barcode = avail[0]?.stockBarcode;
      }

      const inStock = sellableBaseUnits > 0;

      results.push({
        fitmentConfidence,
        verificationStatus: f.verificationStatus,
        matchedChassisCode: c.chassisCode,
        matchedVehicleName: `${make.name} ${model.name} (${c.chassisCode})`,
        fitmentNotes: f.fitmentNotes,
        isOemDirect,
        product: {
          id: p.id,
          sku: p.sku,
          title: p.title,
          slug: p.slug,
          brand: p.brand,
          categoryName: p.category.name,
          categorySlug: p.category.slug,
          productType: p.productType,
          primaryImageUrl: primaryMedia?.cdnUrl || null,
          minPrice: prices.length ? Math.min(...prices) : defaultPrice,
          maxPrice: prices.length ? Math.max(...prices) : defaultPrice,
          defaultPrice,
          defaultSaleUnitCode: defaultUnit?.code || 'UNIT',
          defaultSaleUnitName: defaultUnit?.name || 'Unit',
          availableSaleUnits: p.saleUnits.map((u) => ({
            code: u.code,
            name: u.name,
            multiplier: u.baseQuantityMultiplier,
            price: Number(u.retailPrice),
          })),
          availability: {
            inStock,
            isLowStock: inStock && sellableBaseUnits <= 5,
            totalOnHand,
            totalReserved,
            sellableBaseUnits,
            label: inStock
              ? sellableBaseUnits <= 5
                ? `Low Stock (${sellableBaseUnits} left)`
                : `In Stock (${sellableBaseUnits} available)`
              : 'Out of Stock',
          },
          condition: (p.serializedItems[0]?.conditionGrade as any) || 'NEW_SURPLUS',
          stockNumber: barcode,
          tyreSpec: p.tyreSpecification
            ? {
                sectionWidth: p.tyreSpecification.sectionWidth,
                aspectRatio: p.tyreSpecification.aspectRatio,
                rimDiameter: p.tyreSpecification.rimDiameter,
                loadIndex: p.tyreSpecification.loadIndex,
                speedRating: p.tyreSpecification.speedRating,
                season: p.tyreSpecification.season,
                terrainType: p.tyreSpecification.terrainType,
                runFlat: p.tyreSpecification.runFlat,
              }
            : undefined,
          seatBeltSpec: p.seatBeltSpecification
            ? {
                position: p.seatBeltSpecification.position,
                componentType: p.seatBeltSpecification.componentType,
                mountingPoints: p.seatBeltSpecification.mountingPoints,
                webbingColor: p.seatBeltSpecification.webbingColor,
                oemReferenceTag: p.seatBeltSpecification.oemReferenceTag || undefined,
              }
            : undefined,
          fitmentSummary: {
            makes: [make.name],
            models: [model.name],
            yearRange: `${c.generation.yearStart}–${c.generation.yearEnd || 'Current'}`,
            verificationStatus: f.verificationStatus,
          },
        },
      });
    }

    return {
      data: results,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize) || 1,
      },
    };
  }

  /**
   * Fast check compatibility for a specific product against user's vehicle.
   */
  async checkProductFitment(dto: CheckProductFitmentDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      include: {
        fitments: {
          include: {
            vehicleChassis: {
              include: {
                generation: {
                  include: {
                    model: {
                      include: { make: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product ${dto.productId} not found`);
    }

    // Match against product's fitments
    const matchingFitment = product.fitments.find((f) => {
      const c = f.vehicleChassis;
      const gen = c.generation;
      const model = gen.model;
      const make = model.make;

      if (dto.chassisId && c.id === dto.chassisId) return true;
      if (dto.chassisCode && c.chassisCode.toLowerCase() === dto.chassisCode.toLowerCase())
        return true;

      const makeMatches =
        !dto.make ||
        make.name.toLowerCase() === dto.make.toLowerCase() ||
        make.slug === dto.make.toLowerCase();
      const modelMatches =
        !dto.model ||
        model.name.toLowerCase() === dto.model.toLowerCase() ||
        model.slug === dto.model.toLowerCase();
      const yearMatches =
        !dto.year || (gen.yearStart <= dto.year && (!gen.yearEnd || gen.yearEnd >= dto.year));

      return makeMatches && modelMatches && yearMatches;
    });

    if (!matchingFitment) {
      return {
        isCompatible: false,
        confidence: 'PARTIAL_REQUIRES_CHECK' as FitmentConfidence,
        verificationStatus: 'REQUIRES_CHECK' as const,
        message:
          'This part is not confirmed compatible with your selected vehicle. Please verify with our parts specialist.',
      };
    }

    const status = matchingFitment.verificationStatus;
    const chassis = matchingFitment.vehicleChassis;

    let confidence: FitmentConfidence = 'PARTIAL_REQUIRES_CHECK';
    let message = 'Compatibility identified but requires VIN check before ordering.';

    if (status === 'VERIFIED_OEM_DIRECT') {
      confidence = 'CONFIRMED_EXACT';
      message = `Guaranteed exact OEM fitment for ${chassis.generation.model.make.name} ${chassis.generation.model.name} (${chassis.chassisCode}).`;
    } else if (status === 'UNIVERSAL_FIT') {
      confidence = 'UNIVERSAL_COMPATIBLE';
      message = `Universal compatible fitment for ${chassis.generation.model.make.name} ${chassis.generation.model.name}.`;
    }

    return {
      isCompatible: true,
      confidence,
      verificationStatus: status,
      matchedChassisCode: chassis.chassisCode,
      fitmentNotes: matchingFitment.fitmentNotes,
      message,
    };
  }

  // =========================================================================
  // 3. Admin Fitment Management Workflows
  // =========================================================================

  /**
   * List all fitment mappings for back-office admin.
   */
  async listFitments(query: FitmentQueryDto): Promise<PaginatedResponse<ProductFitmentDto>> {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.ProductFitmentWhereInput = {};
    if (query.productId) where.productId = query.productId;
    if (query.vehicleChassisId) where.vehicleChassisId = query.vehicleChassisId;
    if (query.verificationStatus) where.verificationStatus = query.verificationStatus;

    if (query.search && query.search.trim()) {
      const term = query.search.trim();
      where.OR = [
        { product: { sku: { contains: term, mode: 'insensitive' } } },
        { product: { title: { contains: term, mode: 'insensitive' } } },
        { vehicleChassis: { chassisCode: { contains: term, mode: 'insensitive' } } },
      ];
    }

    const [total, fitments] = await Promise.all([
      this.prisma.productFitment.count({ where }),
      this.prisma.productFitment.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          product: {
            select: {
              id: true,
              title: true,
              sku: true,
              brand: true,
              category: { select: { name: true, slug: true } },
            },
          },
          vehicleChassis: {
            include: {
              generation: {
                include: {
                  model: {
                    include: { make: true },
                  },
                },
              },
            },
          },
          verifier: {
            select: {
              id: true,
              email: true,
              staffProfile: { select: { firstName: true, lastName: true } },
            },
          },
        },
      }),
    ]);

    const data: ProductFitmentDto[] = fitments.map((f) => {
      const p = f.product;
      const c = f.vehicleChassis;
      const gen = c.generation;
      const model = gen.model;
      const make = model.make;
      const verifierName = f.verifier?.staffProfile
        ? `${f.verifier.staffProfile.firstName} ${f.verifier.staffProfile.lastName}`
        : f.verifier?.email || null;

      return {
        id: f.id,
        productId: p.id,
        productTitle: p.title,
        productSku: p.sku,
        productBrand: p.brand,
        productCategory: p.category.name,
        categorySlug: p.category.slug,
        vehicleChassisId: c.id,
        vehicleMake: make.name,
        vehicleModel: model.name,
        vehicleGeneration: gen.generationName,
        vehicleChassisCode: c.chassisCode,
        yearRange: `${gen.yearStart}–${gen.yearEnd || 'Current'}`,
        verificationStatus: f.verificationStatus,
        fitmentNotes: f.fitmentNotes,
        verifiedByUserId: f.verifiedByUserId,
        verifiedByName: verifierName,
        verifiedAt: f.verifiedAt ? f.verifiedAt.toISOString() : null,
        createdAt: f.createdAt.toISOString(),
      };
    });

    return {
      data,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize) || 1,
      },
    };
  }

  /**
   * Link a product with a vehicle chassis.
   */
  async createFitment(dto: CreateFitmentDto, user: AuthenticatedUser): Promise<ProductFitmentDto> {
    const existing = await this.prisma.productFitment.findUnique({
      where: {
        productId_vehicleChassisId: {
          productId: dto.productId,
          vehicleChassisId: dto.vehicleChassisId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Fitment record already exists for this product and vehicle');
    }

    const fitment = await this.prisma.productFitment.create({
      data: {
        productId: dto.productId,
        vehicleChassisId: dto.vehicleChassisId,
        verificationStatus: dto.verificationStatus || 'REQUIRES_CHECK',
        fitmentNotes: dto.fitmentNotes,
        verifiedByUserId: dto.verificationStatus === 'VERIFIED_OEM_DIRECT' ? user.sub : null,
        verifiedAt: dto.verificationStatus === 'VERIFIED_OEM_DIRECT' ? new Date() : null,
      },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            sku: true,
            brand: true,
            category: { select: { name: true, slug: true } },
          },
        },
        vehicleChassis: {
          include: {
            generation: {
              include: {
                model: {
                  include: { make: true },
                },
              },
            },
          },
        },
      },
    });

    const c = fitment.vehicleChassis;
    const gen = c.generation;
    const model = gen.model;

    return {
      id: fitment.id,
      productId: fitment.productId,
      productTitle: fitment.product.title,
      productSku: fitment.product.sku,
      productBrand: fitment.product.brand,
      productCategory: fitment.product.category.name,
      categorySlug: fitment.product.category.slug,
      vehicleChassisId: c.id,
      vehicleMake: model.make.name,
      vehicleModel: model.name,
      vehicleGeneration: gen.generationName,
      vehicleChassisCode: c.chassisCode,
      yearRange: `${gen.yearStart}–${gen.yearEnd || 'Current'}`,
      verificationStatus: fitment.verificationStatus,
      fitmentNotes: fitment.fitmentNotes,
      verifiedByUserId: fitment.verifiedByUserId,
      verifiedByName: user.email,
      verifiedAt: fitment.verifiedAt ? fitment.verifiedAt.toISOString() : null,
      createdAt: fitment.createdAt.toISOString(),
    };
  }

  /**
   * Update fitment verification status and reviewer notes.
   */
  async updateVerification(
    id: string,
    dto: UpdateFitmentVerificationDto,
    user: AuthenticatedUser,
  ): Promise<ProductFitmentDto> {
    const existing = await this.prisma.productFitment.findUnique({
      where: { id },
      include: {
        product: { select: { id: true, title: true, sku: true, brand: true, category: true } },
        vehicleChassis: {
          include: {
            generation: {
              include: {
                model: {
                  include: { make: true },
                },
              },
            },
          },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException(`Fitment record ${id} not found`);
    }

    const updated = await this.prisma.productFitment.update({
      where: { id },
      data: {
        verificationStatus: dto.verificationStatus,
        fitmentNotes: dto.fitmentNotes !== undefined ? dto.fitmentNotes : existing.fitmentNotes,
        verifiedByUserId: user.sub,
        verifiedAt: new Date(),
      },
      include: {
        product: { select: { id: true, title: true, sku: true, brand: true, category: true } },
        vehicleChassis: {
          include: {
            generation: {
              include: {
                model: {
                  include: { make: true },
                },
              },
            },
          },
        },
      },
    });

    const c = updated.vehicleChassis;
    const gen = c.generation;
    const model = gen.model;

    return {
      id: updated.id,
      productId: updated.productId,
      productTitle: updated.product.title,
      productSku: updated.product.sku,
      productBrand: updated.product.brand,
      productCategory: updated.product.category.name,
      categorySlug: updated.product.category.slug,
      vehicleChassisId: c.id,
      vehicleMake: model.make.name,
      vehicleModel: model.name,
      vehicleGeneration: gen.generationName,
      vehicleChassisCode: c.chassisCode,
      yearRange: `${gen.yearStart}–${gen.yearEnd || 'Current'}`,
      verificationStatus: updated.verificationStatus,
      fitmentNotes: updated.fitmentNotes,
      verifiedByUserId: updated.verifiedByUserId,
      verifiedByName: user.email,
      verifiedAt: updated.verifiedAt ? updated.verifiedAt.toISOString() : null,
      createdAt: updated.createdAt.toISOString(),
    };
  }

  /**
   * Delete a fitment link.
   */
  async deleteFitment(id: string): Promise<{ success: boolean; message: string }> {
    const existing = await this.prisma.productFitment.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Fitment record ${id} not found`);
    }

    await this.prisma.productFitment.delete({
      where: { id },
    });

    return {
      success: true,
      message: `Fitment record ${id} deleted successfully`,
    };
  }
}
