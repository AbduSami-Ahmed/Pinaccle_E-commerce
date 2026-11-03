'use client';

import * as React from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Pagination } from '@/components/ui/pagination';

interface ProductRow {
  id: string;
  sku: string;
  name: string;
  category: string;
  status: 'Active' | 'Low Stock' | 'Draft' | 'Discontinued';
  statusVariant: 'success' | 'warning' | 'secondary' | 'destructive';
  stock: string;
  price: string;
}

// DEMO DATA
const demoProducts: ProductRow[] = [
  {
    id: 'prod-1',
    sku: 'TY-MICH-2254517',
    name: 'Michelin Pilot Sport 4 (225/45 R17 94Y)',
    category: 'Tyres',
    status: 'Active',
    statusVariant: 'success',
    stock: '148 units',
    price: '$145.00',
  },
  {
    id: 'prod-2',
    sku: 'TY-CONT-2055516',
    name: 'Continental PremiumContact 6 (205/55 R16)',
    category: 'Tyres',
    status: 'Active',
    statusVariant: 'success',
    stock: '96 units',
    price: '$112.50',
  },
  {
    id: 'prod-3',
    sku: 'TY-GOO-2254018',
    name: 'Goodyear Eagle F1 Asymmetric 5',
    category: 'Tyres',
    status: 'Low Stock',
    statusVariant: 'warning',
    stock: '8 units',
    price: '$138.00',
  },
  {
    id: 'prod-4',
    sku: 'TY-PIR-2155517',
    name: 'Pirelli Cinturato P7 (215/55 R17)',
    category: 'Tyres',
    status: 'Active',
    statusVariant: 'success',
    stock: '64 units',
    price: '$128.00',
  },
  {
    id: 'prod-5',
    sku: 'TY-BRI-1956515',
    name: 'Bridgestone Turanza T005 (195/65 R15)',
    category: 'Tyres',
    status: 'Active',
    statusVariant: 'success',
    stock: '210 units',
    price: '$95.00',
  },
  {
    id: 'prod-6',
    sku: 'TY-DUN-2454018',
    name: 'Dunlop Sport Maxx RT2 (245/40 R18)',
    category: 'Tyres',
    status: 'Draft',
    statusVariant: 'secondary',
    stock: '0 units',
    price: '$152.00',
  },
  {
    id: 'prod-7',
    sku: 'SB-FRD-TRN-0891',
    name: 'Ford Transit Custom Front Driver Assembly',
    category: 'Seat Belts',
    status: 'Active',
    statusVariant: 'success',
    stock: '1 unit (Serialized)',
    price: '$89.00',
  },
  {
    id: 'prod-8',
    sku: 'SB-VAG-GLF-0944',
    name: 'VW Golf Mk7 Front Passenger Inertia Reel',
    category: 'Seat Belts',
    status: 'Active',
    statusVariant: 'success',
    stock: '1 unit (Serialized)',
    price: '$76.00',
  },
  {
    id: 'prod-9',
    sku: 'SB-BMW-F30-1012',
    name: 'BMW 3-Series Rear Outer Assembly Grade B',
    category: 'Seat Belts',
    status: 'Active',
    statusVariant: 'success',
    stock: '1 unit (Serialized)',
    price: '$54.00',
  },
  {
    id: 'prod-10',
    sku: 'SB-MBZ-SPR-1185',
    name: 'Mercedes Sprinter Front Pre-Tensioner',
    category: 'Seat Belts',
    status: 'Low Stock',
    statusVariant: 'warning',
    stock: '1 unit (Serialized)',
    price: '$98.00',
  },
];

const productColumns: Column<ProductRow>[] = [
  {
    header: 'SKU',
    accessor: (row) => (
      <span className="font-mono text-xs font-semibold text-slate-800">{row.sku}</span>
    ),
  },
  {
    header: 'Product Name',
    accessor: (row) => (
      <Link
        href={`/admin/products/${row.id}`}
        className="font-medium text-blue-700 hover:underline"
      >
        {row.name}
      </Link>
    ),
  },
  {
    header: 'Category',
    accessor: 'category',
    className: 'text-slate-600',
  },
  {
    header: 'Status',
    accessor: (row) => (
      <Badge variant={row.statusVariant} className="text-xs">
        {row.status}
      </Badge>
    ),
  },
  {
    header: 'Stock Level',
    accessor: (row) => (
      <span className="text-xs font-mono font-medium text-slate-700">{row.stock}</span>
    ),
  },
  {
    header: 'Base Price',
    accessor: (row) => <span className="font-mono font-semibold text-slate-900">{row.price}</span>,
  },
];

export default function AdminProductsPage() {
  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/admin/dashboard">Admin</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Products</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header and Add Product Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Products Catalogue</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage bulk tyre inventory definitions and serialized safety restraint items.
          </p>
        </div>
        <Button type="button" className="gap-2 self-start sm:self-auto">
          <Plus className="h-4 w-4" />
          <span>Add Product</span>
        </Button>
      </div>

      {/* DEMO DATA */}
      <div className="space-y-4">
        <DataTable columns={productColumns} data={demoProducts} keyExtractor={(row) => row.id} />

        {/* Pagination */}
        <div className="pt-2">
          <Pagination currentPage={1} totalPages={4} onPageChange={() => {}} />
        </div>
      </div>
    </div>
  );
}
