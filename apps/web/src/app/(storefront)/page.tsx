import * as React from 'react';
import Link from 'next/link';
import {
  Search,
  Disc,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Truck,
  ArrowRight,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function StorefrontHomePage() {
  return (
    <div className="space-y-16 pb-20">
      {/* Hero Section */}
      <section className="border-b border-slate-200 bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <Badge
              variant="outline"
              className="mb-4 text-xs font-semibold uppercase tracking-wider text-blue-700 border-blue-200 bg-blue-50/50"
            >
              Specialist Automotive Catalog
            </Badge>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-5xl leading-tight">
              Commercial-Grade Tyres & Verified Serialized Seat Belts
            </h1>
            <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
              Pinnacle connects automotive workshops, fleets, and individual vehicle owners with
              guaranteed fitment components, direct stock levels, and safety-tested reconditioned
              items.
            </p>

            {/* Hero Search CTA */}
            <div className="mt-8">
              <div className="flex flex-col sm:flex-row gap-3 max-w-xl">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="search"
                    aria-label="Search parts"
                    placeholder="Enter tyre specification or vehicle model..."
                    className="w-full rounded-md border border-slate-300 bg-white px-3.5 py-2.5 pl-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
                  />
                </div>
                <Button type="button" className="h-10 px-6">
                  Search Catalogue
                </Button>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="font-medium">Popular:</span>
                <Link href="/tyres" className="underline hover:text-blue-700">
                  205/55 R16
                </Link>
                <span>&bull;</span>
                <Link href="/tyres" className="underline hover:text-blue-700">
                  225/45 R17
                </Link>
                <span>&bull;</span>
                <Link href="/seat-belts" className="underline hover:text-blue-700">
                  Ford Transit Front Belt
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Shop by Category Section */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Shop by Category</h2>
            <p className="mt-1 text-sm text-slate-500">
              Select an automotive department to browse verified inventories.
            </p>
          </div>
        </div>

        {/* DEMO DATA */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Category Card 1: Tyres */}
          <Link href="/tyres" className="group">
            <Card className="h-full transition-shadow hover:shadow-md border-slate-200">
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 text-blue-700 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Disc className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-xl group-hover:text-blue-700 transition-colors">
                    Tyres & Wheel Assemblies
                  </CardTitle>
                  <CardDescription>
                    Bulk inventory with flexible sale units (Single, Pair, Set of 4)
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Browse passenger, commercial, and performance tyre lines with full EU label
                  ratings, load indexes, speed symbols, and fitment calculators.
                </p>
                <div className="mt-4 flex items-center text-xs font-semibold text-blue-700 group-hover:underline">
                  <span>Explore Tyres</span>
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Category Card 2: Seat Belts */}
          <Link href="/seat-belts" className="group">
            <Card className="h-full transition-shadow hover:shadow-md border-slate-200">
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 text-blue-700 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <ShieldAlert className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-xl group-hover:text-blue-700 transition-colors">
                    Seat Belts & Restraints
                  </CardTitle>
                  <CardDescription>
                    Serialized items with documented test records and condition grades
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Every pre-tensioner and retractor assembly is bench-tested, serial-tracked, and
                  photographed with Grade A or Grade B quality certification.
                </p>
                <div className="mt-4 flex items-center text-xs font-semibold text-blue-700 group-hover:underline">
                  <span>Explore Seat Belts</span>
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </section>

      {/* Why Pinnacle Section */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-slate-200 bg-white p-8 sm:p-12 shadow-sm">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              Why Workshops & Fleets Choose Pinnacle
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Built specifically for mechanical trade fitters, fleet managers, and private
              automotive enthusiasts.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="flex flex-col space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-slate-900">Verified Fitment</h3>
              <p className="text-xs leading-relaxed text-slate-600">
                Zero guesswork: tyre dimensions, load requirements, speed ratings, and seat belt
                vehicle chassis codes are verified against OEM technical sheets.
              </p>
            </div>

            <div className="flex flex-col space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-slate-900">Quality Tested</h3>
              <p className="text-xs leading-relaxed text-slate-600">
                All serialized safety components undergo retractor lock tests, web inspect checks,
                and electrical resistance diagnostics before listing.
              </p>
            </div>

            <div className="flex flex-col space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
                <Truck className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-slate-900">Fast Dispatch</h3>
              <p className="text-xs leading-relaxed text-slate-600">
                All listed products reflect physical warehouse pallet stock or secure serialized
                racking ready for immediate carrier dispatch.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
