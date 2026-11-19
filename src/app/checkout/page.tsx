'use client';

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  CreditCard,
  QrCode,
  Sparkles,
  ShieldCheck,
  Check,
  Copy,
  Clock,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export default function CheckoutPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isAlreadyPremium, setIsAlreadyPremium] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [utrReference, setUtrReference] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submittedPayment, setSubmittedPayment] = useState<any | null>(null);

  const upiId = 'ashutosh-k82@ptyes';
  const upiName = 'STRAP Fitness';
  const amount = 100;
  const note = 'STRAP Premium Subscription';

  const upiDeepLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(
    upiName
  )}&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}`;

  const refreshSubscription = () =>
    fetch('/api/user/subscription', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        setIsAlreadyPremium(Boolean(data.isPremium));
        if (data.isPremium) {
          window.dispatchEvent(new Event('strap-auth-refresh'));
        }
        return data;
      });

  useEffect(() => {
    // 1. Check current subscription — never treat a pending UTR as paid
    refreshSubscription()
      .then(() => setLoading(false))
      .catch(() => setLoading(false));

    // 2. Generate QR Code
    QRCode.toDataURL(upiDeepLink, {
      width: 250,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#B7F34A',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Failed to generate QR code:', err));
  }, [upiDeepLink]);

  useEffect(() => {
    if (!submittedPayment || isAlreadyPremium) return;
    const id = window.setInterval(() => {
      refreshSubscription().catch(() => undefined);
    }, 5000);
    return () => window.clearInterval(id);
  }, [submittedPayment, isAlreadyPremium]);

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(upiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmitUtr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!utrReference.trim()) {
      setError('Please enter the 12-digit UTR or Transaction Reference number.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/payments/submit-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          utr_reference: utrReference,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit transaction reference');
      }

      setSubmittedPayment(data.payment);
      window.dispatchEvent(new Event('strap-auth-refresh'));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-DEFAULT border-t-transparent shadow-glow" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto">
        <span className="text-xs font-bold uppercase tracking-widest text-brand-DEFAULT bg-brand-DEFAULT/10 px-3 py-1 rounded-full border border-brand-DEFAULT/20">
          Direct UPI Verification
        </span>
        <h1 className="text-3xl font-black text-white mt-3">Activate STRAP Premium</h1>
        <p className="text-xs text-zinc-400 mt-1">
          Complete your payment of <strong>₹100</strong> via any UPI application and submit your transaction reference.
        </p>
      </div>

      {isAlreadyPremium && (
        <div className="rounded-2xl border border-brand-DEFAULT/40 bg-brand-DEFAULT/10 p-4 text-center">
          <span className="text-xs font-bold text-brand-DEFAULT flex items-center justify-center gap-1.5">
            <CheckCircle2 className="h-4 w-4" />
            <span>You currently have an ACTIVE STRAP Premium subscription!</span>
          </span>
          <p className="text-[11px] text-zinc-300 mt-1">
            You already enjoy full access to all AI splits, exercise guides, and nutrition modules. Submitting an additional payment will extend your duration.
          </p>
        </div>
      )}

      {submittedPayment ? (
        /* PAYMENT PENDING CONFIRMATION SCREEN */
        <div className="rounded-3xl border border-amber-500/30 bg-card p-8 text-center max-w-xl mx-auto shadow-glow space-y-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 mx-auto">
            <Clock className="h-7 w-7 animate-pulse" />
          </div>

          <span className="text-xs font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
            Payment Status: PENDING VERIFICATION
          </span>

          <h2 className="text-xl font-bold text-white">Reference Recorded</h2>

          <p className="text-xs text-zinc-300 leading-relaxed max-w-md mx-auto">
            Your transaction reference <strong className="text-white font-mono">{submittedPayment.utr_reference}</strong> has been logged in our secure verification ledger.
          </p>

          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-left text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-zinc-400">Amount:</span>
              <span className="font-bold text-white">₹{submittedPayment.amount_inr} INR</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Destination UPI ID:</span>
              <span className="font-mono text-zinc-200">{submittedPayment.upi_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">UTR / Ref Number:</span>
              <span className="font-mono text-brand-DEFAULT font-bold">{submittedPayment.utr_reference}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Verification Process:</span>
              <span className="text-amber-400 font-semibold">Admin Bank Reconciliation</span>
            </div>
          </div>

          <p className="text-[11px] text-zinc-400 leading-relaxed italic">
            Per strict security guidelines, access activates as soon as the administrator verifies the credit in the bank ledger (typically within 15–30 minutes).
          </p>

          <div className="flex items-center justify-center gap-3 pt-2">
            <a
              href="/payment-history"
              className="px-5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-xs font-bold text-white hover:bg-zinc-800 transition-colors"
            >
              View Payment Status History
            </a>
            <a
              href="/dashboard"
              className="px-5 py-2.5 rounded-xl bg-brand-DEFAULT text-xs font-bold text-black hover:bg-brand-400 transition-colors shadow-glow strap-primary"
            >
              Return to Dashboard
            </a>
          </div>
        </div>
      ) : (
        /* PAYMENT FORM & QR CODE */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Left: Dynamic QR Code & Direct Link */}
          <div className="rounded-3xl border border-card-border bg-card p-6 flex flex-col items-center justify-between text-center shadow-glow">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand-DEFAULT">
                Step 1: Scan & Transfer
              </span>
              <h3 className="text-lg font-bold text-white mt-1">Official UPI Destination</h3>
              <p className="text-xs text-zinc-400 mt-0.5 mb-4">
                Scan with Google Pay, PhonePe, Paytm, or BHIM
              </p>

              {/* Dynamic QR Code Render */}
              <div className="relative mx-auto rounded-2xl bg-[#bef264] p-3 shadow-glow w-fit">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="UPI Payment QR Code" className="h-48 w-48 rounded-xl" />
                ) : (
                  <div className="h-48 w-48 flex items-center justify-center bg-zinc-900 text-zinc-500 text-xs">
                    Generating QR...
                  </div>
                )}
              </div>

              {/* Copy UPI ID */}
              <div className="mt-4 flex items-center justify-center gap-2">
                <span className="font-mono text-xs font-bold text-zinc-200 bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800">
                  {upiId}
                </span>
                <button
                  type="button"
                  onClick={handleCopyUpi}
                  className="p-2 rounded-lg bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 transition-colors"
                  title="Copy UPI ID"
                >
                  {copied ? <Check className="h-4 w-4 text-brand-DEFAULT" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Direct Pay Link for Mobile Users */}
            <div className="w-full pt-4 border-t border-zinc-900 mt-4">
              <a
                href={upiDeepLink}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-xs font-bold text-brand-DEFAULT hover:bg-zinc-800 transition-colors"
              >
                <span>Tap to Pay on Mobile UPI App</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

          {/* Right: Order Summary & UTR Submission Form */}
          <div className="rounded-3xl border border-card-border bg-card p-6 flex flex-col justify-between space-y-6">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand-DEFAULT">
                Step 2: Enter Transaction Details
              </span>
              <h3 className="text-lg font-bold text-white mt-1">Order Summary</h3>

              {/* Summary box */}
              <div className="mt-4 rounded-xl bg-zinc-950 p-4 border border-zinc-800 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Plan:</span>
                  <span className="font-bold text-white">STRAP Premium (Monthly)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Price:</span>
                  <span className="font-black text-brand-DEFAULT text-sm">₹100 INR</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Billing Cycle:</span>
                  <span className="text-zinc-300">30 Days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Activation Rule:</span>
                  <span className="text-zinc-300">Upon Admin Bank Verification</span>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
                  {error}
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmitUtr} className="mt-5 space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                    UPI Transaction ID / 12-Digit UTR Number
                  </label>
                  <input
                    type="text"
                    required
                    value={utrReference}
                    onChange={(e) => setUtrReference(e.target.value)}
                    placeholder="e.g. 492817401928"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-xs font-mono text-white placeholder-zinc-500 focus:border-brand-DEFAULT focus:outline-none focus:ring-1 focus:ring-brand-DEFAULT shadow-glow"
                  />
                  <p className="text-[10px] text-zinc-500 mt-1">
                    Found in your UPI payment receipt (Google Pay, PhonePe, Paytm, or BHIM).
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-brand-DEFAULT text-xs font-extrabold text-black hover:bg-brand-400 transition-all shadow-glow disabled:opacity-50 strap-primary"
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>{submitting ? 'Submitting Reference...' : 'Submit Reference for Verification'}</span>
                </button>
              </form>
            </div>

            <div className="text-[11px] text-zinc-500 leading-relaxed pt-2 border-t border-zinc-900">
              Security Notice: STRAP does not store banking credentials. Verification is strictly performed against verified ledger receipts.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
