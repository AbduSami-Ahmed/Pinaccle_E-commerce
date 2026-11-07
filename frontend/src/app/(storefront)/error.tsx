'use client';

import * as React from 'react';
import Link from 'next/link';
import { AlertCircle, RotateCcw, Home, Search, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function StorefrontError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('[StorefrontError] Error caught in storefront route:', error);
  }, [error]);

  return (
    <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-[60vh]">
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-8 shadow-sm text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700">
          <AlertCircle className="h-7 w-7" />
        </div>

        <span className="mt-4 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded border border-amber-200">
          <ShieldCheck className="h-3.5 w-3.5 text-amber-600" /> Pinnacle Catalogue Service
        </span>

        <h2 className="mt-3 text-xl font-bold text-slate-900 sm:text-2xl">
          Unable to Load Parts Catalogue
        </h2>

        <p className="mt-2 text-sm text-slate-600 leading-relaxed">
          We encountered an issue fetching parts inventory specifications.
          Your existing basket, vehicle fitment selection, and account session are intact.
        </p>

        {error.digest && (
          <p className="mt-2 text-[11px] font-mono text-slate-400 bg-slate-50 py-1 px-2.5 rounded border border-slate-200 inline-block">
            Reference: {error.digest}
          </p>
        )}

        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            onClick={() => reset()}
            className="w-full sm:w-auto bg-blue-700 hover:bg-blue-800 text-white gap-2 font-semibold text-xs h-10 px-5"
          >
            <RotateCcw className="h-4 w-4" />
            Reload Catalogue
          </Button>
          <Button
            asChild
            variant="outline"
            className="w-full sm:w-auto border-slate-300 text-slate-700 hover:bg-slate-50 gap-2 font-semibold text-xs h-10 px-5"
          >
            <Link href="/tyres">
              <Search className="h-4 w-4" />
              Browse Commercial Tyres
            </Link>
          </Button>
          <Button
            asChild
            variant="ghost"
            className="w-full sm:w-auto text-slate-600 hover:bg-slate-100 gap-2 font-semibold text-xs h-10 px-4"
          >
            <Link href="/">
              <Home className="h-4 w-4" />
              Home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

