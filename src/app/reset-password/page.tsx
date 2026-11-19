'use client';

import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, Lock } from 'lucide-react';
import BrandLogo from '@/components/ui/BrandLogo';
import { PrimaryButton } from '@/components/ui/Buttons';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      setError('Password must be at least 8 characters and include both letters and numbers.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not update password.');
      setDone(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-[14px] border border-[#30333A] light:border-[#E1E4E8] bg-[#1B1D22] dark:bg-[#1B1D22] light:bg-[#FFFFFF] p-8 shadow-glow transition-colors">
        <div className="text-center mb-8 flex flex-col items-center">
          <BrandLogo size="lg" showTagline={false} showAiBadge={true} className="mb-3" />
          <h1 className="text-2xl font-black text-[#111318] dark:text-white">Set New Password</h1>
          <p className="text-xs text-[#9496A1] light:text-[#52525B] mt-1">
            Choose a strong new password for your STRAP account
          </p>
        </div>

        {done ? (
          <div className="text-center py-6 space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[10px] bg-[#B7F34A]/20 text-[#B7F34A] light:text-[#6BA814] shadow-glow">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h3 className="text-base font-bold text-[#111318] dark:text-white">Password Updated</h3>
            <p className="text-xs text-[#9496A1] light:text-[#52525B] leading-relaxed">
              Your password has been securely updated. You can now access your dashboard.
            </p>
            <div className="pt-2">
              <PrimaryButton fullWidth onClick={() => (window.location.href = '/dashboard')}>
                Continue to Dashboard
              </PrimaryButton>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-[10px] border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-400">
                {error}
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-[#111318] dark:text-zinc-300 mb-1">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9496A1]" />
                <input
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 8 chars, letters & numbers"
                  className="w-full rounded-[10px] border border-[#30333A] light:border-[#E1E4E8] bg-[#141519] dark:bg-[#141519] light:bg-white py-2.5 pl-9 pr-3 text-xs text-[#111318] dark:text-white placeholder-[#9496A1] focus:border-[#B7F34A] focus:outline-none focus:ring-1 focus:ring-[#B7F34A]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#111318] dark:text-zinc-300 mb-1">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9496A1]" />
                <input
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full rounded-[10px] border border-[#30333A] light:border-[#E1E4E8] bg-[#141519] dark:bg-[#141519] light:bg-white py-2.5 pl-9 pr-3 text-xs text-[#111318] dark:text-white placeholder-[#9496A1] focus:border-[#B7F34A] focus:outline-none focus:ring-1 focus:ring-[#B7F34A]"
                />
              </div>
            </div>

            <PrimaryButton type="submit" fullWidth loading={loading} icon={<ArrowRight className="h-4 w-4" />}>
              Update Password
            </PrimaryButton>
          </form>
        )}
      </div>
    </div>
  );
}
