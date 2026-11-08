'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, Loader2, PackagePlus, QrCode } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ConditionGrade, ProductListItemDto, WarehouseDto } from '@pinnacle/contracts';
import { fetchProducts } from '@/lib/catalog';
import { fetchWarehouses, receiveBulkStock, receiveSerializedPart } from '@/lib/inventory';

export default function AdminReceiveStockPage() {
  const router = useRouter();

  const [warehouses, setWarehouses] = React.useState<WarehouseDto[]>([]);
  const [products, setProducts] = React.useState<ProductListItemDto[]>([]);
  const [loadingInitial, setLoadingInitial] = React.useState(true);

  // Intake Mode: Bulk Tyres vs Serialized Seat Belts
  const [intakeMode, setIntakeMode] = React.useState<'BULK' | 'SERIALIZED'>('BULK');

  // Common Fields
  const [warehouseId, setWarehouseId] = React.useState('');
  const [productId, setProductId] = React.useState('');
  const [locationBin, setLocationBin] = React.useState('AISLE-01-BIN-A');
  const [costPrice, setCostPrice] = React.useState('85.00');
  const [referencePo, setReferencePo] = React.useState('');

  // Bulk Fields
  const [quantity, setQuantity] = React.useState<number>(20);

  // Serialized Fields
  const [stockBarcode, setStockBarcode] = React.useState('');
  const [autoBarcode, setAutoBarcode] = React.useState(true);
  const [donorVehicleVin, setDonorVehicleVin] = React.useState('');
  const [conditionGrade, setConditionGrade] = React.useState<ConditionGrade>('GRADE_A_LIKE_NEW');
  const [conditionNotes, setConditionNotes] = React.useState('');
  const [pretensionerResistanceOhms, setPretensionerResistanceOhms] = React.useState('2.15');
  const [photoUrl, setPhotoUrl] = React.useState('');

  // Submission State
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    Promise.all([fetchWarehouses(), fetchProducts({ pageSize: 100 })])
      .then(([whs, prods]) => {
        setWarehouses(whs);
        setProducts(prods.data);
        if (whs.length > 0 && whs[0]) setWarehouseId(whs[0].id);
        if (prods.data.length > 0 && prods.data[0]) {
          setProductId(prods.data[0].id);
          // Auto-select mode according to first product
          if (prods.data[0].productType === 'INDIVIDUALLY_SERIALIZED') {
            setIntakeMode('SERIALIZED');
          }
        }
      })
      .finally(() => setLoadingInitial(false));
  }, []);

  const handleProductSelect = (selectedId: string) => {
    setProductId(selectedId);
    const prod = products.find((p) => p.id === selectedId);
    if (prod) {
      setIntakeMode(prod.productType === 'INDIVIDUALLY_SERIALIZED' ? 'SERIALIZED' : 'BULK');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (intakeMode === 'BULK') {
        const res = await receiveBulkStock({
          productId,
          warehouseId,
          locationBin: locationBin.trim().toUpperCase(),
          quantity: Number(quantity),
          costPrice,
          referencePo: referencePo || undefined,
          reasonCode: 'PURCHASE_ORDER_RECEIPT',
        });
        setSuccessMessage(`Successfully received ${quantity} units into bin ${res.locationBin}.`);
      } else {
        const res = await receiveSerializedPart({
          productId,
          warehouseId,
          stockBarcode: autoBarcode ? undefined : stockBarcode.trim(),
          donorVehicleVin: donorVehicleVin.trim() || undefined,
          conditionGrade,
          conditionNotes: conditionNotes.trim() || 'Visual and squib electrical check passed.',
          pretensionerResistanceOhms: pretensionerResistanceOhms || undefined,
          actualPhotos: photoUrl.trim() ? [photoUrl.trim()] : [],
          locationBin: locationBin.trim().toUpperCase(),
          costPrice,
          referencePo: referencePo || undefined,
          reasonCode: 'USED_SEAT_BELT_SERIALIZED_INWARD',
        });
        setSuccessMessage(
          `Successfully recorded serialized item ${res.stockBarcode} (${res.conditionGrade}).`,
        );
      }

      setTimeout(() => {
        router.push('/admin/inventory');
      }, 1000);
    } catch (err) {
      setErrorMessage((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/admin/dashboard">Admin</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/admin/inventory">Inventory</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Receive Stock</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="sm" className="h-8 w-8 p-0">
            <Link href="/admin/inventory">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <PackagePlus className="h-6 w-6 text-slate-700" />
              <span>Inward Physical Stock Intake</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Receiving stock writes an atomic RECEIPT entry into the immutable movement ledger.
            </p>
          </div>
        </div>
      </div>

      {errorMessage && (
        <Alert variant="destructive">
          <AlertTitle>Intake Error</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert variant="default" className="border-emerald-500 bg-emerald-50 text-emerald-900">
          <Check className="h-4 w-4 text-emerald-600" />
          <AlertTitle>Intake Recorded</AlertTitle>
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Destination & Product Selection</CardTitle>
            <CardDescription>
              Assign the arriving physical parts to a warehouse facility and bin location.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Target Warehouse *
                </label>
                <select
                  required
                  className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 py-1 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
                  value={warehouseId}
                  onChange={(e) => setWarehouseId(e.target.value)}
                  disabled={loadingInitial}
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Location Bin Tag *
                </label>
                <Input
                  required
                  placeholder="e.g. AISLE-02-RACK-C or BIN-SB-04"
                  value={locationBin}
                  onChange={(e) => setLocationBin(e.target.value)}
                  className="font-mono uppercase text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Catalogue Product *
              </label>
              <select
                required
                className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 py-1 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
                value={productId}
                onChange={(e) => handleProductSelect(e.target.value)}
                disabled={loadingInitial}
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    [{p.sku}] {p.title} (
                    {p.productType === 'BULK_QUANTITY' ? 'Bulk Tyre' : 'Serialized Belt'})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Unit Cost Price ($ NZD) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-sm text-slate-400 font-medium">
                    $
                  </span>
                  <Input
                    type="number"
                    step="0.01"
                    required
                    min={0.01}
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    className="pl-7 font-mono text-sm"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Wholesale receipt cost. Protected by RBAC permission.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Purchase Order / Docket #
                </label>
                <Input
                  placeholder="e.g. PO-2026-8819"
                  value={referencePo}
                  onChange={(e) => setReferencePo(e.target.value)}
                  className="font-mono text-xs"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bulk Intake Specific Card */}
        {intakeMode === 'BULK' && (
          <Card className="border-amber-200 bg-amber-50/20">
            <CardHeader>
              <CardTitle className="text-amber-950 flex items-center gap-2">
                <span>Bulk Quantity Stock Arrival (Tyres)</span>
              </CardTitle>
              <CardDescription>
                Arrival of brand-new commodity tyres tracked as an aggregated integer pool.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Physical Base Quantity Received *
                </label>
                <Input
                  type="number"
                  required
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="max-w-xs font-mono font-bold text-base"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Single base units. Customer sale tiers (Pair: 2x, Set: 4x) will consume from this
                  count.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Serialized Intake Specific Card */}
        {intakeMode === 'SERIALIZED' && (
          <Card className="border-blue-200 bg-blue-50/20">
            <CardHeader>
              <CardTitle className="text-blue-950 flex items-center gap-2">
                <QrCode className="h-5 w-5 text-blue-600" />
                <span>Serialized Used Safety Component Intake (Seat Belts)</span>
              </CardTitle>
              <CardDescription>
                Individually scanned physical part with condition grading, donor vehicle VIN, and
                inspection readings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Stock Barcode Tag
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoBarcode}
                        onChange={(e) => setAutoBarcode(e.target.checked)}
                        className="rounded border-slate-300"
                      />
                      Auto-generate
                    </label>
                  </div>
                  <Input
                    placeholder={
                      autoBarcode ? 'Generated upon receipt...' : 'e.g. BC-SBLT-RAV4-991'
                    }
                    value={stockBarcode}
                    onChange={(e) => setStockBarcode(e.target.value)}
                    disabled={autoBarcode}
                    className="font-mono text-xs uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Donor Vehicle VIN
                  </label>
                  <Input
                    placeholder="17-character VIN (e.g. JT3HP10V277192831)"
                    value={donorVehicleVin}
                    onChange={(e) => setDonorVehicleVin(e.target.value)}
                    className="font-mono text-xs uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Visual Condition Grade *
                  </label>
                  <select
                    required
                    className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 py-1 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
                    value={conditionGrade}
                    onChange={(e) => setConditionGrade(e.target.value as ConditionGrade)}
                  >
                    <option value="NEW_SURPLUS">New Surplus (Uninstalled OEM)</option>
                    <option value="GRADE_A_LIKE_NEW">Grade A: Like New (Pristine Webbing)</option>
                    <option value="GRADE_B_MINOR_WEAR">Grade B: Minor Cosmetic Wear</option>
                    <option value="GRADE_C_FUNCTIONAL_BLEMISH">Grade C: Functional Blemish</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Squib Resistance (Ohms)
                  </label>
                  <Input
                    placeholder="e.g. 2.15"
                    value={pretensionerResistanceOhms}
                    onChange={(e) => setPretensionerResistanceOhms(e.target.value)}
                    className="font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Safety Inspection & Condition Notes *
                </label>
                <textarea
                  required
                  rows={3}
                  className="w-full rounded-md border border-slate-300 bg-white p-2.5 text-xs shadow-sm focus:border-slate-500 focus:outline-none"
                  placeholder="Record retractor recoil test results, pyrotechnic squib test readings, webbing integrity, and latch release verification..."
                  value={conditionNotes}
                  onChange={(e) => setConditionNotes(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Inspection Photograph URL
                </label>
                <Input
                  placeholder="https://s3.ap-southeast-2.amazonaws.com/pinnacle-storage/..."
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  className="text-xs"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => router.push('/admin/inventory')}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={isSubmitting || loadingInitial}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Recording Inward...
              </>
            ) : (
              'Record Stock Inward'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
