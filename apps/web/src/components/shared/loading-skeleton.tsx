import * as React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export interface LoadingSkeletonProps {
  view?: 'list' | 'detail' | 'table';
  count?: number;
  className?: string;
}

export function LoadingSkeleton({ view = 'list', count = 6, className }: LoadingSkeletonProps) {
  if (view === 'detail') {
    return (
      <div className={cn('mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8', className)}>
        {/* Breadcrumb Skeleton */}
        <div className="mb-6 flex items-center space-x-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-32" />
        </div>

        {/* 2-Column Product Detail Skeleton */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="space-y-4">
            <Skeleton className="aspect-square w-full rounded-lg" />
            <div className="grid grid-cols-4 gap-2">
              <Skeleton className="aspect-square rounded-md" />
              <Skeleton className="aspect-square rounded-md" />
              <Skeleton className="aspect-square rounded-md" />
              <Skeleton className="aspect-square rounded-md" />
            </div>
          </div>
          <div className="space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-36" />
            </div>
            <Skeleton className="h-10 w-40" />
            <div className="space-y-3 pt-4 border-t border-slate-200">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-4 w-28" />
              <div className="grid grid-cols-3 gap-3">
                <Skeleton className="h-12 rounded-md" />
                <Skeleton className="h-12 rounded-md" />
                <Skeleton className="h-12 rounded-md" />
              </div>
            </div>
            <Skeleton className="h-11 w-full rounded-md" />
          </div>
        </div>
      </div>
    );
  }

  if (view === 'table') {
    return (
      <div
        className={cn(
          'space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm',
          className,
        )}
      >
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-28" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          {Array.from({ length: count }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
        <div className="flex items-center justify-between pt-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-8 w-48" />
        </div>
      </div>
    );
  }

  // List View Skeleton (Product grid)
  return (
    <div className={cn('mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8', className)}>
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-9 w-40" />
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
            <Skeleton className="aspect-square w-full rounded-md" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-5 w-4/5" />
            <Skeleton className="h-4 w-1/2" />
            <div className="flex items-center justify-between pt-2">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-8 w-24 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
