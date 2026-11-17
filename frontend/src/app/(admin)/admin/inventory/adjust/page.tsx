'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ArrowLeft, Check, Loader2, SlidersHorizontal } from 'lucide-react';
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
import { ProductStockSummaryDto } from '@pinnacle/contracts';
import { adjustStock, fetchInventoryOverview } from '@/lib/inventory';

export default function AdminStockAdjustmentPage() {
  const router = useRouter();

  const [summaries, setSummaries] = React.useState<ProductStockSummaryDto[]>([]);
  const [selectedProductId, setSelectedProductId] = React.useState('');
  const [selectedItemId, setSelectedItemId] = React.useState('');
  const [direction, setDirection] = React.useState<'ADD' | 'DEDUCT'>('ADD');
  const [qty, setQty] = React.useState<number>(1);
  const [reasonCode, setReasonCode] = React.useState('CYCLE_COUNT_DISCREPANCY');
  const [referenceNote, setReferenceNote] = React.useState('');

  const [loading, setLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetchInventoryOverview({ pageSize: 100 })
      .then((res) => {
        setSummaries(res.data);
        if (res.data.length > 0 && res.data[0]) {
          setSelectedProductId(res.data[0].productId);
          const firstItem = res.data[0].inventoryItems[0];
          if (firstItem) setSelectedItemId(firstItem.id);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const activeProduct = summaries.find((s) => s.productId === selectedProductId);
  const activeItem = activeProduct?.inventoryItems.find((i) => i.id === selectedItemId);

  const handleProductChange = (prodId: string) => {
    setSelectedProductId(prodId);
    const prod = summaries.find((s) => s.productId === prodId);
    if (prod && prod.inventoryItems.length > 0 && prod.inventoryItems[0]) {
      setSelectedItemId(prod.inventoryItems[0].id);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const signedQty = direction === 'ADD' ? Number(qty) : -Number(qty);

      const res = await adjustStock({
        inventoryItemId: selectedItemId,
        quantityChange: signedQty,
        reasonCode,
        referenceNote: referenceNote || undefined,
      });

      setSuccessMessage(`Adjustment successful. New on-hand balance: ${res.newQuantity} units.`);
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
            <BreadcrumbPage>Adjust Stock</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="sm" className="h-8 w-8 p-0">
            <Link href="/admin/inventory">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <SlidersHorizontal className="h-6 w-6 text-slate-700" />
              <span>Adjust Stock Level</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Update stock on hand for count corrections, damaged parts, or workshop use.
            </p>
          </div>
        </div>
      </div>

      {errorMessage && (
        <Alert variant="destructive">
          <AlertTitle>Adjustment Error</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert variant="default" className="border-emerald-500 bg-emerald-50 text-emerald-900">
          <Check className="h-4 w-4 text-emerald-600" />
          <AlertTitle>Adjustment Saved</AlertTitle>
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Product &amp; Warehouse Bin</CardTitle>
            <CardDescription>
              Choose the product and warehouse storage bin to update.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Product *
              </label>
              <select
                required
                className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 py-1 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
                value={selectedProductId}
                onChange={(e) => handleProductChange(e.target.value)}
                disabled={loading}
              >
                {summaries.map((s) => (
                  <option key={s.productId} value={s.productId}>
                    [{s.sku}] {s.title}
                  </option>
                ))}
              </select>
            </div>

            {activeProduct && activeProduct.inventoryItems.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Warehouse &amp; Bin Location *
                </label>
                <select
                  required
                  className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 py-1 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
                  value={selectedItemId}
                  onChange={(e) => setSelectedItemId(e.target.value)}
                >
                  {activeProduct.inventoryItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.warehouseName} ({item.warehouseCode}) — Bin: {item.locationBin} (On
                      Hand: {item.quantityOnHand}, Reserved: {item.quantityReserved})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {activeItem && (
              <div className="p-3 bg-slate-50 rounded-md border border-slate-200 text-xs text-slate-600 grid grid-cols-3 gap-2">
                <div>
                  <span className="text-slate-400 block">In Stock (On Hand)</span>
                  <span className="font-bold font-mono text-slate-900 text-sm">
                    {activeItem.quantityOnHand} units
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Reserved for Orders</span>
                  <span className="font-bold font-mono text-amber-600 text-sm">
                    {activeItem.quantityReserved} units
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Available to Sell</span>
                  <span className="font-bold font-mono text-emerald-600 text-sm">
                    {activeItem.quantityAvailable} units
                  </span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Adjustment Type *
                </label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={direction === 'ADD' ? 'default' : 'outline'}
                    size="sm"
                    className="flex-1"
                    onClick={() => setDirection('ADD')}
                  >
                    + Increase
                  </Button>
                  <Button
                    type="button"
                    variant={direction === 'DEDUCT' ? 'default' : 'outline'}
                    size="sm"
                    className="flex-1"
                    onClick={() => setDirection('DEDUCT')}
                  >
                    – Decrease
                  </Button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Quantity *
                </label>
                <Input
                  type="number"
                  required
                  min={1}
                  value={qty}
                  onChange={(e) => setQty(Number(e.target.value))}
                  className="font-mono text-sm font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Reason for Adjustment *
              </label>
              <select
                required
                className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 py-1 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
                value={reasonCode}
                onChange={(e) => setReasonCode(e.target.value)}
              >
                <option value="CYCLE_COUNT_DISCREPANCY">Stock Count Correction</option>
                <option value="DAMAGED_WRITE_OFF">Damaged / Defective Part</option>
                <option value="INTERNAL_USE">Used in Workshop</option>
                <option value="SCRAP_EXPIRED">Scrapped or Expired Stock</option>
                <option value="DATA_MIGRATION_INITIAL">Initial Stocktake Setup</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Notes / Reason Details
              </label>
              <Input
                placeholder="e.g. Counted during monthly stocktake"
                value={referenceNote}
                onChange={(e) => setReferenceNote(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="p-3 bg-amber-50 rounded-md border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Negative stock check</strong>: You cannot reduce stock below zero or below
                items already reserved for customer orders ({activeItem?.quantityReserved ?? 0} units).
              </span>
            </div>
          </CardContent>
        </Card>

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
          <Button type="submit" size="sm" disabled={isSubmitting || loading}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving Adjustment...
              </>
            ) : (
              'Save Adjustment'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
