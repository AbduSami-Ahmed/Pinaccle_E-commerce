import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorefrontQueryDto } from './dto/storefront-query.dto';
import {
  ConditionGrade,
  PaginatedResponse,
  ProductFitmentDetailDto,
  ProductMediaItemDto,
  RelatedProductDto,
  SerializedItemDetailDto,
  StorefrontFilterMetaDto,
  StorefrontProductDetailDto,
  StorefrontProductSummaryDto,
  VehicleMakeOptionDto,
} from '@pinnacle/contracts';

@Injectable()
export class StorefrontService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Search and filter published products with server-side pagination.
   */
  async search(query: StorefrontQueryDto): Promise<PaginatedResponse<StorefrontProductSummaryDto>> {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 12;
    const skip = (page - 1) * pageSize;

    const where: Prisma.ProductWhereInput = {
      status: 'PUBLISHED',
    };

    // 1. Text Search across Title, Description, SKU, OEM Part Number, Brand, Barcodes
    if (query.search && query.search.trim().length > 0) {
      const term = query.search.trim();
      where.OR = [
        { title: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
        { sku: { contains: term, mode: 'insensitive' } },
        { oemPartNumber: { contains: term, mode: 'insensitive' } },
        { brand: { contains: term, mode: 'insensitive' } },
        {
          serializedItems: {
            some: { stockBarcode: { contains: term, mode: 'insensitive' } },
          },
        },
      ];
    }

    // 2. Category Filter (by slug)
    if (query.categorySlug) {
      where.category = {
        slug: query.categorySlug.toLowerCase(),
      };
    }

    // 3. Brand Filter
    if (query.brand) {
      where.brand = {
        equals: query.brand.trim(),
        mode: 'insensitive',
      };
    }

    // 4. Tyre Specifications
    const tyreWhere: Prisma.TyreSpecificationWhereInput = {};
    if (query.sectionWidth) tyreWhere.sectionWidth = query.sectionWidth;
    if (query.aspectRatio) tyreWhere.aspectRatio = query.aspectRatio;
    if (query.rimDiameter) tyreWhere.rimDiameter = query.rimDiameter;
    if (query.loadIndex) tyreWhere.loadIndex = query.loadIndex;
    if (query.speedRating)
      tyreWhere.speedRating = { equals: query.speedRating, mode: 'insensitive' };
    if (query.season) tyreWhere.season = query.season;
    if (query.terrainType) tyreWhere.terrainType = query.terrainType;
    if (query.runFlat !== undefined) tyreWhere.runFlat = query.runFlat;

    if (Object.keys(tyreWhere).length > 0) {
      where.tyreSpecification = tyreWhere;
    }

    // 5. Seat-Belt Specifications
    const seatBeltWhere: Prisma.SeatBeltSpecificationWhereInput = {};
    if (query.position) seatBeltWhere.position = query.position;
    if (query.componentType) seatBeltWhere.componentType = query.componentType;

    if (Object.keys(seatBeltWhere).length > 0) {
      where.seatBeltSpecification = seatBeltWhere;
    }

    // 6. Vehicle Fitment Filters (Make, Model, Year, Chassis)
    if (query.make || query.model || query.year || query.chassis) {
      const chassisAndConditions: Prisma.VehicleChassisWhereInput[] = [];

      if (query.chassis) {
        chassisAndConditions.push({
          chassisCode: { contains: query.chassis, mode: 'insensitive' },
        });
      }

      if (query.make) {
        chassisAndConditions.push({
          generation: {
            model: {
              make: {
                OR: [
                  { slug: { equals: query.make.toLowerCase() } },
                  { name: { contains: query.make, mode: 'insensitive' } },
                ],
              },
            },
          },
        });
      }

      if (query.model) {
        chassisAndConditions.push({
          generation: {
            model: {
              OR: [
                { slug: { equals: query.model.toLowerCase() } },
                { name: { contains: query.model, mode: 'insensitive' } },
              ],
            },
          },
        });
      }

      if (query.year) {
        chassisAndConditions.push({
          generation: {
            yearStart: { lte: query.year },
            OR: [{ yearEnd: null }, { yearEnd: { gte: query.year } }],
          },
        });
      }

      where.fitments = {
        some: {
          vehicleChassis: {
            AND: chassisAndConditions,
          },
        },
      };
    }

    // 7. Condition Filter
    if (query.condition) {
      if (query.condition === 'NEW_SURPLUS') {
        where.OR = [
          ...(where.OR ?? []),
          { productType: 'BULK_QUANTITY' },
          { serializedItems: { some: { conditionGrade: 'NEW_SURPLUS' } } },
        ];
      } else {
        where.serializedItems = {
          some: {
            conditionGrade: query.condition,
          },
        };
      }
    }

    // 8. Price Bounds & Sale Unit Filter
    if (query.minPrice !== undefined || query.maxPrice !== undefined || query.saleUnit) {
      where.saleUnits = {
        some: {
          isActive: true,
          ...(query.saleUnit ? { code: query.saleUnit } : {}),
          ...(query.minPrice !== undefined ? { retailPrice: { gte: query.minPrice } } : {}),
          ...(query.maxPrice !== undefined ? { retailPrice: { lte: query.maxPrice } } : {}),
        },
      };
    }

    // 9. In-Stock Availability Filter
    if (query.inStockOnly) {
      where.OR = [
        ...(where.OR ?? []),
        {
          productType: 'BULK_QUANTITY',
          inventoryItems: { some: { quantityOnHand: { gt: 0 } } },
        },
        {
          productType: 'INDIVIDUALLY_SERIALIZED',
          serializedItems: { some: { status: 'AVAILABLE' } },
        },
      ];
    }

    // 10. Sorting
    let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: 'desc' };
    if (query.sortBy === 'title') {
      orderBy = { title: query.sortOrder ?? 'asc' };
    } else if (query.sortBy === 'createdAt') {
      orderBy = { createdAt: query.sortOrder ?? 'desc' };
    }

    // Fetch matching total & product rows
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
            orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }],
            take: 3,
            select: { cdnUrl: true, isPrimary: true },
          },
          saleUnits: {
            where: { isActive: true },
            orderBy: [{ isDefault: 'desc' }, { baseQuantityMultiplier: 'asc' }],
          },
          tyreSpecification: true,
          seatBeltSpecification: true,
          fitments: {
            take: 5,
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
          inventoryItems: {
            select: { quantityOnHand: true, quantityReserved: true },
          },
          serializedItems: {
            select: {
              stockBarcode: true,
              conditionGrade: true,
              status: true,
            },
          },
        },
      }),
    ]);

    // Map each product to StorefrontProductSummaryDto
    const data: StorefrontProductSummaryDto[] = products.map((p) => {
      // Primary image
      const primaryMedia = p.media.find((m) => m.isPrimary) || p.media[0];
      const primaryImageUrl = primaryMedia?.cdnUrl ?? null;

      // Sale units and prices
      const defaultUnit = p.saleUnits.find((su) => su.isDefault) || p.saleUnits[0];
      const defaultPrice = defaultUnit ? Number(defaultUnit.retailPrice) : 0;
      const prices = p.saleUnits.map((su) => Number(su.retailPrice));
      const minPrice = prices.length ? Math.min(...prices) : defaultPrice;
      const maxPrice = prices.length ? Math.max(...prices) : defaultPrice;

      const availableSaleUnits = p.saleUnits.map((su) => ({
        code: su.code,
        name: su.name,
        multiplier: su.baseQuantityMultiplier,
        price: Number(su.retailPrice),
      }));

      // Stock availability calculations
      let totalOnHand = 0;
      let totalReserved = 0;
      let sellableBaseUnits = 0;
      let primaryBarcode: string | undefined = undefined;
      let condition: StorefrontProductSummaryDto['condition'] = 'NEW_SURPLUS';

      if (p.productType === 'BULK_QUANTITY') {
        totalOnHand = p.inventoryItems.reduce((acc, i) => acc + i.quantityOnHand, 0);
        totalReserved = p.inventoryItems.reduce((acc, i) => acc + i.quantityReserved, 0);
        sellableBaseUnits = Math.max(0, totalOnHand - totalReserved);
        condition = 'NEW_SURPLUS';
      } else {
        const availableSerialized = p.serializedItems.filter((item) => item.status === 'AVAILABLE');
        totalOnHand = availableSerialized.length;
        totalReserved = 0;
        sellableBaseUnits = availableSerialized.length;
        primaryBarcode = availableSerialized[0]?.stockBarcode || p.serializedItems[0]?.stockBarcode;

        const firstItem = availableSerialized[0] || p.serializedItems[0];
        if (firstItem?.conditionGrade) {
          condition = firstItem.conditionGrade as StorefrontProductSummaryDto['condition'];
        }
      }

      const inStock = sellableBaseUnits > 0;
      const isLowStock = inStock && sellableBaseUnits <= 5;
      const stockLabel = inStock
        ? sellableBaseUnits <= 5
          ? `Low Stock (${sellableBaseUnits} left)`
          : `In Stock (${sellableBaseUnits} available)`
        : 'Out of Stock';

      // Fitment summary
      const distinctMakes = Array.from(
        new Set(
          p.fitments
            .map((f) => f.vehicleChassis?.generation?.model?.make?.name)
            .filter((name): name is string => Boolean(name)),
        ),
      );
      const distinctModels = Array.from(
        new Set(
          p.fitments
            .map((f) => f.vehicleChassis?.generation?.model?.name)
            .filter((name): name is string => Boolean(name)),
        ),
      );
      const firstFitment = p.fitments[0];

      return {
        id: p.id,
        sku: p.sku,
        title: p.title,
        slug: p.slug,
        brand: p.brand,
        categoryName: p.category.name,
        categorySlug: p.category.slug,
        productType: p.productType,
        primaryImageUrl,
        minPrice,
        maxPrice,
        defaultPrice,
        defaultSaleUnitCode: defaultUnit?.code || 'UNIT',
        defaultSaleUnitName: defaultUnit?.name || 'Unit',
        availableSaleUnits,
        availability: {
          inStock,
          isLowStock,
          totalOnHand,
          totalReserved,
          sellableBaseUnits,
          label: stockLabel,
        },
        condition,
        stockNumber: primaryBarcode,
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
        fitmentSummary:
          distinctMakes.length > 0
            ? {
                makes: distinctMakes,
                models: distinctModels,
                verificationStatus: firstFitment?.verificationStatus || 'REQUIRES_CHECK',
              }
            : undefined,
      };
    });

    // In-memory price sorting if requested (since default unit price is relational)
    if (query.sortBy === 'price_asc') {
      data.sort((a, b) => a.defaultPrice - b.defaultPrice);
    } else if (query.sortBy === 'price_desc') {
      data.sort((a, b) => b.defaultPrice - a.defaultPrice);
    }

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
   * Retrieve a published product by slug with full storefront details.
   */
  async findBySlug(slug: string): Promise<StorefrontProductDetailDto> {
    const product = await this.prisma.product.findFirst({
      where: {
        slug: slug.toLowerCase(),
        status: 'PUBLISHED',
      },
      include: {
        category: { select: { name: true, slug: true } },
        media: {
          orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }],
        },
        saleUnits: {
          where: { isActive: true },
          orderBy: [{ isDefault: 'desc' }, { baseQuantityMultiplier: 'asc' }],
        },
        tyreSpecification: true,
        seatBeltSpecification: true,
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
        inventoryItems: {
          select: {
            quantityOnHand: true,
            quantityReserved: true,
            locationBin: true,
            warehouse: { select: { name: true, code: true, city: true } },
          },
        },
        serializedItems: {
          select: {
            id: true,
            stockBarcode: true,
            conditionGrade: true,
            status: true,
            conditionNotes: true,
            actualPhotos: true,
            donorVehicleVin: true,
            locationBin: true,
            pretensionerResistanceOhms: true,
            warehouse: { select: { name: true, code: true, city: true } },
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Published product with slug '${slug}' not found`);
    }

    // Base summary mapping
    const baseSummary = (
      await this.search({
        categorySlug: product.category.slug,
        search: product.sku,
        pageSize: 1,
      })
    ).data.find((p) => p.id === product.id);

    if (!baseSummary) {
      throw new NotFoundException(`Product summary for '${slug}' could not be computed`);
    }

    // Detailed fitment records
    const fitments: ProductFitmentDetailDto[] = product.fitments.map((f) => {
      const chassis = f.vehicleChassis;
      const gen = chassis.generation;
      const model = gen.model;
      const make = model.make;

      return {
        id: f.id,
        make: make.name,
        model: model.name,
        generation: gen.generationName,
        yearRange: gen.yearStart ? `${gen.yearStart}–${gen.yearEnd ?? 'Current'}` : undefined,
        chassisCode: chassis.chassisCode,
        bodyType: chassis.bodyType ?? undefined,
        engineSpec: chassis.engineSpec ?? undefined,
        verificationStatus: f.verificationStatus,
        isOemDirect: f.verificationStatus === 'VERIFIED_OEM_DIRECT',
        fitmentNotes: f.fitmentNotes,
      };
    });

    // Serialized unit record (for individually tracked parts like seat belts)
    const activeSerialized =
      product.serializedItems.find((s) => s.status === 'AVAILABLE') || product.serializedItems[0];

    const serializedItem: SerializedItemDetailDto | undefined = activeSerialized
      ? {
          id: activeSerialized.id,
          stockBarcode: activeSerialized.stockBarcode,
          conditionGrade: activeSerialized.conditionGrade as ConditionGrade,
          conditionNotes: activeSerialized.conditionNotes,
          status: activeSerialized.status,
          actualPhotos: Array.isArray(activeSerialized.actualPhotos)
            ? (activeSerialized.actualPhotos as string[])
            : [],
          donorVin: activeSerialized.donorVehicleVin,
          donorVehicleDesc: activeSerialized.donorVehicleVin
            ? `Donor VIN: ${activeSerialized.donorVehicleVin.slice(0, 11)}...`
            : null,
          resistanceOhms: activeSerialized.pretensionerResistanceOhms
            ? Number(activeSerialized.pretensionerResistanceOhms)
            : null,
          warehouseLocation: `${activeSerialized.warehouse.name} (Bay ${activeSerialized.locationBin})`,
        }
      : undefined;

    // Warehouse and trade pickup details
    const primaryInventory = product.inventoryItems[0];
    const primaryWarehouse = activeSerialized?.warehouse || primaryInventory?.warehouse;
    const primaryBay =
      activeSerialized?.locationBin || primaryInventory?.locationBin || 'Bay B-04 / Rack T-12';

    const warehouseLocation = {
      name: primaryWarehouse ? primaryWarehouse.name : 'Sydney Central Depot (Prestons NSW)',
      depotCode: primaryWarehouse?.code || 'SYD-CENTRAL',
      bay: primaryBay,
      pickupAvailable: true,
      pickupLeadTime: 'Ready in 30 minutes for trade collection',
    };

    // Meaningful related products query
    const relatedPrisma = await this.prisma.product.findMany({
      where: {
        status: 'PUBLISHED',
        id: { not: product.id },
        OR: [{ categoryId: product.categoryId }, { brand: product.brand }],
      },
      take: 3,
      include: {
        media: { where: { isPrimary: true }, take: 1 },
        saleUnits: { where: { isDefault: true }, take: 1 },
        category: { select: { slug: true } },
      },
    });

    const relatedProducts: RelatedProductDto[] = relatedPrisma.map((r) => ({
      id: r.id,
      sku: r.sku,
      title: r.title,
      slug: r.slug,
      brand: r.brand,
      categorySlug: r.category.slug,
      defaultPrice: r.saleUnits[0] ? Number(r.saleUnits[0].retailPrice) : 0,
      primaryImageUrl: r.media[0]?.cdnUrl ?? null,
      relationReason:
        r.brand === product.brand ? `Matching ${r.brand} Series` : 'Alternative Option',
      inStock: true,
    }));

    const allMedia: ProductMediaItemDto[] = product.media.map((m) => ({
      id: m.id,
      cdnUrl: m.cdnUrl,
      altText: m.altText,
      isPrimary: m.isPrimary,
      displayOrder: m.displayOrder,
    }));

    return {
      ...baseSummary,
      description: product.description,
      currency: 'AUD',
      allMedia,
      fitments,
      serializedItem,
      warehouseLocation,
      shippingInfo: {
        standardDispatch:
          'Orders confirmed before 2:00 PM AEST dispatch same day via StarTrack or TNT Express.',
        expressCourier:
          'Courier delivery typically 1–2 business days across NSW, ACT, VIC, and QLD metro.',
        cutoffTimeAEST: '14:00',
      },
      warrantyAndReturns: {
        warrantyDays: 30,
        returnPolicy:
          '30-day workshop exchange guarantee. Items must be returned in uninstalled condition with intact inspection barcode and tags.',
        srsDisclaimer:
          product.category.slug === 'seat-belts'
            ? 'Pyrotechnic pretensioner circuits must be installed by a licensed automotive technician with the 12V vehicle battery disconnected.'
            : undefined,
      },
      relatedProducts,
    };
  }

  /**
   * Aggregated filter metadata for discovery facets.
   */
  async getFilterMeta(categorySlug?: string): Promise<StorefrontFilterMetaDto> {
    const where: Prisma.ProductWhereInput = {
      status: 'PUBLISHED',
      ...(categorySlug ? { category: { slug: categorySlug.toLowerCase() } } : {}),
    };

    const products = await this.prisma.product.findMany({
      where,
      select: {
        brand: true,
        saleUnits: {
          where: { isActive: true },
          select: { retailPrice: true },
        },
        tyreSpecification: true,
        seatBeltSpecification: true,
        serializedItems: {
          select: { conditionGrade: true },
        },
        fitments: {
          select: {
            vehicleChassis: {
              select: {
                generation: {
                  select: {
                    model: {
                      select: {
                        name: true,
                        make: { select: { name: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const brands = Array.from(new Set(products.map((p) => p.brand))).sort();

    let minPrice = 999999;
    let maxPrice = 0;
    products.forEach((p) => {
      p.saleUnits.forEach((su) => {
        const val = Number(su.retailPrice);
        if (val < minPrice) minPrice = val;
        if (val > maxPrice) maxPrice = val;
      });
    });

    if (minPrice === 999999) minPrice = 0;

    // Tyre filter facets
    const tyreSpecs = products
      .map((p) => p.tyreSpecification)
      .filter((s): s is NonNullable<typeof s> => Boolean(s));

    const tyreFilters =
      categorySlug === 'tyres' || (!categorySlug && tyreSpecs.length > 0)
        ? {
            widths: Array.from(new Set(tyreSpecs.map((s) => s.sectionWidth))).sort((a, b) => a - b),
            profiles: Array.from(new Set(tyreSpecs.map((s) => s.aspectRatio))).sort(
              (a, b) => a - b,
            ),
            rimDiameters: Array.from(new Set(tyreSpecs.map((s) => s.rimDiameter))).sort(
              (a, b) => a - b,
            ),
            speedRatings: Array.from(new Set(tyreSpecs.map((s) => s.speedRating))).sort(),
            seasons: Array.from(new Set(tyreSpecs.map((s) => s.season))).sort(),
            terrainTypes: Array.from(new Set(tyreSpecs.map((s) => s.terrainType))).sort(),
          }
        : undefined;

    // Seat belt filter facets
    const seatBeltSpecs = products
      .map((p) => p.seatBeltSpecification)
      .filter((s): s is NonNullable<typeof s> => Boolean(s));

    const makesSet = new Set<string>();
    const modelsSet = new Set<string>();
    const conditionGradesSet = new Set<string>();

    products.forEach((p) => {
      p.serializedItems.forEach((item) => {
        if (item.conditionGrade) conditionGradesSet.add(item.conditionGrade);
      });
      p.fitments.forEach((f) => {
        const makeName = f.vehicleChassis?.generation?.model?.make?.name;
        const modelName = f.vehicleChassis?.generation?.model?.name;
        if (makeName) makesSet.add(makeName);
        if (modelName) modelsSet.add(modelName);
      });
    });

    const seatBeltFilters =
      categorySlug === 'seat-belts' || (!categorySlug && seatBeltSpecs.length > 0)
        ? {
            positions: Array.from(new Set(seatBeltSpecs.map((s) => s.position))).sort(),
            componentTypes: Array.from(new Set(seatBeltSpecs.map((s) => s.componentType))).sort(),
            conditionGrades: Array.from(conditionGradesSet).sort(),
            makes: Array.from(makesSet).sort(),
            models: Array.from(modelsSet).sort(),
          }
        : undefined;

    return {
      brands,
      priceRange: {
        min: Math.floor(minPrice),
        max: Math.ceil(maxPrice) || 500,
      },
      tyreFilters,
      seatBeltFilters,
    };
  }

  /**
   * Return vehicle makes and models hierarchy for vehicle fitment selector.
   */
  async getVehicleTaxonomy(): Promise<VehicleMakeOptionDto[]> {
    const makes = await this.prisma.vehicleMake.findMany({
      orderBy: { name: 'asc' },
      include: {
        models: {
          orderBy: { name: 'asc' },
          include: {
            generations: {
              orderBy: { yearStart: 'desc' },
            },
          },
        },
      },
    });

    return makes.map((m) => ({
      id: m.id,
      name: m.name,
      slug: m.slug,
      models: m.models.map((mod) => {
        const firstGen = mod.generations[0];
        return {
          id: mod.id,
          name: mod.name,
          slug: mod.slug,
          yearStart: firstGen?.yearStart,
          yearEnd: firstGen?.yearEnd,
        };
      }),
    }));
  }
}
