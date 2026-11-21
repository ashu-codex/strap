'use client';

import React from 'react';
import Link from 'next/link';
import { CheckCircle2, Check, Sparkles, ArrowRight, ShieldCheck, HelpCircle } from 'lucide-react';
import { useApp } from '@/components/Providers';

export default function PricingPage() {
  const { auth, authLoading } = useApp();
  const isLoggedIn = Boolean(auth?.user);
  const isPremium = Boolean(auth?.isPremium);
  const freeFeatures = [
    'User account creation & profile',
    'Biometric & fitness goal selection',
    'Basic dashboard overview',
    'Body weight tracking baseline',
    'Limited exercise previews',
    'Community access',
  ];

  const premiumFeatures = [
    'Unlimited personalized AI workout plans',
    'AI-generated workout splits (PPL, Upper/Lower, Full Body, Bro Split)',
    'Complete 12-category exercise library',
    'Biomechanics instructions and muscle activation maps',
    'Dynamic sets, reps, and rest recommendations',
    'Systematic progressive overload tracking',
    'Continuous AI workout modifications',
    'Personalized fat-loss and hypertrophy protocols',
    'Body recomposition & strength routines',
    'Mifflin-St Jeor metabolic calorie & macro calculator (P/C/F)',
    'Hydration and meal timing guidance',
    'Autonomic recovery & sleep tracking',
    'Central nervous system readiness scoring (Ready, Recovering, Rest)',
    'Live gym workout tracking with rest timer',
    'Personal record (PR) 1RM milestone tracking',
    'Cumulative training volume analytics',
    'Weekly AI workout adaptation based on fatigue logs',
    'Body circumference measurement tracking',
    '24/7 STRAP Coach chat',
    'Automated workout calendar & streak monitoring',
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 space-y-12">
      <div className="text-center max-w-3xl mx-auto">
        <span className="text-xs font-bold uppercase tracking-widest text-brand bg-brand/10 px-3 py-1 rounded-full border border-brand/20">
          Transparent Athletic Subscription
        </span>
        <h1 className="text-3xl sm:text-5xl font-black text-white mt-3 mb-4">
          Invest in True Scientific Progression
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 max-w-xl mx-auto leading-relaxed">
          Start for free to establish your biometric baseline, or upgrade to STRAP Premium for complete intelligent fitness autonomy for only ₹100/month.
        </p>
      </div>

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {/* FREE PLAN */}
        <div className="rounded-3xl border border-card-border bg-card p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">STRAP Free</h2>
              <span className="text-xs font-semibold bg-zinc-800 text-zinc-300 px-3 py-1 rounded-full">
                Baseline
              </span>
            </div>

            <div className="text-3xl font-black text-white mb-4">
              ₹0 <span className="text-xs font-normal text-zinc-400">/ forever</span>
            </div>

            <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
              Ideal for initial baseline profiling and basic habit formation.
            </p>

            <div className="space-y-3 mb-8">
              {freeFeatures.map((f, i) => (
                <div key={i} className="flex items-center gap-2.5 text-xs text-zinc-300">
                  <Check className="h-4 w-4 text-zinc-500 shrink-0" />
                  <span>{f}</span>
                </div>
              ))}
            </div>
          </div>

          <Link
            href={isLoggedIn || authLoading ? '/dashboard' : '/signup'}
            className="w-full text-center py-3 rounded-xl bg-zinc-900 border border-zinc-700 text-xs font-bold text-white hover:bg-zinc-800 transition-colors"
          >
            {isLoggedIn ? 'Go to Dashboard' : 'Start Free'}
          </Link>
        </div>

        {/* PREMIUM PLAN */}
        <div className="relative rounded-3xl border-2 border-brand bg-card p-8 flex flex-col justify-between shadow-glow-lg">
          <div className="absolute -top-3.5 right-8 bg-brand text-black font-extrabold text-[10px] uppercase tracking-wider px-3.5 py-0.5 rounded-full shadow-glow">
            Recommended
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-1.5">
                STRAP Premium <Sparkles className="h-4 w-4 text-brand fill-brand" />
              </h2>
              <span className="text-xs font-bold bg-brand/20 text-brand px-3 py-1 rounded-full border border-brand/30">
                Full AI Stack
              </span>
            </div>

            <div className="text-3xl font-black text-white mb-4 flex items-baseline gap-1">
              ₹100 <span className="text-xs font-normal text-zinc-400">/ month</span>
            </div>

            <p className="text-xs text-zinc-300 mb-6 leading-relaxed">
              Full autonomous fitness system with personalized coaching, progressive overload tracking, nutrition tracking, and recovery readiness.
            </p>

            <div className="space-y-2.5 mb-8 max-h-80 overflow-y-auto pr-1">
              {premiumFeatures.map((f, i) => (
                <div key={i} className="flex items-start gap-2.5 text-xs text-zinc-200">
                  <CheckCircle2 className="h-4 w-4 text-brand shrink-0 mt-0.5" />
                  <span>{f}</span>
                </div>
              ))}
            </div>
          </div>

          <Link
            href={isLoggedIn && isPremium ? '/dashboard' : '/checkout'}
            className="w-full flex items-center justify-center gap-2 text-center py-3.5 rounded-xl bg-brand text-xs font-extrabold text-black hover:bg-brand-400 transition-all shadow-glow hover:scale-[1.02] strap-primary"
          >
            <span>{isLoggedIn && isPremium ? 'Premium Active — Open Dashboard' : 'Upgrade to Premium (₹100)'}</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Security note */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-center max-w-2xl mx-auto space-y-2">
        <ShieldCheck className="h-6 w-6 text-brand mx-auto" />
        <h4 className="text-sm font-bold text-white">Manual UPI & Secure Bank Verification</h4>
        <p className="text-xs text-zinc-400 leading-relaxed">
          Payments are verified directly via UPI ID <strong className="text-zinc-200">ashutosh-k82@ptyes</strong> against bank transaction records. Unverified attempts never activate access.
        </p>
      </div>
    </div>
  );
}
