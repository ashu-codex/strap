'use client';

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  CreditCard,
  Sparkles,
  ShieldCheck,
  Check,
  Copy,
  Clock,
  ArrowRight,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { PrimaryButton, SecondaryButton } from '@/components/ui/Buttons';

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

  const refreshSubscription = async () => {
    try {
      const res = await fetch('/api/user/subscription', { cache: 'no-store' });
      const data = await res.json();
      const isPrem = Boolean(data.isPremium);
      setIsAlreadyPremium(isPrem);

      if (isPrem) {
        window.dispatchEvent(new Event('strap-auth-refresh'));
      }
      return data;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    refreshSubscription().finally(() => setLoading(false));

    QRCode.toDataURL(upiDeepLink, {
      width: 250,
      margin: 2,
      color: {
        dark: '#111318',
        light: '#B7F34A',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Failed to generate QR code:', err));
  }, [upiDeepLink]);

  // Polling for instant activation when payment is submitted and pending
  useEffect(() => {
    if (!submittedPayment || isAlreadyPremium) return;

    const id = window.setInterval(async () => {
      const data = await refreshSubscription();
      if (data?.isPremium) {
        setIsAlreadyPremium(true);
        if (submittedPayment) {
          setSubmittedPayment({ ...submittedPayment, payment_status: 'approved' });
        }
      }
    }, 3000);

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
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#B7F34A] border-t-transparent shadow-glow" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto">
        <span className="text-xs font-bold uppercase tracking-widest text-[#6BA814] dark:text-[#B7F34A] bg-[#B7F34A]/15 px-3 py-1 rounded-[6px] border border-[#B7F34A]/30">
          Direct UPI Verification Engine
        </span>
        <h1 className="text-3xl font-black text-[#111318] dark:text-white mt-3">Activate STRAP Premium</h1>
        <p className="text-xs text-[#9496A1] light:text-[#52525B] mt-1">
          Complete your monthly subscription of <strong>₹100</strong> via any UPI application and submit your transaction reference.
        </p>
      </div>

      {/* STATE A: PREMIUM IS ACTIVE */}
      {isAlreadyPremium && (!submittedPayment || submittedPayment?.payment_status === 'approved') ? (
        <div className="rounded-[14px] border border-[#B7F34A]/50 bg-[#1B1D22] dark:bg-[#1B1D22] light:bg-[#FFFFFF] p-8 text-center max-w-xl mx-auto shadow-glow space-y-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-[10px] bg-[#B7F34A]/20 text-[#B7F34A] light:text-[#6BA814] mx-auto shadow-glow">
            <CheckCircle2 className="h-9 w-9" />
          </div>

          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#6BA814] dark:text-[#B7F34A] bg-[#B7F34A]/15 px-3 py-1 rounded-full border border-[#B7F34A]/30">
              MEMBERSHIP STATUS: ACTIVE PREMIUM
            </span>
            <h2 className="text-2xl font-black text-[#111318] dark:text-white mt-3">
              You Have Active STRAP Premium!
            </h2>
            <p className="text-xs text-[#9496A1] light:text-[#52525B] max-w-md mx-auto mt-1 leading-relaxed">
              Your subscription is fully active. All AI workout splits, nutrition blueprints, recovery analytics, and 24/7 Gemini coach features are unlocked.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
            <PrimaryButton
              onClick={() => (window.location.href = '/workout-planner')}
              icon={<Sparkles className="h-4 w-4" />}
            >
              Access AI Workout Splits
            </PrimaryButton>
            <SecondaryButton
              onClick={() => (window.location.href = '/dashboard')}
            >
              Go to Dashboard
            </SecondaryButton>
          </div>
        </div>
      ) : submittedPayment && submittedPayment.payment_status === 'pending' ? (
        /* STATE B: PAYMENT PENDING CONFIRMATION SCREEN */
        <div className="rounded-[14px] border border-amber-500/40 bg-[#1B1D22] dark:bg-[#1B1D22] light:bg-[#FFFFFF] p-8 text-center max-w-xl mx-auto shadow-glow space-y-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-[10px] bg-amber-500/20 text-amber-400 mx-auto">
            <Clock className="h-7 w-7 animate-pulse" />
          </div>

          <span className="text-xs font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-3 py-1 rounded-[6px] border border-amber-500/30">
            Payment Status: PENDING VERIFICATION
          </span>

          <h2 className="text-xl font-black text-[#111318] dark:text-white">Transaction Reference Recorded</h2>

          <p className="text-xs text-[#9496A1] light:text-[#52525B] leading-relaxed max-w-md mx-auto">
            Your transaction reference <strong className="text-[#111318] dark:text-white font-mono">{submittedPayment.utr_reference}</strong> has been logged in our verification ledger.
          </p>

          <div className="p-4 rounded-[10px] bg-[#141519] dark:bg-[#141519] light:bg-[#F5F6F8] border border-[#30333A] light:border-[#E1E4E8] text-left text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-[#9496A1]">Amount:</span>
              <span className="font-bold text-[#111318] dark:text-white">₹{submittedPayment.amount_inr} INR</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#9496A1]">Destination UPI ID:</span>
              <span className="font-mono text-[#111318] dark:text-zinc-200">{submittedPayment.upi_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#9496A1]">UTR Reference:</span>
              <span className="font-mono text-[#6BA814] dark:text-[#B7F34A] font-bold">{submittedPayment.utr_reference}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#9496A1]">Verification Workflow:</span>
              <span className="text-amber-400 font-semibold">Admin Bank Statement Reconciliation</span>
            </div>
          </div>

          <p className="text-[11px] text-[#9496A1] leading-relaxed italic">
            This screen auto-refreshes every 3 seconds. Once approved by the administrator, Premium will activate automatically.
          </p>

          <div className="flex items-center justify-center gap-3 pt-2">
            <SecondaryButton onClick={() => (window.location.href = '/payment-history')}>
              View History
            </SecondaryButton>
            <PrimaryButton onClick={() => (window.location.href = '/dashboard')}>
              Return to Dashboard
            </PrimaryButton>
          </div>
        </div>
      ) : (
        /* STATE C: PAYMENT FORM & DYNAMIC QR CODE */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Left: Dynamic QR Code & Direct Link */}
          <div className="rounded-[14px] border border-[#30333A] light:border-[#E1E4E8] bg-[#1B1D22] dark:bg-[#1B1D22] light:bg-[#FFFFFF] p-6 flex flex-col items-center justify-between text-center shadow-glow">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6BA814] dark:text-[#B7F34A]">
                Step 1: Scan & Transfer
              </span>
              <h3 className="text-lg font-black text-[#111318] dark:text-white mt-1">Official UPI Destination</h3>
              <p className="text-xs text-[#9496A1] light:text-[#52525B] mt-0.5 mb-4">
                Scan with Google Pay, PhonePe, Paytm, or BHIM
              </p>

              {/* Dynamic QR Code Render */}
              <div className="relative mx-auto rounded-[10px] bg-[#B7F34A] p-3 shadow-glow w-fit">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="UPI Payment QR Code" className="h-48 w-48 rounded-[8px]" />
                ) : (
                  <div className="h-48 w-48 flex items-center justify-center bg-zinc-900 text-zinc-500 text-xs">
                    Generating QR...
                  </div>
                )}
              </div>

              {/* Copy UPI ID */}
              <div className="mt-4 flex items-center justify-center gap-2">
                <span className="font-mono text-xs font-bold text-[#111318] dark:text-zinc-200 bg-[#141519] dark:bg-[#141519] light:bg-[#F5F6F8] px-3 py-1.5 rounded-[8px] border border-[#30333A] light:border-[#E1E4E8]">
                  {upiId}
                </span>
                <button
                  type="button"
                  onClick={handleCopyUpi}
                  className="p-2 rounded-[8px] bg-[#141519] dark:bg-[#141519] light:bg-[#F5F6F8] text-[#9496A1] hover:text-[#111318] dark:hover:text-white transition-colors"
                  title="Copy UPI ID"
                >
                  {copied ? <Check className="h-4 w-4 text-[#B7F34A]" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Direct Pay Link for Mobile Users */}
            <div className="w-full pt-4 border-t border-[#30333A] light:border-[#E1E4E8] mt-4">
              <a
                href={upiDeepLink}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-[10px] border border-[#30333A] light:border-[#E1E4E8] bg-[#141519] dark:bg-[#141519] light:bg-[#F5F6F8] text-xs font-bold text-[#111318] dark:text-[#B7F34A] hover:border-[#B7F34A] transition-colors"
              >
                <span>Tap to Pay on Mobile UPI App</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

          {/* Right: Order Summary & UTR Submission Form */}
          <div className="rounded-[14px] border border-[#30333A] light:border-[#E1E4E8] bg-[#1B1D22] dark:bg-[#1B1D22] light:bg-[#FFFFFF] p-6 flex flex-col justify-between space-y-6">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6BA814] dark:text-[#B7F34A]">
                Step 2: Enter Transaction Details
              </span>
              <h3 className="text-lg font-black text-[#111318] dark:text-white mt-1">Submit Payment Reference</h3>
              <p className="text-xs text-[#9496A1] light:text-[#52525B] mt-0.5">
                After completing the ₹100 payment, enter the 12-digit UTR/Reference number from your banking app.
              </p>

              {/* Order breakdown */}
              <div className="mt-4 p-4 rounded-[10px] bg-[#141519] dark:bg-[#141519] light:bg-[#F5F6F8] border border-[#30333A] light:border-[#E1E4E8] space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#9496A1]">Plan:</span>
                  <span className="font-bold text-[#111318] dark:text-white">STRAP Premium Membership</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#9496A1]">Price:</span>
                  <span className="font-black text-[#6BA814] dark:text-[#B7F34A] text-sm">₹100 INR</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#9496A1]">Billing Cycle:</span>
                  <span className="text-[#111318] dark:text-zinc-300">30 Days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#9496A1]">Activation Rule:</span>
                  <span className="text-[#111318] dark:text-zinc-300">Admin Bank Verification</span>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mt-4 rounded-[10px] border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-400">
                  {error}
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmitUtr} className="mt-5 space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-[#111318] dark:text-zinc-300 mb-1">
                    UPI Transaction ID / 12-Digit UTR Number
                  </label>
                  <input
                    type="text"
                    required
                    value={utrReference}
                    onChange={(e) => setUtrReference(e.target.value)}
                    placeholder="e.g. 220868696814"
                    className="w-full rounded-[10px] border border-[#30333A] light:border-[#E1E4E8] bg-[#141519] dark:bg-[#141519] light:bg-white p-3 text-xs font-mono text-[#111318] dark:text-white placeholder-[#9496A1] focus:border-[#B7F34A] focus:outline-none focus:ring-1 focus:ring-[#B7F34A]"
                  />
                  <p className="text-[10px] text-[#9496A1] mt-1">
                    Found in your UPI receipt (Google Pay, PhonePe, Paytm, or BHIM).
                  </p>
                </div>

                <PrimaryButton
                  type="submit"
                  fullWidth
                  loading={submitting}
                  icon={<ShieldCheck className="h-4 w-4" />}
                >
                  Submit Reference for Verification
                </PrimaryButton>
              </form>
            </div>

            <div className="text-[11px] text-[#9496A1] leading-relaxed pt-2 border-t border-[#30333A] light:border-[#E1E4E8]">
              Security Rule: STRAP does not store banking credentials. Verification is performed directly against official credit records.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
