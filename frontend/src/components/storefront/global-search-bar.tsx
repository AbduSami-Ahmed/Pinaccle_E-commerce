'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, ChevronRight } from 'lucide-react';
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
      className={`flex flex-col sm:flex-row gap-2 rounded-xl bg-white p-1.5 border border-slate-300 shadow-sm ${className}`}
    >
      {/* Category selector */}
      <div className="w-full sm:w-40 shrink-0">
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="h-11 bg-slate-50 border-0 text-xs font-semibold text-slate-700 rounded-lg focus:ring-0">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Catalogues</SelectItem>
            <SelectItem value="tyres">Tyres &amp; Wheels</SelectItem>
            <SelectItem value="seat-belts">Tested Seat Belts</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Text Input */}
      <div className="relative flex-1 flex items-center">
        <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-slate-400" />
        <input
          type="search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          aria-label="Search parts"
          placeholder="Search by tyre size (e.g. 205/55R16), OEM #, or part name..."
          className="w-full h-11 rounded-lg border-0 bg-transparent pl-10 pr-9 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            className="absolute right-3 text-slate-400 hover:text-slate-600 focus:outline-none"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <Button
        type="submit"
        className="h-11 px-6 font-bold text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg shrink-0 gap-1"
      >
        <span>Search</span>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </form>
  );
}
