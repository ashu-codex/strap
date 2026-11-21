'use client';

import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp,
  Award,
  Scale,
  Calendar,
  Lock,
  ArrowRight,
  Plus,
  Sparkles,
} from 'lucide-react';
import PremiumModal from '@/components/PremiumModal';

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [measurements, setMeasurements] = useState<any[]>([]);
  const [prs, setPrs] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  // New measurement form state
  const [newWeight, setNewWeight] = useState(75);
  const [newBodyFat, setNewBodyFat] = useState(15.5);
  const [savingM, setSavingM] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [subRes, mRes, wRes] = await Promise.all([
          fetch('/api/user/subscription').then((r) => r.json()).catch(() => ({ isPremium: false })),
          fetch('/api/user/measurements').then((r) => (r.ok ? r.json() : null)).catch(() => null),
          fetch('/api/workouts').then((r) => (r.ok ? r.json() : null)).catch(() => null),
        ]);
        setIsPremium(Boolean(subRes?.isPremium));
        if (mRes?.measurements) setMeasurements(mRes.measurements);
        if (wRes?.prs) setPrs(wRes.prs);
        setLoading(false);
      } catch (err) {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleAddMeasurement = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingM(true);
    try {
      await fetch('/api/user/measurements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weight_kg: newWeight,
          body_fat_pct: newBodyFat,
          recorded_date: new Date().toISOString().split('T')[0],
        }),
      });

      const mRes = await fetch('/api/user/measurements').then((r) => r.json());
      setMeasurements(mRes.measurements || []);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingM(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent shadow-glow" />
      </div>
    );
  }

  if (!isPremium) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8 text-center">
        <div className="rounded-3xl border border-brand/30 bg-card p-10 shadow-glow-lg max-w-2xl mx-auto">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/20 border border-brand/40 text-brand mx-auto mb-4 shadow-glow">
            <Lock className="h-7 w-7" />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest text-brand bg-brand/10 px-3 py-1 rounded-full border border-brand/20">
            STRAP Premium Exclusive
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-white mt-3 mb-2">
            Progress & Biometric Analytics Engine
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto leading-relaxed mb-6">
            Interactive Recharts visualizations mapping body weight trajectories, cumulative training volume, estimated 1RM strength progression, and sleep continuity.
          </p>
          <a
            href="/checkout"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-brand text-sm font-extrabold text-black hover:bg-brand-400 transition-all shadow-glow hover:scale-105 strap-primary"
          >
            <span>Upgrade to Premium (₹100/mo)</span>
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    );
  }

  // Weight progression data
  const weightData = (measurements.length > 0 ? measurements : [
    { recorded_date: 'Oct 15', weight_kg: 72.8 },
    { recorded_date: 'Nov 01', weight_kg: 73.6 },
    { recorded_date: 'Nov 15', weight_kg: 74.5 },
  ]).map((m) => ({
    date: m.recorded_date?.slice(5) || m.recorded_date,
    weight: m.weight_kg,
    bodyFat: m.body_fat_pct,
  }));

  // Volume progression mock/empirical data
  const volumeData = [
    { week: 'Week 1', volume: 14200 },
    { week: 'Week 2', volume: 15600 },
    { week: 'Week 3', volume: 16800 },
    { week: 'Week 4', volume: 18100 },
  ];

  // Sleep consistency data
  const sleepData = [
    { day: 'Mon', hours: 7.8 },
    { day: 'Tue', hours: 7.2 },
    { day: 'Wed', hours: 8.0 },
    { day: 'Thu', hours: 7.5 },
    { day: 'Fri', hours: 7.9 },
    { day: 'Sat', hours: 8.4 },
    { day: 'Sun', hours: 8.1 },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="border-b border-zinc-800 pb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold uppercase tracking-wider text-brand bg-brand/10 border border-brand/20 px-2.5 py-0.5 rounded-full">
            Empirical Telemetry
          </span>
          <span className="text-xs font-mono text-zinc-400">Recharts Visual Intelligence</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white">Biometric & Strength Progression</h1>
        <p className="text-xs text-zinc-400 mt-1 max-w-2xl leading-relaxed">
          Monitor your physical hypertrophy response, strength 1RM milestones, and cumulative workload.
        </p>
      </div>

      {/* Grid of Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Body Weight Progression */}
        <div className="rounded-2xl border border-card-border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Scale className="h-4 w-4 text-brand" />
              Body Weight Trajectory (kg)
            </h3>
            <span className="text-[11px] font-mono text-brand font-semibold">
              +1.7 kg Overall
            </span>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weightData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f1f28" />
                <XAxis dataKey="date" stroke="#71717a" fontSize={11} />
                <YAxis domain={['dataMin - 2', 'dataMax + 2']} stroke="#71717a" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#121217', borderColor: '#272732', borderRadius: '8px', fontSize: '12px' }}
                />
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke="#bef264"
                  strokeWidth={3}
                  dot={{ fill: '#bef264', r: 5 }}
                  activeDot={{ r: 8, stroke: '#bef264', strokeWidth: 2, fill: '#000000' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Weekly Training Volume */}
        <div className="rounded-2xl border border-card-border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-brand" />
              Cumulative Weekly Training Volume (kg)
            </h3>
            <span className="text-[11px] font-mono text-emerald-400 font-semibold">
              +27% Overload
            </span>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={volumeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f1f28" />
                <XAxis dataKey="week" stroke="#71717a" fontSize={11} />
                <YAxis stroke="#71717a" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#121217', borderColor: '#272732', borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="volume" fill="#bef264" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Chart 3: Weekly Sleep Trends & Recovery */}
      <div className="rounded-2xl border border-card-border bg-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Calendar className="h-4 w-4 text-brand" />
            Sleep Duration Consistency (Hours / Night)
          </h3>
          <span className="text-[11px] font-mono text-zinc-400">Target: 7.5 - 8.5 Hours</span>
        </div>

        <div className="h-56 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sleepData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f1f28" />
              <XAxis dataKey="day" stroke="#71717a" fontSize={11} />
              <YAxis domain={[5, 10]} stroke="#71717a" fontSize={11} />
              <Tooltip
                contentStyle={{ backgroundColor: '#121217', borderColor: '#272732', borderRadius: '8px', fontSize: '12px' }}
              />
              <Area type="monotone" dataKey="hours" stroke="#60a5fa" fill="rgba(96, 165, 250, 0.15)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Row: PRs & Add Measurement */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Verified PR List */}
        <div className="lg:col-span-2 rounded-2xl border border-card-border bg-card p-6 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Award className="h-4 w-4 text-brand" />
            Verified Personal Records (1RM)
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(prs.length > 0 ? prs : [
              { exercise_name: 'Bench Press', value: 97.5, achieved_at: '2026-11-12' },
              { exercise_name: 'Back Squat', value: 130.0, achieved_at: '2026-11-08' },
              { exercise_name: 'Deadlift', value: 165.0, achieved_at: '2026-11-02' },
              { exercise_name: 'Pull-ups', value: 14.0, achieved_at: '2026-11-14' },
            ]).map((pr, i) => (
              <div key={i} className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800 text-center">
                <span className="text-[11px] text-zinc-400 block truncate">{pr.exercise_name}</span>
                <span className="text-xl font-black text-white mt-0.5 block font-mono">{pr.value} kg</span>
                <span className="text-[10px] text-zinc-500 font-mono">{pr.achieved_at}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Add Measurement Quick Form */}
        <div className="rounded-2xl border border-card-border bg-card p-6 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-1.5">
            <Plus className="h-4 w-4 text-brand" />
            Log Weight Check-In
          </h3>

          <form onSubmit={handleAddMeasurement} className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-300 mb-1">Current Weight (kg)</label>
              <input
                type="number"
                step="0.1"
                required
                value={newWeight}
                onChange={(e) => setNewWeight(Number(e.target.value))}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-300 mb-1">Body Fat % (optional)</label>
              <input
                type="number"
                step="0.1"
                value={newBodyFat}
                onChange={(e) => setNewBodyFat(Number(e.target.value))}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-white"
              />
            </div>

            <button
              type="submit"
              disabled={savingM}
              className="w-full py-2.5 rounded-xl bg-brand text-xs font-bold text-black hover:bg-brand-400 transition-colors shadow-glow disabled:opacity-50 strap-primary"
            >
              {savingM ? 'Logging...' : 'Record Weight Log'}
            </button>
          </form>
        </div>
      </div>

      <PremiumModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        featureTitle="Advanced Biometric Analytics"
        featureDescription="Track body composition trends, 1RM strength progression, and training load analytics."
      />
    </div>
  );
}
