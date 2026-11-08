import * as React from 'react';
import Link from 'next/link';
import { Disc, ShieldCheck, Truck, ArrowRight, Layers } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GlobalSearchBar } from '@/components/storefront/global-search-bar';
import { ProductCard } from '@/components/storefront/product-card';
import { VehicleFinderWidget } from '@/components/storefront/vehicle-finder-widget';
import { fetchStorefrontProducts } from '@/lib/storefront';

export const metadata = {
  title: 'Pinnacle Auto Spares & Tyres — Trade Tyres & Tested Seat Belts (Penrose, Auckland)',
  description:
    'Registered New Zealand motor vehicle trader and direct tyre importer. Supplying mechanics, panel shops, and trade fleets with verified tyres and AS/NZS tested replacement seat belts. Orders before 2pm NZST dispatch same day.',
  alternates: {
    canonical: '/',
  },
};

export default async function StorefrontHomePage() {
  const [tyresRes, seatBeltsRes] = await Promise.all([
    fetchStorefrontProducts({ categorySlug: 'tyres', pageSize: 3 }),
    fetchStorefrontProducts({ categorySlug: 'seat-belts', pageSize: 3 }),
  ]);

  return (
    <div className="space-y-16 pb-20">
      {/* Hero Section */}
      <section className="border-b border-slate-200 bg-gradient-to-b from-slate-50 to-white py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50/90 px-3 py-1 text-xs font-semibold text-blue-900 shadow-xs">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Registered Motor Vehicle Trader · Penrose Hub Pickup (Auckland 1061)</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-5xl leading-tight">
              Direct Trade Tyres & Bench-Tested Seat Belts
            </h1>
            <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
              We supply workshops, panel beaters, and fleet operators with verified fitment parts.
              Every seat belt is individually multimeter-tested for pretensioner circuit resistance
              (2.1–2.4Ω) and mechanical lock. Fresh tyre stock with verified DOT date codes.
            </p>

            {/* Global Search Bar */}
            <div className="mt-8 max-w-2xl">
              <GlobalSearchBar />

              {/* Popular Search Shortcuts */}
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="font-semibold text-slate-700">Popular Searches:</span>
                <Link
                  href="/tyres?sectionWidth=205&aspectRatio=55&rimDiameter=16"
                  className="rounded-full bg-white px-2.5 py-1 border border-slate-200 text-slate-700 hover:text-blue-700 hover:border-blue-300 shadow-xs"
                >
                  205/55 R16 (Corolla / i30)
                </Link>
                <Link
                  href="/tyres?sectionWidth=225&aspectRatio=45&rimDiameter=17"
                  className="rounded-full bg-white px-2.5 py-1 border border-slate-200 text-slate-700 hover:text-blue-700 hover:border-blue-300 shadow-xs"
                >
                  225/45 R17 (Golf / Audi / 3-Series)
                </Link>
                <Link
                  href="/seat-belts?make=Ford&model=Transit+Custom"
                  className="rounded-full bg-white px-2.5 py-1 border border-slate-200 text-slate-700 hover:text-blue-700 hover:border-blue-300 shadow-xs"
                >
                  Ford Transit Driver Belt
                </Link>
                <Link
                  href="/seat-belts?make=Toyota&model=RAV4"
                  className="rounded-full bg-white px-2.5 py-1 border border-slate-200 text-slate-700 hover:text-blue-700 hover:border-blue-300 shadow-xs"
                >
                  Toyota RAV4 Front Passenger
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Vehicle Fitment Finder Section */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">
        <VehicleFinderWidget />
      </section>

      {/* Core Departments */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              Warehouse Departments
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Live warehouse inventory ready for immediate trade counter pickup or courier dispatch.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Category Card 1: Tyres */}
          <Link href="/tyres" className="group">
            <Card className="h-full border-slate-200 transition-all duration-200 hover:border-blue-300 hover:shadow-md">
              <CardHeader className="flex flex-row items-center gap-4 pb-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Disc className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-xl group-hover:text-blue-700 transition-colors">
                    Commercial & Passenger Tyres
                  </CardTitle>
                  <CardDescription>
                    Direct importer pricing · Available as Singles, Pairs (2), or Full Sets (4)
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-1">
                <p className="text-sm text-slate-600">
                  Direct stock from Michelin, Continental, Goodyear, and Pirelli. Fresh DOT date
                  codes, full factory tread, and E-mark approval. On-site fitting & balancing
                  available for $25/corner at our Penrose bays.
                </p>
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-xs font-semibold text-blue-700 group-hover:translate-x-1 transition-transform">
                  Search Tyre Inventory <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Category Card 2: Seat Belts */}
          <Link href="/seat-belts" className="group">
            <Card className="h-full border-slate-200 transition-all duration-200 hover:border-amber-300 hover:shadow-md">
              <CardHeader className="flex flex-row items-center gap-4 pb-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-xl group-hover:text-amber-700 transition-colors">
                    Tested Seat Belts & Restraints
                  </CardTitle>
                  <CardDescription>
                    Individually serialized safety assemblies · Bench-tested & compliance-checked
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-1">
                <p className="text-sm text-slate-600">
                  Dismantled from low-km donor vehicles. Every retractor and pretensioner undergoes
                  a pyrotechnic circuit resistance test (2.1–2.4Ω) and mechanical lock check. Actual
                  inspection photos and donor VIN recorded.
                </p>
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-xs font-semibold text-amber-700 group-hover:translate-x-1 transition-transform">
                  Search Tested Belts <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </section>

      {/* Featured Tyres Showcase */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Commercial & Fleet Tyres
            </h2>
            <p className="text-xs text-slate-500">
              In-stock in our Sydney depot · Single, pair, or set volume pricing
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="gap-1 text-xs">
            <Link href="/tyres">
              View All Tyres <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {tyresRes.data.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* Featured Serialized Seat Belts Showcase */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Bench-Tested Seat Belts (In-Stock)
            </h2>
            <p className="text-xs text-slate-500">
              Barcoded safety assemblies with resistance test & donor VIN records
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="gap-1 text-xs">
            <Link href="/seat-belts">
              View All Seat Belts <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {seatBeltsRes.data.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* Trade Principles & Workshop Standards Strip */}
      <section className="border-y border-slate-200 bg-slate-50 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">AS/NZS 2596 Restraint Testing</h3>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                  Every seat belt retractor and pretensioner squib is bench-tested with digital
                  multimeter (2.1–2.4Ω) and tension-checked before barcoding. No untested safety
                  parts leave our warehouse.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-800">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Actual Photos & Donor VIN</h3>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                  The photos you see are of the exact physical part on our shelf, showing OEM
                  stamping tags, webbing condition, and donor vehicle details.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  2 PM Same-Day Dispatch & Pickup
                </h3>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                  Orders placed by 2:00 PM NZST dispatch same day via CourierPost or Mainfreight express.
                  30-minute click & collect available from our Penrose Auckland trade counter.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
