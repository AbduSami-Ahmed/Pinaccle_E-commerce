'use client';

import * as React from 'react';
import { User, CheckCircle2, AlertCircle, Save, Phone, Mail, Building2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { fetchCustomerProfile, updateCustomerProfile } from '@/lib/customer';
import { CustomerProfileDto } from '@pinnacle/contracts';

export default function CustomerProfilePage() {
  const [profile, setProfile] = React.useState<CustomerProfileDto | null>(null);
  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetchCustomerProfile().then((p) => {
      setProfile(p);
      setFirstName(p.firstName);
      setLastName(p.lastName);
      setPhone(p.phone || '');
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const updated = await updateCustomerProfile({
        firstName,
        lastName,
        phone,
      });
      setProfile(updated);
      setSuccessMessage('Profile details updated successfully.');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <User className="h-5 w-5 text-blue-700" />
            Permitted Profile Fields
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Keep your workshop contact details current for delivery dispatches and invoice
            generation.
          </p>
        </div>

        {successMessage && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900 flex items-center gap-2 animate-in fade-in-50">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900 flex items-center gap-2 animate-in fade-in-50">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label
                htmlFor="firstName"
                className="font-bold text-slate-700 uppercase tracking-wide text-[11px]"
              >
                First Name *
              </label>
              <Input
                id="firstName"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="text-xs bg-slate-50 focus:bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="lastName"
                className="font-bold text-slate-700 uppercase tracking-wide text-[11px]"
              >
                Last Name *
              </label>
              <Input
                id="lastName"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="text-xs bg-slate-50 focus:bg-white"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="phone"
              className="font-bold text-slate-700 uppercase tracking-wide text-[11px] flex items-center gap-1.5"
            >
              <Phone className="h-3 w-3 text-slate-400" /> Contact Phone
            </label>
            <Input
              id="phone"
              placeholder="e.g. 0412 345 678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="text-xs bg-slate-50 focus:bg-white"
            />
            <p className="text-[10px] text-slate-400">
              Used by courier freight drivers (StarTrack / TNT) for depot delivery notifications.
            </p>
          </div>

          <div className="border-t border-slate-100 pt-4 space-y-4">
            {/* Read-Only Account Email */}
            <div className="space-y-1.5 opacity-80">
              <label className="font-bold text-slate-600 uppercase tracking-wide text-[11px] flex items-center gap-1.5">
                <Mail className="h-3 w-3 text-slate-400" /> Registered Email Address
              </label>
              <Input
                disabled
                value={profile?.email || ''}
                className="text-xs bg-slate-100 text-slate-500 cursor-not-allowed"
              />
              <p className="text-[10px] text-slate-400 flex items-center gap-1">
                <Lock className="h-2.5 w-2.5" /> Identity provider email cannot be modified from
                customer self-service.
              </p>
            </div>

            {/* Read-Only Account Type */}
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wide text-slate-600 block">
                Commercial Account Tier
              </span>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="border-blue-300 bg-blue-50 text-blue-900 font-semibold text-xs"
                >
                  <Building2 className="mr-1 h-3.5 w-3.5 text-blue-700" />
                  {profile?.accountType || 'RETAIL'}
                </Badge>
                <span className="text-slate-500 text-[11px]">
                  {profile?.accountType === 'TRADE'
                    ? 'Verified licensed workshop pricing tier.'
                    : 'Standard retail consumer tier.'}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs gap-1.5"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{saving ? 'Saving Changes...' : 'Save Profile Changes'}</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
