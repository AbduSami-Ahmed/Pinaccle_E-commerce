'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Disc, ShieldCheck, CheckCircle2, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StorefrontProductSummaryDto } from '@pinnacle/contracts';

export interface ProductCardProps {
  product: StorefrontProductSummaryDto;
}

export function ProductCard({ product }: ProductCardProps) {
  const [imgError, setImgError] = React.useState(false);
  const isTyre = product.categorySlug === 'tyres' || product.productType === 'BULK_QUANTITY';
  const detailHref = isTyre ? `/tyres/${product.slug}` : `/seat-belts/${product.slug}`;

  // Condition Badge (Clean & Subtle)
  const renderConditionBadge = () => {
    if (product.condition === 'NEW_SURPLUS') {
      return (
        <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-200">
          Brand New
        </span>
      );
    }
    if (product.condition === 'GRADE_A_LIKE_NEW') {
      return (
        <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-800 border border-blue-200">
          Grade A
        </span>
      );
    }
    return (
      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700 border border-slate-200">
        Tested Grade B
      </span>
    );
  };

  const priceExGst = (product.defaultPrice / 1.15).toFixed(2);

  return (
    <Card className="group flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition-all duration-200 hover:border-slate-300 hover:shadow-md">
      {/* Product Image Header */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-50 border-b border-slate-100">
        {!imgError && product.primaryImageUrl ? (
          <Image
            src={product.primaryImageUrl}
            alt={product.title}
            fill
            unoptimized
            onError={() => setImgError(true)}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition-transform duration-300 group-hover:scale-103"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-50 text-slate-300">
            {isTyre ? (
              <Disc className="h-16 w-16 stroke-[1.2]" />
            ) : (
              <ShieldCheck className="h-16 w-16 stroke-[1.2]" />
            )}
          </div>
        )}

        {/* Clean Condition Badge Top Left */}
        <div className="absolute left-3 top-3 flex gap-1.5">
          {renderConditionBadge()}
        </div>

        {/* Stock / Serialized Tag */}
        {product.stockNumber && (
          <div className="absolute bottom-2.5 right-2.5 rounded bg-slate-900/80 px-2 py-0.5 text-[10px] font-mono font-medium text-white">
            {product.stockNumber}
          </div>
        )}
      </div>

      {/* Product Content */}
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
          <span className="font-bold uppercase tracking-wider text-blue-700 text-[11px]">
            {product.brand}
          </span>
          <span className="font-mono text-[11px] text-slate-400">SKU: {product.sku}</span>
        </div>
        <Link href={detailHref} className="focus:outline-none">
          <h3 className="line-clamp-2 text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors leading-snug">
            {product.title}
          </h3>
        </Link>
      </CardHeader>

      <CardContent className="flex-1 p-4 pt-0 space-y-2.5">
        {/* Tyre Specific Details */}
        {product.tyreSpec && (
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="rounded bg-slate-100 px-2 py-0.5 font-bold font-mono text-slate-800">
                {product.tyreSpec.sectionWidth}/{product.tyreSpec.aspectRatio} R
                {product.tyreSpec.rimDiameter}
              </span>
              <span className="text-slate-500 text-xs">
                {product.tyreSpec.loadIndex}{product.tyreSpec.speedRating}
              </span>
            </div>
            <p className="text-[11px] text-emerald-700 font-semibold">
              8.0mm Factory Tread · Fresh DOT Date Code
            </p>
          </div>
        )}

        {/* Seat Belt Specific Details */}
        {product.seatBeltSpec && (
          <div className="space-y-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-700 capitalize">
                Position: {product.seatBeltSpec.position.toLowerCase().replace(/_/g, ' ')}
              </span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                2.2Ω Tested OK
              </span>
            </div>
            {product.fitmentSummary && (
              <p className="text-[11px] text-slate-500 line-clamp-1">
                Fits: {product.fitmentSummary.makes.join(', ')} {product.fitmentSummary.models.join(', ')}
              </p>
            )}
          </div>
        )}

        {/* Availability Status */}
        <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-medium pt-1">
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>In Stock · Penrose Depot Dispatch</span>
        </div>
      </CardContent>

      {/* Card Footer: Pricing & Action */}
      <CardFooter className="flex items-center justify-between border-t border-slate-100 p-4 pt-3 bg-slate-50/50">
        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-extrabold text-slate-900">
              ${product.defaultPrice.toFixed(2)}
            </span>
            <span className="text-xs text-slate-500">/ {product.defaultSaleUnitName}</span>
          </div>
          <div className="text-[10px] text-slate-400 font-medium">
            inc. GST (${priceExGst} ex. GST)
          </div>
        </div>

        <Button
          asChild
          size="sm"
          className="h-8 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs gap-1"
        >
          <Link href={detailHref}>
            <span>View Part</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
