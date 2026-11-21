'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Dumbbell,
  HeartPulse,
  Scale,
  Utensils,
  Moon,
  Target,
  Activity,
} from 'lucide-react';
import HeightInput from '@/components/ui/HeightInput';
import { HeightUnit } from '@/lib/height';

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [heightValid, setHeightValid] = useState(true);

  // Form State
  const [formData, setFormData] = useState({
    // Step 1: Personal
    age: 26,
    gender: 'male',
    height_cm: 175,
    height_unit: 'cm' as HeightUnit,
    current_weight_kg: 72,
    target_weight_kg: 78,
    body_fat_pct: 16,
    chest_cm: 98,
    waist_cm: 80,
    hips_cm: 94,
    arms_cm: 35,

    // Step 2: Fitness & Experience
    training_style: 'muscle_building' as 'powerlifting' | 'muscle_building',
    experience_level: 'intermediate',
    workout_location: 'gym',
    weekly_workout_days: 4,
    workout_duration_mins: 60,
    equipment: ['Barbell', 'Dumbbell', 'Cable', 'Machine'],
    bench_press_kg: 80,
    squat_kg: 100,
    deadlift_kg: 130,
    limitations: '',

    // Step 3: Goals & Diet
    primary_goal: 'muscle_gain',
    diet_preference: 'non_vegetarian',

    // Step 4: Recovery
    sleep_hours_avg: 7.5,
    daily_activity_level: 'moderately_active',
    daily_steps_avg: 8000,
    rest_days_preferred: 3,
  });

  useEffect(() => {
    async function loadExisting() {
      try {
        const [metRes, goalRes] = await Promise.all([
          fetch('/api/user/metrics').then((r) => (r.ok ? r.json() : null)),
          fetch('/api/user/goals').then((r) => (r.ok ? r.json() : null)),
        ]);
        if (metRes?.metrics) {
          const m = metRes.metrics;
          setFormData((prev) => ({
            ...prev,
            age: m.age ?? prev.age,
            gender: m.gender ?? prev.gender,
            height_cm: m.height_cm ?? prev.height_cm,
            height_unit: (m.height_unit || metRes.height_unit || prev.height_unit) as HeightUnit,
            current_weight_kg: m.current_weight_kg ?? prev.current_weight_kg,
            body_fat_pct: m.body_fat_pct ?? prev.body_fat_pct,
            chest_cm: m.chest_cm ?? prev.chest_cm,
            waist_cm: m.waist_cm ?? prev.waist_cm,
            hips_cm: m.hips_cm ?? prev.hips_cm,
            arms_cm: m.arms_cm ?? prev.arms_cm,
            experience_level: m.experience_level ?? prev.experience_level,
            workout_location: m.workout_location ?? prev.workout_location,
            workout_duration_mins: m.workout_duration_mins ?? prev.workout_duration_mins,
            equipment: Array.isArray(m.equipment) && m.equipment.length ? m.equipment : prev.equipment,
            limitations: m.limitations ?? prev.limitations,
            diet_preference: m.diet_preference ?? prev.diet_preference,
            sleep_hours_avg: m.sleep_hours_avg ?? prev.sleep_hours_avg,
            daily_activity_level: m.daily_activity_level ?? prev.daily_activity_level,
            daily_steps_avg: m.daily_steps_avg ?? prev.daily_steps_avg,
            rest_days_preferred: m.rest_days_preferred ?? prev.rest_days_preferred,
          }));
        } else if (metRes?.height_unit) {
          setFormData((prev) => ({ ...prev, height_unit: metRes.height_unit as HeightUnit }));
        }
        if (goalRes?.goal) {
          const g = goalRes.goal;
          setFormData((prev) => ({
            ...prev,
            primary_goal: g.primary_goal ?? prev.primary_goal,
            target_weight_kg: g.target_weight_kg ?? prev.target_weight_kg,
            weekly_workout_days: g.weekly_workout_days ?? prev.weekly_workout_days,
          }));
        }
      } catch {
        // Ignore non-blocking preload error
      }
    }
    loadExisting();
  }, []);

  const handleEquipmentToggle = (item: string) => {
    setFormData((prev) => {
      const exists = prev.equipment.includes(item);
      return {
        ...prev,
        equipment: exists
          ? prev.equipment.filter((e) => e !== item)
          : [...prev.equipment, item],
      };
    });
  };

  const handleFinish = async () => {
    if (!heightValid) {
      setError('Please enter a valid height before completing onboarding.');
      setStep(1);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Save Metrics (height standardized in cm + preferred height_unit)
      const metRes = await fetch('/api/user/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          age: formData.age,
          gender: formData.gender,
          height_cm: formData.height_cm,
          height_unit: formData.height_unit,
          current_weight_kg: formData.current_weight_kg,
          body_fat_pct: formData.body_fat_pct,
          chest_cm: formData.chest_cm,
          waist_cm: formData.waist_cm,
          hips_cm: formData.hips_cm,
          arms_cm: formData.arms_cm,
          experience_level: formData.experience_level,
          workout_location: formData.workout_location,
          workout_duration_mins: formData.workout_duration_mins,
          equipment: formData.equipment,
          strength_levels: {
            bench_press_kg: formData.bench_press_kg,
            squat_kg: formData.squat_kg,
            deadlift_kg: formData.deadlift_kg,
          },
          limitations: formData.limitations,
          diet_preference: formData.diet_preference,
          sleep_hours_avg: formData.sleep_hours_avg,
          daily_activity_level: formData.daily_activity_level,
          daily_steps_avg: formData.daily_steps_avg,
          rest_days_preferred: formData.rest_days_preferred,
        }),
      });
      if (!metRes.ok) {
        const d = await metRes.json().catch(() => null);
        throw new Error(d?.error || 'Failed to save biometric metrics.');
      }

      // 2. Save Goals
      const goalRes = await fetch('/api/user/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primary_goal: formData.primary_goal,
          target_weight_kg: formData.target_weight_kg,
          weekly_workout_days: formData.weekly_workout_days,
        }),
      });
      if (!goalRes.ok) {
        const d = await goalRes.json().catch(() => null);
        throw new Error(d?.error || 'Failed to save fitness goals.');
      }

      // 3. Save Preferred Training Type (Powerlifting vs Muscle Building)
      await fetch('/api/workouts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set_training_style',
          training_style: formData.training_style,
        }),
      }).catch(() => null);

      router.push('/dashboard');
      window.location.href = '/dashboard';
    } catch (err: any) {
      setError(err.message || 'Failed to save onboarding data');
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl rounded-2xl border border-card-border bg-card p-8 shadow-glow">
        {/* Progress Bar & Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-400 mb-2">
            <span className="text-brand font-bold uppercase tracking-wider">
              Step {step} of 4: {step === 1 ? 'Biometrics' : step === 2 ? 'Training & Gear' : step === 3 ? 'Goals & Nutrition' : 'Recovery'}
            </span>
            <span>{step * 25}% Completed</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
            <div
              className="h-full bg-brand transition-all duration-300 shadow-glow"
              style={{ width: `${step * 25}%` }}
            />
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
            {error}
          </div>
        )}

        {/* STEP 1: BIOMETRICS & BODY STATS */}
        {step === 1 && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Scale className="h-5 w-5 text-brand" />
                Personal Biometrics
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Baseline data enables accurate Mifflin-St Jeor metabolic calculations and load formulas.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1">Age</label>
                <input
                  type="number"
                  min={12}
                  max={90}
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: Number(e.target.value) })}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-white focus:border-brand focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1">Gender</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-white focus:border-brand focus:outline-none"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other / Non-binary</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
              </div>

              <HeightInput
                heightCm={formData.height_cm}
                unit={formData.height_unit}
                onChange={(nextHeightCm, nextUnit, isValid) => {
                  setHeightValid(isValid);
                  if (isValid) setError(null);
                  setFormData((prev) => ({
                    ...prev,
                    height_cm: nextHeightCm,
                    height_unit: nextUnit,
                  }));
                }}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1">Current Weight (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.current_weight_kg}
                  onChange={(e) => setFormData({ ...formData, current_weight_kg: Number(e.target.value) })}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-white focus:border-brand focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1">Target Weight (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.target_weight_kg}
                  onChange={(e) => setFormData({ ...formData, target_weight_kg: Number(e.target.value) })}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-white focus:border-brand focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1">Body Fat % (optional)</label>
                <input
                  type="number"
                  step="0.5"
                  value={formData.body_fat_pct}
                  onChange={(e) => setFormData({ ...formData, body_fat_pct: Number(e.target.value) })}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-white focus:border-brand focus:outline-none"
                />
              </div>
            </div>

            {/* Circumference measurements */}
            <div className="pt-2">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">
                Circumference Measurements (cm, optional)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-400">Chest</label>
                  <input
                    type="number"
                    value={formData.chest_cm}
                    onChange={(e) => setFormData({ ...formData, chest_cm: Number(e.target.value) })}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950 p-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400">Waist</label>
                  <input
                    type="number"
                    value={formData.waist_cm}
                    onChange={(e) => setFormData({ ...formData, waist_cm: Number(e.target.value) })}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950 p-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400">Hips</label>
                  <input
                    type="number"
                    value={formData.hips_cm}
                    onChange={(e) => setFormData({ ...formData, hips_cm: Number(e.target.value) })}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950 p-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400">Arms</label>
                  <input
                    type="number"
                    value={formData.arms_cm}
                    onChange={(e) => setFormData({ ...formData, arms_cm: Number(e.target.value) })}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950 p-2 text-xs text-white"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: FITNESS & EQUIPMENT */}
        {step === 2 && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Dumbbell className="h-5 w-5 text-brand" />
                Training Profile &amp; Gear
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                STRAP will configure your workout tracker and split recommendations for your training style and equipment.
              </p>
            </div>

            {/* Preferred Training Type */}
            <div>
              <label className="block text-[11px] font-semibold text-zinc-300 mb-2">
                Preferred Training Type
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, training_style: 'muscle_building' })}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    formData.training_style === 'muscle_building'
                      ? 'border-brand bg-brand/15 text-white shadow-glow'
                      : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white'
                  }`}
                >
                  <div className="text-xs font-extrabold text-white flex items-center justify-between">
                    <span>Muscle Building (Hypertrophy)</span>
                    {formData.training_style === 'muscle_building' && (
                      <CheckCircle2 className="h-4 w-4 text-brand" />
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-400 mt-1">
                    PPL, Upper/Lower &amp; Bro Splits • Muscular volume, isolation &amp; hypertrophy rep ranges.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, training_style: 'powerlifting' })}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    formData.training_style === 'powerlifting'
                      ? 'border-brand bg-brand/15 text-white shadow-glow'
                      : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white'
                  }`}
                >
                  <div className="text-xs font-extrabold text-white flex items-center justify-between">
                    <span>Powerlifting (SBD Strength)</span>
                    {formData.training_style === 'powerlifting' && (
                      <CheckCircle2 className="h-4 w-4 text-brand" />
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-400 mt-1">
                    Squat, Bench &amp; Deadlift variations • %1RM, RPE/RIR &amp; periodization blocks.
                  </p>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1">Experience Level</label>
                <select
                  value={formData.experience_level}
                  onChange={(e) => setFormData({ ...formData, experience_level: e.target.value })}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-white focus:border-brand focus:outline-none"
                >
                  <option value="beginner">Beginner (&lt; 1 year consistent lifting)</option>
                  <option value="intermediate">Intermediate (1 - 3 years training)</option>
                  <option value="advanced">Advanced (3+ years structured training)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1">Primary Workout Location</label>
                <select
                  value={formData.workout_location}
                  onChange={(e) => setFormData({ ...formData, workout_location: e.target.value })}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-white focus:border-brand focus:outline-none"
                >
                  <option value="gym">Commercial Gym (Full Equipment)</option>
                  <option value="home">Home Gym (Dumbbells / Bodyweight)</option>
                  <option value="hybrid">Hybrid (Gym + Home mix)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                  Available Training Days per Week: {formData.weekly_workout_days} days
                </label>
                <input
                  type="range"
                  min={2}
                  max={6}
                  value={formData.weekly_workout_days}
                  onChange={(e) => setFormData({ ...formData, weekly_workout_days: Number(e.target.value) })}
                  className="w-full accent-brand cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-zinc-500 font-mono mt-1">
                  <span>2 days</span>
                  <span>3 days</span>
                  <span>4 days</span>
                  <span>5 days</span>
                  <span>6 days</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1">Target Workout Duration</label>
                <select
                  value={formData.workout_duration_mins}
                  onChange={(e) => setFormData({ ...formData, workout_duration_mins: Number(e.target.value) })}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-white focus:border-brand focus:outline-none"
                >
                  <option value={45}>45 Minutes (Express)</option>
                  <option value={60}>60 Minutes (Standard)</option>
                  <option value={75}>75 Minutes (Comprehensive)</option>
                  <option value={90}>90 Minutes (High-Volume)</option>
                </select>
              </div>
            </div>

            {/* Equipment Checklist */}
            <div>
              <label className="block text-[11px] font-semibold text-zinc-300 mb-2">Available Equipment</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {['Barbell', 'Dumbbell', 'Cable', 'Machine', 'Bodyweight', 'Resistance Band', 'Kettlebell'].map((eq) => {
                  const checked = formData.equipment.includes(eq);
                  return (
                    <button
                      type="button"
                      key={eq}
                      onClick={() => handleEquipmentToggle(eq)}
                      className={`p-2.5 rounded-xl border text-xs font-semibold text-left flex items-center justify-between transition-colors ${
                        checked
                          ? 'border-brand bg-brand/10 text-brand'
                          : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white'
                      }`}
                    >
                      <span>{eq}</span>
                      {checked && <CheckCircle2 className="h-3.5 w-3.5 text-brand" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Limitations */}
            <div>
              <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                Exercise Limitations or Injuries (optional)
              </label>
              <input
                type="text"
                value={formData.limitations}
                onChange={(e) => setFormData({ ...formData, limitations: e.target.value })}
                placeholder="e.g. Mild lower back tightness, avoided deep squats in the past"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-white placeholder-zinc-500 focus:border-brand focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* STEP 3: GOALS & NUTRITION */}
        {step === 3 && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Target className="h-5 w-5 text-brand" />
                Fitness Goals & Nutrition Preferences
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Calculates your maintenance calories, target caloric balance, and macronutrient split.
              </p>
            </div>

            {/* Goal Grid */}
            <div>
              <label className="block text-[11px] font-semibold text-zinc-300 mb-2">Primary Fitness Goal</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  { id: 'fat_loss', name: 'Fat Loss', desc: 'Caloric deficit preserving lean muscle mass' },
                  { id: 'muscle_gain', name: 'Muscle Gain (Hypertrophy)', desc: 'Controlled caloric surplus maximizing muscle protein synthesis' },
                  { id: 'recomposition', name: 'Body Recomposition', desc: 'Simultaneous fat loss and muscle accrual' },
                  { id: 'strength', name: 'Maximal Strength', desc: 'Neuromuscular efficiency and 1RM optimization' },
                  { id: 'general_fitness', name: 'General Health & Fitness', desc: 'Cardiovascular health, mobility, and functional strength' },
                  { id: 'endurance', name: 'Muscular Endurance', desc: 'High-rep stamina and work capacity' },
                ].map((g) => {
                  const isSelected = formData.primary_goal === g.id;
                  return (
                    <button
                      type="button"
                      key={g.id}
                      onClick={() => setFormData({ ...formData, primary_goal: g.id })}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'border-brand bg-brand/10 text-white shadow-glow'
                          : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">{g.name}</span>
                        {isSelected && <CheckCircle2 className="h-4 w-4 text-brand" />}
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-1 leading-snug">{g.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Diet preference */}
            <div>
              <label className="block text-[11px] font-semibold text-zinc-300 mb-2">Dietary Pattern</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'non_vegetarian', name: 'Non-Vegetarian' },
                  { id: 'vegetarian', name: 'Vegetarian' },
                  { id: 'eggetarian', name: 'Eggetarian' },
                  { id: 'vegan', name: 'Vegan' },
                ].map((d) => (
                  <button
                    type="button"
                    key={d.id}
                    onClick={() => setFormData({ ...formData, diet_preference: d.id })}
                    className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition-colors ${
                      formData.diet_preference === d.id
                        ? 'border-brand bg-brand/10 text-brand font-bold'
                        : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {d.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: RECOVERY & REST */}
        {step === 4 && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Moon className="h-5 w-5 text-brand" />
                Sleep & Autonomic Recovery
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Recovery is where muscle adaptation happens. STRAP integrates your sleep to govern workout volume.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                  Average Nightly Sleep: {formData.sleep_hours_avg} Hours
                </label>
                <input
                  type="range"
                  min={5}
                  max={10}
                  step={0.5}
                  value={formData.sleep_hours_avg}
                  onChange={(e) => setFormData({ ...formData, sleep_hours_avg: Number(e.target.value) })}
                  className="w-full accent-brand cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-zinc-500 font-mono mt-1">
                  <span>5h (Deficit)</span>
                  <span>7.5h (Optimal)</span>
                  <span>10h (High)</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1">Daily Activity Level</label>
                <select
                  value={formData.daily_activity_level}
                  onChange={(e) => setFormData({ ...formData, daily_activity_level: e.target.value })}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-white focus:border-brand focus:outline-none"
                >
                  <option value="sedentary">Sedentary (Desk Job, &lt; 5k steps)</option>
                  <option value="lightly_active">Lightly Active (5k - 8k steps)</option>
                  <option value="moderately_active">Moderately Active (8k - 12k steps)</option>
                  <option value="very_active">Very Active (Physical job or 12k+ steps)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1">Average Daily Steps</label>
                <input
                  type="number"
                  step={500}
                  value={formData.daily_steps_avg}
                  onChange={(e) => setFormData({ ...formData, daily_steps_avg: Number(e.target.value) })}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-white focus:border-brand focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1">Preferred Rest Days / Week</label>
                <select
                  value={formData.rest_days_preferred}
                  onChange={(e) => setFormData({ ...formData, rest_days_preferred: Number(e.target.value) })}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-white focus:border-brand focus:outline-none"
                >
                  <option value={1}>1 Rest Day (High frequency)</option>
                  <option value={2}>2 Rest Days (Standard 5-day split)</option>
                  <option value={3}>3 Rest Days (Optimal for 4-day Upper/Lower)</option>
                  <option value={4}>4 Rest Days (3-day Full Body)</option>
                </select>
              </div>
            </div>

            {/* Summary card before launch */}
            <div className="rounded-xl border border-brand/30 bg-brand/10 p-4">
              <div className="flex items-center gap-2 text-brand font-bold text-xs mb-1">
                <Sparkles className="h-4 w-4" />
                <span>Ready to Synthesize Your STRAP Architecture</span>
              </div>
              <p className="text-[11px] text-zinc-300 leading-relaxed">
                Clicking Finish will initialize your baseline profile and open your Athlete Dashboard.
              </p>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="mt-8 pt-6 border-t border-zinc-900 flex items-center justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-zinc-800 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Previous</span>
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={() => {
                if (step === 1 && !heightValid) {
                  setError('Please enter a valid height before continuing.');
                  return;
                }
                setError(null);
                setStep(step + 1);
              }}
              className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-brand text-xs font-bold text-black hover:bg-brand-400 transition-all shadow-glow"
            >
              <span>Continue</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              type="button"
              disabled={loading}
              onClick={handleFinish}
              className="flex items-center gap-2 px-8 py-2.5 rounded-xl bg-brand text-xs font-extrabold text-black hover:bg-brand-400 transition-all shadow-glow disabled:opacity-50 strap-primary"
            >
              <span>{loading ? 'Initializing Engine...' : 'Complete Onboarding & Go to Dashboard'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
