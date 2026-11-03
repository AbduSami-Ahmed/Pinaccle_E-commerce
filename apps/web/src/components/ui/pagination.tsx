'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

export interface PaginationProps extends React.ComponentProps<'nav'> {
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
}

const Pagination = ({
  className,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  ...props
}: PaginationProps) => {
  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, 'ellipsis-1', totalPages];
    }
    if (currentPage >= totalPages - 3) {
      return [
        1,
        'ellipsis-1',
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ];
    }
    return [
      1,
      'ellipsis-1',
      currentPage - 1,
      currentPage,
      currentPage + 1,
      'ellipsis-2',
      totalPages,
    ];
  };

  const pages = getPageNumbers();

  return (
    <nav
      role="navigation"
      aria-label="pagination"
      className={cn('mx-auto flex w-full justify-center', className)}
      {...props}
    >
      <ul className="flex flex-row items-center gap-1">
        <li>
          <button
            type="button"
            aria-label="Go to previous page"
            disabled={currentPage <= 1}
            onClick={() => onPageChange?.(currentPage - 1)}
            className={cn(
              buttonVariants({ variant: 'ghost', size: 'sm' }),
              'gap-1 pl-2.5',
              currentPage <= 1 && 'pointer-events-none opacity-50',
            )}
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Previous</span>
          </button>
        </li>

        {pages.map((p) => {
          if (typeof p === 'string' && p.startsWith('ellipsis')) {
            return (
              <li key={p}>
                <span
                  aria-hidden
                  className="flex h-8 w-8 items-center justify-center text-slate-400"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </span>
              </li>
            );
          }
          const pageNum = p as number;
          const isActive = pageNum === currentPage;
          return (
            <li key={pageNum}>
              <button
                type="button"
                aria-current={isActive ? 'page' : undefined}
                onClick={() => onPageChange?.(pageNum)}
                className={cn(
                  buttonVariants({
                    variant: isActive ? 'outline' : 'ghost',
                    size: 'sm',
                  }),
                  'h-8 w-8 p-0',
                  isActive && 'border-primary text-primary font-semibold',
                )}
              >
                {pageNum}
              </button>
            </li>
          );
        })}

        <li>
          <button
            type="button"
            aria-label="Go to next page"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange?.(currentPage + 1)}
            className={cn(
              buttonVariants({ variant: 'ghost', size: 'sm' }),
              'gap-1 pr-2.5',
              currentPage >= totalPages && 'pointer-events-none opacity-50',
            )}
          >
            <span>Next</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </li>
      </ul>
    </nav>
  );
};
Pagination.displayName = 'Pagination';

export { Pagination };
