import * as React from 'react';
import Link from 'next/link';
import { Disc } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TyrePurchaseCard } from './tyre-purchase-card';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function TyreDetailPage({ params }: PageProps) {
  const { slug } = await params;

  // DEMO DATA
  const product = {
    title: 'Michelin Pilot Sport 4',
    brand: 'Michelin',
    sku: `TYRE-${slug.toUpperCase()}-2254517`,
    spec: '225/45 R17 94Y XL',
    basePrice: 145.0,
    fitmentBadge: 'Verified OEM Fitment',
    specs: [
      { label: 'Width (Section Width)', value: '225 mm' },
      { label: 'Aspect Ratio', value: '45%' },
      { label: 'Rim Diameter', value: '17"' },
      { label: 'Load Index', value: '94 (670 kg max axle load)' },
      { label: 'Speed Rating', value: 'Y (up to 300 km/h / 186 mph)' },
      { label: 'Season / Profile', value: 'Summer Ultra High Performance' },
      { label: 'Reinforcement', value: 'XL (Extra Load)' },
      { label: 'EU Fuel Efficiency', value: 'Class C' },
      { label: 'EU Wet Grip Rating', value: 'Class A' },
      { label: 'External Noise Level', value: '71 dB (Class B)' },
    ],
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
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
            <BreadcrumbLink asChild>
              <Link href="/tyres">Tyres</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{product.title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Main product area: Left = image placeholder, Right = details & purchase */}
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        {/* Left Column: Image placeholder area */}
        <div className="space-y-4">
          <div className="relative flex aspect-square w-full items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-slate-500 shadow-sm">
            <div className="flex flex-col items-center gap-3">
              <Disc className="h-20 w-20 text-slate-300 stroke-[1.25]" />
              <span className="text-sm font-semibold tracking-wider uppercase text-slate-400">
                Product Image Placeholder
              </span>
              <span className="text-xs text-slate-400 font-mono">{product.spec}</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex aspect-video items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-[11px] text-slate-400">
              Tread Pattern
            </div>
            <div className="flex aspect-video items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-[11px] text-slate-400">
              Sidewall Markings
            </div>
            <div className="flex aspect-video items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-[11px] text-slate-400">
              EU Energy Label
            </div>
          </div>
        </div>

        {/* Right Column: Title, brand, sku, fitment, purchase card */}
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {product.brand}
              </span>
              <Badge variant="success" className="text-xs">
                {product.fitmentBadge}
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              {product.title}
            </h1>
            <p className="font-mono text-base font-semibold text-blue-700">{product.spec}</p>
            <p className="text-xs text-slate-500 font-mono">SKU: {product.sku}</p>
          </div>

          {/* Quick Specifications Snapshot */}
          <div className="rounded-md border border-slate-200 bg-slate-50/70 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
              Fast Fitment Spec
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-500">Width: </span>
                <span className="font-medium text-slate-800">225 mm</span>
              </div>
              <div>
                <span className="text-slate-500">Aspect Ratio: </span>
                <span className="font-medium text-slate-800">45%</span>
              </div>
              <div>
                <span className="text-slate-500">Rim Diameter: </span>
                <span className="font-medium text-slate-800">17 inches</span>
              </div>
              <div>
                <span className="text-slate-500">Speed Rating: </span>
                <span className="font-medium text-slate-800">Y (300 km/h)</span>
              </div>
            </div>
          </div>

          {/* Purchase Card Island */}
          <TyrePurchaseCard basePrice={product.basePrice} />
        </div>
      </div>

      {/* Tabs: Description and Specifications */}
      <div className="pt-8 border-t border-slate-200">
        <Tabs defaultValue="specifications" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="specifications">Full Specifications</TabsTrigger>
            <TabsTrigger value="description">Description & Fitment</TabsTrigger>
          </TabsList>

          <TabsContent value="specifications" className="mt-6">
            <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Parameter</th>
                    <th className="px-6 py-3 font-semibold">Specification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {product.specs.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="px-6 py-3 font-medium text-slate-600">{item.label}</td>
                      <td className="px-6 py-3 font-mono font-medium text-slate-900">
                        {item.value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="description" className="mt-6">
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm space-y-4 text-sm text-slate-600 leading-relaxed">
              <h3 className="text-base font-semibold text-slate-900">Engineering & Tread Design</h3>
              <p>
                The Michelin Pilot Sport 4 provides precision steering control and reactivity on
                both dry and wet pavement. Built with dynamic response technology—a hybrid belt of
                aramid and nylon—it transmits steering instructions instantly to the road.
              </p>
              <h4 className="text-sm font-semibold text-slate-900 pt-2">Compound & Safety</h4>
              <p>
                A novel mix of functional elastomers and hydrophobic silica delivers high wet grip
                and short braking distances. Wide longitudinal grooves drain water effectively to
                resist aquaplaning under heavy highway loads.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
