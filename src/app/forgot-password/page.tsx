'use client';

import React, { useState } from 'react';
import { Mail, ArrowRight, CheckCircle2 } from 'lucide-react';
import BrandLogo from '@/components/ui/BrandLogo';
import { PrimaryButton } from '@/components/ui/Buttons';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not process reset request.');
      setNotice(data.message);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-[14px] border border-[#30333A] light:border-[#E1E4E8] bg-[#1B1D22] dark:bg-[#1B1D22] light:bg-[#FFFFFF] p-8 shadow-glow transition-colors">
        <div className="text-center mb-8 flex flex-col items-center">
          <BrandLogo size="lg" showTagline={false} className="mb-3" />
          <h1 className="text-2xl font-black text-[#111318] dark:text-white">Reset Password</h1>
          <p className="text-xs text-[#9496A1] light:text-[#52525B] mt-1">
            Enter your email to receive password recovery instructions
          </p>
        </div>

        {submitted ? (
          <div className="text-center py-6 space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[10px] bg-[#B7F34A]/20 text-[#B7F34A] light:text-[#6BA814] shadow-glow">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h3 className="text-base font-bold text-[#111318] dark:text-white">Check Your Inbox</h3>
            <p className="text-xs text-[#9496A1] light:text-[#52525B] leading-relaxed">
              {notice || `If an account exists with ${email.trim().toLowerCase()}, we have dispatched a secure password reset link.`}
            </p>
            <div className="pt-2">
              <PrimaryButton onClick={() => (window.location.href = '/login')}>
                Return to Sign In
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
                Account Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9496A1]" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="athlete@example.com"
                  className="w-full rounded-[10px] border border-[#30333A] light:border-[#E1E4E8] bg-[#141519] dark:bg-[#141519] light:bg-white py-2.5 pl-9 pr-3 text-xs text-[#111318] dark:text-white placeholder-[#9496A1] focus:border-[#B7F34A] focus:outline-none focus:ring-1 focus:ring-[#B7F34A]"
                />
              </div>
            </div>

            <PrimaryButton
              type="submit"
              fullWidth
              loading={loading}
              icon={<ArrowRight className="h-4 w-4" />}
            >
              Send Recovery Link
            </PrimaryButton>

            <p className="text-center text-xs text-[#9496A1] pt-3">
              Remember your password?{' '}
              <a href="/login" className="font-bold text-[#6BA814] dark:text-[#B7F34A] hover:underline">
                Sign In
              </a>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
