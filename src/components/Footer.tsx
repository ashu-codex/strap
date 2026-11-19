import React from 'react';
import BrandLogo from '@/components/ui/BrandLogo';

export default function Footer() {
  return (
    <footer className="w-full border-t border-[#30333A] light:border-[#E1E4E8] bg-[#101114] light:bg-[#FFFFFF] text-[#9496A1] light:text-[#52525B] text-xs transition-colors">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Info */}
          <div className="space-y-3 md:col-span-1">
            <BrandLogo size="md" showTagline={false} showAiBadge={true} />
            <p className="text-[#9496A1] light:text-[#52525B] text-xs leading-relaxed">
              Train Smart. Recover Better. Progress Faster.
            </p>
            <div className="pt-2 text-[11px] text-[#626570] light:text-[#71717A] font-mono space-y-0.5">
              <p><strong className="text-[#B7F34A] light:text-[#6BA814]">S</strong> — Start</p>
              <p><strong className="text-[#B7F34A] light:text-[#6BA814]">T</strong> — Train</p>
              <p><strong className="text-[#B7F34A] light:text-[#6BA814]">R</strong> — Recover</p>
              <p><strong className="text-[#B7F34A] light:text-[#6BA814]">A</strong> — Adapt</p>
              <p><strong className="text-[#B7F34A] light:text-[#6BA814]">P</strong> — Progress</p>
            </div>
          </div>

          {/* Product links */}
          <div>
            <h4 className="text-[#F5F5F5] light:text-[#111318] font-bold text-xs uppercase tracking-wider mb-3">Platform</h4>
            <ul className="space-y-2">
              <li><a href="/dashboard" className="hover:text-[#B7F34A] light:hover:text-[#6BA814] transition-colors">Athlete Dashboard</a></li>
              <li><a href="/workout-planner" className="hover:text-[#B7F34A] light:hover:text-[#6BA814] transition-colors">AI Workout Splits</a></li>
              <li><a href="/exercise-library" className="hover:text-[#B7F34A] light:hover:text-[#6BA814] transition-colors">Exercise Library</a></li>
              <li><a href="/workout-tracker" className="hover:text-[#B7F34A] light:hover:text-[#6BA814] transition-colors">Workout Tracker</a></li>
              <li><a href="/nutrition" className="hover:text-[#B7F34A] light:hover:text-[#6BA814] transition-colors">Nutrition Calculator</a></li>
              <li><a href="/recovery" className="hover:text-[#B7F34A] light:hover:text-[#6BA814] transition-colors">Recovery & Sleep Engine</a></li>
            </ul>
          </div>

          {/* Pricing & AI */}
          <div>
            <h4 className="text-[#F5F5F5] light:text-[#111318] font-bold text-xs uppercase tracking-wider mb-3">Intelligence</h4>
            <ul className="space-y-2">
              <li><a href="/ai-assistant" className="hover:text-[#B7F34A] light:hover:text-[#6BA814] transition-colors">Gemini AI Coach</a></li>
              <li><a href="/pricing" className="hover:text-[#B7F34A] light:hover:text-[#6BA814] transition-colors">STRAP Premium (₹100)</a></li>
              <li><a href="/checkout" className="hover:text-[#B7F34A] light:hover:text-[#6BA814] transition-colors">UPI Direct Payment</a></li>
              <li><a href="/payment-history" className="hover:text-[#B7F34A] light:hover:text-[#6BA814] transition-colors">Payment Verification</a></li>
              <li><a href="/analytics" className="hover:text-[#B7F34A] light:hover:text-[#6BA814] transition-colors">Strength Progression</a></li>
            </ul>
          </div>

          {/* Legal & Support */}
          <div>
            <h4 className="text-[#F5F5F5] light:text-[#111318] font-bold text-xs uppercase tracking-wider mb-3">Legal & Support</h4>
            <ul className="space-y-2">
              <li><a href="/privacy" className="hover:text-[#B7F34A] light:hover:text-[#6BA814] transition-colors">Privacy Policy</a></li>
              <li><a href="/terms" className="hover:text-[#B7F34A] light:hover:text-[#6BA814] transition-colors">Terms and Conditions</a></li>
              <li><a href="/contact" className="hover:text-[#B7F34A] light:hover:text-[#6BA814] transition-colors">Contact Support</a></li>
              <li><span className="text-[#626570] light:text-[#71717A]">UPI Destination: ashutosh-k82@ptyes</span></li>
              <li><span className="text-[#626570] light:text-[#71717A]">Bangalore, India</span></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-[#30333A] light:border-[#E1E4E8] flex flex-col sm:flex-row items-center justify-between gap-4 text-[#626570] light:text-[#71717A] text-[11px]">
          <p>© {new Date().getFullYear()} STRAP Fitness Technologies Inc. All rights reserved.</p>
          <p className="text-center sm:text-right">
            Disclaimer: Estimates and AI recommendations are for educational and athletic training purposes only, not medical prescriptions.
          </p>
        </div>
      </div>
    </footer>
  );
}
