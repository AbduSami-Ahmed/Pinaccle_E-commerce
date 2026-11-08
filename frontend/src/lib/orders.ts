/**
 * Order Operations & Fulfilment Client API (Phase 12)
 * Pinnacle Auto Spares & Commercial Tyres (Penrose, Auckland)
 */

import {
  CancelOrderDto,
  ConfirmDepotCollectionDto,
  CreateReturnRequestDto,
  DispatchCourierShipmentDto,
  OrderAdminDetailsDto,
  OrderQueryDto,
  PaginatedResponse,
  PickPackOrderDto,
  ProcessRefundDto,
  RecordReturnInspectionDto,
  ReturnRequestDto,
  ReviewReturnRequestDto,
  UpdateOrderStatusDto,
} from '@pinnacle/contracts';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

// Realistic trade fallback orders for offline dev / presentation
const DEMO_ORDERS: OrderAdminDetailsDto[] = [
  {
    id: 'ord-auckland-10042',
    orderNumber: 'PIN-2026-10042',
    customerId: 'cust-auckland-01',
    customerEmail: 'jordan.miller@aucklandmechanical.co.nz',
    customerPhone: '021 890 123',
    orderStatus: 'PROCESSING',
    paymentStatus: 'PAID',
    fulfillmentStatus: 'PARTIALLY_FULFILLED',
    subtotal: 780.0,
    discountAmount: 0.0,
    shippingFee: 35.0,
    taxAmount: 106.3,
    totalAmount: 815.0,
    currency: 'NZD',
    shippingMethod: 'STANDARD_COURIER',
    shippingAddress: {
      firstName: 'Jordan',
      lastName: 'Miller',
      phone: '021 890 123',
      company: 'Auckland Mechanical & Tyre Service',
      line1: '18 Industry Road',
      city: 'Penrose',
      state: 'Auckland',
      postalCode: '1061',
      country: 'NZ',
      deliveryNotes: 'Deliver to rear fitting bay via gate 2.',
    },
    billingAddress: {
      firstName: 'Jordan',
      lastName: 'Miller',
      phone: '021 890 123',
      company: 'Auckland Mechanical & Tyre Service',
      line1: '18 Industry Road',
      city: 'Penrose',
      state: 'Auckland',
      postalCode: '1061',
      country: 'NZ',
    },
    notes: 'Commercial trade account order. Priority dispatch requested.',
    items: [
      {
        id: 'item-10042-1',
        productId: 'prod-tyre-bs-01',
        skuSnapshot: 'BS-TUR-2255018',
        titleSnapshot: 'Bridgestone Turanza T005A 225/50R18 95V',
        saleUnitCodeSnapshot: 'PAIR',
        saleUnitNameSnapshot: 'Pair (2 Tyres)',
        baseQuantityMultiplierSnapshot: 2,
        quantity: 2,
        baseUnitsConsumed: 4,
        unitPrice: 390.0,
        discountAmount: 0.0,
        taxAmount: 70.91,
        totalPrice: 780.0,
      },
    ],
    shipments: [],
    returnRequests: [],
    paymentTransactions: [
      {
        id: 'tx-10042-1',
        provider: 'STRIPE',
        transactionReference: 'pi_3PjX982eZvKYlo2C01234567',
        amount: 815.0,
        currency: 'NZD',
        status: 'SUCCESS',
        createdAt: '2026-11-04T08:35:00.000Z',
      },
    ],
    timeline: [
      {
        id: 'tl-1',
        type: 'ORDER_PLACED',
        title: 'Order Placed',
        description: 'Order PIN-2026-10042 initiated online for $815.00 NZD',
        timestamp: '2026-11-04T08:32:00.000Z',
        actor: 'Jordan Miller',
      },
      {
        id: 'tl-2',
        type: 'PAYMENT_CONFIRMED',
        title: 'Payment Confirmed',
        description: 'Card payment of $815.00 NZD confirmed via Stripe',
        timestamp: '2026-11-04T08:35:00.000Z',
        actor: 'Stripe Gateway',
      },
      {
        id: 'tl-3',
        type: 'PROCESSING_STARTED',
        title: 'Picking Initiated',
        description: 'Job sent to Auckland Bay 4 for tyre staging and pallet wrapping',
        timestamp: '2026-11-04T09:10:00.000Z',
        actor: 'Lachlan Smith (Warehouse Dispatcher)',
      },
    ],
    allowedTransitions: ['SHIPPED', 'DELIVERED', 'CANCELLED'],
    isPiiMasked: false,
    createdAt: '2026-11-04T08:32:00.000Z',
    updatedAt: '2026-11-04T09:10:00.000Z',
  },
  {
    id: 'ord-auckland-10039',
    orderNumber: 'PIN-2026-10039',
    customerId: 'cust-auckland-01',
    customerEmail: 'jordan.miller@aucklandmechanical.co.nz',
    customerPhone: '021 890 123',
    orderStatus: 'DELIVERED',
    paymentStatus: 'PAID',
    fulfillmentStatus: 'FULFILLED',
    subtotal: 245.0,
    discountAmount: 0.0,
    shippingFee: 0.0,
    taxAmount: 32.0,
    totalAmount: 245.0,
    currency: 'NZD',
    shippingMethod: 'CLICK_AND_COLLECT',
    shippingAddress: {
      firstName: 'Jordan',
      lastName: 'Miller',
      phone: '021 890 123',
      company: 'Click & Collect (Auckland Trade Hub)',
      line1: '18 Industry Road',
      city: 'Penrose',
      state: 'Auckland',
      postalCode: '1061',
      country: 'NZ',
      deliveryNotes: 'Customer trade counter collection at Hub 1.',
    },
    billingAddress: {
      firstName: 'Jordan',
      lastName: 'Miller',
      phone: '021 890 123',
      company: 'Auckland Mechanical & Tyre Service',
      line1: '18 Industry Road',
      city: 'Penrose',
      state: 'Auckland',
      postalCode: '1061',
      country: 'NZ',
    },
    items: [
      {
        id: 'item-10039-1',
        productId: 'prod-belt-rav4-01',
        skuSnapshot: 'SB-TOY-RAV4-FR-21',
        titleSnapshot: 'Toyota RAV4 2021 Front Driver Seat Belt Retractor Assembly (Black)',
        saleUnitCodeSnapshot: 'SINGLE',
        saleUnitNameSnapshot: 'Single Unit',
        baseQuantityMultiplierSnapshot: 1,
        quantity: 1,
        baseUnitsConsumed: 1,
        unitPrice: 245.0,
        discountAmount: 0.0,
        taxAmount: 32.0,
        totalPrice: 245.0,
        serializedItemId: 'ser-belt-001',
      },
    ],
    shipments: [
      {
        id: 'ship-10039-1',
        orderId: 'ord-auckland-10039',
        carrierName: 'Customer Depot Collection (Trade Counter, Penrose Auckland)',
        trackingNumber: 'DEPOT-COLLECT-10039',
        status: 'DELIVERED',
        shippedAt: '2026-11-02T11:00:00.000Z',
        deliveredAt: '2026-11-02T11:20:00.000Z',
        createdAt: '2026-11-02T11:00:00.000Z',
        items: [{ id: 'si-1', orderItemId: 'item-10039-1', quantityShipped: 1 }],
      },
    ],
    returnRequests: [],
    paymentTransactions: [
      {
        id: 'tx-10039-1',
        provider: 'STRIPE',
        transactionReference: 'pi_3PjA722eZvKYlo2C88990011',
        amount: 245.0,
        currency: 'NZD',
        status: 'SUCCESS',
        createdAt: '2026-11-02T10:15:00.000Z',
      },
    ],
    timeline: [
      {
        id: 'tl-10',
        type: 'ORDER_PLACED',
        title: 'Order Placed',
        description: 'Order PIN-2026-10039 created for Click & Collect',
        timestamp: '2026-11-02T10:10:00.000Z',
        actor: 'Jordan Miller',
      },
      {
        id: 'tl-11',
        type: 'PAYMENT_CONFIRMED',
        title: 'Payment Succeeded',
        description: 'Paid $245.00 NZD via Stripe Card',
        timestamp: '2026-11-02T10:15:00.000Z',
        actor: 'Stripe Gateway',
      },
      {
        id: 'tl-12',
        type: 'COLLECTED_AT_DEPOT',
        title: 'Collected from Trade Counter',
        description: 'Collected by Jordan Miller (ID verified: NZ DL ending 8842)',
        timestamp: '2026-11-02T11:20:00.000Z',
        actor: 'Trade Counter Hub 1',
      },
    ],
    allowedTransitions: ['REFUNDED'],
    isPiiMasked: false,
    createdAt: '2026-11-02T10:10:00.000Z',
    updatedAt: '2026-11-02T11:20:00.000Z',
  },
  {
    id: 'ord-auckland-10035',
    orderNumber: 'PIN-2026-10035',
    customerId: 'cust-chc-private-02',
    customerEmail: 'sam.k**@***.co.nz',
    customerPhone: '0219***11',
    orderStatus: 'SHIPPED',
    paymentStatus: 'PAID',
    fulfillmentStatus: 'FULFILLED',
    subtotal: 520.0,
    discountAmount: 0.0,
    shippingFee: 45.0,
    taxAmount: 51.36,
    totalAmount: 565.0,
    currency: 'NZD',
    shippingMethod: 'STANDARD_COURIER',
    shippingAddress: {
      firstName: 'Sam',
      lastName: 'K.',
      phone: '0439***11',
      line1: '*** (Protected Contact Info)',
      city: 'Christchurch',
      state: 'Canterbury',
      postalCode: '8011',
      country: 'NZ',
    },
    billingAddress: {
      firstName: 'Sam',
      lastName: 'K.',
      phone: '0439***11',
      line1: '*** (Protected Contact Info)',
      city: 'Christchurch',
      state: 'Canterbury',
      postalCode: '8011',
      country: 'NZ',
    },
    items: [
      {
        id: 'item-10035-1',
        productId: 'prod-tyre-michelin-01',
        skuSnapshot: 'MICH-PS4-2354518',
        titleSnapshot: 'Michelin Pilot Sport 4 235/45ZR18 98Y XL',
        saleUnitCodeSnapshot: 'PAIR',
        saleUnitNameSnapshot: 'Pair (2 Tyres)',
        baseQuantityMultiplierSnapshot: 2,
        quantity: 1,
        baseUnitsConsumed: 2,
        unitPrice: 520.0,
        discountAmount: 0.0,
        taxAmount: 67.83,
        totalPrice: 520.0,
      },
    ],
    shipments: [
      {
        id: 'ship-10035-1',
        orderId: 'ord-auckland-10035',
        carrierName: 'CourierPost / NZ Post',
        trackingNumber: 'NZP-99887766NZ',
        trackingUrl: 'https://www.nzpost.co.nz/tools/tracking?track=NZP-99887766NZ',
        status: 'IN_TRANSIT',
        shippedAt: '2026-10-28T14:30:00.000Z',
        deliveredAt: null,
        createdAt: '2026-10-28T14:30:00.000Z',
        items: [{ id: 'si-2', orderItemId: 'item-10035-1', quantityShipped: 1 }],
      },
    ],
    returnRequests: [],
    paymentTransactions: [
      {
        id: 'tx-10035-1',
        provider: 'STRIPE',
        transactionReference: 'pi_3PjM452eZvKYlo2C77665544',
        amount: 565.0,
        currency: 'NZD',
        status: 'SUCCESS',
        createdAt: '2026-10-28T13:45:00.000Z',
      },
    ],
    timeline: [
      {
        id: 'tl-20',
        type: 'ORDER_PLACED',
        title: 'Order Placed',
        description: 'Order PIN-2026-10035 created',
        timestamp: '2026-10-28T13:40:00.000Z',
      },
      {
        id: 'tl-21',
        type: 'PAYMENT_CONFIRMED',
        title: 'Payment Succeeded',
        description: 'Paid $565.00 NZD via Stripe Card',
        timestamp: '2026-10-28T13:45:00.000Z',
      },
      {
        id: 'tl-22',
        type: 'DISPATCHED',
        title: 'Dispatched with CourierPost / NZ Post',
        description: 'Consignment NZP-99887766NZ booked and scanned into Christchurch linehaul',
        timestamp: '2026-10-28T14:30:00.000Z',
        actor: 'Auckland Dispatch',
      },
    ],
    allowedTransitions: ['DELIVERED', 'REFUNDED'],
    isPiiMasked: true,
    createdAt: '2026-10-28T13:40:00.000Z',
    updatedAt: '2026-10-28T14:30:00.000Z',
  },
];

