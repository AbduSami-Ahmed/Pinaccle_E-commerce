import * as React from 'react';
import Link from 'next/link';
import {
  ShoppingBag,
  Boxes,
  AlertTriangle,
  RotateCcw,
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';

interface OrderRow {
  orderNumber: string;
  customer: string;
  status: 'Processing' | 'Shipped' | 'Delivered' | 'Pending Inspection';
  statusVariant: 'default' | 'success' | 'warning' | 'outline';
  total: string;
  date: string;
}

const recentOrders: OrderRow[] = [
  {
    orderNumber: 'ORD-9421',
    customer: 'Apex Logistics Fleet Ltd',
    status: 'Shipped',
    statusVariant: 'success',
    total: '$1,160.00',
    date: '2024-11-02',
  },
  {
    orderNumber: 'ORD-9420',
    customer: 'Brampton Auto Repairs',
    status: 'Processing',
    statusVariant: 'default',
    total: '$380.00',
    date: '2024-11-02',
  },
  {
    orderNumber: 'ORD-9419',
    customer: 'Marcus Vance (Private)',
    status: 'Delivered',
    statusVariant: 'success',
    total: '$89.00',
    date: '2024-11-01',
  },
  {
    orderNumber: 'ORD-9418',
    customer: 'Midland Recovery Garage',
    status: 'Pending Inspection',
    statusVariant: 'warning',
    total: '$290.00',
    date: '2024-10-31',
  },
  {
    orderNumber: 'ORD-9417',
    customer: 'Highland Haulage Co.',
    status: 'Delivered',
    statusVariant: 'success',
    total: '$2,320.00',
    date: '2024-10-30',
  },
];

const orderColumns: Column<OrderRow>[] = [
  {
    header: 'Order #',
    accessor: (row) => (
      <span className="font-mono font-semibold text-blue-700">{row.orderNumber}</span>
    ),
  },
  {
    header: 'Customer / Organization',
    accessor: 'customer',
  },
  {
    header: 'Fulfillment Status',
    accessor: (row) => (
      <Badge variant={row.statusVariant} className="text-xs">
        {row.status}
      </Badge>
    ),
  },
  {
    header: 'Order Total',
    accessor: (row) => <span className="font-mono font-semibold text-slate-900">{row.total}</span>,
  },
  {
    header: 'Date',
    accessor: 'date',
    className: 'text-slate-500 font-mono text-xs',
  },
];

export default function AdminDashboardPage() {
  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Operations Overview</h1>
        <p className="mt-1 text-sm text-slate-500">
          Real-time snapshot of workshop orders, stock inventory health, and returns bench.
        </p>
      </div>

      {/* Key operational metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Orders
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-50 text-blue-700">
              <ShoppingBag className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">1,482</div>
            <p className="mt-1 flex items-center text-xs text-emerald-600 font-medium">
              <TrendingUp className="mr-1 h-3.5 w-3.5" />
              <span>+12.4% vs last period</span>
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Active Stock Items
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
              <Boxes className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">8,240</div>
            <p className="mt-1 text-xs text-slate-500">Tyres & Serialized Units in warehouse</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Low Stock Alerts
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-50 text-amber-700">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">7</div>
            <p className="mt-1 text-xs text-amber-700 font-medium">
              SKUs below minimum safe thresholds
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Pending Returns
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-700">
              <RotateCcw className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">3</div>
            <p className="mt-1 text-xs text-slate-500">Items awaiting technician re-testing</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-slate-900">
              Recent Customer Orders
            </h2>
            <p className="text-xs text-slate-500">
              Most recent transactions requiring dispatch or bench certification.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/dashboard" className="text-xs gap-1.5">
              <span>Refresh Orders</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        <DataTable
          columns={orderColumns}
          data={recentOrders}
          keyExtractor={(row) => row.orderNumber}
        />
      </div>
    </div>
  );
}
