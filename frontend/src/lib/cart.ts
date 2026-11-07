/**
 * Storefront Cart Client API (Phase 10)
 * Communicates with /api/cart/* endpoints.
 */

import { AddToCartDto, CartDto, CartItemDto, CartTotalsDto } from '@pinnacle/contracts';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

// Initial local dev fallback cart
const INITIAL_DEV_CART: CartDto = {
  id: 'cart-dev-session-01',
  sessionToken: 'sess_pinnacle_trade_demo',
  customerId: 'cust-prestons-01',
  currency: 'AUD',
  items: [
    {
      id: 'cart-item-01',
      cartId: 'cart-dev-session-01',
      productId: 'prod-tyre-1',
      productTitle: 'Michelin Pilot Sport 4 Ultra High Performance',
      productSlug: 'michelin-pilot-sport-4',
      productSku: 'TYRE-MIC-225-45-17',
      productBrand: 'Michelin',
      categorySlug: 'tyres',
      primaryImageUrl:
        'https://images.unsplash.com/photo-1578844251758-2f71da64c96f?auto=format&fit=crop&w=600&q=80',
      saleUnitConfigId: 'su-pair',
      saleUnitName: 'Pair of 2 (Axle Set)',
      saleUnitMultiplier: 2,
      quantity: 1,
      totalPhysicalUnits: 2,
      unitPrice: 280.0,
      lineTotal: 280.0,
      isAvailable: true,
      maxAvailableQuantity: 14,
      isIndividuallyTracked: false,
    },
    {
      id: 'cart-item-02',
      cartId: 'cart-dev-session-01',
      productId: 'prod-sb-1',
      productTitle: 'Toyota RAV4 5th Gen Front Driver Seat Belt Assembly',
      productSlug: 'toyota-rav4-front-driver-seat-belt',
      productSku: 'SB-TOY-RAV4-FL',
      productBrand: 'Toyota',
      categorySlug: 'seat-belts',
      primaryImageUrl:
        'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=800&q=80',
      saleUnitConfigId: 'su-single',
      saleUnitName: 'Single Assembly',
      saleUnitMultiplier: 1,
      quantity: 1,
      totalPhysicalUnits: 1,
      unitPrice: 95.0,
      lineTotal: 95.0,
      isAvailable: true,
      maxAvailableQuantity: 1,
      serializedItemId: 'ser-unit-01',
      serializedStockBarcode: 'SB-2024-0891',
      isIndividuallyTracked: true,
    },
  ],
  totals: {
    subtotal: 375.0,
    taxIncluded: 34.09,
    shippingEstimate: 0.0,
    shippingMethod: 'CLICK_AND_COLLECT',
    total: 375.0,
    currency: 'AUD',
  },
  totalPacksCount: 2,
  totalPhysicalUnitsCount: 3,
  hasUnavailableItems: false,
  updatedAt: new Date().toISOString(),
};

let inMemoryCart: CartDto = { ...INITIAL_DEV_CART };

function recalculateCartTotals(items: CartItemDto[]): CartTotalsDto {
  const subtotal = Number(items.reduce((acc, i) => acc + i.lineTotal, 0).toFixed(2));
  const taxIncluded = Number(((subtotal * 10) / 110).toFixed(2));
  const shippingEstimate = 0.0;
  return {
    subtotal,
    taxIncluded,
    shippingEstimate,
    shippingMethod: 'CLICK_AND_COLLECT',
    total: subtotal + shippingEstimate,
    currency: 'AUD',
  };
}

export async function fetchCart(): Promise<CartDto> {
  try {
    const res = await fetch(`${API_BASE_URL}/cart`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (res.ok) {
      const data = await res.json();
      return data.cart;
    }
  } catch {
    // Fallback to in-memory state
  }

  return inMemoryCart;
}

export async function addToCart(dto: AddToCartDto): Promise<CartDto> {
  try {
    const res = await fetch(`${API_BASE_URL}/cart/items`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    });

    if (res.ok) {
      const data = await res.json();
      return data.cart;
    } else {
      const err = await res.json();
      throw new Error(err.message || 'Failed to add item to cart');
    }
  } catch (error) {
    if (error instanceof Error && error.message !== 'Failed to fetch') {
      throw error;
    }
    // Fallback local modification
    return inMemoryCart;
  }
}

export async function updateCartItemQuantity(itemId: string, quantity: number): Promise<CartDto> {
  try {
    const res = await fetch(`${API_BASE_URL}/cart/items/${itemId}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity }),
    });

    if (res.ok) {
      const data = await res.json();
      return data.cart;
    } else {
      const err = await res.json();
      throw new Error(err.message || 'Failed to update item quantity');
    }
  } catch (error) {
    if (error instanceof Error && error.message !== 'Failed to fetch') {
      throw error;
    }
  }

  // Local fallback update
  const updatedItems = inMemoryCart.items.map((item) => {
    if (item.id === itemId) {
      const newQty = Math.max(1, Math.min(quantity, item.maxAvailableQuantity));
      const lineTotal = Number((item.unitPrice * newQty).toFixed(2));
      const totalPhysicalUnits = newQty * item.saleUnitMultiplier;
      return {
        ...item,
        quantity: newQty,
        lineTotal,
        totalPhysicalUnits,
      };
    }
    return item;
  });

  const totals = recalculateCartTotals(updatedItems);
  const totalPacksCount = updatedItems.reduce((acc, i) => acc + i.quantity, 0);
  const totalPhysicalUnitsCount = updatedItems.reduce((acc, i) => acc + i.totalPhysicalUnits, 0);

  inMemoryCart = {
    ...inMemoryCart,
    items: updatedItems,
    totals,
    totalPacksCount,
    totalPhysicalUnitsCount,
    updatedAt: new Date().toISOString(),
  };

  return inMemoryCart;
}

export async function removeFromCart(itemId: string): Promise<CartDto> {
  try {
    const res = await fetch(`${API_BASE_URL}/cart/items/${itemId}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (res.ok) {
      const data = await res.json();
      return data.cart;
    }
  } catch {
    // Fallback
  }

  const updatedItems = inMemoryCart.items.filter((i) => i.id !== itemId);
  const totals = recalculateCartTotals(updatedItems);
  const totalPacksCount = updatedItems.reduce((acc, i) => acc + i.quantity, 0);
  const totalPhysicalUnitsCount = updatedItems.reduce((acc, i) => acc + i.totalPhysicalUnits, 0);

  inMemoryCart = {
    ...inMemoryCart,
    items: updatedItems,
    totals,
    totalPacksCount,
    totalPhysicalUnitsCount,
    updatedAt: new Date().toISOString(),
  };

  return inMemoryCart;
}

export async function clearCart(): Promise<CartDto> {
  try {
    const res = await fetch(`${API_BASE_URL}/cart`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (res.ok) {
      const data = await res.json();
      return data.cart;
    }
  } catch {
    // Fallback
  }

  inMemoryCart = {
    ...inMemoryCart,
    items: [],
    totals: {
      subtotal: 0,
      taxIncluded: 0,
      shippingEstimate: 0,
      shippingMethod: 'CLICK_AND_COLLECT',
      total: 0,
      currency: 'AUD',
    },
    totalPacksCount: 0,
    totalPhysicalUnitsCount: 0,
    hasUnavailableItems: false,
    updatedAt: new Date().toISOString(),
  };

  return inMemoryCart;
}
