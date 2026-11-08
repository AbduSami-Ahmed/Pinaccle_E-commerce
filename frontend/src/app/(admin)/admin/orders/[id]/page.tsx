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
  Clock,
  DollarSign,
  ExternalLink,
  Lock,
  Mail,
  Package,
  Phone,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  Truck,
  User,
  Wrench,
  XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  cancelOrder,
  confirmDepotCollection,
  dispatchCourierShipment,
  fetchOrderDetails,
  inspectReturn,
  pickPackOrder,
  processRefund,
  reviewReturnRequest,
} from '@/lib/orders';
import { OrderAdminDetailsDto, ReturnDisposition } from '@pinnacle/contracts';

export default function AdminOrderDetailPage() {
  const params = useParams();
  const orderId = params['id'] as string;

  const [order, setOrder] = React.useState<OrderAdminDetailsDto | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [actionLoading, setActionLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  // Modal / Form States
  const [showDispatchModal, setShowDispatchModal] = React.useState(false);
  const [carrierName, setCarrierName] = React.useState('CourierPost / NZ Post');
  const [trackingNumber, setTrackingNumber] = React.useState('');
  const [dispatchNotes, setDispatchNotes] = React.useState('');

  const [showCollectModal, setShowCollectModal] = React.useState(false);
  const [collectedByName, setCollectedByName] = React.useState('');
  const [idDocType, setIdDocType] = React.useState('NZ Driver Licence');
  const [idDocLast4, setIdDocLast4] = React.useState('');

  const [showCancelModal, setShowCancelModal] = React.useState(false);
  const [cancelReason, setCancelReason] = React.useState('');
  const [refundOnCancel, setRefundOnCancel] = React.useState(true);

  const [showRefundModal, setShowRefundModal] = React.useState(false);
  const [refundAmount, setRefundAmount] = React.useState('');
  const [refundReason, setRefundReason] = React.useState('');

  const [inspectingItem, setInspectingItem] = React.useState<any | null>(null);
  const [inspectionDisposition, setInspectionDisposition] =
    React.useState<ReturnDisposition>('RESTOCK_TO_INVENTORY');
  const [inspectionNotes, setInspectionNotes] = React.useState('');
  const [refundEligible, setRefundEligible] = React.useState(true);

  const loadOrder = React.useCallback(async () => {
    if (!orderId) return;
    try {
      const data = await fetchOrderDetails(orderId);
      setOrder(data);
      setCollectedByName(
        `${data.shippingAddress?.firstName || ''} ${data.shippingAddress?.lastName || ''}`.trim(),
      );
      setRefundAmount(data.totalAmount.toString());
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to load order');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  React.useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  const flashSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 5000);
  };

  const handlePickPack = async () => {
    if (!order) return;
    setActionLoading(true);
    try {
      const updated = await pickPackOrder(order.id, {
        notes: 'Order picked and staged in Auckland Bay 4',
      });
      setOrder(updated);
      flashSuccess('Order marked as PROCESSING (Pick & Pack initiated)');
    } catch (e: any) {
      setErrorMsg(e.message || 'Pick & pack failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order || !trackingNumber.trim()) return;
    setActionLoading(true);
    try {
      const updated = await dispatchCourierShipment(order.id, {
        carrierName,
        trackingNumber: trackingNumber.trim(),
        notes: dispatchNotes.trim() || undefined,
      });
      setOrder(updated);
      setShowDispatchModal(false);
      setTrackingNumber('');
      flashSuccess(
        `Shipment booked with ${carrierName} (${trackingNumber}). Order set to SHIPPED.`,
      );
    } catch (e: any) {
      setErrorMsg(e.message || 'Dispatch failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDepotCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order || !collectedByName.trim()) return;
    setActionLoading(true);
    try {
      const updated = await confirmDepotCollection(order.id, {
        collectedBy: collectedByName.trim(),
        idDocumentType: idDocType,
        idReferenceLast4: idDocLast4.trim() || undefined,
      });
      setOrder(updated);
      setShowCollectModal(false);
      flashSuccess('Trade counter pickup verified! Order set to DELIVERED.');
    } catch (e: any) {
      setErrorMsg(e.message || 'Depot collection failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order || !cancelReason.trim()) return;
    setActionLoading(true);
    try {
      const updated = await cancelOrder(order.id, {
        reason: cancelReason.trim(),
        refundPayment: refundOnCancel,
      });
      setOrder(updated);
      setShowCancelModal(false);
      setCancelReason('');
      flashSuccess('Order cancelled. Inventory has been restocked/released to available pool.');
    } catch (e: any) {
      setErrorMsg(e.message || 'Cancellation failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleProcessRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order || !refundReason.trim()) return;
    setActionLoading(true);
    try {
      const amt = refundAmount ? parseFloat(refundAmount) : undefined;
      const updated = await processRefund(order.id, {
        amount: amt,
        reason: refundReason.trim(),
      });
      setOrder(updated);
      setShowRefundModal(false);
      flashSuccess(`Refund processed successfully for $${amt ?? order.totalAmount} NZD.`);
    } catch (e: any) {
      setErrorMsg(e.message || 'Refund processing failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRmaReview = async (returnId: string, action: 'APPROVE' | 'REJECT') => {
    setActionLoading(true);
    try {
      await reviewReturnRequest(returnId, {
        action,
        staffNotes:
          action === 'APPROVE'
            ? 'Approved for physical return to Auckland depot'
            : 'Declined per store policy',
      });
      await loadOrder();
      flashSuccess(`RMA return request ${action === 'APPROVE' ? 'APPROVED' : 'REJECTED'}.`);
    } catch (e: any) {
      setErrorMsg(e.message || 'RMA review failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleInspectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectingItem || !inspectionNotes.trim()) return;
    setActionLoading(true);
    try {
      await inspectReturn(inspectingItem.id, {
        returnItemId: inspectingItem.id,
        disposition: inspectionDisposition,
        inspectionNotes: inspectionNotes.trim(),
        refundEligible,
      });
      setInspectingItem(null);
      setInspectionNotes('');
      await loadOrder();
      flashSuccess(
        `Inspection recorded with disposition: ${inspectionDisposition}. Stock movement executed.`,
      );
    } catch (e: any) {
      setErrorMsg(e.message || 'Inspection recording failed');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-slate-500">
        <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-3 text-slate-400" />
        <p className="text-sm font-medium">Loading order details...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-8 text-center text-rose-800">
        <AlertCircle className="h-8 w-8 mx-auto mb-2 text-rose-500" />
        <h2 className="text-lg font-bold">Order Not Found</h2>
        <p className="text-sm mt-1">{errorMsg || 'Could not locate order in database'}</p>
        <Link href="/admin/orders">
          <Button variant="outline" className="mt-4">
            Back to Orders List
          </Button>
        </Link>
      </div>
    );
  }

  const isClickAndCollect = order.shippingMethod === 'CLICK_AND_COLLECT';

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/orders"
          className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Orders Management
        </Link>
        <span className="text-xs font-mono text-slate-500">Depot Code: AKL-CENTRAL</span>
      </div>

      {/* Alert Banners */}
      {successMsg && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-800 flex items-center justify-between">
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

      {order.isPiiMasked && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900 flex items-center gap-2">
          <Lock className="h-4 w-4 text-amber-700 shrink-0" />
          <div>
            <strong>Sensitive Contact Information Masked:</strong> Your operator role does not
            possess the{' '}
            <code className="font-mono bg-amber-100 px-1 py-0.5 rounded text-amber-800">
              customers:view:pii_contact
            </code>{' '}
            privilege. Customer phone, email, and address lines are restricted per the privacy
            policy.
          </div>
        </div>
      )}

      {/* Main Order Header Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-bold font-mono text-slate-900 tracking-tight">
                {order.orderNumber}
              </h1>
              <Badge className="bg-slate-900 text-white font-mono text-xs">
                {order.orderStatus}
              </Badge>
              <Badge variant="outline" className="text-xs">
                Payment: {order.paymentStatus}
              </Badge>
              <Badge variant="outline" className="text-xs">
                Fulfilment: {order.fulfillmentStatus}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-slate-500 flex items-center gap-2">
              <span>
                Placed on{' '}
                {new Date(order.createdAt).toLocaleDateString('en-NZ', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}{' '}
                NZST
              </span>
              <span>•</span>
              <span>Currency: {order.currency}</span>
            </p>
          </div>

          {/* Quick Action Operations Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {order.orderStatus === 'PAID' && (
              <Button
                onClick={handlePickPack}
                disabled={actionLoading}
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-9"
              >
                <Boxes className="mr-1.5 h-4 w-4" /> Start Pick & Pack
              </Button>
            )}

            {(order.orderStatus === 'PAID' || order.orderStatus === 'PROCESSING') && (
              <>
                {isClickAndCollect ? (
                  <Button
                    onClick={() => setShowCollectModal(true)}
                    disabled={actionLoading}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9"
                  >
                    <CheckCircle2 className="mr-1.5 h-4 w-4" /> Verify Trade Counter Pickup
                  </Button>
                ) : (
                  <Button
                    onClick={() => setShowDispatchModal(true)}
                    disabled={actionLoading}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9"
                  >
                    <Truck className="mr-1.5 h-4 w-4" /> Dispatch Courier Consignment
                  </Button>
                )}

                <Button
                  variant="outline"
                  onClick={() => setShowCancelModal(true)}
                  disabled={actionLoading}
                  className="text-rose-700 border-rose-200 hover:bg-rose-50 text-xs h-9"
                >
                  <XCircle className="mr-1.5 h-4 w-4" /> Cancel & Restock
                </Button>
              </>
            )}

            {(order.paymentStatus === 'PAID' || order.paymentStatus === 'PARTIALLY_REFUNDED') &&
              order.orderStatus !== 'REFUNDED' && (
                <Button
                  variant="outline"
                  onClick={() => setShowRefundModal(true)}
                  disabled={actionLoading}
                  className="text-purple-700 border-purple-200 hover:bg-purple-50 text-xs h-9"
                >
                  <RefreshCw className="mr-1.5 h-4 w-4" /> Issue Refund
                </Button>
              )}
          </div>
        </div>

        {/* State Machine Permitted Transitions Indicator */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="font-semibold text-slate-700">Permitted Transitions:</span>
          {order.allowedTransitions.length > 0 ? (
            order.allowedTransitions.map((t) => (
              <Badge key={t} variant="secondary" className="font-mono text-[11px] font-normal">
                {t}
              </Badge>
            ))
          ) : (
            <span className="italic text-slate-400">Terminal state — no transitions permitted</span>
          )}
        </div>
      </div>

      {/* 2-Column Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols wide): Line Items, Consignments, RMAs, Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card: Immutable Line Item Snapshots */}
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
            <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Package className="h-4 w-4 text-slate-500" />
                Immutable Line-Item Snapshots ({order.items.length} items)
              </h2>
              <span className="text-xs text-slate-500">Preserved at time of purchase</span>
            </div>

            <div className="divide-y divide-slate-100">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                        {item.skuSnapshot}
                      </span>
                      {item.serializedItemId && (
                        <Badge className="bg-purple-50 text-purple-700 border-purple-200 text-[10px]">
                          <Barcode className="mr-1 h-3 w-3" /> Serialized Used Part
                        </Badge>
                      )}
                    </div>
                    <div className="font-semibold text-sm text-slate-900">{item.titleSnapshot}</div>
                    <div className="text-xs text-slate-500">
                      Sale Unit:{' '}
                      <strong className="text-slate-700">{item.saleUnitNameSnapshot}</strong>{' '}
                      (Multiplier: {item.baseQuantityMultiplierSnapshot}) • Physical stock consumed:{' '}
                      <strong className="text-slate-700">{item.baseUnitsConsumed} units</strong>
                    </div>
                  </div>

                  <div className="text-right sm:min-w-36">
                    <div className="text-xs text-slate-500">
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

          {/* Card: Courier Consignments & Tracking */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Truck className="h-4 w-4 text-indigo-600" />
                Consignments & Tracking
              </h2>
              <span className="text-xs text-slate-500">
                {order.shipments.length} consignment{order.shipments.length === 1 ? '' : 's'}{' '}
                recorded
              </span>
            </div>

            {order.shipments.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2">
                No courier consignments or trade pickups recorded yet for this order.
              </p>
            ) : (
              <div className="space-y-3">
                {order.shipments.map((s) => (
                  <div
                    key={s.id}
                    className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="font-semibold text-slate-900 text-sm">{s.carrierName}</div>
                      <div className="font-mono text-slate-600">
                        Consignment #: <strong>{s.trackingNumber}</strong>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Dispatched:{' '}
                        {s.shippedAt
                          ? new Date(s.shippedAt).toLocaleDateString('en-NZ', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Pending'}
                        {s.deliveredAt &&
                          ` • Delivered: ${new Date(s.deliveredAt).toLocaleDateString('en-NZ', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}`}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200">
                        {s.status}
                      </Badge>
                      {s.trackingUrl && (
                        <a
                          href={s.trackingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 bg-white border border-slate-200 px-2.5 py-1 rounded text-blue-600 hover:text-blue-800 hover:bg-slate-50 text-xs font-medium"
                        >
                          Track <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Card: Returns & RMAs */}
          {order.returnRequests.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <RotateCcw className="h-4 w-4 text-purple-600" />
                  Return Authorizations & RMAs ({order.returnRequests.length})
                </h2>
              </div>

              <div className="space-y-4">
                {order.returnRequests.map((rma) => (
                  <div
                    key={rma.id}
                    className="rounded-lg border border-purple-200 bg-purple-50/20 p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2 border-b border-purple-100 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-purple-900">
                          {rma.rmaNumber}
                        </span>
                        <Badge variant="outline" className="bg-white text-xs">
                          {rma.reasonCode}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-purple-100 text-purple-800 font-medium">
                          {rma.status}
                        </Badge>
                        {rma.status === 'PENDING_REVIEW' && (
                          <div className="flex items-center gap-1.5">
                            <Button
                              size="sm"
                              onClick={() => handleRmaReview(rma.id, 'APPROVE')}
                              disabled={actionLoading}
                              className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              Approve Return
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRmaReview(rma.id, 'REJECT')}
                              disabled={actionLoading}
                              className="h-7 text-xs text-rose-700 border-rose-200"
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-xs text-slate-700">
                      <strong>Customer Notes:</strong> {rma.customerNotes}
                    </div>

                    {/* Return Items and Inspection details */}
                    <div className="space-y-2 pt-2">
                      <div className="text-xs font-semibold text-slate-600">
                        Returned Part Line Items:
                      </div>
                      {rma.items.map((item) => (
                        <div
                          key={item.id}
                          className="p-2.5 rounded bg-white border border-slate-200 flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-mono font-bold text-slate-800 mr-2">
                              {item.sku}
                            </span>
                            <span className="text-slate-700">{item.productTitle}</span>
                            <span className="text-slate-500 ml-2">(Qty: {item.quantity})</span>
                          </div>

                          <div>
                            {item.inspection ? (
                              <div className="text-right">
                                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                                  Inspected: {item.inspection.disposition}
                                </Badge>
                                <div className="text-[10px] text-slate-500 mt-0.5">
                                  Notes: {item.inspection.inspectionNotes}
                                </div>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setInspectingItem(item)}
                                className="h-7 text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                              >
                                <Wrench className="mr-1 h-3 w-3" /> Record Quality Inspection
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Card: Audit Timeline */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Clock className="h-4 w-4 text-slate-500" />
              Complete Order Audit Timeline
            </h2>

            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {order.timeline.map((evt) => (
                <div key={evt.id} className="relative text-xs">
                  <div className="absolute -left-6 top-1 h-2.5 w-2.5 rounded-full bg-blue-600 border-2 border-white ring-1 ring-blue-600" />
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{evt.title}</span>
                    <span className="text-slate-400 font-mono text-[11px]">
                      {new Date(evt.timestamp).toLocaleDateString('en-NZ', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="mt-0.5 text-slate-600">{evt.description}</p>
                  {evt.actor && (
                    <span className="inline-block mt-1 text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                      Actor: {evt.actor}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Financial Breakdown, Customer & Destination Snapshot */}
        <div className="space-y-6">
          {/* Card: Financial Summary */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
            <h2 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-600" /> Financial Summary
            </h2>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Items Gross Subtotal:</span>
                <span className="font-mono">${order.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Included Statutory 15% GST:</span>
                <span className="font-mono">${order.taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Freight & Handling:</span>
                <span className="font-mono">
                  {order.shippingFee === 0
                    ? 'FREE (Depot Pickup)'
                    : `$${order.shippingFee.toFixed(2)}`}
                </span>
              </div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Discount Applied:</span>
                  <span className="font-mono">-${order.discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-slate-200 pt-2 text-sm font-bold text-slate-900">
                <span>Total Amount:</span>
                <span className="font-mono text-base">${order.totalAmount.toFixed(2)} NZD</span>
              </div>
            </div>

            {/* Payment Transactions */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <div className="text-xs font-semibold text-slate-700">Gateway Transactions:</div>
              {order.paymentTransactions.length === 0 ? (
                <div className="text-xs text-slate-400 italic">No transaction records found.</div>
              ) : (
                order.paymentTransactions.map((pt) => (
                  <div
                    key={pt.id}
                    className="p-2 rounded bg-slate-50 border border-slate-200 text-[11px] font-mono space-y-0.5"
                  >
                    <div className="flex justify-between font-bold">
                      <span>{pt.provider}</span>
                      <span
                        className={pt.status === 'SUCCESS' ? 'text-emerald-700' : 'text-purple-700'}
                      >
                        {pt.status}
                      </span>
                    </div>
                    <div className="text-slate-500 truncate">Ref: {pt.transactionReference}</div>
                    <div className="text-slate-700 font-sans">
                      ${pt.amount.toFixed(2)} {pt.currency}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Card: Customer & Destination Snapshot */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
            <h2 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
              <User className="h-4 w-4 text-blue-600" /> Customer & Delivery Details
            </h2>

            <div className="space-y-3 text-xs">
              <div>
                <div className="font-semibold text-slate-500 text-[11px] uppercase tracking-wider">
                  Contact
                </div>
                <div className="font-medium text-slate-900 mt-0.5 flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-slate-400" /> {order.customerEmail}
                </div>
                {order.customerPhone && (
                  <div className="text-slate-600 mt-1 flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-slate-400" /> {order.customerPhone}
                  </div>
                )}
              </div>

              <div className="border-t border-slate-100 pt-2">
                <div className="font-semibold text-slate-500 text-[11px] uppercase tracking-wider">
                  Fulfillment Method
                </div>
                <div className="mt-1">
                  {isClickAndCollect ? (
                    <span className="font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-xs inline-flex items-center gap-1">
                      <Boxes className="h-3 w-3" /> Auckland Depot Trade Counter Collection
                    </span>
                  ) : (
                    <span className="font-semibold text-indigo-800 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded text-xs inline-flex items-center gap-1">
                      <Truck className="h-3 w-3" /> Standard New Zealand Courier Freight
                    </span>
                  )}
                </div>
              </div>

              <div className="border-t border-slate-100 pt-2">
                <div className="font-semibold text-slate-500 text-[11px] uppercase tracking-wider">
                  Shipping Destination
                </div>
                <div className="mt-1 text-slate-800 space-y-0.5">
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
                  <div className="text-[11px] text-slate-500">{order.shippingAddress.country}</div>
                  {order.shippingAddress.deliveryNotes && (
                    <div className="mt-2 text-amber-800 bg-amber-50 p-2 rounded text-[11px] border border-amber-200">
                      <strong>Notes:</strong> {order.shippingAddress.deliveryNotes}
                    </div>
                  )}
                </div>
              </div>

              {order.notes && (
                <div className="border-t border-slate-100 pt-2">
                  <div className="font-semibold text-slate-500 text-[11px] uppercase tracking-wider">
                    Staff & Order Internal Notes
                  </div>
                  <pre className="mt-1 p-2 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-700 whitespace-pre-wrap font-sans">
                    {order.notes}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* MODAL: Dispatch Courier Consignment */}
      {/* ------------------------------------------------------------------ */}
      {showDispatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Truck className="h-5 w-5 text-indigo-600" /> Dispatch Courier Shipment
            </h3>
            <p className="text-xs text-slate-500">
              Generate a consignment tracking record for Order <strong>{order.orderNumber}</strong>.
              This action marks the order as <strong>SHIPPED</strong>.
            </p>

            <form onSubmit={handleDispatch} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Carrier Provider</label>
                <select
                  value={carrierName}
                  onChange={(e) => setCarrierName(e.target.value)}
                  className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-xs"
                >
                  <option value="CourierPost / NZ Post">CourierPost / NZ Post (Preferred Linehaul)</option>
                  <option value="Mainfreight Logistics">Mainfreight Logistics (Bulk / Heavy)</option>
                  <option value="Aramex NZ">Aramex NZ Priority Courier</option>
                  <option value="TNT / FedEx New Zealand">TNT / FedEx New Zealand</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Consignment / Tracking Number *
                </label>
                <Input
                  required
                  placeholder="e.g. STAR-99201948 or AP99827364AU"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className="text-xs h-9"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Dispatcher Notes (Optional)
                </label>
                <Input
                  placeholder="e.g. 2 pallets staged at Dock 3"
                  value={dispatchNotes}
                  onChange={(e) => setDispatchNotes(e.target.value)}
                  className="text-xs h-9"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowDispatchModal(false)}
                  className="text-xs h-8"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={actionLoading || !trackingNumber.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8"
                >
                  {actionLoading ? 'Booking...' : 'Confirm Dispatch'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* MODAL: Depot Collection Confirmation */}
      {/* ------------------------------------------------------------------ */}
      {showCollectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" /> Gate 2 Trade Counter Collection
            </h3>
            <p className="text-xs text-slate-500">
              Verify customer ID at Gate 2 counter before releasing goods. This action transitions
              order to <strong>DELIVERED</strong>.
            </p>

            <form onSubmit={handleDepotCollection} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Collector Full Name *
                </label>
                <Input
                  required
                  value={collectedByName}
                  onChange={(e) => setCollectedByName(e.target.value)}
                  className="text-xs h-9"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">ID Document Type</label>
                <select
                  value={idDocType}
                  onChange={(e) => setIdDocType(e.target.value)}
                  className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-xs"
                >
                  <option value="NZ Driver Licence">NZ Driver Licence</option>
                  <option value="NZ Passport">NZ Passport</option>
                  <option value="International Passport">International Passport</option>
                  <option value="Trade Account Authorisation Letter">
                    Trade Account Authorisation Letter
                  </option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  ID Last 4 Digits (Audit Proof)
                </label>
                <Input
                  placeholder="e.g. 8842"
                  value={idDocLast4}
                  onChange={(e) => setIdDocLast4(e.target.value)}
                  className="text-xs h-9 font-mono"
                  maxLength={4}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCollectModal(false)}
                  className="text-xs h-8"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={actionLoading || !collectedByName.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8"
                >
                  {actionLoading ? 'Saving...' : 'Confirm Delivery & Release'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* MODAL: Cancel & Restock Order */}
      {/* ------------------------------------------------------------------ */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-rose-900 flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-rose-600" /> Cancel Order & Restock Inventory
            </h3>
            <p className="text-xs text-slate-600">
              Are you sure you want to cancel Order <strong>{order.orderNumber}</strong>? All line
              items will be automatically restocked to available inventory with an auditable
              movement record.
            </p>

            <form onSubmit={handleCancelOrder} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Cancellation Reason *
                </label>
                <Input
                  required
                  placeholder="e.g. Customer called to cancel before dispatch"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="text-xs h-9"
                />
              </div>

              {order.paymentStatus === 'PAID' && (
                <label className="flex items-center gap-2 text-slate-700 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={refundOnCancel}
                    onChange={(e) => setRefundOnCancel(e.target.checked)}
                    className="rounded text-rose-600 focus:ring-rose-500"
                  />
                  <span>Automatically execute payment refund via gateway</span>
                </label>
              )}

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
                  {actionLoading ? 'Processing...' : 'Confirm Cancellation'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* MODAL: Issue Payment Refund */}
      {/* ------------------------------------------------------------------ */}
      {showRefundModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-purple-900 flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-purple-600" /> Execute Gateway Refund
            </h3>
            <p className="text-xs text-slate-600">
              Process a full or partial refund for Order <strong>{order.orderNumber}</strong>. Funds
              will be credited back to the original payment method.
            </p>

            <form onSubmit={handleProcessRefund} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Refund Amount ($ NZD) *
                </label>
                <Input
                  required
                  type="number"
                  step="0.01"
                  max={order.totalAmount}
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  className="text-xs h-9 font-mono"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Reason for Refund *
                </label>
                <Input
                  required
                  placeholder="e.g. RMA return approved / damaged part allowance"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="text-xs h-9"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowRefundModal(false)}
                  className="text-xs h-8"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={actionLoading || !refundReason.trim()}
                  className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-8"
                >
                  {actionLoading ? 'Refunding...' : 'Confirm Refund'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* MODAL: Record Return Physical Inspection */}
      {/* ------------------------------------------------------------------ */}
      {inspectingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Wrench className="h-5 w-5 text-indigo-600" /> Physical Part Inspection Disposition
            </h3>
            <p className="text-xs text-slate-500">
              Inspect physical part: <strong>{inspectingItem.productTitle}</strong> (
              {inspectingItem.sku}). Your disposition choice triggers auditable inventory stock
              movements.
            </p>

            <form onSubmit={handleInspectionSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Quality Disposition Decision *
                </label>
                <select
                  value={inspectionDisposition}
                  onChange={(e) => setInspectionDisposition(e.target.value as ReturnDisposition)}
                  className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-xs"
                >
                  <option value="RESTOCK_TO_INVENTORY">
                    RESTOCK_TO_INVENTORY (Passed test; return to live sellable stock)
                  </option>
                  <option value="SCRAP_WRITEOFF">
                    SCRAP_WRITEOFF (Failed quality test; decommission/scrap item)
                  </option>
                  <option value="RETURN_TO_SENDER">
                    RETURN_TO_SENDER (Customer damaged / out of warranty)
                  </option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Inspection Notes & Test Readings *
                </label>
                <Input
                  required
                  placeholder="e.g. Tread depth verified 8.2mm, no bead damage or puncture"
                  value={inspectionNotes}
                  onChange={(e) => setInspectionNotes(e.target.value)}
                  className="text-xs h-9"
                />
              </div>

              <label className="flex items-center gap-2 text-slate-700 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={refundEligible}
                  onChange={(e) => setRefundEligible(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>Eligible for Customer Refund</span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setInspectingItem(null)}
                  className="text-xs h-8"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={actionLoading || !inspectionNotes.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8"
                >
                  {actionLoading ? 'Saving...' : 'Submit Inspection'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
