'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Car, Disc, Barcode, Search, RotateCcw, ChevronRight, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  VEHICLE_FITMENT_DISCLAIMER,
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

  // Active Tab
  const [activeTab, setActiveTab] = React.useState<'vehicle' | 'plate' | 'tyres' | 'partNumber'>('vehicle');

  // Plate Lookup State (Phase 16A: Vehicle Data Provider Integration)
  const [lookupPlate, setLookupPlate] = React.useState('');
  const [lookupCountry, setLookupCountry] = React.useState<'NZ' | 'AU'>('NZ');
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

  // Part Number State
  const [partNumber, setPartNumber] = React.useState('');

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

    // Save to local storage for persistent fitment verification badges
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

  // Submit Part Number Search
  const handlePartNumberSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partNumber.trim()) return;
    router.push(`/search?search=${encodeURIComponent(partNumber.trim())}`);
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
      const res = await lookupVehicleByPlate(cleanPlate, lookupCountry);
      if (res.found) {
        setLookupResult(res);
      } else {
        setPlateError(`No registration match found for plate "${cleanPlate}" in the official ${lookupCountry} motor vehicle registry.`);
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
    <div
      className={`rounded-xl border border-slate-200 bg-white shadow-md overflow-hidden ${className}`}
    >
      {/* Finder Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-full">
        <TabsList className="w-full justify-start rounded-none border-b border-slate-200 bg-slate-50/80 p-0 h-12">
          <TabsTrigger
            value="vehicle"
            className="flex-1 sm:flex-initial h-12 rounded-none border-b-2 border-transparent px-5 text-xs font-bold uppercase tracking-wider text-slate-600 data-[state=active]:border-blue-700 data-[state=active]:text-blue-700 data-[state=active]:bg-white gap-2"
          >
            <Car className="h-4 w-4" />
            <span>1. By Vehicle</span>
          </TabsTrigger>
          <TabsTrigger
            value="plate"
            className="flex-1 sm:flex-initial h-12 rounded-none border-b-2 border-transparent px-5 text-xs font-bold uppercase tracking-wider text-slate-600 data-[state=active]:border-blue-700 data-[state=active]:text-blue-700 data-[state=active]:bg-white gap-2"
          >
            <Search className="h-4 w-4" />
            <span>2. Plate / Rego</span>
          </TabsTrigger>
          <TabsTrigger
            value="tyres"
            className="flex-1 sm:flex-initial h-12 rounded-none border-b-2 border-transparent px-5 text-xs font-bold uppercase tracking-wider text-slate-600 data-[state=active]:border-blue-700 data-[state=active]:text-blue-700 data-[state=active]:bg-white gap-2"
          >
            <Disc className="h-4 w-4" />
            <span>3. By Tyre Size</span>
          </TabsTrigger>
          <TabsTrigger
            value="partNumber"
            className="flex-1 sm:flex-initial h-12 rounded-none border-b-2 border-transparent px-5 text-xs font-bold uppercase tracking-wider text-slate-600 data-[state=active]:border-blue-700 data-[state=active]:text-blue-700 data-[state=active]:bg-white gap-2"
          >
            <Barcode className="h-4 w-4" />
            <span>4. By Part / Stock #</span>
          </TabsTrigger>
        </TabsList>

        {/* =================================================================== */}
        {/* TAB 1: VEHICLE FINDER (DEPENDENT DROPDOWNS) */}
        {/* =================================================================== */}
        <TabsContent value="vehicle" className="p-6 pt-5 m-0 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Select Your Vehicle for Guaranteed Fitment
              </h3>
              <p className="text-xs text-slate-500">
                Options cascade dynamically based on verified Australian & OEM manufacturing data.
              </p>
            </div>
            {(selectedMake || selectedModel || selectedYear) && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleMakeChange('')}
                className="h-7 px-2 text-xs text-slate-500 hover:text-rose-600 gap-1 self-start sm:self-auto"
              >
                <RotateCcw className="h-3 w-3" /> Clear Selection
              </Button>
            )}
          </div>

          <form onSubmit={handleVehicleSubmit}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {/* 1. Make */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
                  Make
                </label>
                <Select value={selectedMake} onValueChange={handleMakeChange}>
                  <SelectTrigger className="h-10 text-xs bg-white border-slate-300">
                    <SelectValue placeholder={loadingMakes ? 'Loading makes...' : 'Select Make'} />
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
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
                  Model
                </label>
                <Select
                  value={selectedModel}
                  onValueChange={handleModelChange}
                  disabled={!selectedMake || models.length === 0}
                >
                  <SelectTrigger className="h-10 text-xs bg-white border-slate-300">
                    <SelectValue
                      placeholder={
                        loadingModels
                          ? 'Loading models...'
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
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
                  Year
                </label>
                <Select
                  value={selectedYear}
                  onValueChange={handleYearChange}
                  disabled={!selectedModel || years.length === 0}
                >
                  <SelectTrigger className="h-10 text-xs bg-white border-slate-300">
                    <SelectValue
                      placeholder={
                        loadingYears
                          ? 'Loading years...'
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

              {/* 4. Variant / Chassis */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
                  Variant / Chassis
                </label>
                <Select
                  value={selectedVariant}
                  onValueChange={setSelectedVariant}
                  disabled={!selectedYear || variants.length === 0}
                >
                  <SelectTrigger className="h-10 text-xs bg-white border-slate-300">
                    <SelectValue
                      placeholder={
                        loadingVariants
                          ? 'Loading variants...'
                          : variants.length > 0
                            ? 'Select Chassis'
                            : 'Standard Series'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {variants.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.chassisCode} – {v.bodyType} {v.engineSpec ? `(${v.engineSpec})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <div className="flex flex-col gap-0.5 text-xs text-slate-500">
                <div className="flex items-center gap-1.5 font-medium text-slate-700">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Guaranteed fitment with donor VIN cross-verification</span>
                </div>
                <span className="text-[11px] text-slate-400">
                  Tip: Check the aluminium compliance plate on your driver B-pillar or call our yard
                  on (02) 9822 4100
                </span>
              </div>

              <Button
                type="submit"
                disabled={!selectedMake}
                className="w-full sm:w-auto h-10 px-8 bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs gap-1.5 shadow-xs"
              >
                Find Compatible Parts <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </TabsContent>

        {/* =================================================================== */}
        {/* TAB 2: PLATE / REGO VEHICLE DATA PROVIDER LOOKUP (Phase 16A) */}
        {/* =================================================================== */}
        <TabsContent value="plate" className="p-6 pt-5 m-0 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Lookup by Vehicle Registration Plate (NZ / AU)
            </h3>
            <p className="text-xs text-slate-500">
              Query official motor vehicle registry specifications (CarJam / NZTA MVR) to identify your vehicle.
            </p>
          </div>

          <form onSubmit={handlePlateSubmit} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
              <div className="w-full sm:w-36 space-y-1">
                <label className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
                  Region
                </label>
                <Select
                  value={lookupCountry}
                  onValueChange={(val) => setLookupCountry(val as 'NZ' | 'AU')}
                >
                  <SelectTrigger className="h-10 text-xs bg-white border-slate-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NZ">New Zealand (NZTA)</SelectItem>
                    <SelectItem value="AU">Australia (State MVR)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 space-y-1">
                <label className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
                  Registration Plate
                </label>
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="e.g. HYP360 or NZT442"
                    value={lookupPlate}
                    onChange={(e) => setLookupPlate(e.target.value.toUpperCase())}
                    className="h-10 text-sm uppercase tracking-widest font-mono font-bold bg-white border-slate-300 pl-3 pr-10"
                    maxLength={10}
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                    <Search className="h-4 w-4" />
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loadingPlate || !lookupPlate.trim()}
                className="h-10 px-8 bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs gap-1.5"
              >
                {loadingPlate ? 'Querying Registry...' : 'Lookup Vehicle'} <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-500">
              <span className="font-semibold text-slate-700">Quick Test Plates:</span>
              <button
                type="button"
                onClick={() => setLookupPlate('HYP360')}
                className="rounded bg-slate-100 px-2 py-0.5 text-slate-700 hover:bg-blue-50 hover:text-blue-700 font-mono"
              >
                HYP360 (Toyota RAV4 Hybrid)
              </button>
              <button
                type="button"
                onClick={() => setLookupPlate('NZT442')}
                className="rounded bg-slate-100 px-2 py-0.5 text-slate-700 hover:bg-blue-50 hover:text-blue-700 font-mono"
              >
                NZT442 (Ford Ranger)
              </button>
              <button
                type="button"
                onClick={() => setLookupPlate('WRX004')}
                className="rounded bg-slate-100 px-2 py-0.5 text-slate-700 hover:bg-blue-50 hover:text-blue-700 font-mono"
              >
                WRX004 (Subaru WRX STI)
              </button>
            </div>
          </form>

          {/* Error Message */}
          {plateError && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800">
              <p className="font-semibold">{plateError}</p>
              <p className="mt-1 text-rose-600">
                You can still manually select your vehicle using the <strong>By Vehicle</strong> tab above.
              </p>
            </div>
          )}

          {/* Lookup Result Card */}
          {lookupResult && (
            <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-blue-100 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-slate-900 text-white">
                      {lookupResult.plate}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900">
                      {lookupResult.year} {lookupResult.make} {lookupResult.model}
                    </h4>
                    {lookupResult.cached && (
                      <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        Cached
                      </span>
                    )}
                  </div>
                  {lookupResult.submodel && (
                    <p className="text-xs text-slate-600 mt-0.5">{lookupResult.submodel}</p>
                  )}
                </div>

                <Button
                  type="button"
                  onClick={handleApplyLookupVehicle}
                  className="h-9 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs gap-1.5 self-start sm:self-auto"
                >
                  <ShieldCheck className="h-4 w-4" /> Find Matching Parts
                </Button>
              </div>

              {/* Vehicle Specifications Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {lookupResult.chassisCode && (
                  <div className="rounded bg-white p-2 border border-slate-100">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Chassis</span>
                    <span className="font-mono font-bold text-slate-800">{lookupResult.chassisCode}</span>
                  </div>
                )}
                {lookupResult.bodyType && (
                  <div className="rounded bg-white p-2 border border-slate-100">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Body</span>
                    <span className="text-slate-800">{lookupResult.bodyType}</span>
                  </div>
                )}
                {lookupResult.fuelType && (
                  <div className="rounded bg-white p-2 border border-slate-100">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Fuel</span>
                    <span className="text-slate-800">{lookupResult.fuelType}</span>
                  </div>
                )}
                {lookupResult.ccRating && (
                  <div className="rounded bg-white p-2 border border-slate-100">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Displacement</span>
                    <span className="text-slate-800">{lookupResult.ccRating} cc</span>
                  </div>
                )}
              </div>

              {/* Mandatory Legal & Technical Fitment Disclaimer */}
              <div className="rounded-md border border-amber-300 bg-amber-50 p-2.5 text-[11px] leading-relaxed text-amber-900 flex items-start gap-2">
                <span className="font-bold text-amber-700 shrink-0">Disclaimer:</span>
                <span>{lookupResult.disclaimer || VEHICLE_FITMENT_DISCLAIMER}</span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                <span>Data Source: {lookupResult.sourceAttribution}</span>
                {lookupResult.providerKey && (
                  <span className="font-mono text-[10px]">Provider: {lookupResult.providerKey}</span>
                )}
              </div>
            </div>
          )}
        </TabsContent>

        {/* =================================================================== */}
        {/* TAB 3: TYRE SIZE FINDER */}
        {/* =================================================================== */}
        <TabsContent value="tyres" className="p-6 pt-5 m-0 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Search by Tyre Dimensions (e.g. 205 / 55 R16)
            </h3>
            <p className="text-xs text-slate-500">
              Check the sidewall of your existing tyre or tyre placard inside the driver door jamb.
            </p>
          </div>

          <form onSubmit={handleTyreSubmit}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 max-w-2xl">
              {/* Width */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
                  Width (mm)
                </label>
                <Select value={tyreWidth} onValueChange={setTyreWidth}>
                  <SelectTrigger className="h-10 text-xs bg-white border-slate-300">
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

              {/* Profile */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
                  Profile (%)
                </label>
                <Select value={tyreProfile} onValueChange={setTyreProfile}>
                  <SelectTrigger className="h-10 text-xs bg-white border-slate-300">
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

              {/* Rim */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
                  Rim Diameter (in)
                </label>
                <Select value={tyreRim} onValueChange={setTyreRim}>
                  <SelectTrigger className="h-10 text-xs bg-white border-slate-300">
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
            </div>

            <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                <span className="font-semibold text-slate-700">Common Sizes:</span>
                <button
                  type="button"
                  onClick={() => {
                    setTyreWidth('205');
                    setTyreProfile('55');
                    setTyreRim('16');
                  }}
                  className="rounded bg-slate-100 px-2 py-0.5 text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                >
                  205/55 R16
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTyreWidth('225');
                    setTyreProfile('45');
                    setTyreRim('17');
                  }}
                  className="rounded bg-slate-100 px-2 py-0.5 text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                >
                  225/45 R17
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTyreWidth('225');
                    setTyreProfile('40');
                    setTyreRim('18');
                  }}
                  className="rounded bg-slate-100 px-2 py-0.5 text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                >
                  225/40 R18
                </button>
              </div>

              <Button
                type="submit"
                className="w-full sm:w-auto h-10 px-8 bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs gap-1.5 shadow-xs"
              >
                Search Tyre Dimensions <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </TabsContent>

        {/* =================================================================== */}
        {/* TAB 3: PART NUMBER / SERIALIZED BARCODE FINDER */}
        {/* =================================================================== */}
        <TabsContent value="partNumber" className="p-6 pt-5 m-0 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Search by OEM Part Number or Serialized Stock ID
            </h3>
            <p className="text-xs text-slate-500">
              Lookup exact components by OEM tag stamped on safety belts, or unique physical stock
              scan tags.
            </p>
          </div>

          <form onSubmit={handlePartNumberSubmit}>
            <div className="flex flex-col sm:flex-row gap-3 max-w-2xl">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Enter OEM part # or Barcode (e.g. BK21-V611B08-AC, 73210-42170, SB-2024-0891)..."
                  value={partNumber}
                  onChange={(e) => setPartNumber(e.target.value)}
                  className="h-10 pl-10 text-xs bg-white border-slate-300"
                />
              </div>

              <Button
                type="submit"
                disabled={!partNumber.trim()}
                className="h-10 px-8 bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs gap-1.5 shadow-xs shrink-0"
              >
                Lookup Part <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-500">
              <span className="font-medium text-slate-700">Sample Part Codes:</span>
              <button
                type="button"
                onClick={() => setPartNumber('BK21-V611B08-AC')}
                className="underline hover:text-blue-700"
              >
                BK21-V611B08-AC (Ford Transit)
              </button>
              <span>&bull;</span>
              <button
                type="button"
                onClick={() => setPartNumber('73210-42170')}
                className="underline hover:text-blue-700"
              >
                73210-42170 (Toyota RAV4)
              </button>
              <span>&bull;</span>
              <button
                type="button"
                onClick={() => setPartNumber('SB-2024-0891')}
                className="underline hover:text-blue-700"
              >
                SB-2024-0891 (Barcode)
              </button>
            </div>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}
