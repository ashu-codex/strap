'use client';

import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, Lock, Mail, RefreshCw, User } from 'lucide-react';
import { createClient as createBrowserClient } from '@/lib/supabase/client';
import BrandLogo from '@/components/ui/BrandLogo';
import { PrimaryButton } from '@/components/ui/Buttons';

export default function SignupPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationNotice, setVerificationNotice] = useState<string | null>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const normalizedEmail = email.trim().toLowerCase();
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      setError('Password must be at least 8 characters and include both letters and numbers.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName.trim(),
          email: normalizedEmail,
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not create your account. Please try again.');
      }

      if (data.requiresEmailVerification) {
        setVerificationNotice(
          data.message || `We sent a verification link to ${normalizedEmail}. Open it to activate your account, then sign in.`
        );
        return;
      }

      window.location.href = data.redirectTo || '/onboarding';
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not resend verification email.');
      setVerificationNotice(data.message || 'Verification email sent again.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setResending(false);
    }
  };

  const handleGoogleSignup = async () => {
    setError(null);
    const supabase = createBrowserClient();
    if (!supabase) {
      setError('Google sign-in is not available until Supabase is configured.');
      return;
    }
    const { error: oauthErr } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/onboarding` },
    });
    if (oauthErr) setError('Could not start Google sign-in. Please try again.');
  };

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-[14px] border border-[#30333A] light:border-[#E1E4E8] bg-[#1B1D22] dark:bg-[#1B1D22] light:bg-[#FFFFFF] p-8 shadow-glow transition-colors">
        <div className="text-center mb-8 flex flex-col items-center">
          <BrandLogo size="lg" showTagline={false} showAiBadge={true} className="mb-3" />
          <h1 className="text-2xl font-black text-[#111318] dark:text-white">Create Your Account</h1>
          <p className="text-xs text-[#9496A1] light:text-[#52525B] mt-1">
            Start with the STRAP intelligent fitness onboarding
          </p>
        </div>

        {verificationNotice ? (
          <div className="text-center py-4 space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[10px] bg-[#B7F34A]/20 text-[#B7F34A] light:text-[#6BA814] shadow-glow">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h2 className="text-base font-bold text-[#111318] dark:text-white">Verify Your Email</h2>
            <p className="text-xs text-[#9496A1] light:text-[#52525B] leading-relaxed">{verificationNotice}</p>
            {error && (
              <div className="rounded-[10px] border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-400">
                {error}
              </div>
            )}
            <div className="pt-2 space-y-3">
              <PrimaryButton fullWidth onClick={() => (window.location.href = '/login')}>
                Go to Sign In
              </PrimaryButton>
              <button
                type="button"
                disabled={resending}
                onClick={handleResend}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6BA814] dark:text-[#B7F34A] hover:underline disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${resending ? 'animate-spin' : ''}`} />
                <span>{resending ? 'Sending...' : 'Resend verification email'}</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-4 rounded-[10px] border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-400">
                {error}
              </div>
            )}

            <button
              onClick={handleGoogleSignup}
              type="button"
              className="w-full flex items-center justify-center gap-2.5 rounded-[10px] border border-[#30333A] light:border-[#E1E4E8] bg-[#141519] dark:bg-[#141519] light:bg-[#F5F6F8] py-2.5 px-4 text-xs font-bold text-[#111318] dark:text-white hover:border-[#B7F34A]/60 transition-colors mb-4"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Continue with Google</span>
            </button>

            <div className="flex items-center gap-3 my-5">
              <div className="h-px flex-1 bg-[#30333A] light:bg-[#E1E4E8]" />
              <span className="text-[10px] uppercase font-bold text-[#9496A1]">Or register with email</span>
              <div className="h-px flex-1 bg-[#30333A] light:bg-[#E1E4E8]" />
            </div>

            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-[#111318] dark:text-zinc-300 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9496A1]" />
                  <input
                    type="text"
                    required
                    autoComplete="name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your name"
                    className="w-full rounded-[10px] border border-[#30333A] light:border-[#E1E4E8] bg-[#141519] dark:bg-[#141519] light:bg-white py-2.5 pl-9 pr-3 text-xs text-[#111318] dark:text-white placeholder-[#9496A1] focus:border-[#B7F34A] focus:outline-none focus:ring-1 focus:ring-[#B7F34A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#111318] dark:text-zinc-300 mb-1">
                  Email Address
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

              <div>
                <label className="block text-[11px] font-bold text-[#111318] dark:text-zinc-300 mb-1">
                  Password
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

              <PrimaryButton type="submit" fullWidth loading={loading} icon={<ArrowRight className="h-4 w-4" />}>
                Create STRAP Account
              </PrimaryButton>
            </form>

            <p className="text-center text-xs text-[#9496A1] mt-6">
              Already have an account?{' '}
              <a href="/login" className="font-bold text-[#6BA814] dark:text-[#B7F34A] hover:underline">
                Sign In
              </a>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
