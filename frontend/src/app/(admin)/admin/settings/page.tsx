'use client';

import * as React from 'react';
import {
  AlertTriangle,
  Building,
  CheckCircle2,
  DollarSign,
  FileText,
  RefreshCw,
  Save,
  Truck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BusinessSettingsDto } from '@pinnacle/contracts';
import { fetchBusinessSettings, updateBusinessSettings } from '@/lib/admin';

export default function AdminSettingsPage() {
  const [, setSettings] = React.useState<BusinessSettingsDto | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Form state
  const [formData, setFormData] = React.useState<BusinessSettingsDto | null>(null);

  const loadSettings = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchBusinessSettings();
      setSettings(data);
      setFormData(data);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const updated = await updateBusinessSettings(formData);
      setSettings(updated);
      setFormData(updated);
      setSuccessMsg('Business settings updated successfully and logged to audit trail.');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update store settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Business & Store Settings
            </h1>
            <Badge variant="outline" className="font-mono text-xs">
              NZ MVD-89211
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Statutory trade registration, New Zealand GST tax settings, Auckland Penrose depot fulfillment, and returns policy.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadSettings}
            disabled={loading || saving}
            className="h-8 text-xs gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Reload
          </Button>
        </div>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {formData ? (
        <form onSubmit={handleSave} className="space-y-6">
          {/* 1. Legal Identity & Trade Licensing */}
          <Card className="border-slate-200 shadow-xs">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-blue-600" />
                <CardTitle className="text-sm font-semibold text-slate-900">
                  Legal Identity & Trade Licensing
                </CardTitle>
              </div>
              <CardDescription className="text-xs">
                Statutory registration details required on tax invoices and public storefront footer.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 text-xs">
              <div>
                <label className="font-medium text-slate-700 block mb-1">Company Legal Name</label>
                <Input
                  value={formData.company.legalName}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      company: { ...formData.company, legalName: e.target.value },
                    })
                  }
                  className="h-9 text-xs"
                />
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1">Public Trading Name</label>
                <Input
                  value={formData.company.tradeName}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      company: { ...formData.company, tradeName: e.target.value },
                    })
                  }
                  className="h-9 text-xs"
                />
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1">New Zealand Business Number (NZBN)</label>
                <Input
                  value={formData.company.abn}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      company: { ...formData.company, abn: e.target.value },
                    })
                  }
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1">
                  Registered Motor Vehicle Trader (MVD) Licence
                </label>
                <Input
                  value={formData.company.licenseNumber}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      company: { ...formData.company, licenseNumber: e.target.value },
                    })
                  }
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1">Support Telephone</label>
                <Input
                  value={formData.company.phone}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      company: { ...formData.company, phone: e.target.value },
                    })
                  }
                  className="h-9 text-xs"
                />
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1">Support Email</label>
                <Input
                  value={formData.company.email}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      company: { ...formData.company, email: e.target.value },
                    })
                  }
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="font-medium text-slate-700 block mb-1">Operating Hours</label>
                <Input
                  value={formData.company.operatingHours}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      company: { ...formData.company, operatingHours: e.target.value },
                    })
                  }
                  className="h-9 text-xs"
                />
              </div>
            </CardContent>
          </Card>

          {/* 2. Financial & Tax Configuration */}
          <Card className="border-slate-200 shadow-xs">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-emerald-600" />
                <CardTitle className="text-sm font-semibold text-slate-900">
                  Financial & Tax Configuration (NZ IRD Statutory)
                </CardTitle>
              </div>
              <CardDescription className="text-xs">
                Governs currency calculations, checkout tax extraction, and storefront pricing display.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3 text-xs">
              <div>
                <label className="font-medium text-slate-700 block mb-1">Currency</label>
                <Input
                  value={formData.financial.currency}
                  disabled
                  className="h-9 text-xs font-mono bg-slate-50"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Locked to New Zealand Dollars (NZD)</span>
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1">Statutory Tax Name</label>
                <Input
                  value={formData.financial.taxName}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      financial: { ...formData.financial, taxName: e.target.value },
                    })
                  }
                  className="h-9 text-xs"
                />
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1">GST Statutory Rate (%)</label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.financial.taxRatePercent}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      financial: {
                        ...formData.financial,
                        taxRatePercent: parseFloat(e.target.value) || 0,
                      },
                    })
                  }
                  className="h-9 text-xs font-mono"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">NZ IRD standard rate is 15.0%</span>
              </div>
            </CardContent>
          </Card>

          {/* 3. Depot Collection & Courier Shipping */}
          <Card className="border-slate-200 shadow-xs">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-amber-600" />
                <CardTitle className="text-sm font-semibold text-slate-900">
                  Depot Pickup & Courier Dispatch
                </CardTitle>
              </div>
              <CardDescription className="text-xs">
                Trade counter click & collect instructions and default courier consignments.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 text-xs">
              <div className="sm:col-span-2">
                <label className="font-medium text-slate-700 block mb-1">Depot Hub Name</label>
                <Input
                  value={formData.fulfillment.depotName}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      fulfillment: { ...formData.fulfillment, depotName: e.target.value },
                    })
                  }
                  className="h-9 text-xs"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="font-medium text-slate-700 block mb-1">Physical Address</label>
                <Input
                  value={formData.fulfillment.depotAddress}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      fulfillment: { ...formData.fulfillment, depotAddress: e.target.value },
                    })
                  }
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="font-medium text-slate-700 block mb-1">Pickup Counter Instructions</label>
                <Input
                  value={formData.fulfillment.depotInstructions}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      fulfillment: { ...formData.fulfillment, depotInstructions: e.target.value },
                    })
                  }
                  className="h-9 text-xs"
                />
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1">
                  CourierPost Road Express Default Fee ($NZD)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.fulfillment.standardShippingFee}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      fulfillment: {
                        ...formData.fulfillment,
                        standardShippingFee: parseFloat(e.target.value) || 0,
                      },
                    })
                  }
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1">
                  CourierPost Premium Express Default Fee ($NZD)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.fulfillment.expressShippingFee}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      fulfillment: {
                        ...formData.fulfillment,
                        expressShippingFee: parseFloat(e.target.value) || 0,
                      },
                    })
                  }
                  className="h-9 text-xs font-mono"
                />
              </div>
            </CardContent>
          </Card>

          {/* 4. Policy & Consumer Guarantees Act (CGA) */}
          <Card className="border-slate-200 shadow-xs">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-purple-600" />
                <CardTitle className="text-sm font-semibold text-slate-900">
                  Return Policies & Consumer Guarantees Act (CGA) Disclaimers
                </CardTitle>
              </div>
              <CardDescription className="text-xs">
                Governs customer self-service return eligibility and second-hand safety part certifications.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 text-xs">
              <div>
                <label className="font-medium text-slate-700 block mb-1">Standard Return Window (Days)</label>
                <Input
                  type="number"
                  value={formData.policies.returnWindowDays}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      policies: {
                        ...formData.policies,
                        returnWindowDays: parseInt(e.target.value, 10) || 30,
                      },
                    })
                  }
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1">
                  Discretionary Restocking Fee (%)
                </label>
                <Input
                  type="number"
                  value={formData.policies.discretionaryRestockingFeePercent}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      policies: {
                        ...formData.policies,
                        discretionaryRestockingFeePercent: parseInt(e.target.value, 10) || 0,
                      },
                    })
                  }
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="font-medium text-slate-700 block mb-1">
                  Reclaimed Component Statutory Warranty Disclaimer
                </label>
                <textarea
                  rows={3}
                  value={formData.policies.warrantyDisclaimer}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      policies: {
                        ...formData.policies,
                        warrantyDisclaimer: e.target.value,
                      },
                    })
                  }
                  className="w-full rounded-md border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden"
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit Action */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="submit"
              disabled={saving}
              className="h-9 text-xs px-5 bg-blue-600 hover:bg-blue-700 gap-1.5"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Settings & Log Audit'}
            </Button>
          </div>
        </form>
      ) : (
        <div className="py-12 text-center text-slate-500 text-xs">Loading settings...</div>
      )}
    </div>
  );
}