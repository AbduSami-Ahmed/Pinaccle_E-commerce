/**
 * Storefront API Client (Phase 7 Discovery & Search)
 *
 * Communicates with the NestJS Storefront endpoints (/api/storefront/*).
 * When running offline or during static compilation, provides realistic development seed data.
 */

import { cache } from 'react';
import {
  PaginatedResponse,
  ProductFitmentDetailDto,
  RelatedProductDto,
  SerializedItemDetailDto,
  StorefrontFilterMetaDto,
  StorefrontProductDetailDto,
  StorefrontProductSummaryDto,
  StorefrontSearchQuery,
  VehicleMakeOptionDto,
} from '@pinnacle/contracts';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

// ===========================================================================
// Realistic Development Seed Data (matches apps/api/prisma/seed.ts)
// ===========================================================================

export const SEED_STOREFRONT_PRODUCTS: StorefrontProductSummaryDto[] = [
  {
    id: 'prod-tyre-1',
    sku: 'TYRE-MIC-225-45-17',
    title: 'Michelin Pilot Sport 4 Ultra High Performance',
    slug: 'michelin-pilot-sport-4',
    brand: 'Michelin',
    categoryName: 'Tyres',
    categorySlug: 'tyres',
    productType: 'BULK_QUANTITY',
    primaryImageUrl:
      'https://images.unsplash.com/photo-1578844251758-2f71da64c96f?auto=format&fit=crop&w=600&q=80',
    minPrice: 145.0,
    maxPrice: 560.0,
    defaultPrice: 145.0,
    defaultSaleUnitCode: 'TYRE_SINGLE',
    defaultSaleUnitName: 'Single Tyre',
    availableSaleUnits: [
      { code: 'TYRE_SINGLE', name: 'Single Tyre', multiplier: 1, price: 145.0 },
      { code: 'TYRE_PAIR', name: 'Pair of 2', multiplier: 2, price: 280.0 },
      { code: 'TYRE_SET_OF_4', name: 'Set of 4', multiplier: 4, price: 540.0 },
    ],
    availability: {
      inStock: true,
      isLowStock: false,
      totalOnHand: 32,
      totalReserved: 4,
      sellableBaseUnits: 28,
      label: 'In Stock (28 available)',
    },
    condition: 'NEW_SURPLUS',
    tyreSpec: {
      sectionWidth: 225,
      aspectRatio: 45,
      rimDiameter: 17,
      loadIndex: 94,
      speedRating: 'Y',
      season: 'SUMMER',
      terrainType: 'PERFORMANCE',
      runFlat: false,
    },
    fitmentSummary: {
      makes: ['Volkswagen', 'Audi', 'BMW'],
      models: ['Golf Mk7', 'A3', '3 Series F30'],
      verificationStatus: 'UNIVERSAL_FIT',
    },
  },
  {
    id: 'prod-tyre-2',
    sku: 'TYRE-CON-205-55-16',
    title: 'Continental UltraContact Touring',
    slug: 'continental-ultracontact',
    brand: 'Continental',
    categoryName: 'Tyres',
    categorySlug: 'tyres',
    productType: 'BULK_QUANTITY',
    primaryImageUrl:
      'https://images.unsplash.com/photo-1543857778-c4a1a3e0b2eb?auto=format&fit=crop&w=600&q=80',
    minPrice: 112.5,
    maxPrice: 430.0,
    defaultPrice: 112.5,
    defaultSaleUnitCode: 'TYRE_SINGLE',
    defaultSaleUnitName: 'Single Tyre',
    availableSaleUnits: [
      { code: 'TYRE_SINGLE', name: 'Single Tyre', multiplier: 1, price: 112.5 },
      { code: 'TYRE_PAIR', name: 'Pair of 2', multiplier: 2, price: 218.0 },
      { code: 'TYRE_SET_OF_4', name: 'Set of 4', multiplier: 4, price: 420.0 },
    ],
    availability: {
      inStock: true,
      isLowStock: false,
      totalOnHand: 48,
      totalReserved: 0,
      sellableBaseUnits: 48,
      label: 'In Stock (48 available)',
    },
    condition: 'NEW_SURPLUS',
    tyreSpec: {
      sectionWidth: 205,
      aspectRatio: 55,
      rimDiameter: 16,
      loadIndex: 91,
      speedRating: 'V',
      season: 'ALL_SEASON',
      terrainType: 'HIGHWAY',
      runFlat: false,
    },
    fitmentSummary: {
      makes: ['Toyota', 'Ford', 'Hyundai'],
      models: ['Corolla', 'Focus', 'i30'],
      verificationStatus: 'UNIVERSAL_FIT',
    },
  },
  {
    id: 'prod-tyre-3',
    sku: 'TYRE-GOO-225-40-18',
    title: 'Goodyear Eagle F1 Asymmetric 5',
    slug: 'goodyear-eagle-f1-asymmetric-5',
    brand: 'Goodyear',
    categoryName: 'Tyres',
    categorySlug: 'tyres',
    productType: 'BULK_QUANTITY',
    primaryImageUrl:
      'https://images.unsplash.com/photo-1578844251758-2f71da64c96f?auto=format&fit=crop&w=600&q=80',
    minPrice: 138.0,
    maxPrice: 530.0,
    defaultPrice: 138.0,
    defaultSaleUnitCode: 'TYRE_SINGLE',
    defaultSaleUnitName: 'Single Tyre',
    availableSaleUnits: [
      { code: 'TYRE_SINGLE', name: 'Single Tyre', multiplier: 1, price: 138.0 },
      { code: 'TYRE_PAIR', name: 'Pair of 2', multiplier: 2, price: 268.0 },
      { code: 'TYRE_SET_OF_4', name: 'Set of 4', multiplier: 4, price: 520.0 },
    ],
    availability: {
      inStock: true,
      isLowStock: true,
      totalOnHand: 6,
      totalReserved: 2,
      sellableBaseUnits: 4,
      label: 'Low Stock (4 left)',
    },
    condition: 'NEW_SURPLUS',
    tyreSpec: {
      sectionWidth: 225,
      aspectRatio: 40,
      rimDiameter: 18,
      loadIndex: 92,
      speedRating: 'Y',
      season: 'SUMMER',
      terrainType: 'PERFORMANCE',
      runFlat: true,
    },
    fitmentSummary: {
      makes: ['Audi', 'Volkswagen', 'Mercedes-Benz'],
      models: ['S3', 'Golf R', 'A-Class'],
      verificationStatus: 'UNIVERSAL_FIT',
    },
  },
  {
    id: 'prod-tyre-4',
    sku: 'TYRE-PIR-215-55-17',
    title: 'Pirelli Cinturato P7 (P7C2)',
    slug: 'pirelli-cinturato-p7',
    brand: 'Pirelli',
    categoryName: 'Tyres',
    categorySlug: 'tyres',
    productType: 'BULK_QUANTITY',
    primaryImageUrl:
      'https://images.unsplash.com/photo-1543857778-c4a1a3e0b2eb?auto=format&fit=crop&w=600&q=80',
    minPrice: 128.0,
    maxPrice: 495.0,
    defaultPrice: 128.0,
    defaultSaleUnitCode: 'TYRE_SINGLE',
    defaultSaleUnitName: 'Single Tyre',
    availableSaleUnits: [
      { code: 'TYRE_SINGLE', name: 'Single Tyre', multiplier: 1, price: 128.0 },
      { code: 'TYRE_PAIR', name: 'Pair of 2', multiplier: 2, price: 250.0 },
      { code: 'TYRE_SET_OF_4', name: 'Set of 4', multiplier: 4, price: 485.0 },
    ],
    availability: {
      inStock: true,
      isLowStock: false,
      totalOnHand: 18,
      totalReserved: 0,
      sellableBaseUnits: 18,
      label: 'In Stock (18 available)',
    },
    condition: 'NEW_SURPLUS',
    tyreSpec: {
      sectionWidth: 215,
      aspectRatio: 55,
      rimDiameter: 17,
      loadIndex: 94,
      speedRating: 'W',
      season: 'SUMMER',
      terrainType: 'HIGHWAY',
      runFlat: false,
    },
    fitmentSummary: {
      makes: ['Subaru', 'Toyota', 'Honda'],
      models: ['Outback', 'Camry', 'Accord'],
      verificationStatus: 'UNIVERSAL_FIT',
    },
  },
  {
    id: 'prod-sb-1',
    sku: 'SB-FORD-TRAN-FL',
    title: 'Ford Transit Custom Front Driver 3-Point Pre-Tensioner Assembly',
    slug: 'ford-transit-custom-front-driver-seat-belt',
    brand: 'Ford',
    categoryName: 'Seat Belts',
    categorySlug: 'seat-belts',
    productType: 'INDIVIDUALLY_SERIALIZED',
    primaryImageUrl:
      'https://images.unsplash.com/photo-1596704017254-9b121068fb31?auto=format&fit=crop&w=800&q=80',
    minPrice: 89.0,
    maxPrice: 89.0,
    defaultPrice: 89.0,
    defaultSaleUnitCode: 'SB_COMPLETE',
    defaultSaleUnitName: 'Complete Unit',
    availableSaleUnits: [
      { code: 'SB_COMPLETE', name: 'Complete Assembly', multiplier: 1, price: 89.0 },
    ],
    availability: {
      inStock: true,
      isLowStock: true,
      totalOnHand: 1,
      totalReserved: 0,
      sellableBaseUnits: 1,
      label: '1 unique unit available',
    },
    condition: 'GRADE_A_LIKE_NEW',
    stockNumber: 'SB-2024-0891',
    seatBeltSpec: {
      position: 'FRONT_LEFT_DRIVER',
      componentType: 'RETRACTOR_ASSEMBLY',
      mountingPoints: 3,
      webbingColor: 'Black',
      oemReferenceTag: 'BK21-V611B08-AC',
    },
    fitmentSummary: {
      makes: ['Ford'],
      models: ['Transit Custom', 'Transit Tourneo'],
      yearRange: '2018–2023',
      verificationStatus: 'VERIFIED_OEM_DIRECT',
    },
  },
  {
    id: 'prod-sb-2',
    sku: 'SB-TOY-RAV4-FR',
    title: 'Toyota RAV4 5th Gen Front Passenger Seat Belt Assembly',
    slug: 'toyota-rav4-front-passenger-seat-belt',
    brand: 'Toyota',
    categoryName: 'Seat Belts',
    categorySlug: 'seat-belts',
    productType: 'INDIVIDUALLY_SERIALIZED',
    primaryImageUrl:
      'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=800&q=80',
    minPrice: 95.0,
    maxPrice: 95.0,
    defaultPrice: 95.0,
    defaultSaleUnitCode: 'SB_COMPLETE',
    defaultSaleUnitName: 'Complete Unit',
    availableSaleUnits: [
      { code: 'SB_COMPLETE', name: 'Complete Assembly', multiplier: 1, price: 95.0 },
    ],
    availability: {
      inStock: true,
      isLowStock: true,
      totalOnHand: 1,
      totalReserved: 0,
      sellableBaseUnits: 1,
      label: '1 unique unit available',
    },
    condition: 'GRADE_A_LIKE_NEW',
    stockNumber: 'SB-2024-0944',
    seatBeltSpec: {
      position: 'FRONT_RIGHT_PASSENGER',
      componentType: 'RETRACTOR_ASSEMBLY',
      mountingPoints: 3,
      webbingColor: 'Black',
      oemReferenceTag: '73210-42170',
    },
    fitmentSummary: {
      makes: ['Toyota'],
      models: ['RAV4 5th Gen (XA50)'],
      yearRange: '2018–Current',
      verificationStatus: 'VERIFIED_OEM_DIRECT',
    },
  },
  {
    id: 'prod-sb-3',
    sku: 'SB-BMW-3ER-RR',
    title: 'BMW 3 Series F30 / F31 Rear Right Outer Seat Belt Retractor',
    slug: 'bmw-3-series-f30-rear-right-seat-belt',
    brand: 'BMW',
    categoryName: 'Seat Belts',
    categorySlug: 'seat-belts',
    productType: 'INDIVIDUALLY_SERIALIZED',
    primaryImageUrl:
      'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=800&q=80',
    minPrice: 65.0,
    maxPrice: 65.0,
    defaultPrice: 65.0,
    defaultSaleUnitCode: 'SB_COMPLETE',
    defaultSaleUnitName: 'Complete Unit',
    availableSaleUnits: [
      { code: 'SB_COMPLETE', name: 'Complete Assembly', multiplier: 1, price: 65.0 },
    ],
    availability: {
      inStock: true,
      isLowStock: true,
      totalOnHand: 1,
      totalReserved: 0,
      sellableBaseUnits: 1,
      label: '1 unique unit available',
    },
    condition: 'GRADE_B_MINOR_WEAR',
    stockNumber: 'SB-2024-1012',
    seatBeltSpec: {
      position: 'REAR_RIGHT',
      componentType: 'RETRACTOR_ASSEMBLY',
      mountingPoints: 3,
      webbingColor: 'Black',
      oemReferenceTag: '72117259388',
    },
    fitmentSummary: {
      makes: ['BMW'],
      models: ['3 Series (F30 / F31)'],
      yearRange: '2012–2019',
      verificationStatus: 'VERIFIED_OEM_DIRECT',
    },
  },
];

