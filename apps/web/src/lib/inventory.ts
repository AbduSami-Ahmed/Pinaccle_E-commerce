import {
  InventoryMovementDto,
  InventoryOverviewQuery,
  PaginatedResponse,
  ProductStockSummaryDto,
  ReceiveBulkStockRequest,
  ReceiveSerializedPartRequest,
  ReconciliationResultDto,
  StockAdjustmentRequest,
  StockTransferRequest,
  WarehouseDto,
} from '@pinnacle/contracts';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export const fallbackWarehouses: WarehouseDto[] = [
  {
    id: 'wh-syd-001',
    code: 'SYD-CENTRAL',
    name: 'Sydney Central Warehouse',
    addressLine1: '14 Distribution Circuit',
    city: 'Pemulwuy',
    state: 'NSW',
    postalCode: '2145',
    country: 'AU',
    isActive: true,
  },
  {
    id: 'wh-mel-002',
    code: 'MEL-DEPOT',
    name: 'Melbourne Logistics Depot',
    addressLine1: '8 Logistics Drive',
    city: 'Truganina',
    state: 'VIC',
    postalCode: '3029',
    country: 'AU',
    isActive: true,
  },
];

export const fallbackStockSummaries: ProductStockSummaryDto[] = [
  {
    productId: 'prod-tyre-001',
    sku: 'TYR-MICH-2254517-PS5',
    title: 'Michelin Pilot Sport 5 (225/45 R17 94Y XL)',
    brand: 'Michelin',
    categoryName: 'Tyres',
    categorySlug: 'tyres',
    productType: 'BULK_QUANTITY',
    totalQuantityOnHand: 40,
    totalQuantityReserved: 4,
    totalQuantityAvailable: 36,
    isLowStock: false,
    isOutOfStock: false,
    inventoryItems: [
      {
        id: 'item-tyre-1',
        productId: 'prod-tyre-001',
        warehouseId: 'wh-syd-001',
        warehouseCode: 'SYD-CENTRAL',
        warehouseName: 'Sydney Central Warehouse',
        locationBin: 'AISLE-02-RACK-C',
        quantityOnHand: 40,
        quantityReserved: 4,
        quantityAvailable: 36,
        costPrice: '92.50',
        createdAt: '2026-03-01T10:00:00.000Z',
        updatedAt: '2026-03-01T10:00:00.000Z',
      },
    ],
    serializedItems: [],
    sellableUnits: [
      {
        code: 'TYRE_SINGLE',
        name: 'Single Tyre',
        multiplier: 1,
        sellableCount: 36,
        retailPrice: '165.00',
      },
      {
        code: 'TYRE_PAIR',
        name: 'Axle Pair (2x)',
        multiplier: 2,
        sellableCount: 18,
        retailPrice: '323.40',
      },
      {
        code: 'TYRE_SET_OF_4',
        name: 'Complete Set of 4 (4x)',
        multiplier: 4,
        sellableCount: 9,
        retailPrice: '627.00',
      },
    ],
  },
  {
    productId: 'prod-sblt-003',
    sku: 'SBLT-TOY-RAV4-FR-001',
    title: 'Toyota RAV4 Front Right Driver Seat Belt Retractor (2019-2024)',
    brand: 'Toyota',
    categoryName: 'Seat Belts',
    categorySlug: 'seat-belts',
    productType: 'INDIVIDUALLY_SERIALIZED',
    totalQuantityOnHand: 2,
    totalQuantityReserved: 0,
    totalQuantityAvailable: 2,
    isLowStock: true,
    isOutOfStock: false,
    inventoryItems: [],
    serializedItems: [
      {
        id: 'sblt-unit-01',
        productId: 'prod-sblt-003',
        warehouseId: 'wh-syd-001',
        warehouseCode: 'SYD-CENTRAL',
        warehouseName: 'Sydney Central Warehouse',
        stockBarcode: 'BC-SBLT-RAV4-001',
        donorVehicleVin: 'JT3HP10V277192831',
        conditionGrade: 'GRADE_A_LIKE_NEW',
        conditionNotes: 'Tested 2.15 ohms squib resistance, no webbing fraying',
        pretensionerResistanceOhms: '2.15',
        actualPhotos: [
          'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=600&q=80',
        ],
        locationBin: 'BIN-SB-04',
        costPrice: '48.00',
        status: 'AVAILABLE',
        createdAt: '2026-03-02T11:00:00.000Z',
        updatedAt: '2026-03-02T11:00:00.000Z',
      },
      {
        id: 'sblt-unit-02',
        productId: 'prod-sblt-003',
        warehouseId: 'wh-mel-002',
        warehouseCode: 'MEL-DEPOT',
        warehouseName: 'Melbourne Logistics Depot',
        stockBarcode: 'BC-SBLT-RAV4-002',
        donorVehicleVin: 'JT3HP10V889218320',
        conditionGrade: 'GRADE_B_MINOR_WEAR',
        conditionNotes: 'Minor scuff on lower plastic anchor cover, pyrotechnic intact 2.10 ohms',
        pretensionerResistanceOhms: '2.10',
        actualPhotos: [
          'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=600&q=80',
        ],
        locationBin: 'BIN-MEL-09',
        costPrice: '45.00',
        status: 'AVAILABLE',
        createdAt: '2026-03-03T15:30:00.000Z',
        updatedAt: '2026-03-03T15:30:00.000Z',
      },
    ],
    sellableUnits: [
      {
        code: 'UNIT',
        name: 'Single Unit',
        multiplier: 1,
        sellableCount: 2,
        retailPrice: '185.00',
      },
    ],
  },
  {
    productId: 'prod-tyre-002',
    sku: 'TYR-CONT-2055516-PC6',
    title: 'Continental PremiumContact 6 (205/55 R16 91V)',
    brand: 'Continental',
    categoryName: 'Tyres',
    categorySlug: 'tyres',
    productType: 'BULK_QUANTITY',
    totalQuantityOnHand: 0,
    totalQuantityReserved: 0,
    totalQuantityAvailable: 0,
    isLowStock: false,
    isOutOfStock: true,
    inventoryItems: [
      {
        id: 'item-tyre-2',
        productId: 'prod-tyre-002',
        warehouseId: 'wh-syd-001',
        warehouseCode: 'SYD-CENTRAL',
        warehouseName: 'Sydney Central Warehouse',
        locationBin: 'AISLE-03-RACK-A',
        quantityOnHand: 0,
        quantityReserved: 0,
        quantityAvailable: 0,
        costPrice: '78.00',
        createdAt: '2026-03-01T10:00:00.000Z',
        updatedAt: '2026-03-01T10:00:00.000Z',
      },
    ],
    serializedItems: [],
    sellableUnits: [
      {
        code: 'TYRE_SINGLE',
        name: 'Single Tyre',
        multiplier: 1,
        sellableCount: 0,
        retailPrice: '125.00',
      },
      {
        code: 'TYRE_PAIR',
        name: 'Axle Pair (2x)',
        multiplier: 2,
        sellableCount: 0,
        retailPrice: '245.00',
      },
      {
        code: 'TYRE_SET_OF_4',
        name: 'Complete Set of 4 (4x)',
        multiplier: 4,
        sellableCount: 0,
        retailPrice: '475.00',
      },
    ],
  },
];

