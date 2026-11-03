'use client';

import * as React from 'react';
import { Camera, ShoppingCart, SlidersHorizontal } from 'lucide-react';
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

interface SerializedSeatBelt {
  stockId: string;
  title: string;
  conditionGrade: 'Grade A' | 'Grade B';
  vehicleFitment: string;
  position: string;
  price: number;
  testedDate: string;
}

// DEMO DATA
const demoSeatBelts: SerializedSeatBelt[] = [
  {
    stockId: 'SB-2024-0891',
    title: 'Front Driver 3-Point Pre-Tensioner Assembly',
    conditionGrade: 'Grade A',
    vehicleFitment: 'Ford Transit Custom (2018–2023)',
    position: 'Front Driver (Right)',
    price: 89.0,
    testedDate: '2024-10-18',
  },
  {
    stockId: 'SB-2024-0944',
    title: 'Front Passenger Inertia Reel Seat Belt',
    conditionGrade: 'Grade A',
    vehicleFitment: 'Volkswagen Golf Mk7 (2014–2020)',
    position: 'Front Passenger (Left)',
    price: 76.0,
    testedDate: '2024-10-21',
  },
  {
    stockId: 'SB-2024-1012',
    title: 'Rear Outer 3-Point Retractor Assembly',
    conditionGrade: 'Grade B',
    vehicleFitment: 'BMW 3 Series F30 / F31 (2012–2019)',
    position: 'Rear Right Outer',
    price: 54.0,
    testedDate: '2024-10-24',
  },
  {
    stockId: 'SB-2024-1185',
    title: 'Front Driver Pre-Tensioner Buckle Assembly',
    conditionGrade: 'Grade A',
    vehicleFitment: 'Mercedes-Benz Sprinter W906 (2013–2018)',
    position: 'Front Driver (Right)',
    price: 98.0,
    testedDate: '2024-10-28',
  },
];

export default function SeatBeltsCataloguePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Serialized Seat Belts & Restraints
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Each unit is individually inspected, bench tested, and photographed with an
              authenticated stock serial number.
            </p>
          </div>
          <Badge
            variant="outline"
            className="self-start sm:self-auto border-blue-200 bg-blue-50 text-blue-700"
          >
            Safety Inspected & Verified
          </Badge>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-4">
        {/* Filters Sidebar */}
        <aside className="space-y-6 lg:col-span-1">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-slate-500" />
                <h2 className="text-sm font-semibold text-slate-900">Filter Stock</h2>
              </div>
              <button type="button" className="text-xs text-blue-700 hover:underline">
                Reset
              </button>
            </div>

            {/* Vehicle Make Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">Vehicle Make</label>
              <Select defaultValue="all">
                <SelectTrigger>
                  <SelectValue placeholder="All Vehicle Makes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Vehicle Makes</SelectItem>
                  <SelectItem value="ford">Ford</SelectItem>
                  <SelectItem value="vw">Volkswagen</SelectItem>
                  <SelectItem value="bmw">BMW</SelectItem>
                  <SelectItem value="mercedes">Mercedes-Benz</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Position Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">Position / Row</label>
              <Select defaultValue="all">
                <SelectTrigger>
                  <SelectValue placeholder="All Positions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Positions</SelectItem>
                  <SelectItem value="front-driver">Front Driver</SelectItem>
                  <SelectItem value="front-pass">Front Passenger</SelectItem>
                  <SelectItem value="rear-outer">Rear Outer</SelectItem>
                  <SelectItem value="rear-center">Rear Center</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Condition Grade Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">Condition Grade</label>
              <Select defaultValue="all">
                <SelectTrigger>
                  <SelectValue placeholder="All Condition Grades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Condition Grades</SelectItem>
                  <SelectItem value="grade-a">Grade A (Excellent)</SelectItem>
                  <SelectItem value="grade-b">Grade B (Minor Blemishes)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 space-y-2">
            <h4 className="font-semibold text-slate-900">Inspection Standard</h4>
            <p>
              Grade A: Webbing intact with zero fraying, retraction tension within factory spec
              (&plusmn;5%), pre-tensioner circuit tested.
            </p>
            <p>
              Grade B: Full functional integrity, minor surface cosmetic marks on plastic
              escutcheons.
            </p>
          </div>
        </aside>

        {/* Product Grid */}
        <section className="space-y-6 lg:col-span-3">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Showing 4 serialized stock items (DEMO DATA)</span>
            <span>Sorted by Recently Listed</span>
          </div>

          {/* DEMO DATA */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {demoSeatBelts.map((item) => (
              <Card key={item.stockId} className="flex flex-col justify-between overflow-hidden">
                <div>
                  {/* Actual-item-photos placeholder */}
                  <div className="relative flex aspect-video w-full items-center justify-center bg-slate-100 text-slate-400 border-b border-slate-100">
                    <div className="flex flex-col items-center gap-1.5">
                      <Camera className="h-8 w-8 text-slate-300" />
                      <span className="text-xs font-medium text-slate-400">Actual Item Photos</span>
                    </div>
                    <span className="absolute top-2 left-2 rounded bg-slate-900/80 px-2 py-0.5 font-mono text-[10px] text-white">
                      Stock #{item.stockId}
                    </span>
                    <span className="absolute bottom-2 right-2 rounded bg-white/90 px-1.5 py-0.5 text-[9px] text-slate-600 font-mono">
                      Bench Tested: {item.testedDate}
                    </span>
                  </div>

                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-center justify-between">
                      <Badge
                        variant={item.conditionGrade === 'Grade A' ? 'success' : 'warning'}
                        className="text-xs"
                      >
                        {item.conditionGrade}
                      </Badge>
                      <span className="text-xs font-medium text-slate-500">{item.position}</span>
                    </div>
                    <CardTitle className="text-base mt-2">{item.title}</CardTitle>
                    <p className="text-xs font-medium text-blue-700">
                      Fitment: {item.vehicleFitment}
                    </p>
                  </CardHeader>

                  <CardContent className="p-4 pt-0 space-y-2">
                    <div className="rounded bg-slate-50 p-2.5 text-[11px] text-slate-600 space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Serial Identification:</span>
                        <span className="font-mono font-semibold text-slate-900">
                          {item.stockId}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Lock Mechanism:</span>
                        <span className="font-semibold text-slate-800">Inertia Dual-Lock Pass</span>
                      </div>
                    </div>

                    <div className="pt-2">
                      <span className="text-xs text-slate-500">Direct Unit Price</span>
                      <div className="text-2xl font-bold text-slate-900">
                        ${item.price.toFixed(2)}
                      </div>
                    </div>
                  </CardContent>
                </div>

                <CardFooter className="p-4 pt-0">
                  <Button type="button" className="w-full gap-2 text-xs" onClick={() => {}}>
                    <ShoppingCart className="h-3.5 w-3.5" />
                    <span>Purchase Stock Item</span>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          <div className="pt-6 border-t border-slate-200">
            <Pagination currentPage={1} totalPages={2} onPageChange={() => {}} />
          </div>
        </section>
      </div>
    </div>
  );
}
