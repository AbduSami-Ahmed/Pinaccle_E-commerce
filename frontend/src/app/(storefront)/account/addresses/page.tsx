'use client';

import * as React from 'react';
import { MapPin, Plus, Trash2, Edit2, CheckCircle2, Building, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  fetchCustomerAddresses,
  createCustomerAddress,
  updateCustomerAddress,
  deleteCustomerAddress,
} from '@/lib/customer';
import { CustomerAddressDto, CreateCustomerAddressDto } from '@pinnacle/contracts';

const AUS_STATES = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'] as const;

export default function CustomerAddressesPage() {
  const [addresses, setAddresses] = React.useState<CustomerAddressDto[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingAddress, setEditingAddress] = React.useState<CustomerAddressDto | null>(null);

  // Form state
  const [label, setLabel] = React.useState('');
  const [line1, setLine1] = React.useState('');
  const [line2, setLine2] = React.useState('');
  const [city, setCity] = React.useState('');
  const [state, setState] = React.useState<string>('NSW');
  const [postalCode, setPostalCode] = React.useState('');
  const [isDefault, setIsDefault] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);

  const loadAddresses = React.useCallback(() => {
    fetchCustomerAddresses().then((addrs) => {
      setAddresses(addrs);
      setLoading(false);
    });
  }, []);

  React.useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  const openCreateDialog = () => {
    setEditingAddress(null);
    setLabel('');
    setLine1('');
    setLine2('');
    setCity('');
    setState('NSW');
    setPostalCode('');
    setIsDefault(addresses.length === 0);
    setDialogOpen(true);
  };

  const openEditDialog = (addr: CustomerAddressDto) => {
    setEditingAddress(addr);
    setLabel(addr.label || '');
    setLine1(addr.line1);
    setLine2(addr.line2 || '');
    setCity(addr.city);
    setState(addr.state);
    setPostalCode(addr.postalCode);
    setIsDefault(addr.isDefault);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setStatusMessage(null);

    const payload: CreateCustomerAddressDto = {
      label: label.trim() || undefined,
      line1: line1.trim(),
      line2: line2.trim() || undefined,
      city: city.trim(),
      state: state.trim().toUpperCase(),
      postalCode: postalCode.trim(),
      country: 'AU',
      isDefault,
    };

    try {
      if (editingAddress) {
        await updateCustomerAddress(editingAddress.id, payload);
        setStatusMessage('Address updated successfully.');
      } else {
        await createCustomerAddress(payload);
        setStatusMessage('New delivery address added successfully.');
      }
      setDialogOpen(false);
      loadAddresses();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error saving address');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (addressId: string) => {
    if (!confirm('Are you sure you want to remove this delivery address?')) return;
    await deleteCustomerAddress(addressId);
    setStatusMessage('Address removed.');
    loadAddresses();
  };

  const handleSetDefault = async (addressId: string) => {
    await updateCustomerAddress(addressId, { isDefault: true });
    loadAddresses();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-700" />
            Delivery & Workshop Addresses
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Saved delivery locations for pallet freight and express courier dispatches.
          </p>
        </div>

        <Button
          type="button"
          onClick={openCreateDialog}
          className="bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold gap-1.5 w-fit"
        >
          <Plus className="h-4 w-4" />
          <span>Add Delivery Address</span>
        </Button>
      </div>

      {statusMessage && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900 flex items-center gap-2 animate-in fade-in-50">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-pulse">
          <div className="h-40 rounded-xl bg-slate-100" />
          <div className="h-40 rounded-xl bg-slate-100" />
        </div>
      ) : addresses.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center space-y-3">
          <div className="h-12 w-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
            <MapPin className="h-6 w-6 stroke-[1.5]" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">No Delivery Addresses Saved</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Add your workshop or residential delivery destination for seamless order checkout and
            shipping calculations.
          </p>
          <Button onClick={openCreateDialog} size="sm" className="bg-blue-700 text-white text-xs">
            Add First Address
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {addresses.map((addr) => (
            <div
              key={addr.id}
              className="relative flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:border-slate-300"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-blue-700 shrink-0" />
                    <span className="font-bold text-sm text-slate-900">
                      {addr.label || 'Delivery Address'}
                    </span>
                  </div>

                  {addr.isDefault && (
                    <Badge
                      variant="outline"
                      className="border-emerald-300 bg-emerald-50 text-emerald-800 text-[10px] font-semibold gap-1 shrink-0"
                    >
                      <Check className="h-3 w-3" /> Default Delivery
                    </Badge>
                  )}
                </div>

                <div className="text-xs text-slate-600 leading-relaxed font-normal">
                  <p className="font-medium text-slate-900">{addr.line1}</p>
                  {addr.line2 && <p className="text-slate-600">{addr.line2}</p>}
                  <p className="text-slate-700">
                    {addr.city}, {addr.state} {addr.postalCode}
                  </p>
                  <p className="text-slate-400 text-[11px]">Australia</p>
                </div>
              </div>

              {/* Card Actions */}
              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                <div>
                  {!addr.isDefault && (
                    <button
                      type="button"
                      onClick={() => handleSetDefault(addr.id)}
                      className="text-blue-700 hover:text-blue-800 font-semibold hover:underline"
                    >
                      Set as Default
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(addr)}
                    className="h-8 px-2.5 text-xs text-slate-600 gap-1"
                  >
                    <Edit2 className="h-3 w-3" />
                    <span>Edit</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(addr.id)}
                    className="h-8 px-2.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Dialog Modal */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md p-6 bg-white sm:rounded-xl">
          <DialogHeader className="pb-3 border-b border-slate-100">
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-blue-700" />
              {editingAddress ? 'Edit Delivery Address' : 'Add New Delivery Address'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2 text-xs">
            <div className="space-y-1">
              <label
                htmlFor="label"
                className="font-bold text-slate-700 uppercase tracking-wide text-[10px]"
              >
                Address Label (Optional)
              </label>
              <Input
                id="label"
                placeholder="e.g. Prestons Workshop Bay 2, Main Warehouse"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="text-xs bg-slate-50 focus:bg-white"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="line1"
                className="font-bold text-slate-700 uppercase tracking-wide text-[10px]"
              >
                Street Address *
              </label>
              <Input
                id="line1"
                required
                placeholder="e.g. 42 Jedda Road"
                value={line1}
                onChange={(e) => setLine1(e.target.value)}
                className="text-xs bg-slate-50 focus:bg-white"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="line2"
                className="font-bold text-slate-700 uppercase tracking-wide text-[10px]"
              >
                Unit / Suite / Bay (Optional)
              </label>
              <Input
                id="line2"
                placeholder="e.g. Unit 3"
                value={line2}
                onChange={(e) => setLine2(e.target.value)}
                className="text-xs bg-slate-50 focus:bg-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label
                  htmlFor="city"
                  className="font-bold text-slate-700 uppercase tracking-wide text-[10px]"
                >
                  City / Suburb *
                </label>
                <Input
                  id="city"
                  required
                  placeholder="e.g. Prestons"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="text-xs bg-slate-50 focus:bg-white"
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="state"
                  className="font-bold text-slate-700 uppercase tracking-wide text-[10px]"
                >
                  State *
                </label>
                <select
                  id="state"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="h-9 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  {AUS_STATES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="postalCode"
                className="font-bold text-slate-700 uppercase tracking-wide text-[10px]"
              >
                Postal Code *
              </label>
              <Input
                id="postalCode"
                required
                placeholder="e.g. 2170"
                maxLength={4}
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                className="text-xs bg-slate-50 focus:bg-white"
              />
            </div>

            <div className="pt-2 flex items-center gap-2">
              <input
                id="isDefault"
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="isDefault" className="text-xs text-slate-700 cursor-pointer">
                Set as my default delivery destination
              </label>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDialogOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
                className="bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold"
              >
                {submitting ? 'Saving...' : editingAddress ? 'Update Address' : 'Add Address'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
