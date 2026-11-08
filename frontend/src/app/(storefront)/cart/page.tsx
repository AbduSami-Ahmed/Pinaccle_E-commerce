'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  ShieldCheck,
  Disc,
  Clock,
  AlertTriangle,
  MapPin,
  Truck,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { fetchCart, updateCartItemQuantity, removeFromCart, clearCart } from '@/lib/cart';
import { CartDto } from '@pinnacle/contracts';

export default function CartPage() {
  const [cart, setCart] = React.useState<CartDto | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [updatingItemId, setUpdatingItemId] = React.useState<string | null>(null);
  const [shippingMethod, setShippingMethod] = React.useState<
    'CLICK_AND_COLLECT' | 'EXPRESS_COURIER'
  >('CLICK_AND_COLLECT');

  const loadCart = React.useCallback(async () => {
    try {
      const data = await fetchCart();
      setCart(data);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadCart();
  }, [loadCart]);

  const handleQuantityChange = async (itemId: string, newQty: number) => {
    if (newQty < 1) return;
    setUpdatingItemId(itemId);
    try {
      const updated = await updateCartItemQuantity(itemId, newQty);
      setCart(updated);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error updating quantity');
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleRemove = async (itemId: string) => {
    setUpdatingItemId(itemId);
    try {
      const updated = await removeFromCart(itemId);
      setCart(updated);
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleClear = async () => {
    if (!confirm('Are you sure you want to remove all items from your cart?')) return;
    setLoading(true);
    try {
      const updated = await clearCart();
      setCart(updated);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        <div className="h-6 w-48 rounded bg-slate-200 animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-4">
            <div className="h-32 rounded-xl bg-slate-100 animate-pulse" />
            <div className="h-32 rounded-xl bg-slate-100 animate-pulse" />
          </div>
          <div className="lg:col-span-4 h-64 rounded-xl bg-slate-100 animate-pulse" />
        </div>
      </div>
    );
  }

  const items = cart?.items || [];
  const isCartEmpty = items.length === 0;

  // Shipping cost: $0 for Click and Collect; $25 flat express courier estimate
  const courierFee = shippingMethod === 'EXPRESS_COURIER' ? 25.0 : 0.0;
  const subtotal = cart?.totals.subtotal || 0;
  const grandTotal = subtotal + courierFee;
  const taxIncluded = Number(((grandTotal * 10) / 110).toFixed(2));
  const hasUnavailableItems = items.some((i) => !i.isAvailable);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/">Home</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Parts Cart</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-blue-700" />
            Parts Cart & Staged Items
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Real-time physical stock validation from our Auckland Penrose central depot.
          </p>
        </div>

        {!isCartEmpty && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClear}
            className="text-xs text-slate-500 hover:text-rose-600 hover:border-rose-300 w-fit"
          >
            Clear Cart
          </Button>
        )}
      </div>

      {isCartEmpty ? (
        /* Empty State */
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center space-y-4 max-w-2xl mx-auto my-6">
          <div className="h-16 w-16 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
            <ShoppingCart className="h-8 w-8 stroke-[1.5]" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Your parts cart is empty</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            Looking for passenger/commercial tyres or workshop-inspected seat belts? Browse our
            catalogue or check exact vehicle fitment.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button
              asChild
              className="bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold"
            >
              <Link href="/tyres">Explore Tyres</Link>
            </Button>
            <Button asChild variant="outline" className="text-xs font-semibold">
              <Link href="/seat-belts">Explore Seat Belts</Link>
            </Button>
            <Button asChild variant="outline" className="text-xs font-semibold">
              <Link href="/fitment">Vehicle Finder</Link>
            </Button>
          </div>
        </div>
      ) : (
        /* Active Cart Layout */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Cart Items List (8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            {hasUnavailableItems && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-950 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold">Inventory Availability Notice:</span>
                  <p className="text-[11px] leading-relaxed">
                    One or more items in your cart exceed currently available depot inventory.
                    Please adjust quantities or remove unavailable items to proceed.
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {items.map((item) => {
                const productUrl =
                  item.categorySlug === 'tyres'
                    ? `/tyres/${item.productSlug}`
                    : item.categorySlug === 'seat-belts'
                      ? `/seat-belts/${item.productSlug}`
                      : `/products/${item.productSlug}`;

                const isBusy = updatingItemId === item.id;

                return (
                  <div
                    key={item.id}
                    className={`rounded-xl border bg-white p-4 sm:p-5 shadow-xs transition-all ${
                      !item.isAvailable ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row gap-4">
                      {/* Product Thumbnail */}
                      <Link
                        href={productUrl}
                        className="relative h-24 w-28 shrink-0 overflow-hidden rounded-lg bg-slate-100 border border-slate-200"
                      >
                        {item.primaryImageUrl ? (
                          <Image
                            src={item.primaryImageUrl}
                            alt={item.productTitle}
                            fill
                            sizes="112px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-slate-400">
                            {item.categorySlug === 'tyres' ? (
                              <Disc className="h-8 w-8 stroke-[1]" />
                            ) : (
                              <ShieldCheck className="h-8 w-8 stroke-[1]" />
                            )}
                          </div>
                        )}
                      </Link>

                      {/* Item Details */}
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
                              {item.productBrand}
                            </span>
                            <h3 className="text-sm font-bold text-slate-900 leading-snug">
                              <Link
                                href={productUrl}
                                className="hover:text-blue-700 transition-colors"
                              >
                                {item.productTitle}
                              </Link>
                            </h3>
                            <div className="mt-0.5 font-mono text-[11px] text-slate-400">
                              SKU: {item.productSku}
                            </div>
                          </div>

                          {/* Line Total */}
                          <div className="text-right shrink-0">
                            <span className="text-base font-extrabold text-slate-900">
                              ${item.lineTotal.toFixed(2)}
                            </span>
                            <span className="block text-[10px] text-slate-400">
                              (${item.unitPrice.toFixed(2)} / pack)
                            </span>
                          </div>
                        </div>

                        {/* Explicit Sale Unit & Consumption Rule */}
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <Badge
                            variant="secondary"
                            className="bg-slate-100 text-slate-800 text-[11px] font-semibold"
                          >
                            {item.saleUnitName}
                          </Badge>

                          {item.serializedStockBarcode && (
                            <Badge
                              variant="outline"
                              className="border-amber-300 bg-amber-50 text-amber-900 font-mono text-[10px]"
                            >
                              Serial: {item.serializedStockBarcode}
                            </Badge>
                          )}

                          <span className="text-[11px] text-slate-500 font-medium">
                            {item.quantity} pack{item.quantity > 1 ? 's' : ''} ={' '}
                            <strong>
                              {item.totalPhysicalUnits} physical item
                              {item.totalPhysicalUnits > 1 ? 's' : ''}
                            </strong>
                          </span>
                        </div>

                        {/* Availability Alert if constrained */}
                        {item.stockAvailabilityMessage && (
                          <div className="rounded bg-amber-100/70 p-2 text-[11px] text-amber-900 flex items-center gap-1.5 font-medium">
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-700 shrink-0" />
                            <span>{item.stockAvailabilityMessage}</span>
                          </div>
                        )}

                        {/* Quantity Controls & Remove */}
                        <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                          <div className="flex items-center gap-3">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                              Pack Quantity:
                            </span>

                            {item.isIndividuallyTracked ? (
                              <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded">
                                1 (Unique Serialized Part)
                              </span>
                            ) : (
                              <div className="flex items-center rounded-lg border border-slate-300 bg-white">
                                <button
                                  type="button"
                                  onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                                  disabled={item.quantity <= 1 || isBusy}
                                  aria-label="Decrease quantity"
                                  className="flex h-8 w-8 items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                                >
                                  <Minus className="h-3 w-3" />
                                </button>

                                <span className="w-8 text-center text-xs font-bold text-slate-900">
                                  {item.quantity}
                                </span>

                                <button
                                  type="button"
                                  onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                                  disabled={item.quantity >= item.maxAvailableQuantity || isBusy}
                                  aria-label="Increase quantity"
                                  className="flex h-8 w-8 items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                              </div>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemove(item.id)}
                            disabled={isBusy}
                            className="text-xs text-slate-400 hover:text-rose-600 flex items-center gap-1 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Remove</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Depot Trade Dispatch Notice */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 space-y-2">
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <Clock className="h-4 w-4 text-blue-700" />
                <span>Trade Dispatch Cutoff:</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Orders confirmed before <strong>2:00 PM NZST</strong> dispatch same business day
                from our Auckland Penrose depot via CourierPost or Mainfreight Express.
              </p>
            </div>
          </div>

          {/* Right: Order Summary Card (4 cols) */}
          <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-24">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-5">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-3">
                Order Summary
              </h2>

              {/* Fulfilment Method Selector */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                  Select Delivery / Collection:
                </label>

                <div className="grid grid-cols-1 gap-2">
                  <button
                    type="button"
                    onClick={() => setShippingMethod('CLICK_AND_COLLECT')}
                    className={`flex items-start gap-2.5 p-3 rounded-lg border text-left transition-all ${
                      shippingMethod === 'CLICK_AND_COLLECT'
                        ? 'border-blue-700 bg-blue-50/70 ring-1 ring-blue-700 text-blue-950'
                        : 'border-slate-200 bg-slate-50/50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <MapPin className="h-4 w-4 text-blue-700 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold">Trade Counter Pickup (FREE)</div>
                      <div className="text-[11px] text-slate-500">
                        Auckland Penrose depot · Ready in 30 mins
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShippingMethod('EXPRESS_COURIER')}
                    className={`flex items-start gap-2.5 p-3 rounded-lg border text-left transition-all ${
                      shippingMethod === 'EXPRESS_COURIER'
                        ? 'border-blue-700 bg-blue-50/70 ring-1 ring-blue-700 text-blue-950'
                        : 'border-slate-200 bg-slate-50/50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Truck className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold">Courier Freight ($25.00 NZD)</div>
                      <div className="text-[11px] text-slate-500">
                        CourierPost / Mainfreight across North & South Islands
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Totals Breakdown */}
              <div className="space-y-2 text-xs border-t border-slate-100 pt-3">
                <div className="flex justify-between text-slate-600">
                  <span>Parts Subtotal:</span>
                  <span className="font-semibold text-slate-900">${subtotal.toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-slate-600">
                  <span>Fulfilment / Freight:</span>
                  <span className="font-semibold text-slate-900">
                    {courierFee > 0 ? `$${courierFee.toFixed(2)}` : 'FREE Pickup'}
                  </span>
                </div>

                <div className="flex justify-between text-slate-500 text-[11px] pt-1 border-t border-slate-100">
                  <span>Includes approx. 15% GST:</span>
                  <span>${taxIncluded.toFixed(2)} NZD</span>
                </div>

                <div className="flex justify-between text-base font-extrabold text-slate-900 pt-2 border-t border-slate-200">
                  <span>Total (NZD):</span>
                  <span>${grandTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Reservation Timing Disclosure */}
              <div className="rounded bg-slate-50 p-2.5 text-[10px] text-slate-500 leading-relaxed border border-slate-200">
                <strong>Inventory Policy:</strong> Items in cart are validated against live stock
                but are not indefinitely reserved until the order confirmation step.
              </div>

              {/* Checkout Action */}
              <div className="space-y-2">
                <Link
                  href={hasUnavailableItems ? '#' : '/checkout'}
                  className={`w-full inline-flex items-center justify-center font-bold text-sm gap-2 py-3 px-4 rounded-md shadow-sm transition ${
                    hasUnavailableItems
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed pointer-events-none'
                      : 'bg-blue-700 hover:bg-blue-800 text-white cursor-pointer'
                  }`}
                >
                  <span>Proceed to Workshop Checkout</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              {/* Trust Badges */}
              <div className="border-t border-slate-100 pt-3 space-y-1.5 text-[11px] text-slate-500">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>30-Day Workshop Replacement Guarantee</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <RotateCcw className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                  <span>Registered Motor Vehicle Trader MVD-89211</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
