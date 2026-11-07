'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  Eye,
  Layers,
  Loader2,
  PackageCheck,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/empty-state';
import { LoadingSkeleton } from '@/components/shared/loading-skeleton';
import { ProductStockSummaryDto, WarehouseDto } from '@pinnacle/contracts';
import { fetchInventoryOverview, fetchWarehouses } from '@/lib/inventory';

export default function AdminInventoryOverviewPage() {
  const [summaries, setSummaries] = React.useState<ProductStockSummaryDto[]>([]);
  const [warehouses, setWarehouses] = React.useState<WarehouseDto[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [total, setTotal] = React.useState(0);

  // Filters
  const [search, setSearch] = React.useState('');
  const [warehouseId, setWarehouseId] = React.useState('');
  const [stockStatus, setStockStatus] = React.useState<
    'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'
  >('ALL');

  React.useEffect(() => {
    fetchWarehouses()
      .then(setWarehouses)
      .catch(() => {});
  }, []);

  const loadInventory = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchInventoryOverview({
        search: search.trim() || undefined,
        warehouseId: warehouseId || undefined,
        stockStatus,
      });
      setSummaries(res.data);
      setTotal(res.meta.total);
    } catch {
      // Error handled by fallback data
    } finally {
      setLoading(false);
    }
  }, [search, warehouseId, stockStatus]);

  React.useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  // Aggregate KPI metrics
  const totalOnHand = summaries.reduce((acc, s) => acc + s.totalQuantityOnHand, 0);
  const totalReserved = summaries.reduce((acc, s) => acc + s.totalQuantityReserved, 0);
  const totalAvailable = summaries.reduce((acc, s) => acc + s.totalQuantityAvailable, 0);
  const lowStockCount = summaries.filter((s) => s.isLowStock).length;
  const outOfStockCount = summaries.filter((s) => s.isOutOfStock).length;

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/admin/dashboard">Admin</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Inventory Management</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header and Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Boxes className="h-6 w-6 text-slate-700" />
            <span>Auditable Stock & Movement Ledger</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time physical inventory balances, warehouse bin tracking, and ledger-backed
            adjustments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadInventory()}
            disabled={loading}
            title="Refresh Stock Balances"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/inventory/adjust">
              <SlidersHorizontal className="h-4 w-4 mr-1.5" />
              Stock Adjustment
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/admin/inventory/receive">
              <Plus className="h-4 w-4 mr-1.5" />
              Receive Stock
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Total Units On Hand
              </p>
              <p className="text-2xl font-bold text-slate-900 mt-1 font-mono">{totalOnHand}</p>
              <span className="text-[11px] text-slate-400">Physical stock across bins</span>
            </div>
            <PackageCheck className="h-8 w-8 text-slate-300" />
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Cart Reservations
              </p>
              <p className="text-2xl font-bold text-amber-600 mt-1 font-mono">{totalReserved}</p>
              <span className="text-[11px] text-amber-600/80">Active 15-min soft holds</span>
            </div>
            <Layers className="h-8 w-8 text-amber-200" />
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Available to Sell
              </p>
              <p className="text-2xl font-bold text-emerald-600 mt-1 font-mono">{totalAvailable}</p>
              <span className="text-[11px] text-emerald-600/80">Net unreserved base stock</span>
            </div>
            <CheckCircle2 className="h-8 w-8 text-emerald-200" />
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Stock Attention
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xl font-bold text-amber-600 font-mono">
                  {lowStockCount} Low
                </span>
                <span className="text-slate-300">&bull;</span>
                <span className="text-xl font-bold text-red-600 font-mono">
                  {outOfStockCount} Out
                </span>
              </div>
              <span className="text-[11px] text-slate-400">Threshold: &le; 5 units</span>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-200" />
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by part title, SKU, brand..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          <div>
            <select
              className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 py-1 text-xs shadow-sm focus:border-slate-500 focus:outline-none"
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
            >
              <option value="">All Fulfillment Warehouses</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 py-1 text-xs shadow-sm focus:border-slate-500 focus:outline-none"
              value={stockStatus}
              onChange={(e) => setStockStatus(e.target.value as any)}
            >
              <option value="ALL">All Stock Levels</option>
              <option value="IN_STOCK">In Stock (&gt; 5 available)</option>
              <option value="LOW_STOCK">Low Stock (&le; 5 available)</option>
              <option value="OUT_OF_STOCK">Out of Stock (0 available)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
          <span>
            Tracking stock for <strong>{summaries.length}</strong> of <strong>{total}</strong>{' '}
            catalogue items
          </span>
          {(search || warehouseId || stockStatus !== 'ALL') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch('');
                setWarehouseId('');
                setStockStatus('ALL');
              }}
              className="h-6 text-xs text-slate-600 hover:text-slate-900 px-2"
            >
              Reset Filters
            </Button>
          )}
        </div>
      </div>

      {/* Main Inventory Balances Table */}
      {loading ? (
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Reconciling real-time physical inventory balances...</span>
          </div>
          <LoadingSkeleton view="table" count={5} />
        </div>
      ) : summaries.length === 0 ? (
        <EmptyState
          title="No inventory records found"
          description="No stock records matched your active filter criteria. Inward new stock to begin tracking."
          action={
            <Button asChild size="sm">
              <Link href="/admin/inventory/receive">
                <Plus className="h-4 w-4 mr-1.5" />
                Receive Initial Stock
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Product / SKU</th>
                  <th className="py-3 px-4">Modality</th>
                  <th className="py-3 px-4">Location Bins</th>
                  <th className="py-3 px-4 font-mono text-center">On Hand</th>
                  <th className="py-3 px-4 font-mono text-center">Reserved</th>
                  <th className="py-3 px-4 font-mono text-center">Available</th>
                  <th className="py-3 px-4">Sellable Units (Multipliers)</th>
                  <th className="py-3 px-4">Health</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summaries.map((s) => (
                  <tr key={s.productId} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4">
                      <div>
                        <Link
                          href={`/admin/inventory/${s.productId}`}
                          className="font-medium text-slate-900 hover:text-slate-700 block line-clamp-1"
                        >
                          {s.title}
                        </Link>
                        <span className="font-mono text-[11px] text-slate-400">
                          SKU: {s.sku} &bull; {s.brand}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <Badge variant="outline" className="text-[10px] font-normal">
                        {s.productType === 'BULK_QUANTITY' ? 'Bulk Quantity' : 'Serialized Parts'}
                      </Badge>
                    </td>

                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                      {s.productType === 'INDIVIDUALLY_SERIALIZED'
                        ? `${s.serializedItems.length} scanned units`
                        : s.inventoryItems.length > 0
                          ? s.inventoryItems
                              .map((i) => `${i.warehouseCode}: ${i.locationBin}`)
                              .join(', ')
                          : 'Unassigned'}
                    </td>

                    <td className="py-3 px-4 font-mono text-center font-bold text-slate-900">
                      {s.totalQuantityOnHand}
                    </td>

                    <td className="py-3 px-4 font-mono text-center text-amber-600">
                      {s.totalQuantityReserved > 0 ? s.totalQuantityReserved : '—'}
                    </td>

                    <td className="py-3 px-4 font-mono text-center font-bold text-emerald-600">
                      {s.totalQuantityAvailable}
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {s.sellableUnits.map((su) => (
                          <span
                            key={su.code}
                            className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 font-mono"
                            title={`${su.name}: ${su.multiplier}x base units = $${su.retailPrice}`}
                          >
                            {su.name}: <strong>{su.sellableCount}</strong>
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      {s.isOutOfStock ? (
                        <Badge variant="destructive" className="text-[10px]">
                          Out of Stock
                        </Badge>
                      ) : s.isLowStock ? (
                        <Badge variant="warning" className="text-[10px]">
                          Low Stock (&le; 5)
                        </Badge>
                      ) : (
                        <Badge variant="success" className="text-[10px]">
                          In Stock
                        </Badge>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          asChild
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-slate-600 hover:text-slate-900"
                        >
                          <Link href={`/admin/inventory/${s.productId}`}>
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            Ledger
                          </Link>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
