'use client';

import * as React from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw, Home, Phone, Mail } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // Log fatal client error to console or telemetry
    // eslint-disable-next-line no-console
    console.error('[GlobalError] Root boundary caught fatal application error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4 font-sans antialiased">
        <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-800 p-8 shadow-2xl text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/20 text-amber-400">
            <AlertTriangle className="h-8 w-8" />
          </div>

          <span className="mt-4 inline-block text-xs font-bold uppercase tracking-widest text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/30">
            Pinnacle Automotive Network Alert
          </span>

          <h1 className="mt-4 text-2xl font-black tracking-tight text-white sm:text-3xl">
            System Temporarily Unavailable
          </h1>

          <p className="mt-3 text-sm text-slate-300 leading-relaxed">
            We are experiencing a temporary system interruption while connecting to parts inventory services.
            Our technical team has been notified. You can retry the connection or reach our trade desk directly.
          </p>

          {error.digest && (
            <p className="mt-2 font-mono text-[11px] text-slate-400 bg-slate-950/60 py-1 px-2.5 rounded border border-slate-800 inline-block">
              Incident Ref: {error.digest}
            </p>
          )}

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => reset()}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-blue-500 transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              Retry Application
            </button>
            <Link
              href="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg border border-slate-600 bg-slate-700/60 px-5 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-700 transition-colors"
            >
              <Home className="h-4 w-4" />
              Return to Storefront
            </Link>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-700/80 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-amber-400" /> 0800 PINNACLE
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-amber-400" /> trade@pinnacleparts.co.nz
            </span>
          </div>
        </div>
      </body>
    </html>
  );
}