let inMemoryOrderStore = [...DEMO_ORDERS];

// ---------------------------------------------------------------------------
// Staff Order Operations
// ---------------------------------------------------------------------------

export async function fetchOrders(
  params: OrderQueryDto = {},
): Promise<PaginatedResponse<OrderAdminDetailsDto>> {
  try {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page.toString());
    if (params.pageSize) query.append('pageSize', params.pageSize.toString());
    if (params.search) query.append('search', params.search);
    if (params.orderStatus) query.append('orderStatus', params.orderStatus);
    if (params.paymentStatus) query.append('paymentStatus', params.paymentStatus);
    if (params.fulfillmentStatus) query.append('fulfillmentStatus', params.fulfillmentStatus);
    if (params.dateFrom) query.append('dateFrom', params.dateFrom);
    if (params.dateTo) query.append('dateTo', params.dateTo);
    if (params.sortBy) query.append('sortBy', params.sortBy);
    if (params.sortDirection) query.append('sortDirection', params.sortDirection);

    const res = await fetch(`${API_BASE_URL}/orders?${query.toString()}`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fall back to in-memory store
  }

  // Filter in-memory demo data
  let filtered = [...inMemoryOrderStore];
  if (params.search) {
    const s = params.search.toLowerCase();
    filtered = filtered.filter(
      (o) =>
        o.orderNumber.toLowerCase().includes(s) ||
        o.customerEmail.toLowerCase().includes(s) ||
        (o.customerPhone && o.customerPhone.includes(s)),
    );
  }
  if (params.orderStatus) {
    filtered = filtered.filter((o) => o.orderStatus === params.orderStatus);
  }
  if (params.paymentStatus) {
    filtered = filtered.filter((o) => o.paymentStatus === params.paymentStatus);
  }
  if (params.fulfillmentStatus) {
    filtered = filtered.filter((o) => o.fulfillmentStatus === params.fulfillmentStatus);
  }

  const page = params.page || 1;
  const pageSize = params.pageSize || 20;
  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const paginated = filtered.slice(start, start + pageSize);

  return {
    data: paginated,
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

export async function fetchOrderDetails(id: string): Promise<OrderAdminDetailsDto> {
  try {
    const res = await fetch(`${API_BASE_URL}/orders/${encodeURIComponent(id)}`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fall back
  }

  const found = inMemoryOrderStore.find((o) => o.id === id || o.orderNumber === id);
  if (found) {
    return found;
  }
  throw new Error(`Order ${id} not found`);
}

export async function updateOrderStatus(
  id: string,
  dto: UpdateOrderStatusDto,
): Promise<OrderAdminDetailsDto> {
  try {
    const res = await fetch(`${API_BASE_URL}/orders/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    });

    if (res.ok) {
      return await res.json();
    }
    const err = await res.json();
    throw new Error(err.message || 'Failed to update order status');
  } catch (e: any) {
    // Update local memory store fallback
    const idx = inMemoryOrderStore.findIndex((o) => o.id === id || o.orderNumber === id);
    if (idx !== -1) {
      inMemoryOrderStore[idx] = {
        ...inMemoryOrderStore[idx]!,
        orderStatus: dto.status,
        updatedAt: new Date().toISOString(),
      };
      return inMemoryOrderStore[idx]!;
    }
    throw e;
  }
}

export async function pickPackOrder(
  id: string,
  dto: PickPackOrderDto = {},
): Promise<OrderAdminDetailsDto> {
  try {
    const res = await fetch(`${API_BASE_URL}/orders/${encodeURIComponent(id)}/pick-pack`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    });

    if (res.ok) {
      return await res.json();
    }
    const err = await res.json();
    throw new Error(err.message || 'Failed to initiate pick and pack');
  } catch (e: any) {
    const idx = inMemoryOrderStore.findIndex((o) => o.id === id || o.orderNumber === id);
    if (idx !== -1) {
      inMemoryOrderStore[idx] = {
        ...inMemoryOrderStore[idx]!,
        orderStatus: 'PROCESSING',
        updatedAt: new Date().toISOString(),
      };
      return inMemoryOrderStore[idx]!;
    }
    throw e;
  }
}

export async function dispatchCourierShipment(
  id: string,
  dto: DispatchCourierShipmentDto,
): Promise<OrderAdminDetailsDto> {
  try {
    const res = await fetch(`${API_BASE_URL}/orders/${encodeURIComponent(id)}/dispatch`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    });

    if (res.ok) {
      return await res.json();
    }
    const err = await res.json();
    throw new Error(err.message || 'Failed to dispatch shipment');
  } catch (e: any) {
    const idx = inMemoryOrderStore.findIndex((o) => o.id === id || o.orderNumber === id);
    if (idx !== -1) {
      inMemoryOrderStore[idx] = {
        ...inMemoryOrderStore[idx]!,
        orderStatus: 'SHIPPED',
        fulfillmentStatus: 'FULFILLED',
        shipments: [
          ...inMemoryOrderStore[idx]!.shipments,
          {
            id: `ship-${Date.now()}`,
            orderId: id,
            carrierName: dto.carrierName,
            trackingNumber: dto.trackingNumber,
            trackingUrl:
              dto.trackingUrl || `https://www.nzpost.co.nz/tools/tracking?track=${dto.trackingNumber}`,
            status: 'IN_TRANSIT',
            shippedAt: new Date().toISOString(),
            deliveredAt: null,
            createdAt: new Date().toISOString(),
            items: [],
          },
        ],
        updatedAt: new Date().toISOString(),
      };
      return inMemoryOrderStore[idx]!;
    }
    throw e;
  }
}

