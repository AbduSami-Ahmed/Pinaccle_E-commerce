'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  Calendar,
  CheckCircle2,
  Download,
  Package,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  ShoppingBag,
  TrendingUp,
  Truck,
  Users,
  Wrench,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DashboardDateRange,
  DashboardSummaryDto,
} from '@pinnacle/contracts';
import {
  fetchDashboardSummary,
  getExportAuditLogsUrl,
  getExportInventoryUrl,
  getExportOrdersUrl,
} from '@/lib/admin';

export default function AdminDashboardPage() {
  const [range, setRange] = React.useState<DashboardDateRange>('30d');
  const [summary, setSummary] = React.useState<DashboardSummaryDto | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [exportOpen, setExportOpen] = React.useState(false);

  const loadData = React.useCallback(async (selectedRange: DashboardDateRange) => {
    setLoading(true);
    try {
      const data = await fetchDashboardSummary(selectedRange);
      setSummary(data);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData(range);
  }, [range, loadData]);

  const ranges: { value: DashboardDateRange; label: string }[] = [
    { value: 'today', label: 'Today' },
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: '90d', label: 'Last 90 Days' },
    { value: 'all', label: 'All Time' },
  ];

  return (
    <div className="space-y-8">
      {/* Top Header & Date Range Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Operations & Performance
            </h1>
            <Badge variant="outline" className="font-mono text-xs font-medium text-slate-600">
              NZ MVD-89211
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Real-time trade telemetry for Auckland Penrose depot, commercial inventory, and order fulfilment.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Date Range Selector */}
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
            {ranges.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setRange(r.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  range === r.value
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData(range)}
            disabled={loading}
            className="h-8 gap-1.5 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          {/* Export Action */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExportOpen(!exportOpen)}
              className="h-8 gap-1.5 text-xs border-slate-300"
            >
              <Download className="h-3.5 w-3.5 text-slate-600" />
              Export
            </Button>

            {exportOpen && (
              <div className="absolute right-0 mt-1.5 w-56 rounded-md bg-white p-1 shadow-lg ring-1 ring-slate-200 z-30">
                <a
                  href={getExportOrdersUrl(range)}
                  download
                  onClick={() => setExportOpen(false)}
                  className="block px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded"
                >
                  Export Orders ({summary?.period.label || 'CSV'})
                </a>
                <a
                  href={getExportInventoryUrl()}
                  download
                  onClick={() => setExportOpen(false)}
                  className="block px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded"
                >
                  Export Inventory Stock Valuation
                </a>
                <a
                  href={getExportAuditLogsUrl()}
                  download
                  onClick={() => setExportOpen(false)}
                  className="block px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded"
                >
                  Export Security & Audit Trail
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Date Period Indicator */}
      {summary && (
        <div className="flex items-center justify-between text-xs text-slate-500 -mt-4">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <span>
              Reporting Period: <strong>{summary.period.label}</strong> (
              {new Date(summary.period.startDate).toLocaleDateString('en-NZ')} &ndash;{' '}
              {new Date(summary.period.endDate).toLocaleDateString('en-NZ')})
            </span>
          </div>
          <span className="font-mono text-slate-400">Currency: {summary.sales.currency} ($NZD)</span>
        </div>
      )}

      {/* 1. Core Financial & Sales KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Gross Revenue */}
        <Card className="border-slate-200 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Gross Revenue
            </CardTitle>
            <div className="h-8 w-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
              <ShoppingBag className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-slate-900">
              ${summary?.sales.grossRevenue.toLocaleString('en-NZ', { minimumFractionDigits: 2 }) ?? '—'}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              From <strong>{summary?.sales.paidOrdersCount ?? 0}</strong> confirmed paid orders
            </p>
          </CardContent>
        </Card>

        {/* Net Revenue */}
        <Card className="border-slate-200 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Net Revenue
            </CardTitle>
            <div className="h-8 w-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-emerald-700">
              ${summary?.sales.netRevenue.toLocaleString('en-NZ', { minimumFractionDigits: 2 }) ?? '—'}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              After <strong>${summary?.sales.refundedAmount.toFixed(2) ?? '0.00'}</strong> refunds deducted
            </p>
          </CardContent>
        </Card>

        {/* Average Order Value (AOV) */}
        <Card className="border-slate-200 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Avg Order Value (AOV)
            </CardTitle>
            <div className="h-8 w-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-slate-900">
              ${summary?.sales.averageOrderValue.toFixed(2) ?? '—'}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Across all retail & trade checkout orders
            </p>
          </CardContent>
        </Card>

        {/* Out of Stock & Low Stock Alerts */}
        <Card className="border-slate-200 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Stock Warnings
            </CardTitle>
            <div className="h-8 w-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-rose-600">
                {summary?.stockHealth.outOfStockCount ?? 0}
              </span>
              <span className="text-xs text-slate-400">OOS</span>
              <span className="text-slate-300">&bull;</span>
              <span className="text-2xl font-bold font-mono text-amber-600">
                {summary?.stockHealth.lowStockCount ?? 0}
              </span>
              <span className="text-xs text-slate-400">Low Stock</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Of <strong>{summary?.stockHealth.totalPublishedProducts ?? 0}</strong> active catalog parts
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 2. Operational Backlog & Fulfilment Queues */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-slate-900">Fulfilment & Warehouse Queues</h2>
          <span className="text-xs text-slate-400">Immediate action items for warehouse & dispatch</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/admin/orders?status=PAID"
            className="group flex flex-col justify-between p-4 rounded-lg border border-slate-200 bg-white hover:border-blue-400 hover:shadow-xs transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-600">Awaiting Pick & Pack</span>
              <span className="h-2 w-2 rounded-full bg-blue-600" />
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-2xl font-bold font-mono text-blue-700">
                {summary?.fulfillmentQueues.awaitingPickPackCount ?? 0}
              </span>
              <span className="text-xs font-medium text-blue-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                Process queue &rarr;
              </span>
            </div>
          </Link>

          <Link
            href="/admin/orders?status=PROCESSING"
            className="group flex flex-col justify-between p-4 rounded-lg border border-slate-200 bg-white hover:border-amber-400 hover:shadow-xs transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-600">Ready for Dispatch / Pickup</span>
              <span className="h-2 w-2 rounded-full bg-amber-500" />
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-2xl font-bold font-mono text-amber-700">
                {summary?.fulfillmentQueues.inFulfillmentCount ?? 0}
              </span>
              <span className="text-xs font-medium text-amber-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                Consignments &rarr;
              </span>
            </div>
          </Link>

          <Link
            href="/admin/orders?status=SHIPPED"
            className="group flex flex-col justify-between p-4 rounded-lg border border-slate-200 bg-white hover:border-emerald-400 hover:shadow-xs transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-600">In Transit (CourierPost / Mainfreight)</span>
              <Truck className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-2xl font-bold font-mono text-emerald-700">
                {summary?.fulfillmentQueues.shippedCount ?? 0}
              </span>
              <span className="text-xs font-medium text-slate-500">Track shipments</span>
            </div>
          </Link>

          <Link
            href="/admin/orders?status=REFUNDED"
            className="group flex flex-col justify-between p-4 rounded-lg border border-slate-200 bg-white hover:border-purple-400 hover:shadow-xs transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-600">Pending RMA Inspection</span>
              <RotateCcw className="h-4 w-4 text-purple-600" />
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-2xl font-bold font-mono text-purple-700">
                {summary?.fulfillmentQueues.pendingRmaInspectionCount ?? 0}
              </span>
              <span className="text-xs font-medium text-purple-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                Inspect items &rarr;
              </span>
            </div>
          </Link>
        </div>
      </div>

      {/* 3. Quick Action Shortcuts & Category Distribution */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick Operations Shortcuts */}
        <Card className="border-slate-200 shadow-xs lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-900">
              Operations Shortcuts
            </CardTitle>
            <CardDescription className="text-xs">
              Direct access to frequent administrative desk tasks
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link
              href="/admin/products/new"
              className="flex items-center justify-between p-2.5 rounded-md hover:bg-slate-50 text-xs font-medium text-slate-700 transition-colors border border-transparent hover:border-slate-200"
            >
              <div className="flex items-center gap-2.5">
                <Package className="h-4 w-4 text-blue-600" />
                <span>Create Catalogue Product</span>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
            </Link>

            <Link
              href="/admin/inventory"
              className="flex items-center justify-between p-2.5 rounded-md hover:bg-slate-50 text-xs font-medium text-slate-700 transition-colors border border-transparent hover:border-slate-200"
            >
              <div className="flex items-center gap-2.5">
                <Boxes className="h-4 w-4 text-emerald-600" />
                <span>Stock Overview & Receive</span>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
            </Link>

            <Link
              href="/admin/fitment"
              className="flex items-center justify-between p-2.5 rounded-md hover:bg-slate-50 text-xs font-medium text-slate-700 transition-colors border border-transparent hover:border-slate-200"
            >
              <div className="flex items-center gap-2.5">
                <Wrench className="h-4 w-4 text-amber-600" />
                <span>Vehicle Fitment Compatibility</span>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
            </Link>

            <Link
              href="/admin/customers"
              className="flex items-center justify-between p-2.5 rounded-md hover:bg-slate-50 text-xs font-medium text-slate-700 transition-colors border border-transparent hover:border-slate-200"
            >
              <div className="flex items-center gap-2.5">
                <Users className="h-4 w-4 text-indigo-600" />
                <span>Customer Directory Lookup</span>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
            </Link>

            <Link
              href="/admin/settings"
              className="flex items-center justify-between p-2.5 rounded-md hover:bg-slate-50 text-xs font-medium text-slate-700 transition-colors border border-transparent hover:border-slate-200"
            >
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="h-4 w-4 text-slate-600" />
                <span>Business & Tax Settings</span>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
            </Link>
          </CardContent>
        </Card>

        {/* Category Breakdown & Distribution */}
        <Card className="border-slate-200 shadow-xs lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-sm font-semibold text-slate-900">
                Active Category Breakdown
              </CardTitle>
              <CardDescription className="text-xs">
                Catalogue distribution across supported automotive disciplines
              </CardDescription>
            </div>
            <Link
              href="/admin/categories"
              className="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              View categories &rarr;
            </Link>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-slate-100">
              {summary?.categoryBreakdown.map((cat) => (
                <div key={cat.categoryId} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded bg-slate-100 flex items-center justify-center text-slate-600 font-semibold text-xs">
                      {cat.slug === 'tyres' ? 'TY' : 'SB'}
                    </div>
                    <div>
                      <span className="font-medium text-xs text-slate-900">{cat.name}</span>
                      <span className="block text-[11px] font-mono text-slate-400">
                        slug: /{cat.slug}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="font-mono text-xs font-semibold text-slate-900">
                      {cat.activeProductCount} active parts
                    </span>
                    <Button asChild variant="outline" size="sm" className="h-7 text-xs">
                      <Link href={`/admin/products?category=${cat.slug}`}>Browse Parts</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 4. Stock Alerts (Out of Stock & Low Stock) */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Out of Stock Alert Box */}
        <Card className="border-rose-200 bg-rose-50/20 shadow-xs">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-600" />
                <CardTitle className="text-sm font-semibold text-rose-900">
                  Out of Stock Parts ({summary?.stockHealth.outOfStockCount ?? 0})
                </CardTitle>
              </div>
              <Badge variant="destructive" className="text-[10px]">
                Requires Restock
              </Badge>
            </div>
            <CardDescription className="text-xs text-rose-700/80">
              Published products where available sellable inventory is currently zero.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {summary?.stockHealth.outOfStockItems && summary.stockHealth.outOfStockItems.length > 0 ? (
              <div className="space-y-2">
                {summary.stockHealth.outOfStockItems.map((item) => (
                  <div
                    key={item.productId}
                    className="p-2.5 rounded-md bg-white border border-rose-200 flex items-center justify-between text-xs"
                  >
                    <div>
                      <Link
                        href={`/admin/inventory/${item.productId}`}
                        className="font-medium text-slate-900 hover:text-blue-600 line-clamp-1"
                      >
                        {item.productName}
                      </Link>
                      <span className="font-mono text-[10px] text-slate-500">
                        SKU: {item.sku} &bull; {item.category}
                      </span>
                    </div>
                    <Button asChild variant="ghost" size="sm" className="h-7 text-xs text-rose-700">
                      <Link href={`/admin/inventory/${item.productId}`}>Receive Stock</Link>
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-slate-500">
                <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto mb-2" />
                No out-of-stock items in active catalogue.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low Stock Alert Box */}
        <Card className="border-amber-200 bg-amber-50/20 shadow-xs">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <CardTitle className="text-sm font-semibold text-amber-900">
                  Low Stock Thresholds ({summary?.stockHealth.lowStockCount ?? 0})
                </CardTitle>
              </div>
              <Badge variant="warning" className="text-[10px]">
                Replenishment Advised
              </Badge>
            </div>
            <CardDescription className="text-xs text-amber-800/80">
              Bulk tyres with &le; 4 units remaining or serialized safety belts with &le; 1 unit.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {summary?.stockHealth.lowStockItems && summary.stockHealth.lowStockItems.length > 0 ? (
              <div className="space-y-2">
                {summary.stockHealth.lowStockItems.map((item) => (
                  <div
                    key={item.productId}
                    className="p-2.5 rounded-md bg-white border border-amber-200 flex items-center justify-between text-xs"
                  >
                    <div>
                      <Link
                        href={`/admin/inventory/${item.productId}`}
                        className="font-medium text-slate-900 hover:text-blue-600 line-clamp-1"
                      >
                        {item.productName}
                      </Link>
                      <span className="font-mono text-[10px] text-slate-500">
                        SKU: {item.sku} &bull; Available:{' '}
                        <strong className="text-amber-700">{item.sellableStock}</strong> (limit:{' '}
                        {item.threshold})
                      </span>
                    </div>
                    <Button asChild variant="ghost" size="sm" className="h-7 text-xs text-amber-800">
                      <Link href={`/admin/inventory/${item.productId}`}>View Ledger</Link>
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-slate-500">
                <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto mb-2" />
                All active inventory is currently above warning thresholds.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 5. Recent Operational Activity (Live Orders & Stock Movements) */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Orders */}
        <Card className="border-slate-200 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-sm font-semibold text-slate-900">Recent Orders</CardTitle>
              <CardDescription className="text-xs">Latest customer checkouts and counter orders</CardDescription>
            </div>
            <Link
              href="/admin/orders"
              className="text-xs font-medium text-blue-600 hover:text-blue-800"
            >
              All orders &rarr;
            </Link>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-slate-100">
              {summary?.recentActivity.recentOrders.map((ord) => (
                <div key={ord.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <Link
                      href={`/admin/orders/${ord.id}`}
                      className="font-mono font-semibold text-blue-600 hover:underline"
                    >
                      {ord.orderNumber}
                    </Link>
                    <span className="text-slate-500 ml-2">{ord.customerName}</span>
                    <span className="block font-mono text-[10px] text-slate-400">
                      {new Date(ord.createdAt).toLocaleTimeString('en-NZ', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {' &bull; '}
                      {ord.shippingMethod === 'CLICK_AND_COLLECT' ? 'Trade Hub Pickup' : 'Courier Delivery'}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="font-mono font-bold text-slate-900">
                      ${ord.total.toFixed(2)}
                    </span>
                    <div className="mt-0.5">
                      <Badge
                        variant={
                          ord.status === 'DELIVERED'
                            ? 'success'
                            : ord.status === 'PROCESSING'
                              ? 'warning'
                              : 'default'
                        }
                        className="text-[9px] uppercase px-1.5 py-0"
                      >
                        {ord.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Stock Movements */}
        <Card className="border-slate-200 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-sm font-semibold text-slate-900">
                Warehouse Movement Ledger
              </CardTitle>
              <CardDescription className="text-xs">
                Physical adjustments, sales deductions, and RMA restocks
              </CardDescription>
            </div>
            <Link
              href="/admin/inventory/movements"
              className="text-xs font-medium text-blue-600 hover:text-blue-800"
            >
              Full ledger &rarr;
            </Link>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-slate-100">
              {summary?.recentActivity.recentMovements.map((mov) => (
                <div key={mov.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-medium text-slate-900 line-clamp-1">
                      {mov.productName}
                    </span>
                    <span className="font-mono text-[10px] text-slate-400">
                      {mov.sku} &bull; Op: {mov.actorName}
                    </span>
                  </div>

                  <div className="text-right">
                    <span
                      className={`font-mono font-bold ${
                        mov.quantity > 0 ? 'text-emerald-600' : 'text-slate-900'
                      }`}
                    >
                      {mov.quantity > 0 ? `+${mov.quantity}` : mov.quantity}
                    </span>
                    <span className="block font-mono text-[9px] text-slate-400 uppercase">
                      {mov.movementType.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
