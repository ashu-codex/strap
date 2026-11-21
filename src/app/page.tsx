'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Dumbbell,
  HeartPulse,
  BrainCircuit,
  TrendingUp,
  ShieldCheck,
  Zap,
  Clock,
  Layers,
  ChevronDown,
  Play,
  Check,
} from 'lucide-react';
import { useApp } from '@/components/Providers';

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const { auth, authLoading } = useApp();
  const isLoggedIn = Boolean(auth?.user);
  const isPremium = Boolean(auth?.isPremium);
  const evalHref = isLoggedIn || authLoading ? '/onboarding' : '/signup';

  const strapSteps = [
    {
      letter: 'S',
      title: 'Start',
      subtitle: 'Precision Baseline Assessment',
      desc: 'Input your biometric metrics, age, experience level, available equipment, and fitness goals to calibrate your exact baseline.',
      color: 'from-lime-400 to-green-500',
    },
    {
      letter: 'T',
      title: 'Train',
      subtitle: 'Scientifically Structured Splits',
      desc: 'Execute AI-recommended daily workouts with precise exercise selection, sets, reps, load targets, and rest intervals.',
      color: 'from-green-400 to-emerald-500',
    },
    {
      letter: 'R',
      title: 'Recover',
      subtitle: 'Sleep & Autonomic Readiness Tracking',
      desc: 'Track sleep duration, perceived exertion, and muscle soreness to calculate your daily nervous system recovery score.',
      color: 'from-emerald-400 to-teal-500',
    },
    {
      letter: 'A',
      title: 'Adapt',
      subtitle: 'Continuous Weekly Adaptation',
      desc: 'STRAP evaluates your completed volume and fatigue to adjust future workout intensity and progression automatically.',
      color: 'from-teal-400 to-cyan-500',
    },
    {
      letter: 'P',
      title: 'Progress',
      subtitle: 'Predictable Hypertrophy & Strength',
      desc: 'Break through plateaus with automated progressive overload rules and empirical personal record (PR) tracking.',
      color: 'from-cyan-400 to-lime-400',
    },
  ];

  const features = [
    {
      icon: BrainCircuit,
      title: 'STRAP Intelligence Engine',
      description: 'Dynamic split generation customized for gym, home, dumbbell-only, or full barbell setups.',
    },
    {
      icon: TrendingUp,
      title: 'Systematic Progressive Overload',
      description: 'Real-time adjustments to load and reps based on your actual performed sets and RPE feedback.',
    },
    {
      icon: HeartPulse,
      title: 'Recovery-Driven Periodization',
      description: 'Know when to push for personal bests and when to schedule active recovery or deloads.',
    },
    {
      icon: Dumbbell,
      title: '12-Category Exercise Library',
      description: 'Biomechanical instructions, muscle activation maps, cues, and joint-friendly alternatives.',
    },
    {
      icon: Zap,
      title: 'Metabolic Nutrition Planner',
      description: 'Mifflin-St Jeor BMR/TDEE calculations with goal-calibrated protein, carb, fat, and hydration targets.',
    },
    {
      icon: ShieldCheck,
      title: 'Interactive Workout Logger',
      description: 'Live rest timers, set-by-set weight logging, and celebratory PR tracking in the gym.',
    },
  ];

  const faqs = [
    {
      q: 'How does STRAP differ from traditional generic fitness apps?',
      a: 'Traditional apps give everyone the same cookie-cutter 4-week routine. STRAP analyzes your personal biometrics, schedule, available equipment, and actual workout performance, continuously adapting your split and volume on a weekly basis.',
    },
    {
      q: 'What is the price of STRAP Premium?',
      a: 'STRAP Premium is only ₹100 per month. It gives you unlimited personalized workout plans, complete exercise library access, nutrition calculations, recovery readiness analytics, and 24/7 access to the STRAP Coach.',
    },
    {
      q: 'Which payment methods are accepted for STRAP Premium?',
      a: 'We support all major Indian UPI applications (Google Pay, PhonePe, Paytm, BHIM) through direct UPI ID and QR code, as well as cards and NetBanking where configured.',
    },
    {
      q: 'Can I use STRAP if I only workout at home with dumbbells?',
      a: 'Yes! During onboarding, select "Home" or "Hybrid" and specify your available equipment (e.g. Dumbbells, Bodyweight, Resistance Bands). The STRAP engine will generate an optimal split designed specifically for your gear.',
    },
    {
      q: 'How does the progressive overload system work?',
      a: 'When you log a workout, STRAP monitors your completed reps and RPE. If you consistently hit the top of your prescribed rep range with energy in reserve, STRAP automatically schedules micro-load increases (+2.5kg or +1 rep) for the next session.',
    },
  ];

  return (
    <div className="flex flex-col items-center">
      {/* 1. HERO SECTION */}
      <section className="relative w-full overflow-hidden pt-20 pb-24 md:pt-28 md:pb-32 px-4 sm:px-6 lg:px-8 border-b border-card-border">
        {/* Subtle background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-brand/10 blur-[130px] rounded-full pointer-events-none" />

        <div className="mx-auto max-w-5xl text-center relative z-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full bg-brand/10 border border-brand/30 px-3.5 py-1 text-xs font-semibold text-brand mb-8 shadow-glow">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Next-Generation AI Fitness Architecture</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-white mb-6 uppercase">
            STRAP
            <span className="block text-xl sm:text-2xl md:text-3xl font-bold tracking-normal normal-case text-zinc-300 mt-3">
              Train Smart. <span className="text-brand">Recover Better.</span> Progress Faster.
            </span>
          </h1>

          {/* Subheading */}
          <p className="mx-auto max-w-2xl text-base sm:text-lg text-zinc-400 leading-relaxed mb-10">
            Your body is unique. Your training should be too. STRAP is an intelligent fitness system that builds and continuously adapts your workout split, progressive overload, and nutrition based on actual biometric performance.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href={evalHref}
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-brand px-8 py-3.5 text-sm font-extrabold text-black hover:bg-brand-400 transition-all shadow-glow hover:scale-105 strap-primary"
            >
              <span>Start Free Evaluation</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href={isLoggedIn && isPremium ? '/dashboard' : '/checkout'}
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-zinc-900 border border-zinc-700 px-8 py-3.5 text-sm font-bold text-white hover:border-brand/50 hover:bg-zinc-800 transition-all"
            >
              <span>{isLoggedIn && isPremium ? 'Open Dashboard' : 'Unlock Premium — ₹100/mo'}</span>
            </Link>
          </div>

          {/* Biometric highlights pill */}
          <div className="mt-14 pt-8 border-t border-zinc-900 grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
            <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/80">
              <div className="text-[11px] text-zinc-400 uppercase font-semibold">Adaptive Engine</div>
              <div className="text-sm font-bold text-white">STRAP Intelligence</div>
            </div>
            <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/80">
              <div className="text-[11px] text-zinc-400 uppercase font-semibold">Subscription</div>
              <div className="text-sm font-bold text-brand">₹100 / Month</div>
            </div>
            <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/80">
              <div className="text-[11px] text-zinc-400 uppercase font-semibold">Payment Engine</div>
              <div className="text-sm font-bold text-white">Instant UPI & QR</div>
            </div>
            <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/80">
              <div className="text-[11px] text-zinc-400 uppercase font-semibold">Readiness Score</div>
              <div className="text-sm font-bold text-emerald-400">Autonomic Sleep Log</div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. THE S-T-R-A-P SYSTEM */}
      <section className="w-full py-20 px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="text-center mb-16">
          <span className="text-xs font-bold uppercase tracking-widest text-brand bg-brand/10 px-3 py-1 rounded-full border border-brand/20">
            The STRAP Philosophy
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-3">
            Five Pillars of Athletic Optimization
          </h2>
          <p className="text-sm text-zinc-400 max-w-xl mx-auto mt-2">
            Every workout split, meal target, and recovery recommendation is synchronized with this continuous closed-loop cycle.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {strapSteps.map((step, idx) => (
            <div
              key={idx}
              className="relative rounded-2xl bg-card border border-card-border p-5 hover:border-brand/50 transition-all hover:-translate-y-1 group"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand text-black font-black text-xl shadow-glow">
                  {step.letter}
                </span>
                <span className="text-[11px] font-mono text-zinc-500">0{idx + 1}</span>
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-brand transition-colors">
                {step.title}
              </h3>
              <p className="text-xs font-semibold text-zinc-400 mt-1 mb-2">{step.subtitle}</p>
              <p className="text-xs text-zinc-400 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 3. CORE FEATURES */}
      <section className="w-full py-20 px-4 sm:px-6 lg:px-8 max-w-7xl border-t border-card-border">
        <div className="text-center mb-16">
          <span className="text-xs font-bold uppercase tracking-widest text-brand bg-brand/10 px-3 py-1 rounded-full border border-brand/20">
            Engineered For Performance
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-3">
            What You Get With STRAP
          </h2>
          <p className="text-sm text-zinc-400 max-w-xl mx-auto mt-2">
            A unified stack replacing your workout notebook, macro tracker, and personal trainer.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div
                key={idx}
                className="rounded-2xl bg-card border border-card-border p-6 hover:border-zinc-700 transition-colors"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-900 border border-zinc-800 text-brand mb-4 shadow-glow">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-white mb-2">{feat.title}</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">{feat.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. PRICING SECTION */}
      <section className="w-full py-20 px-4 sm:px-6 lg:px-8 max-w-5xl border-t border-card-border">
        <div className="text-center mb-14">
          <span className="text-xs font-bold uppercase tracking-widest text-brand bg-brand/10 px-3 py-1 rounded-full border border-brand/20">
            Simple, Transparent Pricing
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-3">
            Choose Your Level
          </h2>
          <p className="text-sm text-zinc-400 max-w-md mx-auto mt-2">
            Experience the platform free, or upgrade to STRAP Premium for complete intelligent fitness autonomy.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* FREE PLAN */}
          <div className="rounded-2xl bg-card border border-card-border p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">STRAP Free</h3>
                <span className="text-xs font-semibold bg-zinc-800 text-zinc-300 px-2.5 py-0.5 rounded-full">
                  Basic
                </span>
              </div>
              <div className="text-3xl font-black text-white mb-4">
                ₹0 <span className="text-xs font-normal text-zinc-400">/ forever</span>
              </div>
              <p className="text-xs text-zinc-400 mb-6">
                Perfect for establishing your biometric profile and exploring the platform foundation.
              </p>

              <div className="space-y-3 mb-8">
                {[
                  'Account creation & secure profile',
                  'Biometric & fitness goal selection',
                  'Basic dashboard overview',
                  'Weight logging baseline',
                  'Exercise previews',
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-xs text-zinc-300">
                    <Check className="h-4 w-4 text-zinc-500 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <Link
              href={isLoggedIn || authLoading ? '/dashboard' : '/signup'}
              className="w-full text-center py-3 text-xs font-bold text-white bg-zinc-900 border border-zinc-700 rounded-xl hover:bg-zinc-800 transition-colors"
            >
              {isLoggedIn ? 'Go to Dashboard' : 'Get Started Free'}
            </Link>
          </div>

          {/* PREMIUM PLAN */}
          <div className="relative rounded-2xl bg-card border-2 border-brand p-8 flex flex-col justify-between shadow-glow-lg">
            <div className="absolute -top-3 right-6 bg-brand text-black font-extrabold text-[10px] uppercase tracking-wider px-3 py-0.5 rounded-full shadow-glow">
              Recommended
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-1.5">
                  STRAP Premium <Sparkles className="h-4 w-4 text-brand fill-brand" />
                </h3>
                <span className="text-xs font-semibold bg-brand/20 text-brand px-2.5 py-0.5 rounded-full border border-brand/30">
                  Full Access
                </span>
              </div>
              <div className="text-3xl font-black text-white mb-4 flex items-baseline gap-1">
                ₹100 <span className="text-xs font-normal text-zinc-400">/ monthly</span>
              </div>
              <p className="text-xs text-zinc-300 mb-6">
                Complete, automated intelligence designed to maximize muscular hypertrophy, strength, and recovery.
              </p>

              <div className="space-y-3 mb-8">
                {[
                  'Unlimited AI-generated workout splits',
                  'Complete 12-category exercise library & instructions',
                  'Dynamic progressive overload calculations',
                  'Personalized calories & macro targets (P/C/F)',
                  'Autonomic recovery & sleep readiness score',
                  'Live gym workout tracker & rest timer',
                  'Empirical PR & volume analytics',
                  'Continuous 24/7 STRAP Coach',
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-xs text-zinc-200">
                    <CheckCircle2 className="h-4 w-4 text-brand shrink-0" />
                    <span className="font-medium">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <Link
              href={isLoggedIn && isPremium ? '/dashboard' : '/checkout'}
              className="w-full flex items-center justify-center gap-2 text-center py-3 text-xs font-extrabold text-black bg-brand rounded-xl hover:bg-brand-400 transition-all shadow-glow hover:scale-[1.02] strap-primary"
            >
              <span>{isLoggedIn && isPremium ? 'Premium Active — Open Dashboard' : 'Upgrade to Premium (₹100)'}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 5. FAQ SECTION */}
      <section className="w-full py-20 px-4 sm:px-6 lg:px-8 max-w-4xl border-t border-card-border">
        <div className="text-center mb-12">
          <span className="text-xs font-bold uppercase tracking-widest text-brand bg-brand/10 px-3 py-1 rounded-full border border-brand/20">
            Got Questions?
          </span>
          <h2 className="text-3xl font-extrabold text-white mt-3">Frequently Asked Questions</h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="rounded-xl bg-card border border-card-border overflow-hidden transition-colors"
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between p-4 text-left text-sm font-semibold text-white hover:text-brand transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`h-4 w-4 text-zinc-400 transition-transform ${
                      isOpen ? 'rotate-180 text-brand' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 pt-1 text-xs text-zinc-400 leading-relaxed border-t border-zinc-900">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 6. BOTTOM CALL TO ACTION */}
      <section className="w-full py-16 px-4 sm:px-6 lg:px-8 bg-zinc-950 border-t border-card-border text-center">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl sm:text-3xl font-black text-white mb-3">
            Ready to Train With True Scientific Precision?
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 mb-8 max-w-lg mx-auto">
            Join STRAP today. Build your baseline, execute your custom split, and let the AI handle your periodization.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href={evalHref}
              className="w-full sm:w-auto px-7 py-3 rounded-xl bg-brand text-black font-extrabold text-xs shadow-glow hover:bg-brand-400 transition-all strap-primary"
            >
              {isLoggedIn ? 'Start Free Evaluation' : 'Create Account Free'}
            </Link>
            <Link
              href={isLoggedIn && isPremium ? '/dashboard' : '/checkout'}
              className="w-full sm:w-auto px-7 py-3 rounded-xl bg-zinc-900 border border-zinc-700 text-white font-bold text-xs hover:border-brand/50 transition-colors"
            >
              {isLoggedIn && isPremium ? 'Open Dashboard' : 'Pay via UPI (₹100)'}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
