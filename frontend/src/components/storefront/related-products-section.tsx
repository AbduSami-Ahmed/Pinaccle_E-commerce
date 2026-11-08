'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Disc, ShieldCheck } from 'lucide-react';
import { RelatedProductDto } from '@pinnacle/contracts';
import { Badge } from '@/components/ui/badge';

export interface RelatedProductsSectionProps {
  relatedProducts: RelatedProductDto[];
}

export function RelatedProductsSection({ relatedProducts }: RelatedProductsSectionProps) {
  if (!relatedProducts || relatedProducts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4 pt-6 border-t border-slate-200">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            Frequently Paired Workshop Parts & Alternatives
          </h3>
          <p className="text-xs text-slate-500">
            Related by axle fitment, companion side assembly, or vehicle cross-compatibility.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {relatedProducts.map((item) => {
          const detailUrl =
            item.categorySlug === 'tyres'
              ? `/tyres/${item.slug}`
              : item.categorySlug === 'seat-belts'
                ? `/seat-belts/${item.slug}`
                : `/products/${item.slug}`;

          return (
            <Link
              key={item.id}
              href={detailUrl}
              className="group flex flex-col rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs transition-all hover:border-slate-300 hover:shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              {/* Image Container */}
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-slate-100 mb-3">
                {item.primaryImageUrl ? (
                  <Image
                    src={item.primaryImageUrl}
                    alt={item.title}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-slate-400">
                    {item.categorySlug === 'tyres' ? (
                      <Disc className="h-10 w-10 stroke-[1]" />
                    ) : (
                      <ShieldCheck className="h-10 w-10 stroke-[1]" />
                    )}
                  </div>
                )}

                {/* Relation Reason Tag */}
                {item.relationReason && (
                  <div className="absolute top-2 left-2">
                    <Badge
                      variant="outline"
                      className="border-blue-200 bg-white/95 text-blue-900 text-[10px] font-semibold backdrop-blur-xs shadow-2xs"
                    >
                      {item.relationReason}
                    </Badge>
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div className="flex-1 flex flex-col justify-between space-y-2">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
                    {item.brand}
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 line-clamp-2 group-hover:text-blue-700 transition-colors">
                    {item.title}
                  </h4>
                  <div className="mt-1 font-mono text-[10px] text-slate-400">SKU: {item.sku}</div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-sm font-extrabold text-slate-900">
                      ${item.defaultPrice.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-slate-500 ml-1">NZD</span>
                  </div>

                  <span className="text-xs font-semibold text-blue-700 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                    View <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
