'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, RotateCcw, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VehicleSelection } from '@pinnacle/contracts';

export function ActiveVehicleBar() {
  const router = useRouter();
  const [activeVehicle, setActiveVehicle] = React.useState<VehicleSelection | null>(null);

  const loadVehicle = React.useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem('pinnacle_active_vehicle');
      if (saved) {
        setActiveVehicle(JSON.parse(saved));
      } else {
        setActiveVehicle(null);
      }
    } catch {
      setActiveVehicle(null);
    }
  }, []);

  React.useEffect(() => {
    loadVehicle();
    const handleStorage = () => loadVehicle();
    window.addEventListener('pinnacle_vehicle_changed', handleStorage);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('pinnacle_vehicle_changed', handleStorage);
      window.removeEventListener('storage', handleStorage);
    };
  }, [loadVehicle]);

  const handleClear = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('pinnacle_active_vehicle');
      window.dispatchEvent(new Event('pinnacle_vehicle_changed'));
    }
    setActiveVehicle(null);
  };

  const handleViewCompatible = () => {
    if (!activeVehicle) return;
    const params = new URLSearchParams();
    params.set('make', activeVehicle.make);
    if (activeVehicle.model) params.set('model', activeVehicle.model);
    if (activeVehicle.year) params.set('year', String(activeVehicle.year));
    if (activeVehicle.chassisCode) params.set('chassis', activeVehicle.chassisCode);
    router.push(`/fitment?${params.toString()}`);
  };

  if (!activeVehicle) {
    return null;
  }

  return (
    <div className="bg-emerald-50 border-b border-emerald-200 py-2.5 px-4 sm:px-6">
      <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-emerald-900">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-200 text-emerald-800">
            <CheckCircle2 className="h-4 w-4" />
          </span>
          <span>
            <strong className="font-semibold text-emerald-950">Active Vehicle Filter:</strong>{' '}
            {activeVehicle.year ? `${activeVehicle.year} ` : ''}
            {activeVehicle.make} {activeVehicle.model}{' '}
            {activeVehicle.chassisCode && `(${activeVehicle.chassisCode})`}{' '}
            {activeVehicle.bodyType && `• ${activeVehicle.bodyType}`}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={handleViewCompatible}
            className="h-7 text-xs text-emerald-800 hover:text-emerald-950 hover:bg-emerald-100 font-semibold gap-1"
          >
            View Compatible Parts <ChevronRight className="h-3.5 w-3.5" />
          </Button>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleClear}
            className="h-7 px-2.5 text-xs border-emerald-300 text-emerald-800 hover:bg-emerald-100 gap-1"
          >
            <RotateCcw className="h-3 w-3" /> Change / Clear
          </Button>
        </div>
      </div>
    </div>
  );
}
