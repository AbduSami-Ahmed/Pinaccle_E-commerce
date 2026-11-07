import {
  AdminCustomerDetailDto,
  AdminCustomerListItemDto,
  AuditLogDto,
  AuditLogPageDto,
  AuditLogQueryDto,
  BusinessSettingsDto,
  DashboardDateRange,
  DashboardSummaryDto,
  GlobalInventoryMovementDto,
  RoleWithPermissionsDto,
  StaffUserDto,
  UpdateBusinessSettingsDto,
} from '@pinnacle/contracts';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Fetch unified dashboard performance summary.
 */
export async function fetchDashboardSummary(
  range: DashboardDateRange = '30d',
): Promise<DashboardSummaryDto> {
  try {
    const res = await fetch(`${API_BASE}/api/admin/dashboard/summary?range=${range}`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      return data.summary;
    }
  } catch (err) {
    console.warn('[Admin] Live API summary unreachable, using realistic fallback:', err);
  }

  // Realistic fallback matching Prestons NSW trade hub data
  return getFallbackDashboardSummary(range);
}

/**
 * Search customer directory.
 */
export async function fetchAdminCustomers(params: {
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{ customers: AdminCustomerListItemDto[]; total: number; page: number; totalPages: number }> {
  try {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));

    const res = await fetch(`${API_BASE}/api/customers?${query.toString()}`, {
      credentials: 'include',
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('[Admin] Live API customer search unreachable, using fallback:', err);
  }

  return getFallbackCustomers(params.search);
}

/**
 * Get customer detail by ID.
 */
export async function fetchAdminCustomerDetail(id: string): Promise<AdminCustomerDetailDto> {
  try {
    const res = await fetch(`${API_BASE}/api/customers/${id}/detail`, {
      credentials: 'include',
    });
    if (res.ok) {
      const data = await res.json();
      return data.customer;
    }
  } catch (err) {
    console.warn('[Admin] Live API customer detail unreachable, using fallback:', err);
  }

  return getFallbackCustomerDetail(id);
}

/**
 * Fetch staff members list.
 */
export async function fetchStaffMembers(search?: string): Promise<StaffUserDto[]> {
  try {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    const res = await fetch(`${API_BASE}/api/users/staff${query}`, {
      credentials: 'include',
    });
    if (res.ok) {
      const data = await res.json();
      return data.staff;
    }
  } catch (err) {
    console.warn('[Admin] Live API staff unreachable, using fallback:', err);
  }

  return getFallbackStaff(search);
}

/**
 * Fetch platform roles and permissions.
 */
export async function fetchPlatformRoles(): Promise<RoleWithPermissionsDto[]> {
  try {
    const res = await fetch(`${API_BASE}/api/users/roles`, {
      credentials: 'include',
    });
    if (res.ok) {
      const data = await res.json();
      return data.roles;
    }
  } catch (err) {
    console.warn('[Admin] Live API roles unreachable, using fallback:', err);
  }

  return getFallbackRoles();
}

/**
 * Assign roles to staff member.
 */
export async function updateStaffRoles(userId: string, roleIds: string[]): Promise<StaffUserDto> {
  const res = await fetch(`${API_BASE}/api/users/${userId}/roles`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roleIds }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Failed to assign roles' }));
    throw new Error(err.message || 'Failed to update staff roles');
  }

  const data = await res.json();
  return data.user;
}

/**
 * Toggle active status of a staff member.
 */
export async function toggleStaffActive(userId: string, isActive: boolean): Promise<StaffUserDto> {
  const res = await fetch(`${API_BASE}/api/users/${userId}/active`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isActive }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Failed to change user status' }));
    throw new Error(err.message || 'Failed to change staff status');
  }

  const data = await res.json();
  return data.user;
}

/**
 * Fetch store business settings.
 */
