'use client';

import React from 'react';
import { ShieldCheck } from 'lucide-react';

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8 space-y-8 text-zinc-300 text-xs leading-relaxed">
      <div className="border-b border-zinc-800 pb-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-DEFAULT/10 border border-brand-DEFAULT/30 text-brand-DEFAULT mx-auto mb-3 shadow-glow">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h1 className="text-3xl font-black text-white">STRAP Privacy Policy</h1>
        <p className="text-xs text-zinc-400 mt-1">Last Updated: November 2026</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-base font-bold text-white uppercase tracking-wider">1. Biometric Data Collection</h2>
        <p>
          STRAP collects biometric variables such as age, height, weight, circumferences, sleep hours, and training logs solely to calibrate our algorithmic progressive overload and personalized nutrition calculations. We do not sell or monetize personal biometric telemetry.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-bold text-white uppercase tracking-wider">2. Google Gemini AI Processing</h2>
        <p>
          Biometric metrics passed to Google Gemini are sanitized and scoped purely to prompt context for workout split and nutrition synthesis. We never expose API credentials to client applications.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-bold text-white uppercase tracking-wider">3. Payment & Banking Privacy</h2>
        <p>
          STRAP does not store or process debit/credit card numbers or UPI PINs. Manual UPI payments are reconciled solely using transaction UTR reference codes against bank ledger entries.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-bold text-white uppercase tracking-wider">4. User Autonomy & Deletion</h2>
        <p>
          You retain full control over your telemetry. You may request complete erasure of your account, workout logs, and historical measurements at any time by contacting support.
        </p>
      </section>
    </div>
  );
}
