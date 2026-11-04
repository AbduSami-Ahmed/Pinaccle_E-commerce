/**
 * Fitment & Vehicle Finder Client API (Phase 8)
 *
 * Connects to NestJS Fitment endpoints (/api/fitment/* and /api/admin/fitment/*)
 * with robust offline/static seed fallback.
 */

import {
  FitmentSearchQuery,
  FitmentSearchResultDto,
  PaginatedResponse,
  ProductFitmentDto,
  VehicleChassisDto,
  VehicleMakeDto,
  VehicleModelDto,
  CreateProductFitmentRequest,
  UpdateFitmentVerificationRequest,
} from '@pinnacle/contracts';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// ===========================================================================
// Seed Fallback Vehicle Taxonomy
// ===========================================================================

export const SEED_MAKES: VehicleMakeDto[] = [
  { id: 'make-toyota', name: 'Toyota', slug: 'toyota', modelsCount: 3 },
  { id: 'make-ford', name: 'Ford', slug: 'ford', modelsCount: 2 },
  { id: 'make-bmw', name: 'BMW', slug: 'bmw', modelsCount: 1 },
  { id: 'make-vw', name: 'Volkswagen', slug: 'volkswagen', modelsCount: 1 },
];

export const SEED_MODELS: Record<string, VehicleModelDto[]> = {
  toyota: [
    {
      id: 'model-rav4',
      makeId: 'make-toyota',
      makeName: 'Toyota',
      name: 'RAV4',
      slug: 'rav4',
      yearsRange: '2018–Current',
    },
    {
      id: 'model-hilux',
      makeId: 'make-toyota',
      makeName: 'Toyota',
      name: 'HiLux',
      slug: 'hilux',
      yearsRange: '2015–Current',
    },
    {
      id: 'model-corolla',
      makeId: 'make-toyota',
      makeName: 'Toyota',
      name: 'Corolla',
      slug: 'corolla',
      yearsRange: '2018–Current',
    },
  ],
  ford: [
    {
      id: 'model-ranger',
      makeId: 'make-ford',
      makeName: 'Ford',
      name: 'Ranger',
      slug: 'ranger',
      yearsRange: '2018–2023',
    },
    {
      id: 'model-transit',
      makeId: 'make-ford',
      makeName: 'Ford',
      name: 'Transit Custom',
      slug: 'transit-custom',
      yearsRange: '2018–2023',
    },
  ],
  bmw: [
    {
      id: 'model-3er',
      makeId: 'make-bmw',
      makeName: 'BMW',
      name: '3 Series (F30)',
      slug: '3-series',
      yearsRange: '2012–2019',
    },
  ],
  volkswagen: [
    {
      id: 'model-golf',
      makeId: 'make-vw',
      makeName: 'Volkswagen',
      name: 'Golf Mk7',
      slug: 'golf',
      yearsRange: '2014–2020',
    },
  ],
};

export const SEED_CHASSIS: Record<string, VehicleChassisDto[]> = {
  rav4: [
    {
      id: 'chassis-axah54',
      generationId: 'gen-xa50',
      generationName: '5th Gen (XA50)',
      chassisCode: 'AXAH54',
      bodyType: 'SUV 5-Door',
      engineSpec: '2.5L Hybrid AWD (A25A-FXS)',
      yearStart: 2018,
      yearEnd: null,
      makeName: 'Toyota',
      modelName: 'RAV4',
    },
    {
      id: 'chassis-mxaa52',
      generationId: 'gen-xa50',
      generationName: '5th Gen (XA50)',
      chassisCode: 'MXAA52',
      bodyType: 'SUV 5-Door',
      engineSpec: '2.0L Petrol FWD (M20A-FKS)',
      yearStart: 2018,
      yearEnd: null,
      makeName: 'Toyota',
      modelName: 'RAV4',
    },
  ],
  'transit-custom': [
    {
      id: 'chassis-transit-vn',
      generationId: 'gen-transit-v362',
      generationName: '1st Gen (V362)',
      chassisCode: 'VN',
      bodyType: 'Van / Commercial',
      engineSpec: '2.0L TDCi EcoBlue',
      yearStart: 2018,
      yearEnd: 2023,
      makeName: 'Ford',
      modelName: 'Transit Custom',
    },
  ],
  ranger: [
    {
      id: 'chassis-ranger-px3',
      generationId: 'gen-ranger-t6',
      generationName: 'PX MkIII',
      chassisCode: 'PX3',
      bodyType: 'Dual Cab Ute 4x4',
      engineSpec: '2.0L Bi-Turbo Diesel',
      yearStart: 2018,
      yearEnd: 2022,
      makeName: 'Ford',
      modelName: 'Ranger',
    },
  ],
};

