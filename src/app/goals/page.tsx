'use client';

import React, { useState, useEffect } from 'react';
import { Target, CheckCircle2, Save, Sparkles } from 'lucide-react';

export default function GoalsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [goal, setGoal] = useState({
    primary_goal: 'muscle_gain',
    target_weight_kg: 80,
    weekly_workout_days: 4,
    target_date: '',
  });

  useEffect(() => {
    fetch('/api/user/goals')
      .then((r) => r.json())
      .then((data) => {
        if (data.goal) setGoal(data.goal);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      await fetch('/api/user/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(goal),
      });
      setMessage('Fitness goals updated! Your AI workout recommendations will adjust accordingly.');
    } catch (err) {
      setMessage('Failed to update goals.');
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

  const goalOptions = [
    { id: 'fat_loss', name: 'Fat Loss', desc: 'Accelerate fat reduction while protecting lean muscle mass' },
    { id: 'muscle_gain', name: 'Muscle Gain (Hypertrophy)', desc: 'Maximal muscle protein synthesis and size' },
    { id: 'recomposition', name: 'Body Recomposition', desc: 'Simultaneous fat reduction and muscle development' },
    { id: 'strength', name: 'Strength Gain', desc: 'Heavy neuromuscular 1RM optimization' },
    { id: 'general_fitness', name: 'General Fitness', desc: 'Cardiovascular endurance, stamina, and mobility' },
    { id: 'endurance', name: 'Muscular Endurance', desc: 'High-rep stamina, work capacity, and conditioning' },
    { id: 'maintenance', name: 'Weight Maintenance', desc: 'Preserve physical conditioning and baseline strength' },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">Fitness Goals & Periodization</h1>
        <p className="text-xs text-zinc-400 mt-1">
          Adjust your target objective to direct the STRAP split generator and nutrition engine.
        </p>
      </div>

      {message && (
        <div className="rounded-xl border border-brand/30 bg-brand/10 p-3.5 text-xs text-brand flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          <span>{message}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Goal Selection Cards */}
        <div className="rounded-2xl border border-card-border bg-card p-6 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Target className="h-4 w-4 text-brand" />
            Select Primary Training Goal
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {goalOptions.map((opt) => {
              const isSelected = goal.primary_goal === opt.id;
              return (
                <button
                  type="button"
                  key={opt.id}
                  onClick={() => setGoal({ ...goal, primary_goal: opt.id })}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'border-brand bg-brand/10 shadow-glow'
                      : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{opt.name}</span>
                    {isSelected && <CheckCircle2 className="h-4 w-4 text-brand" />}
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-1">{opt.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Target Weight & Frequency */}
        <div className="rounded-2xl border border-card-border bg-card p-6 space-y-4">
          <h2 className="text-base font-bold text-white">Target Metrics & Schedule</h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-300 mb-1">Target Weight (kg)</label>
              <input
                type="number"
                step="0.5"
                value={goal.target_weight_kg || ''}
                onChange={(e) => setGoal({ ...goal, target_weight_kg: Number(e.target.value) })}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-white focus:border-brand focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                Workout Days per Week ({goal.weekly_workout_days} Days)
              </label>
              <select
                value={goal.weekly_workout_days}
                onChange={(e) => setGoal({ ...goal, weekly_workout_days: Number(e.target.value) })}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-white focus:border-brand focus:outline-none"
              >
                <option value={2}>2 Days / Week (Full Body Maintenance)</option>
                <option value={3}>3 Days / Week (Full Body Power)</option>
                <option value={4}>4 Days / Week (Upper / Lower Split)</option>
                <option value={5}>5 Days / Week (Upper / Lower / PPL)</option>
                <option value={6}>6 Days / Week (Push Pull Legs 2x)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-300 mb-1">Target Date</label>
              <input
                type="date"
                value={goal.target_date || ''}
                onChange={(e) => setGoal({ ...goal, target_date: e.target.value })}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-white focus:border-brand focus:outline-none"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-brand text-xs font-bold text-black hover:bg-brand-400 transition-all shadow-glow disabled:opacity-50 strap-primary"
        >
          <Save className="h-4 w-4" />
          <span>{saving ? 'Updating...' : 'Save Goals & Re-align Engine'}</span>
        </button>
      </form>
    </div>
  );
}
