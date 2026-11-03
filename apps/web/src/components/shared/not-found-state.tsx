import * as React from 'react';
import Link from 'next/link';
import { FileQuestion, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface NotFoundStateProps {
  title?: string;
  message?: string;
  backHref?: string;
  backLabel?: string;
  className?: string;
}

export function NotFoundState({
  title = 'Page Not Found',
  message = "The page or resource you are looking for doesn't exist or has been moved.",
  backHref = '/',
  backLabel = 'Return to Storefront',
  className,
}: NotFoundStateProps) {
  return (
    <div
      className={cn(
        'flex min-h-[400px] flex-col items-center justify-center p-8 text-center',
        className,
      )}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-500">
        <FileQuestion className="h-8 w-8 text-slate-400" />
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-primary">404 Error</p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
      <p className="mt-2 max-w-md text-sm text-slate-500">{message}</p>
      <div className="mt-8 flex items-center justify-center gap-3">
        <Button asChild variant="default">
          <Link href={backHref} className="inline-flex items-center">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {backLabel}
          </Link>
        </Button>
      </div>
    </div>
  );
}
