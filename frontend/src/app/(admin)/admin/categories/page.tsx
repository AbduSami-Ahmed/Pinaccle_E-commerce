'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminCategoriesPage() {
  const categories = [
    {
      id: 'cat-tyres',
      name: 'Commercial & Passenger Tyres',
      slug: 'tyres',
      description:
        'Commodity pneumatic tyres sold from bulk warehouse inventory in single, pair (2x), and vehicle set (4x) sale units.',
      activeProducts: 10,
      productType: 'BULK_QUANTITY',
      saleUnits: ['Single Tyre (1x)', 'Pair (2x)', 'Vehicle Set (4x)'],
      mandatorySpecs: [
        'Section Width (mm)',
        'Aspect Ratio (%)',
        'Rim Diameter (inches)',
        'Load Index',
        'Speed Rating',
        'Season / Terrain Type',
        'Run Flat Capability',
      ],
    },
    {
      id: 'cat-seatbelts',
      name: 'Seat Belts & Safety Harnesses',
      slug: 'seat-belts',
      description:
        'Individually inspected and serialized second-hand safety components, retractors, buckles, and stalks compliant with New Zealand WOF / Land Transport vehicle safety standards.',
      activeProducts: 6,
      productType: 'INDIVIDUALLY_SERIALIZED',
      saleUnits: ['Individual Serialized Unit (1x)'],
      mandatorySpecs: [
        'Vehicle Position (Front Left, Front Right, Rear Centre, etc.)',
        'Component Type (3-Point Retractor, Stalk, Buckle)',
        'Pretensioner Pyrotechnic Status (Active / Non-Deployed)',
        'Physical Condition Grade (A / B / C)',
        'Fitment Verification Reference',
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Category Architecture & Schemas
            </h1>
            <Badge variant="outline" className="font-mono text-xs">
              Domain Specifications
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Category hierarchies, inventory modality configuration, and required technical specification schemas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild size="sm" className="h-8 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700">
            <Link href="/admin/products/new">
              <Plus className="h-3.5 w-3.5" />
              Add Product to Category
            </Link>
          </Button>
        </div>
      </div>

      {/* Categories Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {categories.map((cat) => (
          <Card key={cat.id} className="border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                      {cat.slug === 'tyres' ? 'TY' : 'SB'}
                    </div>
                    <div>
                      <CardTitle className="text-sm font-bold text-slate-900">
                        {cat.name}
                      </CardTitle>
                      <span className="font-mono text-[10px] text-slate-400">slug: /{cat.slug}</span>
                    </div>
                  </div>

                  <Badge variant={cat.productType === 'BULK_QUANTITY' ? 'default' : 'outline'} className="text-[10px]">
                    {cat.productType === 'BULK_QUANTITY' ? 'Bulk Inventory' : 'Serialized Parts'}
                  </Badge>
                </div>
                <CardDescription className="text-xs mt-2 leading-relaxed text-slate-600">
                  {cat.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4 text-xs">
                {/* Sale Unit Multipliers */}
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
                  <span className="font-semibold text-slate-700 uppercase tracking-wider text-[10px] block">
                    Supported Sale Units (Base Stock Multipliers):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {cat.saleUnits.map((su) => (
                      <span key={su} className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 font-mono text-[10px]">
                        {su}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Mandatory Specifications */}
                <div>
                  <span className="font-semibold text-slate-700 uppercase tracking-wider text-[10px] block mb-2">
                    Enforced Attribute Schema ({cat.mandatorySpecs.length} fields):
                  </span>
                  <ul className="space-y-1">
                    {cat.mandatorySpecs.map((spec) => (
                      <li key={spec} className="flex items-center gap-2 text-slate-600 text-[11px]">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                        <span>{spec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/50 rounded-b-lg flex items-center justify-between text-xs">
              <span className="font-mono font-semibold text-slate-700">
                {cat.activeProducts} published catalogue items
              </span>
              <Button asChild variant="outline" size="sm" className="h-7 text-xs">
                <Link href={`/admin/products?category=${cat.slug}`}>
                  Browse Catalogue &rarr;
                </Link>
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
