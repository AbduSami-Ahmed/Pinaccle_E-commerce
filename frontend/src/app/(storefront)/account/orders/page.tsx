'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowRight,
  Boxes,
  CheckCircle2,
  Clock,
  RefreshCw,
  ShoppingBag,
  Truck,
  XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { fetchMyOrders } from '@/lib/orders';
import { OrderAdminDetailsDto, OrderStatus } from '@pinnacle/contracts';

export default function CustomerOrdersHistoryPage() {
  const [orders, setOrders] = React.useState<OrderAdminDetailsDto[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchMyOrders(1, 20);
      setOrders(res.data);
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to load your orders');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const renderStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'PAID':
        return (
          <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
            <CheckCircle2 className="mr-1 h-3 w-3" /> Confirmed & Paid
          </Badge>
        );
      case 'PROCESSING':
        return (
          <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
            <Boxes className="mr-1 h-3 w-3" /> Warehouse Packing
          </Badge>
        );
      case 'SHIPPED':
        return (
          <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 text-xs">
            <Truck className="mr-1 h-3 w-3" /> Out for Delivery
          </Badge>
        );
      case 'DELIVERED':
        return (
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
            <CheckCircle2 className="mr-1 h-3 w-3" /> Delivered / Collected
          </Badge>
        );
      case 'CANCELLED':
        return (
          <Badge className="bg-slate-100 text-slate-600 border-slate-300 text-xs">
            <XCircle className="mr-1 h-3 w-3" /> Cancelled
          </Badge>
        );
      case 'REFUNDED':
        return (
          <Badge className="bg-purple-50 text-purple-700 border-purple-200 text-xs">
            <RefreshCw className="mr-1 h-3 w-3" /> Refunded
          </Badge>
        );
      case 'PENDING_PAYMENT':
      default:
        return (
          <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200 text-xs">
            <Clock className="mr-1 h-3 w-3" /> Awaiting Payment
          </Badge>
        );
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-28 rounded-xl bg-slate-100" />
        <div className="h-28 rounded-xl bg-slate-100" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Your Order History & Returns</h1>
          <p className="text-xs text-slate-500 mt-1">
            Track consignments, view tax invoices, or lodge return authorizations
          </p>
        </div>
        <Link href="/catalog">
          <Button size="sm" variant="outline" className="text-xs">
            Browse Catalogue
          </Button>
        </Link>
      </div>

      {errorMsg && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {orders.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-12 text-center space-y-3">
          <ShoppingBag className="h-10 w-10 mx-auto text-slate-400" />
          <h3 className="text-base font-bold text-slate-800">No orders found on your account</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            You haven’t placed any orders with Pinnacle yet. Explore our stock of tested commercial
            tyres and certified seat belt assemblies.
          </p>
          <div className="pt-2">
            <Link href="/catalog">
              <Button size="sm" className="bg-slate-900 text-white text-xs">
                Start Shopping
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const isClickAndCollect = order.shippingMethod === 'CLICK_AND_COLLECT';
            const shipment = order.shipments[0];

            return (
              <div
                key={order.id}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs hover:border-slate-300 transition-all space-y-4"
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-mono font-bold text-base text-slate-900">
                      {order.orderNumber}
                    </span>
                    {renderStatusBadge(order.orderStatus)}
                  </div>
                  <div className="text-xs text-slate-500">
                    Ordered on{' '}
                    {new Date(order.createdAt).toLocaleDateString('en-NZ', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </div>
                </div>

                {/* Items summary */}
                <div className="space-y-2 text-xs">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                          {item.skuSnapshot}
                        </span>
                        <span className="font-medium text-slate-800">{item.titleSnapshot}</span>
                        <span className="text-slate-500">
                          ({item.quantity} × {item.saleUnitNameSnapshot})
                        </span>
                      </div>
                      <span className="font-mono font-bold text-slate-900">
                        ${item.totalPrice.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Footer bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
                  <div className="flex items-center gap-2 text-slate-600">
                    {isClickAndCollect ? (
                      <span className="inline-flex items-center gap-1 font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        <Boxes className="h-3 w-3" /> Trade Counter Pickup (Auckland Penrose Hub)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-slate-600">
                        <Truck className="h-3 w-3 text-slate-400" />
                        Courier: {order.shippingAddress.city}, {order.shippingAddress.state}
                      </span>
                    )}

                    {shipment?.trackingNumber && (
                      <span className="font-mono text-slate-500 ml-2">
                        Tracking: {shipment.trackingNumber}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4">
                    <div className="text-right">
                      <span className="text-slate-500 text-[11px] block">Order Total</span>
                      <span className="font-mono font-bold text-slate-900 text-sm">
                        ${order.totalAmount.toFixed(2)} NZD
                      </span>
                    </div>

                    <Link href={`/account/orders/${order.orderNumber}`}>
                      <Button size="sm" variant="outline" className="h-8 text-xs font-medium">
                        View Order Details <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
