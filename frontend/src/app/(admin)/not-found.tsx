import * as React from 'react';
import Link from 'next/link';
import { FileQuestion, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AdminNotFound() {
  return (
    <div className="p-8 flex items-center justify-center min-h-[500px]">
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-500">
          <FileQuestion className="h-7 w-7" />
        </div>

        <h3 className="mt-4 text-xl font-bold text-slate-900">
          Admin Record or Resource Not Found
        </h3>

        <p className="mt-2 text-sm text-slate-600 leading-relaxed">
          The requested administration record, batch operation, or resource identifier does not exist or has been removed.
        </p>

        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            asChild
            className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white gap-2 font-semibold text-xs h-10 px-5"
          >
            <Link href="/admin/dashboard">
              <LayoutDashboard className="h-4 w-4" />
              Go to Dashboard
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="w-full sm:w-auto border-slate-300 text-slate-700 hover:bg-slate-50 gap-2 font-semibold text-xs h-10 px-5"
          >
            <Link href="/admin/products">
              View Product Inventory
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