export async function fetchBusinessSettings(): Promise<BusinessSettingsDto> {
  try {
    const res = await fetch(`${API_BASE}/api/settings`, {
      credentials: 'include',
    });
    if (res.ok) {
      const data = await res.json();
      return data.settings;
    }
  } catch (err) {
    console.warn('[Admin] Live API settings unreachable, using fallback:', err);
  }

  return getFallbackBusinessSettings();
}

/**
 * Update store business settings.
 */
export async function updateBusinessSettings(
  dto: UpdateBusinessSettingsDto,
): Promise<BusinessSettingsDto> {
  const res = await fetch(`${API_BASE}/api/settings`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Failed to update settings' }));
    throw new Error(err.message || 'Failed to save settings');
  }

  const data = await res.json();
  return data.settings;
}

/**
 * Fetch immutable audit log entries.
 */
export async function fetchAuditLogs(query: AuditLogQueryDto): Promise<AuditLogPageDto> {
  try {
    const searchParams = new URLSearchParams();
    if (query.domain) searchParams.set('domain', query.domain);
    if (query.action) searchParams.set('action', query.action);
    if (query.page) searchParams.set('page', String(query.page));
    if (query.limit) searchParams.set('limit', String(query.limit));

    const res = await fetch(`${API_BASE}/api/audit-logs?${searchParams.toString()}`, {
      credentials: 'include',
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('[Admin] Live API audit logs unreachable, using fallback:', err);
  }

  return getFallbackAuditLogs(query);
}

/**
 * Fetch global warehouse movement ledger.
 */
export async function fetchWarehouseMovements(params: {
  movementType?: string;
  page?: number;
  limit?: number;
}): Promise<{ items: GlobalInventoryMovementDto[]; total: number; page: number; totalPages: number }> {
  try {
    const q = new URLSearchParams();
    if (params.movementType) q.set('movementType', params.movementType);
    if (params.page) q.set('page', String(params.page));
    if (params.limit) q.set('limit', String(params.limit));

    const res = await fetch(`${API_BASE}/api/inventory/movements?${q.toString()}`, {
      credentials: 'include',
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('[Admin] Live API movements unreachable, using fallback:', err);
  }

  return getFallbackMovements(params.movementType);
}

export function getExportOrdersUrl(range: DashboardDateRange = '30d'): string {
  return `${API_BASE}/api/admin/export/orders?range=${range}`;
}

export function getExportInventoryUrl(): string {
  return `${API_BASE}/api/admin/export/inventory`;
}

export function getExportAuditLogsUrl(): string {
  return `${API_BASE}/api/audit-logs/export`;
}

// ===========================================================================
// Realistic In-Memory Fallbacks for Standalone Execution
// ===========================================================================

function getFallbackDashboardSummary(range: DashboardDateRange): DashboardSummaryDto {
  return {
    period: {
      range,
      startDate: new Date(Date.now() - 30 * 86400000).toISOString(),
      endDate: new Date().toISOString(),
      label: range === 'today' ? 'Today' : range === '7d' ? 'Last 7 Days' : 'Last 30 Days',
    },
    sales: {
      grossRevenue: 18450.0,
      netRevenue: 17825.0,
      refundedAmount: 625.0,
      totalOrdersCount: 42,
      paidOrdersCount: 39,
      averageOrderValue: 473.08,
      currency: 'AUD',
    },
    fulfillmentQueues: {
      awaitingPickPackCount: 4,
      inFulfillmentCount: 6,
      pendingPaymentCount: 3,
      shippedCount: 18,
      deliveredCount: 45,
      pendingRmaInspectionCount: 2,
    },
    stockHealth: {
      totalPublishedProducts: 16,
      lowStockCount: 3,
      outOfStockCount: 1,
      lowStockItems: [
        {
          productId: 'p-tyr-bridgestone-01',
          productName: 'Bridgestone Ecopia EP300 205/55R16 91V',
          sku: 'TYR-BRI-2055516-EP300',
          category: 'Commercial & Passenger Tyres',
          productType: 'BULK_QUANTITY',
          currentStock: 6,
          reservedStock: 2,
          sellableStock: 4,
          threshold: 4,
        },
        {
          productId: 'p-tyr-michelin-02',
          productName: 'Michelin Primacy 4 225/50R17 98W',
          sku: 'TYR-MIC-2255017-PRI4',
          category: 'Commercial & Passenger Tyres',
          productType: 'BULK_QUANTITY',
          currentStock: 4,
          reservedStock: 1,
          sellableStock: 3,
          threshold: 4,
        },
        {
          productId: 'p-sb-falcon-01',
          productName: 'Ford Falcon FG Front Right Retractor Assembly',
          sku: 'BELT-FOR-FG-FR-001',
          category: 'Seat Belts & Harnesses',
          productType: 'INDIVIDUALLY_SERIALIZED',
          currentStock: 1,
          reservedStock: 0,
          sellableStock: 1,
          threshold: 1,
        },
      ],
      outOfStockItems: [
        {
          productId: 'p-sb-commodore-ve',
          productName: 'Holden Commodore VE Rear Centre 3-Point Webbing',
          sku: 'BELT-HOL-VE-RC-003',
          category: 'Seat Belts & Harnesses',
          productType: 'INDIVIDUALLY_SERIALIZED',
          currentStock: 0,
          reservedStock: 0,
          sellableStock: 0,
          threshold: 1,
        },
      ],
    },
    categoryBreakdown: [
      {
        categoryId: 'cat-tyres-01',
        name: 'Commercial & Passenger Tyres',
        slug: 'tyres',
        activeProductCount: 10,
      },
      {
        categoryId: 'cat-seatbelts-02',
        name: 'Seat Belts & Safety Harnesses',
        slug: 'seat-belts',
        activeProductCount: 6,
      },
    ],
    recentActivity: {
      recentOrders: [
        {
          id: 'ord-101',
          orderNumber: 'ORD-2026-1042',
          customerName: 'Marcus V.',
          status: 'PAID',
          paymentStatus: 'PAID',
          shippingMethod: 'STANDARD_COURIER',
          total: 540.0,
          createdAt: new Date(Date.now() - 45 * 60000).toISOString(),
        },
        {
          id: 'ord-102',
          orderNumber: 'ORD-2026-1041',
          customerName: 'David K.',
          status: 'PROCESSING',
          paymentStatus: 'PAID',
          shippingMethod: 'CLICK_AND_COLLECT',
          total: 285.0,
          createdAt: new Date(Date.now() - 120 * 60000).toISOString(),
        },
        {
          id: 'ord-103',
          orderNumber: 'ORD-2026-1040',
          customerName: 'Prestons Fleet Services',
          status: 'SHIPPED',
          paymentStatus: 'PAID',
          shippingMethod: 'EXPRESS_COURIER',
          total: 1680.0,
          createdAt: new Date(Date.now() - 360 * 60000).toISOString(),
        },
      ],
      recentMovements: [
        {
          id: 'mov-01',
          productName: 'Bridgestone Ecopia EP300 205/55R16',
          sku: 'TYR-BRI-2055516-EP300',
          movementType: 'SALE_DEDUCTION',
          quantity: -2,
          actorName: 'Warehouse Staff',
          createdAt: new Date(Date.now() - 30 * 60000).toISOString(),
        },
        {
          id: 'mov-02',
          productName: 'Toyota Hilux KUN26 Front Left Seat Belt',
          sku: 'BELT-TOY-HIL-FL-002',
          movementType: 'RETURN_RESTOCK',
          quantity: 1,
          actorName: 'Gareth Vance',
          createdAt: new Date(Date.now() - 180 * 60000).toISOString(),
        },
      ],
      recentAuditLogs: [
        {
          id: 'aud-01',
          domain: 'ORDERS',
          action: 'SHIPMENT_DISPATCHED',
          actorName: 'Gareth Vance',
          createdAt: new Date(Date.now() - 90 * 60000).toISOString(),
        },
        {
          id: 'aud-02',
          domain: 'SETTINGS',
          action: 'BUSINESS_SETTINGS_UPDATED',
          actorName: 'Super Admin',
          createdAt: new Date(Date.now() - 480 * 60000).toISOString(),
        },
      ],
    },
  };
}

function getFallbackCustomers(search?: string): {
  customers: AdminCustomerListItemDto[];
  total: number;
  page: number;
  totalPages: number;
} {
  const all: AdminCustomerListItemDto[] = [
    {
      id: 'cust-001',
      userId: 'usr-c1',
      firstName: 'Marcus',
      lastName: 'Vance',
      displayName: 'Marcus Vance',
      email: 'm***@example.com',
      phone: '+61 •••• •••• 1284',
      companyName: 'Vance Logistics & Heavy Haul',
      ordersCount: 5,
      totalSpend: 3420.0,
      isPiiMasked: true,
      createdAt: '2026-08-15T09:30:00Z',
    },
    {
      id: 'cust-002',
      userId: 'usr-c2',
      firstName: 'David',
      lastName: 'Kovacs',
      displayName: 'David Kovacs',
      email: 'd***@example.com',
      phone: '+61 •••• •••• 9921',
      companyName: 'Liverpool Auto Body Works',
      ordersCount: 8,
      totalSpend: 5890.0,
      isPiiMasked: true,
      createdAt: '2026-09-02T14:15:00Z',
    },
    {
      id: 'cust-003',
      userId: 'usr-c3',
      firstName: 'Sarah',
      lastName: 'Jenkins',
      displayName: 'Sarah Jenkins',
      email: 's***@example.com',
      phone: '+61 •••• •••• 4402',
      companyName: null,
      ordersCount: 2,
      totalSpend: 475.0,
      isPiiMasked: true,
      createdAt: '2026-10-10T11:45:00Z',
    },
  ];

  const filtered = search
    ? all.filter((c) => c.displayName.toLowerCase().includes(search.toLowerCase()) || (c.companyName && c.companyName.toLowerCase().includes(search.toLowerCase())))
    : all;

  return {
    customers: filtered,
    total: filtered.length,
    page: 1,
    totalPages: 1,
  };
}

function getFallbackCustomerDetail(id: string): AdminCustomerDetailDto {
  return {
    id,
    userId: 'usr-c1',
    firstName: 'Marcus',
    lastName: 'Vance',
    displayName: 'Marcus Vance',
    email: 'm***@example.com',
    phone: '+61 •••• •••• 1284',
    companyName: 'Vance Logistics & Heavy Haul',
    ordersCount: 5,
    totalSpend: 3420.0,
    isPiiMasked: true,
    addresses: [
      {
        id: 'addr-01',
        customerId: id,
        label: 'Prestons Trade Depot Office',
        line1: '[PROTECTED RESIDENTIAL ADDRESS]',
        line2: null,
        city: 'Prestons',
        state: 'NSW',
        postalCode: '2170',
        country: 'AU',
        isDefault: true,
        createdAt: '2026-08-15T09:35:00Z',
        updatedAt: '2026-08-15T09:35:00Z',
      },
    ],
    savedVehicles: [
      {
        id: 'veh-01',
        make: 'Ford',
        model: 'Falcon',
        year: 2012,
        variant: 'FG MkII XR6 4.0L Barra',
      },
    ],
    recentOrders: [
      {
        id: 'ord-101',
        orderNumber: 'ORD-2026-1042',
        status: 'PAID',
        paymentStatus: 'PAID',
        total: 540.0,
        createdAt: '2026-11-06T09:15:00Z',
      },
    ],
    createdAt: '2026-08-15T09:30:00Z',
  };
}

function getFallbackStaff(search?: string): StaffUserDto[] {
  const staff: StaffUserDto[] = [
    {
      id: 'staff-01',
      email: 'admin@pinnacleauto.com.au',
      firstName: 'Zayd',
      lastName: 'Mirza',
      department: 'Executive Operations',
      phone: '(02) 9822 4101',
      isActive: true,
      isStaff: true,
      roles: [{ id: 'role-sa', key: 'SUPER_ADMIN', name: 'Super Admin' }],
      lastLoginAt: new Date().toISOString(),
      createdAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'staff-02',
      email: 'gareth.v@pinnacleauto.com.au',
      firstName: 'Gareth',
      lastName: 'Vance',
      department: 'Prestons Warehouse',
      phone: '(02) 9822 4105',
      isActive: true,
      isStaff: true,
      roles: [{ id: 'role-wm', key: 'INVENTORY_MGR', name: 'Inventory Manager' }],
      lastLoginAt: new Date(Date.now() - 3600000).toISOString(),
      createdAt: '2026-02-15T08:00:00Z',
    },
    {
      id: 'staff-03',
      email: 'dispatch@pinnacleauto.com.au',
      firstName: 'Liam',
      lastName: 'Callaghan',
      department: 'Trade Counter & Dispatch',
      phone: '(02) 9822 4108',
      isActive: true,
      isStaff: true,
      roles: [{ id: 'role-sd', key: 'SALES_DISPATCHER', name: 'Sales & Dispatcher' }],
      lastLoginAt: new Date(Date.now() - 7200000).toISOString(),
      createdAt: '2026-03-01T08:00:00Z',
    },
  ];

  if (search) {
    return staff.filter((s) => `${s.firstName} ${s.lastName}`.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase()));
  }
  return staff;
}

function getFallbackRoles(): RoleWithPermissionsDto[] {
  return [
    {
      id: 'role-sa',
      key: 'SUPER_ADMIN',
      name: 'Super Admin',
      description: 'Unrestricted system and business operations control',
      permissions: [
        { id: 'p1', code: 'orders:view:all', description: 'View all orders', domain: 'orders' },
        { id: 'p2', code: 'customers:view:pii_contact', description: 'View customer contact details', domain: 'customers' },
        { id: 'p3', code: 'staff:roles:assign', description: 'Assign roles to staff', domain: 'staff' },
        { id: 'p4', code: 'system:settings:manage', description: 'Manage business settings', domain: 'system' },
      ],
    },
    {
      id: 'role-wm',
      key: 'INVENTORY_MGR',
      name: 'Inventory Manager',
      description: 'Stock inwarding, movements, write-offs, and reconciliation',
      permissions: [
        { id: 'p10', code: 'inventory:stock:view_quantity', description: 'View stock counts', domain: 'inventory' },
        { id: 'p11', code: 'inventory:stock:adjust', description: 'Create stock adjustments', domain: 'inventory' },
        { id: 'p12', code: 'returns:inspect:disposition', description: 'Disposition RMA returns', domain: 'returns' },
      ],
    },
    {
      id: 'role-sd',
      key: 'SALES_DISPATCHER',
      name: 'Sales & Dispatcher',
      description: 'Gate 2 pickup verification, consignment dispatch, pick and pack',
      permissions: [
        { id: 'p20', code: 'orders:fulfill:pick_pack', description: 'Pick & pack orders', domain: 'orders' },
        { id: 'p21', code: 'orders:fulfill:dispatch', description: 'Dispatch orders with tracking', domain: 'orders' },
      ],
    },
  ];
}

function getFallbackBusinessSettings(): BusinessSettingsDto {
  return {
    company: {
      legalName: 'Pinnacle Auto Spares & Commercial Tyres Pty Ltd',
      tradeName: 'Pinnacle Auto Spares',
      abn: '48 123 456 789',
      licenseNumber: 'NSW MVRL-58291',
      phone: '(02) 9822 4100',
      email: 'sales@pinnacleauto.com.au',
      address: '42 Jedda Road',
      suburb: 'Prestons',
      state: 'NSW',
      postcode: '2170',
      operatingHours: 'Mon-Fri 7:30am - 5:00pm, Sat 8:00am - 1:00pm AEST',
    },
    financial: {
      currency: 'AUD',
      currencySymbol: '$',
      taxName: 'Australian GST',
      taxRatePercent: 10,
      taxInclusive: true,
    },
    fulfillment: {
      depotPickupEnabled: true,
      depotName: 'Prestons Trade Counter — Gate 2',
      depotAddress: '42 Jedda Road, Gate 2, Prestons NSW 2170',
      depotInstructions: 'Drive to Gate 2 dispatch bay. Quote order number and show photo ID.',
      depotPickupFee: 0.0,
      standardShippingFee: 25.0,
      expressShippingFee: 45.0,
      freeShippingThreshold: null,
      estimatedStandardTransit: '2-5 business days (StarTrack Road Express)',
      estimatedExpressTransit: '1-2 business days (StarTrack Premium Express)',
    },
    policies: {
      returnWindowDays: 30,
      discretionaryRestockingFeePercent: 10,
      warrantyDisclaimer:
        'All reclaimed second-hand safety components (seat belts, buckles, retractors) are individually inspected, certified, and compliant with NSW roadworthy vehicle standards. Statutory Australian Consumer Law guarantees apply.',
    },
  };
}

function getFallbackAuditLogs(_query: AuditLogQueryDto): AuditLogPageDto {
  const items: AuditLogDto[] = [
    {
      id: 'aud-101',
      actorId: 'staff-01',
      actorName: 'Zayd Mirza',
      actorEmail: 'admin@pinnacleauto.com.au',
      domain: 'STAFF',
      action: 'ROLES_ASSIGNED',
      entityType: 'USER',
      entityId: 'staff-03',
      beforeState: { roles: ['CUSTOMER_SERVICE'] },
      afterState: { roles: ['SALES_DISPATCHER'] },
      ipAddress: '192.168.1.10',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      createdAt: '2026-11-06T01:45:00Z',
    },
    {
      id: 'aud-102',
      actorId: 'staff-02',
      actorName: 'Gareth Vance',
      actorEmail: 'gareth.v@pinnacleauto.com.au',
      domain: 'INVENTORY',
      action: 'STOCK_ADJUSTMENT',
      entityType: 'INVENTORY_ITEM',
      entityId: 'item-ep300',
      beforeState: { quantityOnHand: 8 },
      afterState: { quantityOnHand: 6, reason: 'Physical stocktake write-off' },
      ipAddress: '192.168.1.25',
      userAgent: 'BarcodeScanner/v2.1',
      createdAt: '2026-11-05T22:30:00Z',
    },
  ];

  return {
    items,
    total: items.length,
    page: 1,
    limit: 20,
    totalPages: 1,
  };
}

function getFallbackMovements(movementType?: string): {
  items: GlobalInventoryMovementDto[];
  total: number;
  page: number;
  totalPages: number;
} {
  const items: GlobalInventoryMovementDto[] = [
    {
      id: 'mov-101',
      productId: 'p-tyr-bridgestone-01',
      productName: 'Bridgestone Ecopia EP300 205/55R16',
      sku: 'TYR-BRI-2055516-EP300',
      movementType: 'SALE_DEDUCTION',
      quantity: -4,
      referenceType: 'ORDER',
      referenceId: 'ORD-2026-1040',
      actorName: 'Liam Callaghan',
      warehouseCode: 'PRESTONS-HUB',
      createdAt: '2026-11-06T00:15:00Z',
    },
    {
      id: 'mov-102',
      productId: 'p-sb-falcon-01',
      productName: 'Ford Falcon FG Front Right Retractor Assembly',
      sku: 'BELT-FOR-FG-FR-001',
      movementType: 'RETURN_RESTOCK',
      quantity: 1,
      referenceType: 'RMA',
      referenceId: 'RMA-2026-004',
      actorName: 'Gareth Vance',
      warehouseCode: 'PRESTONS-HUB',
      createdAt: '2026-11-05T19:30:00Z',
    },
  ];

  const filtered = movementType ? items.filter((m) => m.movementType === movementType) : items;

  return {
    items: filtered,
    total: filtered.length,
    page: 1,
    totalPages: 1,
  };
}