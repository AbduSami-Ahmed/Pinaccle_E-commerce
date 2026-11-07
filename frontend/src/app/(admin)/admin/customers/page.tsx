'use client';

import * as React from 'react';
import {
  Building2,
  Car,
  Eye,
  Lock,
  Mail,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  AdminCustomerDetailDto,
  AdminCustomerListItemDto,
} from '@pinnacle/contracts';
import { fetchAdminCustomerDetail, fetchAdminCustomers } from '@/lib/admin';

export default function AdminCustomersPage() {
  const [customers, setCustomers] = React.useState<AdminCustomerListItemDto[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [selectedCustomerId, setSelectedCustomerId] = React.useState<string | null>(null);
  const [detail, setDetail] = React.useState<AdminCustomerDetailDto | null>(null);
  const [detailLoading, setDetailLoading] = React.useState(false);

  const loadCustomers = React.useCallback(async (searchTerm?: string) => {
    setLoading(true);
    try {
      const data = await fetchAdminCustomers({ search: searchTerm, page: 1, limit: 50 });
      setCustomers(data.customers);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadCustomers(search);
  }, [search, loadCustomers]);

  const openDetail = async (id: string) => {
    setSelectedCustomerId(id);
    setDetailLoading(true);
    try {
      const d = await fetchAdminCustomerDetail(id);
      setDetail(d);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setSelectedCustomerId(null);
    setDetail(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Customer Directory
            </h1>
            <Badge variant="outline" className="font-mono text-xs">
              Privacy-Protected
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Registered trade and retail accounts, address books, and lifetime checkout history.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadCustomers(search)}
            disabled={loading}
            className="h-8 text-xs gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by name, company, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 text-xs h-9 bg-slate-50"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 w-full sm:w-auto justify-end">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span>PII Masking Active: Contact information protected per role permissions</span>
        </div>
      </div>

      {/* Customers Table */}
      <Card className="border-slate-200 shadow-xs">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Customer Name</th>
                  <th className="py-3 px-4">Company / Trade</th>
                  <th className="py-3 px-4">Contact (Masked)</th>
                  <th className="py-3 px-4 text-center">Orders</th>
                  <th className="py-3 px-4 text-right">Lifetime Spend</th>
                  <th className="py-3 px-4">Registered</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.length > 0 ? (
                  customers.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-full bg-slate-900 text-white flex items-center justify-center font-semibold text-[11px]">
                            {c.firstName[0]}
                            {c.lastName[0]}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-900 block">{c.displayName}</span>
                            <span className="font-mono text-[10px] text-slate-400">ID: {c.id.slice(0, 8)}...</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        {c.companyName ? (
                          <div className="flex items-center gap-1.5 text-slate-700">
                            <Building2 className="h-3.5 w-3.5 text-slate-400" />
                            <span>{c.companyName}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Retail Consumer</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-slate-600 font-mono text-[11px]">
                            <Mail className="h-3 w-3 text-slate-400" />
                            <span>{c.email}</span>
                          </div>
                          {c.phone && (
                            <div className="flex items-center gap-1.5 text-slate-500 font-mono text-[10px]">
                              <Phone className="h-3 w-3 text-slate-400" />
                              <span>{c.phone}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center font-mono font-semibold text-slate-900">
                        {c.ordersCount}
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        ${c.totalSpend.toFixed(2)}
                      </td>

                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                        {new Date(c.createdAt).toLocaleDateString('en-AU')}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDetail(c.id)}
                          className="h-7 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          View Profile
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      {loading ? 'Loading customer records...' : 'No customers matched your search query.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Customer Detail Drawer / Modal */}
      {selectedCustomerId && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-xl bg-white h-full shadow-2xl p-6 overflow-y-auto space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                  {detail ? `${detail.firstName[0]}${detail.lastName[0]}` : '..'}
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    {detail?.displayName || 'Customer Record'}
                  </h2>
                  <span className="text-xs text-slate-500 font-mono">
                    ID: {detail?.id}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={closeDetail}
                className="rounded-md p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {detailLoading ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-600" />
                Loading customer details...
              </div>
            ) : detail ? (
              <div className="space-y-6 text-xs">
                {/* Account Summary Cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-slate-500 block mb-1">Lifetime Orders</span>
                    <span className="text-xl font-bold font-mono text-slate-900">
                      {detail.ordersCount}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-slate-500 block mb-1">Total Paid Spend</span>
                    <span className="text-xl font-bold font-mono text-emerald-700">
                      ${detail.totalSpend.toFixed(2)} AUD
                    </span>
                  </div>
                </div>

                {/* Privacy Badge Alert */}
                {detail.isPiiMasked && (
                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 flex items-start gap-2">
                    <Lock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold block">Protected Personal Data</span>
                      <span>
                        Full street addresses and raw phone numbers are masked because your account does not hold the <code>customers:view:pii_contact</code> permission.
                      </span>
                    </div>
                  </div>
                )}

                {/* Contact Information */}
                <div>
                  <h3 className="font-semibold text-slate-900 uppercase tracking-wider text-[11px] mb-2">
                    Contact & Organization
                  </h3>
                  <div className="space-y-2 border border-slate-200 rounded-lg p-3 bg-white">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Email:</span>
                      <span className="font-mono font-medium text-slate-900">{detail.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Phone:</span>
                      <span className="font-mono font-medium text-slate-900">{detail.phone || 'None'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Company:</span>
                      <span className="font-medium text-slate-900">{detail.companyName || 'None'}</span>
                    </div>
                  </div>
                </div>

                {/* Delivery Addresses */}
                <div>
                  <h3 className="font-semibold text-slate-900 uppercase tracking-wider text-[11px] mb-2">
                    Saved Addresses ({detail.addresses.length})
                  </h3>
                  <div className="space-y-2">
                    {detail.addresses.map((addr) => (
                      <div key={addr.id} className="p-3 border border-slate-200 rounded-lg bg-white">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-slate-900">
                            {addr.label || 'Delivery Address'}
                          </span>
                          {addr.isDefault && (
                            <Badge variant="outline" className="text-[10px]">
                              Default
                            </Badge>
                          )}
                        </div>
                        <p className="text-slate-600">{addr.line1}</p>
                        <p className="text-slate-600">
                          {addr.city}, {addr.state} {addr.postalCode} {addr.country}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Saved Garage Vehicles */}
                <div>
                  <h3 className="font-semibold text-slate-900 uppercase tracking-wider text-[11px] mb-2">
                    Saved Garage Vehicles ({detail.savedVehicles.length})
                  </h3>
                  <div className="space-y-2">
                    {detail.savedVehicles.length > 0 ? (
                      detail.savedVehicles.map((v) => (
                        <div key={v.id} className="p-3 border border-slate-200 rounded-lg bg-white flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Car className="h-4 w-4 text-blue-600" />
                            <div>
                              <span className="font-semibold text-slate-900">
                                {v.year} {v.make} {v.model}
                              </span>
                              {v.variant && (
                                <span className="block text-[11px] text-slate-500">{v.variant}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-400 italic">No vehicles saved in customer garage.</p>
                    )}
                  </div>
                </div>

                {/* Recent Orders */}
                <div>
                  <h3 className="font-semibold text-slate-900 uppercase tracking-wider text-[11px] mb-2">
                    Recent Orders
                  </h3>
                  <div className="space-y-2">
                    {detail.recentOrders.map((ord) => (
                      <div key={ord.id} className="p-3 border border-slate-200 rounded-lg bg-white flex items-center justify-between">
                        <div>
                          <span className="font-mono font-semibold text-blue-600">{ord.orderNumber}</span>
                          <span className="block text-slate-400 text-[10px]">
                            {new Date(ord.createdAt).toLocaleDateString('en-AU')}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-slate-900">
                            ${ord.total.toFixed(2)}
                          </span>
                          <span className="block uppercase text-[10px] text-slate-500">{ord.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