// ===========================================================================
// Public Customer Fitment API
// ===========================================================================

export async function fetchVehicleMakes(search?: string): Promise<VehicleMakeDto[]> {
  try {
    const url = search
      ? `${API_BASE_URL}/fitment/makes?search=${encodeURIComponent(search)}`
      : `${API_BASE_URL}/fitment/makes`;
    const res = await fetch(url, { cache: 'no-store' });
    if (res.ok) return await res.json();
  } catch {
    // Fallback
  }

  if (search) {
    const term = search.toLowerCase();
    return SEED_MAKES.filter((m) => m.name.toLowerCase().includes(term));
  }
  return SEED_MAKES;
}

export async function fetchVehicleModels(make: string): Promise<VehicleModelDto[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/fitment/models?make=${encodeURIComponent(make)}`, {
      cache: 'no-store',
    });
    if (res.ok) return await res.json();
  } catch {
    // Fallback
  }

  return SEED_MODELS[make.toLowerCase()] || [];
}

export async function fetchVehicleYears(
  model: string,
): Promise<{ years: number[]; generations: { id: string; name: string; range: string }[] }> {
  try {
    const res = await fetch(`${API_BASE_URL}/fitment/years?model=${encodeURIComponent(model)}`, {
      cache: 'no-store',
    });
    if (res.ok) return await res.json();
  } catch {
    // Fallback
  }

  const currentYear = new Date().getFullYear();
  const years = [];
  for (let y = currentYear + 1; y >= 2012; y--) {
    years.push(y);
  }
  return {
    years,
    generations: [{ id: 'gen-default', name: 'Standard Series', range: '2012–Current' }],
  };
}

export async function fetchVehicleVariants(
  model: string,
  year?: number,
): Promise<VehicleChassisDto[]> {
  try {
    const url = year
      ? `${API_BASE_URL}/fitment/variants?model=${encodeURIComponent(model)}&year=${year}`
      : `${API_BASE_URL}/fitment/variants?model=${encodeURIComponent(model)}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (res.ok) return await res.json();
  } catch {
    // Fallback
  }

  return SEED_CHASSIS[model.toLowerCase()] || [];
}

export async function searchVehicleFitment(
  query: FitmentSearchQuery,
): Promise<PaginatedResponse<FitmentSearchResultDto>> {
  const params = new URLSearchParams();
  if (query.make) params.set('make', query.make);
  if (query.model) params.set('model', query.model);
  if (query.year) params.set('year', String(query.year));
  if (query.chassisCode) params.set('chassisCode', query.chassisCode);
  if (query.chassisId) params.set('chassisId', query.chassisId);
  if (query.categorySlug) params.set('categorySlug', query.categorySlug);
  if (query.minConfidence) params.set('minConfidence', query.minConfidence);
  if (query.page) params.set('page', String(query.page));
  if (query.pageSize) params.set('pageSize', String(query.pageSize));

  try {
    const res = await fetch(`${API_BASE_URL}/fitment/search?${params.toString()}`, {
      cache: 'no-store',
    });
    if (res.ok) return await res.json();
  } catch {
    // Fallback
  }

  // Fallback demo results
  return {
    data: [
      {
        fitmentConfidence: 'CONFIRMED_EXACT',
        verificationStatus: 'VERIFIED_OEM_DIRECT',
        matchedChassisCode: 'AXAH54',
        matchedVehicleName: `${query.make || 'Toyota'} ${query.model || 'RAV4'} (${query.year || 2021})`,
        fitmentNotes:
          'Direct factory replacement for AXAH54 AWD Hybrid and MXAA52 2.0L Petrol models.',
        isOemDirect: true,
        product: {
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
          },
          fitmentSummary: {
            makes: ['Toyota'],
            models: ['RAV4 5th Gen'],
            yearRange: '2018–Current',
            verificationStatus: 'VERIFIED_OEM_DIRECT',
          },
        },
      },
      {
        fitmentConfidence: 'UNIVERSAL_COMPATIBLE',
        verificationStatus: 'UNIVERSAL_FIT',
        matchedChassisCode: 'AXAH54',
        matchedVehicleName: `${query.make || 'Toyota'} ${query.model || 'RAV4'}`,
        fitmentNotes: 'Standard factory OE tyre specification for base 16-inch alloy variants.',
        isOemDirect: false,
        product: {
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
            makes: ['Toyota'],
            models: ['Corolla', 'RAV4'],
            verificationStatus: 'UNIVERSAL_FIT',
          },
        },
      },
    ],
    meta: { page: 1, pageSize: 12, total: 2, totalPages: 1 },
  };
}

