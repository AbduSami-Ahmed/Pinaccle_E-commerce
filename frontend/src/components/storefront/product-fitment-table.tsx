'use client';

import * as React from 'react';
import { Car, CheckCircle2, AlertTriangle, ShieldAlert, Search, ShieldCheck } from 'lucide-react';
import { ProductFitmentDetailDto, FitmentVerificationStatus } from '@pinnacle/contracts';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

export interface ProductFitmentTableProps {
  fitments: ProductFitmentDetailDto[];
  fitmentSummary?: {
    makes: string[];
    models: string[];
    yearRange?: string;
    verificationStatus: string;
  };
}

export function ProductFitmentTable({ fitments, fitmentSummary }: ProductFitmentTableProps) {
  const [searchTerm, setSearchTerm] = React.useState('');

  const filteredFitments = React.useMemo(() => {
    if (!searchTerm.trim()) return fitments;
    const term = searchTerm.toLowerCase().trim();
    return fitments.filter(
      (f) =>
        f.make.toLowerCase().includes(term) ||
        f.model.toLowerCase().includes(term) ||
        (f.generation && f.generation.toLowerCase().includes(term)) ||
        f.chassisCode.toLowerCase().includes(term) ||
        (f.yearRange && f.yearRange.includes(term)),
    );
  }, [fitments, searchTerm]);

  const renderStatusBadge = (status: FitmentVerificationStatus) => {
    switch (status) {
      case 'VERIFIED_OEM_DIRECT':
        return (
          <Badge
            variant="outline"
            className="border-emerald-300 bg-emerald-50 text-emerald-800 text-[11px] font-semibold gap-1"
          >
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            Verified OEM Direct
          </Badge>
        );
      case 'UNIVERSAL_FIT':
        return (
          <Badge
            variant="outline"
            className="border-blue-300 bg-blue-50 text-blue-800 text-[11px] font-semibold gap-1"
          >
            <ShieldCheck className="h-3 w-3 text-blue-600" />
            Universal Fitment
          </Badge>
        );
      case 'REQUIRES_CHECK':
      default:
        return (
          <Badge
            variant="outline"
            className="border-amber-300 bg-amber-50 text-amber-800 text-[11px] font-semibold gap-1"
          >
            <AlertTriangle className="h-3 w-3 text-amber-600" />
            Check VIN First
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Car className="h-5 w-5 text-blue-700" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
              Vehicle Fitment & Chassis Compatibility
            </h3>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            Cross-referenced against manufacturer parts catalogues and dismantling records.
            {fitmentSummary && fitmentSummary.makes.length > 0 && (
              <span className="ml-1 text-slate-700 font-medium">
                Standard on {fitmentSummary.makes.join(', ')} ({fitmentSummary.models.join(', ')}).
              </span>
            )}
          </p>
        </div>

        {fitments.length > 2 && (
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <Input
              type="text"
              placeholder="Filter make, model, chassis..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 pl-8 text-xs bg-slate-50"
            />
          </div>
        )}
      </div>

      {filteredFitments.length === 0 ? (
        <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-lg">
          No matching vehicles found for &quot;{searchTerm}&quot;.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                <th className="py-2.5 px-3">Vehicle Make & Model</th>
                <th className="py-2.5 px-3">Years / Generation</th>
                <th className="py-2.5 px-3">Chassis / Body</th>
                <th className="py-2.5 px-3">Verification State</th>
                <th className="py-2.5 px-3">Workshop Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredFitments.map((fitment) => (
                <tr key={fitment.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-3">
                    <span className="font-bold text-slate-900">
                      {fitment.make} {fitment.model}
                    </span>
                    {fitment.engineSpec && (
                      <span className="block text-[11px] text-slate-500">{fitment.engineSpec}</span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-semibold text-slate-800">
                      {fitment.yearRange || 'All Years'}
                    </span>
                    {fitment.generation && (
                      <span className="block text-[11px] text-slate-500">{fitment.generation}</span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-mono text-xs font-semibold text-slate-800">
                      {fitment.chassisCode}
                    </span>
                    {fitment.bodyType && (
                      <span className="block text-[11px] text-slate-500">{fitment.bodyType}</span>
                    )}
                  </td>
                  <td className="py-3 px-3">{renderStatusBadge(fitment.verificationStatus)}</td>
                  <td className="py-3 px-3 text-[11px] text-slate-600 max-w-xs leading-relaxed">
                    {fitment.fitmentNotes || 'Direct OEM bolt-in fitment.'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Trade Fitment Verification Guarantee Note */}
      <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-3.5 text-xs text-blue-900 flex items-start gap-2.5">
        <ShieldAlert className="h-4 w-4 text-blue-700 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-bold text-blue-950">Workshop VIN Cross-Check Service:</span>
          <p className="text-[11px] text-blue-800 leading-relaxed">
            Not 100% sure if this part fits your specific build variant? Include your 17-digit VIN
            at checkout or quote it to our trade counter on <strong>(02) 9822 4100</strong>. We
            verify original equipment build sheets prior to courier release.
          </p>
        </div>
      </div>
    </div>
  );
}
