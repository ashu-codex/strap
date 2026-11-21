'use client';

import React from 'react';
import { Check, Lock, ArrowRight, X } from 'lucide-react';
import { PrimaryButton, SecondaryButton } from '@/components/ui/Buttons';

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
    'Direct 24/7 conversation with STRAP Coach',
    'Automatic weekly plan adaptations based on recovery logs',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-[14px] border border-[#B7F34A]/40 bg-[#1B1D22] dark:bg-[#1B1D22] light:bg-[#FFFFFF] p-6 shadow-glow-lg text-[#F5F5F5] dark:text-[#F5F5F5] light:text-[#111318]">
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close modal"
          className="absolute right-4 top-4 rounded-[10px] p-1.5 text-[#9496A1] hover:text-white dark:hover:text-white light:hover:text-black hover:bg-[#252830] light:hover:bg-[#F0F2F5] transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header Icon */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-[10px] bg-[#B7F34A]/20 border border-[#B7F34A]/50 text-[#B7F34A] light:text-[#6BA814] shadow-glow">
            <Lock className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#6BA814] dark:text-[#B7F34A] bg-[#B7F34A]/15 px-2.5 py-0.5 rounded-[6px] border border-[#B7F34A]/30">
              STRAP Premium Required
            </span>
            <h3 className="text-xl font-black mt-1 text-[#F5F5F5] dark:text-[#FFFFFF] light:text-[#111318]">
              {featureTitle}
            </h3>
          </div>
        </div>

        <p className="text-xs text-[#9496A1] light:text-[#52525B] mb-5 leading-relaxed">
          {featureDescription} Upgrade today for only <strong className="text-[#F5F5F5] light:text-[#111318]">₹100/month</strong> and unlock the full power of the AI Fitness Engine.
        </p>

        {/* Perks list */}
        <div className="space-y-2 mb-6 max-h-56 overflow-y-auto pr-1">
          {premiumPerks.map((perk, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-[#F5F5F5] dark:text-[#E4E4E7] light:text-[#3F3F46]">
              <Check className="h-4 w-4 text-[#B7F34A] light:text-[#6BA814] shrink-0 mt-0.5" />
              <span>{perk}</span>
            </div>
          ))}
        </div>

        {/* Pricing & CTA */}
        <div className="rounded-[10px] bg-[#141519] dark:bg-[#141519] light:bg-[#F5F6F8] border border-[#30333A] light:border-[#E1E4E8] p-4 flex items-center justify-between mb-5">
          <div>
            <div className="text-[11px] text-[#9496A1] uppercase font-bold">Standard Membership</div>
            <div className="text-2xl font-black text-[#F5F5F5] dark:text-white light:text-[#111318] flex items-baseline gap-1">
              ₹100 <span className="text-xs font-normal text-[#9496A1]">/ month</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-[#6BA814] dark:text-[#B7F34A] font-mono font-bold block">Direct UPI & Gateway</span>
            <span className="text-[10px] text-[#9496A1]">30-Day Cycle</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <SecondaryButton fullWidth onClick={onClose}>
            Maybe Later
          </SecondaryButton>
          <PrimaryButton
            fullWidth
            onClick={() => {
              onClose();
              window.location.href = '/checkout';
            }}
            icon={<ArrowRight className="h-4 w-4" />}
          >
            Upgrade to Premium
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
