'use client';

import React from 'react';
import { Sparkles, Check, Lock, ArrowRight, X } from 'lucide-react';

interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureTitle?: string;
  featureDescription?: string;
}

export default function PremiumModal({
  isOpen,
  onClose,
  featureTitle = 'Unlock STRAP Premium',
  featureDescription = 'This intelligent feature is reserved exclusively for STRAP Premium athletes.',
}: PremiumModalProps) {
  if (!isOpen) return null;

  const premiumPerks = [
    'Full access to all 12 exercise categories & detailed form guides',
    'AI-generated personalized workout splits (PPL, Upper/Lower, Bro Split, Home)',
    'Dynamic progressive overload algorithms and target loads',
    'Personalized daily calories, macro targets (P/C/F) & meal timing',
    'Daily sleep and readiness scoring (Ready, Recovering, Rest Recommended)',
    'Interactive workout session tracker & PR records tracker',
    'Direct 24/7 conversation with STRAP Gemini AI Fitness Coach',
    'Automatic weekly plan adaptations based on recovery logs',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl border border-brand-DEFAULT/30 bg-card p-6 shadow-glow-lg text-white">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header Icon */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-DEFAULT/20 border border-brand-DEFAULT/40 text-brand-DEFAULT shadow-glow">
            <Lock className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-brand-DEFAULT bg-brand-DEFAULT/10 px-2 py-0.5 rounded-full border border-brand-DEFAULT/20">
              STRAP Premium Required
            </span>
            <h3 className="text-xl font-bold text-white mt-0.5">{featureTitle}</h3>
          </div>
        </div>

        <p className="text-xs text-zinc-300 mb-5 leading-relaxed">
          {featureDescription} Upgrade today for only <strong>₹100/month</strong> and unlock the full power of the AI Fitness Engine.
        </p>

        {/* Perks list */}
        <div className="space-y-2 mb-6 max-h-56 overflow-y-auto pr-1">
          {premiumPerks.map((perk, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-zinc-300">
              <Check className="h-4 w-4 text-brand-DEFAULT shrink-0 mt-0.5" />
              <span>{perk}</span>
            </div>
          ))}
        </div>

        {/* Pricing & CTA */}
        <div className="rounded-xl bg-zinc-900/90 border border-zinc-800 p-4 flex items-center justify-between mb-4">
          <div>
            <div className="text-[11px] text-zinc-400 uppercase font-semibold">Standard Plan</div>
            <div className="text-2xl font-black text-white flex items-baseline gap-1">
              ₹100 <span className="text-xs font-normal text-zinc-400">/ month</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-brand-DEFAULT font-mono block">UPI & Card Supported</span>
            <span className="text-[10px] text-zinc-400">Cancel anytime</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl bg-zinc-800 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 transition-colors"
          >
            Maybe Later
          </button>
          <a
            href="/checkout"
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-brand-DEFAULT py-2.5 text-xs font-bold text-black hover:bg-brand-400 transition-all shadow-glow strap-primary"
          >
            <span>Upgrade to Premium</span>
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </div>
  );
}
