'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  Archive,
  ArrowUpDown,
  CheckCircle2,
  Edit,
  Eye,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  Search,
  Trash2,
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
import { Pagination } from '@/components/ui/pagination';
import { EmptyState } from '@/components/shared/empty-state';
import { LoadingSkeleton } from '@/components/shared/loading-skeleton';
import { CategoryDto, ProductListItemDto, ProductStatus, ProductType } from '@pinnacle/contracts';
import { deleteProduct, fetchCategories, fetchProducts, updateProductStatus } from '@/lib/catalog';

export default function AdminProductsListPage() {
  const [products, setProducts] = React.useState<ProductListItemDto[]>([]);
  const [categories, setCategories] = React.useState<CategoryDto[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [total, setTotal] = React.useState(0);
  const [totalPages, setTotalPages] = React.useState(1);

  // Filters & Pagination State
  const [search, setSearch] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState<string>('');
  const [selectedStatus, setSelectedStatus] = React.useState<string>('');
  const [selectedType, setSelectedType] = React.useState<string>('');
  const [page, setPage] = React.useState(1);
  const [pageSize] = React.useState(10);
  const [sortBy, setSortBy] = React.useState<'title' | 'sku' | 'createdAt' | 'brand'>('createdAt');
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('desc');
  const [actionError, setActionError] = React.useState<string | null>(null);

  // Load Categories on mount
  React.useEffect(() => {
    fetchCategories()
      .then(setCategories)
      .catch(() => {});
  }, []);

  // Fetch Products whenever filters change
  const loadProducts = React.useCallback(async () => {
    setLoading(true);
    setActionError(null);
    try {
      const res = await fetchProducts({
        search: search.trim() || undefined,
        categoryId: selectedCategory || undefined,
        status: (selectedStatus as ProductStatus) || undefined,
        productType: (selectedType as ProductType) || undefined,
        page,
        pageSize,
        sortBy,
        sortOrder,
      });

      setProducts(res.data);
      setTotal(res.meta.total);
      setTotalPages(res.meta.totalPages);
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [search, selectedCategory, selectedStatus, selectedType, page, pageSize, sortBy, sortOrder]);

  React.useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Status Change Quick Action
  const handleStatusChange = async (id: string, currentStatus: ProductStatus) => {
    try {
      const targetStatus: ProductStatus = currentStatus === 'PUBLISHED' ? 'ARCHIVED' : 'PUBLISHED';
      await updateProductStatus(id, targetStatus);
      await loadProducts();
    } catch (err) {
      setActionError((err as Error).message);
    }
  };

  // Delete / Archive Quick Action
  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete or archive "${title}"?`)) {
      return;
    }
    try {
      const result = await deleteProduct(id);
      alert(result.message);
      await loadProducts();
    } catch (err) {
      setActionError((err as Error).message);
    }
  };

  const clearFilters = () => {
    setSearch('');
    setSelectedCategory('');
    setSelectedStatus('');
    setSelectedType('');
    setPage(1);
  };

  const getStatusVariant = (status: ProductStatus) => {
    switch (status) {
      case 'PUBLISHED':
        return 'success';
      case 'DRAFT':
        return 'secondary';
      case 'ARCHIVED':
        return 'destructive';
      default:
        return 'outline';
    }
  };

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
            <BreadcrumbPage>Products</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Action Error Banner */}
      {actionError && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{actionError}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActionError(null)}
            className="h-6 text-xs"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Header and Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Product Catalogue
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage master product records, tyre & seat-belt specifications, and commercial sale
            tiers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadProducts()}
            disabled={loading}
            title="Refresh List"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button asChild size="sm">
            <Link href="/admin/products/new">
              <Plus className="h-4 w-4 mr-1.5" />
              New Product
            </Link>
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by title, SKU, brand..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9 text-xs"
            />
          </div>

          {/* Category Filter */}
          <div>
            <select
              className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 py-1 text-xs shadow-sm focus:border-slate-500 focus:outline-none"
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 py-1 text-xs shadow-sm focus:border-slate-500 focus:outline-none"
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Statuses</option>
              <option value="PUBLISHED">Published (Active)</option>
              <option value="DRAFT">Draft</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>

          {/* Product Type Filter */}
          <div>
            <select
              className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 py-1 text-xs shadow-sm focus:border-slate-500 focus:outline-none"
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Modalities</option>
              <option value="BULK_QUANTITY">Bulk Quantity (Tyres)</option>
              <option value="INDIVIDUALLY_SERIALIZED">Individually Serialized (Seat Belts)</option>
            </select>
          </div>
        </div>

        {/* Applied Filters & Sort Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>
              Showing <strong>{products.length}</strong> of <strong>{total}</strong> products
            </span>
            {(search || selectedCategory || selectedStatus || selectedType) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-6 text-xs text-slate-600 hover:text-slate-900 px-2"
              >
                Clear Filters
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400">Sort by:</span>
            <select
              className="h-7 rounded border border-slate-200 bg-white px-2 text-xs text-slate-700"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
            >
              <option value="createdAt">Date Created</option>
              <option value="title">Title</option>
              <option value="sku">SKU</option>
              <option value="brand">Brand</option>
            </select>
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))}
              title={`Sort ${sortOrder === 'asc' ? 'Ascending' : 'Descending'}`}
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Table / State View */}
      {loading ? (
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading product catalogue records...</span>
          </div>
          <LoadingSkeleton view="table" count={5} />
        </div>
      ) : products.length === 0 ? (
        <EmptyState
          title="No products found"
          description={
            search || selectedCategory || selectedStatus
              ? 'No products matched your active filter criteria. Try adjusting your search keywords or resetting filters.'
              : 'Your product catalogue is empty. Create your first master catalogue product to begin.'
          }
          action={
            search || selectedCategory || selectedStatus ? (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Reset Filters
              </Button>
            ) : (
              <Button asChild size="sm">
                <Link href="/admin/products/new">
                  <Plus className="h-4 w-4 mr-1.5" />
                  Create First Product
                </Link>
              </Button>
            )
          }
        />
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Product / SKU</th>
                  <th className="py-3 px-4">Brand</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Modality</th>
                  <th className="py-3 px-4">Base Price</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded border border-slate-200 bg-slate-100 flex-shrink-0 overflow-hidden flex items-center justify-center">
                          {p.primaryImageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={p.primaryImageUrl}
                              alt={p.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Package className="h-5 w-5 text-slate-400" />
                          )}
                        </div>
                        <div>
                          <Link
                            href={`/admin/products/${p.id}`}
                            className="font-medium text-slate-900 hover:text-slate-700 block line-clamp-1"
                          >
                            {p.title}
                          </Link>
                          <span className="font-mono text-[11px] text-slate-400">SKU: {p.sku}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700">{p.brand}</td>
                    <td className="py-3 px-4 text-slate-600">{p.categoryName}</td>
                    <td className="py-3 px-4">
                      <Badge variant="outline" className="text-[10px] font-normal">
                        {p.productType === 'BULK_QUANTITY' ? 'Bulk Quantity' : 'Serialized'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-900">
                      {p.basePrice ? `$${p.basePrice}` : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={getStatusVariant(p.status)} className="text-[10px]">
                        {p.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          asChild
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          title="View details"
                        >
                          <Link href={`/admin/products/${p.id}`}>
                            <Eye className="h-3.5 w-3.5 text-slate-600" />
                          </Link>
                        </Button>
                        <Button
                          asChild
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          title="Edit product"
                        >
                          <Link href={`/admin/products/${p.id}/edit`}>
                            <Edit className="h-3.5 w-3.5 text-slate-600" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => handleStatusChange(p.id, p.status)}
                          title={p.status === 'PUBLISHED' ? 'Archive Product' : 'Publish Product'}
                        >
                          {p.status === 'PUBLISHED' ? (
                            <Archive className="h-3.5 w-3.5 text-slate-500" />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDelete(p.id, p.title)}
                          title="Delete / Archive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="py-3 px-4 border-t border-slate-200 flex items-center justify-between bg-slate-50/50">
              <span className="text-xs text-slate-500">
                Page {page} of {totalPages}
              </span>
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={(newPage) => setPage(newPage)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
