import * as React from 'react';
import Link from 'next/link';
import { ShieldCheck, Search, RotateCcw } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { ProductCard } from '@/components/storefront/product-card';
import { SeatBeltFilters } from '@/components/storefront/seat-belt-filters';
import { SelectedFilterChips, ActiveFilter } from '@/components/storefront/selected-filter-chips';
import { TyreSortSelector } from '../tyres/tyre-sort-selector';
import { TyrePagination } from '../tyres/tyre-pagination';
import {
  fetchStorefrontFilterMeta,
  fetchStorefrontProducts,
  fetchStorefrontVehicles,
} from '@/lib/storefront';

export const metadata = {
  title: 'Tested Serialized Seat Belts & Restraints — Pinnacle Auto Parts',
  description:
    'Search verified OEM and reconditioned vehicle seat belts by Make, Model, Year, Position, and Condition Grade. Each unique unit is safety tested, resistance checked, and individually serialized.',
  alternates: {
    canonical: '/seat-belts',
  },
};

interface SeatBeltsPageProps {
  searchParams: Promise<{
    search?: string;
    make?: string;
    model?: string;
    year?: string;
    position?: string;
    componentType?: string;
    condition?: string;
    inStockOnly?: string;
    minPrice?: string;
    maxPrice?: string;
    sortBy?: 'price_asc' | 'price_desc' | 'title' | 'createdAt' | 'relevance';
    sortOrder?: 'asc' | 'desc';
    page?: string;
    pageSize?: string;
  }>;
}

export default async function SeatBeltsListingPage({ searchParams }: SeatBeltsPageProps) {
  const resolvedParams = await searchParams;

  const [productsRes, filterMeta, vehicles] = await Promise.all([
    fetchStorefrontProducts({
      categorySlug: 'seat-belts',
      search: resolvedParams.search,
      make: resolvedParams.make,
      model: resolvedParams.model,
      year: resolvedParams.year ? Number(resolvedParams.year) : undefined,
      position: resolvedParams.position,
      componentType: resolvedParams.componentType,
      condition: resolvedParams.condition,
      inStockOnly: resolvedParams.inStockOnly === 'true',
      minPrice: resolvedParams.minPrice ? Number(resolvedParams.minPrice) : undefined,
      maxPrice: resolvedParams.maxPrice ? Number(resolvedParams.maxPrice) : undefined,
      sortBy: resolvedParams.sortBy,
      sortOrder: resolvedParams.sortOrder,
      page: resolvedParams.page ? Number(resolvedParams.page) : 1,
      pageSize: 12,
    }),
    fetchStorefrontFilterMeta('seat-belts'),
    fetchStorefrontVehicles(),
  ]);

  // Construct active filter chips
  const activeFilters: ActiveFilter[] = [];
  if (resolvedParams.search) {
    activeFilters.push({ key: 'search', label: 'Search', value: resolvedParams.search });
  }
  if (resolvedParams.make) {
    activeFilters.push({ key: 'make', label: 'Make', value: resolvedParams.make });
  }
  if (resolvedParams.model) {
    activeFilters.push({ key: 'model', label: 'Model', value: resolvedParams.model });
  }
  if (resolvedParams.year) {
    activeFilters.push({ key: 'year', label: 'Year', value: resolvedParams.year });
  }
  if (resolvedParams.position) {
    const posMap: Record<string, string> = {
      FRONT_LEFT_DRIVER: 'Front Driver (L/R)',
      FRONT_RIGHT_PASSENGER: 'Front Passenger',
      REAR_RIGHT: 'Rear Right',
      REAR_LEFT: 'Rear Left',
      REAR_CENTER: 'Rear Center',
      THIRD_ROW_LEFT: '3rd Row Left',
      THIRD_ROW_RIGHT: '3rd Row Right',
    };
    activeFilters.push({
      key: 'position',
      label: 'Position',
      value: posMap[resolvedParams.position] || resolvedParams.position,
    });
  }
  if (resolvedParams.componentType) {
    activeFilters.push({
      key: 'componentType',
      label: 'Type',
      value: resolvedParams.componentType.replace(/_/g, ' '),
    });
  }
  if (resolvedParams.condition) {
    activeFilters.push({
      key: 'condition',
      label: 'Condition',
      value: resolvedParams.condition.replace(/_/g, ' '),
    });
  }
  if (resolvedParams.inStockOnly === 'true') {
    activeFilters.push({ key: 'inStockOnly', label: 'Availability', value: 'In-Stock Only' });
  }
  if (resolvedParams.maxPrice) {
    activeFilters.push({
      key: 'maxPrice',
      label: 'Max Price',
      value: `$${resolvedParams.maxPrice}`,
    });
  }

  const { data: products, meta } = productsRes;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/">Home</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Seat Belts</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Clean, Bright Header Banner */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  Tested Seat Belts &amp; Restraints
                </h1>
                <p className="text-xs text-slate-500">Serialized Stock · 2.1–2.4Ω Resistance Certified · Donor VIN Verified</p>
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-600 max-w-2xl leading-relaxed">
              Every unit is multimeter-tested for pretensioner circuit resistance and mechanical lock.
              Actual photos of the exact physical unit on our shelf with WOF compliance tags intact.
            </p>
          </div>

          <div className="text-left md:text-right shrink-0">
            <span className="text-lg font-bold text-slate-900 block">
              {meta.total} {meta.total === 1 ? 'Part' : 'Parts'} In-Stock
            </span>
            <div className="text-xs text-slate-400">
              Page {meta.page} of {meta.totalPages || 1}
            </div>
          </div>
        </div>

        {/* Selected Filter Chips */}
        {activeFilters.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <SelectedFilterChips filters={activeFilters} />
          </div>
        )}
      </div>

      {/* Main Content: Filter Sidebar + Product Grid */}
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Seat Belt Filters Sidebar / Drawer */}
        <SeatBeltFilters meta={filterMeta} vehicles={vehicles} />

        {/* Product Grid Area */}
        <div className="flex-1 w-full space-y-6">
          {/* Top Bar: Sort & Result Count */}
          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs text-slate-600 shadow-xs">
            <span>
              Showing <span className="font-semibold text-slate-900">{products.length}</span> of{' '}
              <span className="font-semibold text-slate-900">{meta.total}</span> items
            </span>

            {/* Sort Selector */}
            <TyreSortSelector currentSort={resolvedParams.sortBy || 'createdAt'} />
          </div>

          {/* Product Cards or Empty State */}
          {products.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <Search className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-slate-900">
                No seat belts found matching your vehicle or criteria
              </h3>
              <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                Try selecting a different position, clearing vehicle make/model filters, or contact
                our support team with your VIN for direct stock cross-referencing.
              </p>
              <div className="mt-6">
                <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs">
                  <Link href="/seat-belts">
                    <RotateCcw className="h-3.5 w-3.5" /> Reset All Filters
                  </Link>
                </Button>
              </div>
            </div>
          )}

          {/* Server-Side Pagination */}
          {meta.totalPages > 1 && (
            <div className="pt-4 border-t border-slate-200">
              <TyrePagination currentPage={meta.page} totalPages={meta.totalPages} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
