'use client';

import * as React from 'react';
import Link from 'next/link';
import { Disc, ShoppingCart, SlidersHorizontal } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DemoTyre {
  id: string;
  slug: string;
  brand: string;
  model: string;
  spec: string;
  width: number;
  aspect: number;
  rim: number;
  priceSingle: number;
  season: string;
  fitmentBadge: string;
}

// DEMO DATA
const demoTyres: DemoTyre[] = [
  {
    id: 'tyre-1',
    slug: 'michelin-pilot-sport-4',
    brand: 'Michelin',
    model: 'Pilot Sport 4',
    spec: '225/45 R17 94Y XL',
    width: 225,
    aspect: 45,
    rim: 17,
    priceSingle: 145.0,
    season: 'Summer',
    fitmentBadge: 'Verified Fit',
  },
  {
    id: 'tyre-2',
    slug: 'continental-premiumcontact-6',
    brand: 'Continental',
    model: 'PremiumContact 6',
    spec: '205/55 R16 91V',
    width: 205,
    aspect: 55,
    rim: 16,
    priceSingle: 112.5,
    season: 'All-Season',
    fitmentBadge: 'Verified Fit',
  },
  {
    id: 'tyre-3',
    slug: 'goodyear-eagle-f1-asymmetric-5',
    brand: 'Goodyear',
    model: 'Eagle F1 Asymmetric 5',
    spec: '225/40 R18 92Y XL',
    width: 225,
    aspect: 40,
    rim: 18,
    priceSingle: 138.0,
    season: 'Summer',
    fitmentBadge: 'High Performance',
  },
  {
    id: 'tyre-4',
    slug: 'pirelli-cinturato-p7',
    brand: 'Pirelli',
    model: 'Cinturato P7 (P7C2)',
    spec: '215/55 R17 94W',
    width: 215,
    aspect: 55,
    rim: 17,
    priceSingle: 128.0,
    season: 'Summer',
    fitmentBadge: 'Verified Fit',
  },
  {
    id: 'tyre-5',
    slug: 'bridgestone-turanza-t005',
    brand: 'Bridgestone',
    model: 'Turanza T005',
    spec: '195/65 R15 91H',
    width: 195,
    aspect: 65,
    rim: 15,
    priceSingle: 95.0,
    season: 'Touring',
    fitmentBadge: 'Standard Fit',
  },
  {
    id: 'tyre-6',
    slug: 'dunlop-sport-maxx-rt2',
    brand: 'Dunlop',
    model: 'Sport Maxx RT2',
    spec: '245/40 R18 97Y XL',
    width: 245,
    aspect: 40,
    rim: 18,
    priceSingle: 152.0,
    season: 'Ultra High Performance',
    fitmentBadge: 'Performance Fit',
  },
];

