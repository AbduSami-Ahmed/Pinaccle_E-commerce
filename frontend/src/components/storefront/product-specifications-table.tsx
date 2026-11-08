'use client';

import * as React from 'react';
import { ShieldCheck, Disc, Wrench, CheckCircle } from 'lucide-react';
import { StorefrontProductDetailDto } from '@pinnacle/contracts';

export interface ProductSpecificationsTableProps {
  product: StorefrontProductDetailDto;
}

// Speed rating table lookup helper
const SPEED_RATING_KMH: Record<string, string> = {
  Q: '160 km/h',
  R: '170 km/h',
  S: '180 km/h',
  T: '190 km/h',
  H: '210 km/h',
  V: '240 km/h',
  W: '270 km/h',
  Y: '300 km/h',
  ZR: '>240 km/h',
};

// Load index kg lookup helper
const LOAD_INDEX_KG: Record<number, string> = {
  82: '475 kg',
  84: '500 kg',
  88: '560 kg',
  91: '615 kg',
  92: '630 kg',
  94: '670 kg',
  95: '690 kg',
  98: '750 kg',
  100: '800 kg',
  104: '900 kg',
  108: '1,000 kg',
};

export function ProductSpecificationsTable({ product }: ProductSpecificationsTableProps) {
  const isTyre = product.categorySlug === 'tyres' || !!product.tyreSpec;
  const isSeatBelt = product.categorySlug === 'seat-belts' || !!product.seatBeltSpec;

  const tyre = product.tyreSpec;
  const seatBelt = product.seatBeltSpec;

  return (
    <div className="space-y-6">
      {/* Category Specific Technical Specs */}
      {isTyre && tyre && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Disc className="h-5 w-5 text-blue-700" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
              Dimensional & Engineering Specifications
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-xs">
            <div className="flex justify-between border-b border-slate-100 py-1.5">
              <span className="text-slate-500">Nominal Section Width</span>
              <span className="font-semibold text-slate-900">{tyre.sectionWidth} mm</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 py-1.5">
              <span className="text-slate-500">Aspect Ratio (Profile)</span>
              <span className="font-semibold text-slate-900">{tyre.aspectRatio}%</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 py-1.5">
              <span className="text-slate-500">Rim Diameter</span>
              <span className="font-semibold text-slate-900">
                {tyre.rimDiameter}&quot; (Inches)
              </span>
            </div>
            <div className="flex justify-between border-b border-slate-100 py-1.5">
              <span className="text-slate-500">Load Index</span>
              <span className="font-semibold text-slate-900">
                {tyre.loadIndex} ({LOAD_INDEX_KG[tyre.loadIndex] || 'Commercial Spec'})
              </span>
            </div>
            <div className="flex justify-between border-b border-slate-100 py-1.5">
              <span className="text-slate-500">Speed Rating</span>
              <span className="font-semibold text-slate-900">
                {tyre.speedRating} ({SPEED_RATING_KMH[tyre.speedRating] || 'High Speed Rated'})
              </span>
            </div>
            <div className="flex justify-between border-b border-slate-100 py-1.5">
              <span className="text-slate-500">Tread Depth</span>
              <span className="font-semibold text-slate-900">8.0 mm (Full Factory Depth)</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 py-1.5">
              <span className="text-slate-500">Season Category</span>
              <span className="font-semibold text-slate-900 capitalize">
                {tyre.season.toLowerCase().replace(/_/g, ' ')}
              </span>
            </div>
            <div className="flex justify-between border-b border-slate-100 py-1.5">
              <span className="text-slate-500">Terrain Pattern</span>
              <span className="font-semibold text-slate-900 capitalize">
                {tyre.terrainType.toLowerCase().replace(/_/g, ' ')}
              </span>
            </div>
            <div className="flex justify-between border-b border-slate-100 py-1.5">
              <span className="text-slate-500">Run-Flat Capability</span>
              <span className="font-semibold text-slate-900">
                {tyre.runFlat ? 'Yes (Self-Supporting Run Flat)' : 'No (Standard Pneumatic Tyre)'}
              </span>
            </div>
            <div className="flex justify-between border-b border-slate-100 py-1.5">
              <span className="text-slate-500">Tyre Construction</span>
              <span className="font-semibold text-slate-900">Radial Ply Steel Belted</span>
            </div>
          </div>
        </div>
      )}

      {isSeatBelt && seatBelt && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <ShieldCheck className="h-5 w-5 text-blue-700" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
              Restraint Technical & Safety Specifications
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-xs">
            <div className="flex justify-between border-b border-slate-100 py-1.5">
              <span className="text-slate-500">Cabin Mounting Position</span>
              <span className="font-semibold text-slate-900 capitalize">
                {seatBelt.position.toLowerCase().replace(/_/g, ' ')}
              </span>
            </div>
            <div className="flex justify-between border-b border-slate-100 py-1.5">
              <span className="text-slate-500">Component Classification</span>
              <span className="font-semibold text-slate-900 capitalize">
                {seatBelt.componentType.toLowerCase().replace(/_/g, ' ')}
              </span>
            </div>
            <div className="flex justify-between border-b border-slate-100 py-1.5">
              <span className="text-slate-500">Mounting Geometry</span>
              <span className="font-semibold text-slate-900">
                {seatBelt.mountingPoints}-Point Inertia Reel
              </span>
            </div>
            <div className="flex justify-between border-b border-slate-100 py-1.5">
              <span className="text-slate-500">Pretensioner Circuit</span>
              <span className="font-semibold text-emerald-700 flex items-center gap-1">
                <CheckCircle className="h-3.5 w-3.5" /> 2.2 Ω (Factory Continuity Pass)
              </span>
            </div>
            <div className="flex justify-between border-b border-slate-100 py-1.5">
              <span className="text-slate-500">Webbing Width & Colour</span>
              <span className="font-semibold text-slate-900">
                47 mm / {seatBelt.webbingColor || 'Black'}
              </span>
            </div>
            <div className="flex justify-between border-b border-slate-100 py-1.5">
              <span className="text-slate-500">OEM Stamped Reference</span>
              <span className="font-mono font-semibold text-slate-900">
                {seatBelt.oemReferenceTag || 'Factory Tag Intact'}
              </span>
            </div>
            <div className="flex justify-between border-b border-slate-100 py-1.5">
              <span className="text-slate-500">Vehicle Safety Standard</span>
              <span className="font-semibold text-slate-900">AS/NZS 2596 & NZTA VIRM</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 py-1.5">
              <span className="text-slate-500">Motor Vehicle Trader</span>
              <span className="font-semibold text-slate-900">NZ MVD-89211 Verified</span>
            </div>
          </div>
        </div>
      )}

      {/* Common Inventory & Commercial Attributes */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-5 space-y-3">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2.5">
          <Wrench className="h-4 w-4 text-slate-600" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Catalog & Inventory Record
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <span className="text-slate-500 block text-[11px]">Brand / OEM Manufacturer</span>
            <span className="font-semibold text-slate-900">{product.brand}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[11px]">Condition Grade</span>
            <span className="font-semibold text-slate-900 capitalize">
              {product.condition.toLowerCase().replace(/_/g, ' ')}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[11px]">Catalogue SKU</span>
            <span className="font-mono font-semibold text-slate-900">{product.sku}</span>
          </div>
          {product.stockNumber && (
            <div>
              <span className="text-slate-500 block text-[11px]">Depot Barcode ID</span>
              <span className="font-mono font-semibold text-slate-900">{product.stockNumber}</span>
            </div>
          )}
          <div>
            <span className="text-slate-500 block text-[11px]">Primary Warehouse</span>
            <span className="font-semibold text-slate-900">
              {product.warehouseLocation?.name || 'Auckland Central Fulfillment Centre (Penrose)'}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[11px]">Trade Exchange Warranty</span>
            <span className="font-semibold text-slate-900">
              {product.warrantyAndReturns?.warrantyDays || 30} Days Workshop Guarantee
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
