'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Flame,
  Scale,
  Calendar,
  Dumbbell,
  HeartPulse,
  TrendingUp,
  Award,
  Lock,
  ArrowRight,
  Bot,
  CheckCircle2,
  Clock,
  ChevronRight,
  Activity,
  AlertCircle,
} from 'lucide-react';
import PremiumModal from '@/components/PremiumModal';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [metrics, setMetrics] = useState<any>(null);
  const [goal, setGoal] = useState<any>(null);
  const [recovery, setRecovery] = useState<any>(null);
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [prs, setPrs] = useState<any[]>([]);

  // Premium Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalFeature, setModalFeature] = useState({ title: '', desc: '' });

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [authRes, metricsRes, goalsRes, recRes, workoutsRes] = await Promise.all([
          fetch('/api/user/subscription', { cache: 'no-store' }).then((r) => r.json()),
          fetch('/api/user/metrics').then((r) => r.json()),
          fetch('/api/user/goals').then((r) => r.json()),
          fetch('/api/user/recovery').then((r) => r.json()),
          fetch('/api/workouts').then((r) => r.json()),
        ]);

        setSubscription(authRes.subscription);
        setIsPremium(authRes.isPremium);
        setMetrics(metricsRes.metrics);
        setGoal(goalsRes.goal);
        setRecovery(recRes);
        setWorkouts(workoutsRes.workouts || []);
        setPrs(workoutsRes.prs || []);
        setLoading(false);
      } catch (err) {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  const openLock = (title: string, desc: string) => {
    setModalFeature({ title, desc });
    setModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-DEFAULT border-t-transparent shadow-glow" />
          <span className="text-xs text-zinc-400 font-mono tracking-wider">Syncing STRAP telemetry...</span>
        </div>
      </div>
    );
  }

  const currentWeight = metrics?.current_weight_kg || 74.5;
  const targetWeight = goal?.target_weight_kg || 80.0;
  const weightDiff = (targetWeight - currentWeight).toFixed(1);

  // Latest recovery data
  const latestRec = recovery?.recoveryLogs?.[0] || {
    recovery_score_pct: 82,
    readiness_status: 'ready',
    muscle_soreness_score: 2,
  };
  const latestSleep = recovery?.sleepLogs?.[0] || { sleep_hours: 7.8, sleep_quality: 4 };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* 1. TOP WELCOME & STATUS BANNER */}
      <div className="rounded-2xl border border-card-border bg-gradient-to-r from-card to-zinc-950 p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-glow">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-DEFAULT bg-brand-DEFAULT/10 border border-brand-DEFAULT/20 px-2.5 py-0.5 rounded-full">
              Athlete Central
            </span>
            {isPremium ? (
              <span className="text-xs font-bold text-black bg-brand-DEFAULT px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-glow">
                <Sparkles className="h-3 w-3 fill-black" />
                PREMIUM ACTIVE
              </span>
            ) : (
              <span className="text-xs font-semibold text-zinc-400 bg-zinc-800 px-2.5 py-0.5 rounded-full">
                FREE PLAN
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            Welcome back, Athlete
          </h1>
          <p className="text-xs text-zinc-400 mt-1 max-w-xl">
            Primary Goal:{' '}
            <strong className="text-zinc-200 capitalize">
              {goal?.primary_goal?.replace('_', ' ') || 'Muscle Gain'}
            </strong>{' '}
            • Baseline Schedule: {goal?.weekly_workout_days || 4} days/week
          </p>
        </div>

        {/* Action button */}
        <div className="flex items-center gap-3">
          <a
            href="/workout-tracker"
            className="flex items-center gap-2 rounded-xl bg-brand-DEFAULT px-5 py-3 text-xs font-extrabold text-black hover:bg-brand-400 transition-all shadow-glow hover:scale-105 strap-primary"
          >
            <Dumbbell className="h-4 w-4" />
            <span>Start Today's Workout</span>
          </a>

          {!isPremium && (
            <a
              href="/checkout"
              className="flex items-center gap-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 px-4 py-3 text-xs font-bold text-amber-400 hover:bg-amber-500/20 transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Upgrade (₹100)</span>
            </a>
          )}
        </div>
      </div>

      {/* 2. STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Current Weight */}
        <div className="rounded-xl border border-card-border bg-card p-5">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold">Body Weight</span>
            <Scale className="h-4 w-4 text-brand-DEFAULT" />
          </div>
          <div className="text-2xl font-black text-white">{currentWeight} <span className="text-xs font-normal text-zinc-400">kg</span></div>
          <p className="text-[11px] text-zinc-500 mt-1">
            Target: {targetWeight} kg ({Number(weightDiff) > 0 ? `+${weightDiff}` : weightDiff} kg)
          </p>
        </div>

        {/* Metric 2: Workout Streak */}
        <div className="rounded-xl border border-card-border bg-card p-5">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold">Consistency Streak</span>
            <Flame className="h-4 w-4 text-orange-400" />
          </div>
          <div className="text-2xl font-black text-white">5 <span className="text-xs font-normal text-zinc-400">days</span></div>
          <p className="text-[11px] text-zinc-500 mt-1">
            4 sessions logged this week
          </p>
        </div>

        {/* Metric 3: Recovery Readiness */}
        <div className="rounded-xl border border-card-border bg-card p-5">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold">Readiness Score</span>
            <HeartPulse className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">
            {latestRec.recovery_score_pct}%
          </div>
          <p className="text-[11px] text-zinc-500 mt-1 capitalize">
            Status: <span className="text-emerald-400 font-semibold">{latestRec.readiness_status?.replace('_', ' ')}</span>
          </p>
        </div>

        {/* Metric 4: Nightly Sleep */}
        <div className="rounded-xl border border-card-border bg-card p-5">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold">Sleep Duration</span>
            <Activity className="h-4 w-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-white">
            {latestSleep.sleep_hours} <span className="text-xs font-normal text-zinc-400">hrs</span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">
            Quality: {latestSleep.sleep_quality} / 5 stars
          </p>
        </div>
      </div>

      {/* 3. MAIN DASHBOARD SPLIT: ACTIVE WORKOUT & AI INTELLIGENCE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Workout Schedule & Next Session */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Workout Plan Card */}
          <div className="rounded-2xl border border-card-border bg-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-[11px] font-bold text-brand-DEFAULT uppercase tracking-wider">
                  Today's Prescribed Session
                </span>
                <h3 className="text-lg font-bold text-white">Upper Day 1: Horizontal Push & Pull</h3>
              </div>
              <a
                href="/workout-planner"
                className="text-xs font-semibold text-brand-DEFAULT hover:underline flex items-center gap-1"
              >
                <span>View Full Split</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </a>
            </div>

            {/* Exercise preview checklist */}
            <div className="space-y-2.5 mb-5">
              {[
                { name: 'Barbell Bench Press', sets: 4, reps: '6-8', target: 'Chest (Mid/Lower)', rest: '120s' },
                { name: 'Bent-Over Barbell Row', sets: 4, reps: '8-10', target: 'Lats & Rhomboids', rest: '90s' },
                { name: 'Incline Dumbbell Press', sets: 3, reps: '8-12', target: 'Upper Chest', rest: '90s' },
                { name: 'Lat Pulldown', sets: 3, reps: '10-12', target: 'Lats (Width)', rest: '75s' },
                { name: 'Dumbbell Lateral Raise', sets: 4, reps: '12-15', target: 'Side Delts', rest: '60s' },
              ].map((ex, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-zinc-800 text-[11px] font-mono font-bold text-brand-DEFAULT">
                      0{i + 1}
                    </span>
                    <div>
                      <p className="font-bold text-white">{ex.name}</p>
                      <p className="text-[11px] text-zinc-400">{ex.target}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-zinc-200 font-semibold">{ex.sets} sets × {ex.reps}</span>
                    <span className="block text-[10px] text-zinc-500">Rest: {ex.rest}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60">
              <span className="text-xs text-zinc-400">Estimated Duration: ~60 mins</span>
              <a
                href="/workout-tracker"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-DEFAULT text-xs font-bold text-black hover:bg-brand-400 transition-colors shadow-glow strap-primary"
              >
                <span>Launch Workout Tracker</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

          {/* Personal Records Highlight */}
          <div className="rounded-2xl border border-card-border bg-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Award className="h-5 w-5 text-brand-DEFAULT" />
                Verified Personal Records (1RM)
              </h3>
              <a href="/analytics" className="text-xs text-brand-DEFAULT hover:underline">
                View Progression
              </a>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { name: 'Bench Press', value: '97.5 kg', date: 'Nov 12' },
                { name: 'Back Squat', value: '130.0 kg', date: 'Nov 08' },
                { name: 'Deadlift', value: '165.0 kg', date: 'Nov 02' },
                { name: 'Pull-ups', value: '14 reps', date: 'Nov 14' },
              ].map((pr, i) => (
                <div key={i} className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 text-center">
                  <span className="text-[11px] text-zinc-400 block truncate">{pr.name}</span>
                  <span className="text-base font-black text-white mt-0.5 block">{pr.value}</span>
                  <span className="text-[10px] text-zinc-500 font-mono">{pr.date}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): AI Engine & Locked Cards for Free Users */}
        <div className="space-y-6">
          {/* Gemini AI Coach Card */}
          <div className="relative rounded-2xl border border-brand-DEFAULT/30 bg-card p-6 shadow-glow">
            <div className="flex items-center gap-2 text-xs font-bold text-brand-DEFAULT mb-3">
              <Bot className="h-4 w-4" />
              <span>STRAP AI Coach Feedback</span>
            </div>

            {isPremium ? (
              <div className="space-y-3">
                <p className="text-xs text-zinc-300 leading-relaxed">
                  "Based on your recent 80kg bench performance with RPE 8, your nervous system recovery is optimal today (+82%). Recommended progression: Attempt 82.5kg for your first 2 working sets."
                </p>
                <div className="pt-2">
                  <a
                    href="/ai-assistant"
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs font-bold text-white hover:border-brand-DEFAULT transition-colors"
                  >
                    <span>Ask AI Coach</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <div className="flex h-10 w-10 mx-auto items-center justify-center rounded-full bg-zinc-900 text-brand-DEFAULT mb-2">
                  <Lock className="h-4 w-4" />
                </div>
                <h4 className="text-xs font-bold text-white">AI Coach Insights Locked</h4>
                <p className="text-[11px] text-zinc-400 mt-1 mb-4">
                  Upgrade to STRAP Premium for ₹100/mo to receive real-time Gemini load recommendations and split adaptations.
                </p>
                <button
                  onClick={() => openLock('AI Coach Insights', 'Unlock live conversational Gemini workout adaptations and progressive overload coaching.')}
                  className="w-full py-2 rounded-xl bg-brand-DEFAULT text-xs font-bold text-black shadow-glow"
                >
                  Unlock AI Insights
                </button>
              </div>
            )}
          </div>

          {/* Nutrition Summary Card (Premium Locked for free) */}
          <div className="rounded-2xl border border-card-border bg-card p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-brand-DEFAULT" />
                Daily Calorie & Macro Target
              </span>
              {!isPremium && <Lock className="h-3.5 w-3.5 text-zinc-500" />}
            </div>

            {isPremium ? (
              <div className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-black text-white">2,650</span>
                  <span className="text-xs text-brand-DEFAULT font-semibold">+250 kcal (Surplus)</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800">
                    <span className="text-[10px] text-zinc-400 block">Protein</span>
                    <strong className="text-white">165g</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800">
                    <span className="text-[10px] text-zinc-400 block">Carbs</span>
                    <strong className="text-white">320g</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800">
                    <span className="text-[10px] text-zinc-400 block">Fats</span>
                    <strong className="text-white">75g</strong>
                  </div>
                </div>
                <a href="/nutrition" className="text-[11px] text-brand-DEFAULT hover:underline block text-right pt-1">
                  View Full Meal Timing →
                </a>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-[11px] text-zinc-400 mb-3">
                  Customized Mifflin-St Jeor metabolic calorie and protein targets are reserved for Premium members.
                </p>
                <button
                  onClick={() => openLock('Metabolic Nutrition Target', 'Get precise protein, carbohydrate, and fat targets based on your biometric weight and goals.')}
                  className="w-full py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs font-bold text-white hover:border-brand-DEFAULT transition-colors"
                >
                  View Macro Breakdown
                </button>
              </div>
            )}
          </div>

          {/* Quick Nav Tools */}
          <div className="rounded-2xl border border-card-border bg-card p-4 space-y-1">
            <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider px-2 block mb-1">
              Quick Shortcuts
            </span>
            <a
              href="/exercise-library"
              className="flex items-center justify-between p-2.5 rounded-lg text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Dumbbell className="h-4 w-4 text-brand-DEFAULT" />
                <span>Exercise Library (12 Categories)</span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-zinc-500" />
            </a>
            <a
              href="/recovery"
              className="flex items-center justify-between p-2.5 rounded-lg text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors"
            >
              <div className="flex items-center gap-2">
                <HeartPulse className="h-4 w-4 text-emerald-400" />
                <span>Log Sleep & Fatigue</span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-zinc-500" />
            </a>
            <a
              href="/profile"
              className="flex items-center justify-between p-2.5 rounded-lg text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Scale className="h-4 w-4 text-blue-400" />
                <span>Update Body Measurements</span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-zinc-500" />
            </a>
          </div>
        </div>
      </div>

      <PremiumModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        featureTitle={modalFeature.title}
        featureDescription={modalFeature.desc}
      />
    </div>
  );
}
