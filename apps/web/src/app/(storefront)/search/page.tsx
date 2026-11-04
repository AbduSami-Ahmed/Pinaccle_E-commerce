import * as React from 'react';
import Link from 'next/link';
import { Search, RotateCcw } from 'lucide-react';
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
import { GlobalSearchBar } from '@/components/storefront/global-search-bar';
import { SelectedFilterChips, ActiveFilter } from '@/components/storefront/selected-filter-chips';
import { TyreSortSelector } from '../tyres/tyre-sort-selector';
import { TyrePagination } from '../tyres/tyre-pagination';
import { fetchStorefrontProducts } from '@/lib/storefront';

export const metadata = {
  title: 'Catalogue Search Results — Pinnacle Auto Parts',
  description: 'Search results across commercial tyres and inspected serialized seat belts.',
};

interface SearchPageProps {
  searchParams: Promise<{
    search?: string;
    categorySlug?: string;
    brand?: string;
    inStockOnly?: string;
    sortBy?: 'price_asc' | 'price_desc' | 'title' | 'createdAt' | 'relevance';
    page?: string;
  }>;
}

export default async function UniversalSearchPage({ searchParams }: SearchPageProps) {
  const resolvedParams = await searchParams;

  const productsRes = await fetchStorefrontProducts({
    search: resolvedParams.search,
    categorySlug: resolvedParams.categorySlug,
    brand: resolvedParams.brand,
    inStockOnly: resolvedParams.inStockOnly === 'true',
    sortBy: resolvedParams.sortBy,
    page: resolvedParams.page ? Number(resolvedParams.page) : 1,
    pageSize: 12,
  });

  const activeFilters: ActiveFilter[] = [];
  if (resolvedParams.search) {
    activeFilters.push({ key: 'search', label: 'Keyword', value: resolvedParams.search });
  }
  if (resolvedParams.categorySlug) {
    activeFilters.push({
      key: 'categorySlug',
      label: 'Department',
      value: resolvedParams.categorySlug,
    });
  }
  if (resolvedParams.brand) {
    activeFilters.push({ key: 'brand', label: 'Brand', value: resolvedParams.brand });
  }
  if (resolvedParams.inStockOnly === 'true') {
    activeFilters.push({ key: 'inStockOnly', label: 'Stock', value: 'In-Stock Only' });
  }

  const { data: products, meta } = productsRes;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/">Home</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Search</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Global Search Header */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            {resolvedParams.search ? (
              <>Search Results for &ldquo;{resolvedParams.search}&rdquo;</>
            ) : (
              'Search Full Product Catalogue'
            )}
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Search by part number, tyre dimension (e.g. 225/45 R17), vehicle make/model, or
            serialized barcode.
          </p>
        </div>

        <GlobalSearchBar
          initialSearch={resolvedParams.search || ''}
          initialCategory={resolvedParams.categorySlug || 'all'}
        />

        {activeFilters.length > 0 && (
          <div className="pt-2 border-t border-slate-100">
            <SelectedFilterChips filters={activeFilters} />
          </div>
        )}
      </div>

      {/* Top Bar: Count & Sort */}
      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs text-slate-600 shadow-xs">
        <span>
          Found <span className="font-semibold text-slate-900">{meta.total}</span> items matching
          your search
        </span>

        <TyreSortSelector currentSort={resolvedParams.sortBy || 'createdAt'} />
      </div>

      {/* Grid of Results */}
      {products.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <Search className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-slate-900">No matching items found</h3>
          <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
            Check your spelling, or try searching for a tyre dimension like &ldquo;205/55 R16&rdquo;
            or vehicle like &ldquo;Toyota RAV4&rdquo;.
          </p>
          <p className="mt-2 text-xs text-slate-600">
            Can&apos;t find your part? Call our Prestons yard on{' '}
            <strong className="text-slate-900">(02) 9822 4100</strong> — fresh donor vehicles arrive
            weekly.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs">
              <Link href="/search">
                <RotateCcw className="h-3.5 w-3.5" /> Clear Search
              </Link>
            </Button>
            <a
              href="tel:0298224100"
              className="inline-flex items-center gap-1.5 rounded-md bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-800 transition-colors"
            >
              Call Parts Desk: (02) 9822 4100
            </a>
          </div>
        </div>
      )}

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="pt-4 border-t border-slate-200">
          <TyrePagination currentPage={meta.page} totalPages={meta.totalPages} />
        </div>
      )}
    </div>
  );
}
