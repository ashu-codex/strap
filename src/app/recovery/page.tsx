'use client';

import React, { useState, useEffect } from 'react';
import {
  HeartPulse,
  Moon,
  Sparkles,
  Activity,
  CheckCircle2,
  Lock,
  ArrowRight,
  Save,
  AlertTriangle,
  BatteryCharging,
} from 'lucide-react';
import PremiumModal from '@/components/PremiumModal';
import NumericInput from '@/components/ui/NumericInput';

export default function RecoveryPage() {
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [sleepLogs, setSleepLogs] = useState<any[]>([]);
  const [recoveryLogs, setRecoveryLogs] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // New log form state
  const [sleepHours, setSleepHours] = useState(7.5);
  const [sleepQuality, setSleepQuality] = useState(4);
  const [fatigueLevel, setFatigueLevel] = useState(2);
  const [sorenessScore, setSorenessScore] = useState(2);
  const [notes, setNotes] = useState('');

  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    async function loadRecovery() {
      try {
        const [subRes, recRes] = await Promise.all([
          fetch('/api/user/subscription').then((r) => r.json()).catch(() => ({ isPremium: false })),
          fetch('/api/user/recovery').then((r) => (r.ok ? r.json() : null)).catch(() => null),
        ]);
        setIsPremium(Boolean(subRes?.isPremium));
        if (recRes) {
          setSleepLogs(recRes.sleepLogs || []);
          setRecoveryLogs(recRes.recoveryLogs || []);
        }
        setLoading(false);
      } catch (err) {
        setLoading(false);
      }
    }
    loadRecovery();
  }, []);

  const handleLogRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch('/api/user/recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sleep_hours: sleepHours,
          sleep_quality: sleepQuality,
          fatigue_level: fatigueLevel,
          muscle_soreness_score: sorenessScore,
          notes,
        }),
      });

      if (!res.ok) throw new Error('Failed to log recovery');

      // Refresh logs
      const recRes = await fetch('/api/user/recovery').then((r) => r.json());
      setSleepLogs(recRes.sleepLogs || []);
      setRecoveryLogs(recRes.recoveryLogs || []);

      setMessage('Autonomic recovery logged! Your daily readiness score has been recalibrated.');
    } catch (err: any) {
      setMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent shadow-glow" />
          <span className="text-xs text-zinc-400 font-mono">Analyzing Autonomic Readiness...</span>
        </div>
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
            Autonomic Recovery & Sleep Engine
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto leading-relaxed mb-6">
            Log sleep quality, perceived fatigue, and muscular soreness to calculate your daily CNS readiness score (Ready, Recovering, Rest Recommended).
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

  const latestRec =
    recoveryLogs.length > 0 && Number.isFinite(Number(recoveryLogs[0]?.recovery_score_pct))
      ? recoveryLogs[0]
      : null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready':
        return 'text-emerald-400 bg-emerald-950/40 border-emerald-500/30';
      case 'recovering':
        return 'text-amber-400 bg-amber-950/40 border-amber-500/30';
      case 'rest_recommended':
        return 'text-rose-400 bg-rose-950/40 border-rose-500/30';
      default:
        return 'text-zinc-400 bg-zinc-900 border-zinc-800';
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="border-b border-zinc-800 pb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold uppercase tracking-wider text-brand bg-brand/10 border border-brand/20 px-2.5 py-0.5 rounded-full">
            Autonomic Readiness
          </span>
          <span className="text-xs font-mono text-zinc-400">Sleep & Fatigue Modeling</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white">STRAP Recovery Engine</h1>
        <p className="text-xs text-zinc-400 mt-1 max-w-2xl leading-relaxed">
          Muscle fibers grow during deep restorative sleep. Track your nervous system readiness to prevent overtraining and optimize periodization.
        </p>
      </div>

      {message && (
        <div className="rounded-xl border border-brand/30 bg-brand/10 p-3.5 text-xs text-brand flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          <span>{message}</span>
        </div>
      )}

      {/* Top Readiness Score Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-card-border bg-card p-6 flex flex-col justify-between shadow-glow">
          <div>
            <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Today&apos;s Readiness Score</span>
            {latestRec ? (
              <>
                <div className="text-4xl font-black text-white mt-1 flex flex-wrap items-baseline gap-2">
                  {latestRec.recovery_score_pct}%
                  <span className={`text-xs uppercase font-bold px-2 py-0.5 rounded-full border ${getStatusColor(latestRec.readiness_status)}`}>
                    {latestRec.readiness_status?.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-xs text-zinc-300 mt-2 leading-relaxed">
                  {latestRec.readiness_status === 'ready'
                    ? 'Your central nervous system has replenished substrate reserves. You are cleared for maximal progressive overload and PR attempts.'
                    : latestRec.readiness_status === 'recovering'
                    ? 'Moderate muscular fatigue detected. Adhere strictly to prescribed RPE 7-8 and maintain adequate intra-set rest.'
                    : 'Elevated systemic fatigue. A light active recovery session or complete rest day is strongly advised.'}
                </p>
              </>
            ) : (
              <div className="mt-3 space-y-2">
                <p className="text-sm font-bold text-zinc-200">
                  Not enough data to calculate readiness.
                </p>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Log your sleep duration, quality, fatigue, and soreness using the form to generate your real readiness score.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Log Form */}
        <div className="rounded-2xl border border-card-border bg-card p-6 md:col-span-2 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <BatteryCharging className="h-4 w-4 text-brand" />
            Log Today's Recovery Telemetry
          </h3>

          <form onSubmit={handleLogRecovery} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <label className="block text-[11px] font-semibold text-zinc-300">
                    Sleep Duration (Hours)
                  </label>
                  <NumericInput
                    min={0}
                    max={24}
                    allowDecimal
                    defaultOnBlur={7.5}
                    value={sleepHours}
                    onValueChange={(v) => {
                      if (v !== null) setSleepHours(v);
                    }}
                    aria-label="Sleep duration in hours"
                    className="w-16 rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1 text-right text-xs font-bold text-white focus:border-brand focus:outline-none"
                  />
                </div>
                <input
                  type="range"
                  min={4}
                  max={11}
                  step={0.5}
                  value={Math.min(11, Math.max(4, sleepHours))}
                  onChange={(e) => setSleepHours(Number(e.target.value))}
                  className="w-full accent-brand cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                  Sleep Quality (1 = Poor, 5 = Restorative): {sleepQuality} Stars
                </label>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={sleepQuality}
                  onChange={(e) => setSleepQuality(Number(e.target.value))}
                  className="w-full accent-brand cursor-pointer"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                  Systemic Fatigue (1 = Energetic, 5 = Exhausted): {fatigueLevel}
                </label>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={fatigueLevel}
                  onChange={(e) => setFatigueLevel(Number(e.target.value))}
                  className="w-full accent-brand cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                  Muscle Soreness (1 = None, 5 = Heavy DOMS): {sorenessScore}
                </label>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={sorenessScore}
                  onChange={(e) => setSorenessScore(Number(e.target.value))}
                  className="w-full accent-brand cursor-pointer"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-brand text-xs font-bold text-black hover:bg-brand-400 transition-all shadow-glow disabled:opacity-50 strap-primary"
            >
              <Save className="h-4 w-4" />
              <span>{submitting ? 'Calculating...' : 'Record Telemetry & Update Score'}</span>
            </button>
          </form>
        </div>
      </div>

      {/* Historical Telemetry Log Table */}
      <div className="rounded-2xl border border-card-border bg-card p-6 space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Activity className="h-4 w-4 text-brand" />
          Recent Autonomic Recovery Records
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-[10px] text-zinc-500 uppercase font-mono">
                <th className="py-2.5">Date</th>
                <th>Sleep Duration</th>
                <th>Readiness Score</th>
                <th>Status</th>
                <th>Fatigue / Soreness</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900 text-zinc-300">
              {recoveryLogs.map((log, i) => {
                const matchedSleep = sleepLogs.find((s) => s.log_date === log.log_date) || { sleep_hours: 7.5 };
                return (
                  <tr key={i} className="hover:bg-zinc-950/40">
                    <td className="py-3 font-mono text-zinc-400">{log.log_date}</td>
                    <td className="font-semibold text-white">{matchedSleep.sleep_hours} hrs</td>
                    <td className="font-bold text-brand font-mono">{log.recovery_score_pct}%</td>
                    <td>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${getStatusColor(log.readiness_status)}`}>
                        {log.readiness_status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="text-zinc-400">
                      Fatigue: {log.fatigue_level}/5 • Soreness: {log.muscle_soreness_score}/5
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <PremiumModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        featureTitle="Autonomic Recovery Engine"
        featureDescription="Gain daily readiness scoring, sleep duration monitoring, and fatigue adaptation rules."
      />
    </div>
  );
}
