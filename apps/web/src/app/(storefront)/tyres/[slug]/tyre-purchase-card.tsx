'use client';

import * as React from 'react';
import { ShoppingCart, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface TyrePurchaseCardProps {
  basePrice: number;
}

type SaleUnit = 'single' | 'pair' | 'set';

export function TyrePurchaseCard({ basePrice }: TyrePurchaseCardProps) {
  const [selectedUnit, setSelectedUnit] = React.useState<SaleUnit>('single');

  const unitConfigs: Record<SaleUnit, { label: string; multiplier: number; savingsText?: string }> =
    {
      single: { label: 'Single Tyre', multiplier: 1 },
      pair: { label: 'Axle Pair (2x)', multiplier: 2, savingsText: 'Balanced Pair' },
      set: { label: 'Full Set (4x)', multiplier: 4, savingsText: 'Best Value Fleet Rate' },
    };

  const currentPrice = basePrice * unitConfigs[selectedUnit].multiplier;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm space-y-5">
      {/* Price display */}
      <div>
        <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
          Unit Price Total
        </span>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-slate-900">${currentPrice.toFixed(2)}</span>
          <span className="text-xs text-slate-500">(${basePrice.toFixed(2)} / each)</span>
        </div>
      </div>

      {/* Sale Unit Selector: Single / Pair / Set */}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
          Select Quantity Pack:
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(unitConfigs) as SaleUnit[]).map((key) => {
            const config = unitConfigs[key];
            const isSelected = selectedUnit === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedUnit(key)}
                className={cn(
                  'flex flex-col items-center justify-center rounded-md border p-2.5 text-center transition-all',
                  isSelected
                    ? 'border-blue-700 bg-blue-50/70 text-blue-900 ring-1 ring-blue-700'
                    : 'border-slate-200 bg-slate-50/50 text-slate-700 hover:bg-slate-100',
                )}
              >
                <span className="text-xs font-bold">{config.label}</span>
                <span className="text-[11px] font-semibold text-slate-900 mt-0.5">
                  ${(basePrice * config.multiplier).toFixed(2)}
                </span>
                {config.savingsText && (
                  <span className="text-[9px] text-blue-700 font-medium">{config.savingsText}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Add to cart button */}
      <div className="space-y-2 pt-2">
        <Button type="button" size="lg" className="w-full gap-2 text-sm font-semibold">
          <ShoppingCart className="h-4 w-4" />
          <span>Add {unitConfigs[selectedUnit].label} to Cart</span>
        </Button>
        <p className="text-center text-[11px] text-slate-500">
          Non-functional demo action &bull; Stock allocated from Depot Central
        </p>
      </div>

      {/* Reassurance */}
      <div className="border-t border-slate-100 pt-4 flex items-center gap-2 text-xs text-slate-600">
        <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
        <span>Pinnacle Guarantee: Verified OEM specification compliance</span>
      </div>
    </div>
  );
}
