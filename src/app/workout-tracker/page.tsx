'use client';

import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Plus,
  Trash2,
  Check,
  Dumbbell,
  Clock,
  Sparkles,
  Flame,
  Award,
  Lock,
  ArrowRight,
  Save,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import PremiumModal from '@/components/PremiumModal';

interface WorkoutSet {
  set_number: number;
  weight_kg: number;
  reps: number;
  is_completed: boolean;
  rpe?: number;
}

interface WorkoutExercise {
  exercise_name: string;
  target_muscle: string;
  rest_seconds: number;
  sets: WorkoutSet[];
}

export default function WorkoutTrackerPage() {
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  // Active Workout State
  const [workoutName, setWorkoutName] = useState('Upper Power & Hypertrophy');
  const [splitType, setSplitType] = useState('Upper / Lower');
  const [exercises, setExercises] = useState<WorkoutExercise[]>([
    {
      exercise_name: 'Barbell Bench Press',
      target_muscle: 'Chest',
      rest_seconds: 120,
      sets: [
        { set_number: 1, weight_kg: 80, reps: 8, is_completed: true, rpe: 8 },
        { set_number: 2, weight_kg: 80, reps: 8, is_completed: true, rpe: 8 },
        { set_number: 3, weight_kg: 82.5, reps: 7, is_completed: false, rpe: 9 },
        { set_number: 4, weight_kg: 82.5, reps: 6, is_completed: false, rpe: 9 },
      ],
    },
    {
      exercise_name: 'Bent-Over Barbell Row',
      target_muscle: 'Back (Lats)',
      rest_seconds: 90,
      sets: [
        { set_number: 1, weight_kg: 70, reps: 10, is_completed: false, rpe: 8 },
        { set_number: 2, weight_kg: 70, reps: 10, is_completed: false, rpe: 8 },
        { set_number: 3, weight_kg: 75, reps: 8, is_completed: false, rpe: 8.5 },
      ],
    },
    {
      exercise_name: 'Incline Dumbbell Press',
      target_muscle: 'Upper Chest',
      rest_seconds: 90,
      sets: [
        { set_number: 1, weight_kg: 28, reps: 10, is_completed: false, rpe: 8 },
        { set_number: 2, weight_kg: 28, reps: 10, is_completed: false, rpe: 8.5 },
        { set_number: 3, weight_kg: 28, reps: 9, is_completed: false, rpe: 9 },
      ],
    },
  ]);

  // Rest Timer State
  const [timerSeconds, setTimerSeconds] = useState(90);
  const [timerActive, setTimerActive] = useState(false);

  // Completion results
  const [finishing, setFinishing] = useState(false);
  const [completedSummary, setCompletedSummary] = useState<any | null>(null);

  useEffect(() => {
    fetch('/api/user/subscription')
      .then((r) => r.json())
      .then((data) => {
        setIsPremium(data.isPremium);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Timer Tick
  useEffect(() => {
    let interval: any = null;
    if (timerActive && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev - 1);
      }, 1000);
    } else if (timerSeconds === 0) {
      setTimerActive(false);
    }
    return () => clearInterval(interval);
  }, [timerActive, timerSeconds]);

  const startTimer = (seconds: number) => {
    setTimerSeconds(seconds);
    setTimerActive(true);
  };

  const handleToggleSet = (exIdx: number, setIdx: number) => {
    setExercises((prev) => {
      const copy = [...prev];
      const s = copy[exIdx].sets[setIdx];
      s.is_completed = !s.is_completed;
      if (s.is_completed) {
        startTimer(copy[exIdx].rest_seconds || 90);
      }
      return copy;
    });
  };

  const handleUpdateSet = (exIdx: number, setIdx: number, field: 'weight_kg' | 'reps', val: number) => {
    setExercises((prev) => {
      const copy = [...prev];
      (copy[exIdx].sets[setIdx] as any)[field] = val;
      return copy;
    });
  };

  const handleAddSet = (exIdx: number) => {
    setExercises((prev) => {
      const copy = [...prev];
      const last = copy[exIdx].sets[copy[exIdx].sets.length - 1];
      copy[exIdx].sets.push({
        set_number: copy[exIdx].sets.length + 1,
        weight_kg: last?.weight_kg || 50,
        reps: last?.reps || 10,
        is_completed: false,
      });
      return copy;
    });
  };

  const handleFinishWorkout = async () => {
    setFinishing(true);
    try {
      const res = await fetch('/api/workouts/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: workoutName,
          split_type: splitType,
          exercises,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to log workout');

      setCompletedSummary(data);

      // Launch celebration confetti
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#bef264', '#a3e635', '#ffffff'],
        });
      } catch (e) {}
    } catch (err: any) {
      alert(err.message);
    } finally {
      setFinishing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-DEFAULT border-t-transparent" />
      </div>
    );
  }

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
            Live Gym Workout Logger & PR Tracker
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto leading-relaxed mb-6">
            Track active sets, weights, reps, rest intervals, and calculate total training volume in real-time. Automatically feeds into your weekly Gemini adaptation algorithm.
          </p>
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

  // If completed summary exists
  if (completedSummary) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-brand-DEFAULT/40 bg-card p-8 text-center shadow-glow-lg">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-DEFAULT/20 border border-brand-DEFAULT text-brand-DEFAULT mx-auto mb-4 shadow-glow">
            <Award className="h-8 w-8" />
          </div>

          <span className="text-xs font-bold uppercase tracking-widest text-brand-DEFAULT">Workout Logged</span>
          <h1 className="text-2xl sm:text-3xl font-black text-white mt-1 mb-2">
            Exceptional Work! Session Recorded.
          </h1>
          <p className="text-xs text-zinc-400 max-w-md mx-auto mb-6">
            Your performance telemetry has been recorded to your database profile and queued for the weekly Gemini AI adaptation engine.
          </p>

          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto p-4 rounded-2xl bg-zinc-950 border border-zinc-800 text-left mb-6">
            <div>
              <span className="text-[10px] text-zinc-500 uppercase font-semibold">Total Session Volume</span>
              <div className="text-2xl font-black text-white">
                {completedSummary.totalVolumeKg?.toLocaleString()} <span className="text-xs font-normal text-zinc-400">kg</span>
              </div>
            </div>
            <div>
              <span className="text-[10px] text-zinc-500 uppercase font-semibold">Exercises Logged</span>
              <div className="text-2xl font-black text-brand-DEFAULT">
                {exercises.length} <span className="text-xs font-normal text-zinc-400">Movements</span>
              </div>
            </div>
          </div>

          {completedSummary.newPrs?.length > 0 && (
            <div className="mb-6 p-4 rounded-2xl bg-brand-DEFAULT/10 border border-brand-DEFAULT/30 text-left max-w-md mx-auto">
              <span className="text-xs font-bold text-brand-DEFAULT flex items-center gap-1.5 mb-2">
                <Sparkles className="h-4 w-4" />
                <span>New Personal Record Achieved!</span>
              </span>
              {completedSummary.newPrs.map((pr: any, i: number) => (
                <p key={i} className="text-xs text-white">
                  <strong>{pr.exercise}</strong>: {pr.weight} kg × {pr.reps} reps (Estimated 1RM: {pr.estimated1RM} kg)
                </p>
              ))}
            </div>
          )}

          <div className="flex items-center justify-center gap-3">
            <a
              href="/dashboard"
              className="px-6 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-xs font-bold text-white hover:bg-zinc-800 transition-colors"
            >
              Athlete Dashboard
            </a>
            <a
              href="/analytics"
              className="px-6 py-2.5 rounded-xl bg-brand-DEFAULT text-xs font-bold text-black hover:bg-brand-400 transition-colors shadow-glow strap-primary"
            >
              View Analytics
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Top Banner & Rest Timer Bar */}
      <div className="rounded-2xl border border-card-border bg-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-glow">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-brand-DEFAULT bg-brand-DEFAULT/10 border border-brand-DEFAULT/20 px-2.5 py-0.5 rounded-full">
            Active Session Telemetry
          </span>
          <h1 className="text-2xl font-black text-white mt-1">{workoutName}</h1>
          <p className="text-xs text-zinc-400">Split: {splitType} • Record loads in real-time</p>
        </div>

        {/* REST TIMER COMPONENT */}
        <div className="flex items-center gap-4 bg-zinc-950/90 border border-zinc-800 p-3 rounded-2xl">
          <div className="flex items-center gap-2">
            <Clock className={`h-5 w-5 ${timerActive ? 'text-brand-DEFAULT animate-pulse' : 'text-zinc-500'}`} />
            <div>
              <span className="text-[10px] text-zinc-400 font-semibold block uppercase">Rest Timer</span>
              <span className="text-xl font-mono font-black text-white">
                {Math.floor(timerSeconds / 60)}:{(timerSeconds % 60).toString().padStart(2, '0')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setTimerActive(!timerActive)}
              className="p-2 rounded-lg bg-zinc-900 text-zinc-200 hover:text-white hover:bg-zinc-800"
            >
              {timerActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
            <button
              onClick={() => {
                setTimerActive(false);
                setTimerSeconds(90);
              }}
              className="p-2 rounded-lg bg-zinc-900 text-zinc-400 hover:text-white"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-1 pl-2 border-l border-zinc-800 text-[10px] font-mono">
            <button onClick={() => startTimer(60)} className="px-2 py-1 rounded bg-zinc-900 text-zinc-400 hover:text-white">60s</button>
            <button onClick={() => startTimer(90)} className="px-2 py-1 rounded bg-zinc-900 text-zinc-400 hover:text-white">90s</button>
            <button onClick={() => startTimer(120)} className="px-2 py-1 rounded bg-zinc-900 text-zinc-400 hover:text-white">120s</button>
          </div>
        </div>
      </div>

      {/* Exercises & Set Tracking */}
      <div className="space-y-6">
        {exercises.map((ex, exIdx) => (
          <div key={exIdx} className="rounded-2xl border border-card-border bg-card p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-DEFAULT text-black font-black text-xs">
                    {exIdx + 1}
                  </span>
                  {ex.exercise_name}
                </h3>
                <span className="text-[11px] text-zinc-400">Target: {ex.target_muscle}</span>
              </div>

              <span className="text-xs font-mono text-brand-DEFAULT">
                Rest: {ex.rest_seconds}s
              </span>
            </div>

            {/* Set Table */}
            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider px-2">
                <span className="col-span-2">Set</span>
                <span className="col-span-4">Weight (kg)</span>
                <span className="col-span-4">Reps Performed</span>
                <span className="col-span-2 text-right">Done</span>
              </div>

              {ex.sets.map((set, setIdx) => (
                <div
                  key={setIdx}
                  className={`grid grid-cols-12 gap-2 items-center p-2.5 rounded-xl border transition-colors ${
                    set.is_completed
                      ? 'border-brand-DEFAULT/30 bg-brand-DEFAULT/5'
                      : 'border-zinc-800 bg-zinc-950/70'
                  }`}
                >
                  <span className="col-span-2 font-mono text-xs font-bold text-zinc-300">
                    #{set.set_number}
                  </span>

                  <div className="col-span-4">
                    <input
                      type="number"
                      step="0.5"
                      value={set.weight_kg}
                      onChange={(e) => handleUpdateSet(exIdx, setIdx, 'weight_kg', Number(e.target.value))}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs font-mono text-white text-center"
                    />
                  </div>

                  <div className="col-span-4">
                    <input
                      type="number"
                      value={set.reps}
                      onChange={(e) => handleUpdateSet(exIdx, setIdx, 'reps', Number(e.target.value))}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs font-mono text-white text-center"
                    />
                  </div>

                  <div className="col-span-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleToggleSet(exIdx, setIdx)}
                      className={`h-7 w-7 rounded-lg flex items-center justify-center transition-colors ${
                        set.is_completed
                          ? 'bg-brand-DEFAULT text-black shadow-glow'
                          : 'bg-zinc-800 text-zinc-500 hover:text-white'
                      }`}
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => handleAddSet(exIdx)}
              className="flex items-center gap-1.5 text-xs font-semibold text-brand-DEFAULT hover:underline pt-1"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Set</span>
            </button>
          </div>
        ))}
      </div>

      {/* Finish Session CTA */}
      <div className="pt-4 flex items-center justify-between border-t border-zinc-800">
        <span className="text-xs text-zinc-400">
          Ensure all completed sets are checked before submitting.
        </span>

        <button
          onClick={handleFinishWorkout}
          disabled={finishing}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-DEFAULT text-xs font-extrabold text-black hover:bg-brand-400 transition-all shadow-glow hover:scale-105 disabled:opacity-50 strap-primary"
        >
          <Save className="h-4 w-4" />
          <span>{finishing ? 'Recording Session...' : 'Finish & Save Workout'}</span>
        </button>
      </div>

      <PremiumModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        featureTitle="Live Gym Workout Tracking"
        featureDescription="Log your actual weights and reps set-by-set. Calculate total volume and automatically adapt next week's split."
      />
    </div>
  );
}
