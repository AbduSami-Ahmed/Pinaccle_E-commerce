'use client';

import * as React from 'react';
import {
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Minus,
  Plus,
  ShoppingCart,
  PhoneCall,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { addToCart } from '@/lib/cart';

export interface SaleUnitOption {
  code: string;
  name: string;
  multiplier: number;
  price: number;
}

export interface SaleUnitPurchaserProps {
  productId: string;
  productTitle: string;
  basePrice: number;
  currency?: string;
  sellableBaseUnits: number;
  availableSaleUnits: SaleUnitOption[];
  isIndividuallyTracked?: boolean;
  stockNumber?: string;
  categorySlug?: string;
}

export function SaleUnitPurchaser({
  productId: _productId,
  productTitle: _productTitle,
  basePrice,
  currency = 'AUD',
  sellableBaseUnits,
  availableSaleUnits,
  isIndividuallyTracked = false,
  stockNumber: _stockNumber,
  categorySlug,
}: SaleUnitPurchaserProps) {
  const fallbackUnit: SaleUnitOption = {
    code: 'DEFAULT',
    name: isIndividuallyTracked ? 'Single Assembly' : 'Single Unit',
    multiplier: 1,
    price: basePrice,
  };

  const units: SaleUnitOption[] =
    availableSaleUnits && availableSaleUnits.length > 0 ? availableSaleUnits : [fallbackUnit];

  const initialCode = units[0]?.code ?? 'DEFAULT';
  const [selectedUnitCode, setSelectedUnitCode] = React.useState<string>(initialCode);
  const [quantity, setQuantity] = React.useState<number>(1);
  const [addedToastMessage, setAddedToastMessage] = React.useState<string | null>(null);
  const [addingToCart, setAddingToCart] = React.useState<boolean>(false);

  const activeUnit: SaleUnitOption =
    units.find((u) => u.code === selectedUnitCode) ?? units[0] ?? fallbackUnit;

  // Mathematical limit: floor(sellableBaseUnits / multiplier)
  const maxPacks = Math.max(0, Math.floor(sellableBaseUnits / activeUnit.multiplier));
  const isOutOfStock = maxPacks === 0;

  // Whenever the active unit changes, clamp quantity within [1, maxPacks]
  React.useEffect(() => {
    if (maxPacks > 0) {
      setQuantity((prev) => Math.min(Math.max(1, prev), maxPacks));
    } else {
      setQuantity(0);
    }
  }, [selectedUnitCode, maxPacks]);

  const handleUnitChange = (code: string) => {
    setSelectedUnitCode(code);
    setAddedToastMessage(null);
  };

  const handleIncrement = () => {
    if (quantity < maxPacks) {
      setQuantity((prev) => prev + 1);
    }
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      setQuantity((prev) => prev - 1);
    }
  };

  const handleQuantityInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (isNaN(val)) {
      setQuantity(1);
    } else {
      setQuantity(Math.min(Math.max(1, val), maxPacks));
    }
  };

  const totalPrice = activeUnit.price * quantity;
  const totalBaseUnitsConsumed = quantity * activeUnit.multiplier;

  const handleAddToCart = async () => {
    if (isOutOfStock || quantity <= 0) return;
    setAddingToCart(true);
    setAddedToastMessage(null);

    try {
      await addToCart({
        productId: _productId,
        saleUnitConfigId: activeUnit.code,
        quantity,
      });
      setAddedToastMessage(
        `Added ${quantity}x ${activeUnit.name} (${totalBaseUnitsConsumed} physical base units) to your parts cart.`,
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error adding to cart');
    } finally {
      setAddingToCart(false);
    }
  };

  return (
    <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
      {/* Price Display */}
      <div className="space-y-1">
        <div className="flex items-baseline justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-slate-900">
              ${activeUnit.price.toFixed(2)}
            </span>
            <span className="text-xs font-semibold text-slate-500 uppercase">
              {currency} (inc. GST)
            </span>
          </div>

          {activeUnit.multiplier > 1 && (
            <div className="text-right text-xs text-slate-500">
              <span>(${(activeUnit.price / activeUnit.multiplier).toFixed(2)} / each)</span>
            </div>
          )}
        </div>
        <p className="text-[11px] text-slate-500">
          Tax invoice supplied automatically. Direct B2B trade terms available for licensed
          workshops.
        </p>
      </div>

      {/* Sale Unit Selector Tabs (Single / Pair / Set) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Select Commercial Sale Unit:
          </label>
          <span className="text-[11px] text-slate-500">
            {units.length > 1 ? `${units.length} pack options` : 'Standard trade unit'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {units.map((unit) => {
            const isSelected = unit.code === selectedUnitCode;
            const unitMaxPacks = Math.floor(sellableBaseUnits / unit.multiplier);
            const unitOutOfStock = unitMaxPacks === 0;

            return (
              <button
                key={unit.code}
                type="button"
                onClick={() => handleUnitChange(unit.code)}
                className={cn(
                  'relative flex flex-col items-start p-3 rounded-lg border text-left transition-all focus:outline-none',
                  isSelected
                    ? 'border-blue-700 bg-blue-50/70 text-blue-950 ring-1 ring-blue-700 shadow-xs'
                    : 'border-slate-200 bg-slate-50/60 text-slate-700 hover:bg-slate-100/80',
                  unitOutOfStock && !isSelected && 'opacity-60 bg-slate-100',
                )}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-bold">{unit.name}</span>
                  {unit.multiplier > 1 && (
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0 bg-blue-100 text-blue-800 font-semibold"
                    >
                      {unit.multiplier}x
                    </Badge>
                  )}
                </div>

                <div className="mt-1 text-xs font-extrabold text-slate-900">
                  ${unit.price.toFixed(2)}
                </div>

                <div className="mt-1 text-[10px] text-slate-500">
                  {unitOutOfStock ? (
                    <span className="text-rose-600 font-medium">Out of Stock</span>
                  ) : (
                    <span>
                      Max {unitMaxPacks} pack{unitMaxPacks > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Explicit Explanation of What 1 Unit Means */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-700 flex items-start gap-2">
          <HelpCircle className="h-4 w-4 text-blue-700 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-semibold text-slate-900">Unit Consumption Rule:</span>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              1 purchase unit of <strong>{activeUnit.name}</strong> provides{' '}
              <strong>{activeUnit.multiplier}</strong> physical item
              {activeUnit.multiplier > 1 ? 's' : ''} and strictly consumes{' '}
              <strong>{activeUnit.multiplier}</strong> base inventory unit
              {activeUnit.multiplier > 1 ? 's' : ''} from our Sydney depot ledger.
            </p>
          </div>
        </div>
      </div>

      {/* Stock Availability Breakdown */}
      <div className="space-y-1 rounded-lg border border-slate-200 p-3 bg-white">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-600 font-medium">Physical Stock on Hand:</span>
          <span className="font-semibold text-slate-900">
            {sellableBaseUnits} base {categorySlug === 'tyres' ? 'tyres' : 'units'} verified
          </span>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-600 font-medium">Sellable {activeUnit.name}s:</span>
          {isOutOfStock ? (
            <span className="font-bold text-rose-600 flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5" /> 0 Available
            </span>
          ) : (
            <span className="font-bold text-emerald-700 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              {maxPacks} pack{maxPacks > 1 ? 's' : ''} ready to dispatch
            </span>
          )}
        </div>
      </div>

      {/* Quantity Selector & Action Controls */}
      {!isOutOfStock ? (
        <div className="space-y-3 pt-1">
          <div className="flex items-center gap-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 shrink-0">
              Quantity:
            </label>

            <div className="flex items-center rounded-lg border border-slate-300 bg-white shadow-xs">
              <button
                type="button"
                onClick={handleDecrement}
                disabled={quantity <= 1}
                aria-label="Decrease quantity"
                className="flex h-9 w-9 items-center justify-center rounded-l-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>

              <input
                type="number"
                min="1"
                max={maxPacks}
                value={quantity}
                onChange={handleQuantityInputChange}
                aria-label="Pack quantity"
                className="h-9 w-12 text-center text-sm font-bold text-slate-900 border-x border-slate-200 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />

              <button
                type="button"
                onClick={handleIncrement}
                disabled={quantity >= maxPacks}
                aria-label="Increase quantity"
                className="flex h-9 w-9 items-center justify-center rounded-r-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="text-xs text-slate-500">
              Subtotal: <strong className="text-slate-900">${totalPrice.toFixed(2)}</strong>
              {activeUnit.multiplier > 1 && (
                <span className="block text-[10px] text-slate-400">
                  Consumes {totalBaseUnitsConsumed} physical units
                </span>
              )}
            </div>
          </div>

          <Button
            type="button"
            size="lg"
            onClick={handleAddToCart}
            disabled={addingToCart}
            className="w-full gap-2 text-sm font-semibold bg-blue-700 hover:bg-blue-800 text-white shadow-sm disabled:opacity-70"
          >
            <ShoppingCart className="h-4 w-4" />
            <span>
              {addingToCart
                ? 'Adding to Cart...'
                : `Add ${quantity}x ${activeUnit.name} to Cart — $${totalPrice.toFixed(2)}`}
            </span>
          </Button>
        </div>
      ) : (
        /* Out of Stock Notice */
        <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-900">
          <div className="flex items-center gap-2 font-bold text-amber-950">
            <AlertCircle className="h-4 w-4 text-amber-700 shrink-0" />
            <span>Currently Out of Stock in this Pack Size</span>
          </div>
          <p className="text-[11px] text-amber-800 leading-relaxed">
            Our depot inventory ledger currently holds {sellableBaseUnits} individual units, which
            is insufficient to fulfill a {activeUnit.name} (requires {activeUnit.multiplier} units).
            Please select a smaller pack size if available, or call our trade desk for restocking
            ETA.
          </p>

          <Button
            type="button"
            variant="outline"
            disabled
            className="w-full text-xs font-semibold border-amber-300 text-amber-800 bg-amber-100/50 cursor-not-allowed"
          >
            Cannot Add to Cart (Insufficient Stock)
          </Button>

          <div className="pt-1 flex items-center justify-between text-[11px] text-amber-900 border-t border-amber-200/60">
            <span className="font-medium">Trade Restock Inquiry:</span>
            <a
              href="tel:0298224100"
              className="font-bold underline flex items-center gap-1 hover:text-amber-950"
            >
              <PhoneCall className="h-3 w-3" /> (02) 9822 4100
            </a>
          </div>
        </div>
      )}

      {/* Confirmation Banner */}
      {addedToastMessage && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-950 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 animate-in fade-in-50 duration-200">
          <div className="flex items-start gap-2">
            <Sparkles className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">{addedToastMessage}</p>
          </div>
          <Button
            asChild
            size="sm"
            className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shrink-0 self-end sm:self-auto"
          >
            <Link href="/cart">View Cart & Checkout</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
