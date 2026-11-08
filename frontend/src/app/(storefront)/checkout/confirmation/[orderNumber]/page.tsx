'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Building2,
  Truck,
  Printer,
  ArrowRight,
  FileText,
  Clock,
  Loader2,
} from 'lucide-react';
import { OrderDetailsDto } from '@pinnacle/contracts';
import { getOrderByNumber, DEPOT_ADDRESS } from '@/lib/checkout';

export default function OrderConfirmationPage() {
  const params = useParams();
  const orderNumber = params['orderNumber'] as string;

  const [order, setOrder] = useState<OrderDetailsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadOrder() {
      if (!orderNumber) return;
      try {
        const fetched = await getOrderByNumber(orderNumber);
        setOrder(fetched);
      } catch (err: any) {
        setError(err.message || 'Unable to retrieve order details.');
      } finally {
        setLoading(false);
      }
    }
    loadOrder();
  }, [orderNumber]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-white">
        <div className="flex items-center gap-3 text-slate-300">
          <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
          <span>Verifying order status with Pinnacle database...</span>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 py-16 px-4">
        <div className="max-w-md mx-auto text-center bg-slate-900 border border-slate-800 rounded-xl p-8">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Order Not Found</h1>
          <p className="text-slate-400 text-sm mb-6">
            We could not locate an order matching reference &ldquo;{orderNumber}&rdquo;.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-6 py-2.5 rounded-lg text-sm transition"
          >
            Return to Homepage
          </Link>
        </div>
      </div>
    );
  }

  const isPaid = order.paymentStatus === 'PAID' || order.orderStatus === 'PAID';
  const isCancelled = order.orderStatus === 'CANCELLED' || order.paymentStatus === 'FAILED';
  const isPending = !isPaid && !isCancelled;

  const isClickAndCollect =
    order.shippingMethod === 'CLICK_AND_COLLECT' ||
    order.shippingAddress.company?.includes('Click & Collect') ||
    (order.shippingAddress.city === 'Penrose' && order.shippingAddress.postalCode === '1061');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 lg:px-8 print:bg-white print:text-black">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Status Header Banner */}
        {isPaid && (
          <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-2xl p-6 sm:p-8 text-center space-y-3">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto ring-8 ring-emerald-500/10">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              Order Confirmed & Payment Verified
            </h1>
            <p className="text-emerald-200/90 text-sm sm:text-base max-w-xl mx-auto">
              Thank you for your business. A tax invoice has been generated and sent to{' '}
              <strong className="text-white">{order.customerEmail}</strong>.
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-xs font-mono font-bold text-emerald-300">
              <span>REFERENCE:</span>
              <span className="text-white">{order.orderNumber}</span>
            </div>
          </div>
        )}

        {isPending && (
          <div className="bg-amber-950/40 border border-amber-500/40 rounded-2xl p-6 sm:p-8 text-center space-y-3">
            <div className="w-16 h-16 bg-amber-500/20 text-amber-400 rounded-full flex items-center justify-center mx-auto">
              <Clock className="w-10 h-10 animate-pulse" />
            </div>
            <h1 className="text-2xl font-bold text-white">Payment Pending Acknowledgment</h1>
            <p className="text-amber-200 text-sm max-w-xl mx-auto">
              Your order <strong className="text-white">{order.orderNumber}</strong> has been
              received and is awaiting gateway confirmation. Your stock remains reserved.
            </p>
            <div className="pt-2">
              <Link
                href="/checkout"
                className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-6 py-2.5 rounded-lg text-sm transition"
              >
                Retry Payment
              </Link>
            </div>
          </div>
        )}

        {isCancelled && (
          <div className="bg-red-950/40 border border-red-500/40 rounded-2xl p-6 sm:p-8 text-center space-y-3">
            <div className="w-16 h-16 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-10 h-10 text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">Order Cancelled or Timed Out</h1>
            <p className="text-red-200 text-sm max-w-xl mx-auto">
              This order was cancelled due to payment failure or the 15-minute reservation timer
              expiring. Items have been released back to general depot stock.
            </p>
            <div className="pt-2">
              <Link
                href="/cart"
                className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-6 py-2.5 rounded-lg text-sm transition"
              >
                Return to Cart
              </Link>
            </div>
          </div>
        )}

        {/* Order Details & Fulfilment Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-8">
          {/* Header Row */}
          <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-800 pb-6">
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                Official Tax Invoice / Receipt
              </p>
              <h2 className="text-xl font-mono font-bold text-white mt-1">
                Order #{order.orderNumber}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Placed on{' '}
                {new Date(order.createdAt).toLocaleDateString('en-NZ', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>

            <div className="flex items-center gap-3 print:hidden">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition"
              >
                <Printer className="w-4 h-4" />
                <span>Print Tax Invoice</span>
              </button>
              <Link
                href="/account"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-semibold transition"
              >
                <span>View My Account</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Fulfilment Instructions Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Fulfilment Mode Card */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
                {isClickAndCollect ? (
                  <>
                    <Building2 className="w-4 h-4" />
                    <span>Click & Collect (Auckland Trade Depot)</span>
                  </>
                ) : (
                  <>
                    <Truck className="w-4 h-4" />
                    <span>Courier Delivery (CourierPost / Mainfreight)</span>
                  </>
                )}
              </div>

              {isClickAndCollect ? (
                <div className="text-xs text-slate-300 space-y-1.5">
                  <p className="font-bold text-white">{DEPOT_ADDRESS.name}</p>
                  <p>
                    {DEPOT_ADDRESS.line1}, {DEPOT_ADDRESS.city} {DEPOT_ADDRESS.state}{' '}
                    {DEPOT_ADDRESS.postalCode}
                  </p>
                  <p className="text-slate-400 pt-1">
                    <strong className="text-slate-200">Collection Hours:</strong>{' '}
                    {DEPOT_ADDRESS.hours}
                  </p>
                  <p className="text-amber-300 pt-1 font-medium">{DEPOT_ADDRESS.instructions}</p>
                </div>
              ) : (
                <div className="text-xs text-slate-300 space-y-1">
                  <p className="font-semibold text-white">
                    {order.shippingAddress.firstName} {order.shippingAddress.lastName}
                  </p>
                  {order.shippingAddress.company && <p>{order.shippingAddress.company}</p>}
                  <p>{order.shippingAddress.line1}</p>
                  {order.shippingAddress.line2 && <p>{order.shippingAddress.line2}</p>}
                  <p>
                    {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
                    {order.shippingAddress.postalCode}
                  </p>
                  <p className="text-slate-400 pt-1">Phone: {order.shippingAddress.phone}</p>
                </div>
              )}
            </div>

            {/* Customer & Merchant Identification */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-slate-300 font-semibold text-sm">
                <FileText className="w-4 h-4 text-slate-400" />
                <span>Merchant & Compliance Metadata</span>
              </div>
              <div className="text-xs text-slate-400 space-y-1">
                <p>
                  <strong className="text-slate-200">Entity:</strong> Pinnacle Auto Spares &amp; Commercial Tyres Ltd
                </p>
                <p>
                  <strong className="text-slate-200">Registered Trader:</strong> MVD-89211
                </p>
                <p>
                  <strong className="text-slate-200">NZBN / GST:</strong> NZBN 9429041234567 | GST 123-456-789
                </p>
                <p>
                  <strong className="text-slate-200">Contact:</strong> (09) 525 8890 | 0800 PINNACLE | accounts@pinnacleparts.co.nz
                </p>
                <p>
                  <strong className="text-slate-200">Payment Status:</strong>{' '}
                  <span className="font-mono text-emerald-400 font-bold">
                    {order.paymentStatus}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Immutable Purchased Line Items Table */}
          <div>
            <h3 className="text-sm font-bold text-white mb-3">Purchased Line Items</h3>
            <div className="overflow-x-auto border border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Item & Specification</th>
                    <th className="py-3 px-4">SKU Snapshot</th>
                    <th className="py-3 px-4 text-center">Sale Unit</th>
                    <th className="py-3 px-4 text-center">Qty</th>
                    <th className="py-3 px-4 text-right">Unit Price</th>
                    <th className="py-3 px-4 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {order.items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-950/40">
                      <td className="py-3 px-4">
                        <p className="font-semibold text-white">{item.titleSnapshot}</p>
                        {item.serializedItemId && (
                          <span className="inline-block mt-0.5 text-[10px] font-mono bg-purple-500/20 text-purple-300 px-1.5 py-0.2 rounded">
                            Serialized Part
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300">{item.skuSnapshot}</td>
                      <td className="py-3 px-4 text-center text-slate-300">
                        {item.saleUnitNameSnapshot}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-white">
                        {item.quantity}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-300">
                        ${item.unitPrice.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-white">
                        ${item.totalPrice.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pricing & GST Breakdown Table */}
          <div className="flex justify-end pt-2">
            <div className="w-full sm:w-80 space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal</span>
                <span className="font-mono text-slate-200">${order.subtotal.toFixed(2)} NZD</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Freight / Delivery Fee</span>
                <span className="font-mono text-slate-200">
                  {order.shippingFee === 0 ? (
                    <span className="text-emerald-400 font-bold">FREE (Depot)</span>
                  ) : (
                    `$${order.shippingFee.toFixed(2)} NZD`
                  )}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Statutory 15% New Zealand GST</span>
                <span className="font-mono text-slate-300">
                  Includes ${order.taxAmount.toFixed(2)} NZD
                </span>
              </div>
              <div className="pt-2 border-t border-slate-800 flex justify-between items-baseline font-bold text-sm">
                <span className="text-white">Total Amount Paid</span>
                <span className="font-mono text-lg text-amber-400">
                  ${order.totalAmount.toFixed(2)} NZD
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-4 print:hidden">
          <Link href="/" className="hover:text-white transition">
            &larr; Return to Storefront Home
          </Link>
          <span>Pinnacle Auto Spares &bull; 18 Industry Rd, Penrose, Auckland 1061</span>
        </div>
      </div>
    </div>
  );
}