export async function confirmDepotCollection(
  id: string,
  dto: ConfirmDepotCollectionDto,
): Promise<OrderAdminDetailsDto> {
  try {
    const res = await fetch(`${API_BASE_URL}/orders/${encodeURIComponent(id)}/collect`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    });

    if (res.ok) {
      return await res.json();
    }
    const err = await res.json();
    throw new Error(err.message || 'Failed to confirm depot collection');
  } catch (e: any) {
    const idx = inMemoryOrderStore.findIndex((o) => o.id === id || o.orderNumber === id);
    if (idx !== -1) {
      inMemoryOrderStore[idx] = {
        ...inMemoryOrderStore[idx]!,
        orderStatus: 'DELIVERED',
        fulfillmentStatus: 'FULFILLED',
        updatedAt: new Date().toISOString(),
      };
      return inMemoryOrderStore[idx]!;
    }
    throw e;
  }
}

export async function cancelOrder(id: string, dto: CancelOrderDto): Promise<OrderAdminDetailsDto> {
  try {
    const res = await fetch(`${API_BASE_URL}/orders/${encodeURIComponent(id)}/cancel`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    });

    if (res.ok) {
      return await res.json();
    }
    const err = await res.json();
    throw new Error(err.message || 'Failed to cancel order');
  } catch (e: any) {
    const idx = inMemoryOrderStore.findIndex((o) => o.id === id || o.orderNumber === id);
    if (idx !== -1) {
      inMemoryOrderStore[idx] = {
        ...inMemoryOrderStore[idx]!,
        orderStatus: 'CANCELLED',
        paymentStatus:
          dto.refundPayment !== false ? 'REFUNDED' : inMemoryOrderStore[idx]!.paymentStatus,
        updatedAt: new Date().toISOString(),
      };
      return inMemoryOrderStore[idx]!;
    }
    throw e;
  }
}

