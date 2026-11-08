'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, MapPin, LogOut, Building2, LayoutDashboard, ShoppingBag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { logoutUser } from '@/lib/auth';
import { fetchCustomerProfile } from '@/lib/customer';
import { CustomerProfileDto } from '@pinnacle/contracts';

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [profile, setProfile] = React.useState<CustomerProfileDto | null>(null);
  const [loggingOut, setLoggingOut] = React.useState(false);

  React.useEffect(() => {
    fetchCustomerProfile().then(setProfile);
  }, []);

  const handleSignOut = async () => {
    setLoggingOut(true);
    await logoutUser();
  };

  const navLinks = [
    {
      href: '/account',
      label: 'Account Overview',
      icon: LayoutDashboard,
      active: pathname === '/account',
    },
    {
      href: '/account/orders',
      label: 'Order History & Returns',
      icon: ShoppingBag,
      active: pathname.startsWith('/account/orders'),
    },
    {
      href: '/account/profile',
      label: 'Profile & Contact Details',
      icon: User,
      active: pathname === '/account/profile',
    },
    {
      href: '/account/addresses',
      label: 'Delivery & Workshop Addresses',
      icon: MapPin,
      active: pathname === '/account/addresses',
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/">Home</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Customer Account</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Account Hero Banner */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start sm:items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 font-bold text-xl shrink-0">
              {profile ? `${profile.firstName[0] || 'C'}${profile.lastName[0] || 'A'}` : 'PA'}
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">
                  {profile ? `${profile.firstName} ${profile.lastName}` : 'Workshop Account'}
                </h1>

                {profile?.accountType === 'TRADE' && (
                  <Badge
                    variant="outline"
                    className="border-blue-300 bg-blue-50 text-blue-800 text-xs font-semibold gap-1"
                  >
                    <Building2 className="h-3 w-3 text-blue-600" />
                    Verified Trade Account
                  </Badge>
                )}

                {profile?.accountType === 'WHOLESALE' && (
                  <Badge
                    variant="outline"
                    className="border-purple-300 bg-purple-50 text-purple-800 text-xs font-semibold gap-1"
                  >
                    Wholesale Fleet
                  </Badge>
                )}

                {profile?.accountType === 'RETAIL' && (
                  <Badge
                    variant="outline"
                    className="border-slate-300 bg-slate-50 text-slate-700 text-xs font-semibold"
                  >
                    Retail Customer
                  </Badge>
                )}
              </div>

              <p className="text-xs text-slate-500">
                {profile?.email || 'trade@aucklandmechanical.co.nz'} · Auckland Depot Customer
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              disabled={loggingOut}
              className="text-xs text-slate-600 hover:text-slate-900 gap-1.5"
            >
              <LogOut className="h-3.5 w-3.5 text-slate-400" />
              <span>{loggingOut ? 'Signing out...' : 'Sign Out'}</span>
            </Button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mt-6 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors',
                  link.active
                    ? 'bg-blue-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100',
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Main Account Content */}
      <div>{children}</div>
    </div>
  );
}
