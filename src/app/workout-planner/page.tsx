'use client';

import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Sparkles,
  Dumbbell,
  Clock,
  Flame,
  ArrowRight,
  RefreshCw,
  Lock,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Info,
} from 'lucide-react';
import PremiumModal from '@/components/PremiumModal';

export default function WorkoutPlannerPage() {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [plan, setPlan] = useState<any>(null);
  const [activeDayIdx, setActiveDayIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Premium Modal
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    async function loadPlan() {
      try {
        const subRes = await fetch('/api/user/subscription').then((r) => r.json());
        setIsPremium(subRes.isPremium);

        if (subRes.isPremium) {
          const planRes = await fetch('/api/ai/generate-plan');
          const data = await planRes.json();
          if (data.plan) {
            setPlan(data.plan);
          }
        }
        setLoading(false);
      } catch (err: any) {
        setError(err.message);
        setLoading(false);
      }
    }
    loadPlan();
  }, []);

  const handleRegenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/generate-plan', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to regenerate split');
      setPlan(data.plan);
      setActiveDayIdx(0);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-DEFAULT border-t-transparent shadow-glow" />
          <span className="text-xs text-zinc-400 font-mono tracking-wider">Synthesizing Gemini Workout Architecture...</span>
        </div>
      </div>
    );
  }

  // If free user, show locked view with upgrade CTA
  if (!isPremium) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8 text-center">
        <div className="rounded-3xl border border-brand-DEFAULT/30 bg-card p-10 shadow-glow-lg max-w-2xl mx-auto">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-DEFAULT/20 border border-brand-DEFAULT/40 text-brand-DEFAULT mx-auto mb-4 shadow-glow">
            <Lock className="h-7 w-7" />
          </div>

          <span className="text-xs font-bold uppercase tracking-widest text-brand-DEFAULT bg-brand-DEFAULT/10 px-3 py-1 rounded-full border border-brand-DEFAULT/20">
            STRAP Premium Exclusive
          </span>

          <h1 className="text-2xl sm:text-3xl font-black text-white mt-3 mb-2">
            AI-Engineered Workout Split Generator
          </h1>

          <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto leading-relaxed mb-6">
            Get intelligent, periodized workout splits (Push Pull Legs, Upper / Lower, Full Body) generated specifically for your available equipment and recovery capacity by Google Gemini AI.
          </p>

          {/* Sample blurred preview */}
          <div className="rounded-xl bg-zinc-950/80 border border-zinc-800 p-4 mb-8 text-left space-y-2 opacity-50 blur-[1px]">
            <div className="flex justify-between text-xs text-zinc-400">
              <span className="font-bold text-white">Day 1: Upper Power & Hypertrophy</span>
              <span>4 Exercises • 60 mins</span>
            </div>
            <div className="text-[11px] text-zinc-500">
              Barbell Bench Press (4 sets × 6-8 reps), Bent-Over Row (4 sets × 8-10 reps)...
            </div>
          </div>

          <a
            href="/checkout"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-brand-DEFAULT text-sm font-extrabold text-black hover:bg-brand-400 transition-all shadow-glow hover:scale-105 strap-primary"
          >
            <span>Upgrade to Premium (₹100/mo)</span>
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    );
  }

  const activeDay = plan?.weekly_schedule?.[activeDayIdx] || plan?.weekly_schedule?.[0];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-DEFAULT bg-brand-DEFAULT/10 border border-brand-DEFAULT/20 px-2.5 py-0.5 rounded-full">
              Gemini AI Workout Architecture
            </span>
            <span className="text-xs font-semibold text-zinc-400 font-mono">
              Split: {plan?.split_type || 'Upper / Lower'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            {plan?.split_name || '4-Day Upper / Lower Periodization'}
          </h1>
          <p className="text-xs text-zinc-400 mt-1 max-w-3xl leading-relaxed">
            {plan?.rationale || 'Engineered to balance high muscular tension with 48-72 hours of systemic recovery.'}
          </p>
        </div>

        <button
          onClick={handleRegenerate}
          disabled={generating}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-xs font-bold text-white hover:border-brand-DEFAULT/60 hover:bg-zinc-800 transition-colors shadow-glow shrink-0 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 text-brand-DEFAULT ${generating ? 'animate-spin' : ''}`} />
          <span>{generating ? 'Regenerating...' : 'Regenerate with Gemini'}</span>
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-400">
          {error}
        </div>
      )}

      {/* Day Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-zinc-800">
        {plan?.weekly_schedule?.map((day: any, idx: number) => {
          const isActive = activeDayIdx === idx;
          return (
            <button
              key={idx}
              onClick={() => setActiveDayIdx(idx)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-brand-DEFAULT text-black shadow-glow'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>Day {day.day_number}: {day.focus}</span>
            </button>
          );
        })}
      </div>

      {/* Active Day Content */}
      {activeDay && (
        <div className="space-y-6">
          {/* Day Overview Banner */}
          <div className="rounded-2xl border border-card-border bg-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand-DEFAULT">
                Day {activeDay.day_number} Overview
              </span>
              <h2 className="text-xl font-bold text-white">{activeDay.day_title}</h2>
              <p className="text-xs text-zinc-400 mt-0.5">Focus: {activeDay.focus}</p>
            </div>

            <a
              href="/workout-tracker"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-DEFAULT text-xs font-bold text-black hover:bg-brand-400 transition-all shadow-glow hover:scale-105 shrink-0 strap-primary"
            >
              <Dumbbell className="h-4 w-4" />
              <span>Start This Workout Now</span>
            </a>
          </div>

          {/* Warmup Checklist */}
          {activeDay.warmup && activeDay.warmup.length > 0 && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">
                Dynamic Warm-Up Protocol (5-8 Mins)
              </span>
              <div className="flex flex-wrap gap-2">
                {activeDay.warmup.map((item: string, i: number) => (
                  <span
                    key={i}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-300"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-brand-DEFAULT" />
                    <span>{item}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Exercises List */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Working Prescriptions ({activeDay.exercises?.length || 0} Movements)
            </h3>

            <div className="space-y-3">
              {activeDay.exercises?.map((ex: any, i: number) => (
                <div
                  key={i}
                  className="rounded-2xl border border-card-border bg-card p-5 hover:border-zinc-700 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                    <div className="flex items-start gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-mono font-bold text-brand-DEFAULT shrink-0">
                        0{i + 1}
                      </span>
                      <div>
                        <h4 className="text-base font-bold text-white">{ex.exercise_name}</h4>
                        <span className="text-xs text-zinc-400">Target: {ex.target_muscle}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-xs bg-zinc-900/80 border border-zinc-800 px-3 py-1.5 rounded-xl self-start">
                      <span className="font-mono font-bold text-white">{ex.sets} Sets</span>
                      <span className="text-zinc-500">•</span>
                      <span className="font-mono font-bold text-white">{ex.reps} Reps</span>
                      <span className="text-zinc-500">•</span>
                      <span className="font-mono text-brand-DEFAULT">Rest: {ex.rest_seconds}s</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-zinc-400 pt-2 border-t border-zinc-900">
                    {ex.recommended_weight_kg && (
                      <p>
                        <strong className="text-zinc-300">Recommended Load:</strong> {ex.recommended_weight_kg}
                      </p>
                    )}
                    {ex.notes && (
                      <p>
                        <strong className="text-zinc-300">Cues:</strong> {ex.notes}
                      </p>
                    )}
                  </div>

                  {ex.alternatives && ex.alternatives.length > 0 && (
                    <div className="mt-2 text-[11px] text-zinc-500">
                      Alternatives: {ex.alternatives.join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Progressive Overload Engine Rules */}
          {plan?.progressive_overload_rules && (
            <div className="rounded-2xl border border-brand-DEFAULT/20 bg-brand-DEFAULT/5 p-6">
              <h3 className="text-sm font-bold text-brand-DEFAULT uppercase tracking-wider mb-3 flex items-center gap-2">
                <Flame className="h-4 w-4" />
                <span>Systemic Progressive Overload Directive</span>
              </h3>
              <ul className="space-y-2 text-xs text-zinc-300">
                {plan.progressive_overload_rules.map((rule: string, i: number) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-brand-DEFAULT shrink-0 mt-0.5" />
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