export const SEED_VEHICLES: VehicleMakeOptionDto[] = [
  {
    id: 'make-toyota',
    name: 'Toyota',
    slug: 'toyota',
    models: [
      { id: 'mod-rav4', name: 'RAV4', slug: 'rav4', yearStart: 2018, yearEnd: null },
      { id: 'mod-hilux', name: 'HiLux', slug: 'hilux', yearStart: 2015, yearEnd: null },
      { id: 'mod-corolla', name: 'Corolla', slug: 'corolla', yearStart: 2018, yearEnd: null },
    ],
  },
  {
    id: 'make-ford',
    name: 'Ford',
    slug: 'ford',
    models: [
      { id: 'mod-ranger', name: 'Ranger', slug: 'ranger', yearStart: 2018, yearEnd: 2023 },
      {
        id: 'mod-transit',
        name: 'Transit Custom',
        slug: 'transit-custom',
        yearStart: 2018,
        yearEnd: 2023,
      },
    ],
  },
  {
    id: 'make-bmw',
    name: 'BMW',
    slug: 'bmw',
    models: [
      { id: 'mod-3er', name: '3 Series (F30)', slug: '3-series', yearStart: 2012, yearEnd: 2019 },
    ],
  },
  {
    id: 'make-vw',
    name: 'Volkswagen',
    slug: 'volkswagen',
    models: [{ id: 'mod-golf', name: 'Golf Mk7', slug: 'golf', yearStart: 2014, yearEnd: 2020 }],
  },
];

