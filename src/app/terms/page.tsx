'use client';

import React from 'react';
import { FileText, AlertTriangle } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8 space-y-8 text-zinc-300 text-xs leading-relaxed">
      <div className="border-b border-zinc-800 pb-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-DEFAULT/10 border border-brand-DEFAULT/30 text-brand-DEFAULT mx-auto mb-3 shadow-glow">
          <FileText className="h-6 w-6" />
        </div>
        <h1 className="text-3xl font-black text-white">STRAP Terms & Conditions</h1>
        <p className="text-xs text-zinc-400 mt-1">Last Updated: November 2026</p>
      </div>

      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-300 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-amber-400" />
        <div>
          <strong className="block font-bold">Medical & Physical Activity Disclaimer:</strong>
          STRAP is an intelligent fitness training system designed for educational and athletic periodization. The calculations, progressive overload cues, and macronutrient estimates are not medical prescriptions. Always consult a licensed physician prior to initiating high-intensity resistance training.
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-base font-bold text-white uppercase tracking-wider">1. Subscription & Payment Terms</h2>
        <p>
          STRAP Premium subscriptions are billed at ₹100 per monthly period (or as configured in administrative settings). Payments made via UPI require transaction reference (UTR) verification before activation. Unverified references will not activate premium features.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-bold text-white uppercase tracking-wider">2. Account Responsibility</h2>
        <p>
          Users are responsible for maintaining the confidentiality of their credentials. You agree to notify STRAP immediately upon discovering unauthorized access to your account.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-bold text-white uppercase tracking-wider">3. Intellectual Property</h2>
        <p>
          All trademarks, logos, brand assets, proprietary algorithms, and software code associated with STRAP (Start, Train, Recover, Adapt, Progress) remain the exclusive intellectual property of STRAP Fitness Technologies Inc.
        </p>
      </section>
    </div>
  );
}
