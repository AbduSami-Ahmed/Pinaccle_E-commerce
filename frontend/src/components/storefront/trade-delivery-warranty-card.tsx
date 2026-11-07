'use client';

import * as React from 'react';
import { Truck, MapPin, ShieldCheck, Clock } from 'lucide-react';
import { WarehouseLocationDetailDto } from '@pinnacle/contracts';

export interface TradeDeliveryWarrantyCardProps {
  warehouseLocation?: WarehouseLocationDetailDto;
  shippingInfo?: {
    standardDispatch: string;
    expressCourier: string;
    cutoffTimeAEST: string;
  };
  warrantyAndReturns?: {
    warrantyDays: number;
    returnPolicy: string;
    srsDisclaimer?: string;
  };
}

export function TradeDeliveryWarrantyCard({
  warehouseLocation,
  shippingInfo,
  warrantyAndReturns,
}: TradeDeliveryWarrantyCardProps) {
  const cutoff = shippingInfo?.cutoffTimeAEST || '14:00';
  const warrantyDays = warrantyAndReturns?.warrantyDays || 30;

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-2.5">
        Fulfilment, Collection & Workshop Warranty
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        {/* Click & Collect */}
        <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-3.5 space-y-2">
          <div className="flex items-center gap-2 text-slate-900 font-bold">
            <MapPin className="h-4 w-4 text-blue-700 shrink-0" />
            <span>Sydney Trade Counter</span>
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            {warehouseLocation?.pickupLeadTime || 'Ready in 30 minutes for counter collection.'}
          </p>
          <div className="text-[10px] text-slate-500 font-medium">
            42 Jedda Rd, Prestons NSW 2170
            {warehouseLocation?.bay && (
              <span className="block font-mono text-blue-800 font-semibold mt-0.5">
                Staged at: {warehouseLocation.bay}
              </span>
            )}
          </div>
        </div>

        {/* Dispatch & Courier Freight */}
        <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-3.5 space-y-2">
          <div className="flex items-center gap-2 text-slate-900 font-bold">
            <Truck className="h-4 w-4 text-emerald-700 shrink-0" />
            <span>Express Courier Dispatch</span>
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            {shippingInfo?.standardDispatch ||
              `Orders confirmed prior to ${cutoff} AEST dispatch same business day via StarTrack or TNT Express.`}
          </p>
          <div className="flex items-center gap-1 text-[10px] text-emerald-700 font-semibold">
            <Clock className="h-3 w-3" /> Same-day cutoff: {cutoff} Sydney time
          </div>
        </div>

        {/* Warranty Guarantee */}
        <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-3.5 space-y-2">
          <div className="flex items-center gap-2 text-slate-900 font-bold">
            <ShieldCheck className="h-4 w-4 text-indigo-700 shrink-0" />
            <span>{warrantyDays}-Day Workshop Guarantee</span>
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            {warrantyAndReturns?.returnPolicy ||
              `${warrantyDays}-day workshop exchange or refund guarantee. Tamper barcode tags must remain attached.`}
          </p>
          <div className="text-[10px] text-slate-500 font-medium">Licensed Recycler MVRL-58291</div>
        </div>
      </div>
    </div>
  );
}