// ===========================================================================
// Client API Functions
// ===========================================================================

/**
 * Fetch filtered and paginated published products from NestJS Storefront API.
 */
export async function fetchStorefrontProducts(
  query: StorefrontSearchQuery,
): Promise<PaginatedResponse<StorefrontProductSummaryDto>> {
  const params = new URLSearchParams();
  if (query.search) params.set('search', query.search);
  if (query.categorySlug) params.set('categorySlug', query.categorySlug);
  if (query.brand) params.set('brand', query.brand);
  if (query.condition) params.set('condition', query.condition);
  if (query.inStockOnly !== undefined) params.set('inStockOnly', String(query.inStockOnly));
  if (query.minPrice !== undefined) params.set('minPrice', String(query.minPrice));
  if (query.maxPrice !== undefined) params.set('maxPrice', String(query.maxPrice));
  if (query.saleUnit) params.set('saleUnit', query.saleUnit);

  // Tyre specs
  if (query.sectionWidth) params.set('sectionWidth', String(query.sectionWidth));
  if (query.aspectRatio) params.set('aspectRatio', String(query.aspectRatio));
  if (query.rimDiameter) params.set('rimDiameter', String(query.rimDiameter));
  if (query.loadIndex) params.set('loadIndex', String(query.loadIndex));
  if (query.speedRating) params.set('speedRating', query.speedRating);
  if (query.season) params.set('season', query.season);
  if (query.terrainType) params.set('terrainType', query.terrainType);
  if (query.runFlat !== undefined) params.set('runFlat', String(query.runFlat));

  // Seat belt specs
  if (query.position) params.set('position', query.position);
  if (query.componentType) params.set('componentType', query.componentType);
  if (query.make) params.set('make', query.make);
  if (query.model) params.set('model', query.model);
  if (query.year) params.set('year', String(query.year));
  if (query.chassis) params.set('chassis', query.chassis);

  // Sort & Pagination
  if (query.sortBy) params.set('sortBy', query.sortBy);
  if (query.sortOrder) params.set('sortOrder', query.sortOrder);
  if (query.page) params.set('page', String(query.page));
  if (query.pageSize) params.set('pageSize', String(query.pageSize));

  try {
    const res = await fetch(`${API_BASE_URL}/storefront/products?${params.toString()}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      next: { revalidate: 60, tags: ['products'] },
    });

    if (res.ok) {
      return (await res.json()) as PaginatedResponse<StorefrontProductSummaryDto>;
    }
  } catch {
    // API is offline or in SSG prerender - execute filter logic in-memory with seed data
  }

  return filterSeedProductsInMemory(query);
}

/**
 * Fetch full published product detail by slug with comprehensive specifications,
 * inventory availability, fitment compatibility, and warehouse dispatch info (Deduplicated & Cached).
 */
export const fetchStorefrontProductBySlug = cache(
  async (slug: string): Promise<StorefrontProductDetailDto> => {
    try {
      const res = await fetch(`${API_BASE_URL}/storefront/products/${slug}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        next: { revalidate: 120, tags: ['products', `product-${slug}`] },
      });

      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback
    }

  const seed = SEED_STOREFRONT_PRODUCTS.find((p) => p.slug === slug);
  if (!seed) {
    throw new Error(`Product '${slug}' not found`);
  }

  const isTyre = seed.categorySlug === 'tyres' || seed.productType === 'BULK_QUANTITY';

  // Seed fitments
  const fitments: ProductFitmentDetailDto[] = isTyre
    ? [
        {
          id: 'fit-t-1',
          make: 'Volkswagen',
          model: 'Golf',
          generation: 'Golf Mk7 (5G)',
          yearRange: '2012–2020',
          chassisCode: '5G1',
          bodyType: 'Hatchback 5-Door',
          engineSpec: '2.0 TDI / TSI',
          verificationStatus: 'UNIVERSAL_FIT',
          isOemDirect: false,
          fitmentNotes: 'Standard factory wheel fitment on 16/17" alloy wheels.',
        },
        {
          id: 'fit-t-2',
          make: 'Audi',
          model: 'A3',
          generation: 'A3 8V',
          yearRange: '2013–2020',
          chassisCode: '8VA',
          bodyType: 'Sportback',
          engineSpec: '1.4 / 2.0 TFSI',
          verificationStatus: 'UNIVERSAL_FIT',
          isOemDirect: false,
          fitmentNotes: 'Factory homologation tyre size for standard trim levels.',
        },
        {
          id: 'fit-t-3',
          make: 'BMW',
          model: '3 Series',
          generation: 'F30 Sedan',
          yearRange: '2012–2019',
          chassisCode: '3D32',
          bodyType: 'Sedan',
          engineSpec: '320i / 320d',
          verificationStatus: 'UNIVERSAL_FIT',
          isOemDirect: false,
          fitmentNotes: 'Recommended front & rear square tyre configuration.',
        },
      ]
    : [
        {
          id: 'fit-sb-1',
          make: seed.brand === 'Ford' ? 'Ford' : seed.brand === 'Toyota' ? 'Toyota' : 'BMW',
          model:
            seed.brand === 'Ford'
              ? 'Transit Custom'
              : seed.brand === 'Toyota'
                ? 'RAV4'
                : '3 Series',
          generation:
            seed.brand === 'Ford'
              ? 'VN Series (2018–2023)'
              : seed.brand === 'Toyota'
                ? 'XA50 (2018–Current)'
                : 'F30 / F31 (2012–2019)',
          yearRange:
            seed.brand === 'Ford'
              ? '2018–2023'
              : seed.brand === 'Toyota'
                ? '2018–Current'
                : '2012–2019',
          chassisCode: seed.brand === 'Ford' ? 'TTG' : seed.brand === 'Toyota' ? 'AXAH54' : '3D32',
          bodyType:
            seed.brand === 'Ford'
              ? 'Van / Crew Cab'
              : seed.brand === 'Toyota'
                ? 'SUV 5dr'
                : 'Sedan',
          engineSpec:
            seed.brand === 'Ford'
              ? '2.0L EcoBlue Diesel'
              : seed.brand === 'Toyota'
                ? '2.5L Hybrid AWD'
                : '2.0L Turbo Diesel',
          verificationStatus: 'VERIFIED_OEM_DIRECT',
          isOemDirect: true,
          fitmentNotes:
            'Guaranteed direct OEM bolt-in replacement with matching factory bolt pattern and SRS connector pinout.',
        },
      ];

  // Serialized item details (for seat belts / used parts)
  const serializedItem: SerializedItemDetailDto | undefined = !isTyre
    ? {
        id: 'ser-unit-01',
        stockBarcode: seed.stockNumber || 'SB-2024-0891',
        conditionGrade: seed.condition,
        conditionNotes:
          'Dismantled from low-km collision-free vehicle. Webbing is supple with zero fraying or UV discolouration. Inertia locking ratchet activates instantly upon sudden deceleration test. Pyro pretensioner circuit tested with digital multimeter: 2.2Ω (Factory spec 2.1–2.4Ω).',
        status: 'AVAILABLE',
        actualPhotos: [
          seed.primaryImageUrl || '',
          'https://images.unsplash.com/photo-1596704017254-9b121068fb31?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=800&q=80',
        ],
        donorVin:
          seed.brand === 'Ford'
            ? 'WF0YXXTTGYKB19824'
            : seed.brand === 'Toyota'
              ? 'JTMZAAAA5MD082914'
              : 'WBA3D32080F812491',
        donorVehicleDesc:
          seed.brand === 'Ford'
            ? '2021 Ford Transit Custom 2.0L EcoBlue (64,200 km, White)'
            : seed.brand === 'Toyota'
              ? '2020 Toyota RAV4 GX Hybrid AWD (41,800 km, Silver)'
              : '2017 BMW 320d F30 LCI Sedan (52,100 km, Grey)',
        resistanceOhms: 2.2,
        warehouseLocation: 'Penrose Auckland Depot Bay B-04 / Shelf S-02',
      }
    : undefined;

  // Meaningful related products
  const relatedProducts: RelatedProductDto[] = isTyre
    ? [
        {
          id: 'prod-tyre-2',
          sku: 'TYRE-CON-205-55-16',
          title: 'Continental UltraContact Touring',
          slug: 'continental-ultracontact',
          brand: 'Continental',
          categorySlug: 'tyres',
          defaultPrice: 112.5,
          primaryImageUrl:
            'https://images.unsplash.com/photo-1543857778-c4a1a3e0b2eb?auto=format&fit=crop&w=600&q=80',
          relationReason: 'Alternative Touring Compound',
          inStock: true,
        },
        {
          id: 'prod-tyre-3',
          sku: 'TYRE-GOO-225-40-18',
          title: 'Goodyear Eagle F1 Asymmetric 5',
          slug: 'goodyear-eagle-f1-asymmetric-5',
          brand: 'Goodyear',
          categorySlug: 'tyres',
          defaultPrice: 138.0,
          primaryImageUrl:
            'https://images.unsplash.com/photo-1578844251758-2f71da64c96f?auto=format&fit=crop&w=600&q=80',
          relationReason: 'High-Performance Alternative',
          inStock: true,
        },
      ]
    : [
        {
          id: 'prod-sb-2',
          sku: 'SB-TOY-RAV4-FR',
          title: 'Toyota RAV4 5th Gen Front Passenger Seat Belt Assembly',
          slug: 'toyota-rav4-front-passenger-seat-belt',
          brand: 'Toyota',
          categorySlug: 'seat-belts',
          defaultPrice: 95.0,
          primaryImageUrl:
            'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=800&q=80',
          relationReason: 'Opposite Side Assembly',
          inStock: true,
        },
      ];

  const allMedia = [
    {
      cdnUrl: seed.primaryImageUrl || '',
      altText: `${seed.title} — Front View`,
      isPrimary: true,
      displayOrder: 0,
    },
    {
      cdnUrl: isTyre
        ? 'https://images.unsplash.com/photo-1543857778-c4a1a3e0b2eb?auto=format&fit=crop&w=800&q=80'
        : 'https://images.unsplash.com/photo-1596704017254-9b121068fb31?auto=format&fit=crop&w=800&q=80',
      altText: isTyre ? 'Tyre Tread Depth & Sipe Detail' : 'Restraint Webbing & Latch Detail',
      isPrimary: false,
      displayOrder: 1,
    },
    {
      cdnUrl: isTyre
        ? 'https://images.unsplash.com/photo-1607860108855-64acf2078ed9?auto=format&fit=crop&w=800&q=80'
        : 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=800&q=80',
      altText: isTyre ? 'Warehouse Rack Storage & DOT Code' : 'Mechanic Ohm-Meter Bench Test',
      isPrimary: false,
      displayOrder: 2,
    },
  ];

  return {
    ...seed,
    description: isTyre
      ? `Original commercial grade tyre imported directly from authorized distributors. Engineered for longevity, wet braking grip, and lower rolling resistance. Full factory 8.0mm tread depth with fresh DOT manufacture date codes. Drive-in fitting & balancing available at our Penrose workshop bays for $25/corner.`
      : `Individually serialized automotive restraint component salvaged from low-kilometre donor vehicle. The pyrotechnic pretensioner circuit has been continuity tested with a digital multimeter, reading within OEM standard 2.1–2.4Ω. Webbing inspected under 500-lumen inspection lighting for cuts, edge fraying, or chemical contamination. Barcode-tagged and stored in climate-controlled shelving.`,
    currency: 'NZD',
    allMedia,
    fitments,
    serializedItem,
    warehouseLocation: {
      name: 'Auckland Central Fulfillment Centre (Penrose)',
      depotCode: 'AKL-CENTRAL',
      bay: isTyre ? 'Rack T-12 / Bay 4' : 'Depot Bay B-04 / Shelf S-02',
      pickupAvailable: true,
      pickupLeadTime: 'Ready in 30 minutes for trade collection',
    },
    shippingInfo: {
      standardDispatch:
        'Orders confirmed before 2:00 PM NZST dispatch same day via CourierPost or Mainfreight Express.',
      expressCourier:
        'Overnight / 1–2 business days courier freight across North and South Island metro hubs.',
      cutoffTimeAEST: '14:00',
    },
    warrantyAndReturns: {
      warrantyDays: 30,
      returnPolicy:
        '30-day workshop replacement guarantee. Parts must be returned uninstalled with intact warranty tamper stickers and barcode scan tags.',
      srsDisclaimer: !isTyre
        ? 'SRS / Airbag safety systems should be installed by a licensed automotive technician with the 12V battery disconnected.'
        : undefined,
    },
    relatedProducts,
  };
});

