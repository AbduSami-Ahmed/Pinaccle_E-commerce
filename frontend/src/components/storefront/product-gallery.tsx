'use client';

import * as React from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Maximize2, PackageCheck, Tag, Wrench } from 'lucide-react';
import { ProductMediaItemDto } from '@pinnacle/contracts';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export interface ProductGalleryProps {
  images: ProductMediaItemDto[];
  productTitle: string;
  condition?: string;
  stockBarcode?: string;
  isInspected?: boolean;
}

export function ProductGallery({
  images,
  productTitle,
  condition,
  stockBarcode,
  isInspected,
}: ProductGalleryProps) {
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [lightboxOpen, setLightboxOpen] = React.useState(false);
  const [lightboxIndex, setLightboxIndex] = React.useState(0);

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const nextLightboxImage = () => {
    setLightboxIndex((prev) => (prev + 1) % images.length);
  };

  const prevLightboxImage = () => {
    setLightboxIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  if (!images || images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center aspect-[4/3] w-full rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
        <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
          <Wrench className="h-8 w-8 stroke-[1.5]" />
        </div>
        <h3 className="text-sm font-semibold text-slate-800">No Workshop Photos Logged</h3>
        <p className="mt-1 max-w-sm text-xs text-slate-500">
          Individual high-resolution photos are being catalogued during intake. Contact our Prestons
          trade counter for physical inspection.
        </p>
        {stockBarcode && (
          <div className="mt-3 font-mono text-[11px] text-slate-400 bg-white px-2 py-1 rounded border border-slate-200">
            Stock ID: {stockBarcode}
          </div>
        )}
      </div>
    );
  }

  const activeImage = images[selectedIndex] ?? images[0]!;

  return (
    <div className="space-y-3">
      {/* Main Image Container */}
      <div className="group relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-900 shadow-xs">
        <Image
          src={activeImage.cdnUrl}
          alt={activeImage.altText || productTitle}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 55vw"
          className="object-cover transition-transform duration-300 group-hover:scale-[1.02] cursor-zoom-in"
          onClick={() => openLightbox(selectedIndex)}
        />

        {/* Top Badges */}
        <div className="absolute left-3 top-3 flex flex-wrap gap-2 pointer-events-none">
          {condition && (
            <Badge
              variant="outline"
              className="border-slate-300 bg-white/95 text-slate-800 text-xs font-semibold backdrop-blur-sm shadow-xs uppercase tracking-wide"
            >
              {condition.replace(/_/g, ' ')}
            </Badge>
          )}
          {isInspected && (
            <Badge
              variant="outline"
              className="border-emerald-300 bg-emerald-900/90 text-emerald-100 text-xs font-medium backdrop-blur-sm shadow-xs"
            >
              <PackageCheck className="mr-1 h-3.5 w-3.5 text-emerald-400" /> Inspected Part
            </Badge>
          )}
        </div>

        {/* Barcode Tag */}
        {stockBarcode && (
          <div className="absolute bottom-3 right-3 rounded bg-slate-950/85 px-2.5 py-1 text-xs font-mono text-slate-200 backdrop-blur-sm border border-slate-700/60 shadow-sm pointer-events-none">
            <span className="inline-flex items-center gap-1.5">
              <Tag className="h-3 w-3 text-amber-400" />
              {stockBarcode}
            </span>
          </div>
        )}

        {/* Lightbox / Zoom hint */}
        <button
          type="button"
          onClick={() => openLightbox(selectedIndex)}
          aria-label="Enlarge image"
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-slate-900/75 text-white backdrop-blur-sm opacity-90 transition-opacity hover:opacity-100 hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-white"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>

      {/* Thumbnail Strip */}
      {images.length > 1 && (
        <div className="flex gap-2.5 overflow-x-auto pb-1 pt-0.5">
          {images.map((img, idx) => {
            const isSelected = idx === selectedIndex;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedIndex(idx)}
                className={cn(
                  'relative h-20 w-24 shrink-0 overflow-hidden rounded-lg border-2 transition-all bg-slate-100 focus:outline-none',
                  isSelected
                    ? 'border-blue-600 ring-2 ring-blue-600/30 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 opacity-80 hover:opacity-100',
                )}
                aria-label={`View photo ${idx + 1} of ${images.length}`}
              >
                <Image
                  src={img.cdnUrl}
                  alt={img.altText || `Thumbnail ${idx + 1}`}
                  fill
                  sizes="96px"
                  className="object-cover"
                />
              </button>
            );
          })}
        </div>
      )}

      {/* Lightbox Dialog Modal */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-4xl p-2 bg-slate-950 border-slate-800 text-white sm:rounded-xl">
          <div className="flex items-center justify-between px-4 py-2 text-xs text-slate-400 border-b border-slate-800">
            <DialogTitle className="text-sm font-semibold text-slate-200 truncate pr-4">
              {productTitle}
            </DialogTitle>
            <div className="shrink-0 font-mono text-[11px] text-slate-400">
              Photo {lightboxIndex + 1} of {images.length}
            </div>
          </div>

          <div className="relative aspect-[16/10] w-full overflow-hidden bg-black flex items-center justify-center">
            {images[lightboxIndex] && (
              <Image
                src={images[lightboxIndex].cdnUrl}
                alt={images[lightboxIndex].altText || productTitle}
                fill
                sizes="(max-width: 1200px) 100vw, 1000px"
                className="object-contain"
              />
            )}

            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={prevLightboxImage}
                  aria-label="Previous photo"
                  className="absolute left-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-slate-900/80 text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-white transition-colors"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  onClick={nextLightboxImage}
                  aria-label="Next photo"
                  className="absolute right-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-slate-900/80 text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-white transition-colors"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}
          </div>

          <div className="px-4 py-2 text-xs text-slate-300 flex items-center justify-between">
            <span className="truncate">
              {images[lightboxIndex]?.altText || 'Workshop catalog photograph'}
            </span>
            {stockBarcode && (
              <span className="font-mono text-[11px] text-amber-400 shrink-0 ml-2">
                Barcode: {stockBarcode}
              </span>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
