import * as React from 'react';
import Link from 'next/link';
import { Search, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function StorefrontNotFound() {
  return (
    <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-[60vh]">
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-8 shadow-sm text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-700">
          <Search className="h-8 w-8" />
        </div>

        <span className="mt-4 inline-block text-xs font-bold uppercase tracking-widest text-slate-400">
          Error 404 — Part Not Found
        </span>

        <h1 className="mt-2 text-2xl font-black text-slate-900 sm:text-3xl">
          Part or Category Not Found
        </h1>

        <p className="mt-3 text-sm text-slate-600 leading-relaxed">
          The automotive part, tyre profile, or category slug you requested is not listed in our current catalog.
          It may have been recently sold, superseded by a newer part number, or moved.
        </p>

        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            asChild
            className="w-full sm:w-auto bg-blue-700 hover:bg-blue-800 text-white gap-2 font-semibold text-xs h-10 px-5"
          >
            <Link href="/tyres">
              <Search className="h-4 w-4" />
              Browse Tyres
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="w-full sm:w-auto border-slate-300 text-slate-700 hover:bg-slate-50 gap-2 font-semibold text-xs h-10 px-5"
          >
            <Link href="/seat-belts">
              Browse Seat Belts
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

        <div className="mt-8 pt-6 border-t border-slate-100 text-xs text-slate-500">
          <span>Looking for a specific part number or vehicle fitment? Use our </span>
          <Link href="/fitment" className="font-semibold text-blue-700 hover:underline">
            Fitment Guide
          </Link>
          <span> or call our trade team at 0800 PINNACLE (0800 746 622).</span>
        </div>
      </div>
    </div>
  );
}