/**
 * Fetch filter metadata (brands, price range, tyre dimensions, seat belt options) (Deduplicated & Cached).
 */
export const fetchStorefrontFilterMeta = cache(
  async (categorySlug?: string): Promise<StorefrontFilterMetaDto> => {
    try {
      const url = categorySlug
        ? `${API_BASE_URL}/storefront/filters/meta?categorySlug=${categorySlug}`
        : `${API_BASE_URL}/storefront/filters/meta`;
      const res = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        next: { revalidate: 300, tags: ['filter-meta'] },
      });

      if (res.ok) {
        return (await res.json()) as StorefrontFilterMetaDto;
      }
    } catch {
      // Fallback
    }

    return {
      brands: ['Continental', 'Goodyear', 'Michelin', 'Pirelli', 'Ford', 'Toyota', 'BMW'],
      priceRange: { min: 65, max: 560 },
      tyreFilters: {
        widths: [195, 205, 215, 225],
        profiles: [40, 45, 55, 65],
        rimDiameters: [15, 16, 17, 18],
        speedRatings: ['V', 'W', 'Y'],
        seasons: ['SUMMER', 'ALL_SEASON'],
        terrainTypes: ['HIGHWAY', 'PERFORMANCE'],
      },
      seatBeltFilters: {
        positions: ['FRONT_LEFT_DRIVER', 'FRONT_RIGHT_PASSENGER', 'REAR_RIGHT', 'REAR_LEFT'],
        componentTypes: ['RETRACTOR_ASSEMBLY', 'BUCKLE_STALK', 'COMPLETE_ASSEMBLY'],
        conditionGrades: ['NEW_SURPLUS', 'GRADE_A_LIKE_NEW', 'GRADE_B_MINOR_WEAR'],
        makes: ['Toyota', 'Ford', 'BMW', 'Volkswagen'],
        models: ['RAV4', 'Transit Custom', '3 Series (F30)', 'Golf Mk7'],
      },
    };
  },
);