export async function fetchWarehouses(): Promise<WarehouseDto[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/inventory/warehouses`, {
      method: 'GET',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to load warehouses');
    return await res.json();
  } catch {
    return fallbackWarehouses;
  }
}

export async function fetchInventoryOverview(
  query: InventoryOverviewQuery = {},
): Promise<PaginatedResponse<ProductStockSummaryDto>> {
  const params = new URLSearchParams();
  if (query.search) params.set('search', query.search);
  if (query.warehouseId) params.set('warehouseId', query.warehouseId);
  if (query.stockStatus && query.stockStatus !== 'ALL')
    params.set('stockStatus', query.stockStatus);
  if (query.page) params.set('page', query.page.toString());
  if (query.pageSize) params.set('pageSize', query.pageSize.toString());

  try {
    const res = await fetch(`${API_BASE_URL}/inventory/overview?${params.toString()}`, {
      method: 'GET',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to fetch inventory overview');
    return await res.json();
  } catch {
    let filtered = [...fallbackStockSummaries];
    if (query.search) {
      const q = query.search.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.sku.toLowerCase().includes(q) ||
          s.brand.toLowerCase().includes(q),
      );
    }
    if (query.stockStatus === 'IN_STOCK') {
      filtered = filtered.filter((s) => s.totalQuantityAvailable > 5);
    } else if (query.stockStatus === 'LOW_STOCK') {
      filtered = filtered.filter((s) => s.isLowStock);
    } else if (query.stockStatus === 'OUT_OF_STOCK') {
      filtered = filtered.filter((s) => s.isOutOfStock);
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

export async function fetchProductStockDetails(
  productId: string,
): Promise<ProductStockSummaryDto | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/inventory/products/${productId}`, {
      method: 'GET',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Product stock not found');
    return await res.json();
  } catch {
    return (
      fallbackStockSummaries.find((s) => s.productId === productId || s.sku === productId) || null
    );
  }
}

