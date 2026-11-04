'use client';

import * as React from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function TyrePagination({
  currentPage,
  totalPages,
}: {
  currentPage: number;
  totalPages: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(page));
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex items-center justify-between">
      <Button
        variant="outline"
        size="sm"
        disabled={currentPage <= 1}
        onClick={() => goToPage(currentPage - 1)}
        className="gap-1 text-xs"
      >
        <ChevronLeft className="h-3.5 w-3.5" /> Previous
      </Button>

      <span className="text-xs text-slate-500">
        Page <span className="font-semibold text-slate-800">{currentPage}</span> of{' '}
        <span className="font-semibold text-slate-800">{totalPages}</span>
      </span>

      <Button
        variant="outline"
        size="sm"
        disabled={currentPage >= totalPages}
        onClick={() => goToPage(currentPage + 1)}
        className="gap-1 text-xs"
      >
        Next <ChevronRight className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
