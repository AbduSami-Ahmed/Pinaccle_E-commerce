import {
  CategoryDto,
  PaginatedResponse,
  PresignedUploadRequest,
  PresignedUploadResponse,
  ProductDto,
  ProductListItemDto,
  ProductListQuery,
  ProductStatus,
} from '@pinnacle/contracts';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

// Safe demo fallbacks for development / disconnected states
export const fallbackCategories: CategoryDto[] = [
  {
    id: 'cat-tyres-001',
    parentId: null,
    slug: 'tyres',
    name: 'Tyres',
    description: 'Passenger, SUV, and commercial road tyres',
    displayOrder: 1,
    isActive: true,
  },
  {
    id: 'cat-seat-belts-002',
    parentId: null,
    slug: 'seat-belts',
    name: 'Seat Belts',
    description: 'OEM replacement seat belts, pretensioners, and buckles',
    displayOrder: 2,
    isActive: true,
  },
];

export const fallbackProducts: ProductListItemDto[] = [
  {
    id: 'prod-tyre-001',
    sku: 'TYR-MICH-2254517-PS5',
    title: 'Michelin Pilot Sport 5 (225/45 R17 94Y XL)',
    slug: 'michelin-pilot-sport-5-225-45-r17',
    brand: 'Michelin',
    categoryName: 'Tyres',
    categorySlug: 'tyres',
    productType: 'BULK_QUANTITY',
    status: 'PUBLISHED',
    primaryImageUrl:
      'https://images.unsplash.com/photo-1578844251758-2f71da64c96f?auto=format&fit=crop&w=600&q=80',
    basePrice: '165.00',
    createdAt: '2026-03-01T10:00:00.000Z',
    updatedAt: '2026-03-01T10:00:00.000Z',
  },
  {
    id: 'prod-tyre-002',
    sku: 'TYR-CONT-2055516-PC6',
    title: 'Continental PremiumContact 6 (205/55 R16 91V)',
    slug: 'continental-premiumcontact-6-205-55-r16',
    brand: 'Continental',
    categoryName: 'Tyres',
    categorySlug: 'tyres',
    productType: 'BULK_QUANTITY',
    status: 'PUBLISHED',
    primaryImageUrl:
      'https://images.unsplash.com/photo-1543465077-db45d34b88a5?auto=format&fit=crop&w=600&q=80',
    basePrice: '125.00',
    createdAt: '2026-03-02T11:30:00.000Z',
    updatedAt: '2026-03-02T11:30:00.000Z',
  },
  {
    id: 'prod-sblt-003',
    sku: 'SBLT-TOY-RAV4-FR-001',
    title: 'Toyota RAV4 Front Right Driver Seat Belt Retractor (2019-2024)',
    slug: 'toyota-rav4-front-right-driver-seat-belt-retractor-2019-2024',
    brand: 'Toyota',
    categoryName: 'Seat Belts',
    categorySlug: 'seat-belts',
    productType: 'INDIVIDUALLY_SERIALIZED',
    status: 'PUBLISHED',
    primaryImageUrl:
      'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=600&q=80',
    basePrice: '185.00',
    createdAt: '2026-03-03T14:15:00.000Z',
    updatedAt: '2026-03-03T14:15:00.000Z',
  },
  {
    id: 'prod-sblt-004',
    sku: 'SBLT-FRD-RANG-FL-002',
    title: 'Ford Ranger Front Left Passenger Seat Belt Stalk Assembly (2022-2025)',
    slug: 'ford-ranger-front-left-passenger-seat-belt-stalk-2022-2025',
    brand: 'Ford',
    categoryName: 'Seat Belts',
    categorySlug: 'seat-belts',
    productType: 'INDIVIDUALLY_SERIALIZED',
    status: 'DRAFT',
    primaryImageUrl: null,
    basePrice: '95.00',
    createdAt: '2026-03-04T09:00:00.000Z',
    updatedAt: '2026-03-04T09:00:00.000Z',
  },
];

