'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Car,
  Disc,
  Search,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  fetchVehicleMakes,
  fetchVehicleModels,
  fetchVehicleVariants,
  fetchVehicleYears,
  lookupVehicleByPlate,
} from '@/lib/fitment';
import {
  VehicleChassisDto,
  VehicleLookupResultDto,
  VehicleMakeDto,
  VehicleModelDto,
  VehicleSelection,
} from '@pinnacle/contracts';

export interface VehicleFinderWidgetProps {
  className?: string;
  onVehicleSelected?: (vehicle: VehicleSelection) => void;
}

export function VehicleFinderWidget({
  className = '',
  onVehicleSelected,
}: VehicleFinderWidgetProps) {
  const router = useRouter();

  // Active Tab: Default to vehicle selection (clean Tire Rack / FCP Euro standard)
  const [activeTab, setActiveTab] = React.useState<'vehicle' | 'plate' | 'tyres'>('vehicle');

  // Plate Lookup State
  const [lookupPlate, setLookupPlate] = React.useState('');
  const [loadingPlate, setLoadingPlate] = React.useState(false);
  const [lookupResult, setLookupResult] = React.useState<VehicleLookupResultDto | null>(null);
  const [plateError, setPlateError] = React.useState<string | null>(null);

  // Vehicle Finder State
  const [makes, setMakes] = React.useState<VehicleMakeDto[]>([]);
  const [models, setModels] = React.useState<VehicleModelDto[]>([]);
  const [years, setYears] = React.useState<number[]>([]);
  const [variants, setVariants] = React.useState<VehicleChassisDto[]>([]);

  const [selectedMake, setSelectedMake] = React.useState('');
  const [selectedModel, setSelectedModel] = React.useState('');
  const [selectedYear, setSelectedYear] = React.useState('');
  const [selectedVariant, setSelectedVariant] = React.useState('');

  const [loadingMakes, setLoadingMakes] = React.useState(false);
  const [loadingModels, setLoadingModels] = React.useState(false);
  const [loadingYears, setLoadingYears] = React.useState(false);
  const [loadingVariants, setLoadingVariants] = React.useState(false);

  // Tyre Size State
  const [tyreWidth, setTyreWidth] = React.useState('205');
  const [tyreProfile, setTyreProfile] = React.useState('55');
  const [tyreRim, setTyreRim] = React.useState('16');

  // 1. Initial Load of Vehicle Makes
  React.useEffect(() => {
    async function loadMakes() {
      setLoadingMakes(true);
      try {
        const data = await fetchVehicleMakes();
        setMakes(data);
      } finally {
        setLoadingMakes(false);
      }
    }
    loadMakes();
  }, []);

  // 2. Cascading: Make Selected -> Load Models
  const handleMakeChange = async (makeName: string) => {
    setSelectedMake(makeName);
    setSelectedModel('');
    setSelectedYear('');
    setSelectedVariant('');
    setModels([]);
    setYears([]);
    setVariants([]);

    if (!makeName || makeName === 'all') return;

    setLoadingModels(true);
    try {
      const data = await fetchVehicleModels(makeName);
      setModels(data);
    } finally {
      setLoadingModels(false);
    }
  };

  // 3. Cascading: Model Selected -> Load Years
  const handleModelChange = async (modelName: string) => {
    setSelectedModel(modelName);
    setSelectedYear('');
    setSelectedVariant('');
    setYears([]);
    setVariants([]);

    if (!modelName || modelName === 'all') return;

    setLoadingYears(true);
    try {
      const data = await fetchVehicleYears(modelName);
      setYears(data.years);
    } finally {
      setLoadingYears(false);
    }
  };

  // 4. Cascading: Year Selected -> Load Variants/Chassis
  const handleYearChange = async (yearStr: string) => {
    setSelectedYear(yearStr);
    setSelectedVariant('');
    setVariants([]);

    if (!yearStr || yearStr === 'all') return;

    setLoadingVariants(true);
    try {
      const data = await fetchVehicleVariants(selectedModel, Number(yearStr));
      setVariants(data);
    } finally {
      setLoadingVariants(false);
    }
  };

  // Submit Vehicle Search
  const handleVehicleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMake) return;

    const chosenVariantObj = variants.find(
      (v) => v.id === selectedVariant || v.chassisCode === selectedVariant,
    );

    const vehicleObj: VehicleSelection = {
      make: selectedMake,
      model: selectedModel,
      year: selectedYear ? Number(selectedYear) : undefined,
      chassisId: chosenVariantObj?.id,
      chassisCode: chosenVariantObj?.chassisCode,
      bodyType: chosenVariantObj?.bodyType,
      engineSpec: chosenVariantObj?.engineSpec || undefined,
    };

    if (typeof window !== 'undefined') {
      localStorage.setItem('pinnacle_active_vehicle', JSON.stringify(vehicleObj));
      window.dispatchEvent(new Event('pinnacle_vehicle_changed'));
    }

    if (onVehicleSelected) {
      onVehicleSelected(vehicleObj);
    }

    const params = new URLSearchParams();
    params.set('make', selectedMake);
    if (selectedModel) params.set('model', selectedModel);
    if (selectedYear) params.set('year', selectedYear);
    if (chosenVariantObj?.chassisCode) params.set('chassis', chosenVariantObj.chassisCode);

    router.push(`/fitment?${params.toString()}`);
  };

  // Submit Tyre Size Search
  const handleTyreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (tyreWidth) params.set('sectionWidth', tyreWidth);
    if (tyreProfile) params.set('aspectRatio', tyreProfile);
    if (tyreRim) params.set('rimDiameter', tyreRim);
    router.push(`/tyres?${params.toString()}`);
  };

  // Submit Plate / Rego Lookup
  const handlePlateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPlate = lookupPlate.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!cleanPlate) return;

    setLoadingPlate(true);
    setPlateError(null);
    setLookupResult(null);

    try {
      const res = await lookupVehicleByPlate(cleanPlate, 'NZ');
      if (res.found) {
        setLookupResult(res);
      } else {
        setPlateError(`No registration record found for plate "${cleanPlate}" in the NZ vehicle registry.`);
      }
    } catch (err) {
      setPlateError((err as Error).message || 'Failed to query vehicle registry');
    } finally {
      setLoadingPlate(false);
    }
  };

  // Apply lookup result to active vehicle filter
  const handleApplyLookupVehicle = () => {
    if (!lookupResult) return;
    const selection: VehicleSelection = lookupResult.matchedSelection || {
      make: lookupResult.make,
      model: lookupResult.model,
      year: lookupResult.year,
      chassisCode: lookupResult.chassisCode,
    };

    if (typeof window !== 'undefined') {
      localStorage.setItem('pinnacle_active_vehicle', JSON.stringify(selection));
      window.dispatchEvent(new Event('pinnacle_vehicle_changed'));
    }

    if (onVehicleSelected) {
      onVehicleSelected(selection);
    } else {
      const query = new URLSearchParams({
        make: selection.make,
        model: selection.model,
      });
      if (selection.year) query.set('year', String(selection.year));
      if (selection.chassisId) query.set('chassisId', selection.chassisId);
      router.push(`/search?${query.toString()}`);
    }
  };

  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-6 shadow-sm ${className}`}>
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-full">
        {/* Clean, Bright Pill Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-5">
          <TabsList className="bg-slate-100 p-1 rounded-xl h-auto inline-flex">
            <TabsTrigger
              value="vehicle"
              className="rounded-lg px-4 py-2 text-xs font-bold text-slate-700 data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-xs gap-1.5 transition-all"
            >
              <Car className="h-4 w-4" />
              <span>Select Vehicle</span>
            </TabsTrigger>

            <TabsTrigger
              value="plate"
              className="rounded-lg px-4 py-2 text-xs font-bold text-slate-700 data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-xs gap-1.5 transition-all"
            >
              <Search className="h-4 w-4" />
              <span>NZ Rego Plate</span>
            </TabsTrigger>

            <TabsTrigger
              value="tyres"
              className="rounded-lg px-4 py-2 text-xs font-bold text-slate-700 data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-xs gap-1.5 transition-all"
            >
              <Disc className="h-4 w-4" />
              <span>Tyre Dimensions</span>
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>Guaranteed Fitment Promise</span>
          </div>
        </div>

        {/* ================================================================= */}
        {/* TAB 1: BY VEHICLE (CLEAN HORIZONTAL SELECTORS) */}
        {/* ================================================================= */}
        <TabsContent value="vehicle" className="m-0 p-0">
          <form onSubmit={handleVehicleSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
              {/* 1. Make */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800">1. Make</label>
                <Select value={selectedMake} onValueChange={handleMakeChange}>
                  <SelectTrigger className="h-11 bg-white border-slate-300 rounded-lg text-xs font-medium">
                    <SelectValue placeholder={loadingMakes ? 'Loading...' : 'Select Make'} />
                  </SelectTrigger>
                  <SelectContent>
                    {makes.map((m) => (
                      <SelectItem key={m.id} value={m.name}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 2. Model */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800">2. Model</label>
                <Select
                  value={selectedModel}
                  onValueChange={handleModelChange}
                  disabled={!selectedMake || models.length === 0}
                >
                  <SelectTrigger className="h-11 bg-white border-slate-300 rounded-lg text-xs font-medium">
                    <SelectValue
                      placeholder={
                        loadingModels
                          ? 'Loading...'
                          : selectedMake
                            ? 'Select Model'
                            : 'Select Make First'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {models.map((mod) => (
                      <SelectItem key={mod.id} value={mod.name}>
                        {mod.name} {mod.yearsRange ? `(${mod.yearsRange})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 3. Year */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800">3. Year</label>
                <Select
                  value={selectedYear}
                  onValueChange={handleYearChange}
                  disabled={!selectedModel || years.length === 0}
                >
                  <SelectTrigger className="h-11 bg-white border-slate-300 rounded-lg text-xs font-medium">
                    <SelectValue
                      placeholder={
                        loadingYears
                          ? 'Loading...'
                          : selectedModel
                            ? 'Select Year'
                            : 'Select Model First'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 4. Series / Chassis */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800">4. Series / Body</label>
                <Select
                  value={selectedVariant}
                  onValueChange={setSelectedVariant}
                  disabled={!selectedYear || variants.length === 0}
                >
                  <SelectTrigger className="h-11 bg-white border-slate-300 rounded-lg text-xs font-medium">
                    <SelectValue
                      placeholder={
                        loadingVariants
                          ? 'Loading...'
                          : variants.length > 0
                            ? 'Select Chassis'
                            : 'All Series'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {variants.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.chassisCode} – {v.bodyType}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Action Button */}
              <Button
                type="submit"
                disabled={!selectedMake}
                className="h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <span>Find Compatible Parts</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </TabsContent>

        {/* ================================================================= */}
        {/* TAB 2: REGO PLATE LOOKUP (CLEAN NZ INPUT) */}
        {/* ================================================================= */}
        <TabsContent value="plate" className="m-0 p-0 space-y-4">
          <form onSubmit={handlePlateSubmit} className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 space-y-1.5 w-full">
              <label className="text-xs font-bold text-slate-800">
                New Zealand Number Plate
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-xs font-black text-slate-400 select-none">
                  NZ
                </span>
                <input
                  type="text"
                  placeholder="e.g. HYP360 or NZT442"
                  value={lookupPlate}
                  onChange={(e) => setLookupPlate(e.target.value.toUpperCase())}
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-4 font-mono text-sm font-bold uppercase tracking-wider text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  maxLength={10}
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loadingPlate || !lookupPlate.trim()}
              className="h-11 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-xs shrink-0"
            >
              {loadingPlate ? 'Checking NZTA...' : 'Search Plate'}
            </Button>
          </form>

          {/* Quick Examples */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="font-medium text-slate-600">Sample test plates:</span>
            <button
              type="button"
              onClick={() => setLookupPlate('HYP360')}
              className="rounded bg-slate-100 px-2 py-0.5 font-mono text-slate-700 hover:bg-slate-200"
            >
              HYP360 (RAV4)
            </button>
            <button
              type="button"
              onClick={() => setLookupPlate('NZT442')}
              className="rounded bg-slate-100 px-2 py-0.5 font-mono text-slate-700 hover:bg-slate-200"
            >
              NZT442 (Ranger)
            </button>
          </div>

          {plateError && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
              {plateError}
            </div>
          )}

          {lookupResult && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-slate-900 px-2 py-0.5 font-mono text-xs font-bold text-white">
                    {lookupResult.plate}
                  </span>
                  <span className="font-bold text-slate-900 text-sm">
                    {lookupResult.year} {lookupResult.make} {lookupResult.model}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Chassis: {lookupResult.chassisCode || 'Standard'} · {lookupResult.fuelType} · {lookupResult.bodyType}
                </p>
              </div>

              <Button
                type="button"
                onClick={handleApplyLookupVehicle}
                className="h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg"
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                <span>View Matching Parts</span>
              </Button>
            </div>
          )}
        </TabsContent>

        {/* ================================================================= */}
        {/* TAB 3: TYRE DIMENSIONS */}
        {/* ================================================================= */}
        <TabsContent value="tyres" className="m-0 p-0">
          <form onSubmit={handleTyreSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800">Width (mm)</label>
                <Select value={tyreWidth} onValueChange={setTyreWidth}>
                  <SelectTrigger className="h-11 bg-white border-slate-300 rounded-lg text-xs font-medium">
                    <SelectValue placeholder="Width" />
                  </SelectTrigger>
                  <SelectContent>
                    {[175, 185, 195, 205, 215, 225, 235, 245, 255, 265, 275].map((w) => (
                      <SelectItem key={w} value={String(w)}>
                        {w} mm
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800">Profile (%)</label>
                <Select value={tyreProfile} onValueChange={setTyreProfile}>
                  <SelectTrigger className="h-11 bg-white border-slate-300 rounded-lg text-xs font-medium">
                    <SelectValue placeholder="Profile" />
                  </SelectTrigger>
                  <SelectContent>
                    {[35, 40, 45, 50, 55, 60, 65, 70, 75].map((p) => (
                      <SelectItem key={p} value={String(p)}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800">Rim Diameter</label>
                <Select value={tyreRim} onValueChange={setTyreRim}>
                  <SelectTrigger className="h-11 bg-white border-slate-300 rounded-lg text-xs font-medium">
                    <SelectValue placeholder="Rim" />
                  </SelectTrigger>
                  <SelectContent>
                    {[14, 15, 16, 17, 18, 19, 20, 21, 22].map((r) => (
                      <SelectItem key={r} value={String(r)}>
                        {r}&quot;
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                type="submit"
                className="h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-xs flex items-center justify-center gap-1.5"
              >
                <span>Search Tyres</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}
