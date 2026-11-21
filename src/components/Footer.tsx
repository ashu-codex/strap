import React from 'react';
import Link from 'next/link';
import BrandLogo from '@/components/ui/BrandLogo';

export default function Footer() {
  return (
    <footer className="w-full border-t border-[#E1E4E8] dark:border-[#30333A] bg-[#FFFFFF] dark:bg-[#101114] text-[#52525B] dark:text-[#9496A1] text-xs transition-colors">
      <div className="mx-auto max-w-7xl px-4 pt-12 pb-24 lg:pb-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Info */}
          <div className="space-y-3 md:col-span-1">
            <BrandLogo size="md" showTagline={false} />
            <p className="text-[#52525B] dark:text-[#9496A1] text-xs leading-relaxed">
              Train Smart. Recover Better. Progress Faster.
            </p>
            <div className="pt-2 text-[11px] text-[#71717A] dark:text-[#626570] font-mono space-y-0.5">
              <p><strong className="text-[#6BA814] dark:text-[#B7F34A]">S</strong> — Start</p>
              <p><strong className="text-[#6BA814] dark:text-[#B7F34A]">T</strong> — Train</p>
              <p><strong className="text-[#6BA814] dark:text-[#B7F34A]">R</strong> — Recover</p>
              <p><strong className="text-[#6BA814] dark:text-[#B7F34A]">A</strong> — Adapt</p>
              <p><strong className="text-[#6BA814] dark:text-[#B7F34A]">P</strong> — Progress</p>
            </div>
          </div>

          {/* Product links */}
          <div>
            <h4 className="text-[#111318] dark:text-[#F5F5F5] font-bold text-xs uppercase tracking-wider mb-3">Platform</h4>
            <ul className="space-y-2.5">
              <li><Link href="/dashboard" className="hover:text-[#6BA814] dark:hover:text-[#B7F34A] transition-colors">Athlete Dashboard</Link></li>
              <li><Link href="/workout-planner" className="hover:text-[#6BA814] dark:hover:text-[#B7F34A] transition-colors">AI Workout Splits</Link></li>
              <li><Link href="/exercise-library" className="hover:text-[#6BA814] dark:hover:text-[#B7F34A] transition-colors">Exercise Library</Link></li>
              <li><Link href="/workout-tracker" className="hover:text-[#6BA814] dark:hover:text-[#B7F34A] transition-colors">Workout Tracker</Link></li>
              <li><Link href="/nutrition" className="hover:text-[#6BA814] dark:hover:text-[#B7F34A] transition-colors">Nutrition Calculator</Link></li>
              <li><Link href="/recovery" className="hover:text-[#6BA814] dark:hover:text-[#B7F34A] transition-colors">Recovery &amp; Sleep Engine</Link></li>
            </ul>
          </div>

          {/* Pricing & AI */}
          <div>
            <h4 className="text-[#111318] dark:text-[#F5F5F5] font-bold text-xs uppercase tracking-wider mb-3">Intelligence</h4>
            <ul className="space-y-2.5">
              <li><Link href="/ai-assistant" className="hover:text-[#6BA814] dark:hover:text-[#B7F34A] transition-colors">STRAP Coach</Link></li>
              <li><Link href="/pricing" className="hover:text-[#6BA814] dark:hover:text-[#B7F34A] transition-colors">Premium Membership</Link></li>
              <li><Link href="/checkout" className="hover:text-[#6BA814] dark:hover:text-[#B7F34A] transition-colors">UPI Direct Payment</Link></li>
              <li><Link href="/payment-history" className="hover:text-[#6BA814] dark:hover:text-[#B7F34A] transition-colors">Payment Verification</Link></li>
              <li><Link href="/analytics" className="hover:text-[#6BA814] dark:hover:text-[#B7F34A] transition-colors">Strength Progression</Link></li>
            </ul>
          </div>

          {/* Legal & Support */}
          <div>
            <h4 className="text-[#111318] dark:text-[#F5F5F5] font-bold text-xs uppercase tracking-wider mb-3">Legal &amp; Support</h4>
            <ul className="space-y-2.5">
              <li><Link href="/privacy" className="hover:text-[#6BA814] dark:hover:text-[#B7F34A] transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-[#6BA814] dark:hover:text-[#B7F34A] transition-colors">Terms and Conditions</Link></li>
              <li><Link href="/contact" className="hover:text-[#6BA814] dark:hover:text-[#B7F34A] transition-colors">Contact Support</Link></li>
              <li>
                <a
                  href="mailto:straptrainorg@gmail.com"
                  className="hover:text-[#6BA814] dark:hover:text-[#B7F34A] transition-colors break-all"
                >
                  straptrainorg@gmail.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-[#E1E4E8] dark:border-[#30333A] flex flex-col sm:flex-row items-center justify-between gap-4 text-[#71717A] dark:text-[#626570] text-[11px]">
          <p>© {new Date().getFullYear()} STRAP Fitness Technologies Inc. All rights reserved.</p>
          <p className="text-center sm:text-right">
            Disclaimer: Estimates and AI recommendations are for educational and athletic training purposes only, not medical prescriptions.
          </p>
        </div>
      </div>
    </footer>
  );
}
