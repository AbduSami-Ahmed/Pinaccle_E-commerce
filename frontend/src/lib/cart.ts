/**
 * Storefront Cart Client API (Phase 10)
 * Communicates with /api/cart/* endpoints with reliable persistence and cross-domain session handling.
 */

import { AddToCartDto, CartDto, CartItemDto, CartTotalsDto } from '@pinnacle/contracts';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

const CART_SESSION_KEY = 'pinnacle_cart_session_token';
const CART_DATA_KEY = 'pinnacle_cart_data';

// Default empty cart
const EMPTY_CART: CartDto = {
  id: 'cart-session-default',
  sessionToken: '',
  customerId: null,
  currency: 'NZD',
  items: [],
  totals: {
    subtotal: 0.0,
    taxIncluded: 0.0,
    shippingEstimate: 0.0,
    shippingMethod: 'CLICK_AND_COLLECT',
    total: 0.0,
    currency: 'NZD',
  },
  totalPacksCount: 0,
  totalPhysicalUnitsCount: 0,
  hasUnavailableItems: false,
  updatedAt: new Date().toISOString(),
};

function getStoredSessionToken(): string {
  if (typeof window === 'undefined') return '';
  let token = localStorage.getItem(CART_SESSION_KEY);
  if (!token) {
    token = `sess_${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`;
    localStorage.setItem(CART_SESSION_KEY, token);
  }
  return token;
}

function setStoredSessionToken(token: string) {
  if (typeof window !== 'undefined' && token) {
    try {
      localStorage.setItem(CART_SESSION_KEY, token);
    } catch {
      // Ignore storage errors
    }
  }
}

function getStoredCart(): CartDto {
  if (typeof window === 'undefined') return { ...EMPTY_CART };
  try {
    const raw = localStorage.getItem(CART_DATA_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as CartDto;
      if (parsed && Array.isArray(parsed.items)) {
        return parsed;
      }
    }
  } catch {
    // Ignore parse error
  }
  return { ...EMPTY_CART, sessionToken: getStoredSessionToken() };
}

function setStoredCart(cart: CartDto) {
  if (typeof window !== 'undefined' && cart) {
    try {
      localStorage.setItem(CART_DATA_KEY, JSON.stringify(cart));
      if (cart.sessionToken) {
        setStoredSessionToken(cart.sessionToken);
      }
    } catch {
      // Ignore storage quota errors
    }
  }
}

function getAuthHeaders(): Record<string, string> {
  const sessionToken = getStoredSessionToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (sessionToken) {
    headers['x-cart-session'] = sessionToken;
  }
  if (typeof window !== 'undefined') {
    const authToken =
      sessionStorage.getItem('pinnacle_access_token') ||
      localStorage.getItem('pinnacle_access_token');
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
  }
  return headers;
}

export function recalculateCartTotals(items: CartItemDto[]): CartTotalsDto {
  const subtotal = Number(items.reduce((acc, i) => acc + (i.lineTotal || 0), 0).toFixed(2));
  // 15% New Zealand Goods & Services Tax (GST included)
  const taxIncluded = Number(((subtotal * 15) / 115).toFixed(2));
  const shippingEstimate = 0.0;
  return {
    subtotal,
    taxIncluded,
    shippingEstimate,
    shippingMethod: 'CLICK_AND_COLLECT',
    total: Number((subtotal + shippingEstimate).toFixed(2)),
    currency: 'NZD',
  };
}

export async function fetchCart(): Promise<CartDto> {
  const headers = getAuthHeaders();

  try {
    const res = await fetch(`${API_BASE_URL}/cart`, {
      method: 'GET',
      credentials: 'include',
      headers,
      cache: 'no-store',
    });

    if (res.ok) {
      const data = await res.json();
      if (data?.cart) {
        setStoredCart(data.cart);
        return data.cart;
      }
    }
  } catch {
    // Live backend unreachable; fall back to local stored cart
  }

  return getStoredCart();
}

export interface AddToCartMetadata {
  productTitle?: string;
  productSlug?: string;
  productSku?: string;
  productBrand?: string;
  categorySlug?: string;
  primaryImageUrl?: string | null;
  saleUnitName?: string;
  saleUnitMultiplier?: number;
  unitPrice?: number;
  isIndividuallyTracked?: boolean;
  serializedItemId?: string;
  serializedStockBarcode?: string | null;
}

