'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Download,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { GlobalInventoryMovementDto } from '@pinnacle/contracts';
import { fetchWarehouseMovements, getExportInventoryUrl } from '@/lib/admin';

export default function AdminMovementLedgerPage() {
  const [movements, setMovements] = React.useState<GlobalInventoryMovementDto[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [movementType, setMovementType] = React.useState<string>('');

  const loadMovements = React.useCallback(async (type?: string) => {
    setLoading(true);
    try {
      const data = await fetchWarehouseMovements({
        movementType: type || undefined,
        page: 1,
        limit: 50,
      });
      setMovements(data.items);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadMovements(movementType);
  }, [movementType, loadMovements]);

  const movementFilters = [
    { value: '', label: 'All Movements' },
    { value: 'SALE_DEDUCTION', label: 'Sale Deductions' },
    { value: 'RECEIPT', label: 'Inward Receipts' },
    { value: 'MANUAL_ADJUSTMENT', label: 'Stock Adjustments' },
    { value: 'RETURN_RESTOCK', label: 'RMA Restocks' },
    { value: 'SCRAP_WRITEOFF', label: 'Scrap Write-offs' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/inventory"
              className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Inventory Overview
            </Link>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
            Warehouse Movement Ledger
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Complete physical inventory transaction audit trail across Auckland Penrose hub and trade counter dispatch.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="h-8 text-xs gap-1.5">
            <a href={getExportInventoryUrl()} download>
              <Download className="h-3.5 w-3.5 text-slate-600" />
              Export Valuation CSV
            </a>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => loadMovements(movementType)}
            disabled={loading}
            className="h-8 text-xs gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          {movementFilters.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setMovementType(f.value)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                movementType === f.value
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="text-xs font-mono text-slate-500">
          Total Movements: <strong>{total}</strong>
        </div>
      </div>

      {/* Ledger Table */}
      <Card className="border-slate-200 shadow-xs">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Timestamp (NZST)</th>
                  <th className="py-3 px-4">Part / Product</th>
                  <th className="py-3 px-4">Movement Type</th>
                  <th className="py-3 px-4 text-center">Qty Change</th>
                  <th className="py-3 px-4">Warehouse</th>
                  <th className="py-3 px-4">Operator / Staff</th>
                  <th className="py-3 px-4">Reference Ref</th>
                  <th className="py-3 px-4 text-right">Ledger</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {movements.length > 0 ? (
                  movements.map((mov) => (
                    <tr key={mov.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                        {new Date(mov.createdAt).toLocaleString('en-AU')}
                      </td>

                      <td className="py-3 px-4">
                        <Link
                          href={`/admin/inventory/${mov.productId}`}
                          className="font-semibold text-slate-900 hover:text-blue-600 line-clamp-1 block"
                        >
                          {mov.productName}
                        </Link>
                        <span className="font-mono text-[10px] text-slate-400">SKU: {mov.sku}</span>
                      </td>

                      <td className="py-3 px-4">
                        <Badge
                          variant={
                            mov.movementType === 'RECEIPT' || mov.movementType === 'RETURN_RESTOCK'
                              ? 'success'
                              : mov.movementType === 'SCRAP_WRITEOFF'
                                ? 'destructive'
                                : mov.movementType === 'MANUAL_ADJUSTMENT'
                                  ? 'warning'
                                  : 'outline'
                          }
                          className="text-[9px] uppercase tracking-wider font-mono"
                        >
                          {mov.movementType.replace(/_/g, ' ')}
                        </Badge>
                      </td>

                      <td className="py-3 px-4 text-center font-mono font-bold">
                        <span
                          className={
                            mov.quantity > 0
                              ? 'text-emerald-600'
                              : mov.quantity < 0
                                ? 'text-slate-900'
                                : 'text-slate-400'
                          }
                        >
                          {mov.quantity > 0 ? `+${mov.quantity}` : mov.quantity}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                        {mov.warehouseCode || 'AKL-CENTRAL'}
                      </td>

                      <td className="py-3 px-4 text-slate-700">
                        {mov.actorName || 'Warehouse Staff'}
                      </td>

                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                        {mov.referenceId ? `${mov.referenceType || 'REF'}: ${mov.referenceId}` : '—'}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <Button asChild variant="ghost" size="sm" className="h-7 text-xs text-blue-600">
                          <Link href={`/admin/inventory/${mov.productId}`}>Item Ledger</Link>
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500">
                      {loading ? 'Loading warehouse movements...' : 'No movements found for the selected filter.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}