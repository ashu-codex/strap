'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
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
  Dumbbell,
  Flame,
  BarChart3,
  CheckCircle2,
} from 'lucide-react';
import NumericInput from '@/components/ui/NumericInput';
import { buildRealAnalytics } from '@/lib/fitness-analytics';

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [measurements, setMeasurements] = useState<any[]>([]);
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [prs, setPrs] = useState<any[]>([]);
  const [sleepLogs, setSleepLogs] = useState<any[]>([]);
  const [recoveryLogs, setRecoveryLogs] = useState<any[]>([]);

  // New measurement form state (empty by default — no fake pre-filled numbers)
  const [newWeight, setNewWeight] = useState<number | null>(null);
  const [newBodyFat, setNewBodyFat] = useState<number | null>(null);
  const [savingM, setSavingM] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [subRes, mRes, wRes, recRes] = await Promise.all([
        fetch('/api/user/subscription', { cache: 'no-store' })
          .then((r) => (r.ok ? r.json() : { isPremium: false }))
          .catch(() => ({ isPremium: false })),
        fetch('/api/user/measurements', { cache: 'no-store' })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
        fetch('/api/workouts', { cache: 'no-store' })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
        fetch('/api/user/recovery', { cache: 'no-store' })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
      ]);
      setIsPremium(Boolean(subRes?.isPremium));
      setMeasurements(Array.isArray(mRes?.measurements) ? mRes.measurements : []);
      setWorkouts(Array.isArray(wRes?.workouts) ? wRes.workouts : []);
      setPrs(Array.isArray(wRes?.prs) ? wRes.prs : []);
      setSleepLogs(Array.isArray(recRes?.sleepLogs) ? recRes.sleepLogs : []);
      setRecoveryLogs(Array.isArray(recRes?.recoveryLogs) ? recRes.recoveryLogs : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const analytics = useMemo(
    () =>
      buildRealAnalytics({
        workouts,
        measurements,
        prs,
        sleepLogs,
        recoveryLogs,
      }),
    [workouts, measurements, prs, sleepLogs, recoveryLogs]
  );

  const handleAddMeasurement = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setFormError(null);

    if (newWeight === null || newWeight < 20 || newWeight > 500) {
      setFormError('Please enter a valid body weight between 20 and 500 kg.');
      return;
    }

    setSavingM(true);
    try {
      const res = await fetch('/api/user/measurements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weight_kg: newWeight,
          ...(newBodyFat !== null ? { body_fat_pct: newBodyFat } : {}),
          recorded_date: new Date().toISOString().split('T')[0],
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Could not record measurement.');
      }

      setNewWeight(null);
      setNewBodyFat(null);
      setFeedback('Weight check-in recorded.');
      await loadData();
    } catch (err: any) {
      setFormError(err?.message || 'Could not record measurement.');
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
      <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16 sm:px-6 lg:px-8 text-center">
        <div className="rounded-3xl border border-brand/30 bg-card p-6 sm:p-10 shadow-glow-lg max-w-2xl mx-auto">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/20 border border-brand/40 text-brand mx-auto mb-4 shadow-glow">
            <Lock className="h-7 w-7" />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest text-brand bg-brand/10 px-3 py-1 rounded-full border border-brand/20">
            STRAP Premium Exclusive
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-white mt-3 mb-2">
            Progress &amp; Biometric Analytics Engine
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto leading-relaxed mb-6">
            Real data visualizations mapping your body weight trajectory, weekly training frequency, cumulative volume, 1RM strength progression, muscle group volume, and sleep consistency.
          </p>
          <Link
            href="/checkout"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-brand text-sm font-extrabold text-black hover:bg-brand-400 transition-all shadow-glow hover:scale-105 strap-primary"
          >
            <span>Upgrade to Premium (₹100/mo)</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8 sm:px-6 lg:px-8 space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="border-b border-zinc-800 pb-6">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="text-xs font-bold uppercase tracking-wider text-brand bg-brand/10 border border-brand/20 px-2.5 py-0.5 rounded-full">
            Verified Performance Telemetry
          </span>
          <span className="text-xs font-mono text-zinc-400">100% Real User Records</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white">Biometric &amp; Strength Progression</h1>
        <p className="text-xs text-zinc-400 mt-1 max-w-2xl leading-relaxed">
          All charts and milestones below are calculated exclusively from your logged workouts, weight check-ins, and recovery records.
        </p>
      </div>

      {/* First-Time Empty State Banner when user has zero records */}
      {!analytics.hasAnyData && (
        <div className="rounded-2xl border border-dashed border-brand/30 bg-card p-8 text-center space-y-4">
          <BarChart3 className="h-10 w-10 text-brand mx-auto" />
          <div className="space-y-1">
            <h2 className="text-lg font-black text-white">No Performance Data Yet</h2>
            <p className="text-xs text-zinc-400 max-w-lg mx-auto leading-relaxed">
              STRAP never displays sample charts or fake progress numbers. Log your first workout, weight check-in, or sleep entry to unlock live progression analytics.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            <Link
              href="/workout-tracker"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand text-xs font-extrabold text-black strap-primary"
            >
              <Dumbbell className="h-4 w-4" />
              <span>Log Your First Workout</span>
            </Link>
            <Link
              href="/recovery"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-900 text-xs font-bold text-white hover:border-brand transition-colors"
            >
              <span>Log Sleep &amp; Recovery</span>
            </Link>
          </div>
        </div>
      )}

      {/* Real KPI Summary Strip (Shown once real workout or measurement data exists) */}
      {analytics.hasAnyData && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-card-border bg-card p-4 sm:p-5">
            <span className="text-[11px] font-semibold text-zinc-400 block">Total Workouts</span>
            <div className="text-2xl font-black text-white mt-1">
              {analytics.totalWorkouts}
            </div>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              {analytics.streak.workoutsThisWeek} in the last 7 days
            </p>
          </div>

          <div className="rounded-xl border border-card-border bg-card p-4 sm:p-5">
            <span className="text-[11px] font-semibold text-zinc-400 block">Weekly Frequency</span>
            <div className="text-2xl font-black text-white mt-1">
              {analytics.avgWeeklyFrequency !== null ? (
                <>
                  {analytics.avgWeeklyFrequency}{' '}
                  <span className="text-xs font-normal text-zinc-400">/ wk</span>
                </>
              ) : (
                <span className="text-sm font-semibold text-zinc-400">No workouts yet</span>
              )}
            </div>
            <p className="text-[11px] text-zinc-500 mt-0.5">Average active sessions/week</p>
          </div>

          <div className="rounded-xl border border-card-border bg-card p-4 sm:p-5">
            <span className="text-[11px] font-semibold text-zinc-400 block">Total Logged Volume</span>
            <div className="text-2xl font-black text-brand mt-1">
              {analytics.totalWorkouts > 0 ? (
                <>
                  {analytics.totalVolumeKg.toLocaleString()}{' '}
                  <span className="text-xs font-normal text-zinc-400">kg</span>
                </>
              ) : (
                <span className="text-sm font-semibold text-zinc-400">No workouts yet</span>
              )}
            </div>
            <p className="text-[11px] text-zinc-500 mt-0.5">Cumulative completed tonnage</p>
          </div>

          <div className="rounded-xl border border-card-border bg-card p-4 sm:p-5">
            <span className="text-[11px] font-semibold text-zinc-400 block">Verified PRs</span>
            <div className="text-2xl font-black text-white mt-1">{analytics.realPrs.length}</div>
            <p className="text-[11px] text-zinc-500 mt-0.5">1RM &amp; volume records</p>
          </div>
        </div>
      )}

      {/* Grid of Real Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Body Weight Progression */}
        <div className="rounded-2xl border border-card-border bg-card p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Scale className="h-4 w-4 text-brand shrink-0" />
              <span>Body Weight Trajectory (kg)</span>
            </h3>
            {analytics.weightDeltaKg !== null && (
              <span className="text-[11px] font-mono text-brand font-semibold">
                {analytics.weightDeltaKg > 0 ? `+${analytics.weightDeltaKg}` : analytics.weightDeltaKg} kg Overall
              </span>
            )}
          </div>

          <div className="h-64 w-full pt-2">
            {analytics.weightSeries.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-4 rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40">
                <p className="text-xs font-semibold text-zinc-300">No body weight check-ins logged yet.</p>
                <p className="text-[11px] text-zinc-500 mt-1">
                  Use the Weight Check-In form below to start tracking your real weight progression.
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.weightSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f1f28" />
                  <XAxis dataKey="date" stroke="#71717a" fontSize={11} />
                  <YAxis domain={['dataMin - 2', 'dataMax + 2']} stroke="#71717a" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#121217',
                      borderColor: '#272732',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="weight"
                    name="Weight (kg)"
                    stroke="#bef264"
                    strokeWidth={3}
                    dot={{ fill: '#bef264', r: 5 }}
                    activeDot={{ r: 7, stroke: '#bef264', strokeWidth: 2, fill: '#000000' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 2: Real Weekly Training Volume */}
        <div className="rounded-2xl border border-card-border bg-card p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-brand shrink-0" />
              <span>Weekly Training Volume (kg)</span>
            </h3>
            {analytics.weeklySeries.length > 0 && (
              <span className="text-[11px] font-mono text-zinc-400">
                {analytics.weeklySeries.length} active {analytics.weeklySeries.length === 1 ? 'week' : 'weeks'}
              </span>
            )}
          </div>

          <div className="h-64 w-full pt-2">
            {analytics.weeklySeries.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-4 rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40">
                <p className="text-xs font-semibold text-zinc-300">No workout volume recorded yet.</p>
                <p className="text-[11px] text-zinc-500 mt-1">
                  Log completed workouts in the Tracker to plot weekly tonnage and training frequency.
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.weeklySeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f1f28" />
                  <XAxis dataKey="label" stroke="#71717a" fontSize={11} />
                  <YAxis stroke="#71717a" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#121217',
                      borderColor: '#272732',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="volume" name="Volume (kg)" fill="#bef264" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 3: Real Strength Progression (Peak Est. 1RM per Session) */}
        <div className="rounded-2xl border border-card-border bg-card p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Award className="h-4 w-4 text-brand shrink-0" />
              <span>Strength Progression — Peak Est. 1RM (kg)</span>
            </h3>
          </div>

          <div className="h-60 w-full pt-2">
            {analytics.strengthSeries.filter((s) => s.bestEst1RM > 0).length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-4 rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40">
                <p className="text-xs font-semibold text-zinc-300">No strength data logged yet.</p>
                <p className="text-[11px] text-zinc-500 mt-1">
                  Complete weighted sets to track estimated 1RM progression across sessions.
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.strengthSeries.filter((s) => s.bestEst1RM > 0)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f1f28" />
                  <XAxis dataKey="date" stroke="#71717a" fontSize={11} />
                  <YAxis stroke="#71717a" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#121217',
                      borderColor: '#272732',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="bestEst1RM"
                    name="Peak Est. 1RM (kg)"
                    stroke="#34d399"
                    strokeWidth={2.5}
                    dot={{ fill: '#34d399', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 4: Real Sleep Duration Consistency */}
        <div className="rounded-2xl border border-card-border bg-card p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Calendar className="h-4 w-4 text-brand shrink-0" />
              <span>Sleep Duration Consistency (Hours)</span>
            </h3>
            {analytics.avgSleepHours !== null && (
              <span className="text-[11px] font-mono text-blue-400 font-semibold">
                Avg: {analytics.avgSleepHours} hrs/night
              </span>
            )}
          </div>

          <div className="h-60 w-full pt-2">
            {analytics.sleepSeries.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-4 rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40">
                <p className="text-xs font-semibold text-zinc-300">Log your sleep to see insights.</p>
                <Link href="/recovery" className="text-[11px] font-bold text-brand hover:underline mt-1">
                  Go to Recovery Logger →
                </Link>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.sleepSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f1f28" />
                  <XAxis dataKey="date" stroke="#71717a" fontSize={11} />
                  <YAxis domain={[0, 12]} stroke="#71717a" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#121217',
                      borderColor: '#272732',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="hours"
                    name="Sleep (hrs)"
                    stroke="#60a5fa"
                    fill="rgba(96, 165, 250, 0.15)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Muscle Group Training Frequency */}
      <div className="rounded-2xl border border-card-border bg-card p-5 sm:p-6 space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Flame className="h-4 w-4 text-brand shrink-0" />
          <span>Muscle Group Training Frequency &amp; Volume</span>
        </h3>

        {analytics.muscleGroupFrequency.length === 0 ? (
          <p className="text-xs text-zinc-400">
            No muscle-group training history yet. Complete workouts in the Tracker to see real set distribution and volume per muscle group.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {analytics.muscleGroupFrequency.map((m) => (
              <div
                key={m.muscle}
                className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3.5 space-y-1.5"
              >
                <div className="flex items-center justify-between text-xs font-bold text-white">
                  <span className="truncate">{m.muscle}</span>
                  <span className="text-brand font-mono shrink-0">{m.sets} sets</span>
                </div>
                <div className="text-[11px] text-zinc-400 flex items-center justify-between">
                  <span>{m.sessions} {m.sessions === 1 ? 'session' : 'sessions'}</span>
                  <span className="font-mono">{m.volume.toLocaleString()} kg</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Row: Verified PRs & Add Measurement */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Verified PR List */}
        <div className="lg:col-span-2 rounded-2xl border border-card-border bg-card p-5 sm:p-6 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Award className="h-4 w-4 text-brand shrink-0" />
            <span>Verified Personal Records (1RM &amp; Volume)</span>
          </h3>

          {analytics.realPrs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 p-6 text-center space-y-1.5">
              <p className="text-xs font-semibold text-zinc-300">No personal records yet.</p>
              <p className="text-[11px] text-zinc-500">
                Personal records are calculated automatically from completed sets in your Workout Tracker.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {analytics.realPrs.map((pr, i) => (
                <div key={pr.id || i} className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800 text-center min-w-0">
                  <span className="text-[10px] uppercase font-bold text-brand block">
                    {pr.record_type === 'max_volume' ? 'Max Volume' : 'Est. 1RM'}
                  </span>
                  <span className="text-xs text-zinc-300 font-semibold block truncate mt-0.5" title={pr.exercise_name}>
                    {pr.exercise_name}
                  </span>
                  <span className="text-lg font-black text-white mt-0.5 block font-mono">
                    {Math.round(Number(pr.value) * 10) / 10} kg
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">{pr.achieved_at || ''}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Measurement Quick Form (using NumericInput — zero "080" bug) */}
        <div className="rounded-2xl border border-card-border bg-card p-5 sm:p-6 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-1.5">
            <Plus className="h-4 w-4 text-brand shrink-0" />
            <span>Log Weight Check-In</span>
          </h3>

          {feedback && (
            <div className="rounded-lg border border-brand/30 bg-brand/10 px-3 py-2 text-xs text-brand flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              <span>{feedback}</span>
            </div>
          )}
          {formError && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
              {formError}
            </div>
          )}

          <form onSubmit={handleAddMeasurement} className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                Current Weight (kg)
              </label>
              <NumericInput
                min={20}
                max={500}
                allowDecimal
                required
                placeholder="e.g. 74.5"
                value={newWeight}
                onValueChange={setNewWeight}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-white focus:border-brand focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                Body Fat % (optional)
              </label>
              <NumericInput
                min={2}
                max={70}
                allowDecimal
                placeholder="e.g. 15.5"
                value={newBodyFat}
                onValueChange={setNewBodyFat}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-white focus:border-brand focus:outline-none"
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
    </div>
  );
}
