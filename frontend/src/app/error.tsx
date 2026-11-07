'use client';

import * as React from 'react';
import Link from 'next/link';
import { AlertCircle, RotateCcw, Home, LifeBuoy } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('[RootError] Application route error caught:', error);
  }, [error]);

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-8 shadow-sm text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600">
          <AlertCircle className="h-7 w-7" />
        </div>

        <h2 className="mt-4 text-xl font-bold text-slate-900 sm:text-2xl">
          Something went wrong loading this page
        </h2>

        <p className="mt-2 text-sm text-slate-600 leading-relaxed">
          An unexpected error occurred while communicating with Pinnacle services.
          Your cart and session are safe. You can retry loading or return to the main catalogue.
        </p>

        {error.digest && (
          <p className="mt-2 text-[11px] font-mono text-slate-400 bg-slate-50 py-1 px-2.5 rounded border border-slate-200 inline-block">
            Error ID: {error.digest}
          </p>
        )}

        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            onClick={() => reset()}
            className="w-full sm:w-auto bg-blue-700 hover:bg-blue-800 text-white gap-2 font-semibold text-xs h-10 px-5"
          >
            <RotateCcw className="h-4 w-4" />
            Try Again
          </Button>
          <Button
            asChild
            variant="outline"
            className="w-full sm:w-auto border-slate-300 text-slate-700 hover:bg-slate-50 gap-2 font-semibold text-xs h-10 px-5"
          >
            <Link href="/">
              <Home className="h-4 w-4" />
              Return to Storefront
            </Link>
          </Button>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-400 flex items-center justify-center gap-1.5">
          <LifeBuoy className="h-3.5 w-3.5" />
          <span>Need assistance? Contact Pinnacle Support at 1300 PINNACLE</span>
        </div>
      </div>
    </div>
  );
}