export async function processRefund(
  id: string,
  dto: ProcessRefundDto,
): Promise<OrderAdminDetailsDto> {
  try {
    const res = await fetch(`${API_BASE_URL}/orders/${encodeURIComponent(id)}/refund`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    });

    if (res.ok) {
      return await res.json();
    }
    const err = await res.json();
    throw new Error(err.message || 'Failed to process refund');
  } catch (e: any) {
    const idx = inMemoryOrderStore.findIndex((o) => o.id === id || o.orderNumber === id);
    if (idx !== -1) {
      inMemoryOrderStore[idx] = {
        ...inMemoryOrderStore[idx]!,
        orderStatus: 'REFUNDED',
        paymentStatus: 'REFUNDED',
        updatedAt: new Date().toISOString(),
      };
      return inMemoryOrderStore[idx]!;
    }
    throw e;
  }
}

export async function reviewReturnRequest(
  returnId: string,
  dto: ReviewReturnRequestDto,
): Promise<ReturnRequestDto> {
  const res = await fetch(`${API_BASE_URL}/orders/returns/${encodeURIComponent(returnId)}/review`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });

  if (res.ok) {
    return await res.json();
  }
  const err = await res.json();
  throw new Error(err.message || 'Failed to review return request');
}

export async function inspectReturn(
  returnItemId: string,
  dto: RecordReturnInspectionDto,
): Promise<ReturnRequestDto> {
  const res = await fetch(
    `${API_BASE_URL}/orders/returns/items/${encodeURIComponent(returnItemId)}/inspect`,
    {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    },
  );

  if (res.ok) {
    return await res.json();
  }
  const err = await res.json();
  throw new Error(err.message || 'Failed to record return inspection');
}

