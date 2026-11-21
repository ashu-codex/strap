import React from 'react';
import BrandLogo from '@/components/ui/BrandLogo';

export default function Footer() {
  return (
    <footer className="w-full border-t border-[#E1E4E8] dark:border-[#30333A] bg-[#FFFFFF] dark:bg-[#101114] text-[#52525B] dark:text-[#9496A1] text-xs transition-colors">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
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
            <ul className="space-y-2">
              <li><a href="/dashboard" className="hover:text-[#6BA814] dark:hover:text-[#B7F34A] transition-colors">Athlete Dashboard</a></li>
              <li><a href="/workout-planner" className="hover:text-[#6BA814] dark:hover:text-[#B7F34A] transition-colors">AI Workout Splits</a></li>
              <li><a href="/exercise-library" className="hover:text-[#6BA814] dark:hover:text-[#B7F34A] transition-colors">Exercise Library</a></li>
              <li><a href="/workout-tracker" className="hover:text-[#6BA814] dark:hover:text-[#B7F34A] transition-colors">Workout Tracker</a></li>
              <li><a href="/nutrition" className="hover:text-[#6BA814] dark:hover:text-[#B7F34A] transition-colors">Nutrition Calculator</a></li>
              <li><a href="/recovery" className="hover:text-[#6BA814] dark:hover:text-[#B7F34A] transition-colors">Recovery & Sleep Engine</a></li>
            </ul>
          </div>

          {/* Pricing & AI */}
          <div>
            <h4 className="text-[#111318] dark:text-[#F5F5F5] font-bold text-xs uppercase tracking-wider mb-3">Intelligence</h4>
            <ul className="space-y-2">
              <li><a href="/ai-assistant" className="hover:text-[#6BA814] dark:hover:text-[#B7F34A] transition-colors">Gemini AI Coach</a></li>
              <li><a href="/pricing" className="hover:text-[#6BA814] dark:hover:text-[#B7F34A] transition-colors">STRAP Premium (₹100)</a></li>
              <li><a href="/checkout" className="hover:text-[#6BA814] dark:hover:text-[#B7F34A] transition-colors">UPI Direct Payment</a></li>
              <li><a href="/payment-history" className="hover:text-[#6BA814] dark:hover:text-[#B7F34A] transition-colors">Payment Verification</a></li>
              <li><a href="/analytics" className="hover:text-[#6BA814] dark:hover:text-[#B7F34A] transition-colors">Strength Progression</a></li>
            </ul>
          </div>

          {/* Legal & Support */}
          <div>
            <h4 className="text-[#111318] dark:text-[#F5F5F5] font-bold text-xs uppercase tracking-wider mb-3">Legal & Support</h4>
            <ul className="space-y-2">
              <li><a href="/privacy" className="hover:text-[#6BA814] dark:hover:text-[#B7F34A] transition-colors">Privacy Policy</a></li>
              <li><a href="/terms" className="hover:text-[#6BA814] dark:hover:text-[#B7F34A] transition-colors">Terms and Conditions</a></li>
              <li><a href="/contact" className="hover:text-[#6BA814] dark:hover:text-[#B7F34A] transition-colors">Contact Support</a></li>
              <li>
                <a
                  href="mailto:straptrainorg@gmail.com"
                  className="hover:text-[#6BA814] dark:hover:text-[#B7F34A] transition-colors"
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
