import React from 'react';

export default function Footer() {
  return (
    <footer className="w-full border-t border-card-border bg-background text-zinc-400 text-xs">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Info */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-DEFAULT text-black font-black text-sm">
                S
              </div>
              <span className="font-extrabold text-base tracking-wider text-white">STRAP</span>
            </div>
            <p className="text-zinc-400 text-xs leading-relaxed">
              Train Smart. Recover Better. Progress Faster.
            </p>
            <div className="pt-2 text-[11px] text-zinc-500 font-mono">
              <p><strong className="text-brand-DEFAULT">S</strong> — Start</p>
              <p><strong className="text-brand-DEFAULT">T</strong> — Train</p>
              <p><strong className="text-brand-DEFAULT">R</strong> — Recover</p>
              <p><strong className="text-brand-DEFAULT">A</strong> — Adapt</p>
              <p><strong className="text-brand-DEFAULT">P</strong> — Progress</p>
            </div>
          </div>

          {/* Product links */}
          <div>
            <h4 className="text-white font-semibold text-xs uppercase tracking-wider mb-3">Platform</h4>
            <ul className="space-y-2">
              <li><a href="/dashboard" className="hover:text-brand-DEFAULT transition-colors">Athlete Dashboard</a></li>
              <li><a href="/workout-planner" className="hover:text-brand-DEFAULT transition-colors">AI Workout Splits</a></li>
              <li><a href="/exercise-library" className="hover:text-brand-DEFAULT transition-colors">Exercise Library</a></li>
              <li><a href="/workout-tracker" className="hover:text-brand-DEFAULT transition-colors">Workout Tracker</a></li>
              <li><a href="/nutrition" className="hover:text-brand-DEFAULT transition-colors">Nutrition Calculator</a></li>
              <li><a href="/recovery" className="hover:text-brand-DEFAULT transition-colors">Recovery & Sleep Engine</a></li>
            </ul>
          </div>

          {/* Pricing & AI */}
          <div>
            <h4 className="text-white font-semibold text-xs uppercase tracking-wider mb-3">Intelligence</h4>
            <ul className="space-y-2">
              <li><a href="/ai-assistant" className="hover:text-brand-DEFAULT transition-colors">Gemini AI Coach</a></li>
              <li><a href="/pricing" className="hover:text-brand-DEFAULT transition-colors">STRAP Premium (₹100)</a></li>
              <li><a href="/checkout" className="hover:text-brand-DEFAULT transition-colors">UPI Direct Payment</a></li>
              <li><a href="/payment-history" className="hover:text-brand-DEFAULT transition-colors">Payment Verification</a></li>
              <li><a href="/analytics" className="hover:text-brand-DEFAULT transition-colors">Strength Progression</a></li>
            </ul>
          </div>

          {/* Legal & Support */}
          <div>
            <h4 className="text-white font-semibold text-xs uppercase tracking-wider mb-3">Legal & Support</h4>
            <ul className="space-y-2">
              <li><a href="/privacy" className="hover:text-brand-DEFAULT transition-colors">Privacy Policy</a></li>
              <li><a href="/terms" className="hover:text-brand-DEFAULT transition-colors">Terms and Conditions</a></li>
              <li><a href="/contact" className="hover:text-brand-DEFAULT transition-colors">Contact Support</a></li>
              <li><span className="text-zinc-500">UPI ID: ashutosh-k82@ptyes</span></li>
              <li><span className="text-zinc-500">Bangalore, India</span></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-zinc-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-zinc-500 text-[11px]">
          <p>© {new Date().getFullYear()} STRAP Fitness Technologies Inc. All rights reserved.</p>
          <p className="text-center sm:text-right">
            Disclaimer: Estimates and AI recommendations are for educational and athletic training purposes only, not medical prescriptions.
          </p>
        </div>
      </div>
    </footer>
  );
}
