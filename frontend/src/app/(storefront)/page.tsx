import * as React from 'react';
import Link from 'next/link';
import {
  Disc,
  ShieldCheck,
  Truck,
  ArrowRight,
  Layers,
  Phone,
  Building2,
  Clock,
  MapPin,
} from 'lucide-react';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
    <div className="space-y-12 sm:space-y-16 pb-20 bg-white">
      {/* ========================================================================= */}
      {/* 1. HERO SECTION: CLEAN, BRIGHT TIRE RACK / FCP EURO AESTHETIC */}
      {/* ========================================================================= */}
      <section className="border-b border-slate-200 bg-gradient-to-b from-slate-50 via-slate-50/60 to-white pt-10 pb-12 sm:pt-14 sm:pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-10">
            {/* Registered Trader Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50/80 px-3.5 py-1 text-xs font-semibold text-blue-800 mb-4 shadow-2xs">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>Registered NZ Motor Vehicle Trader · Direct Tyre Importer</span>
            </div>

            {/* Sharp Headline */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
              Direct Trade Tyres &amp; Tested Safety Parts
            </h1>

            {/* Sub-paragraph */}
            <p className="mt-3 text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Supplying New Zealand mechanics, panel beaters, and fleets with verified fitment parts.
              Bench-tested AS/NZS seat belts and fresh commercial tyres in singles, pairs, or sets of 4.
            </p>
          </div>

          {/* Minimalist Centered Vehicle Finder Widget */}
          <div className="max-w-4xl mx-auto">
            <VehicleFinderWidget />
          </div>

          {/* Clean Trust Pillars Strip Directly Under Finder */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto text-xs text-slate-600 font-medium pt-6 border-t border-slate-200/60">
            <div className="flex items-center justify-center gap-2 text-center">
              <Truck className="h-4 w-4 text-blue-600 shrink-0" />
              <span>Orders before 2:00 PM dispatch same day</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-center">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>2.1–2.4Ω Tested Restraints with Donor VIN</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-center">
              <MapPin className="h-4 w-4 text-amber-600 shrink-0" />
              <span>Penrose Auckland Trade Counter Pickup</span>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. POPULAR NZ TYRE SIZES SELECTOR STRIP */}
      {/* ========================================================================= */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <Disc className="h-4 w-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900">
              Popular New Zealand Tyre Sizes:
            </h2>
          </div>
          <Link
            href="/tyres"
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 self-start sm:self-auto"
          >
            <span>View All Dimensions</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
          <Link
            href="/tyres?sectionWidth=205&aspectRatio=55&rimDiameter=16"
            className="rounded-lg border border-slate-200 bg-white p-2.5 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-all shadow-2xs group"
          >
            <span className="block font-mono font-bold text-xs text-slate-800 group-hover:text-blue-700">
              205/55 R16
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Corolla / i30 / Golf</span>
          </Link>

          <Link
            href="/tyres?sectionWidth=265&aspectRatio=65&rimDiameter=17"
            className="rounded-lg border border-slate-200 bg-white p-2.5 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-all shadow-2xs group"
          >
            <span className="block font-mono font-bold text-xs text-slate-800 group-hover:text-blue-700">
              265/65 R17
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Hilux / Ranger / Utes</span>
          </Link>

          <Link
            href="/tyres?sectionWidth=225&aspectRatio=45&rimDiameter=17"
            className="rounded-lg border border-slate-200 bg-white p-2.5 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-all shadow-2xs group"
          >
            <span className="block font-mono font-bold text-xs text-slate-800 group-hover:text-blue-700">
              225/45 R17
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Audi / BMW / Mazda3</span>
          </Link>

          <Link
            href="/tyres?sectionWidth=225&aspectRatio=65&rimDiameter=17"
            className="rounded-lg border border-slate-200 bg-white p-2.5 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-all shadow-2xs group"
          >
            <span className="block font-mono font-bold text-xs text-slate-800 group-hover:text-blue-700">
              225/65 R17
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5 block">RAV4 / CX-5 / CR-V</span>
          </Link>

          <Link
            href="/tyres?sectionWidth=195&aspectRatio=80&rimDiameter=15"
            className="rounded-lg border border-slate-200 bg-white p-2.5 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-all shadow-2xs group"
          >
            <span className="block font-mono font-bold text-xs text-slate-800 group-hover:text-blue-700">
              195/80 R15C
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5 block">HiAce / Transit Cargo</span>
          </Link>

          <Link
            href="/tyres?sectionWidth=185&aspectRatio=65&rimDiameter=15"
            className="rounded-lg border border-slate-200 bg-white p-2.5 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-all shadow-2xs group"
          >
            <span className="block font-mono font-bold text-xs text-slate-800 group-hover:text-blue-700">
              185/65 R15
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Aqua / Swift / Yaris</span>
          </Link>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. CORE DEPARTMENTS: TYRES & SEAT BELTS (CLEAN WHITE CARDS) */}
      {/* ========================================================================= */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tyres Department Card */}
          <Link href="/tyres" className="group">
            <Card className="h-full rounded-xl border border-slate-200 bg-white p-6 hover:border-blue-400 hover:shadow-md transition-all">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Disc className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                    Commercial &amp; Passenger Tyres
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-1">
                    Direct Importer Pricing · Singles, Pairs (2), and Full Sets (4)
                  </CardDescription>
                  <p className="mt-3 text-xs text-slate-600 leading-relaxed">
                    Fresh factory stock from Michelin, Continental, Goodyear, and Pirelli.
                    E-mark certified, factory tread depth, and on-site fitting &amp; balancing at our Penrose facility.
                  </p>
                  <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-blue-600 group-hover:translate-x-1 transition-transform">
                    <span>Shop Tyre Inventory</span>
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </Card>
          </Link>

          {/* Seat Belts Department Card */}
          <Link href="/seat-belts" className="group">
            <Card className="h-full rounded-xl border border-slate-200 bg-white p-6 hover:border-emerald-400 hover:shadow-md transition-all">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                    Tested Seat Belts &amp; Restraints
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-1">
                    Individually Serialized Assemblies · AS/NZS 2596 Compliance Tested
                  </CardDescription>
                  <p className="mt-3 text-xs text-slate-600 leading-relaxed">
                    Dismantled from low-km donor vehicles. Every retractor undergoes a multimeter
                    resistance test (2.1–2.4Ω) with actual photos and donor VIN recorded on every listing.
                  </p>
                  <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-emerald-600 group-hover:translate-x-1 transition-transform">
                    <span>Shop Tested Restraints</span>
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </Card>
          </Link>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. FEATURED TYRES SHOWCASE */}
      {/* ========================================================================= */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Commercial &amp; Fleet Tyres
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              In-stock in our Penrose Auckland depot · Single, pair, or set volume rates
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs font-semibold">
            <Link href="/tyres">
              <span>View All Tyres</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {tyresRes.data.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. FEATURED SERIALIZED SEAT BELTS SHOWCASE */}
      {/* ========================================================================= */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Bench-Tested Seat Belts (In-Stock)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Serialized safety assemblies with multimeter resistance test &amp; donor VIN records
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs font-semibold">
            <Link href="/seat-belts">
              <span>View All Belts</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {seatBeltsRes.data.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. WORKSHOP STANDARDS & TRUST STRIP */}
      {/* ========================================================================= */}
      <section className="border-y border-slate-200 bg-slate-50 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">AS/NZS 2596 Restraint Testing</h3>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                  Every retractor and pretensioner squib is bench-tested with digital multimeter (2.1–2.4Ω)
                  and tension-checked before barcoding. Zero untested safety parts leave our depot.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-800">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Actual Photos &amp; Donor VIN</h3>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                  The photos you see are of the exact physical part on our shelf, showing OEM stamping tags,
                  webbing condition, and donor vehicle details.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">2:00 PM Express Dispatch</h3>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                  Orders placed by 2:00 PM NZST dispatch same day via CourierPost or Mainfreight Express.
                  30-minute click &amp; collect from our Penrose Auckland trade counter.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. TRADE WORKSHOP & FLEET ACCOUNT BANNER (CLEAN & PROFESSIONAL) */}
      {/* ========================================================================= */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 sm:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 uppercase tracking-wider mb-2">
              <Building2 className="h-4 w-4" />
              <span>Workshop &amp; Fleet Trade Accounts</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900">
              Need trade pricing or regular fleet supplies?
            </h3>
            <p className="mt-1.5 text-xs sm:text-sm text-slate-600 leading-relaxed">
              Approved mechanics, panel shops, and fleet operators qualify for wholesale trade terms,
              30-day invoices, and direct phone ordering through our dedicated Auckland parts desk.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-500 font-medium">
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-slate-400" /> 18 Industry Rd, Penrose, Auckland
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-slate-400" /> Mon–Fri 7:30am–5:00pm NZST
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch gap-3 shrink-0">
            <a
              href="tel:0800746622"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-3 shadow-xs transition-colors"
            >
              <Phone className="h-4 w-4" />
              <span>0800 PINNACLE (0800 746 622)</span>
            </a>
            <Link
              href="/admin/login"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs px-4 py-3 transition-colors"
            >
              <span>Staff Portal</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
