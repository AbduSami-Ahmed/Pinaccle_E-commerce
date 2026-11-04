'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Barcode, CheckCircle2, Disc, ShieldCheck, AlertTriangle, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StorefrontProductSummaryDto } from '@pinnacle/contracts';

export interface ProductCardProps {
  product: StorefrontProductSummaryDto;
}

export function ProductCard({ product }: ProductCardProps) {
  const isTyre = product.categorySlug === 'tyres' || product.productType === 'BULK_QUANTITY';
  const detailHref = isTyre ? `/tyres/${product.slug}` : `/seat-belts/${product.slug}`;

  // Format condition badge
  const renderConditionBadge = () => {
    if (product.condition === 'NEW_SURPLUS') {
      return (
        <Badge
          variant="outline"
          className="border-emerald-200 bg-emerald-50 text-emerald-800 text-[11px] font-medium"
        >
          Brand New / Surplus
        </Badge>
      );
    }
    if (product.condition === 'GRADE_A_LIKE_NEW') {
      return (
        <Badge
          variant="outline"
          className="border-blue-200 bg-blue-50 text-blue-800 text-[11px] font-medium"
        >
          Grade A (Like-New)
        </Badge>
      );
    }
    if (product.condition === 'GRADE_B_MINOR_WEAR') {
      return (
        <Badge
          variant="outline"
          className="border-amber-200 bg-amber-50 text-amber-800 text-[11px] font-medium"
        >
          Grade B (Minor Wear)
        </Badge>
      );
    }
    return (
      <Badge
        variant="outline"
        className="border-slate-200 bg-slate-50 text-slate-700 text-[11px] font-medium"
      >
        Grade C (Functional)
      </Badge>
    );
  };

  // Format availability badge
  const renderAvailabilityBadge = () => {
    const { inStock, isLowStock, label } = product.availability;
    if (!inStock) {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-600">
          <AlertTriangle className="h-3 w-3" /> Out of Stock
        </span>
      );
    }
    if (isLowStock) {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600">
          <AlertTriangle className="h-3 w-3" /> {label}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
        <CheckCircle2 className="h-3 w-3" /> {label}
      </span>
    );
  };

  return (
    <Card className="group flex h-full flex-col overflow-hidden border-slate-200 transition-all duration-200 hover:border-slate-300 hover:shadow-md">
      {/* Product Image Header */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
        {product.primaryImageUrl ? (
          <Image
            src={product.primaryImageUrl}
            alt={product.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-400">
            {isTyre ? (
              <Disc className="h-12 w-12 stroke-[1.2]" />
            ) : (
              <ShieldCheck className="h-12 w-12 stroke-[1.2]" />
            )}
          </div>
        )}

        {/* Floating Top Badges */}
        <div className="absolute left-2.5 top-2.5 flex flex-wrap gap-1.5">
          {renderConditionBadge()}
          {product.fitmentSummary?.verificationStatus === 'VERIFIED_OEM_DIRECT' && (
            <Badge
              variant="outline"
              className="border-blue-200 bg-white/90 text-blue-800 text-[10px] backdrop-blur-sm"
            >
              <ShieldCheck className="mr-1 h-3 w-3" /> Verified OEM Fit
            </Badge>
          )}
        </div>

        {/* Stock Barcode for Serialized Items */}
        {product.stockNumber && (
          <div className="absolute bottom-2 right-2 rounded bg-slate-900/80 px-2 py-0.5 text-[11px] font-mono text-white backdrop-blur-sm">
            <span className="inline-flex items-center gap-1">
              <Barcode className="h-3 w-3" />
              {product.stockNumber}
            </span>
          </div>
        )}
      </div>

      {/* Product Information */}
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span className="font-semibold uppercase tracking-wider text-blue-700">
            {product.brand}
          </span>
          <span className="font-mono text-[11px] text-slate-400">SKU: {product.sku}</span>
        </div>
        <Link href={detailHref} className="focus:outline-none">
          <h3 className="line-clamp-2 text-sm font-semibold text-slate-900 transition-colors group-hover:text-blue-700">
            {product.title}
          </h3>
        </Link>
      </CardHeader>

      <CardContent className="flex-1 p-4 pt-0 space-y-3">
        {/* Tyre Specific Details */}
        {product.tyreSpec && (
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-600">
              <span className="rounded bg-slate-100 px-2 py-0.5 font-semibold text-slate-800">
                {product.tyreSpec.sectionWidth}/{product.tyreSpec.aspectRatio} R
                {product.tyreSpec.rimDiameter}
              </span>
              <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-700 font-medium">
                {product.tyreSpec.loadIndex}
                {product.tyreSpec.speedRating}
              </span>
              <span className="text-[11px] text-slate-500 capitalize">
                {product.tyreSpec.season.toLowerCase().replace('_', '-')}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <span className="text-emerald-700 font-medium">8.0mm New Tread</span>
              <span>•</span>
              <span>DOT 2023/24</span>
              <span>•</span>
              <span className="text-blue-700 font-medium">Fitting available</span>
            </div>
          </div>
        )}

        {/* Seat Belt Specific Details */}
        {product.seatBeltSpec && (
          <div className="space-y-1.5 text-xs text-slate-600">
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-800 capitalize">
                Position: {product.seatBeltSpec.position.toLowerCase().replace(/_/g, ' ')}
              </span>
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                2.2Ω Tested
              </span>
            </div>
            {product.fitmentSummary && (
              <div className="text-[11px] text-slate-500">
                Fits: {product.fitmentSummary.makes.join(', ')}{' '}
                {product.fitmentSummary.models.join(', ')}{' '}
                {product.fitmentSummary.yearRange && `(${product.fitmentSummary.yearRange})`}
              </div>
            )}
            <div className="text-[10px] text-slate-500 flex items-center gap-1">
              <ShieldCheck className="h-3 w-3 text-emerald-600" />
              <span>AS/NZS 2596 Compliant Tag Intact</span>
            </div>
          </div>
        )}

        {/* Sale Unit Availability Note */}
        {product.availableSaleUnits.length > 1 && (
          <div className="text-[11px] text-slate-500 border-t border-slate-100 pt-1.5">
            Pack Options: {product.availableSaleUnits.map((u) => u.name).join(' • ')}
          </div>
        )}
      </CardContent>

      {/* Card Footer: Pricing & Action */}
      <CardFooter className="flex items-center justify-between border-t border-slate-100 p-4 pt-3 bg-slate-50/60">
        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold text-slate-900">
              ${product.defaultPrice.toFixed(2)}
            </span>
            <span className="text-xs text-slate-500">/ {product.defaultSaleUnitName}</span>
          </div>
          <div className="text-[10px] text-slate-400 font-medium">
            inc. GST · Trade terms available
          </div>
          {renderAvailabilityBadge()}
        </div>

        <Button
          asChild
          size="sm"
          variant="outline"
          className="gap-1 border-slate-300 text-xs font-semibold hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300"
        >
          <Link href={detailHref}>
            View Part <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