/**
 * Fetch vehicle hierarchy makes and models (Deduplicated & Cached).
 */
export const fetchStorefrontVehicles = cache(
  async (): Promise<VehicleMakeOptionDto[]> => {
    try {
      const res = await fetch(`${API_BASE_URL}/storefront/vehicles`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        next: { revalidate: 1800, tags: ['vehicles'] },
      });

      if (res.ok) {
        return (await res.json()) as VehicleMakeOptionDto[];
      }
    } catch {
      // Fallback
    }

    return SEED_VEHICLES;
  },
);

// ===========================================================================
// In-Memory Seed Data Filter (for offline SSR / SSG)
// ===========================================================================

function filterSeedProductsInMemory(
  query: StorefrontSearchQuery,
): PaginatedResponse<StorefrontProductSummaryDto> {
  let list = [...SEED_STOREFRONT_PRODUCTS];

  // Category
  if (query.categorySlug) {
    list = list.filter((p) => p.categorySlug === query.categorySlug);
  }

  // Text search
  if (query.search && query.search.trim()) {
    const term = query.search.toLowerCase().trim();
    list = list.filter(
      (p) =>
        p.title.toLowerCase().includes(term) ||
        p.sku.toLowerCase().includes(term) ||
        p.brand.toLowerCase().includes(term) ||
        (p.stockNumber && p.stockNumber.toLowerCase().includes(term)),
    );
  }

  // Brand
  if (query.brand) {
    list = list.filter((p) => p.brand.toLowerCase() === query.brand?.toLowerCase());
  }

  // Condition
  if (query.condition) {
    list = list.filter((p) => p.condition === query.condition);
  }

  // In stock only
  if (query.inStockOnly) {
    list = list.filter((p) => p.availability.inStock);
  }

  // Price
  if (query.minPrice !== undefined) {
    list = list.filter((p) => p.defaultPrice >= (query.minPrice ?? 0));
  }
  if (query.maxPrice !== undefined) {
    list = list.filter((p) => p.defaultPrice <= (query.maxPrice ?? 999999));
  }

  // Tyre filters
  if (query.sectionWidth) {
    list = list.filter((p) => p.tyreSpec?.sectionWidth === Number(query.sectionWidth));
  }
  if (query.aspectRatio) {
    list = list.filter((p) => p.tyreSpec?.aspectRatio === Number(query.aspectRatio));
  }
  if (query.rimDiameter) {
    list = list.filter((p) => p.tyreSpec?.rimDiameter === Number(query.rimDiameter));
  }
  if (query.speedRating) {
    list = list.filter((p) => p.tyreSpec?.speedRating === query.speedRating);
  }
  if (query.season) {
    list = list.filter((p) => p.tyreSpec?.season === query.season);
  }
  if (query.terrainType) {
    list = list.filter((p) => p.tyreSpec?.terrainType === query.terrainType);
  }
  if (query.runFlat !== undefined) {
    list = list.filter((p) => p.tyreSpec?.runFlat === query.runFlat);
  }

  // Seat belt filters
  if (query.position) {
    list = list.filter((p) => p.seatBeltSpec?.position === query.position);
  }
  if (query.componentType) {
    list = list.filter((p) => p.seatBeltSpec?.componentType === query.componentType);
  }
  if (query.make) {
    list = list.filter((p) =>
      p.fitmentSummary?.makes.some((m) => m.toLowerCase().includes(query.make!.toLowerCase())),
    );
  }
  if (query.model) {
    list = list.filter((p) =>
      p.fitmentSummary?.models.some((m) => m.toLowerCase().includes(query.model!.toLowerCase())),
    );
  }

  // Sorting
  if (query.sortBy === 'price_asc') {
    list.sort((a, b) => a.defaultPrice - b.defaultPrice);
  } else if (query.sortBy === 'price_desc') {
    list.sort((a, b) => b.defaultPrice - a.defaultPrice);
  } else if (query.sortBy === 'title') {
    list.sort((a, b) => a.title.localeCompare(b.title));
  }

  // Pagination
  const page = Number(query.page) || 1;
  const pageSize = Number(query.pageSize) || 12;
  const total = list.length;
  const totalPages = Math.ceil(total / pageSize) || 1;
  const paginated = list.slice((page - 1) * pageSize, page * pageSize);

  return {
    data: paginated,
    meta: {
      page,
      pageSize,
      total,
      totalPages,
    },
  };
}
