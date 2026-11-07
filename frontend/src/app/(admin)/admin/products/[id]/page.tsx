import * as React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  Database,
  Edit,
  Image as ImageIcon,
  Package,
  ShieldAlert,
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
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchProductById } from '@/lib/catalog';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminProductDetailPage({ params }: PageProps) {
  const { id } = await params;
  const product = await fetchProductById(id);

  if (!product) {
    notFound();
  }

  const getStatusVariant = (status: string) => {
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

      {/* Header and Quick Actions */}
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
                {product.title}
              </h1>
              <Badge variant={getStatusVariant(product.status)} className="text-xs">
                {product.status}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {product.productType === 'BULK_QUANTITY'
                  ? 'Bulk Quantity'
                  : 'Individually Serialized'}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              SKU: {product.sku} &bull; Internal ID: {product.id}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/admin/products/${product.id}/edit`}>
              <Edit className="h-4 w-4 mr-1.5" />
              Edit Product
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content Area (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* General Overview Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Product Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block mb-0.5">Brand / Make</span>
                  <span className="font-semibold text-slate-900">{product.brand}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Category</span>
                  <span className="font-semibold text-slate-900">
                    {product.category?.name ?? 'Automotive Parts'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">OEM Part Number</span>
                  <span className="font-mono text-slate-700">
                    {product.oemPartNumber || 'None recorded'}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 text-xs block mb-1">Description</span>
                <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">
                  {product.description}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Category-Specific Specifications Card */}
          {product.tyreSpecification && (
            <Card className="border-amber-200">
              <CardHeader className="bg-amber-50/30 border-b border-amber-100">
                <CardTitle className="text-base text-amber-950 flex items-center gap-2">
                  <Package className="h-4 w-4 text-amber-600" />
                  <span>Tyre Dimensional & Performance Specifications</span>
                </CardTitle>
                <CardDescription className="text-amber-800/80">
                  Normalized technical attributes for tyre fitment calculations.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                    <span className="text-slate-500 block">Section Width</span>
                    <span className="text-base font-bold text-slate-900 font-mono">
                      {product.tyreSpecification.sectionWidth} mm
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                    <span className="text-slate-500 block">Aspect Ratio</span>
                    <span className="text-base font-bold text-slate-900 font-mono">
                      {product.tyreSpecification.aspectRatio}%
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                    <span className="text-slate-500 block">Rim Diameter</span>
                    <span className="text-base font-bold text-slate-900 font-mono">
                      {product.tyreSpecification.rimDiameter}&quot;
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                    <span className="text-slate-500 block">Load & Speed</span>
                    <span className="text-base font-bold text-slate-900 font-mono">
                      {product.tyreSpecification.loadIndex}
                      {product.tyreSpecification.speedRating}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs pt-2">
                  <div>
                    <span className="text-slate-400 block">Season</span>
                    <span className="font-semibold text-slate-800">
                      {product.tyreSpecification.season}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Terrain</span>
                    <span className="font-semibold text-slate-800">
                      {product.tyreSpecification.terrainType}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Run-Flat</span>
                    <span className="font-semibold text-slate-800">
                      {product.tyreSpecification.runFlat ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Extra Load (XL)</span>
                    <span className="font-semibold text-slate-800">
                      {product.tyreSpecification.extraLoad ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>

                {(product.tyreSpecification.fuelEfficiencyClass ||
                  product.tyreSpecification.wetGripClass ||
                  product.tyreSpecification.noiseDb) && (
                  <div className="pt-2 border-t border-slate-100 flex items-center gap-4 text-xs text-slate-600">
                    <span>EU Label Ratings:</span>
                    {product.tyreSpecification.fuelEfficiencyClass && (
                      <Badge variant="outline">
                        Fuel: {product.tyreSpecification.fuelEfficiencyClass}
                      </Badge>
                    )}
                    {product.tyreSpecification.wetGripClass && (
                      <Badge variant="outline">
                        Grip: {product.tyreSpecification.wetGripClass}
                      </Badge>
                    )}
                    {product.tyreSpecification.noiseDb && (
                      <Badge variant="outline">{product.tyreSpecification.noiseDb} dB</Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {product.seatBeltSpecification && (
            <Card className="border-blue-200">
              <CardHeader className="bg-blue-50/30 border-b border-blue-100">
                <CardTitle className="text-base text-blue-950 flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-blue-600" />
                  <span>Seat Belt Safety & Installation Specifications</span>
                </CardTitle>
                <CardDescription className="text-blue-800/80">
                  ADR safety compliance, position, and pretensioner details.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div>
                    <span className="text-slate-400 block">Position</span>
                    <span className="font-semibold text-slate-800">
                      {product.seatBeltSpecification.position.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Component Type</span>
                    <span className="font-semibold text-slate-800">
                      {product.seatBeltSpecification.componentType.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Pretensioner Type</span>
                    <span className="font-semibold text-slate-800">
                      {product.seatBeltSpecification.pretensionerType}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Webbing Colour</span>
                    <span className="font-semibold text-slate-800">
                      {product.seatBeltSpecification.webbingColor}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Mounting Points</span>
                    <span className="font-semibold text-slate-800 font-mono">
                      {product.seatBeltSpecification.mountingPoints} Points
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">OEM Compliance Tag</span>
                    <span className="font-mono text-slate-700">
                      {product.seatBeltSpecification.oemReferenceTag || 'Standard ADR'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Commercial Sale Units Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Commercial Sale Units & Multipliers</CardTitle>
              <CardDescription>
                Base stock consumed per customer purchase option. Physical inventory is always
                stored as single units.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                      <th className="py-2 px-3">Sale Unit</th>
                      <th className="py-2 px-3">Unit Code</th>
                      <th className="py-2 px-3">Base Multiplier</th>
                      <th className="py-2 px-3">Retail Price</th>
                      <th className="py-2 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {product.saleUnits.map((u) => (
                      <tr key={u.code} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-medium text-slate-900">{u.name}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-500">{u.code}</td>
                        <td className="py-2.5 px-3 font-mono">
                          {u.baseQuantityMultiplier}x base units
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                          ${u.retailPrice}
                        </td>
                        <td className="py-2.5 px-3">
                          {u.isDefault && (
                            <Badge variant="outline" className="text-[10px] mr-1">
                              Default
                            </Badge>
                          )}
                          <Badge
                            variant={u.isActive ? 'success' : 'secondary'}
                            className="text-[10px]"
                          >
                            {u.isActive ? 'Active' : 'Disabled'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Product Media Gallery */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Product Photography</CardTitle>
              <CardDescription>
                {product.media.length} image(s) hosted in secure object storage.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {product.media.length === 0 ? (
                <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-lg text-xs text-slate-400">
                  <ImageIcon className="mx-auto h-6 w-6 text-slate-300 mb-1" />
                  No photos uploaded for this product catalogue entry.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {product.media.map((img) => (
                    <div
                      key={img.s3Key}
                      className="border rounded-lg overflow-hidden bg-white shadow-sm flex flex-col justify-between"
                    >
                      <div className="aspect-square bg-slate-100 relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img.cdnUrl}
                          alt={img.altText}
                          className="w-full h-full object-cover"
                        />
                        {img.isPrimary && (
                          <div className="absolute top-1.5 left-1.5">
                            <Badge variant="default" className="text-[9px] bg-amber-500 text-white">
                              Primary
                            </Badge>
                          </div>
                        )}
                      </div>
                      <div className="p-2 text-[10px] text-slate-500 truncate" title={img.altText}>
                        {img.altText}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar (1 Col) */}
        <div className="space-y-6">
          {/* Metadata & Audit Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-1.5">
                <Database className="h-4 w-4 text-slate-500" />
                <span>Audit & System Metadata</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">Database ID (UUID)</span>
                <span className="font-mono text-slate-700 select-all block break-all">
                  {product.id}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-100">
                <span className="text-slate-400 block mb-0.5">URL Slug</span>
                <span className="font-mono text-slate-700">{product.slug}</span>
              </div>
              <div className="pt-2 border-t border-slate-100">
                <span className="text-slate-400 block mb-0.5">Date Created</span>
                <span className="text-slate-700 flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  {new Date(product.createdAt).toLocaleString()}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-100">
                <span className="text-slate-400 block mb-0.5">Last Updated</span>
                <span className="text-slate-700 flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  {new Date(product.updatedAt).toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Decoupling Notice Card */}
          <Card className="bg-slate-50 border-slate-200">
            <CardContent className="pt-4 text-xs text-slate-600 space-y-2">
              <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                <Package className="h-4 w-4 text-slate-700" />
                <span>Catalogue vs Inventory Rule</span>
              </p>
              <p className="leading-relaxed">
                This record is strictly a master catalogue definition. Physical inventory balances,
                warehouse bin locations, serial numbers, and condition grades are recorded in the
                Inventory Module upon inward stock intake.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
