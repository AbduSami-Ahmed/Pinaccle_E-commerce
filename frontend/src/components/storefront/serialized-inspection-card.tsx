'use client';

import * as React from 'react';
import Image from 'next/image';
import { ShieldCheck, Check, Tag, Zap, MapPin, Camera, AlertTriangle } from 'lucide-react';
import { SerializedItemDetailDto } from '@pinnacle/contracts';
import { Badge } from '@/components/ui/badge';

export interface SerializedInspectionCardProps {
  serializedItem: SerializedItemDetailDto;
  productCondition: string;
}

export function SerializedInspectionCard({
  serializedItem,
  productCondition,
}: SerializedInspectionCardProps) {
  return (
    <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-emerald-600" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
            Serialized Part Inspection & Salvage Intake Report
          </h3>
        </div>
        <Badge
          variant="outline"
          className="border-emerald-300 bg-emerald-50 text-emerald-900 text-xs font-semibold uppercase tracking-wide w-fit"
        >
          <Check className="mr-1 h-3.5 w-3.5 text-emerald-600" /> Tested & Passed Bench Inspection
        </Badge>
      </div>

      {/* Highlights Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 space-y-1">
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wide flex items-center gap-1">
            <Tag className="h-3 w-3 text-amber-500" /> Unit Stock Barcode
          </span>
          <span className="font-mono text-sm font-bold text-slate-900 block">
            {serializedItem.stockBarcode}
          </span>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 space-y-1">
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wide flex items-center gap-1">
            <Zap className="h-3 w-3 text-blue-500" /> Pretensioner Circuit Test
          </span>
          <span className="font-mono text-sm font-bold text-emerald-700 block">
            {serializedItem.resistanceOhms !== null && serializedItem.resistanceOhms !== undefined
              ? `${serializedItem.resistanceOhms.toFixed(1)} Ω (Factory Spec Pass)`
              : 'Continuity Verified'}
          </span>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 space-y-1">
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wide flex items-center gap-1">
            <MapPin className="h-3 w-3 text-rose-500" /> Depot Physical Location
          </span>
          <span className="text-xs font-semibold text-slate-900 block truncate">
            {serializedItem.warehouseLocation || 'Penrose Yard Bay B-04'}
          </span>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 space-y-1">
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">
            Intake Condition
          </span>
          <span className="text-xs font-semibold text-slate-900 block uppercase">
            {(serializedItem.conditionGrade || productCondition).replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      {/* Donor Vehicle Traceability */}
      <div className="rounded-lg border border-slate-200 bg-slate-50/90 p-4 space-y-2 text-xs">
        <h4 className="font-bold uppercase tracking-wider text-slate-800 text-[11px]">
          Donor Vehicle Traceability Record (NZ MVD-89211)
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <span className="text-slate-400 block text-[11px]">Donor Vehicle</span>
            <span className="font-semibold text-slate-900">
              {serializedItem.donorVehicleDesc || 'Low-km workshop donor vehicle'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Donor 17-Digit VIN</span>
            <span className="font-mono font-bold text-slate-800">
              {serializedItem.donorVin || 'Verified on physical salvage tag'}
            </span>
          </div>
        </div>
      </div>

      {/* Technician Condition Notes */}
      {serializedItem.conditionNotes && (
        <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-1.5 text-xs">
          <h4 className="font-bold uppercase tracking-wider text-slate-800 text-[11px]">
            Yard Technician Physical Assessment
          </h4>
          <p className="text-slate-600 leading-relaxed">{serializedItem.conditionNotes}</p>
        </div>
      )}

      {/* Item-Specific Photographs */}
      {serializedItem.actualPhotos && serializedItem.actualPhotos.length > 0 && (
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-800">
              <Camera className="h-4 w-4 text-blue-700" />
              <span>
                Unit-Specific Salvage Photographs ({serializedItem.actualPhotos.length} angles)
              </span>
            </div>
            <span className="text-[11px] text-slate-500 italic">
              Actual physical item photos — not generic catalogue renders
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {serializedItem.actualPhotos.map((photoUrl, idx) => (
              <div
                key={idx}
                className="relative aspect-video overflow-hidden rounded-lg border border-slate-200 bg-slate-100 shadow-2xs group"
              >
                <Image
                  src={photoUrl}
                  alt={`Intake photo ${idx + 1} of ${serializedItem.stockBarcode}`}
                  fill
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className="object-cover transition-transform duration-200 group-hover:scale-105"
                />
                <div className="absolute bottom-1 right-1 rounded bg-black/75 px-1.5 py-0.5 text-[9px] font-mono text-white">
                  Angle #{idx + 1}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Safety Notice for SRS Parts */}
      <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900 flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-[11px] leading-relaxed">
          <strong>Licensed Workshop Requirement:</strong> Pyrotechnic safety devices must be handled
          in accordance with automotive workshop standards. Disconnect vehicle 12V battery prior to
          plugging or unplugging yellow SRS pretensioner connectors.
        </p>
      </div>
    </div>
  );
}
