import * as React from 'react';
import Link from 'next/link';
import { Car, ShieldCheck, CheckCircle2, AlertTriangle, RotateCcw, ArrowRight } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { TyrePagination } from '../tyres/tyre-pagination';
import { searchVehicleFitment } from '@/lib/fitment';
import { FitmentConfidence } from '@pinnacle/contracts';

export const metadata = {
  title: 'Compatible Parts Finder — Guaranteed Vehicle Fitment — Pinnacle Auto Parts',
  description:
    'Browse automotive parts verified for your exact vehicle make, model, year, and chassis code. Avoid returns with verified OEM matching.',
};

interface FitmentPageProps {
  searchParams: Promise<{
    make?: string;
    model?: string;
    year?: string;
    chassis?: string;
    categorySlug?: string;
    minConfidence?: 'CONFIRMED_EXACT' | 'UNIVERSAL_COMPATIBLE' | 'PARTIAL_REQUIRES_CHECK';
    page?: string;
  }>;
}

export default async function FitmentResultsPage({ searchParams }: FitmentPageProps) {
  const resolvedParams = await searchParams;

  const vehicleTitle = [
    resolvedParams.year,
    resolvedParams.make,
    resolvedParams.model,
    resolvedParams.chassis ? `(${resolvedParams.chassis})` : '',
  ]
    .filter(Boolean)
    .join(' ');

  const res = await searchVehicleFitment({
    make: resolvedParams.make,
    model: resolvedParams.model,
    year: resolvedParams.year ? Number(resolvedParams.year) : undefined,
    chassisCode: resolvedParams.chassis,
    categorySlug: resolvedParams.categorySlug,
    minConfidence: resolvedParams.minConfidence as FitmentConfidence,
    page: resolvedParams.page ? Number(resolvedParams.page) : 1,
    pageSize: 12,
  });

  const { data: results, meta } = res;

  // Render confidence badge
  const renderConfidenceBadge = (confidence: FitmentConfidence, _isOemDirect?: boolean) => {
    if (confidence === 'CONFIRMED_EXACT') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
          Verified Exact OEM Match
        </span>
      );
    }
    if (confidence === 'UNIVERSAL_COMPATIBLE') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-800 border border-blue-200">
          <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
          Universal Compatible Fit
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 border border-amber-200">
        <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
        Partial Match — Requires VIN Check
      </span>
    );
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/">Home</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Vehicle Fitment Finder</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header Banner */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                <Car className="h-5 w-5" />
              </span>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                  {vehicleTitle
                    ? `Compatible Parts for ${vehicleTitle}`
                    : 'Vehicle Compatibility Results'}
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Components verified against OEM assembly diagrams and workshop interchange
                  matrices.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs">
              <Link href="/">
                <RotateCcw className="h-3.5 w-3.5" /> Change Vehicle
              </Link>
            </Button>
          </div>
        </div>

        {/* Category Tabs: All, Tyres, Seat Belts */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <span className="font-semibold text-slate-500">Filter Department:</span>
          <Link
            href={`/fitment?make=${resolvedParams.make || ''}&model=${resolvedParams.model || ''}&year=${resolvedParams.year || ''}&chassis=${resolvedParams.chassis || ''}`}
            className={`rounded-full px-3 py-1 font-medium transition-colors ${
              !resolvedParams.categorySlug
                ? 'bg-blue-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All Parts
          </Link>
          <Link
            href={`/fitment?make=${resolvedParams.make || ''}&model=${resolvedParams.model || ''}&year=${resolvedParams.year || ''}&chassis=${resolvedParams.chassis || ''}&categorySlug=tyres`}
            className={`rounded-full px-3 py-1 font-medium transition-colors ${
              resolvedParams.categorySlug === 'tyres'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Tyres & Wheels
          </Link>
          <Link
            href={`/fitment?make=${resolvedParams.make || ''}&model=${resolvedParams.model || ''}&year=${resolvedParams.year || ''}&chassis=${resolvedParams.chassis || ''}&categorySlug=seat-belts`}
            className={`rounded-full px-3 py-1 font-medium transition-colors ${
              resolvedParams.categorySlug === 'seat-belts'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Seat Belts & Restraints
          </Link>
        </div>
      </div>

      {/* Results Header Count */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>
          Found <strong className="text-slate-900">{meta.total}</strong> verified items matching
          your vehicle
        </span>
        <span>
          Page {meta.page} of {meta.totalPages}
        </span>
      </div>

      {/* Product Cards with Fitment Badges */}
      {results.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((item) => {
            const p = item.product;
            const isTyre = p.categorySlug === 'tyres' || p.productType === 'BULK_QUANTITY';
            const detailHref = isTyre ? `/tyres/${p.slug}` : `/seat-belts/${p.slug}`;

            return (
              <Card
                key={`${item.product.id}-${item.matchedChassisCode}`}
                className="group flex flex-col justify-between overflow-hidden border-slate-200 hover:border-blue-300 hover:shadow-md transition-all"
              >
                <div>
                  {/* Verification Banner */}
                  <div className="border-b border-slate-100 bg-slate-50/70 p-3 flex items-center justify-between">
                    {renderConfidenceBadge(item.fitmentConfidence, item.isOemDirect)}
                    <span className="font-mono text-[11px] text-slate-400">
                      {item.matchedChassisCode}
                    </span>
                  </div>

                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                      <span className="font-bold uppercase tracking-wider text-blue-700">
                        {p.brand}
                      </span>
                      <span className="font-mono text-slate-400">SKU: {p.sku}</span>
                    </div>

                    <Link href={detailHref}>
                      <h3 className="line-clamp-2 text-sm font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">
                        {p.title}
                      </h3>
                    </Link>
                  </CardHeader>

                  <CardContent className="p-4 pt-1 space-y-2.5 text-xs text-slate-600">
                    {/* Fitment Notes */}
                    {item.fitmentNotes && (
                      <div className="rounded bg-slate-50 p-2 text-[11px] text-slate-600 border border-slate-100">
                        <strong className="text-slate-800">Fitment Note:</strong>{' '}
                        {item.fitmentNotes}
                      </div>
                    )}

                    {/* Tyre specs */}
                    {p.tyreSpec && (
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                        <span className="font-semibold text-slate-800">
                          {p.tyreSpec.sectionWidth}/{p.tyreSpec.aspectRatio} R
                          {p.tyreSpec.rimDiameter}
                        </span>
                        <span>•</span>
                        <span>{p.tyreSpec.season.toLowerCase()}</span>
                      </div>
                    )}

                    {/* Seat belt specs */}
                    {p.seatBeltSpec && (
                      <div className="text-[11px] text-slate-500 space-y-0.5">
                        <div>
                          Position:{' '}
                          <span className="font-medium text-slate-800 capitalize">
                            {p.seatBeltSpec.position.toLowerCase().replace(/_/g, ' ')}
                          </span>
                        </div>
                        {p.stockNumber && (
                          <div>
                            Stock Serial:{' '}
                            <span className="font-mono text-slate-700">{p.stockNumber}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </div>

                <CardFooter className="flex items-center justify-between border-t border-slate-100 p-4 bg-slate-50/50">
                  <div>
                    <span className="text-base font-bold text-slate-900">
                      ${p.defaultPrice.toFixed(2)}
                    </span>
                    <span className="text-xs text-slate-500"> / {p.defaultSaleUnitName}</span>
                    <div className="text-[11px] font-medium text-emerald-600">
                      {p.availability.label}
                    </div>
                  </div>

                  <Button asChild size="sm" variant="outline" className="gap-1 text-xs">
                    <Link href={detailHref}>
                      View Part <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <Car className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">
            No parts confirmed compatible with this vehicle
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            We dismantle new vehicles weekly and may have uncatalogued donor stock. Call our
            Auckland Penrose team on <strong className="text-slate-800">0800 PINNACLE</strong> with
            your VIN or NZ registration, and our technicians will check our physical storage racks.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs">
              <Link href="/">
                <RotateCcw className="h-3.5 w-3.5" /> Search Another Vehicle
              </Link>
            </Button>
            <a
              href="tel:0800746622"
              className="inline-flex items-center gap-1.5 rounded-md bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-800 transition-colors"
            >
              Call Trade Desk: 0800 PINNACLE
            </a>
          </div>
        </div>
      )}

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="pt-4 border-t border-slate-200">
          <TyrePagination currentPage={meta.page} totalPages={meta.totalPages} />
        </div>
      )}
    </div>
  );
}
