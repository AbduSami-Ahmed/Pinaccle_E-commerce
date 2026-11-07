'use client';

import * as React from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { SlidersHorizontal, RotateCcw, X, Car, ShieldCheck } from 'lucide-react';
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
import { StorefrontFilterMetaDto, VehicleMakeOptionDto } from '@pinnacle/contracts';

export interface SeatBeltFiltersProps {
  meta?: StorefrontFilterMetaDto;
  vehicles?: VehicleMakeOptionDto[];
}

export function SeatBeltFilters({ meta: _meta, vehicles = [] }: SeatBeltFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [mobileOpen, setMobileOpen] = React.useState(false);

  // Active query parameters
  const currentMake = searchParams.get('make') || '';
  const currentModel = searchParams.get('model') || '';
  const currentYear = searchParams.get('year') || '';
  const currentPosition = searchParams.get('position') || '';
  const currentComponent = searchParams.get('componentType') || '';
  const currentCondition = searchParams.get('condition') || '';
  const currentInStockOnly = searchParams.get('inStockOnly') === 'true';
  const currentMaxPrice = searchParams.get('maxPrice') || '';

  // Cascade vehicle models when make is selected
  const selectedMakeObj = vehicles.find(
    (v) =>
      v.name.toLowerCase() === currentMake.toLowerCase() || v.slug === currentMake.toLowerCase(),
  );
  const availableModels = selectedMakeObj?.models || [];

  const updateFilter = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value.trim() !== '' && value !== 'all') {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    // If changing make, reset model
    if (key === 'make') {
      params.delete('model');
    }
    params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleClearAll = () => {
    router.push(pathname);
    setMobileOpen(false);
  };

  const activeCount = [
    currentMake,
    currentModel,
    currentYear,
    currentPosition,
    currentComponent,
    currentCondition,
    currentInStockOnly ? 'inStock' : '',
    currentMaxPrice,
  ].filter(Boolean).length;

  const filterContent = (
    <div className="space-y-6">
      {/* 1. Vehicle Fitment Selector */}
      <div className="space-y-3 rounded-md bg-blue-50/50 p-3 border border-blue-100">
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-900">
          <Car className="h-3.5 w-3.5 text-blue-700" />
          Vehicle Fitment
        </div>

        {/* Make */}
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-slate-600">Vehicle Make</label>
          <Select value={currentMake || 'all'} onValueChange={(val) => updateFilter('make', val)}>
            <SelectTrigger className="h-9 text-xs bg-white">
              <SelectValue placeholder="All Makes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Makes</SelectItem>
              {vehicles.map((v) => (
                <SelectItem key={v.id} value={v.name}>
                  {v.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Model */}
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-slate-600">Model</label>
          <Select
            value={currentModel || 'all'}
            onValueChange={(val) => updateFilter('model', val)}
            disabled={!currentMake || availableModels.length === 0}
          >
            <SelectTrigger className="h-9 text-xs bg-white">
              <SelectValue placeholder={currentMake ? 'Select Model' : 'Select Make first'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Models</SelectItem>
              {availableModels.map((m) => (
                <SelectItem key={m.id} value={m.name}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Year */}
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-slate-600">Model Year</label>
          <Input
            type="number"
            min="1990"
            max="2030"
            placeholder="e.g. 2021"
            value={currentYear}
            onChange={(e) => updateFilter('year', e.target.value)}
            className="h-9 text-xs bg-white"
          />
        </div>
      </div>

      <hr className="border-slate-200" />

      {/* 2. Position */}
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-900">
          Seat Position
        </label>
        <Select
          value={currentPosition || 'all'}
          onValueChange={(val) => updateFilter('position', val)}
        >
          <SelectTrigger className="h-9 text-xs">
            <SelectValue placeholder="All Positions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Positions</SelectItem>
            <SelectItem value="FRONT_LEFT_DRIVER">Front Driver (Right / Left)</SelectItem>
            <SelectItem value="FRONT_RIGHT_PASSENGER">Front Passenger</SelectItem>
            <SelectItem value="REAR_RIGHT">Rear Right</SelectItem>
            <SelectItem value="REAR_LEFT">Rear Left</SelectItem>
            <SelectItem value="REAR_CENTER">Rear Center</SelectItem>
            <SelectItem value="THIRD_ROW_LEFT">3rd Row Left</SelectItem>
            <SelectItem value="THIRD_ROW_RIGHT">3rd Row Right</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <hr className="border-slate-200" />

      {/* 3. Component Type */}
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-900">
          Component Type
        </label>
        <Select
          value={currentComponent || 'all'}
          onValueChange={(val) => updateFilter('componentType', val)}
        >
          <SelectTrigger className="h-9 text-xs">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Components</SelectItem>
            <SelectItem value="COMPLETE_ASSEMBLY">Complete Assembly</SelectItem>
            <SelectItem value="RETRACTOR_ASSEMBLY">Retractor & Pre-Tensioner</SelectItem>
            <SelectItem value="BUCKLE_STALK">Buckle Stalk / Receiver</SelectItem>
            <SelectItem value="LAP_BELT">Lap Belt</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <hr className="border-slate-200" />

      {/* 4. Condition Grade */}
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-900">
          Condition Grade
        </label>
        <Select
          value={currentCondition || 'all'}
          onValueChange={(val) => updateFilter('condition', val)}
        >
          <SelectTrigger className="h-9 text-xs">
            <SelectValue placeholder="All Conditions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Grades</SelectItem>
            <SelectItem value="BRAND_NEW">Brand New OEM</SelectItem>
            <SelectItem value="GRADE_A_LIKE_NEW">Grade A (Like-New Reconditioned)</SelectItem>
            <SelectItem value="GRADE_B_LIGHT_WEAR">Grade B (Light Wear Tested)</SelectItem>
            <SelectItem value="GRADE_C_FUNCTIONAL_WEAR">Grade C (Functional Tested)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <hr className="border-slate-200" />

      {/* 5. Max Price */}
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-900">
          Maximum Price ($ AUD)
        </label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min="0"
            step="10"
            placeholder="e.g. 150"
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

      {/* 6. In-Stock Only */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Checkbox
            id="inStockOnlySb"
            checked={currentInStockOnly}
            onCheckedChange={(checked) => updateFilter('inStockOnly', checked ? 'true' : null)}
          />
          <label
            htmlFor="inStockOnlySb"
            className="text-xs font-medium text-slate-700 cursor-pointer select-none"
          >
            Available In-Stock Only
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
              Filter Seat Belts {activeCount > 0 && `(${activeCount})`}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-semibold">Filter Seat Belts</DialogTitle>
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
              <ShieldCheck className="h-4 w-4 text-blue-700" />
              <h2 className="text-sm font-bold text-slate-900">Seat Belt Filters</h2>
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