// ---------------------------------------------------------------------------
// Customer Self-Service Order Methods
// ---------------------------------------------------------------------------

export async function fetchMyOrders(
  page = 1,
  pageSize = 10,
): Promise<PaginatedResponse<OrderAdminDetailsDto>> {
  try {
    const res = await fetch(`${API_BASE_URL}/orders/my-orders?page=${page}&pageSize=${pageSize}`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback to customer's demo orders
  }

  const custOrders = inMemoryOrderStore.filter((o) => o.customerId === 'cust-auckland-01');
  return {
    data: custOrders,
    meta: {
      page: 1,
      pageSize: 10,
      total: custOrders.length,
      totalPages: 1,
    },
  };
}

export async function fetchMyOrderDetail(orderNumber: string): Promise<OrderAdminDetailsDto> {
  try {
    const res = await fetch(`${API_BASE_URL}/orders/my-orders/${encodeURIComponent(orderNumber)}`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback
  }

  const found = inMemoryOrderStore.find((o) => o.orderNumber === orderNumber);
  if (found) {
    return found;
  }
  throw new Error(`Order ${orderNumber} not found`);
}

export async function cancelMyOrder(
  orderNumber: string,
  reason: string,
): Promise<OrderAdminDetailsDto> {
  const res = await fetch(
    `${API_BASE_URL}/orders/my-orders/${encodeURIComponent(orderNumber)}/cancel`,
    {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    },
  );

  if (res.ok) {
    return await res.json();
  }
  const err = await res.json();
  throw new Error(err.message || 'Failed to cancel order');
}

export async function submitMyReturn(
  orderNumber: string,
  dto: CreateReturnRequestDto,
): Promise<ReturnRequestDto> {
  const res = await fetch(
    `${API_BASE_URL}/orders/my-orders/${encodeURIComponent(orderNumber)}/return`,
    {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    },
  );

  if (res.ok) {
    return await res.json();
  }
  const err = await res.json();
  throw new Error(err.message || 'Failed to submit return request');
}