export async function fetchCategories(): Promise<CategoryDto[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/categories?flat=true`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error('Failed to fetch categories');
    return await res.json();
  } catch {
    return fallbackCategories;
  }
}

export async function fetchProducts(
  query: ProductListQuery = {},
): Promise<PaginatedResponse<ProductListItemDto>> {
  const params = new URLSearchParams();
  if (query.search) params.set('search', query.search);
  if (query.categoryId) params.set('categoryId', query.categoryId);
  if (query.status) params.set('status', query.status);
  if (query.brand) params.set('brand', query.brand);
  if (query.productType) params.set('productType', query.productType);
  if (query.page) params.set('page', query.page.toString());
  if (query.pageSize) params.set('pageSize', query.pageSize.toString());
  if (query.sortBy) params.set('sortBy', query.sortBy);
  if (query.sortOrder) params.set('sortOrder', query.sortOrder);

  try {
    const res = await fetch(`${API_BASE_URL}/products?${params.toString()}`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) throw new Error('Failed to fetch products');
    return await res.json();
  } catch {
    // Client-side filtering on fallback data
    let filtered = [...fallbackProducts];

    if (query.search) {
      const q = query.search.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q),
      );
    }
    if (query.categoryId) {
      filtered = filtered.filter(
        (p) => p.categorySlug === query.categoryId || p.id === query.categoryId,
      );
    }
    if (query.status) {
      filtered = filtered.filter((p) => p.status === query.status);
    }
    if (query.productType) {
      filtered = filtered.filter((p) => p.productType === query.productType);
    }

    return {
      data: filtered,
      meta: {
        page: 1,
        pageSize: 20,
        total: filtered.length,
        totalPages: 1,
      },
    };
  }
}

export async function fetchProductById(idOrSlug: string): Promise<ProductDto | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/products/${idOrSlug}`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error('Product not found');
    return await res.json();
  } catch {
    // Generate fallback mock detail
    const item = fallbackProducts.find((p) => p.id === idOrSlug || p.slug === idOrSlug);
    if (!item) return null;

    return {
      id: item.id,
      categoryId: item.categorySlug === 'tyres' ? 'cat-tyres-001' : 'cat-seat-belts-002',
      sku: item.sku,
      title: item.title,
      slug: item.slug,
      brand: item.brand,
      description: `High quality OEM replacement ${item.categoryName.toLowerCase()} engineered to exceed safety benchmarks.`,
      productType: item.productType,
      status: item.status,
      media: item.primaryImageUrl
        ? [
            {
              id: 'med-1',
              s3Key: 'products/sample-1.jpg',
              cdnUrl: item.primaryImageUrl,
              altText: `${item.title} hero perspective`,
              displayOrder: 0,
              isPrimary: true,
            },
          ]
        : [],
      saleUnits: [
        {
          id: 'su-1',
          code: item.categorySlug === 'tyres' ? 'TYRE_SINGLE' : 'UNIT',
          name: item.categorySlug === 'tyres' ? 'Single Tyre' : 'Single Unit',
          baseQuantityMultiplier: 1,
          retailPrice: item.basePrice ?? '150.00',
          compareAtPrice: null,
          isDefault: true,
          isActive: true,
        },
      ],
      tyreSpecification:
        item.categorySlug === 'tyres'
          ? {
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
            }
          : null,
      seatBeltSpecification:
        item.categorySlug === 'seat-belts'
          ? {
              position: 'FRONT_RIGHT_PASSENGER',
              componentType: 'RETRACTOR_ASSEMBLY',
              pretensionerType: 'PYROTECHNIC',
              webbingColor: 'Black',
              mountingPoints: 3,
              oemReferenceTag: '73210-42210',
            }
          : null,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }
}

export async function createProduct(payload: any): Promise<ProductDto> {
  const res = await fetch(`${API_BASE_URL}/products`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ message: 'Failed to create product' }));
    const msg = Array.isArray(errorBody.message) ? errorBody.message.join(', ') : errorBody.message;
    throw new Error(msg || 'Failed to create product');
  }

  return await res.json();
}

export async function updateProduct(id: string, payload: any): Promise<ProductDto> {
  const res = await fetch(`${API_BASE_URL}/products/${id}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ message: 'Failed to update product' }));
    const msg = Array.isArray(errorBody.message) ? errorBody.message.join(', ') : errorBody.message;
    throw new Error(msg || 'Failed to update product');
  }

  return await res.json();
}

export async function updateProductStatus(id: string, status: ProductStatus): Promise<ProductDto> {
  const res = await fetch(`${API_BASE_URL}/products/${id}/status`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });

  if (!res.ok) {
    const errorBody = await res
      .json()
      .catch(() => ({ message: 'Failed to update product status' }));
    const msg = Array.isArray(errorBody.message) ? errorBody.message.join(', ') : errorBody.message;
    throw new Error(msg || 'Failed to update product status');
  }

  return await res.json();
}

export async function deleteProduct(
  id: string,
): Promise<{ success: boolean; message: string; archived: boolean }> {
  const res = await fetch(`${API_BASE_URL}/products/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ message: 'Failed to delete product' }));
    throw new Error(errorBody.message || 'Failed to delete product');
  }

  return await res.json();
}

export async function presignMediaUpload(
  request: PresignedUploadRequest,
): Promise<PresignedUploadResponse> {
  const res = await fetch(`${API_BASE_URL}/catalog/media/presign`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Failed to presign upload' }));
    throw new Error(err.message || 'Failed to presign upload');
  }

  return await res.json();
}

export async function uploadMediaDirect(
  s3Key: string,
  base64Data: string,
  mimeType: string,
): Promise<{ s3Key: string; cdnUrl: string }> {
  const res = await fetch(`${API_BASE_URL}/catalog/media/upload`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ s3Key, base64Data, mimeType }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Failed to upload image' }));
    throw new Error(err.message || 'Failed to upload image');
  }

  return await res.json();
}
