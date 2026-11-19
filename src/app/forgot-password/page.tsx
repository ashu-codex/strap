'use client';

import React, { useState } from 'react';
import { Mail, ArrowRight, CheckCircle2 } from 'lucide-react';
import { createClient as createBrowserClient } from '@/lib/supabase/client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createBrowserClient();
      if (supabase) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/profile`,
        });
        if (error) throw error;
      }

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-card-border bg-card p-8 shadow-glow">
        <div className="text-center mb-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-DEFAULT text-black font-black text-2xl shadow-glow mb-3">
            S
          </div>
          <h1 className="text-2xl font-black text-white">Reset Password</h1>
          <p className="text-xs text-zinc-400 mt-1">
            Enter your email to receive password recovery instructions
          </p>
        </div>

        {submitted ? (
          <div className="text-center py-6">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-DEFAULT/20 text-brand-DEFAULT mb-4 shadow-glow">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Check Your Inbox</h3>
            <p className="text-xs text-zinc-400 leading-relaxed mb-6">
              If an account exists with <strong>{email}</strong>, we have dispatched a secure password reset link.
            </p>
            <a
              href="/login"
              className="inline-flex items-center justify-center rounded-xl bg-zinc-900 border border-zinc-700 px-6 py-2.5 text-xs font-semibold text-white hover:bg-zinc-800 transition-colors"
            >
              Return to Sign In
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
                {error}
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                Account Email Address
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

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand-DEFAULT py-2.5 text-xs font-bold text-black hover:bg-brand-400 transition-all shadow-glow disabled:opacity-50 strap-primary"
            >
              <span>{loading ? 'Dispatching...' : 'Send Recovery Link'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>

            <p className="text-center text-xs text-zinc-400 pt-3">
              Remember your password?{' '}
              <a href="/login" className="font-semibold text-brand-DEFAULT hover:underline">
                Sign In
              </a>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
