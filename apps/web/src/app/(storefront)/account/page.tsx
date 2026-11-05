'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  MapPin,
  ShoppingCart,
  ShieldCheck,
  ArrowRight,
  Phone,
  Mail,
  Calendar,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { fetchCustomerProfile, fetchCustomerAddresses } from '@/lib/customer';
import { fetchCart } from '@/lib/cart';
import { CustomerProfileDto, CustomerAddressDto, CartDto } from '@pinnacle/contracts';

export default function AccountOverviewPage() {
  const [profile, setProfile] = React.useState<CustomerProfileDto | null>(null);
  const [defaultAddress, setDefaultAddress] = React.useState<CustomerAddressDto | null>(null);
  const [cart, setCart] = React.useState<CartDto | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    Promise.all([fetchCustomerProfile(), fetchCustomerAddresses(), fetchCart()]).then(
      ([prof, addrs, c]) => {
        setProfile(prof);
        const def = addrs.find((a) => a.isDefault) || addrs[0] || null;
        setDefaultAddress(def);
        setCart(c);
        setLoading(false);
      },
    );
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
        <div className="h-44 rounded-xl bg-slate-100" />
        <div className="h-44 rounded-xl bg-slate-100" />
        <div className="h-44 rounded-xl bg-slate-100" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 3 Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Account Status & Terms */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
              <span>Account Status</span>
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
            </div>

            <div className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span>
                {profile?.accountType === 'TRADE' ? 'Trade Workshop Tier' : 'Retail Customer'}
              </span>
              <Badge
                variant="outline"
                className="border-emerald-300 bg-emerald-50 text-emerald-800 text-[10px]"
              >
                Active
              </Badge>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {profile?.accountType === 'TRADE'
                ? 'Commercial garage terms enabled. Automatic GST breakdown & priority dispatch queue.'
                : 'Standard consumer account. Upgrade to Trade Account by providing workshop MVRL license.'}
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Member Since:</span>
            <span className="font-semibold text-slate-800 flex items-center gap-1">
              <Calendar className="h-3 w-3 text-slate-400" />
              {profile
                ? new Date(profile.createdAt).toLocaleDateString('en-AU', {
                    month: 'short',
                    year: 'numeric',
                  })
                : '2026'}
            </span>
          </div>
        </div>

        {/* Card 2: Primary Delivery Address */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
              <span>Primary Address</span>
              <MapPin className="h-4 w-4 text-blue-700" />
            </div>

            {defaultAddress ? (
              <div className="space-y-1">
                <div className="text-sm font-bold text-slate-900">
                  {defaultAddress.label || 'Default Delivery'}
                </div>
                <div className="text-xs text-slate-600 leading-snug">
                  {defaultAddress.line1}
                  {defaultAddress.line2 && `, ${defaultAddress.line2}`}
                  <br />
                  {defaultAddress.city} {defaultAddress.state} {defaultAddress.postalCode}
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500 italic py-2">
                No delivery addresses saved yet.
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100">
            <Button asChild variant="outline" size="sm" className="w-full text-xs gap-1.5">
              <Link href="/account/addresses">
                <span>Manage Addresses</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Card 3: Active Cart Summary */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
              <span>Current Cart</span>
              <ShoppingCart className="h-4 w-4 text-blue-700" />
            </div>

            <div className="space-y-1">
              <div className="text-2xl font-extrabold text-slate-900">
                ${cart ? cart.totals.subtotal.toFixed(2) : '0.00'}
              </div>
              <p className="text-xs text-slate-500">
                {cart && cart.items.length > 0
                  ? `${cart.totalPacksCount} pack(s) · ${cart.totalPhysicalUnitsCount} physical base units`
                  : 'Your cart is currently empty'}
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100">
            <Button
              asChild
              size="sm"
              className="w-full bg-blue-700 hover:bg-blue-800 text-white text-xs gap-1.5"
            >
              <Link href="/cart">
                <span>View Cart & Checkout</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Account Info & Security Boundary Notice */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-slate-700" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Customer Self-Service & Privacy Boundary
          </h3>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
          Under Pinnacle Auto Spares RBAC controls and Australian Privacy Principles, customer
          accounts are strictly segregated. You can only inspect and manage your own profile,
          delivery addresses, carts, and order history. Wholesale price margins and other customer
          records are cryptographically restricted.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1 border-t border-slate-200">
          <div className="flex items-center gap-2 text-slate-700">
            <Mail className="h-3.5 w-3.5 text-slate-400" />
            <span>
              Contact Email: <strong>{profile?.email}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2 text-slate-700">
            <Phone className="h-3.5 w-3.5 text-slate-400" />
            <span>
              Contact Phone: <strong>{profile?.phone || 'Not provided'}</strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
