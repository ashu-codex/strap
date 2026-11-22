'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Flame,
  Scale,
  Dumbbell,
  HeartPulse,
  Award,
  ArrowRight,
  Bot,
  ChevronRight,
  Activity,
  Calendar,
  SlidersHorizontal,
} from 'lucide-react';
import { calculateConsistencyStreak } from '@/lib/fitness-analytics';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [metrics, setMetrics] = useState<any>(null);
  const [goal, setGoal] = useState<any>(null);
  const [recovery, setRecovery] = useState<any>(null);
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [prs, setPrs] = useState<any[]>([]);
  const [measurements, setMeasurements] = useState<any[]>([]);
  const [workoutPlan, setWorkoutPlan] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function loadDashboard() {
      try {
        const [subRes, profRes, metricsRes, goalsRes, workoutsRes]: any[] = await Promise.all([
          fetch('/api/user/subscription', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : {})).catch(() => ({})),
          fetch('/api/user/profile', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : {})).catch(() => ({})),
          fetch('/api/user/metrics', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : {})).catch(() => ({})),
          fetch('/api/user/goals', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : {})).catch(() => ({})),
          fetch('/api/workouts', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : {})).catch(() => ({})),
        ]);

        if (!active) return;

        const prem = Boolean(subRes?.isPremium);
        setProfile(profRes?.profile || subRes?.user || null);
        setIsPremium(prem);
        setMetrics(metricsRes?.metrics || null);
        setGoal(goalsRes?.goal || null);
        setWorkouts(Array.isArray(workoutsRes?.workouts) ? workoutsRes.workouts : []);
        setPrs(Array.isArray(workoutsRes?.prs) ? workoutsRes.prs : []);

        if (prem) {
          const [recRes, measRes, planRes]: any[] = await Promise.all([
            fetch('/api/user/recovery', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
            fetch('/api/user/measurements', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
            fetch('/api/ai/generate-plan', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
          ]);
          if (!active) return;
          setRecovery(recRes || null);
          setMeasurements(Array.isArray(measRes?.measurements) ? measRes.measurements : []);
          if (planRes?.plan && !planRes?.profileIncomplete) {
            setWorkoutPlan(planRes.plan);
          }
        }
      } catch {
        if (active) setError('Unable to load your dashboard data. Please refresh.');
      } finally {
        if (active) setLoading(false);
      }
    }

    loadDashboard();
    return () => {
      active = false;
    };
  }, []);

  const streak = useMemo(() => calculateConsistencyStreak(workouts), [workouts]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent shadow-glow" />
          <span className="text-xs text-zinc-400 font-mono tracking-wider">Syncing STRAP telemetry...</span>
        </div>
      </div>
    );
  }

  // Real Body Weight (latest measurement OR saved metrics/profile weight — NEVER invented)
  const latestMeasurement =
    measurements.length > 0 ? measurements[measurements.length - 1] : null;
  const rawWeight =
    latestMeasurement?.weight_kg ?? metrics?.current_weight_kg ?? profile?.weight ?? null;
  const currentWeight =
    rawWeight !== null && Number.isFinite(Number(rawWeight)) && Number(rawWeight) > 0
      ? Number(rawWeight)
      : null;

  const rawTargetWeight = goal?.target_weight_kg ?? null;
  const targetWeight =
    rawTargetWeight !== null && Number.isFinite(Number(rawTargetWeight)) && Number(rawTargetWeight) > 0
      ? Number(rawTargetWeight)
      : null;
  const weightDiff =
    currentWeight !== null && targetWeight !== null
      ? Math.round((targetWeight - currentWeight) * 10) / 10
      : null;

  // Real Recovery Readiness (ONLY when actual recovery logs exist with a valid score)
  const latestRec =
    Array.isArray(recovery?.recoveryLogs) &&
    recovery.recoveryLogs.length > 0 &&
    Number.isFinite(Number(recovery.recoveryLogs[0]?.recovery_score_pct))
      ? recovery.recoveryLogs[0]
      : null;

  // Real Sleep Duration (ONLY when actual sleep logs exist)
  const latestSleep =
    Array.isArray(recovery?.sleepLogs) &&
    recovery.sleepLogs.length > 0 &&
    Number.isFinite(Number(recovery.sleepLogs[0]?.sleep_hours))
      ? recovery.sleepLogs[0]
      : null;

  // Real Goal & Schedule
  const primaryGoalLabel =
    goal?.primary_goal || profile?.primary_goal
      ? String(goal?.primary_goal || profile?.primary_goal).replace(/_/g, ' ')
      : null;
  const weeklyTargetDays =
    goal?.weekly_workout_days ?? profile?.weekly_workout_days ?? null;

  // Real Verified 1RM PRs
  const real1RMPrs = prs
    .filter((p) => p && p.record_type !== 'max_volume' && Number(p.value) > 0)
    .slice(0, 4);

  // Real Nutrition Targets (ONLY when user has entered biometrics or custom targets)
  const realNutritionTargets =
    profile?.custom_nutrition_targets || (profile?.has_biometrics ? profile?.calculated_targets : null);

  // Real Planned Session (next day from user's synced AI plan, if available)
  const plannedDays: any[] = Array.isArray(workoutPlan?.weekly_schedule)
    ? workoutPlan.weekly_schedule
    : [];
  const nextPlannedDay =
    plannedDays.length > 0 ? plannedDays[workouts.length % plannedDays.length] : null;

  const latestWorkout = workouts.length > 0 ? workouts[0] : null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8 sm:px-6 lg:px-8 space-y-6 sm:space-y-8">
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-400">
          {error}
        </div>
      )}

      {/* 1. TOP WELCOME & STATUS BANNER */}
      <div className="rounded-2xl border border-[#E1E4E8] dark:border-card-border bg-white dark:bg-gradient-to-r dark:from-card dark:to-zinc-950 p-5 sm:p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-glow">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#4d7c0f] dark:text-brand bg-[#B7F34A]/20 dark:bg-brand/10 border border-[#B7F34A]/40 dark:border-brand/20 px-2.5 py-0.5 rounded-full">
              Athlete Central
            </span>
            {isPremium ? (
              <span className="text-xs font-extrabold text-[#111318] bg-[#B7F34A] px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-glow">
                <Sparkles className="h-3 w-3 fill-[#111318] text-[#111318]" />
                PREMIUM ACTIVE
              </span>
            ) : (
              <span className="text-xs font-semibold text-[#52525B] dark:text-zinc-400 bg-[#F0F2F5] dark:bg-zinc-800 px-2.5 py-0.5 rounded-full">
                FREE PLAN
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#111318] dark:text-white break-words">
            Welcome back, {profile?.full_name || 'Athlete'}
          </h1>
          <p className="text-xs text-[#52525B] dark:text-zinc-400 mt-1.5 max-w-xl">
            {primaryGoalLabel || weeklyTargetDays ? (
              <>
                {primaryGoalLabel && (
                  <>
                    Primary Goal:{' '}
                    <strong className="text-[#111318] dark:text-zinc-200 capitalize">
                      {primaryGoalLabel}
                    </strong>
                  </>
                )}
                {primaryGoalLabel && weeklyTargetDays ? ' • ' : ''}
                {weeklyTargetDays && (
                  <>
                    Training Schedule:{' '}
                    <strong className="text-[#111318] dark:text-zinc-200">
                      {weeklyTargetDays} {weeklyTargetDays === 1 ? 'day' : 'days'}/week
                    </strong>
                  </>
                )}
              </>
            ) : (
              <Link href="/profile" className="text-[#4d7c0f] dark:text-brand font-semibold hover:underline">
                Set your primary fitness goal &amp; weekly training schedule in Profile →
              </Link>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Link
            href="/workout-tracker"
            className="flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 text-xs font-extrabold text-black hover:bg-brand-400 transition-all shadow-glow w-full sm:w-auto strap-primary"
          >
            <Dumbbell className="h-4 w-4" />
            <span>Start Today&apos;s Workout</span>
          </Link>

          {!isPremium && (
            <Link
              href="/checkout"
              className="flex items-center justify-center gap-1.5 rounded-xl bg-amber-500/15 border border-amber-500/40 px-4 py-3 text-xs font-bold text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 transition-colors w-full sm:w-auto"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Upgrade to Premium</span>
            </Link>
          )}
        </div>
      </div>

      {/* 2. REAL STATS OVERVIEW CARDS (ZERO FAKE DATA) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Body Weight */}
        <div className="rounded-xl border border-card-border bg-card p-5 flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold">Body Weight</span>
            <Scale className="h-4 w-4 text-brand shrink-0" />
          </div>
          {currentWeight !== null ? (
            <>
              <div className="text-2xl font-black text-white">
                {currentWeight} <span className="text-xs font-normal text-zinc-400">kg</span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-1">
                {targetWeight !== null && weightDiff !== null
                  ? `Target: ${targetWeight} kg (${weightDiff > 0 ? `+${weightDiff}` : weightDiff} kg)`
                  : 'Log weight check-ins to track trend'}
              </p>
            </>
          ) : (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-zinc-300">
                Add your body weight to track progress.
              </p>
              <Link href="/profile" className="text-[11px] font-bold text-brand hover:underline inline-block">
                Update in Profile →
              </Link>
            </div>
          )}
        </div>

        {/* Metric 2: Consistency Streak */}
        <div className="rounded-xl border border-card-border bg-card p-5 flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold">Consistency Streak</span>
            <Flame className="h-4 w-4 text-orange-400 shrink-0" />
          </div>
          {streak.hasWorkouts && streak.currentStreak !== null ? (
            <>
              <div className="text-2xl font-black text-white">
                {streak.currentStreak}{' '}
                <span className="text-xs font-normal text-zinc-400">
                  {streak.currentStreak === 1 ? 'day' : 'days'}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-1">
                {streak.workoutsThisWeek}{' '}
                {streak.workoutsThisWeek === 1 ? 'session' : 'sessions'} logged this week
                {streak.longestStreak && streak.longestStreak > streak.currentStreak
                  ? ` • Best: ${streak.longestStreak}d`
                  : ''}
              </p>
            </>
          ) : (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-zinc-300">No workouts logged yet.</p>
              <Link href="/workout-tracker" className="text-[11px] font-bold text-brand hover:underline inline-block">
                Log your first workout →
              </Link>
            </div>
          )}
        </div>

        {/* Metric 3: Readiness Score */}
        <div className="rounded-xl border border-card-border bg-card p-5 flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold">Readiness Score</span>
            <HeartPulse className="h-4 w-4 text-emerald-400 shrink-0" />
          </div>
          {latestRec ? (
            <>
              <div className="text-2xl font-black text-emerald-400">
                {latestRec.recovery_score_pct}%
              </div>
              <p className="text-[11px] text-zinc-400 mt-1 capitalize">
                Status:{' '}
                <span className="text-emerald-400 font-semibold">
                  {String(latestRec.readiness_status || 'logged').replace(/_/g, ' ')}
                </span>
              </p>
            </>
          ) : (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-zinc-300">
                Not enough data to calculate readiness.
              </p>
              <Link href="/recovery" className="text-[11px] font-bold text-brand hover:underline inline-block">
                Log recovery check-in →
              </Link>
            </div>
          )}
        </div>

        {/* Metric 4: Sleep Duration */}
        <div className="rounded-xl border border-card-border bg-card p-5 flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold">Sleep Duration</span>
            <Activity className="h-4 w-4 text-blue-400 shrink-0" />
          </div>
          {latestSleep ? (
            <>
              <div className="text-2xl font-black text-white">
                {latestSleep.sleep_hours}{' '}
                <span className="text-xs font-normal text-zinc-400">hrs</span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-1">
                {latestSleep.sleep_quality
                  ? `Quality: ${latestSleep.sleep_quality} / 5 stars`
                  : `Logged ${latestSleep.log_date || ''}`}
              </p>
            </>
          ) : (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-zinc-300">Log your sleep to see insights.</p>
              <Link href="/recovery" className="text-[11px] font-bold text-brand hover:underline inline-block">
                Log tonight&apos;s sleep →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* 3. MAIN DASHBOARD SPLIT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Real Planned Session / Latest Workout & Verified PRs */}
        <div className="lg:col-span-2 space-y-6 min-w-0">
          {/* Active Workout Plan or Clean Empty State */}
          <div className="rounded-2xl border border-card-border bg-card p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div className="min-w-0">
                <span className="text-[11px] font-bold text-brand uppercase tracking-wider">
                  {nextPlannedDay ? 'Next Prescribed Session (From Your Plan)' : 'Training Session'}
                </span>
                <h3 className="text-base sm:text-lg font-bold text-white break-words">
                  {nextPlannedDay
                    ? nextPlannedDay.day_title
                    : latestWorkout
                    ? `Last Logged: ${latestWorkout.name}`
                    : 'No Active Workout Split Yet'}
                </h3>
              </div>
              <Link
                href="/workout-planner"
                className="text-xs font-semibold text-brand hover:underline flex items-center gap-1 shrink-0"
              >
                <span>Open AI Planner</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {nextPlannedDay && Array.isArray(nextPlannedDay.exercises) && nextPlannedDay.exercises.length > 0 ? (
              <div className="space-y-2.5 mb-5">
                {nextPlannedDay.exercises.map((ex: any, i: number) => (
                  <div
                    key={i}
                    className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80 text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-zinc-800 text-[11px] font-mono font-bold text-brand">
                        0{i + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="font-bold text-white break-words">{ex.exercise_name}</p>
                        <p className="text-[11px] text-zinc-400">{ex.target_muscle}</p>
                      </div>
                    </div>
                    <div className="text-left sm:text-right shrink-0">
                      <span className="font-mono text-zinc-200 font-semibold">
                        {ex.sets} sets × {ex.reps}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : latestWorkout ? (
              <div className="rounded-xl bg-zinc-900/60 border border-zinc-800/80 p-4 mb-5 space-y-2 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-zinc-400">
                    Date:{' '}
                    <strong className="text-white">
                      {latestWorkout.completed_at
                        ? new Date(latestWorkout.completed_at).toLocaleDateString()
                        : 'Recent'}
                    </strong>
                  </span>
                  <span className="font-mono font-bold text-brand">
                    Volume: {Math.round(Number(latestWorkout.total_volume_kg) || 0).toLocaleString()} kg
                  </span>
                </div>
                <p className="text-zinc-400">
                  Exercises logged: {Array.isArray(latestWorkout.exercises) ? latestWorkout.exercises.length : 0}
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 p-6 mb-5 text-center space-y-2">
                <Calendar className="h-7 w-7 text-zinc-600 mx-auto" />
                <p className="text-xs font-semibold text-zinc-300">No workouts logged yet.</p>
                <p className="text-[11px] text-zinc-400 max-w-md mx-auto">
                  Start logging sets in the Workout Tracker or generate a personalized split synced with your Profile.
                </p>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-zinc-800/60">
              <span className="text-xs text-zinc-400">
                {streak.hasWorkouts
                  ? `${streak.totalWorkouts} total ${streak.totalWorkouts === 1 ? 'workout' : 'workouts'} recorded`
                  : 'Ready for your first session'}
              </span>
              <Link
                href="/workout-tracker"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand text-xs font-bold text-black hover:bg-brand-400 transition-colors shadow-glow strap-primary"
              >
                <span>Launch Workout Tracker</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* Personal Records Highlight — REAL RECORDS ONLY */}
          <div className="rounded-2xl border border-card-border bg-card p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Award className="h-5 w-5 text-brand shrink-0" />
                <span>Verified Personal Records (1RM)</span>
              </h3>
              <Link href="/analytics" className="text-xs text-brand hover:underline">
                View Analytics →
              </Link>
            </div>

            {real1RMPrs.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {real1RMPrs.map((pr, i) => (
                  <div key={pr.id || i} className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 text-center min-w-0">
                    <span className="text-[11px] text-zinc-400 block truncate" title={pr.exercise_name}>
                      {pr.exercise_name}
                    </span>
                    <span className="text-base font-black text-white mt-0.5 block font-mono">
                      {Math.round(Number(pr.value) * 10) / 10} kg
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {pr.achieved_at || ''}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 p-6 text-center space-y-1.5">
                <p className="text-xs font-semibold text-zinc-300">No personal records logged yet.</p>
                <p className="text-[11px] text-zinc-400">
                  Complete weighted sets in the Workout Tracker and STRAP will automatically verify your 1RM PRs.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1 Col): STRAP Coach, Real Macro Targets & Shortcuts */}
        <div className="space-y-6 min-w-0">
          {/* STRAP Coach Card — Grounded Only in Real Data */}
          <div className="relative rounded-2xl border border-brand/30 bg-card p-5 sm:p-6 shadow-glow">
            <div className="flex items-center gap-2 text-xs font-bold text-brand mb-3">
              <Bot className="h-4 w-4" />
              <span>STRAP Coach</span>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-zinc-300 leading-relaxed">
                {streak.hasWorkouts
                  ? `You have logged ${streak.totalWorkouts} ${streak.totalWorkouts === 1 ? 'workout' : 'workouts'} (${streak.workoutsThisWeek} this week)${
                      latestRec ? ` with a ${latestRec.recovery_score_pct}% readiness score` : ''
                    }. Ask STRAP Coach for progression cues, split adjustments, or nutrition feedback.`
                  : 'Log your biometrics and first workout, or ask STRAP Coach any question about training splits, exercise technique, nutrition, or recovery.'}
              </p>
              <Link
                href="/ai-assistant"
                className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-brand text-xs font-bold text-black shadow-glow strap-primary"
              >
                <span>Open STRAP Coach</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* Daily Calorie & Macro Target — REAL CALCULATED OR EMPTY STATE */}
          <div className="rounded-2xl border border-card-border bg-card p-5 sm:p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-brand" />
                Daily Calorie &amp; Macro Target
              </span>
            </div>

            {realNutritionTargets ? (
              <div className="space-y-3">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-2xl font-black text-white">
                    {Math.round(Number(realNutritionTargets.target_calories)).toLocaleString()}
                    <span className="text-xs font-normal text-zinc-400 ml-1">kcal</span>
                  </span>
                  <span className="text-[11px] text-brand font-semibold">
                    {profile?.custom_nutrition_targets ? 'Custom Target' : 'Profile Calculated'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800">
                    <span className="text-[10px] text-zinc-400 block">Protein</span>
                    <strong className="text-white">{Math.round(Number(realNutritionTargets.protein_g))}g</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800">
                    <span className="text-[10px] text-zinc-400 block">Carbs</span>
                    <strong className="text-white">{Math.round(Number(realNutritionTargets.carbs_g))}g</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800">
                    <span className="text-[10px] text-zinc-400 block">Fats</span>
                    <strong className="text-white">{Math.round(Number(realNutritionTargets.fats_g))}g</strong>
                  </div>
                </div>
                <Link href="/nutrition" className="text-[11px] text-brand hover:underline block text-right pt-1">
                  Open Nutrition &amp; Supplement Diary →
                </Link>
              </div>
            ) : (
              <div className="space-y-2.5 text-xs">
                <p className="text-zinc-400 leading-relaxed">
                  Add your age, height, and body weight in Profile to calculate personalized daily calorie and macro targets.
                </p>
                <Link
                  href="/profile"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-brand hover:underline"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  <span>Complete Biometrics in Profile →</span>
                </Link>
              </div>
            )}
          </div>

          {/* Quick Nav Tools */}
          <div className="rounded-2xl border border-card-border bg-card p-4 space-y-1">
            <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider px-2 block mb-1">
              Quick Shortcuts
            </span>
            <Link
              href="/exercise-library"
              className="flex items-center justify-between p-2.5 rounded-lg text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Dumbbell className="h-4 w-4 text-brand" />
                <span>Exercise Library (12 Categories)</span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-zinc-500" />
            </Link>
            <Link
              href="/recovery"
              className="flex items-center justify-between p-2.5 rounded-lg text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors"
            >
              <div className="flex items-center gap-2">
                <HeartPulse className="h-4 w-4 text-emerald-400" />
                <span>Log Sleep &amp; Fatigue</span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-zinc-500" />
            </Link>
            <Link
              href="/profile"
              className="flex items-center justify-between p-2.5 rounded-lg text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Scale className="h-4 w-4 text-blue-400" />
                <span>Update Profile &amp; Biometrics</span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-zinc-500" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