// ===========================================================================
// Admin Fitment Management API
// ===========================================================================

export async function fetchAdminFitments(
  token?: string,
  search?: string,
  verificationStatus?: string,
): Promise<PaginatedResponse<ProductFitmentDto>> {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (verificationStatus && verificationStatus !== 'ALL')
    params.set('verificationStatus', verificationStatus);

  try {
    const res = await fetch(`${API_BASE_URL}/admin/fitment?${params.toString()}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: 'no-store',
    });
    if (res.ok) return await res.json();
  } catch {
    // Fallback
  }

  return {
    data: [
      {
        id: 'fit-1',
        productId: 'prod-sb-2',
        productTitle: 'Toyota RAV4 5th Gen Front Passenger Seat Belt Assembly',
        productSku: 'SB-TOY-RAV4-FR',
        productBrand: 'Toyota',
        productCategory: 'Seat Belts',
        categorySlug: 'seat-belts',
        vehicleChassisId: 'chassis-axah54',
        vehicleMake: 'Toyota',
        vehicleModel: 'RAV4',
        vehicleGeneration: '5th Gen (XA50)',
        vehicleChassisCode: 'AXAH54',
        yearRange: '2018–Current',
        verificationStatus: 'VERIFIED_OEM_DIRECT',
        fitmentNotes:
          'Direct factory replacement for AXAH54 AWD Hybrid and MXAA52 2.0L Petrol models.',
        verifiedByUserId: 'usr-admin-1',
        verifiedByName: 'Sarah Admin',
        verifiedAt: '2026-01-15T09:30:00Z',
        createdAt: '2026-01-15T09:30:00Z',
      },
      {
        id: 'fit-2',
        productId: 'prod-tyre-2',
        productTitle: 'Continental UltraContact Touring',
        productSku: 'TYRE-CON-205-55-16',
        productBrand: 'Continental',
        productCategory: 'Tyres',
        categorySlug: 'tyres',
        vehicleChassisId: 'chassis-axah54',
        vehicleMake: 'Toyota',
        vehicleModel: 'RAV4',
        vehicleGeneration: '5th Gen (XA50)',
        vehicleChassisCode: 'AXAH54',
        yearRange: '2018–Current',
        verificationStatus: 'UNIVERSAL_FIT',
        fitmentNotes: 'Standard factory OE tyre specification for base 16-inch alloy variants.',
        verifiedByUserId: 'usr-admin-1',
        verifiedByName: 'Sarah Admin',
        verifiedAt: '2026-01-16T11:00:00Z',
        createdAt: '2026-01-16T11:00:00Z',
      },
      {
        id: 'fit-3',
        productId: 'prod-sb-1',
        productTitle: 'Ford Transit Custom Front Driver 3-Point Pre-Tensioner Assembly',
        productSku: 'SB-FORD-TRAN-FL',
        productBrand: 'Ford',
        productCategory: 'Seat Belts',
        categorySlug: 'seat-belts',
        vehicleChassisId: 'chassis-transit-vn',
        vehicleMake: 'Ford',
        vehicleModel: 'Transit Custom',
        vehicleGeneration: '1st Gen (V362)',
        vehicleChassisCode: 'VN',
        yearRange: '2018–2023',
        verificationStatus: 'VERIFIED_OEM_DIRECT',
        fitmentNotes: 'Verified OEM parts catalog match tag BK21-V611B08-AC.',
        verifiedByUserId: 'usr-admin-1',
        verifiedByName: 'Sarah Admin',
        verifiedAt: '2026-01-18T14:20:00Z',
        createdAt: '2026-01-18T14:20:00Z',
      },
    ],
    meta: { page: 1, pageSize: 20, total: 3, totalPages: 1 },
  };
}

export async function createAdminFitment(
  token: string,
  payload: CreateProductFitmentRequest,
): Promise<ProductFitmentDto> {
  const res = await fetch(`${API_BASE_URL}/admin/fitment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to create fitment mapping');
  }
  return await res.json();
}

export async function updateAdminFitmentVerification(
  token: string,
  id: string,
  payload: UpdateFitmentVerificationRequest,
): Promise<ProductFitmentDto> {
  const res = await fetch(`${API_BASE_URL}/admin/fitment/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to update fitment verification');
  }
  return await res.json();
}

export async function deleteAdminFitment(
  token: string,
  id: string,
): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE_URL}/admin/fitment/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    throw new Error('Failed to delete fitment record');
  }
  return await res.json();
}