export default function TyresCataloguePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Tyres Catalogue
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Commercial & passenger radial tyres available as Single, Pair, or Full Axle Set (4).
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-4">
        {/* Filter Sidebar (Static Options) */}
        <aside className="space-y-6 lg:col-span-1">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-slate-500" />
                <h2 className="text-sm font-semibold text-slate-900">Dimension Filters</h2>
              </div>
              <button type="button" className="text-xs text-blue-700 hover:underline">
                Reset
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {/* Width Select */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700">Tyre Width (mm)</label>
                <Select defaultValue="all">
                  <SelectTrigger>
                    <SelectValue placeholder="All Widths" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Widths</SelectItem>
                    <SelectItem value="195">195 mm</SelectItem>
                    <SelectItem value="205">205 mm</SelectItem>
                    <SelectItem value="215">215 mm</SelectItem>
                    <SelectItem value="225">225 mm</SelectItem>
                    <SelectItem value="245">245 mm</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Aspect Ratio Select */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700">Aspect Ratio (%)</label>
                <Select defaultValue="all">
                  <SelectTrigger>
                    <SelectValue placeholder="All Aspect Ratios" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Aspect Ratios</SelectItem>
                    <SelectItem value="40">40</SelectItem>
                    <SelectItem value="45">45</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="55">55</SelectItem>
                    <SelectItem value="65">65</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Rim Diameter Select */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700">Rim Diameter (inches)</label>
                <Select defaultValue="all">
                  <SelectTrigger>
                    <SelectValue placeholder="All Rim Sizes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Rim Sizes</SelectItem>
                    <SelectItem value="15">15&quot;</SelectItem>
                    <SelectItem value="16">16&quot;</SelectItem>
                    <SelectItem value="17">17&quot;</SelectItem>
                    <SelectItem value="18">18&quot;</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Season Select */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700">Application / Season</label>
                <Select defaultValue="all">
                  <SelectTrigger>
                    <SelectValue placeholder="All Applications" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Applications</SelectItem>
                    <SelectItem value="summer">Summer Performance</SelectItem>
                    <SelectItem value="allseason">All-Season Commercial</SelectItem>
                    <SelectItem value="touring">Touring Long-Wear</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4 text-xs text-blue-900">
            <p className="font-semibold">Direct Multiplier Pricing</p>
            <p className="mt-1 text-slate-600">
              Select single tyre, pair (2x), or full set (4x) directly on the product card or detail
              page.
            </p>
          </div>
        </aside>

        {/* Product Grid Area */}
        <section className="space-y-6 lg:col-span-3">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Showing 6 verified tyres (DEMO DATA)</span>
            <span>Sorted by Popularity</span>
          </div>

          {/* DEMO DATA */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {demoTyres.map((tyre) => (
              <Card key={tyre.id} className="flex flex-col justify-between overflow-hidden">
                <div>
                  {/* Image Placeholder */}
                  <div className="relative flex aspect-video w-full items-center justify-center bg-slate-100 text-slate-400 border-b border-slate-100">
                    <Disc className="h-10 w-10 text-slate-300" />
                    <span className="absolute bottom-2 right-2 rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-mono text-slate-600">
                      R{tyre.rim}
                    </span>
                  </div>

                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        {tyre.brand}
                      </span>
                      <Badge variant="success" className="text-[10px] px-2 py-0">
                        {tyre.fitmentBadge}
                      </Badge>
                    </div>
                    <CardTitle className="text-base leading-snug">
                      <Link
                        href={`/tyres/${tyre.slug}`}
                        className="hover:text-blue-700 transition-colors"
                      >
                        {tyre.model}
                      </Link>
                    </CardTitle>
                    <p className="font-mono text-xs font-semibold text-blue-800">{tyre.spec}</p>
                  </CardHeader>

                  <CardContent className="p-4 pt-1 space-y-3">
                    {/* Sale Unit Options Pills */}
                    <div className="space-y-1">
                      <span className="text-[11px] text-slate-500 font-medium">
                        Sale Unit Multipliers:
                      </span>
                      <div className="grid grid-cols-3 gap-1 text-[11px] text-center font-medium">
                        <div className="rounded border border-blue-700 bg-blue-50 py-1 text-blue-700">
                          Single
                        </div>
                        <div className="rounded border border-slate-200 bg-slate-50 py-1 text-slate-600">
                          Pair (x2)
                        </div>
                        <div className="rounded border border-slate-200 bg-slate-50 py-1 text-slate-600">
                          Set (x4)
                        </div>
                      </div>
                    </div>

                    <div className="pt-1">
                      <span className="text-xs text-slate-500">From</span>
                      <div className="text-xl font-bold text-slate-900">
                        ${tyre.priceSingle.toFixed(2)}{' '}
                        <span className="text-xs font-normal text-slate-500">/ single</span>
                      </div>
                    </div>
                  </CardContent>
                </div>

                <CardFooter className="p-4 pt-0">
                  <Button type="button" className="w-full gap-2 text-xs" onClick={() => {}}>
                    <ShoppingCart className="h-3.5 w-3.5" />
                    <span>Add to Cart</span>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          <div className="pt-6 border-t border-slate-200">
            <Pagination currentPage={1} totalPages={3} onPageChange={() => {}} />
          </div>
        </section>
      </div>
    </div>
  );
}
