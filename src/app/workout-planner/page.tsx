'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Sparkles,
  Dumbbell,
  Flame,
  ArrowRight,
  RefreshCw,
  Lock,
  CheckCircle2,
  AlertCircle,
  SlidersHorizontal,
} from 'lucide-react';

export default function WorkoutPlannerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [plan, setPlan] = useState<any>(null);
  const [profileSummary, setProfileSummary] = useState<any>(null);
  const [profileIncomplete, setProfileIncomplete] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [regeneratedBanner, setRegeneratedBanner] = useState(false);
  const [activeDayIdx, setActiveDayIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const loadPlan = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const subRes = await fetch('/api/user/subscription', { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : { isPremium: false }))
        .catch(() => ({ isPremium: false }));

      const prem = Boolean(subRes?.isPremium);
      setIsPremium(prem);
      if (!prem) {
        setLoading(false);
        return;
      }

      const planRes = await fetch('/api/ai/generate-plan', { cache: 'no-store' });
      const planData = await planRes.json().catch(() => null);

      if (!planRes.ok) {
        throw new Error(planData?.error || 'Could not load your personalized workout plan.');
      }

      if (planData?.profileSummary) setProfileSummary(planData.profileSummary);

      if (planData?.profileIncomplete) {
        setProfileIncomplete(true);
        setMissingFields(Array.isArray(planData.missingFields) ? planData.missingFields : []);
        setPlan(null);
      } else {
        setProfileIncomplete(false);
        setMissingFields([]);
        setPlan(planData?.plan || null);
        setRegeneratedBanner(Boolean(planData?.regeneratedForProfileChange));
        setActiveDayIdx(0);
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to synchronize workout planner with your profile.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlan();
  }, [loadPlan]);

  const handleRegenerate = async () => {
    setGenerating(true);
    setError(null);
    setRegeneratedBanner(false);
    try {
      const res = await fetch('/api/ai/generate-plan', {
        method: 'POST',
        cache: 'no-store',
      });
      const data = await res.json().catch(() => ({}));
      if (data?.profileSummary) setProfileSummary(data.profileSummary);
      if (data?.profileIncomplete) {
        setProfileIncomplete(true);
        setMissingFields(Array.isArray(data.missingFields) ? data.missingFields : []);
        setPlan(null);
        return;
      }
      if (!res.ok) throw new Error(data.error || 'Failed to regenerate split');
      setProfileIncomplete(false);
      setPlan(data.plan);
      setActiveDayIdx(0);
    } catch (err: any) {
      setError(err.message || 'Failed to regenerate split.');
    } finally {
      setGenerating(false);
    }
  };

  const handleStartPlannedDay = (day: any) => {
    try {
      sessionStorage.setItem(
        'strap-active-plan-day',
        JSON.stringify({
          split_name: plan?.split_name,
          split_type: plan?.split_type,
          day,
        })
      );
    } catch {
      // ignore storage errors
    }
    router.push('/workout-tracker?fromPlan=1');
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent shadow-glow" />
          <span className="text-xs text-zinc-400 font-mono tracking-wider">
            Syncing STRAP Planner with your latest Profile...
          </span>
        </div>
      </div>
    );
  }

  // Free user view
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
            AI-Engineered Workout Split Generator
          </h1>

          <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto leading-relaxed mb-6">
            Generate periodized 1-to-7 day workout splits synchronized directly with your Profile training frequency, primary goal, experience level, and equipment.
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

  // Profile incomplete state — never invent fake preferences
  if (profileIncomplete) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-brand/30 bg-card p-6 sm:p-8 space-y-5 shadow-glow">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand/15 border border-brand/30 text-brand">
              <SlidersHorizontal className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-bold uppercase tracking-wider text-brand">
                Profile Setup Required
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-white mt-0.5">
                Complete Your Profile to Generate Your Workout Split
              </h1>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                STRAP never invents default schedules or goals. Save your training preferences in Profile so the AI Planner can build an exact split matched to your schedule.
              </p>
            </div>
          </div>

          {missingFields.length > 0 && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4 space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                Missing Profile Information
              </p>
              <ul className="space-y-1.5 text-xs text-zinc-200">
                {missingFields.map((field) => (
                  <li key={field} className="flex items-center gap-2">
                    <AlertCircle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                    <span>{field}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/profile"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand text-xs font-extrabold text-black hover:bg-brand-400 transition-all shadow-glow strap-primary"
            >
              <span>Complete Profile Settings</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <button
              type="button"
              onClick={loadPlan}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-900 text-xs font-bold text-white hover:border-brand transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5 text-brand" />
              <span>Re-check Profile</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Error with retry when no plan could be loaded
  if (error && !plan) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-red-500/30 bg-card p-6 sm:p-8 text-center space-y-4">
          <AlertCircle className="h-8 w-8 text-red-400 mx-auto" />
          <h2 className="text-lg font-black text-white">Could Not Load Workout Plan</h2>
          <p className="text-xs text-zinc-400 max-w-md mx-auto">{error}</p>
          <button
            type="button"
            onClick={loadPlan}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand text-xs font-extrabold text-black strap-primary"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Retry</span>
          </button>
        </div>
      </div>
    );
  }

  const schedule: any[] = Array.isArray(plan?.weekly_schedule) ? plan.weekly_schedule : [];
  const activeDay = schedule[activeDayIdx] || schedule[0];
  const syncedSnapshot = plan?._profile_snapshot || profileSummary;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-zinc-800 pb-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-brand bg-brand/10 border border-brand/20 px-2.5 py-0.5 rounded-full">
              STRAP Workout Architecture
            </span>
            {plan?.split_type && (
              <span className="text-xs font-semibold text-zinc-400 font-mono">
                Split: {plan.split_type} ({schedule.length} {schedule.length === 1 ? 'Day' : 'Days'}/Week)
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white break-words">
            {plan?.split_name || `${schedule.length}-Day Personalized Workout Split`}
          </h1>
          {plan?.rationale && (
            <p className="text-xs text-zinc-400 mt-1.5 max-w-3xl leading-relaxed">
              {plan.rationale}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={handleRegenerate}
          disabled={generating}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-xs font-bold text-white hover:border-brand/60 hover:bg-zinc-800 transition-colors shadow-glow shrink-0 disabled:opacity-50 w-full sm:w-auto"
        >
          <RefreshCw className={`h-4 w-4 text-brand ${generating ? 'animate-spin' : ''}`} />
          <span>{generating ? 'Regenerating...' : 'Regenerate Split'}</span>
        </button>
      </div>

      {/* Single-Source-of-Truth Profile Sync Strip */}
      {syncedSnapshot && (
        <div className="rounded-xl border border-brand/25 bg-brand/5 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-zinc-300">
            <Sparkles className="h-3.5 w-3.5 text-brand shrink-0" />
            <span className="font-bold text-white">Synced with Profile:</span>
            <span className="font-mono text-brand font-bold">
              {syncedSnapshot.weekly_workout_days} {syncedSnapshot.weekly_workout_days === 1 ? 'Day' : 'Days'}/Week
            </span>
            <span className="text-zinc-500">•</span>
            <span className="capitalize">{String(syncedSnapshot.primary_goal || '').replace(/_/g, ' ')}</span>
            <span className="text-zinc-500">•</span>
            <span className="capitalize">{syncedSnapshot.experience_level}</span>
            <span className="text-zinc-500">•</span>
            <span className="capitalize">
              {syncedSnapshot.training_style === 'powerlifting' ? 'Powerlifting' : 'Muscle Building'}
            </span>
            <span className="text-zinc-500">•</span>
            <span className="capitalize">{syncedSnapshot.workout_location || 'gym'}</span>
          </div>
          <Link
            href="/profile"
            className="text-xs font-bold text-brand hover:underline shrink-0"
          >
            Edit Profile →
          </Link>
        </div>
      )}

      {regeneratedBanner && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>
            Your workout split was automatically updated to match your latest Profile settings ({schedule.length} days/week).
          </span>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-400 flex flex-wrap items-center justify-between gap-2">
          <span>{error}</span>
          <button
            type="button"
            onClick={handleRegenerate}
            className="px-3 py-1 rounded-lg bg-red-500/20 border border-red-500/40 text-red-200 font-bold"
          >
            Retry
          </button>
        </div>
      )}

      {/* Day Tabs */}
      <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:overflow-x-auto pb-2 border-b border-zinc-800">
        {schedule.map((day: any, idx: number) => {
          const isActive = activeDayIdx === idx;
          return (
            <button
              type="button"
              key={idx}
              onClick={() => setActiveDayIdx(idx)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all sm:whitespace-nowrap text-left ${
                isActive
                  ? 'bg-brand text-black shadow-glow'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              <span>
                Day {day.day_number}: {day.focus}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Day Content */}
      {activeDay && (
        <div className="space-y-6">
          {/* Day Overview Banner */}
          <div className="rounded-2xl border border-card-border bg-card p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand">
                Day {activeDay.day_number} of {schedule.length}
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-white break-words">{activeDay.day_title}</h2>
              <p className="text-xs text-zinc-400 mt-0.5">Focus: {activeDay.focus}</p>
            </div>

            <button
              type="button"
              onClick={() => handleStartPlannedDay(activeDay)}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-brand text-xs font-bold text-black hover:bg-brand-400 transition-all shadow-glow shrink-0 w-full sm:w-auto strap-primary"
            >
              <Dumbbell className="h-4 w-4" />
              <span>Start This Workout in Tracker</span>
            </button>
          </div>

          {/* Warmup Checklist */}
          {activeDay.warmup && activeDay.warmup.length > 0 && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">
                Dynamic Warm-Up Protocol
              </span>
              <div className="flex flex-wrap gap-2">
                {activeDay.warmup.map((item: string, i: number) => (
                  <span
                    key={i}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-300"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-brand shrink-0" />
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
                  className="rounded-2xl border border-card-border bg-card p-4 sm:p-5 hover:border-zinc-700 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-mono font-bold text-brand shrink-0">
                        0{i + 1}
                      </span>
                      <div className="min-w-0">
                        <h4 className="text-sm sm:text-base font-bold text-white break-words">
                          {ex.exercise_name}
                        </h4>
                        <span className="text-xs text-zinc-400">Target: {ex.target_muscle}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs bg-zinc-900/80 border border-zinc-800 px-3 py-1.5 rounded-xl self-start shrink-0">
                      <span className="font-mono font-bold text-white">{ex.sets} Sets</span>
                      <span className="text-zinc-500">•</span>
                      <span className="font-mono font-bold text-white">{ex.reps} Reps</span>
                      <span className="text-zinc-500">•</span>
                      <span className="font-mono text-brand">Rest: {ex.rest_seconds}s</span>
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
            <div className="rounded-2xl border border-brand/20 bg-brand/5 p-5 sm:p-6">
              <h3 className="text-sm font-bold text-brand uppercase tracking-wider mb-3 flex items-center gap-2">
                <Flame className="h-4 w-4 shrink-0" />
                <span>Systemic Progressive Overload Directive</span>
              </h3>
              <ul className="space-y-2 text-xs text-zinc-300">
                {plan.progressive_overload_rules.map((rule: string, i: number) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-brand shrink-0 mt-0.5" />
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
