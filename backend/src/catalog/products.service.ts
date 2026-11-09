import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../common/cache/cache.service';
import { SkuService } from './sku.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto, UpdateProductStatusDto } from './dto/update-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import {
  AuthenticatedUser,
  PaginatedResponse,
  ProductDto,
  ProductListItemDto,
} from '@pinnacle/contracts';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly skuService: SkuService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Server-side paginated, filtered, and sorted product list.
   */
  async findAll(
    query: ProductQueryDto,
    user?: AuthenticatedUser,
  ): Promise<PaginatedResponse<ProductListItemDto>> {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));
    const skip = (page - 1) * pageSize;

    const canViewDrafts = user?.permissions.includes('catalog:product:view_draft') ?? false;

    const where: Prisma.ProductWhereInput = {};

    // Search filter across title, SKU, brand, and OEM part number
    if (query.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { title: { contains: term, mode: 'insensitive' } },
        { sku: { contains: term, mode: 'insensitive' } },
        { brand: { contains: term, mode: 'insensitive' } },
        { oemPartNumber: { contains: term, mode: 'insensitive' } },
      ];
    }

    // Category filter
    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    // Brand filter
    if (query.brand) {
      where.brand = { equals: query.brand, mode: 'insensitive' };
    }

    // Product type filter
    if (query.productType) {
      where.productType = query.productType;
    }

    // Status filter
    if (query.status) {
      // If client explicitly requested non-published, ensure they have view_draft
      if (query.status !== 'PUBLISHED' && !canViewDrafts) {
        where.status = 'PUBLISHED';
      } else {
        where.status = query.status;
      }
    } else if (!canViewDrafts) {
      // Unprivileged callers only see published products
      where.status = 'PUBLISHED';
    }

    // Dynamic sort
    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder = query.sortOrder ?? 'desc';
    const orderBy: Prisma.ProductOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    const [total, products] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
        include: {
          category: { select: { name: true, slug: true } },
          media: {
            where: { isPrimary: true },
            take: 1,
            select: { cdnUrl: true },
          },
          saleUnits: {
            where: { isDefault: true, isActive: true },
            take: 1,
            select: { retailPrice: true },
          },
        },
      }),
    ]);

    const data: ProductListItemDto[] = products.map((p) => {
      const primaryImg = p.media[0]?.cdnUrl ?? null;
      const defaultSaleUnit = p.saleUnits[0];
      const basePrice = defaultSaleUnit ? defaultSaleUnit.retailPrice.toString() : null;

      return {
        id: p.id,
        sku: p.sku,
        title: p.title,
        slug: p.slug,
        brand: p.brand,
        categoryName: p.category.name,
        categorySlug: p.category.slug,
        productType: p.productType,
        status: p.status,
        primaryImageUrl: primaryImg,
        basePrice,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
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
   * Retrieve a single product by ID or unique slug.
   */
  async findByIdOrSlug(idOrSlug: string, user?: AuthenticatedUser): Promise<ProductDto> {
    const product = await this.prisma.product.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      include: {
        category: true,
        media: { orderBy: { displayOrder: 'asc' } },
        saleUnits: { orderBy: { baseQuantityMultiplier: 'asc' } },
        tyreSpecification: true,
        seatBeltSpecification: true,
      },
    });

    if (!product) {
      throw new NotFoundException(`Product "${idOrSlug}" not found`);
    }

    const canViewDrafts = user?.permissions.includes('catalog:product:view_draft') ?? false;
    if (product.status !== 'PUBLISHED' && !canViewDrafts) {
      throw new NotFoundException(`Product "${idOrSlug}" not found`);
    }

    return this.mapToProductDto(product);
  }

  /**
   * Create a master catalogue product with optional specs and sale units.
   * NOTE: Strictly catalogue definition — NO inventory balance is created.
   */
  async create(dto: CreateProductDto): Promise<ProductDto> {
    const category = await this.prisma.category.findUnique({
      where: { id: dto.categoryId },
    });
    if (!category) {
      throw new BadRequestException(`Category with ID ${dto.categoryId} does not exist`);
    }

    // Category-specific validation
    this.validateCategorySpecifications(category.slug, dto);

    // Resolve SKU
    let finalSku: string;
    if (dto.sku) {
      this.skuService.validateSkuFormat(dto.sku);
      await this.skuService.ensureSkuUnique(dto.sku);
      finalSku = dto.sku.trim().toUpperCase();
    } else {
      finalSku = await this.skuService.generateUniqueSku({
        categorySlug: category.slug,
        brand: dto.brand,
        tyreSpec: dto.tyreSpecification,
        seatBeltSpec: dto.seatBeltSpecification,
      });
    }

    // Resolve slug
    const finalSlug = dto.slug ?? (await this.generateUniqueSlug(dto.title));

    // Handle media display orders and ensure primary image consistency
    const mediaData = (dto.media ?? []).map((m, index) => ({
      s3Key: m.s3Key,
      cdnUrl: m.cdnUrl,
      altText: m.altText,
      displayOrder: m.displayOrder ?? index,
      isPrimary: m.isPrimary ?? index === 0,
    }));

    // Ensure at least one primary image if media is provided
    if (mediaData.length > 0 && !mediaData.some((m) => m.isPrimary)) {
      const firstMedia = mediaData[0];
      if (firstMedia) {
        firstMedia.isPrimary = true;
      }
    }

    // Handle sale units
    const saleUnitsData =
      dto.saleUnits && dto.saleUnits.length > 0
        ? dto.saleUnits.map((u, index) => ({
            code: u.code.trim().toUpperCase(),
            name: u.name.trim(),
            baseQuantityMultiplier: u.baseQuantityMultiplier,
            retailPrice: new Prisma.Decimal(u.retailPrice),
            compareAtPrice: u.compareAtPrice ? new Prisma.Decimal(u.compareAtPrice) : null,
            isDefault: u.isDefault ?? index === 0,
            isActive: u.isActive ?? true,
          }))
        : [
            {
              code: 'UNIT',
              name: 'Single Unit',
              baseQuantityMultiplier: 1,
              retailPrice: new Prisma.Decimal('0.00'),
              compareAtPrice: null,
              isDefault: true,
              isActive: true,
            },
          ];

    // Transactional creation
    const created = await this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          categoryId: dto.categoryId,
          sku: finalSku,
          title: dto.title,
          slug: finalSlug,
          brand: dto.brand,
          oemPartNumber: dto.oemPartNumber ?? null,
          description: dto.description,
          productType: dto.productType,
          status: dto.status ?? 'DRAFT',
          media: {
            create: mediaData,
          },
          saleUnits: {
            create: saleUnitsData,
          },
        },
      });

      // Insert Tyre Specs if applicable
      if (dto.tyreSpecification) {
        await tx.tyreSpecification.create({
          data: {
            productId: product.id,
            sectionWidth: dto.tyreSpecification.sectionWidth,
            aspectRatio: dto.tyreSpecification.aspectRatio,
            rimDiameter: dto.tyreSpecification.rimDiameter,
            loadIndex: dto.tyreSpecification.loadIndex,
            speedRating: dto.tyreSpecification.speedRating.toUpperCase(),
            season: dto.tyreSpecification.season,
            terrainType: dto.tyreSpecification.terrainType,
            runFlat: dto.tyreSpecification.runFlat,
            extraLoad: dto.tyreSpecification.extraLoad,
            fuelEfficiencyClass: dto.tyreSpecification.fuelEfficiencyClass ?? null,
            wetGripClass: dto.tyreSpecification.wetGripClass ?? null,
            noiseDb: dto.tyreSpecification.noiseDb ?? null,
          },
        });
      }

      // Insert Seat Belt Specs if applicable
      if (dto.seatBeltSpecification) {
        await tx.seatBeltSpecification.create({
          data: {
            productId: product.id,
            position: dto.seatBeltSpecification.position,
            componentType: dto.seatBeltSpecification.componentType,
            pretensionerType: dto.seatBeltSpecification.pretensionerType,
            webbingColor: dto.seatBeltSpecification.webbingColor,
            mountingPoints: dto.seatBeltSpecification.mountingPoints,
            oemReferenceTag: dto.seatBeltSpecification.oemReferenceTag ?? null,
          },
        });
      }

      return tx.product.findUniqueOrThrow({
        where: { id: product.id },
        include: {
          category: true,
          media: { orderBy: { displayOrder: 'asc' } },
          saleUnits: { orderBy: { baseQuantityMultiplier: 'asc' } },
          tyreSpecification: true,
          seatBeltSpecification: true,
        },
      });
    });

    this.cacheService.invalidatePattern('storefront:*');
    return this.mapToProductDto(created);
  }

  /**
   * Update an existing product and its normalized specs/media/sale units.
   */
  async update(id: string, dto: UpdateProductDto): Promise<ProductDto> {
    const existing = await this.prisma.product.findUnique({
      where: { id },
      include: { category: true },
    });

    if (!existing) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    let categorySlug = existing.category.slug;
    if (dto.categoryId && dto.categoryId !== existing.categoryId) {
      const newCategory = await this.prisma.category.findUnique({
        where: { id: dto.categoryId },
      });
      if (!newCategory) {
        throw new BadRequestException(`Category with ID ${dto.categoryId} not found`);
      }
      categorySlug = newCategory.slug;
    }

    // Validate specs against category
    this.validateCategorySpecifications(categorySlug, dto);

    // Validate SKU uniqueness if changing
    if (dto.sku && dto.sku !== existing.sku) {
      this.skuService.validateSkuFormat(dto.sku);
      await this.skuService.ensureSkuUnique(dto.sku, id);
    }

    // Validate slug uniqueness if changing
    const updatedSlug = dto.slug;
    if (dto.slug && dto.slug !== existing.slug) {
      const slugCollision = await this.prisma.product.findUnique({
        where: { slug: dto.slug },
      });
      if (slugCollision && slugCollision.id !== id) {
        throw new ConflictException(`Slug "${dto.slug}" is already in use`);
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // Update core product attributes
      await tx.product.update({
        where: { id },
        data: {
          categoryId: dto.categoryId ?? undefined,
          sku: dto.sku ? dto.sku.trim().toUpperCase() : undefined,
          title: dto.title ?? undefined,
          slug: updatedSlug ?? undefined,
          brand: dto.brand ?? undefined,
          oemPartNumber: dto.oemPartNumber !== undefined ? dto.oemPartNumber : undefined,
          description: dto.description ?? undefined,
          productType: dto.productType ?? undefined,
          status: dto.status ?? undefined,
        },
      });

      // Update tyre specs if provided
      if (dto.tyreSpecification) {
        await tx.tyreSpecification.upsert({
          where: { productId: id },
          create: {
            productId: id,
            sectionWidth: dto.tyreSpecification.sectionWidth,
            aspectRatio: dto.tyreSpecification.aspectRatio,
            rimDiameter: dto.tyreSpecification.rimDiameter,
            loadIndex: dto.tyreSpecification.loadIndex,
            speedRating: dto.tyreSpecification.speedRating.toUpperCase(),
            season: dto.tyreSpecification.season,
            terrainType: dto.tyreSpecification.terrainType,
            runFlat: dto.tyreSpecification.runFlat,
            extraLoad: dto.tyreSpecification.extraLoad,
            fuelEfficiencyClass: dto.tyreSpecification.fuelEfficiencyClass ?? null,
            wetGripClass: dto.tyreSpecification.wetGripClass ?? null,
            noiseDb: dto.tyreSpecification.noiseDb ?? null,
          },
          update: {
            sectionWidth: dto.tyreSpecification.sectionWidth,
            aspectRatio: dto.tyreSpecification.aspectRatio,
            rimDiameter: dto.tyreSpecification.rimDiameter,
            loadIndex: dto.tyreSpecification.loadIndex,
            speedRating: dto.tyreSpecification.speedRating.toUpperCase(),
            season: dto.tyreSpecification.season,
            terrainType: dto.tyreSpecification.terrainType,
            runFlat: dto.tyreSpecification.runFlat,
            extraLoad: dto.tyreSpecification.extraLoad,
            fuelEfficiencyClass: dto.tyreSpecification.fuelEfficiencyClass ?? null,
            wetGripClass: dto.tyreSpecification.wetGripClass ?? null,
            noiseDb: dto.tyreSpecification.noiseDb ?? null,
          },
        });
      }

      // Update seat belt specs if provided
      if (dto.seatBeltSpecification) {
        await tx.seatBeltSpecification.upsert({
          where: { productId: id },
          create: {
            productId: id,
            position: dto.seatBeltSpecification.position,
            componentType: dto.seatBeltSpecification.componentType,
            pretensionerType: dto.seatBeltSpecification.pretensionerType,
            webbingColor: dto.seatBeltSpecification.webbingColor,
            mountingPoints: dto.seatBeltSpecification.mountingPoints,
            oemReferenceTag: dto.seatBeltSpecification.oemReferenceTag ?? null,
          },
          update: {
            position: dto.seatBeltSpecification.position,
            componentType: dto.seatBeltSpecification.componentType,
            pretensionerType: dto.seatBeltSpecification.pretensionerType,
            webbingColor: dto.seatBeltSpecification.webbingColor,
            mountingPoints: dto.seatBeltSpecification.mountingPoints,
            oemReferenceTag: dto.seatBeltSpecification.oemReferenceTag ?? null,
          },
        });
      }

      // Replace media if provided
      if (dto.media) {
        await tx.productMedia.deleteMany({ where: { productId: id } });
        if (dto.media.length > 0) {
          const mediaToCreate = dto.media.map((m, index) => ({
            productId: id,
            s3Key: m.s3Key,
            cdnUrl: m.cdnUrl,
            altText: m.altText,
            displayOrder: m.displayOrder ?? index,
            isPrimary: m.isPrimary ?? index === 0,
          }));
          await tx.productMedia.createMany({ data: mediaToCreate });
        }
      }

      // Replace sale units if provided
      if (dto.saleUnits) {
        await tx.saleUnitConfig.deleteMany({ where: { productId: id } });
        if (dto.saleUnits.length > 0) {
          const unitsToCreate = dto.saleUnits.map((u, index) => ({
            productId: id,
            code: u.code.trim().toUpperCase(),
            name: u.name.trim(),
            baseQuantityMultiplier: u.baseQuantityMultiplier,
            retailPrice: new Prisma.Decimal(u.retailPrice),
            compareAtPrice: u.compareAtPrice ? new Prisma.Decimal(u.compareAtPrice) : null,
            isDefault: u.isDefault ?? index === 0,
            isActive: u.isActive ?? true,
          }));
          await tx.saleUnitConfig.createMany({ data: unitsToCreate });
        }
      }

      return tx.product.findUniqueOrThrow({
        where: { id },
        include: {
          category: true,
          media: { orderBy: { displayOrder: 'asc' } },
          saleUnits: { orderBy: { baseQuantityMultiplier: 'asc' } },
          tyreSpecification: true,
          seatBeltSpecification: true,
        },
      });
    });

    this.cacheService.invalidatePattern('storefront:*');
    return this.mapToProductDto(updated);
  }

  /**
   * Update product status (DRAFT, PUBLISHED, ARCHIVED) with business readiness validation.
   */
  async updateStatus(id: string, dto: UpdateProductStatusDto): Promise<ProductDto> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        tyreSpecification: true,
        seatBeltSpecification: true,
        saleUnits: true,
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    if (dto.status === 'PUBLISHED') {
      // Enforce publishing prerequisites
      if (product.category.slug === 'tyres' && !product.tyreSpecification) {
        throw new BadRequestException('Cannot publish tyre product without tyre specifications');
      }

      if (product.category.slug === 'seat-belts' && !product.seatBeltSpecification) {
        throw new BadRequestException(
          'Cannot publish seat belt product without seat belt specifications',
        );
      }

      const activeSaleUnits = product.saleUnits.filter((u) => u.isActive);
      if (activeSaleUnits.length === 0) {
        throw new BadRequestException(
          'Cannot publish product without at least one active sale unit',
        );
      }

      const hasValidPrice = activeSaleUnits.some((u) => u.retailPrice.greaterThan(0));
      if (!hasValidPrice) {
        throw new BadRequestException(
          'Cannot publish product where all active sale units have a price of 0.00',
        );
      }
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: { status: dto.status },
      include: {
        category: true,
        media: { orderBy: { displayOrder: 'asc' } },
        saleUnits: { orderBy: { baseQuantityMultiplier: 'asc' } },
        tyreSpecification: true,
        seatBeltSpecification: true,
      },
    });

    this.cacheService.invalidatePattern('storefront:*');
    return this.mapToProductDto(updated);
  }

  /**
   * Safe removal: Archive if historical orders exist, or cascade delete if never purchased.
   */
  async remove(id: string): Promise<{ success: boolean; message: string; archived: boolean }> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        orderItems: { select: { id: true } },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    this.cacheService.invalidatePattern('storefront:*');
    if (product.orderItems.length > 0) {
      // Historical orders exist: cannot delete row, must archive
      await this.prisma.product.update({
        where: { id },
        data: { status: 'ARCHIVED' },
      });

      return {
        success: true,
        archived: true,
        message: `Product "${product.title}" has ${product.orderItems.length} historical order lines. It has been archived instead of deleted.`,
      };
    }

    // Safe to delete completely
    await this.prisma.product.delete({
      where: { id },
    });

    return {
      success: true,
      archived: false,
      message: `Product "${product.title}" (${product.sku}) has been permanently deleted.`,
    };
  }

  private validateCategorySpecifications(
    categorySlug: string,
    dto: CreateProductDto | UpdateProductDto,
  ): void {
    if (categorySlug === 'tyres') {
      if ('categoryId' in dto && !dto.tyreSpecification) {
        throw new BadRequestException('Tyre products require tyreSpecification attributes');
      }
      if (dto.seatBeltSpecification) {
        throw new BadRequestException(
          'Tyre products cannot include seatBeltSpecification attributes',
        );
      }
    } else if (categorySlug === 'seat-belts') {
      if ('categoryId' in dto && !dto.seatBeltSpecification) {
        throw new BadRequestException(
          'Seat belt products require seatBeltSpecification attributes',
        );
      }
      if (dto.tyreSpecification) {
        throw new BadRequestException(
          'Seat belt products cannot include tyreSpecification attributes',
        );
      }
    }
  }

  private async generateUniqueSlug(title: string): Promise<string> {
    const baseSlug = title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 80);

    let candidate = baseSlug;
    let counter = 1;

    while (counter < 20) {
      const existing = await this.prisma.product.findUnique({
        where: { slug: candidate },
        select: { id: true },
      });

      if (!existing) {
        return candidate;
      }

      candidate = `${baseSlug}-${counter}`;
      counter++;
    }

    return `${baseSlug}-${Date.now().toString(36)}`;
  }

  private mapToProductDto(p: any): ProductDto {
    return {
      id: p.id,
      categoryId: p.categoryId,
      category: p.category
        ? {
            id: p.category.id,
            parentId: p.category.parentId,
            slug: p.category.slug,
            name: p.category.name,
            description: p.category.description,
            displayOrder: p.category.displayOrder,
            isActive: p.category.isActive,
          }
        : undefined,
      sku: p.sku,
      title: p.title,
      slug: p.slug,
      brand: p.brand,
      oemPartNumber: p.oemPartNumber,
      description: p.description,
      productType: p.productType,
      status: p.status,
      media: (p.media ?? []).map((m: any) => ({
        id: m.id,
        productId: m.productId,
        s3Key: m.s3Key,
        cdnUrl: m.cdnUrl,
        altText: m.altText,
        displayOrder: m.displayOrder,
        isPrimary: m.isPrimary,
      })),
      saleUnits: (p.saleUnits ?? []).map((u: any) => ({
        id: u.id,
        code: u.code,
        name: u.name,
        baseQuantityMultiplier: u.baseQuantityMultiplier,
        retailPrice: u.retailPrice.toString(),
        compareAtPrice: u.compareAtPrice ? u.compareAtPrice.toString() : null,
        isDefault: u.isDefault,
        isActive: u.isActive,
      })),
      tyreSpecification: p.tyreSpecification
        ? {
            id: p.tyreSpecification.id,
            productId: p.tyreSpecification.productId,
            sectionWidth: p.tyreSpecification.sectionWidth,
            aspectRatio: p.tyreSpecification.aspectRatio,
            rimDiameter: p.tyreSpecification.rimDiameter,
            loadIndex: p.tyreSpecification.loadIndex,
            speedRating: p.tyreSpecification.speedRating,
            season: p.tyreSpecification.season,
            terrainType: p.tyreSpecification.terrainType,
            runFlat: p.tyreSpecification.runFlat,
            extraLoad: p.tyreSpecification.extraLoad,
            fuelEfficiencyClass: p.tyreSpecification.fuelEfficiencyClass,
            wetGripClass: p.tyreSpecification.wetGripClass,
            noiseDb: p.tyreSpecification.noiseDb,
          }
        : null,
      seatBeltSpecification: p.seatBeltSpecification
        ? {
            id: p.seatBeltSpecification.id,
            productId: p.seatBeltSpecification.productId,
            position: p.seatBeltSpecification.position,
            componentType: p.seatBeltSpecification.componentType,
            pretensionerType: p.seatBeltSpecification.pretensionerType,
            webbingColor: p.seatBeltSpecification.webbingColor,
            mountingPoints: p.seatBeltSpecification.mountingPoints,
            oemReferenceTag: p.seatBeltSpecification.oemReferenceTag,
          }
        : null,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    };
  }
}
