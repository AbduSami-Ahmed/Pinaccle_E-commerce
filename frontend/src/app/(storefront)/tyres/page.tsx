import * as React from 'react';
import Link from 'next/link';
import { Disc, Search, RotateCcw } from 'lucide-react';
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
import { TyreFilters } from '@/components/storefront/tyre-filters';
import { SelectedFilterChips, ActiveFilter } from '@/components/storefront/selected-filter-chips';
import { TyreSortSelector } from './tyre-sort-selector';
import { TyrePagination } from './tyre-pagination';
import { fetchStorefrontFilterMeta, fetchStorefrontProducts } from '@/lib/storefront';

export const metadata = {
  title: 'Commercial Tyres Catalogue — Pinnacle Auto Parts',
  description:
    'Search and filter verified commercial and passenger car tyres by section width, profile, rim diameter, speed rating, and brand. Real warehouse inventory with single, pair, and set of 4 pricing.',
  alternates: {
    canonical: '/tyres',
  },
};

interface TyresPageProps {
  searchParams: Promise<{
    search?: string;
    sectionWidth?: string;
    aspectRatio?: string;
    rimDiameter?: string;
    loadIndex?: string;
    speedRating?: string;
    season?: string;
    terrainType?: string;
    brand?: string;
    condition?: string;
    saleUnit?: string;
    inStockOnly?: string;
    minPrice?: string;
    maxPrice?: string;
    sortBy?: 'price_asc' | 'price_desc' | 'title' | 'createdAt' | 'relevance';
    sortOrder?: 'asc' | 'desc';
    page?: string;
    pageSize?: string;
  }>;
}

export default async function TyresListingPage({ searchParams }: TyresPageProps) {
  const resolvedParams = await searchParams;

  const [productsRes, filterMeta] = await Promise.all([
    fetchStorefrontProducts({
      categorySlug: 'tyres',
      search: resolvedParams.search,
      sectionWidth: resolvedParams.sectionWidth ? Number(resolvedParams.sectionWidth) : undefined,
      aspectRatio: resolvedParams.aspectRatio ? Number(resolvedParams.aspectRatio) : undefined,
      rimDiameter: resolvedParams.rimDiameter ? Number(resolvedParams.rimDiameter) : undefined,
      loadIndex: resolvedParams.loadIndex ? Number(resolvedParams.loadIndex) : undefined,
      speedRating: resolvedParams.speedRating,
      season: resolvedParams.season,
      terrainType: resolvedParams.terrainType,
      brand: resolvedParams.brand,
      condition: resolvedParams.condition,
      saleUnit: resolvedParams.saleUnit,
      inStockOnly: resolvedParams.inStockOnly === 'true',
      minPrice: resolvedParams.minPrice ? Number(resolvedParams.minPrice) : undefined,
      maxPrice: resolvedParams.maxPrice ? Number(resolvedParams.maxPrice) : undefined,
      sortBy: resolvedParams.sortBy,
      sortOrder: resolvedParams.sortOrder,
      page: resolvedParams.page ? Number(resolvedParams.page) : 1,
      pageSize: 12,
    }),
    fetchStorefrontFilterMeta('tyres'),
  ]);

  // Construct active filter chips
  const activeFilters: ActiveFilter[] = [];
  if (resolvedParams.search) {
    activeFilters.push({ key: 'search', label: 'Search', value: resolvedParams.search });
  }
  if (resolvedParams.sectionWidth) {
    activeFilters.push({
      key: 'sectionWidth',
      label: 'Width',
      value: `${resolvedParams.sectionWidth} mm`,
    });
  }
  if (resolvedParams.aspectRatio) {
    activeFilters.push({
      key: 'aspectRatio',
      label: 'Profile',
      value: `${resolvedParams.aspectRatio}%`,
    });
  }
  if (resolvedParams.rimDiameter) {
    activeFilters.push({
      key: 'rimDiameter',
      label: 'Rim',
      value: `${resolvedParams.rimDiameter}"`,
    });
  }
  if (resolvedParams.brand) {
    activeFilters.push({ key: 'brand', label: 'Brand', value: resolvedParams.brand });
  }
  if (resolvedParams.season) {
    activeFilters.push({ key: 'season', label: 'Season', value: resolvedParams.season });
  }
  if (resolvedParams.saleUnit) {
    const unitMap: Record<string, string> = {
      TYRE_SINGLE: 'Single Tyre',
      TYRE_PAIR: 'Pair of 2',
      TYRE_SET_OF_4: 'Set of 4',
    };
    activeFilters.push({
      key: 'saleUnit',
      label: 'Unit',
      value: unitMap[resolvedParams.saleUnit] || resolvedParams.saleUnit,
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
            <BreadcrumbPage>Tyres</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header Banner */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                <Disc className="h-4 w-4" />
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Commercial & Passenger Tyres
              </h1>
            </div>
            <p className="mt-1 text-xs text-slate-500 max-w-2xl">
              Direct importer stock from leading manufacturers. Available as singles, axle pairs
              (2), or full vehicle sets (4) with trade savings. Drive-in fitting & balancing
              available at our Penrose Auckland facility for $25/corner.
            </p>
          </div>

          <div className="text-right">
            <span className="text-sm font-semibold text-slate-900">
              {meta.total} {meta.total === 1 ? 'Product' : 'Products'} Found
            </span>
            <div className="text-[11px] text-slate-400">
              Page {meta.page} of {meta.totalPages}
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

      {/* Main Content Layout: Sidebar + Product Grid */}
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Tyre Filter Sidebar / Drawer */}
        <TyreFilters meta={filterMeta} />

        {/* Product Grid Area */}
        <div className="flex-1 w-full space-y-6">
          {/* Top Bar: Sort & Result Count */}
          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs text-slate-600 shadow-xs">
            <span>
              Showing <span className="font-semibold text-slate-900">{products.length}</span> of{' '}
              <span className="font-semibold text-slate-900">{meta.total}</span> items
            </span>

            {/* Sort Selector Client Component */}
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
                No tyres found matching your filter criteria
              </h3>
              <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                Try widening your dimension parameters or clearing brand and price filters to view
                more stock.
              </p>
              <div className="mt-6">
                <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs">
                  <Link href="/tyres">
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
