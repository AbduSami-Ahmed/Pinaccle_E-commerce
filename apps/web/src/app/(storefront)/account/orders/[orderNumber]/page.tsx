'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  Barcode,
  Boxes,
  CheckCircle2,
  Download,
  ExternalLink,
  MapPin,
  Package,
  Printer,
  RefreshCw,
  RotateCcw,
  Truck,
  XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cancelMyOrder, fetchMyOrderDetail, submitMyReturn } from '@/lib/orders';
import { CreateReturnItemDto, OrderAdminDetailsDto, ReturnReasonCode } from '@pinnacle/contracts';

export default function CustomerOrderDetailPage() {
  const params = useParams();
  const orderNumber = params['orderNumber'] as string;

  const [order, setOrder] = React.useState<OrderAdminDetailsDto | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [actionLoading, setActionLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  // Modal states
  const [showCancelModal, setShowCancelModal] = React.useState(false);
  const [cancelReason, setCancelReason] = React.useState('');

  const [showReturnModal, setShowReturnModal] = React.useState(false);
  const [returnReasonCode, setReturnReasonCode] =
    React.useState<ReturnReasonCode>('INCORRECT_FITMENT');
  const [returnNotes, setReturnNotes] = React.useState('');
  const [selectedItemQuantities, setSelectedItemQuantities] = React.useState<
    Record<string, number>
  >({});

  const loadData = React.useCallback(async () => {
    if (!orderNumber) return;
    try {
      const data = await fetchMyOrderDetail(orderNumber);
      setOrder(data);
      // Initialize return quantities
      const initialQty: Record<string, number> = {};
      data.items.forEach((item) => {
        initialQty[item.id] = item.quantity;
      });
      setSelectedItemQuantities(initialQty);
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to load order');
    } finally {
      setLoading(false);
    }
  }, [orderNumber]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const flashSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 5000);
  };

  const handleCancelOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order || !cancelReason.trim()) return;
    setActionLoading(true);
    try {
      const updated = await cancelMyOrder(order.orderNumber, cancelReason.trim());
      setOrder(updated);
      setShowCancelModal(false);
      flashSuccess('Your cancellation request has been processed. Order is now cancelled.');
    } catch (e: any) {
      setErrorMsg(e.message || 'Cancellation failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order || !returnNotes.trim()) return;

    // Filter items with quantity > 0
    const returnItems: CreateReturnItemDto[] = Object.entries(selectedItemQuantities)
      .filter(([_, qty]) => qty > 0)
      .map(([orderItemId, quantity]) => ({ orderItemId, quantity }));

    if (returnItems.length === 0) {
      setErrorMsg('Please select at least one item quantity to return');
      return;
    }

    setActionLoading(true);
    try {
      await submitMyReturn(order.orderNumber, {
        orderId: order.id,
        reasonCode: returnReasonCode,
        customerNotes: returnNotes.trim(),
        items: returnItems,
      });
      setShowReturnModal(false);
      await loadData();
      flashSuccess(
        'Return request submitted successfully. Our support team will review your RMA within 1 business day.',
      );
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to submit return request');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-slate-500">
        <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-3 text-slate-400" />
        <p className="text-sm font-medium">Loading your order details...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-8 text-center text-rose-800">
        <AlertCircle className="h-8 w-8 mx-auto mb-2 text-rose-500" />
        <h2 className="text-lg font-bold">Order Not Found</h2>
        <p className="text-sm mt-1">{errorMsg || 'Could not locate order in database'}</p>
        <Link href="/account/orders">
          <Button variant="outline" className="mt-4">
            Back to Orders List
          </Button>
        </Link>
      </div>
    );
  }

  const isClickAndCollect = order.shippingMethod === 'CLICK_AND_COLLECT';
  const shipment = order.shipments[0];
  const canCancel = order.orderStatus === 'PENDING_PAYMENT' || order.orderStatus === 'PAID';
  const canReturn = order.orderStatus === 'DELIVERED' || order.orderStatus === 'SHIPPED';

  // Stepper helper
  const steps = [
    { label: 'Order Placed', completed: true },
    {
      label: 'Payment Confirmed',
      completed: ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(order.orderStatus),
    },
    {
      label: isClickAndCollect ? 'Ready for Pickup' : 'Dispatched',
      completed: ['SHIPPED', 'DELIVERED'].includes(order.orderStatus),
    },
    {
      label: isClickAndCollect ? 'Collected from Depot' : 'Delivered',
      completed: order.orderStatus === 'DELIVERED',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/account/orders"
          className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to My Orders
        </Link>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              if (!order) return;
              try {
                const res = await fetch(`/api/v1/documents/order/${order.orderNumber}/invoice`);
                if (res.ok) {
                  const data = await res.json();
                  window.open(data.downloadUrl, '_blank');
                } else {
                  window.print();
                }
              } catch {
                window.print();
              }
            }}
            className="h-8 text-xs text-slate-700 font-medium"
          >
            <Download className="mr-1.5 h-3.5 w-3.5 text-blue-600" /> Download Tax Invoice (PDF)
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="h-8 text-xs text-slate-600"
          >
            <Printer className="mr-1.5 h-3.5 w-3.5" /> Print
          </Button>
        </div>
      </div>

      {/* Success / Error Alerts */}
      {successMsg && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-medium text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={() => setErrorMsg(null)}
            className="text-rose-500 hover:text-rose-700 text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Order Header Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold font-mono text-slate-900">{order.orderNumber}</h1>
              <Badge className="bg-slate-900 text-white text-xs">{order.orderStatus}</Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Ordered on{' '}
              {new Date(order.createdAt).toLocaleDateString('en-AU', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}{' '}
              AEST
            </p>
          </div>

          {/* Customer Self-Service Actions */}
          <div className="flex items-center gap-2">
            {canCancel && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCancelModal(true)}
                className="text-xs text-rose-700 border-rose-200 hover:bg-rose-50 h-9"
              >
                <XCircle className="mr-1.5 h-4 w-4" /> Cancel Order
              </Button>
            )}

            {canReturn && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowReturnModal(true)}
                className="text-xs text-purple-700 border-purple-200 hover:bg-purple-50 h-9"
              >
                <RotateCcw className="mr-1.5 h-4 w-4" /> Request Return (RMA)
              </Button>
            )}
          </div>
        </div>

        {/* Progress Stepper (Only for active, non-cancelled orders) */}
        {order.orderStatus !== 'CANCELLED' && order.orderStatus !== 'REFUNDED' && (
          <div className="py-2">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              {steps.map((st, idx) => (
                <div
                  key={st.label}
                  className={`p-3 rounded-lg border flex items-center gap-2.5 transition-all ${st.completed
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-slate-50 border-slate-200 text-slate-400'
                    }`}
                >
                  <div
                    className={`h-6 w-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${st.completed ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'
                      }`}
                  >
                    {idx + 1}
                  </div>
                  <span className="font-semibold">{st.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Active RMA Return Request Banner */}
      {order.returnRequests.length > 0 && (
        <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-5 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-purple-600" />
              <h2 className="text-sm font-bold text-purple-900">
                Return Authorization: {order.returnRequests[0]?.rmaNumber}
              </h2>
            </div>
            <Badge className="bg-purple-200 text-purple-900 text-xs">
              Status: {order.returnRequests[0]?.status}
            </Badge>
          </div>
          <p className="text-xs text-purple-950">
            <strong>Your notes:</strong> {order.returnRequests[0]?.customerNotes}
          </p>
          {order.returnRequests[0]?.status === 'APPROVED' && (
            <div className="text-xs text-emerald-800 bg-emerald-50 p-3 rounded-lg border border-emerald-200">
              <strong>Return Instructions:</strong> Your RMA is approved! Please safely repack parts
              in original packaging and return to{' '}
              <strong>Pinnacle Auto Spares, 42 Jedda Road, Prestons NSW 2170</strong> quoting your
              RMA number on the carton.
            </div>
          )}
        </div>
      )}

      {/* Courier Tracking or Depot Pickup Notice */}
      {isClickAndCollect ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-5 space-y-2">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
            <Boxes className="h-4 w-4 text-amber-700" />
            Sydney Depot Trade Counter Pickup (Gate 2)
          </div>
          <div className="text-xs text-amber-950 space-y-1">
            <p>
              <strong>Depot Address:</strong> 42 Jedda Road, Prestons NSW 2170 (Trade Counter Gate
              2)
            </p>
            <p>
              <strong>Trade Counter Hours:</strong> Mon–Fri 7:30am – 4:30pm | Sat 8:00am – 12:30pm
            </p>
            <p>
              <strong>Collection Requirement:</strong> Quote Order #
              <strong>{order.orderNumber}</strong> and present photo ID (NSW Driver Licence or trade
              authorization).
            </p>
          </div>
        </div>
      ) : (
        shipment && (
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1 text-xs text-indigo-950">
              <div className="flex items-center gap-2 font-bold text-sm text-indigo-900">
                <Truck className="h-4 w-4 text-indigo-700" />
                Dispatched with {shipment.carrierName}
              </div>
              <p>
                Consignment Tracking Number:{' '}
                <strong className="font-mono text-slate-900">{shipment.trackingNumber}</strong>
              </p>
              <p className="text-slate-600">
                Dispatched:{' '}
                {shipment.shippedAt
                  ? new Date(shipment.shippedAt).toLocaleDateString('en-AU', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                  : 'Pending'}
              </p>
            </div>

            {shipment.trackingUrl && (
              <a
                href={shipment.trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2 rounded-lg text-xs transition-colors shrink-0"
              >
                Track Consignment <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        )
      )}

      {/* Main 2-Column Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Line Items Table */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
            <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/60">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Package className="h-4 w-4 text-slate-500" />
                Purchased Line Items ({order.items.length})
              </h2>
            </div>

            <div className="divide-y divide-slate-100">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px]">
                        {item.skuSnapshot}
                      </span>
                      {item.serializedItemId && (
                        <Badge className="bg-purple-50 text-purple-700 border-purple-200 text-[10px]">
                          <Barcode className="mr-1 h-3 w-3" /> Serialized & Tested
                        </Badge>
                      )}
                    </div>
                    <div className="font-semibold text-sm text-slate-900">{item.titleSnapshot}</div>
                    <div className="text-slate-500">
                      Sale Unit: <strong>{item.saleUnitNameSnapshot}</strong> • Quantity:{' '}
                      <strong>{item.quantity}</strong>
                    </div>
                  </div>

                  <div className="text-right sm:min-w-32">
                    <div className="text-slate-500">
                      {item.quantity} × ${item.unitPrice.toFixed(2)}
                    </div>
                    <div className="font-mono font-bold text-slate-900 text-base">
                      ${item.totalPrice.toFixed(2)}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Includes ${(item.taxAmount || 0).toFixed(2)} GST
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Financial Summary & Delivery Details */}
        <div className="space-y-6">
          {/* Financial Breakdown */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3 text-xs">
            <h2 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-2">
              Payment & Tax Summary
            </h2>
            <div className="space-y-2">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal (tax-inclusive):</span>
                <span className="font-mono">${order.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Statutory 10% GST included:</span>
                <span className="font-mono">${order.taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Delivery Freight:</span>
                <span className="font-mono">
                  {order.shippingFee === 0 ? 'FREE' : `$${order.shippingFee.toFixed(2)}`}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 text-sm font-bold text-slate-900">
                <span>Total Paid:</span>
                <span className="font-mono text-base">${order.totalAmount.toFixed(2)} AUD</span>
              </div>
            </div>
          </div>

          {/* Delivery Address */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3 text-xs">
            <h2 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-2 flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-blue-600" />
              {isClickAndCollect ? 'Pickup Location' : 'Delivery Address'}
            </h2>
            <div className="text-slate-800 space-y-0.5">
              <div className="font-semibold">
                {order.shippingAddress.firstName} {order.shippingAddress.lastName}
              </div>
              {order.shippingAddress.company && (
                <div className="text-slate-600">{order.shippingAddress.company}</div>
              )}
              <div>{order.shippingAddress.line1}</div>
              {order.shippingAddress.line2 && <div>{order.shippingAddress.line2}</div>}
              <div>
                {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
                {order.shippingAddress.postalCode}
              </div>
              <div className="text-slate-500 text-[11px]">{order.shippingAddress.country}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* MODAL: Customer Cancellation */}
      {/* ------------------------------------------------------------------ */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-rose-900 flex items-center gap-2">
              <XCircle className="h-5 w-5 text-rose-600" /> Cancel Order {order.orderNumber}
            </h3>
            <p className="text-xs text-slate-600">
              Orders can be cancelled before warehouse picking and dispatch. Any card payment will
              be automatically credited back to your account.
            </p>

            <form onSubmit={handleCancelOrder} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Reason for Cancellation *
                </label>
                <Input
                  required
                  placeholder="e.g. Changed mind, ordered incorrect tyre profile"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="text-xs h-9"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCancelModal(false)}
                  className="text-xs h-8"
                >
                  Keep Order
                </Button>
                <Button
                  type="submit"
                  disabled={actionLoading || !cancelReason.trim()}
                  className="bg-rose-600 hover:bg-rose-700 text-white text-xs h-8"
                >
                  {actionLoading ? 'Cancelling...' : 'Confirm Cancellation'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* MODAL: Request RMA Return */}
      {/* ------------------------------------------------------------------ */}
      {showReturnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-purple-600" /> Lodge Return Request (RMA)
            </h3>
            <p className="text-xs text-slate-500">
              Submit an official return request for Order <strong>{order.orderNumber}</strong>. Our
              NSW recycler inspection team will assess your claim and issue return shipping
              instructions.
            </p>

            <form onSubmit={handleReturnSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Primary Reason Code *
                </label>
                <select
                  value={returnReasonCode}
                  onChange={(e) => setReturnReasonCode(e.target.value as ReturnReasonCode)}
                  className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-xs"
                >
                  <option value="INCORRECT_FITMENT">
                    INCORRECT_FITMENT — Did not fit vehicle chassis
                  </option>
                  <option value="DEFECTIVE_PART">
                    DEFECTIVE_PART — Functional failure or fault
                  </option>
                  <option value="DAMAGED_IN_SHIPPING">DAMAGED_IN_SHIPPING — Transit damage</option>
                  <option value="CUSTOMER_CHANGED_MIND">
                    CUSTOMER_CHANGED_MIND — No longer required
                  </option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Items to Return & Quantities *
                </label>
                <div className="space-y-2 border border-slate-200 rounded-lg p-3 bg-slate-50/50">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-slate-800">{item.titleSnapshot}</div>
                        <div className="text-[11px] text-slate-500">SKU: {item.skuSnapshot}</div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500 text-[11px]">Qty:</span>
                        <input
                          type="number"
                          min={0}
                          max={item.quantity}
                          value={selectedItemQuantities[item.id] ?? item.quantity}
                          onChange={(e) =>
                            setSelectedItemQuantities({
                              ...selectedItemQuantities,
                              [item.id]: parseInt(e.target.value || '0', 10),
                            })
                          }
                          className="w-16 h-8 rounded border border-slate-300 bg-white px-2 text-xs font-mono text-center"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Detailed Explanation & Fault Description *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Please describe why this item is being returned, vehicle VIN, or fitting issue..."
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  className="w-full rounded-md border border-slate-300 p-2 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowReturnModal(false)}
                  className="text-xs h-8"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={actionLoading || !returnNotes.trim()}
                  className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-8"
                >
                  {actionLoading ? 'Lodging...' : 'Submit Return Authorization'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
