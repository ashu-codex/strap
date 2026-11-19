'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Lock, Mail, ShieldAlert, Sparkles, CheckCircle2 } from 'lucide-react';
import { createClient as createBrowserClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to sign in');
      }

      router.push(data.redirectTo || '/dashboard');
      window.location.href = data.redirectTo || '/dashboard';
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (type: 'user' | 'admin') => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ demoType: type }),
      });
      const data = await res.json();
      if (res.ok) {
        window.location.href = data.redirectTo || (type === 'admin' ? '/admin' : '/dashboard');
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    const supabase = createBrowserClient();
    if (supabase) {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (error) setError(error.message);
    } else {
      setError(
        'Google OAuth requires Supabase credentials in your .env.local file. To test instantly, use the Email or 1-Click Demo buttons below!'
      );
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-card-border bg-card p-8 shadow-glow">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-DEFAULT text-black font-black text-2xl shadow-glow mb-3">
            S
          </div>
          <h1 className="text-2xl font-black text-white">Welcome Back</h1>
          <p className="text-xs text-zinc-400 mt-1">
            Access your STRAP AI workout splits & recovery data
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400 leading-relaxed">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-4 rounded-xl border border-brand-DEFAULT/30 bg-brand-DEFAULT/10 p-3 text-xs text-brand-DEFAULT leading-relaxed">
            {message}
          </div>
        )}

        {/* Google Login Button */}
        <button
          onClick={handleGoogleLogin}
          type="button"
          className="w-full flex items-center justify-center gap-2.5 rounded-xl border border-zinc-700 bg-zinc-900 py-2.5 px-4 text-xs font-semibold text-white hover:bg-zinc-800 transition-colors mb-4"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>

        <div className="flex items-center gap-3 my-5">
          <div className="h-px flex-1 bg-zinc-800" />
          <span className="text-[10px] uppercase font-semibold text-zinc-500">Or email</span>
          <div className="h-px flex-1 bg-zinc-800" />
        </div>

        {/* Email/Password Form */}
        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div>
            <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="athlete@example.com"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 py-2.5 pl-9 pr-3 text-xs text-white placeholder-zinc-500 focus:border-brand-DEFAULT focus:outline-none focus:ring-1 focus:ring-brand-DEFAULT"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-semibold text-zinc-300">
                Password
              </label>
              <a
                href="/forgot-password"
                className="text-[11px] font-medium text-brand-DEFAULT hover:underline"
              >
                Forgot password?
              </a>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 py-2.5 pl-9 pr-3 text-xs text-white placeholder-zinc-500 focus:border-brand-DEFAULT focus:outline-none focus:ring-1 focus:ring-brand-DEFAULT"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand-DEFAULT py-2.5 text-xs font-bold text-black hover:bg-brand-400 transition-all shadow-glow disabled:opacity-50 strap-primary"
          >
            <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        {/* 1-Click Quick Demo testing buttons */}
        <div className="mt-6 pt-5 border-t border-zinc-900">
          <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider text-center mb-2.5">
            Instant 1-Click Testing Accounts
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleDemoLogin('user')}
              className="flex items-center justify-center gap-1.5 p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] font-semibold text-zinc-300 hover:text-white hover:border-brand-DEFAULT/40 transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5 text-brand-DEFAULT" />
              <span>Alex (Athlete)</span>
            </button>
            <button
              type="button"
              onClick={() => handleDemoLogin('admin')}
              className="flex items-center justify-center gap-1.5 p-2 rounded-lg bg-red-950/30 border border-red-900/40 text-[11px] font-semibold text-red-300 hover:text-white hover:border-red-500/50 transition-colors"
            >
              <ShieldAlert className="h-3.5 w-3.5 text-red-400" />
              <span>Ashutosh (Admin)</span>
            </button>
          </div>
        </div>

        {/* Signup Link */}
        <p className="text-center text-xs text-zinc-400 mt-6">
          Don't have an account?{' '}
          <a href="/signup" className="font-semibold text-brand-DEFAULT hover:underline">
            Create Free Account
          </a>
        </p>
      </div>
    </div>
  );
}