export async function fetchItemMovements(itemId: string): Promise<InventoryMovementDto[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/inventory/items/${itemId}/movements`, {
      method: 'GET',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to fetch movements');
    return await res.json();
  } catch {
    return [
      {
        id: 'mov-demo-1',
        inventoryItemId: itemId,
        serializedItemId: null,
        movementType: 'RECEIPT',
        quantityChange: 40,
        previousQuantity: 0,
        newQuantity: 40,
        reasonCode: 'INWARD_PURCHASE_RECEIPT',
        operatorId: 'lead-staff',
        operatorEmail: 'lead@pinnacle.test',
        referenceOrderId: 'PO-2026-101',
        createdAt: '2026-03-01T10:00:00.000Z',
      },
      {
        id: 'mov-demo-2',
        inventoryItemId: itemId,
        serializedItemId: null,
        movementType: 'RESERVATION_HOLD',
        quantityChange: 0,
        previousQuantity: 40,
        newQuantity: 40,
        reasonCode: 'CART_CHECKOUT_RESERVATION_TYRE_SET_OF_4',
        operatorId: 'system',
        operatorEmail: 'system@pinnacle.test',
        referenceOrderId: null,
        createdAt: '2026-03-02T14:20:00.000Z',
      },
    ];
  }
}

export async function receiveBulkStock(payload: ReceiveBulkStockRequest): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/inventory/receive-bulk`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Failed to receive bulk stock' }));
    const msg = Array.isArray(err.message) ? err.message.join(', ') : err.message;
    throw new Error(msg || 'Failed to receive bulk stock');
  }

  return await res.json();
}

export async function receiveSerializedPart(payload: ReceiveSerializedPartRequest): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/inventory/receive-serialized`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Failed to receive serialized part' }));
    const msg = Array.isArray(err.message) ? err.message.join(', ') : err.message;
    throw new Error(msg || 'Failed to receive serialized part');
  }

  return await res.json();
}

export async function adjustStock(payload: StockAdjustmentRequest): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/inventory/adjust`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Failed to adjust stock' }));
    const msg = Array.isArray(err.message) ? err.message.join(', ') : err.message;
    throw new Error(msg || 'Failed to adjust stock');
  }

  return await res.json();
}

export async function transferStock(payload: StockTransferRequest): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/inventory/transfer`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Failed to transfer stock' }));
    const msg = Array.isArray(err.message) ? err.message.join(', ') : err.message;
    throw new Error(msg || 'Failed to transfer stock');
  }

  return await res.json();
}

export async function reconcileItem(itemId: string): Promise<ReconciliationResultDto> {
  const res = await fetch(`${API_BASE_URL}/inventory/items/${itemId}/reconcile`, {
    method: 'GET',
    credentials: 'include',
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Reconciliation failed' }));
    throw new Error(err.message || 'Reconciliation failed');
  }

  return await res.json();
}
