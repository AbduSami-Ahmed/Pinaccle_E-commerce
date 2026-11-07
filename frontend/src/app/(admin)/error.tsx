'use client';

import * as React from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('[AdminError] Admin operation exception caught:', error);
  }, [error]);

  return (
    <div className="p-8 flex items-center justify-center min-h-[500px]">
      <div className="w-full max-w-lg rounded-xl border border-red-200 bg-red-50/40 p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600">
          <AlertTriangle className="h-7 w-7" />
        </div>

        <h3 className="mt-4 text-xl font-bold text-slate-900">
          Admin Service Operation Failed
        </h3>

        <p className="mt-2 text-sm text-slate-600 leading-relaxed">
          The requested administration service or database query encountered an unexpected error.
          Ensure the backend API service is running and your administrative privileges are active.
        </p>

        {error.message && (
          <div className="mt-3 text-left font-mono text-xs text-red-800 bg-white/80 p-3 rounded border border-red-200 overflow-x-auto max-h-24">
            {error.message}
          </div>
        )}

        {error.digest && (
          <p className="mt-2 text-[11px] font-mono text-slate-400">
            Correlation Digest: {error.digest}
          </p>
        )}

        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            onClick={() => reset()}
            className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white gap-2 font-semibold text-xs h-10 px-5"
          >
            <RotateCcw className="h-4 w-4" />
            Retry Operation
          </Button>
          <Button
            asChild
            variant="outline"
            className="w-full sm:w-auto border-slate-300 bg-white text-slate-700 hover:bg-slate-50 gap-2 font-semibold text-xs h-10 px-5"
          >
            <Link href="/admin/dashboard">
              <LayoutDashboard className="h-4 w-4" />
              Return to Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
