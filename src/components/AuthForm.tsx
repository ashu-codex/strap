'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowRight, CheckCircle2, Info, Loader2, Lock, Mail, RefreshCw, User } from 'lucide-react';
import { createClient as createBrowserClient } from '@/lib/supabase/client';
import BrandLogo from '@/components/ui/BrandLogo';
import { PrimaryButton } from '@/components/ui/Buttons';

const CALLBACK_ERRORS: Record<string, string> = {
  oauth_cancelled: 'Google sign-in was cancelled. You can try again anytime.',
  oauth_failed: 'Google sign-in could not be completed. Please try again.',
  link_expired: 'That verification or recovery link has expired. Please request a new one.',
  auth_unavailable: 'Authentication service is not configured yet. Please contact the administrator.',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface AuthFormProps {
  initialMode: 'login' | 'signup';
}

export default function AuthForm({ initialMode }: AuthFormProps) {
  const searchParams = useSearchParams();
  const nextParam = searchParams.get('next') || '';
  const urlError = searchParams.get('error');
  const prefillEmail = searchParams.get('email') || '';

  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState(prefillEmail);
  const [password, setPassword] = useState('');

  const [checkingEmail, setCheckingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{
    checkedEmail: string;
    exists: boolean;
    oauthOnly: boolean;
  } | null>(null);

  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | null>(null);
  const [resending, setResending] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [suggestSwitch, setSuggestSwitch] = useState<'login' | 'signup' | null>(null);
  const [verificationNotice, setVerificationNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const lastCheckedRef = useRef<string>('');

  useEffect(() => {
    if (urlError) {
      setError(CALLBACK_ERRORS[urlError] || 'Authentication could not be completed. Please try again.');
    }
  }, [urlError]);

  const checkEmailRegistration = async (rawEmail: string) => {
    const normalized = rawEmail.trim().toLowerCase();
    if (!EMAIL_RE.test(normalized) || lastCheckedRef.current === normalized) return;
    lastCheckedRef.current = normalized;
    setCheckingEmail(true);
    setSuggestSwitch(null);

    try {
      const res = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalized }),
      });
      if (!res.ok) return;
      const data = await res.json();
      const providers: string[] = Array.isArray(data.providers) ? data.providers : [];
      const hasEmail = providers.includes('email');
      const hasGoogle = providers.includes('google');
      const oauthOnly = Boolean(data.exists && !hasEmail && hasGoogle);

      setEmailStatus({ checkedEmail: normalized, exists: Boolean(data.exists), oauthOnly });
      setError(null);

      if (data.exists) {
        setMode('login');
        if (oauthOnly) {
          setInfoMessage(
            'This email is registered with Google. Click "Continue with Google" above to sign in.'
          );
        } else {
          setInfoMessage(
            'This email is already registered. Sign in below to access your existing STRAP account.'
          );
        }
      } else {
        setMode('signup');
        setInfoMessage('New email detected. Create your STRAP account below.');
      }
    } catch {
      // Non-blocking: submit handlers still enforce all rules server-side
    } finally {
      setCheckingEmail(false);
    }
  };

  const switchMode = (nextMode: 'login' | 'signup') => {
    setMode(nextMode);
    setError(null);
    setSuggestSwitch(null);
    setNeedsVerification(false);
    setInfoMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfoMessage(null);
    setNeedsVerification(false);
    setSuggestSwitch(null);

    const normalizedEmail = email.trim().toLowerCase();

    if (mode === 'signup') {
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
          if (data.code === 'ACCOUNT_EXISTS' || data.code === 'DUPLICATE') {
            setSuggestSwitch('login');
          }
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
      return;
    }

    // Login mode
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: normalizedEmail,
          password,
          next: nextParam || undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.code === 'EMAIL_NOT_VERIFIED') {
          setNeedsVerification(true);
        } else if (data.code === 'ACCOUNT_NOT_FOUND') {
          setSuggestSwitch('signup');
        }
        throw new Error(data.error || 'Unable to sign in. Please try again.');
      }

      window.location.href = data.redirectTo || '/dashboard';
    } catch (err: any) {
      setError(err.message || 'Unable to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError('Enter your email address first.');
      return;
    }
    setResending(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not resend verification email.');
      if (verificationNotice) {
        setVerificationNotice(data.message || 'Verification email sent again.');
      } else {
        setInfoMessage(data.message || 'Verification email sent. Please check your inbox.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setResending(false);
    }
  };

  const buildOAuthCallbackUrl = () => {
    const callbackUrl = new URL('/auth/callback', window.location.origin);
    if (nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//')) {
      callbackUrl.searchParams.set('next', nextParam);
    }
    return callbackUrl.toString();
  };

  const handleGoogleAuth = async () => {
    setError(null);
    setInfoMessage(null);
    const supabase = createBrowserClient();
    if (!supabase) {
      setError('Google sign-in is not available until Supabase is configured.');
      return;
    }
    setOauthLoading('google');
    const { error: oauthErr } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: buildOAuthCallbackUrl() },
    });
    if (oauthErr) {
      setOauthLoading(null);
      setError('Could not start Google sign-in. Please try again.');
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-[14px] border border-[#E1E4E8] dark:border-[#30333A] bg-[#FFFFFF] dark:bg-[#1B1D22] p-8 shadow-glow transition-colors">
        {/* Brand Header */}
        <div className="text-center mb-6 flex flex-col items-center">
          <BrandLogo size="lg" showTagline={false} className="mb-3" />
          <h1 className="text-2xl font-black text-[#111318] dark:text-white">
            {mode === 'login' ? 'Welcome Back' : 'Create Your Account'}
          </h1>
          <p className="text-xs text-[#52525B] dark:text-[#9496A1] mt-1">
            {mode === 'login'
              ? 'Sign in to access your STRAP profile, workouts & recovery data'
              : 'Start your personalized STRAP fitness journey'}
          </p>
        </div>

        {/* Mode Switcher Tabs */}
        {!verificationNotice && (
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-[10px] bg-[#F0F2F5] dark:bg-[#141519] border border-[#E1E4E8] dark:border-[#30333A] mb-5">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`py-2 rounded-[8px] text-xs font-bold transition-all ${
                mode === 'login'
                  ? 'bg-[#B7F34A] text-[#111318] shadow-glow'
                  : 'text-[#52525B] dark:text-[#D1D5DB] hover:text-[#111318] dark:hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => switchMode('signup')}
              className={`py-2 rounded-[8px] text-xs font-bold transition-all ${
                mode === 'signup'
                  ? 'bg-[#B7F34A] text-[#111318] shadow-glow'
                  : 'text-[#52525B] dark:text-[#D1D5DB] hover:text-[#111318] dark:hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        {verificationNotice ? (
          <div className="text-center py-4 space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[10px] bg-[#B7F34A]/20 text-[#6BA814] dark:text-[#B7F34A] shadow-glow">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h2 className="text-base font-bold text-[#111318] dark:text-white">Verify Your Email</h2>
            <p className="text-xs text-[#52525B] dark:text-[#9496A1] leading-relaxed">{verificationNotice}</p>
            {error && (
              <div className="rounded-[10px] border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-400">
                {error}
              </div>
            )}
            <div className="pt-2 space-y-3">
              <PrimaryButton
                fullWidth
                onClick={() => {
                  setVerificationNotice(null);
                  switchMode('login');
                }}
              >
                Go to Sign In
              </PrimaryButton>
              <button
                type="button"
                disabled={resending}
                onClick={handleResendVerification}
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
              <div className="mb-4 rounded-[10px] border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-400 leading-relaxed space-y-2">
                <p>{error}</p>
                {needsVerification && (
                  <button
                    type="button"
                    disabled={resending}
                    onClick={handleResendVerification}
                    className="inline-flex items-center gap-1.5 font-bold text-[#6BA814] dark:text-[#B7F34A] hover:underline disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${resending ? 'animate-spin' : ''}`} />
                    <span>{resending ? 'Sending...' : 'Resend verification email'}</span>
                  </button>
                )}
                {suggestSwitch === 'login' && (
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="inline-flex items-center gap-1.5 font-bold text-[#6BA814] dark:text-[#B7F34A] hover:underline"
                  >
                    <span>Switch to Sign In with this email</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                )}
                {suggestSwitch === 'signup' && (
                  <button
                    type="button"
                    onClick={() => switchMode('signup')}
                    className="inline-flex items-center gap-1.5 font-bold text-[#6BA814] dark:text-[#B7F34A] hover:underline"
                  >
                    <span>Create a new account with this email</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}

            {infoMessage && (
              <div className="mb-4 rounded-[10px] border border-[#B7F34A]/40 bg-[#B7F34A]/10 p-3 text-xs text-[#4d7c0f] dark:text-[#B7F34A] leading-relaxed flex items-start gap-2">
                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{infoMessage}</span>
              </div>
            )}

            {/* Social Authentication Options */}
            <div className="space-y-2.5 mb-4">
              {/* Continue with Google */}
              <button
                onClick={handleGoogleAuth}
                type="button"
                disabled={oauthLoading !== null || loading}
                className="w-full flex items-center justify-center gap-2.5 rounded-[10px] border border-[#E1E4E8] dark:border-[#30333A] bg-[#F5F6F8] dark:bg-[#232630] py-2.5 px-4 text-xs font-bold text-[#111318] dark:text-white hover:border-[#B7F34A]/60 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {oauthLoading === 'google' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                )}
                <span>{oauthLoading === 'google' ? 'Connecting to Google...' : 'Continue with Google'}</span>
              </button>
            </div>

            {/* 3. OR continue with Email */}
            <div className="flex items-center gap-3 my-5">
              <div className="h-px flex-1 bg-[#E1E4E8] dark:bg-[#30333A]" />
              <span className="text-[10px] uppercase font-bold text-[#71717A] dark:text-[#9496A1] whitespace-nowrap">
                Or continue with email
              </span>
              <div className="h-px flex-1 bg-[#E1E4E8] dark:bg-[#30333A]" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email first so smart detection works naturally */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-[#111318] dark:text-zinc-300">
                    Email Address
                  </label>
                  {checkingEmail && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-[#71717A] dark:text-[#9496A1]">
                      <Loader2 className="h-3 w-3 animate-spin" /> Checking...
                    </span>
                  )}
                  {!checkingEmail && emailStatus && emailStatus.checkedEmail === email.trim().toLowerCase() && (
                    <span className="text-[10px] font-semibold text-[#6BA814] dark:text-[#B7F34A]">
                      {emailStatus.exists ? 'Account found' : 'New email'}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#71717A] dark:text-[#9496A1]" />
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (lastCheckedRef.current && e.target.value.trim().toLowerCase() !== lastCheckedRef.current) {
                        lastCheckedRef.current = '';
                      }
                    }}
                    onBlur={(e) => checkEmailRegistration(e.target.value)}
                    placeholder="athlete@example.com"
                    className="w-full rounded-[10px] border border-[#E1E4E8] dark:border-[#30333A] bg-white dark:bg-[#141519] py-2.5 pl-9 pr-3 text-xs text-[#111318] dark:text-white placeholder-[#71717A] dark:placeholder-[#9496A1] focus:border-[#B7F34A] focus:outline-none focus:ring-1 focus:ring-[#B7F34A]"
                  />
                </div>
              </div>

              {mode === 'signup' && (
                <div>
                  <label className="block text-[11px] font-bold text-[#111318] dark:text-zinc-300 mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#71717A] dark:text-[#9496A1]" />
                    <input
                      type="text"
                      required
                      autoComplete="name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Your name"
                      className="w-full rounded-[10px] border border-[#E1E4E8] dark:border-[#30333A] bg-white dark:bg-[#141519] py-2.5 pl-9 pr-3 text-xs text-[#111318] dark:text-white placeholder-[#71717A] dark:placeholder-[#9496A1] focus:border-[#B7F34A] focus:outline-none focus:ring-1 focus:ring-[#B7F34A]"
                    />
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-[#111318] dark:text-zinc-300">
                    Password
                  </label>
                  {mode === 'login' && (
                    <a
                      href="/forgot-password"
                      className="text-[11px] font-semibold text-[#6BA814] dark:text-[#B7F34A] hover:underline"
                    >
                      Forgot password?
                    </a>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#71717A] dark:text-[#9496A1]" />
                  <input
                    type="password"
                    required
                    minLength={mode === 'signup' ? 8 : 1}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === 'signup' ? 'Min 8 chars, letters & numbers' : '••••••••'}
                    className="w-full rounded-[10px] border border-[#E1E4E8] dark:border-[#30333A] bg-white dark:bg-[#141519] py-2.5 pl-9 pr-3 text-xs text-[#111318] dark:text-white placeholder-[#71717A] dark:placeholder-[#9496A1] focus:border-[#B7F34A] focus:outline-none focus:ring-1 focus:ring-[#B7F34A]"
                  />
                </div>
              </div>

              <PrimaryButton type="submit" fullWidth loading={loading} disabled={oauthLoading !== null} icon={<ArrowRight className="h-4 w-4" />}>
                {mode === 'login' ? 'Sign In to STRAP' : 'Create STRAP Account'}
              </PrimaryButton>
            </form>

            <p className="text-center text-xs text-[#71717A] dark:text-[#9496A1] mt-6">
              {mode === 'login' ? (
                <>
                  New to STRAP?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('signup')}
                    className="font-bold text-[#6BA814] dark:text-[#B7F34A] hover:underline"
                  >
                    Create an account
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="font-bold text-[#6BA814] dark:text-[#B7F34A] hover:underline"
                  >
                    Sign In
                  </button>
                </>
              )}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
