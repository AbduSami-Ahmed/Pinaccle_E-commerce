import * as React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { fetchStorefrontProductBySlug } from '@/lib/storefront';
import { ProductGallery } from '@/components/storefront/product-gallery';
import { SaleUnitPurchaser } from '@/components/storefront/sale-unit-purchaser';
import { ProductSpecificationsTable } from '@/components/storefront/product-specifications-table';
import { ProductFitmentTable } from '@/components/storefront/product-fitment-table';
import { SerializedInspectionCard } from '@/components/storefront/serialized-inspection-card';
import { TradeDeliveryWarrantyCard } from '@/components/storefront/trade-delivery-warranty-card';
import { RelatedProductsSection } from '@/components/storefront/related-products-section';

export const revalidate = 120;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  try {
    const product = await fetchStorefrontProductBySlug(slug);
    return {
      title: `${product.title} (${product.brand}) — Pinnacle Auto Spares`,
      description: `${product.title}. In stock: ${product.availability.sellableBaseUnits} units at Auckland Penrose depot.`,
      alternates: {
        canonical: `/products/${slug}`,
      },
      openGraph: {
        title: `${product.title} | Pinnacle Auto Spares`,
        description: product.description.slice(0, 160),
        images: product.primaryImageUrl ? [{ url: product.primaryImageUrl }] : [],
      },
    };
  } catch {
    return {
      title: 'Automotive Component Detail — Pinnacle Auto Spares',
    };
  }
}

export default async function ProductUniversalDetailPage({ params }: PageProps) {
  const { slug } = await params;

  let product;
  try {
    product = await fetchStorefrontProductBySlug(slug);
  } catch {
    notFound();
  }

  const categoryHref =
    product.categorySlug === 'tyres'
      ? '/tyres'
      : product.categorySlug === 'seat-belts'
        ? '/seat-belts'
        : '/search';

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Breadcrumb Navigation */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/">Home</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={categoryHref}>{product.categoryName}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="font-semibold text-slate-800 line-clamp-1 max-w-md">
              {product.title}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Main Grid */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
        {/* Left Column (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <ProductGallery
            images={product.allMedia}
            productTitle={product.title}
            condition={product.condition}
            stockBarcode={product.stockNumber}
            isInspected={!!product.serializedItem}
          />

          <Tabs defaultValue={product.serializedItem ? 'inspection' : 'specs'} className="pt-2">
            <TabsList className="w-full justify-start border-b border-slate-200 rounded-none bg-transparent p-0 gap-6">
              {product.serializedItem && (
                <TabsTrigger
                  value="inspection"
                  className="rounded-none border-b-2 border-transparent px-1 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-600 data-[state=active]:border-blue-700 data-[state=active]:text-blue-700 data-[state=active]:bg-transparent"
                >
                  Inspection & Salvage Report
                </TabsTrigger>
              )}
              <TabsTrigger
                value="specs"
                className="rounded-none border-b-2 border-transparent px-1 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-600 data-[state=active]:border-blue-700 data-[state=active]:text-blue-700 data-[state=active]:bg-transparent"
              >
                Specifications
              </TabsTrigger>
              {product.fitments.length > 0 && (
                <TabsTrigger
                  value="fitment"
                  className="rounded-none border-b-2 border-transparent px-1 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-600 data-[state=active]:border-blue-700 data-[state=active]:text-blue-700 data-[state=active]:bg-transparent"
                >
                  Chassis Fitment ({product.fitments.length})
                </TabsTrigger>
              )}
              <TabsTrigger
                value="overview"
                className="rounded-none border-b-2 border-transparent px-1 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-600 data-[state=active]:border-blue-700 data-[state=active]:text-blue-700 data-[state=active]:bg-transparent"
              >
                Overview
              </TabsTrigger>
            </TabsList>

            {product.serializedItem && (
              <TabsContent value="inspection" className="pt-4">
                <SerializedInspectionCard
                  serializedItem={product.serializedItem}
                  productCondition={product.condition}
                />
              </TabsContent>
            )}

            <TabsContent value="specs" className="pt-4">
              <ProductSpecificationsTable product={product} />
            </TabsContent>

            {product.fitments.length > 0 && (
              <TabsContent value="fitment" className="pt-4">
                <ProductFitmentTable
                  fitments={product.fitments}
                  fitmentSummary={product.fitmentSummary}
                />
              </TabsContent>
            )}

            <TabsContent value="overview" className="pt-4 space-y-4 text-xs text-slate-600">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
                <h4 className="font-bold uppercase tracking-wider text-slate-900 text-xs">
                  Trade Catalog Overview
                </h4>
                <p className="leading-relaxed text-slate-700">{product.description}</p>
              </div>
            </TabsContent>
          </Tabs>

          <TradeDeliveryWarrantyCard
            warehouseLocation={product.warehouseLocation}
            shippingInfo={product.shippingInfo}
            warrantyAndReturns={product.warrantyAndReturns}
          />
        </div>

        {/* Right Column: Pricing & Purchase Card (5 cols) */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                <span className="font-bold uppercase tracking-wider text-blue-700">
                  {product.brand}
                </span>
                <span className="font-mono text-slate-400">SKU: {product.sku}</span>
              </div>

              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 leading-tight">
                {product.title}
              </h1>

              <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
                {product.availability.inStock ? (
                  <Badge
                    variant="outline"
                    className="border-emerald-300 bg-emerald-50 text-emerald-800 font-semibold gap-1"
                  >
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                    {product.availability.label}
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="border-rose-300 bg-rose-50 text-rose-800 font-semibold gap-1"
                  >
                    <AlertTriangle className="h-3 w-3 text-rose-600" />
                    Out of Stock in Depot
                  </Badge>
                )}
              </div>
            </div>

            <SaleUnitPurchaser
              productId={product.id}
              productTitle={product.title}
              basePrice={product.defaultPrice}
              currency={product.currency}
              sellableBaseUnits={product.availability.sellableBaseUnits}
              availableSaleUnits={product.availableSaleUnits}
              isIndividuallyTracked={!!product.serializedItem}
              serializedItemId={product.serializedItem?.id}
              stockNumber={product.stockNumber}
              categorySlug={product.categorySlug}
            />

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2 text-xs text-slate-600">
              <div className="flex items-center gap-2 text-slate-900 font-semibold">
                <Clock className="h-4 w-4 text-blue-700 shrink-0" />
                <span>Trade Dispatch Cutoff:</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Orders placed before <strong>2:00 PM NZST</strong> dispatch same business day via
                CourierPost or Mainfreight Express.
              </p>
            </div>
          </div>
        </div>
      </div>

      <RelatedProductsSection relatedProducts={product.relatedProducts} />
    </div>
  );
}