export async function addToCart(
  dto: AddToCartDto,
  metadata?: AddToCartMetadata,
): Promise<CartDto> {
  const headers = getAuthHeaders();

  try {
    const res = await fetch(`${API_BASE_URL}/cart/items`, {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify(dto),
    });

    if (res.ok) {
      const data = await res.json();
      if (data?.cart) {
        setStoredCart(data.cart);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('pinnacle_cart_updated', { detail: data.cart }));
        }
        return data.cart;
      }
    } else {
      const err = await res.json().catch(() => ({}));
      const rawMsg = err.message || err.error;
      const message = Array.isArray(rawMsg)
        ? rawMsg.join(', ')
        : typeof rawMsg === 'string'
          ? rawMsg
          : 'Failed to add item to cart';
      throw new Error(message);
    }
  } catch (error) {
    // If it is a real validation or stock error returned from backend, throw it to the UI
    if (
      error instanceof Error &&
      error.message !== 'Failed to fetch' &&
      !error.message.toLowerCase().includes('network') &&
      !error.message.toLowerCase().includes('fetch')
    ) {
      throw error;
    }

    // Graceful offline / network failure fallback: update local cart in localStorage
    const currentCart = getStoredCart();
    const qty = Math.max(1, dto.quantity || 1);
    const mult = metadata?.saleUnitMultiplier || 1;
    const price = Number(metadata?.unitPrice || 0);
    const lineTotal = Number((price * qty).toFixed(2));
    const totalPhysicalUnits = qty * mult;

    const existingIndex = currentCart.items.findIndex(
      (i) =>
        i.productId === dto.productId &&
        i.saleUnitConfigId === dto.saleUnitConfigId &&
        !i.isIndividuallyTracked &&
        !dto.serializedItemId,
    );

    let newItems: CartItemDto[];
    if (existingIndex >= 0 && currentCart.items[existingIndex]) {
      newItems = [...currentCart.items];
      const existing = newItems[existingIndex]!;
      const updatedQty = existing.quantity + qty;
      newItems[existingIndex] = {
        ...existing,
        quantity: updatedQty,
        totalPhysicalUnits: updatedQty * existing.saleUnitMultiplier,
        lineTotal: Number((existing.unitPrice * updatedQty).toFixed(2)),
      };
    } else {
      const newItem: CartItemDto = {
        id: `local-item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        cartId: currentCart.id,
        productId: dto.productId,
        productTitle: metadata?.productTitle || 'Automotive Component',
        productSlug: metadata?.productSlug || dto.productId,
        productSku: metadata?.productSku || 'SKU-PENDING',
        productBrand: metadata?.productBrand || 'Pinnacle',
        categorySlug: metadata?.categorySlug || 'parts',
        primaryImageUrl: metadata?.primaryImageUrl || null,
        saleUnitConfigId: dto.saleUnitConfigId,
        saleUnitName: metadata?.saleUnitName || (mult > 1 ? `Pack of ${mult}` : 'Single Unit'),
        saleUnitMultiplier: mult,
        quantity: qty,
        totalPhysicalUnits,
        unitPrice: price,
        lineTotal,
        isAvailable: true,
        maxAvailableQuantity: 99,
        serializedItemId: dto.serializedItemId,
        serializedStockBarcode: metadata?.serializedStockBarcode || null,
        isIndividuallyTracked: Boolean(dto.serializedItemId || metadata?.isIndividuallyTracked),
      };
      newItems = [...currentCart.items, newItem];
    }

    const totals = recalculateCartTotals(newItems);
    const updatedCart: CartDto = {
      ...currentCart,
      items: newItems,
      totals,
      totalPacksCount: newItems.reduce((acc, i) => acc + i.quantity, 0),
      totalPhysicalUnitsCount: newItems.reduce((acc, i) => acc + i.totalPhysicalUnits, 0),
      hasUnavailableItems: false,
      updatedAt: new Date().toISOString(),
    };

    setStoredCart(updatedCart);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pinnacle_cart_updated', { detail: updatedCart }));
    }
    return updatedCart;
  }

  return getStoredCart();
}

export async function updateCartItemQuantity(itemId: string, quantity: number): Promise<CartDto> {
  const safeQty = Math.max(1, quantity);
  const headers = getAuthHeaders();

  try {
    const res = await fetch(`${API_BASE_URL}/cart/items/${encodeURIComponent(itemId)}`, {
      method: 'PATCH',
      credentials: 'include',
      headers,
      body: JSON.stringify({ quantity: safeQty }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data?.cart) {
        setStoredCart(data.cart);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('pinnacle_cart_updated', { detail: data.cart }));
        }
        return data.cart;
      }
    } else {
      const err = await res.json().catch(() => ({}));
      const rawMsg = err.message || err.error;
      const message = Array.isArray(rawMsg)
        ? rawMsg.join(', ')
        : typeof rawMsg === 'string'
          ? rawMsg
          : 'Failed to update item quantity';
      throw new Error(message);
    }
  } catch (error) {
    if (
      error instanceof Error &&
      error.message !== 'Failed to fetch' &&
      !error.message.toLowerCase().includes('network') &&
      !error.message.toLowerCase().includes('fetch')
    ) {
      throw error;
    }
  }

  // Local fallback update in localStorage
  const currentCart = getStoredCart();
  const updatedItems = currentCart.items.map((item) => {
    if (item.id === itemId) {
      const newQty = Math.max(1, Math.min(safeQty, item.maxAvailableQuantity || 99));
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
  const updatedCart: CartDto = {
    ...currentCart,
    items: updatedItems,
    totals,
    totalPacksCount: updatedItems.reduce((acc, i) => acc + i.quantity, 0),
    totalPhysicalUnitsCount: updatedItems.reduce((acc, i) => acc + i.totalPhysicalUnits, 0),
    updatedAt: new Date().toISOString(),
  };

  setStoredCart(updatedCart);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('pinnacle_cart_updated', { detail: updatedCart }));
  }

  return updatedCart;
}

export async function removeFromCart(itemId: string): Promise<CartDto> {
  const headers = getAuthHeaders();

  try {
    const res = await fetch(`${API_BASE_URL}/cart/items/${encodeURIComponent(itemId)}`, {
      method: 'DELETE',
      credentials: 'include',
      headers,
    });

    if (res.ok) {
      const data = await res.json();
      if (data?.cart) {
        setStoredCart(data.cart);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('pinnacle_cart_updated', { detail: data.cart }));
        }
        return data.cart;
      }
    }
  } catch {
    // Live API check failed; proceed with local deletion
  }

  // Guaranteed deletion in localStorage so it stays deleted after page refresh
  const currentCart = getStoredCart();
  const updatedItems = currentCart.items.filter((i) => i.id !== itemId);
  const totals = recalculateCartTotals(updatedItems);

  const updatedCart: CartDto = {
    ...currentCart,
    items: updatedItems,
    totals,
    totalPacksCount: updatedItems.reduce((acc, i) => acc + i.quantity, 0),
    totalPhysicalUnitsCount: updatedItems.reduce((acc, i) => acc + i.totalPhysicalUnits, 0),
    updatedAt: new Date().toISOString(),
  };

  setStoredCart(updatedCart);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('pinnacle_cart_updated', { detail: updatedCart }));
  }

  return updatedCart;
}

export async function clearCart(): Promise<CartDto> {
  const headers = getAuthHeaders();

  try {
    const res = await fetch(`${API_BASE_URL}/cart`, {
      method: 'DELETE',
      credentials: 'include',
      headers,
    });

    if (res.ok) {
      const data = await res.json();
      if (data?.cart) {
        setStoredCart(data.cart);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('pinnacle_cart_updated', { detail: data.cart }));
        }
        return data.cart;
      }
    }
  } catch {
    // Live API failed; clear local cart
  }

  const clearedCart: CartDto = {
    ...EMPTY_CART,
    sessionToken: getStoredSessionToken(),
    items: [],
    updatedAt: new Date().toISOString(),
  };

  setStoredCart(clearedCart);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('pinnacle_cart_updated', { detail: clearedCart }));
  }

  return clearedCart;
}
