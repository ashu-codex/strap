'use client';

import React, { useState, useEffect } from 'react';
import { User, Scale, Sparkles, Check, AlertCircle, Save, ShieldAlert } from 'lucide-react';
import HeightInput from '@/components/ui/HeightInput';
import { HeightUnit } from '@/lib/height';

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [heightValid, setHeightValid] = useState(true);

  const [profile, setProfile] = useState<any>({
    full_name: '',
    email: '',
    role: 'user',
  });

  const [metrics, setMetrics] = useState<any>({
    age: 26,
    gender: 'male',
    height_cm: 175,
    height_unit: 'cm' as HeightUnit,
    current_weight_kg: 72,
    body_fat_pct: 16,
    chest_cm: 98,
    waist_cm: 80,
    hips_cm: 94,
    arms_cm: 35,
    workout_location: 'gym',
    experience_level: 'intermediate',
  });

  const [subscription, setSubscription] = useState<any>(null);
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [profRes, metRes, subRes] = await Promise.all([
          fetch('/api/user/profile').then((r) => r.json()),
          fetch('/api/user/metrics').then((r) => r.json()),
          fetch('/api/user/subscription').then((r) => r.json()),
        ]);

        if (profRes.profile) setProfile(profRes.profile);
        if (metRes.metrics) {
          setMetrics((prev: any) => ({
            ...prev,
            ...metRes.metrics,
            height_unit:
              metRes.metrics.height_unit ||
              metRes.height_unit ||
              profRes.profile?.height_unit ||
              'cm',
          }));
        } else if (profRes.profile) {
          setMetrics((prev: any) => ({
            ...prev,
            height_cm: profRes.profile.height ?? prev.height_cm,
            current_weight_kg: profRes.profile.weight ?? prev.current_weight_kg,
            age: profRes.profile.age ?? prev.age,
            gender: profRes.profile.gender ?? prev.gender,
            height_unit:
              metRes.height_unit || profRes.profile.height_unit || 'cm',
          }));
        }
        setSubscription(subRes.subscription);
        setIsPremium(subRes.isPremium);
        setLoading(false);
      } catch (err) {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!heightValid) {
      setMessage(null);
      setErrorMsg('Please enter a valid height before saving.');
      return;
    }

    setSaving(true);
    setMessage(null);
    setErrorMsg(null);

    try {
      const [pRes, mRes] = await Promise.all([
        fetch('/api/user/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            full_name: profile.full_name,
            height_unit: metrics.height_unit || 'cm',
          }),
        }),
        fetch('/api/user/metrics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...metrics,
            height_unit: metrics.height_unit || 'cm',
          }),
        }),
      ]);

      if (!pRes.ok || !mRes.ok) {
        const errBody = await (!mRes.ok ? mRes : pRes).json().catch(() => null);
        throw new Error(errBody?.error || 'Failed to update profile.');
      }

      const savedMet = await mRes.json();
      if (savedMet?.metrics) {
        setMetrics((prev: any) => ({ ...prev, ...savedMet.metrics }));
      }
      setMessage('Profile and biometric parameters successfully updated.');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">Athlete Profile & Biometrics</h1>
        <p className="text-xs text-zinc-400 mt-1">
          Manage your personal information, physical measurements, and membership status.
        </p>
      </div>

      {message && (
        <div className="rounded-xl border border-brand/30 bg-brand/10 p-3.5 text-xs text-brand flex items-center gap-2">
          <Check className="h-4 w-4" />
          <span>{message}</span>
        </div>
      )}

      {errorMsg && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-400 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Subscription Card */}
      <div className="rounded-2xl border border-card-border bg-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Membership Tier</span>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-lg font-black text-white">
              {isPremium ? 'STRAP Premium Plan' : 'STRAP Free Plan'}
            </span>
            {isPremium ? (
              <span className="text-[10px] font-bold text-brand bg-brand/10 border border-brand/30 px-2 py-0.5 rounded-full shadow-glow">
                ACTIVE
              </span>
            ) : (
              <span className="text-[10px] font-bold text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-full">
                BASIC
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            {isPremium
              ? `Your premium subscription is valid until ${subscription?.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : 'Active'}.`
              : 'Upgrade to STRAP Premium for ₹100/mo to access unlimited AI splits and full exercise library.'}
          </p>
        </div>

        <div>
          {isPremium ? (
            <a
              href="/payment-history"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs font-semibold text-white hover:bg-zinc-800 transition-colors"
            >
              Payment History
            </a>
          ) : (
            <a
              href="/checkout"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand text-xs font-bold text-black hover:bg-brand-400 transition-colors shadow-glow strap-primary"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Upgrade (₹100)</span>
            </a>
          )}
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Personal Details */}
        <div className="rounded-2xl border border-card-border bg-card p-6 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <User className="h-4 w-4 text-brand" />
            General Account Information
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-300 mb-1">Full Name</label>
              <input
                type="text"
                value={profile.full_name || ''}
                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-white focus:border-brand focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-300 mb-1">Email Address</label>
              <input
                type="email"
                disabled
                value={profile.email || ''}
                className="w-full rounded-xl border border-zinc-900 bg-zinc-900/60 p-2.5 text-xs text-zinc-500 cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* Physical Biometrics */}
        <div className="rounded-2xl border border-card-border bg-card p-6 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Scale className="h-4 w-4 text-brand" />
            Biometric Measurements
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-300 mb-1">Current Weight (kg)</label>
              <input
                type="number"
                step="0.1"
                value={metrics.current_weight_kg || ''}
                onChange={(e) => setMetrics({ ...metrics, current_weight_kg: Number(e.target.value) })}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-white focus:border-brand focus:outline-none"
              />
            </div>

            <HeightInput
              heightCm={metrics.height_cm ?? 175}
              unit={(metrics.height_unit as HeightUnit) || 'cm'}
              onChange={(nextHeightCm, nextUnit, isValid) => {
                setHeightValid(isValid);
                if (isValid) setErrorMsg(null);
                setMetrics((prev: any) => ({
                  ...prev,
                  height_cm: nextHeightCm,
                  height_unit: nextUnit,
                }));
              }}
            />

            <div>
              <label className="block text-[11px] font-semibold text-zinc-300 mb-1">Age</label>
              <input
                type="number"
                value={metrics.age || ''}
                onChange={(e) => setMetrics({ ...metrics, age: Number(e.target.value) })}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-white focus:border-brand focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-300 mb-1">Body Fat %</label>
              <input
                type="number"
                step="0.1"
                value={metrics.body_fat_pct || ''}
                onChange={(e) => setMetrics({ ...metrics, body_fat_pct: Number(e.target.value) })}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-white focus:border-brand focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-2">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">
              Body Circumferences (cm)
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-[10px] text-zinc-400">Chest</label>
                <input
                  type="number"
                  value={metrics.chest_cm || ''}
                  onChange={(e) => setMetrics({ ...metrics, chest_cm: Number(e.target.value) })}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 p-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[10px] text-zinc-400">Waist</label>
                <input
                  type="number"
                  value={metrics.waist_cm || ''}
                  onChange={(e) => setMetrics({ ...metrics, waist_cm: Number(e.target.value) })}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 p-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[10px] text-zinc-400">Hips</label>
                <input
                  type="number"
                  value={metrics.hips_cm || ''}
                  onChange={(e) => setMetrics({ ...metrics, hips_cm: Number(e.target.value) })}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 p-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[10px] text-zinc-400">Arms</label>
                <input
                  type="number"
                  value={metrics.arms_cm || ''}
                  onChange={(e) => setMetrics({ ...metrics, arms_cm: Number(e.target.value) })}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 p-2 text-xs text-white"
                />
              </div>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-brand text-xs font-bold text-black hover:bg-brand-400 transition-all shadow-glow disabled:opacity-50 strap-primary"
        >
          <Save className="h-4 w-4" />
          <span>{saving ? 'Updating...' : 'Save Profile Changes'}</span>
        </button>
      </form>
    </div>
  );
}
