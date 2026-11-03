import * as React from 'react';
import Link from 'next/link';
import { Image as ImageIcon, Save, ArrowLeft } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminProductDetailPage({ params }: PageProps) {
  const { id } = await params;

  // DEMO DATA
  const product = {
    id,
    sku: 'TY-MICH-2254517',
    name: 'Michelin Pilot Sport 4 (225/45 R17 94Y XL)',
    brand: 'Michelin',
    category: 'Tyres',
    basePrice: '145.00',
    stockLevel: '148',
    status: 'Active',
    description:
      'High-performance summer tyre offering wet safety and steering reactivity via dynamic response aramid-nylon hybrid belt technology.',
    specs: {
      width: '225',
      aspectRatio: '45',
      rimSize: '17',
      loadIndex: '94',
      speedRating: 'Y',
      season: 'Summer',
    },
    saleUnits: [
      { unit: 'Single', multiplier: '1.0x', price: '$145.00', status: 'Enabled' },
      { unit: 'Axle Pair', multiplier: '2.0x', price: '$290.00', status: 'Enabled' },
      { unit: 'Full Set (4)', multiplier: '4.0x', price: '$580.00', status: 'Enabled' },
    ],
  };

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
            <BreadcrumbLink asChild>
              <Link href="/admin/products">Products</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{product.sku}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="sm" className="h-8 w-8 p-0">
            <Link href="/admin/products" aria-label="Back to products list">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                {product.name}
              </h1>
              <Badge variant="success" className="text-xs">
                {product.status}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Internal ID: {id} &bull; SKU: {product.sku}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" disabled>
            Cancel
          </Button>
          <Button type="button" size="sm" className="gap-2" disabled>
            <Save className="h-3.5 w-3.5" />
            <span>Save Changes</span>
          </Button>
        </div>
      </div>

      {/* DEMO DATA */}
      {/* Two Column Layout: Left = Product Info Form, Right = Media & Sale Units */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left Column: Product Info Form (Read-only inputs with static values) */}
        <div className="space-y-6 lg:col-span-2">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-base">Product Identification & Pricing</CardTitle>
              <CardDescription>
                Core catalogue properties and inventory pricing parameters.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Product Name / Commercial Title"
                defaultValue={product.name}
                readOnly
                className="bg-slate-50 cursor-not-allowed"
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Input
                  label="SKU / Part Identifier"
                  defaultValue={product.sku}
                  readOnly
                  className="bg-slate-50 cursor-not-allowed font-mono"
                />
                <Input
                  label="Brand / Manufacturer"
                  defaultValue={product.brand}
                  readOnly
                  className="bg-slate-50 cursor-not-allowed"
                />
                <Input
                  label="Category Classification"
                  defaultValue={product.category}
                  readOnly
                  className="bg-slate-50 cursor-not-allowed"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Base Price (USD $)"
                  defaultValue={product.basePrice}
                  readOnly
                  className="bg-slate-50 cursor-not-allowed font-mono"
                />
                <Input
                  label="Current Physical Stock"
                  defaultValue={product.stockLevel}
                  readOnly
                  className="bg-slate-50 cursor-not-allowed font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">
                  Technical Description
                </label>
                <textarea
                  rows={4}
                  defaultValue={product.description}
                  readOnly
                  className="w-full rounded-md border border-input bg-slate-50 px-3 py-2 text-sm text-slate-800 shadow-sm cursor-not-allowed focus:outline-none"
                />
              </div>
            </CardContent>
          </Card>

          {/* Technical Specifications */}
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-base">Tyre Dimensional Attributes</CardTitle>
              <CardDescription>
                Automotive fitment parameters used by the storefront dimension filters.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <Input
                  label="Width (mm)"
                  defaultValue={product.specs.width}
                  readOnly
                  className="bg-slate-50 cursor-not-allowed font-mono"
                />
                <Input
                  label="Aspect Ratio (%)"
                  defaultValue={product.specs.aspectRatio}
                  readOnly
                  className="bg-slate-50 cursor-not-allowed font-mono"
                />
                <Input
                  label="Rim Diameter (inches)"
                  defaultValue={product.specs.rimSize}
                  readOnly
                  className="bg-slate-50 cursor-not-allowed font-mono"
                />
                <Input
                  label="Load Index"
                  defaultValue={product.specs.loadIndex}
                  readOnly
                  className="bg-slate-50 cursor-not-allowed font-mono"
                />
                <Input
                  label="Speed Rating"
                  defaultValue={product.specs.speedRating}
                  readOnly
                  className="bg-slate-50 cursor-not-allowed font-mono"
                />
                <Input
                  label="Season / Profile"
                  defaultValue={product.specs.season}
                  readOnly
                  className="bg-slate-50 cursor-not-allowed"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Media Placeholder & Sale Unit Configs */}
        <div className="space-y-6 lg:col-span-1">
          {/* Media Placeholder */}
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-base">Product Media Asset</CardTitle>
              <CardDescription>
                Catalogue gallery and warehouse verification photos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex aspect-square w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 text-slate-400">
                <ImageIcon className="h-12 w-12 text-slate-300" />
                <span className="mt-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Primary Asset Placeholder
                </span>
                <span className="text-[11px] text-slate-400">1200 x 1200 PNG / WebP</span>
              </div>
              <div className="flex justify-between items-center text-xs text-slate-500 pt-1">
                <span>1 photo attached</span>
                <span className="text-blue-700 font-medium">Manage Media &rarr;</span>
              </div>
            </CardContent>
          </Card>

          {/* Sale Unit Configurations */}
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-base">Sale Unit Multipliers</CardTitle>
              <CardDescription>Bulk multipliers configured for this product SKU.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {product.saleUnits.map((unit, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50/70 p-3"
                >
                  <div>
                    <p className="text-xs font-bold text-slate-900">{unit.unit}</p>
                    <p className="text-[11px] text-slate-500 font-mono">
                      Multiplier: {unit.multiplier}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-mono font-bold text-slate-900">{unit.price}</p>
                    <Badge
                      variant="outline"
                      className="text-[10px] text-emerald-700 border-emerald-200 bg-emerald-50"
                    >
                      {unit.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
