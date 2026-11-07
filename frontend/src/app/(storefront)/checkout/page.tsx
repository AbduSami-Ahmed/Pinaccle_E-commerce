'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  Lock,
  Clock,
  MapPin,
  Truck,
  CreditCard,
  AlertCircle,
  ArrowLeft,
  Package,
  Check,
  Building2,
  Phone,
  Mail,
  Loader2,
} from 'lucide-react';
import { CartDto, ShippingMethod } from '@pinnacle/contracts';
import { fetchCart } from '@/lib/cart';
import {
  createCheckoutOrder,
  createPaymentSession,
  confirmMockPayment,
  validateCheckout,
  DEPOT_ADDRESS,
} from '@/lib/checkout';

export default function CheckoutPage() {
  const router = useRouter();

  // Cart state
  const [cart, setCart] = useState<CartDto | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  // Fulfilment state
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>('CLICK_AND_COLLECT');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('NSW');
  const [postalCode, setPostalCode] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');

  // Payment mock state
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [cardName, setCardName] = useState('');

  // Status & validation
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [simulateFailure, setSimulateFailure] = useState(false);

  // Soft reservation countdown timer (15 minutes = 900 seconds)
  const [secondsRemaining, setSecondsRemaining] = useState(15 * 60);

  useEffect(() => {
    async function loadCartData() {
      try {
        const c = await fetchCart();
        setCart(c);
      } catch {
        // Handled gracefully
      } finally {
        setLoading(false);
      }
    }
    loadCartData();
  }, []);

  // 15-minute reservation timer ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Pricing calculations
  const subtotal = cart?.totals.subtotal ?? 0;
  const shippingFee =
    shippingMethod === 'CLICK_AND_COLLECT'
      ? 0.0
      : shippingMethod === 'EXPRESS_COURIER'
        ? 45.0
        : 25.0;
  const grossTotal = Number((subtotal + shippingFee).toFixed(2));
  const taxIncluded = Number((subtotal * (10 / 110)).toFixed(2));

  // Handle Form Submit & Payment
  async function handleSubmitCheckout(e: React.FormEvent) {
    e.preventDefault();
    setErrorBanner(null);

    if (!email || !phone || !firstName || !lastName) {
      setErrorBanner('Please fill in all required customer contact fields.');
      return;
    }

    if (shippingMethod !== 'CLICK_AND_COLLECT') {
      if (!addressLine1 || !city || !state || !postalCode) {
        setErrorBanner('Please provide complete delivery address details.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // 1. Server-side cart revalidation check
      const validation = await validateCheckout({
        shippingMethod,
        shippingAddress: {
          line1: addressLine1,
          city,
          state,
          postalCode,
          country: 'AU',
        },
      });

      if (!validation.isValid) {
        setErrorBanner(
          validation.errors?.[0] || 'Cart validation failed. Some items may be out of stock.',
        );
        setIsSubmitting(false);
        return;
      }

      // 2. Create Order with snapshot line items and 15-min soft reservation
      const order = await createCheckoutOrder({
        customerEmail: email,
        customerPhone: phone,
        customerFirstName: firstName,
        customerLastName: lastName,
        shippingMethod,
        shippingAddress:
          shippingMethod === 'CLICK_AND_COLLECT'
            ? {
                firstName,
                lastName,
                company: 'Click & Collect (Sydney Depot)',
                line1: DEPOT_ADDRESS.line1,
                city: DEPOT_ADDRESS.city,
                state: DEPOT_ADDRESS.state,
                postalCode: DEPOT_ADDRESS.postalCode,
                country: 'AU',
                phone,
                deliveryNotes: DEPOT_ADDRESS.instructions,
              }
            : {
                firstName,
                lastName,
                line1: addressLine1,
                line2: addressLine2 || undefined,
                city,
                state,
                postalCode,
                country: 'AU',
                phone,
                deliveryNotes: deliveryNotes || undefined,
              },
        notes: deliveryNotes,
      });

      // 3. Create Gateway Payment Session
      const session = await createPaymentSession({
        orderId: order.id,
        provider: 'MOCK',
      });

      // 4. Confirm Payment (Simulated gateway / Stripe adapter)
      const confirmRes = await confirmMockPayment(session.transactionReference, !simulateFailure);

      if (!confirmRes.success) {
        setErrorBanner(
          'Payment simulation declined. Soft reservation has been safely released back to inventory.',
        );
        setIsSubmitting(false);
        return;
      }

      // 5. Success! Navigate to verified Order Confirmation screen
      router.push(`/checkout/confirmation/${order.orderNumber}`);
    } catch (err: any) {
      setErrorBanner(err.message || 'An unexpected error occurred during checkout.');
      setIsSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-white">
        <div className="flex items-center gap-3 text-slate-300">
          <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
          <span>Validating stock availability and prices...</span>
        </div>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 py-16 px-4">
        <div className="max-w-md mx-auto text-center bg-slate-900/80 border border-slate-800 rounded-xl p-8">
          <Package className="w-12 h-12 text-slate-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Your Cart is Empty</h1>
          <p className="text-slate-400 text-sm mb-6">
            There are no parts or tyres selected for checkout. Add items to begin.
          </p>
          <Link
            href="/search"
            className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold px-6 py-2.5 rounded-lg text-sm transition"
          >
            <ArrowLeft className="w-4 h-4" /> Browse Catalogue
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header Breadcrumb */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/cart"
              className="text-slate-400 hover:text-white inline-flex items-center gap-1.5 text-sm transition"
            >
              <ArrowLeft className="w-4 h-4" /> Return to Cart
            </Link>
            <span className="text-slate-600">/</span>
            <span className="text-white font-medium text-sm">Secure Trade Checkout</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>256-Bit SSL Encrypted</span>
          </div>
        </div>

        {/* 15-Minute Soft Reservation Banner */}
        <div className="mb-8 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-200">Temporary Stock Hold Active</p>
              <p className="text-xs text-amber-300/80">
                Your items are reserved in our Prestons depot inventory for{' '}
                <span className="font-mono font-bold text-amber-100">
                  {formatTime(secondsRemaining)}
                </span>{' '}
                minutes while you checkout.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono bg-slate-900/60 px-3 py-1.5 rounded-md border border-amber-500/20 text-amber-300">
            <span>Timeout Expiry:</span>
            <span className="font-bold text-amber-200">{formatTime(secondsRemaining)}</span>
          </div>
        </div>

        {/* Error Alert */}
        {errorBanner && (
          <div className="mb-6 bg-red-950/60 border border-red-500/50 rounded-xl p-4 text-red-200 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold">Checkout Alert</p>
              <p>{errorBanner}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmitCheckout} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Checkout Form Column */}
          <div className="lg:col-span-7 space-y-8">
            {/* 1. Customer Contact Details */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 text-xs font-black flex items-center justify-center">
                    1
                  </span>
                  Customer & Contact Information
                </h2>
                <span className="text-xs text-slate-400">Tax Invoice Recipient</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    First Name <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="e.g. Brett"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Last Name <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="e.g. Callaghan"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Email Address <span className="text-amber-400">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. brett@workshop.com.au"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9.5 pr-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Mobile Phone <span className="text-amber-400">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. 0412 889 900"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9.5 pr-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Fulfilment & Delivery Method */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 text-xs font-black flex items-center justify-center">
                    2
                  </span>
                  Fulfilment & Delivery Method
                </h2>
                <span className="text-xs text-slate-400">Prestons NSW Depot Dispatch</span>
              </div>

              <div className="space-y-3 mb-6">
                {/* Click & Collect Option */}
                <label
                  className={`flex items-start justify-between p-4 rounded-xl border cursor-pointer transition ${
                    shippingMethod === 'CLICK_AND_COLLECT'
                      ? 'bg-amber-500/10 border-amber-500/50 text-white'
                      : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="shippingMethod"
                      value="CLICK_AND_COLLECT"
                      checked={shippingMethod === 'CLICK_AND_COLLECT'}
                      onChange={() => setShippingMethod('CLICK_AND_COLLECT')}
                      className="mt-1 accent-amber-500"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-amber-400" />
                        <span className="font-semibold text-sm">
                          Click & Collect (Sydney Trade Depot)
                        </span>
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-mono font-bold">
                          FREE
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        42 Jedda Road, Prestons NSW 2170 — Ready in 2 business hours.
                      </p>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-sm text-emerald-400">$0.00</span>
                </label>

                {/* Standard Freight Courier */}
                <label
                  className={`flex items-start justify-between p-4 rounded-xl border cursor-pointer transition ${
                    shippingMethod === 'STANDARD_COURIER'
                      ? 'bg-amber-500/10 border-amber-500/50 text-white'
                      : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="shippingMethod"
                      value="STANDARD_COURIER"
                      checked={shippingMethod === 'STANDARD_COURIER'}
                      onChange={() => setShippingMethod('STANDARD_COURIER')}
                      className="mt-1 accent-amber-500"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-amber-400" />
                        <span className="font-semibold text-sm">Standard Freight Courier</span>
                        <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                          2–5 Days
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        StarTrack / TNT road freight direct to your workshop or commercial bay.
                      </p>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-sm text-slate-200">$25.00</span>
                </label>

                {/* Express Priority Courier */}
                <label
                  className={`flex items-start justify-between p-4 rounded-xl border cursor-pointer transition ${
                    shippingMethod === 'EXPRESS_COURIER'
                      ? 'bg-amber-500/10 border-amber-500/50 text-white'
                      : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="shippingMethod"
                      value="EXPRESS_COURIER"
                      checked={shippingMethod === 'EXPRESS_COURIER'}
                      onChange={() => setShippingMethod('EXPRESS_COURIER')}
                      className="mt-1 accent-amber-500"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-amber-400" />
                        <span className="font-semibold text-sm">Express Priority Courier</span>
                        <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-mono font-bold">
                          1–2 Days
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Expedited transport priority dispatch for urgent automotive repairs.
                      </p>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-sm text-slate-200">$45.00</span>
                </label>
              </div>

              {/* Fulfilment Details Box */}
              {shippingMethod === 'CLICK_AND_COLLECT' ? (
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 text-xs space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 font-semibold">
                    <Building2 className="w-4 h-4" />
                    <span>Depot Trade Collection Instructions</span>
                  </div>
                  <p className="text-slate-300">
                    <span className="font-bold text-white">{DEPOT_ADDRESS.name}</span>
                    <br />
                    {DEPOT_ADDRESS.line1}, {DEPOT_ADDRESS.city} {DEPOT_ADDRESS.state}{' '}
                    {DEPOT_ADDRESS.postalCode}
                  </p>
                  <p className="text-slate-400">
                    <span className="font-semibold text-slate-300">Hours:</span>{' '}
                    {DEPOT_ADDRESS.hours}
                  </p>
                  <p className="text-amber-300/80">
                    * Please present your Order Confirmation email and matching photo ID at Gate 2.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Street Address <span className="text-amber-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={addressLine1}
                      onChange={(e) => setAddressLine1(e.target.value)}
                      placeholder="e.g. 14 Trade Street, Unit 2"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Apartment / Suite / Unit (Optional)
                    </label>
                    <input
                      type="text"
                      value={addressLine2}
                      onChange={(e) => setAddressLine2(e.target.value)}
                      placeholder="e.g. Bay 3"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">
                        Suburb / City <span className="text-amber-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="e.g. Liverpool"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">
                        State <span className="text-amber-400">*</span>
                      </label>
                      <select
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                      >
                        <option value="NSW">NSW</option>
                        <option value="VIC">VIC</option>
                        <option value="QLD">QLD</option>
                        <option value="WA">WA</option>
                        <option value="SA">SA</option>
                        <option value="TAS">TAS</option>
                        <option value="ACT">ACT</option>
                        <option value="NT">NT</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">
                        Postcode <span className="text-amber-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={postalCode}
                        onChange={(e) => setPostalCode(e.target.value)}
                        placeholder="e.g. 2170"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Delivery & Forklift Access Notes (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={deliveryNotes}
                      onChange={(e) => setDeliveryNotes(e.target.value)}
                      placeholder="e.g. Leave pallet at rear workshop roller door. Forklift on site."
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 3. Secure Payment Gateway Element */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 text-xs font-black flex items-center justify-center">
                    3
                  </span>
                  Payment Gateway
                </h2>
                <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Verified PCI-DSS Level 1</span>
                </div>
              </div>

              {/* Mock Sandbox Tester Banner */}
              <div className="mb-5 bg-blue-950/40 border border-blue-500/30 rounded-lg p-3 text-xs flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 text-blue-300">
                  <CreditCard className="w-4 h-4 text-blue-400" />
                  <span>
                    <strong className="text-blue-200">Sandbox Gateway:</strong> Test credit card
                    execution or simulate gateway rejection.
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSimulateFailure(false)}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                      !simulateFailure
                        ? 'bg-emerald-500 text-slate-950 font-bold'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Simulate Success
                  </button>
                  <button
                    type="button"
                    onClick={() => setSimulateFailure(true)}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                      simulateFailure
                        ? 'bg-red-500 text-white font-bold'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Simulate Failure
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Cardholder Name
                  </label>
                  <input
                    type="text"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    placeholder="e.g. BRETT CALLAGHAN"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-500 uppercase font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Card Number
                  </label>
                  <div className="relative">
                    <CreditCard className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      maxLength={19}
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      placeholder="•••• •••• •••• 4242"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9.5 pr-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-500 font-mono tracking-wider"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Expiry Date
                    </label>
                    <input
                      type="text"
                      maxLength={5}
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      placeholder="MM/YY"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Security Code (CVC)
                    </label>
                    <input
                      type="text"
                      maxLength={4}
                      value={cardCvc}
                      onChange={(e) => setCardCvc(e.target.value)}
                      placeholder="123"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
                <span>Raw card numbers are never stored on Pinnacle servers.</span>
                <span>Licensed Recycler MVRL-58291</span>
              </div>
            </div>
          </div>

          {/* Order Summary Sidebar Column */}
          <div className="lg:col-span-5">
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 sticky top-24 space-y-6">
              <h2 className="text-lg font-bold text-white flex items-center justify-between border-b border-slate-800 pb-3">
                <span>Order Summary</span>
                <span className="text-xs font-normal text-slate-400">
                  {cart.totalPacksCount} {cart.totalPacksCount === 1 ? 'Pack' : 'Packs'} (
                  {cart.totalPhysicalUnitsCount} Units)
                </span>
              </h2>

              {/* Item Snapshot List */}
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {cart.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60"
                  >
                    <div className="w-14 h-14 rounded-md bg-slate-900 border border-slate-800 shrink-0 overflow-hidden relative">
                      {item.primaryImageUrl ? (
                        <Image
                          src={item.primaryImageUrl}
                          alt={item.productTitle}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-600">
                          <Package className="w-6 h-6" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white truncate">
                        {item.productTitle}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono">
                          {item.productSku}
                        </span>
                        <span className="text-[10px] text-amber-400 font-medium">
                          {item.saleUnitName}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Qty: <strong className="text-slate-200">{item.quantity}</strong> &times; $
                        {item.unitPrice.toFixed(2)} AUD
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-mono font-bold text-xs text-white">
                        ${item.lineTotal.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Price Breakdown */}
              <div className="space-y-2.5 pt-4 border-t border-slate-800 text-sm">
                <div className="flex justify-between text-slate-400">
                  <span>Items Subtotal</span>
                  <span className="font-mono text-slate-200">${subtotal.toFixed(2)} AUD</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span className="flex items-center gap-1.5">
                    Freight / Delivery
                    <span className="text-[10px] bg-slate-800 px-1.5 py-0.2 rounded text-slate-300">
                      {shippingMethod === 'CLICK_AND_COLLECT' ? 'Depot Collection' : 'Courier'}
                    </span>
                  </span>
                  <span className="font-mono text-slate-200">
                    {shippingFee === 0 ? (
                      <span className="text-emerald-400 font-bold">FREE</span>
                    ) : (
                      `$${shippingFee.toFixed(2)} AUD`
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Statutory GST Included (10%)</span>
                  <span className="font-mono text-slate-300">${taxIncluded.toFixed(2)} AUD</span>
                </div>

                <div className="pt-3 border-t border-slate-800 flex justify-between items-baseline">
                  <div>
                    <span className="text-base font-bold text-white">Total Amount</span>
                    <p className="text-[11px] text-slate-400">Tax-Inclusive (AUD)</p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black font-mono text-amber-400">
                      ${grossTotal.toFixed(2)}
                    </span>
                    <span className="text-xs text-slate-400 ml-1">AUD</span>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || secondsRemaining <= 0}
                className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold py-3.5 px-4 rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-slate-950" />
                    <span>Authorising Payment...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Pay ${grossTotal.toFixed(2)} AUD & Confirm Order</span>
                  </>
                )}
              </button>

              {/* Guarantee list */}
              <div className="pt-2 border-t border-slate-800/80 space-y-1.5 text-[11px] text-slate-400">
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Licensed NSW Motor Vehicle Recycler (MVRL-58291)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Tax Invoice generated with ATO ABN verification</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Standard 90-day trade warranty on all inspected parts</span>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
