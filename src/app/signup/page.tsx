'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Lock, Mail, User, Sparkles } from 'lucide-react';
import { createClient as createBrowserClient } from '@/lib/supabase/client';

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          email,
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create account');
      }

      // Route directly to onboarding
      router.push(data.redirectTo || '/onboarding');
      window.location.href = data.redirectTo || '/onboarding';
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    const supabase = createBrowserClient();
    if (supabase) {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/onboarding`,
        },
      });
      if (error) setError(error.message);
    } else {
      setError(
        'Google OAuth requires configured Supabase credentials. Use the standard email signup below to get started immediately!'
      );
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-card-border bg-card p-8 shadow-glow">
        <div className="text-center mb-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-DEFAULT text-black font-black text-2xl shadow-glow mb-3">
            S
          </div>
          <h1 className="text-2xl font-black text-white">Create Your Account</h1>
          <p className="text-xs text-zinc-400 mt-1">
            Start with the STRAP intelligent fitness onboarding
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
            {error}
          </div>
        )}

        {/* Google Signup Button */}
        <button
          onClick={handleGoogleSignup}
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
          <span className="text-[10px] uppercase font-semibold text-zinc-500">Or register with email</span>
          <div className="h-px flex-1 bg-zinc-800" />
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Rohan Sharma"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 py-2.5 pl-9 pr-3 text-xs text-white placeholder-zinc-500 focus:border-brand-DEFAULT focus:outline-none focus:ring-1 focus:ring-brand-DEFAULT"
              />
            </div>
          </div>

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
                placeholder="rohan@example.com"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 py-2.5 pl-9 pr-3 text-xs text-white placeholder-zinc-500 focus:border-brand-DEFAULT focus:outline-none focus:ring-1 focus:ring-brand-DEFAULT"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
              Password (min. 6 characters)
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <input
                type="password"
                required
                minLength={6}
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
            <span>{loading ? 'Creating Profile...' : 'Begin Onboarding'}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <p className="text-center text-xs text-zinc-400 mt-6">
          Already registered?{' '}
          <a href="/login" className="font-semibold text-brand-DEFAULT hover:underline">
            Sign In here
          </a>
        </p>
      </div>
    </div>
  );
}
