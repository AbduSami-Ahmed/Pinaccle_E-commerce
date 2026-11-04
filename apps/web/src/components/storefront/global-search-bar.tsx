'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface GlobalSearchBarProps {
  initialSearch?: string;
  initialCategory?: string;
  className?: string;
}

export function GlobalSearchBar({
  initialSearch = '',
  initialCategory = 'all',
  className = '',
}: GlobalSearchBarProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = React.useState(initialSearch);
  const [category, setCategory] = React.useState(initialCategory);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchTerm.trim();
    const params = new URLSearchParams();
    if (query) params.set('search', query);

    if (category === 'tyres') {
      router.push(`/tyres?${params.toString()}`);
    } else if (category === 'seat-belts') {
      router.push(`/seat-belts?${params.toString()}`);
    } else {
      router.push(`/search?${params.toString()}`);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`relative flex flex-col sm:flex-row gap-2 ${className}`}
    >
      {/* Category selector */}
      <div className="w-full sm:w-40 shrink-0">
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="h-11 bg-white border-slate-300 text-xs font-medium">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            <SelectItem value="tyres">Tyres & Wheels</SelectItem>
            <SelectItem value="seat-belts">Seat Belts & Restraints</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Text Input */}
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
        <input
          type="search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          aria-label="Search parts"
          placeholder="Search by part title, keyword, SKU, or stock barcode (e.g. 205/55 R16, Ford Transit, SB-2024)..."
          className="w-full rounded-md border border-slate-300 bg-white px-3.5 py-2.5 pl-10 pr-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700 shadow-sm"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 focus:outline-none"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <Button
        type="submit"
        className="h-11 px-6 font-semibold bg-blue-700 hover:bg-blue-800 text-white shrink-0"
      >
        Search Catalogue
      </Button>
    </form>
  );
}
