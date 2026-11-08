'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Boxes,
  CheckCircle2,
  Clock,
  Eye,
  Filter,
  Lock,
  RefreshCw,
  Search,
  ShoppingBag,
  Truck,
  XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fetchOrders } from '@/lib/orders';
import {
  FulfillmentStatus,
  OrderAdminDetailsDto,
  OrderStatus,
  PaymentStatus,
} from '@pinnacle/contracts';

export default function AdminOrdersListPage() {
  const [orders, setOrders] = React.useState<OrderAdminDetailsDto[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [totalCount, setTotalCount] = React.useState(0);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);

  // Filters state
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedStatus, setSelectedStatus] = React.useState<string>('ALL');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = React.useState<string>('ALL');
  const [selectedFulfillment, setSelectedFulfillment] = React.useState<string>('ALL');
  const [dateFrom, setDateFrom] = React.useState('');
  const [dateTo, setDateTo] = React.useState('');

  const loadData = React.useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const res = await fetchOrders({
          page,
          pageSize: 15,
          search: searchTerm || undefined,
          orderStatus: selectedStatus !== 'ALL' ? (selectedStatus as OrderStatus) : undefined,
          paymentStatus:
            selectedPaymentStatus !== 'ALL' ? (selectedPaymentStatus as PaymentStatus) : undefined,
          fulfillmentStatus:
            selectedFulfillment !== 'ALL' ? (selectedFulfillment as FulfillmentStatus) : undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          sortBy: 'createdAt',
          sortDirection: 'desc',
        });
        setOrders(res.data);
        setTotalCount(res.meta.total);
        setTotalPages(res.meta.totalPages);
        setCurrentPage(res.meta.page);
      } catch (e) {
        console.error('Failed to load orders', e);
      } finally {
        setLoading(false);
      }
    },
    [searchTerm, selectedStatus, selectedPaymentStatus, selectedFulfillment, dateFrom, dateTo],
  );

  React.useEffect(() => {
    const timer = setTimeout(() => {
      loadData(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [loadData]);

  // Status Badge Helper
  const renderStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'PAID':
        return (
          <Badge className="bg-blue-50 text-blue-700 border-blue-200">
            <CheckCircle2 className="mr-1 h-3 w-3" /> Paid (Queued)
          </Badge>
        );
      case 'PROCESSING':
        return (
          <Badge className="bg-amber-50 text-amber-700 border-amber-200">
            <Boxes className="mr-1 h-3 w-3" /> Picking & Packing
          </Badge>
        );
      case 'SHIPPED':
        return (
          <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200">
            <Truck className="mr-1 h-3 w-3" /> In Transit
          </Badge>
        );
      case 'DELIVERED':
        return (
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
            <CheckCircle2 className="mr-1 h-3 w-3" /> Delivered
          </Badge>
        );
      case 'CANCELLED':
        return (
          <Badge className="bg-slate-100 text-slate-600 border-slate-300">
            <XCircle className="mr-1 h-3 w-3" /> Cancelled
          </Badge>
        );
      case 'REFUNDED':
        return (
          <Badge className="bg-purple-50 text-purple-700 border-purple-200">
            <RefreshCw className="mr-1 h-3 w-3" /> Refunded
          </Badge>
        );
      case 'PENDING_PAYMENT':
      default:
        return (
          <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200">
            <Clock className="mr-1 h-3 w-3" /> Awaiting Payment
          </Badge>
        );
    }
  };

  const renderPaymentBadge = (status: PaymentStatus) => {
    switch (status) {
      case 'PAID':
        return <span className="text-xs font-semibold text-emerald-700">Paid</span>;
      case 'REFUNDED':
        return <span className="text-xs font-semibold text-purple-700">Refunded</span>;
      case 'PARTIALLY_REFUNDED':
        return <span className="text-xs font-semibold text-purple-600">Part-Refunded</span>;
      case 'FAILED':
        return <span className="text-xs font-semibold text-rose-700">Failed</span>;
      case 'UNPAID':
      default:
        return <span className="text-xs font-semibold text-slate-500">Unpaid</span>;
    }
  };

  // Metric aggregates
  const awaitingDispatch = orders.filter(
    (o) => o.orderStatus === 'PAID' || o.orderStatus === 'PROCESSING',
  ).length;
  const inTransit = orders.filter((o) => o.orderStatus === 'SHIPPED').length;
  const completed = orders.filter((o) => o.orderStatus === 'DELIVERED').length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Order Operations & Fulfilment
            </h1>
            <Badge variant="outline" className="text-xs font-mono bg-slate-50 text-slate-600">
              NZ MVD-89211
            </Badge>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Auckland Penrose Trade Depot & NZ Nationwide Courier Freight Pipeline
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData(currentPage)}
            disabled={loading}
            className="h-9"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Highlights Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 uppercase tracking-wider">
            <span>Total Shown</span>
            <ShoppingBag className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{totalCount}</div>
          <div className="mt-1 text-xs text-slate-500">Orders in database</div>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-amber-700 uppercase tracking-wider">
            <span>Awaiting Fulfillment</span>
            <Boxes className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-900">{awaitingDispatch}</div>
          <div className="mt-1 text-xs text-amber-700">Require pick & pack</div>
        </div>

        <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-indigo-700 uppercase tracking-wider">
            <span>In Transit</span>
            <Truck className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-indigo-900">{inTransit}</div>
          <div className="mt-1 text-xs text-indigo-700">Couriers on road</div>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-700 uppercase tracking-wider">
            <span>Delivered / Collected</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-900">{completed}</div>
          <div className="mt-1 text-xs text-emerald-700">Trade counter & signed</div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search Box */}
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by order # (PIN-2026-...), email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-slate-50 border-slate-200 text-sm"
            />
          </div>

          {/* Date From */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 whitespace-nowrap">From:</span>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="text-xs h-9 bg-slate-50"
            />
          </div>

          {/* Date To */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 whitespace-nowrap">To:</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="text-xs h-9 bg-slate-50"
            />
          </div>
        </div>

        {/* Status Pill Filters */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <span className="font-semibold text-slate-500 mr-1 flex items-center gap-1">
            <Filter className="h-3 w-3" /> Status:
          </span>
          {[
            { key: 'ALL', label: 'All Statuses' },
            { key: 'PAID', label: 'Paid (Awaiting Pick)' },
            { key: 'PROCESSING', label: 'Picking / Packing' },
            { key: 'SHIPPED', label: 'Dispatched / Courier' },
            { key: 'DELIVERED', label: 'Delivered / Collected' },
            { key: 'CANCELLED', label: 'Cancelled' },
            { key: 'REFUNDED', label: 'Refunded' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSelectedStatus(tab.key)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                selectedStatus === tab.key
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}

          {(searchTerm || selectedStatus !== 'ALL' || dateFrom || dateTo) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedStatus('ALL');
                setSelectedPaymentStatus('ALL');
                setSelectedFulfillment('ALL');
                setDateFrom('');
                setDateTo('');
              }}
              className="ml-auto text-xs text-blue-600 hover:underline font-medium"
            >
              Reset filters
            </button>
          )}
        </div>
      </div>

      {/* Orders Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-slate-400" />
            <p className="text-sm">Retrieving orders from Auckland database...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <ShoppingBag className="h-10 w-10 mx-auto mb-3 text-slate-300" />
            <h3 className="text-base font-bold text-slate-800">No orders match your criteria</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Try adjusting your search keywords, clearing status filters, or expanding the date
              range.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Order #</th>
                  <th className="py-3 px-4">Date (NZST)</th>
                  <th className="py-3 px-4">Customer Details</th>
                  <th className="py-3 px-4">Method / Destination</th>
                  <th className="py-3 px-4">Items</th>
                  <th className="py-3 px-4 text-right">Total (NZD)</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4">Lifecycle State</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((order) => {
                  const dateStr = new Date(order.createdAt).toLocaleDateString('en-NZ', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  const totalPhysicalUnits = order.items.reduce(
                    (acc, i) => acc + (i.baseUnitsConsumed || i.quantity),
                    0,
                  );

                  return (
                    <tr key={order.id} className="hover:bg-slate-50/60 transition-colors group">
                      {/* Order Number */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="font-mono font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1.5"
                        >
                          {order.orderNumber}
                        </Link>
                      </td>

                      {/* Date */}
                      <td className="py-3 px-4 whitespace-nowrap text-xs text-slate-500">
                        {dateStr}
                      </td>

                      {/* Customer Details */}
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800 text-xs flex items-center gap-1.5">
                          <span>{order.customerEmail}</span>
                          {order.isPiiMasked && (
                            <span
                              title="PII masked for your role permissions"
                              className="text-amber-600 bg-amber-50 px-1 rounded text-[10px] flex items-center gap-0.5 border border-amber-200"
                            >
                              <Lock className="h-2.5 w-2.5" /> Masked
                            </span>
                          )}
                        </div>
                        {order.customerPhone && (
                          <div className="text-[11px] text-slate-500">{order.customerPhone}</div>
                        )}
                      </td>

                      {/* Delivery Method */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {order.shippingMethod === 'CLICK_AND_COLLECT' ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                            <Boxes className="h-3 w-3" /> Trade Counter Pickup
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-700">
                            <Truck className="h-3 w-3 text-slate-400" />
                            {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
                            {order.shippingAddress.postalCode}
                          </span>
                        )}
                      </td>

                      {/* Items */}
                      <td className="py-3 px-4 whitespace-nowrap text-xs text-slate-600">
                        <span className="font-semibold">{order.items.length} lines</span>
                        <span className="text-slate-400 text-[11px] block">
                          {totalPhysicalUnits} physical units
                        </span>
                      </td>

                      {/* Total Amount */}
                      <td className="py-3 px-4 whitespace-nowrap text-right font-mono font-bold text-slate-900">
                        ${order.totalAmount.toFixed(2)}
                      </td>

                      {/* Payment */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {renderPaymentBadge(order.paymentStatus)}
                      </td>

                      {/* Lifecycle Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {renderStatusBadge(order.orderStatus)}
                      </td>

                      {/* Action Button */}
                      <td className="py-3 px-4 whitespace-nowrap text-center">
                        <Link href={`/admin/orders/${order.id}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-2.5 text-xs text-slate-700 hover:text-slate-900 border-slate-200"
                          >
                            <Eye className="mr-1 h-3.5 w-3.5 text-slate-500" /> View
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 bg-slate-50 text-xs">
            <span className="text-slate-500">
              Showing page <strong className="text-slate-800">{currentPage}</strong> of{' '}
              <strong className="text-slate-800">{totalPages}</strong> ({totalCount} total orders)
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1 || loading}
                onClick={() => loadData(currentPage - 1)}
                className="h-8 text-xs"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages || loading}
                onClick={() => loadData(currentPage + 1)}
                className="h-8 text-xs"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
