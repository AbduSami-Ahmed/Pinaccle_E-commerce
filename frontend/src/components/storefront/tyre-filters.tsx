'use client';

import * as React from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { SlidersHorizontal, RotateCcw, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { StorefrontFilterMetaDto } from '@pinnacle/contracts';

export interface TyreFiltersProps {
  meta?: StorefrontFilterMetaDto;
}

export function TyreFilters({ meta }: TyreFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [mobileOpen, setMobileOpen] = React.useState(false);

  // Read current params
  const currentWidth = searchParams.get('sectionWidth') || '';
  const currentAspect = searchParams.get('aspectRatio') || '';
  const currentRim = searchParams.get('rimDiameter') || '';
  const currentBrand = searchParams.get('brand') || '';
  const currentSeason = searchParams.get('season') || '';
  const currentTerrain = searchParams.get('terrainType') || '';
  const currentSpeed = searchParams.get('speedRating') || '';
  const currentSaleUnit = searchParams.get('saleUnit') || '';
  const currentInStockOnly = searchParams.get('inStockOnly') === 'true';
  const currentMaxPrice = searchParams.get('maxPrice') || '';

  // Local state for instant response before applying
  const updateFilter = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value.trim() !== '' && value !== 'all') {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set('page', '1'); // reset page on filter change
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleClearAll = () => {
    router.push(pathname);
    setMobileOpen(false);
  };

  // Compute active count
  const activeCount = [
    currentWidth,
    currentAspect,
    currentRim,
    currentBrand,
    currentSeason,
    currentTerrain,
    currentSpeed,
    currentSaleUnit,
    currentInStockOnly ? 'inStock' : '',
    currentMaxPrice,
  ].filter(Boolean).length;

  // Options from meta or reasonable defaults
  const widths = meta?.tyreFilters?.widths || [195, 205, 215, 225, 235, 245, 255];
  const profiles = meta?.tyreFilters?.profiles || [40, 45, 50, 55, 60, 65];
  const rims = meta?.tyreFilters?.rimDiameters || [15, 16, 17, 18, 19, 20];
  const brands = meta?.brands || ['Bridgestone', 'Continental', 'Goodyear', 'Michelin', 'Pirelli'];

  const filterContent = (
    <div className="space-y-6">
      {/* 1. Dimension Quick Selector */}
      <div className="space-y-3">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-900">
          Tyre Dimensions
        </label>
        <div className="grid grid-cols-3 gap-2">
          {/* Width */}
          <div>
            <label className="text-[11px] font-medium text-slate-500">Width (mm)</label>
            <Select
              value={currentWidth || 'all'}
              onValueChange={(val) => updateFilter('sectionWidth', val)}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Width" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any Width</SelectItem>
                {widths.map((w) => (
                  <SelectItem key={w} value={String(w)}>
                    {w} mm
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Profile */}
          <div>
            <label className="text-[11px] font-medium text-slate-500">Profile (%)</label>
            <Select
              value={currentAspect || 'all'}
              onValueChange={(val) => updateFilter('aspectRatio', val)}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Profile" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any Profile</SelectItem>
                {profiles.map((p) => (
                  <SelectItem key={p} value={String(p)}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Rim */}
          <div>
            <label className="text-[11px] font-medium text-slate-500">Rim (in)</label>
            <Select
              value={currentRim || 'all'}
              onValueChange={(val) => updateFilter('rimDiameter', val)}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Rim" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any Rim</SelectItem>
                {rims.map((r) => (
                  <SelectItem key={r} value={String(r)}>
                    {r}&quot;
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <hr className="border-slate-200" />

      {/* 2. Brand */}
      <div className="space-y-3">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-900">Brand</label>
        <Select value={currentBrand || 'all'} onValueChange={(val) => updateFilter('brand', val)}>
          <SelectTrigger className="h-9 text-xs">
            <SelectValue placeholder="Select Brand" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Brands</SelectItem>
            {brands.map((b) => (
              <SelectItem key={b} value={b}>
                {b}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <hr className="border-slate-200" />

      {/* 3. Season */}
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-900">Season</label>
        <div className="grid grid-cols-1 gap-1.5 text-xs">
          {[
            { value: 'SUMMER', label: 'Summer' },
            { value: 'ALL_SEASON', label: 'All-Season' },
            { value: 'WINTER', label: 'Winter' },
          ].map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() =>
                updateFilter('season', currentSeason === item.value ? null : item.value)
              }
              className={`flex items-center justify-between rounded px-2.5 py-1.5 text-left transition-colors ${
                currentSeason === item.value
                  ? 'bg-blue-50 font-medium text-blue-800'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span>{item.label}</span>
              {currentSeason === item.value && <Check className="h-3.5 w-3.5 text-blue-700" />}
            </button>
          ))}
        </div>
      </div>

      <hr className="border-slate-200" />

      {/* 4. Commercial Sale Unit */}
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-900">
          Commercial Sale Unit
        </label>
        <Select
          value={currentSaleUnit || 'all'}
          onValueChange={(val) => updateFilter('saleUnit', val)}
        >
          <SelectTrigger className="h-9 text-xs">
            <SelectValue placeholder="All Units" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any Sale Unit</SelectItem>
            <SelectItem value="TYRE_SINGLE">Single Tyre (1)</SelectItem>
            <SelectItem value="TYRE_PAIR">Pair of 2 Tyres</SelectItem>
            <SelectItem value="TYRE_SET_OF_4">Full Set of 4 Tyres</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <hr className="border-slate-200" />

      {/* 5. Max Price */}
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-900">
          Maximum Price ($ NZD)
        </label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min="0"
            step="10"
            placeholder="e.g. 250"
            value={currentMaxPrice}
            onChange={(e) => updateFilter('maxPrice', e.target.value)}
            className="h-9 text-xs"
          />
          {currentMaxPrice && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => updateFilter('maxPrice', null)}
              className="h-9 px-2 text-xs text-slate-400 hover:text-slate-700"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      <hr className="border-slate-200" />

      {/* 6. Availability */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Checkbox
            id="inStockOnly"
            checked={currentInStockOnly}
            onCheckedChange={(checked) => updateFilter('inStockOnly', checked ? 'true' : null)}
          />
          <label
            htmlFor="inStockOnly"
            className="text-xs font-medium text-slate-700 cursor-pointer select-none"
          >
            In-Stock Items Only
          </label>
        </div>
      </div>

      {activeCount > 0 && (
        <div className="pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClearAll}
            className="w-full gap-1.5 text-xs text-slate-600 hover:text-rose-600"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset All Filters ({activeCount})
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile Drawer Trigger */}
      <div className="lg:hidden mb-4">
        <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="w-full gap-2 text-xs">
              <SlidersHorizontal className="h-4 w-4" />
              Filter Tyres {activeCount > 0 && `(${activeCount})`}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-semibold">Filter Tyres</DialogTitle>
            </DialogHeader>
            <div className="py-2">{filterContent}</div>
            <div className="pt-4 border-t border-slate-200 flex gap-2">
              <Button type="button" className="w-full text-xs" onClick={() => setMobileOpen(false)}>
                Apply Filters
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Desktop Sticky Sidebar */}
      <div className="hidden lg:block w-64 shrink-0">
        <div className="sticky top-20 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-5">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-blue-700" />
              <h2 className="text-sm font-bold text-slate-900">Filters</h2>
            </div>
            {activeCount > 0 && (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-800">
                {activeCount} active
              </span>
            )}
          </div>
          {filterContent}
        </div>
      </div>
    </>
  );
}
