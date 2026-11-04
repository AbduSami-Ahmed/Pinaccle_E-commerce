'use client';

import * as React from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { X, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export interface ActiveFilter {
  key: string;
  label: string;
  value: string;
}

export interface SelectedFilterChipsProps {
  filters: ActiveFilter[];
  onRemove?: (key: string) => void;
  onClearAll?: () => void;
}

export function SelectedFilterChips({ filters, onRemove, onClearAll }: SelectedFilterChipsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (filters.length === 0) {
    return null;
  }

  const handleRemove = (key: string) => {
    if (onRemove) {
      onRemove(key);
      return;
    }
    const params = new URLSearchParams(searchParams.toString());
    params.delete(key);
    // If removing make, also remove model
    if (key === 'make') {
      params.delete('model');
    }
    params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleClear = () => {
    if (onClearAll) {
      onClearAll();
      return;
    }
    router.push(pathname);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 pt-2">
      <span className="text-xs font-medium text-slate-500">Active Filters:</span>
      {filters.map((filter) => (
        <Badge
          key={`${filter.key}-${filter.value}`}
          variant="secondary"
          className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-50 shadow-sm"
        >
          <span className="font-semibold text-slate-900">{filter.label}:</span>
          <span>{filter.value}</span>
          <button
            type="button"
            onClick={() => handleRemove(filter.key)}
            className="ml-0.5 rounded-full p-0.5 hover:bg-slate-200 text-slate-400 hover:text-slate-700 focus:outline-none"
            aria-label={`Remove filter ${filter.label}: ${filter.value}`}
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleClear}
        className="h-7 px-2 text-xs text-slate-500 hover:text-rose-600 gap-1"
      >
        <RotateCcw className="h-3 w-3" /> Clear All
      </Button>
    </div>
  );
}
