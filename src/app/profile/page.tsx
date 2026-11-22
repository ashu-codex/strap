'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  User,
  Scale,
  Sparkles,
  Check,
  AlertCircle,
  Save,
  Dumbbell,
  Target,
  Flame,
  Link2,
  Unlink,
  Utensils,
  Activity,
  Shield,
  Edit3,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Sliders,
  TrendingUp,
} from 'lucide-react';
import HeightInput from '@/components/ui/HeightInput';
import NumericInput from '@/components/ui/NumericInput';
import CalorieCalculatorPanel from '@/components/profile/CalorieCalculatorPanel';
import GoalProgressCard from '@/components/profile/GoalProgressCard';
import { HeightUnit, cmToFtIn } from '@/lib/height';
import {
  WeightUnit,
  displayWeightValue,
  formatWeight,
  formatWeightDelta,
  lbToKg,
  calculateAgeFromDob,
} from '@/lib/units';
import {
  GOAL_LABELS,
  PersonalizedNutritionPlan,
  CustomNutritionTargets,
} from '@/lib/nutrition-calc';
import { WeightProgressSummary } from '@/lib/weight-progress';
import { createClient as createBrowserClient } from '@/lib/supabase/client';

type SectionKey =
  | 'personal'
  | 'measurements'
  | 'goals'
  | 'training'
  | 'nutrition_prefs'
  | 'activity';

const PRIMARY_GOALS = [
  { id: 'muscle_gain', label: 'Muscle Gain', desc: 'Hypertrophy & modest surplus options' },
  { id: 'fat_loss', label: 'Fat Loss', desc: '4 individualized deficit pace tiers' },
  { id: 'weight_gain', label: 'Weight Gain', desc: 'Structured surplus from TDEE' },
  { id: 'weight_loss', label: 'Weight Loss', desc: 'Safe calorie-deficit pace options' },
  { id: 'recomposition', label: 'Body Recomposition', desc: 'Near-maintenance + high protein' },
  { id: 'maintenance', label: 'Maintain Weight', desc: 'Balanced TDEE without deficit/surplus' },
  { id: 'strength', label: 'Strength Development', desc: 'Performance fueling & recovery' },
  { id: 'general_fitness', label: 'General Fitness', desc: 'Sustainable maintenance nutrition' },
];

const EQUIPMENT_OPTIONS = [
  'Barbell',
  'Dumbbell',
  'Cable',
  'Machine',
  'Bodyweight',
  'Resistance Band',
  'Kettlebell',
  'Pull-Up Bar',
  'Smith Machine',
];

const WORKOUT_SPLITS = [
  { id: 'auto', label: 'Auto' },
  { id: 'full_body', label: 'Full Body' },
  { id: 'upper_lower', label: 'Upper / Lower' },
  { id: 'push_pull_legs', label: 'Push / Pull / Legs (PPL)' },
  { id: 'upper_lower_ppl', label: 'Upper/Lower + PPL' },
  { id: 'bro_split', label: 'Bro Split' },
  { id: 'powerlifting_sbd', label: 'Powerlifting SBD' },
];

const DIET_OPTIONS = [
  { id: 'vegetarian', label: 'Vegetarian' },
  { id: 'eggetarian', label: 'Eggetarian' },
  { id: 'non_vegetarian', label: 'Non-Vegetarian' },
  { id: 'vegan', label: 'Vegan' },
];

function parseCommaList(val: string): string[] {
  return val
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 30);
}

function joinCommaList(arr?: string[] | null): string {
  return Array.isArray(arr) ? arr.join(', ') : '';
}

function formatHeightDisplay(cm: number | null | undefined, unit: HeightUnit): string {
  if (!cm || !Number.isFinite(Number(cm)) || Number(cm) <= 0) return 'Not set';
  if (unit === 'ft_in') {
    const { feet, inches } = cmToFtIn(Number(cm));
    return `${feet} ft ${inches} in (${Math.round(Number(cm))} cm)`;
  }
  return `${Number(cm)} cm`;
}

function SummaryRow({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-[#E5E7EB] dark:border-zinc-800/70 last:border-b-0 text-xs">
      <span className="text-[#52525B] dark:text-zinc-400 shrink-0">{label}</span>
      <span
        className={`font-semibold text-right truncate ${
          accent ? 'text-[#4d7c0f] dark:text-brand font-bold' : 'text-[#111318] dark:text-white'
        }`}
      >
        {value}
      </span>
    </div>
  );
}

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [editing, setEditing] = useState<Record<SectionKey, boolean>>({
    personal: false,
    measurements: false,
    goals: false,
    training: false,
    nutrition_prefs: false,
    activity: false,
  });

  // Collapsible panels for rich interactive controls (keeps default view compact)
  const [showWeightProgress, setShowWeightProgress] = useState(false);
  const [showCaloriePanel, setShowCaloriePanel] = useState(false);

  const [linkingGoogle, setLinkingGoogle] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [heightValid, setHeightValid] = useState(true);

  const [profile, setProfile] = useState<any>(null);
  const [nutritionEngine, setNutritionEngine] = useState<PersonalizedNutritionPlan | null>(null);
  const [weightProgress, setWeightProgress] = useState<WeightProgressSummary | null>(null);
  const [latestSleep, setLatestSleep] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [isPremium, setIsPremium] = useState(false);

  // Per-section drafts
  const [personalDraft, setPersonalDraft] = useState({
    full_name: '',
    age: null as number | null,
    date_of_birth: '',
    gender: '' as string,
    height_unit: 'cm' as HeightUnit,
    weight_unit: 'kg' as WeightUnit,
  });

  const [measDraft, setMeasDraft] = useState({
    weight_display: null as number | null,
    height_cm: 0,
    height_unit: 'cm' as HeightUnit,
    body_fat_percentage: null as number | null,
    chest_cm: null as number | null,
    waist_cm: null as number | null,
    hips_cm: null as number | null,
    arms_cm: null as number | null,
  });

  const [goalsDraft, setGoalsDraft] = useState({
    fitness_goal: 'general_fitness',
    target_weight_display: null as number | null,
    target_date: '',
  });

  const [trainingDraft, setTrainingDraft] = useState({
    weekly_workout_days: 4,
    experience_level: 'intermediate',
    training_style: 'muscle_building' as 'muscle_building' | 'powerlifting' | 'general_fitness',
    preferred_workout_split: 'auto',
    workout_location: 'gym',
    workout_duration_mins: 60 as number | null,
    equipment: [] as string[],
    exercise_preferences: '',
    limitations: '',
  });

  const [nutritionDraft, setNutritionDraft] = useState({
    diet_preference: '' as string,
    food_allergies: '',
    food_restrictions: '',
    preferred_foods: '',
    foods_to_avoid: '',
    meals_per_day: null as number | null,
    daily_calorie_preference: null as number | null,
    protein_target_preference_g: null as number | null,
    nutrition_goal: '',
  });

  const [activityDraft, setActivityDraft] = useState({
    activity_level: 'moderately_active',
    daily_steps_avg: null as number | null,
    activity_notes: '',
    sleep_hours_avg: null as number | null,
  });

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => {
      setToast((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  };

  const hydrateDraftsFromBundle = useCallback((bundle: any) => {
    const p = bundle?.profile;
    if (!p) return;
    const wUnit: WeightUnit = p.weight_unit === 'lb' ? 'lb' : 'kg';
    const hUnit: HeightUnit = p.height_unit === 'ft_in' ? 'ft_in' : 'cm';

    setProfile(p);
    if (bundle.nutritionEngine) setNutritionEngine(bundle.nutritionEngine);
    if (bundle.weightProgress) setWeightProgress(bundle.weightProgress);
    setLatestSleep(bundle.latestSleep ?? null);

    setPersonalDraft({
      full_name: p.full_name || '',
      age: p.age ?? null,
      date_of_birth: p.date_of_birth || '',
      gender: p.gender || '',
      height_unit: hUnit,
      weight_unit: wUnit,
    });

    setMeasDraft({
      weight_display: displayWeightValue(p.weight, wUnit),
      height_cm: p.height ? Number(p.height) : 0,
      height_unit: hUnit,
      body_fat_percentage: p.body_fat_percentage ?? null,
      chest_cm: p.chest_cm ?? null,
      waist_cm: p.waist_cm ?? null,
      hips_cm: p.hips_cm ?? null,
      arms_cm: p.arms_cm ?? null,
    });

    setGoalsDraft({
      fitness_goal: p.primary_goal || 'general_fitness',
      target_weight_display: displayWeightValue(p.target_weight_kg, wUnit),
      target_date: p.target_date || '',
    });

    setTrainingDraft({
      weekly_workout_days: p.weekly_workout_days ?? 4,
      experience_level: p.experience_level || 'intermediate',
      training_style:
        p.training_style === 'powerlifting'
          ? 'powerlifting'
          : p.training_style === 'general_fitness'
          ? 'general_fitness'
          : 'muscle_building',
      preferred_workout_split: p.preferred_workout_split || 'auto',
      workout_location: p.workout_location || 'gym',
      workout_duration_mins: p.workout_duration_mins ?? 60,
      equipment: Array.isArray(p.equipment) ? p.equipment : [],
      exercise_preferences: p.exercise_preferences || '',
      limitations: p.limitations || '',
    });

    const np = p.nutrition_preferences || {};
    setNutritionDraft({
      diet_preference: np.diet_preference || p.dietary_preference || '',
      food_allergies: joinCommaList(np.food_allergies),
      food_restrictions: joinCommaList(np.food_restrictions),
      preferred_foods: joinCommaList(np.preferred_foods),
      foods_to_avoid: joinCommaList(np.foods_to_avoid),
      meals_per_day: np.meals_per_day ?? null,
      daily_calorie_preference: np.daily_calorie_preference ?? null,
      protein_target_preference_g: np.protein_target_preference_g ?? null,
      nutrition_goal: np.nutrition_goal || '',
    });

    setActivityDraft({
      activity_level: p.activity_level || 'moderately_active',
      daily_steps_avg: p.daily_steps_avg ?? null,
      activity_notes: p.activity_notes || '',
      sleep_hours_avg: p.sleep_hours_avg ?? null,
    });
  }, []);

  const loadAll = useCallback(async () => {
    try {
      const [profRes, subRes] = await Promise.all([
        fetch('/api/user/profile', { cache: 'no-store' }).then((r) => r.json()),
        fetch('/api/user/subscription', { cache: 'no-store' }).then((r) => r.json()),
      ]);
      hydrateDraftsFromBundle(profRes);
      setSubscription(subRes.subscription || null);
      setIsPremium(Boolean(subRes.isPremium));
    } catch {
      showToast('Failed to load your profile data. Please refresh.', 'error');
    } finally {
      setLoading(false);
    }
  }, [hydrateDraftsFromBundle]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('linked=google')) {
      showToast('Google account successfully linked to your STRAP profile.');
    }
    loadAll();
  }, [loadAll]);

  const weightUnit: WeightUnit = profile?.weight_unit === 'lb' ? 'lb' : 'kg';
  const heightUnit: HeightUnit = profile?.height_unit === 'ft_in' ? 'ft_in' : 'cm';

  const saveProfilePatch = async (
    sectionId: string,
    payload: Record<string, any>,
    successMsg: string
  ) => {
    setSavingSection(sectionId);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Could not save changes.');
      hydrateDraftsFromBundle(data);
      if (sectionId in editing) {
        setEditing((prev) => ({ ...prev, [sectionId]: false }));
      }
      window.dispatchEvent(new Event('strap-auth-refresh'));
      showToast(successMsg);
    } catch (err: any) {
      showToast(err?.message || 'Failed to save profile changes.', 'error');
    } finally {
      setSavingSection(null);
    }
  };

  const cancelSection = (section: SectionKey) => {
    if (profile) {
      hydrateDraftsFromBundle({ profile, nutritionEngine, weightProgress, latestSleep });
    }
    setEditing((prev) => ({ ...prev, [section]: false }));
  };

  // Save Handlers
  const handleSavePersonal = () => {
    if (!personalDraft.full_name.trim()) {
      showToast('Full name is required.', 'error');
      return;
    }
    const derivedAge = personalDraft.date_of_birth
      ? calculateAgeFromDob(personalDraft.date_of_birth)
      : personalDraft.age;
    if (personalDraft.date_of_birth && derivedAge === null) {
      showToast('Please enter a valid date of birth (age 10–100).', 'error');
      return;
    }
    saveProfilePatch(
      'personal',
      {
        full_name: personalDraft.full_name.trim(),
        date_of_birth: personalDraft.date_of_birth || null,
        age: derivedAge ?? null,
        gender: personalDraft.gender || null,
        height_unit: personalDraft.height_unit,
        weight_unit: personalDraft.weight_unit,
      },
      'Personal details & units saved.'
    );
  };

  const handleSaveMeasurements = () => {
    if (measDraft.height_cm > 0 && !heightValid) {
      showToast('Please enter a valid height before saving.', 'error');
      return;
    }
    const canonicalWeightKg =
      measDraft.weight_display !== null && measDraft.weight_display > 0
        ? weightUnit === 'lb'
          ? Math.round(lbToKg(measDraft.weight_display) * 10) / 10
          : Math.round(measDraft.weight_display * 10) / 10
        : null;

    if (canonicalWeightKg !== null && (canonicalWeightKg < 20 || canonicalWeightKg > 500)) {
      showToast('Weight must be between 20 kg (44 lb) and 500 kg (1,102 lb).', 'error');
      return;
    }

    saveProfilePatch(
      'measurements',
      {
        weight: canonicalWeightKg,
        height: measDraft.height_cm > 0 ? measDraft.height_cm : null,
        height_unit: measDraft.height_unit,
        body_fat_percentage: measDraft.body_fat_percentage,
        chest_cm: measDraft.chest_cm,
        waist_cm: measDraft.waist_cm,
        hips_cm: measDraft.hips_cm,
        arms_cm: measDraft.arms_cm,
        log_weight_entry: canonicalWeightKg !== null,
      },
      'Body measurements saved.'
    );
  };

  const handleSaveGoals = () => {
    const targetKg =
      goalsDraft.target_weight_display !== null && goalsDraft.target_weight_display > 0
        ? weightUnit === 'lb'
          ? Math.round(lbToKg(goalsDraft.target_weight_display) * 10) / 10
          : Math.round(goalsDraft.target_weight_display * 10) / 10
        : null;

    if (targetKg !== null && (targetKg < 20 || targetKg > 500)) {
      showToast('Target weight must be between 20 kg (44 lb) and 500 kg (1,102 lb).', 'error');
      return;
    }

    const desiredDelta =
      targetKg !== null && profile?.weight != null
        ? Math.round((targetKg - Number(profile.weight)) * 10) / 10
        : null;

    saveProfilePatch(
      'goals',
      {
        fitness_goal: goalsDraft.fitness_goal,
        target_weight_kg: targetKg,
        desired_weight_change_kg: desiredDelta,
        target_date: goalsDraft.target_date || null,
      },
      `Fitness goal updated to ${GOAL_LABELS[goalsDraft.fitness_goal] || goalsDraft.fitness_goal}. Calorie & Nutrition targets synced.`
    );
  };

  const handleSaveTraining = () => {
    saveProfilePatch(
      'training',
      {
        weekly_workout_days: Number(trainingDraft.weekly_workout_days),
        experience_level: trainingDraft.experience_level,
        training_style: trainingDraft.training_style,
        preferred_workout_split: trainingDraft.preferred_workout_split,
        workout_location: trainingDraft.workout_location,
        workout_duration_mins: trainingDraft.workout_duration_mins,
        equipment: trainingDraft.equipment,
        exercise_preferences: trainingDraft.exercise_preferences,
        limitations: trainingDraft.limitations,
      },
      'Training preferences saved and synced with AI Planner.'
    );
  };

  const handleSaveNutritionPrefs = () => {
    saveProfilePatch(
      'nutrition_prefs',
      {
        dietary_preference: nutritionDraft.diet_preference || null,
        nutrition_preferences: {
          diet_preference: nutritionDraft.diet_preference || null,
          food_allergies: parseCommaList(nutritionDraft.food_allergies),
          food_restrictions: parseCommaList(nutritionDraft.food_restrictions),
          preferred_foods: parseCommaList(nutritionDraft.preferred_foods),
          foods_to_avoid: parseCommaList(nutritionDraft.foods_to_avoid),
          meals_per_day: nutritionDraft.meals_per_day,
          daily_calorie_preference: nutritionDraft.daily_calorie_preference,
          protein_target_preference_g: nutritionDraft.protein_target_preference_g,
          nutrition_goal: nutritionDraft.nutrition_goal.trim() || null,
        },
      },
      'Nutrition preferences saved.'
    );
  };

  const handleSaveActivity = () => {
    saveProfilePatch(
      'activity',
      {
        activity_level: activityDraft.activity_level,
        daily_steps_avg: activityDraft.daily_steps_avg,
        activity_notes: activityDraft.activity_notes,
        sleep_hours_avg: activityDraft.sleep_hours_avg,
      },
      'Activity & lifestyle updated.'
    );
  };

  const handleLogWeightCheckIn = async (weightKg: number, recordedDate?: string) => {
    const res = await fetch('/api/user/measurements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        weight_kg: weightKg,
        recorded_date: recordedDate,
        notes: 'Profile check-in',
      }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error || 'Could not log body weight.');
    await loadAll();
    showToast(`Logged ${formatWeight(weightKg, weightUnit)} check-in.`);
  };

  const handleSelectCalorieOption = async (optionId: string, clearCustom = false) => {
    const payload: Record<string, any> = { selected_calorie_option_id: optionId };
    if (clearCustom) payload.custom_nutrition_targets = null;
    await saveProfilePatch(
      'calorie_targets',
      payload,
      clearCustom ? 'Switched to calculated targets.' : 'Calorie option saved and synced with Nutrition.'
    );
  };

  const handleSaveCustomTargets = async (custom: CustomNutritionTargets | null) => {
    await saveProfilePatch(
      'calorie_targets',
      { custom_nutrition_targets: custom },
      custom ? 'Custom calorie & macro targets saved.' : 'Reset to system-calculated targets.'
    );
  };

  const handleToggleGoogleLink = async () => {
    setLinkingGoogle(true);
    try {
      if (profile?.google_linked) {
        const res = await fetch('/api/user/link-google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'unlink' }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not disconnect Google Sign-In.');
        setProfile((prev: any) => ({ ...prev, google_linked: false }));
        showToast(data.message || 'Google Sign-In disconnected.');
      } else {
        const supabase = createBrowserClient();
        if (supabase) {
          await fetch('/api/user/link-google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'prepare_link' }),
          });
          await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: `${window.location.origin}/auth/callback?link=google` },
          });
          return;
        } else {
          const res = await fetch('/api/user/link-google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'link' }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Could not link Google Account.');
          setProfile((prev: any) => ({ ...prev, google_linked: true }));
          showToast('Google Sign-In linked to your account.');
        }
      }
    } catch (err: any) {
      showToast(err?.message || 'Google account linking failed.', 'error');
    } finally {
      setLinkingGoogle(false);
    }
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const liveDraftWeightDelta = useMemo(() => {
    if (profile?.weight == null || goalsDraft.target_weight_display == null) return null;
    const targetKg =
      weightUnit === 'lb'
        ? lbToKg(goalsDraft.target_weight_display)
        : goalsDraft.target_weight_display;
    return Math.round((targetKg - Number(profile.weight)) * 10) / 10;
  }, [profile?.weight, goalsDraft.target_weight_display, weightUnit]);

  const recordedCircumferences = useMemo(() => {
    const parts: string[] = [];
    if (profile?.chest_cm != null) parts.push(`Chest ${profile.chest_cm}cm`);
    if (profile?.waist_cm != null) parts.push(`Waist ${profile.waist_cm}cm`);
    if (profile?.hips_cm != null) parts.push(`Hips ${profile.hips_cm}cm`);
    if (profile?.arms_cm != null) parts.push(`Arms ${profile.arms_cm}cm`);
    return parts.join(' • ');
  }, [profile]);

  if (loading) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center px-4">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent shadow-glow" />
          <span className="text-xs text-zinc-400 font-mono">Loading Profile...</span>
        </div>
      </div>
    );
  }

  const primaryGoalLabel = GOAL_LABELS[profile?.primary_goal || ''] || 'Not set';
  const remainingKg =
    profile?.weight != null && profile?.target_weight_kg != null
      ? Math.round((Number(profile.target_weight_kg) - Number(profile.weight)) * 10) / 10
      : null;

  const navTabs = [
    { id: 'sec-personal', label: 'Personal' },
    { id: 'sec-measurements', label: 'Measurements' },
    { id: 'sec-goals', label: 'Fitness Goals' },
    { id: 'sec-training', label: 'Training' },
    { id: 'sec-nutrition-prefs', label: 'Nutrition' },
    { id: 'sec-calories', label: 'Daily Targets' },
    { id: 'sec-activity', label: 'Activity' },
    { id: 'sec-account', label: 'Account' },
  ];

  const cardClass =
    'rounded-2xl border border-[#E1E4E8] dark:border-card-border bg-white dark:bg-card p-5 space-y-3 scroll-mt-20 min-w-0';
  const inputClass =
    'w-full rounded-xl border border-[#D4D4D8] dark:border-zinc-800 bg-[#F9FAFB] dark:bg-zinc-950 p-2.5 text-xs text-[#111318] dark:text-white focus:border-brand focus:outline-none';
  const editBtnClass =
    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#D4D4D8] dark:border-zinc-700 bg-[#F4F4F5] dark:bg-zinc-900 text-xs font-bold text-[#111318] dark:text-white hover:border-brand transition-colors shrink-0';

  const activeTargets = nutritionEngine?.activeTargets || null;

  return (
    <div className="mx-auto max-w-6xl px-3 sm:px-6 lg:px-8 py-6 space-y-5 overflow-x-hidden">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-4 right-4 left-4 sm:left-auto z-50 max-w-md rounded-xl border px-4 py-3 text-xs font-semibold shadow-2xl flex items-center gap-2.5 ${
            toast.type === 'success'
              ? 'border-brand/40 bg-zinc-950/95 text-brand'
              : 'border-red-500/40 bg-red-950/95 text-red-200'
          }`}
        >
          {toast.type === 'success' ? (
            <Check className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          <span className="break-words">{toast.text}</span>
        </div>
      )}

      {/* Compact Profile Header + Wrapped Navigation Tabs (Zero Mobile Cutoff) */}
      <div className="rounded-2xl border border-[#E1E4E8] dark:border-card-border bg-white dark:bg-card p-4 sm:p-5 space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-black text-[#111318] dark:text-white truncate">
              {profile?.full_name || 'Athlete Profile'}
            </h1>
            <p className="text-xs text-[#52525B] dark:text-zinc-400">
              Single source of truth for Dashboard, Nutrition, AI Planner &amp; Workout Tracker
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Link
              href="/nutrition"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#D4D4D8] dark:border-zinc-700 bg-[#F4F4F5] dark:bg-zinc-900 text-xs font-bold text-[#111318] dark:text-white hover:border-brand transition-colors"
            >
              <Utensils className="h-3.5 w-3.5 text-[#4d7c0f] dark:text-brand" />
              <span>Nutrition</span>
            </Link>
            <Link
              href="/workout-planner"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand text-xs font-extrabold text-black hover:bg-brand-400 transition-colors shadow-glow strap-primary"
            >
              <Dumbbell className="h-3.5 w-3.5" />
              <span>AI Planner</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Cleanly wrapping navigation tabs — all tabs accessible on 320px+ mobile with zero horizontal cutoff */}
        <nav aria-label="Profile sections" className="flex flex-wrap gap-1.5 pt-1 border-t border-[#E5E7EB] dark:border-zinc-800/70">
          {navTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => scrollToSection(tab.id)}
              className="px-2.5 py-1 rounded-lg border border-[#E1E4E8] dark:border-zinc-800 bg-[#F8F9FA] dark:bg-zinc-950/70 text-[11px] font-semibold text-[#52525B] dark:text-zinc-300 hover:border-brand hover:text-[#111318] dark:hover:text-brand transition-colors"
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ===================================================================== */}
      {/* ROW 1: 1. PERSONAL DETAILS & 2. BODY MEASUREMENTS                     */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {/* 1. Personal Details */}
        <section id="sec-personal" className={cardClass}>
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#E5E7EB] dark:border-zinc-800/80">
            <h2 className="text-sm font-bold text-[#111318] dark:text-white flex items-center gap-2">
              <User className="h-4 w-4 text-[#4d7c0f] dark:text-brand shrink-0" />
              <span>Personal Details</span>
            </h2>
            {!editing.personal ? (
              <button
                type="button"
                onClick={() => setEditing((prev) => ({ ...prev, personal: true }))}
                className={editBtnClass}
              >
                <Edit3 className="h-3.5 w-3.5 text-[#4d7c0f] dark:text-brand" />
                <span>Edit</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => cancelSection('personal')}
                  className="px-2.5 py-1.5 rounded-xl border border-zinc-700 text-xs font-semibold text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={savingSection === 'personal'}
                  onClick={handleSavePersonal}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-brand text-xs font-extrabold text-black disabled:opacity-50 strap-primary"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>{savingSection === 'personal' ? 'Saving...' : 'Save'}</span>
                </button>
              </div>
            )}
          </div>

          {!editing.personal ? (
            <div>
              <SummaryRow label="Full name" value={profile?.full_name || 'Not set'} />
              <SummaryRow
                label="Age"
                value={
                  profile?.age != null
                    ? `${profile.age} yrs${profile?.date_of_birth ? ` (${profile.date_of_birth})` : ''}`
                    : 'Not set'
                }
              />
              <SummaryRow
                label="Gender"
                value={
                  <span className="capitalize">
                    {profile?.gender ? String(profile.gender).replace(/_/g, ' ') : 'Not set'}
                  </span>
                }
              />
              <SummaryRow
                label="Preferred units"
                value={`${weightUnit === 'lb' ? 'lb' : 'kg'} / ${heightUnit === 'ft_in' ? 'ft-in' : 'cm'}`}
                accent
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1">Full Name</label>
                <input
                  type="text"
                  value={personalDraft.full_name}
                  onChange={(e) => setPersonalDraft({ ...personalDraft, full_name: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                  Date of Birth (Optional)
                </label>
                <input
                  type="date"
                  value={personalDraft.date_of_birth}
                  onChange={(e) => {
                    const dob = e.target.value;
                    const computed = calculateAgeFromDob(dob);
                    setPersonalDraft({
                      ...personalDraft,
                      date_of_birth: dob,
                      age: computed ?? personalDraft.age,
                    });
                  }}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1">Age (Years)</label>
                <NumericInput
                  min={10}
                  max={100}
                  allowDecimal={false}
                  placeholder="e.g. 25"
                  value={personalDraft.age}
                  onValueChange={(v) => setPersonalDraft({ ...personalDraft, age: v })}
                  className={inputClass}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1">Gender</label>
                <select
                  value={personalDraft.gender}
                  onChange={(e) => setPersonalDraft({ ...personalDraft, gender: e.target.value })}
                  className={inputClass}
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other / Non-binary</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1">Weight Unit</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['kg', 'lb'] as WeightUnit[]).map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setPersonalDraft({ ...personalDraft, weight_unit: u })}
                      className={`py-2 rounded-xl border text-xs font-bold ${
                        personalDraft.weight_unit === u
                          ? 'border-brand bg-brand/15 text-brand'
                          : 'border-zinc-800 bg-zinc-950 text-zinc-400'
                      }`}
                    >
                      {u.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1">Height Unit</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['cm', 'ft_in'] as HeightUnit[]).map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setPersonalDraft({ ...personalDraft, height_unit: u })}
                      className={`py-2 rounded-xl border text-xs font-bold ${
                        personalDraft.height_unit === u
                          ? 'border-brand bg-brand/15 text-brand'
                          : 'border-zinc-800 bg-zinc-950 text-zinc-400'
                      }`}
                    >
                      {u === 'cm' ? 'CM' : 'FT / IN'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* 2. Body Measurements */}
        <section id="sec-measurements" className={cardClass}>
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#E5E7EB] dark:border-zinc-800/80">
            <h2 className="text-sm font-bold text-[#111318] dark:text-white flex items-center gap-2">
              <Scale className="h-4 w-4 text-[#4d7c0f] dark:text-brand shrink-0" />
              <span>Body Measurements</span>
            </h2>
            {!editing.measurements ? (
              <button
                type="button"
                onClick={() => setEditing((prev) => ({ ...prev, measurements: true }))}
                className={editBtnClass}
              >
                <Edit3 className="h-3.5 w-3.5 text-[#4d7c0f] dark:text-brand" />
                <span>Edit</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => cancelSection('measurements')}
                  className="px-2.5 py-1.5 rounded-xl border border-zinc-700 text-xs font-semibold text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={savingSection === 'measurements'}
                  onClick={handleSaveMeasurements}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-brand text-xs font-extrabold text-black disabled:opacity-50 strap-primary"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>{savingSection === 'measurements' ? 'Saving...' : 'Save'}</span>
                </button>
              </div>
            )}
          </div>

          {!editing.measurements ? (
            <div>
              <SummaryRow
                label="Current body weight"
                value={formatWeight(profile?.weight, weightUnit)}
                accent={profile?.weight != null}
              />
              <SummaryRow label="Height" value={formatHeightDisplay(profile?.height, heightUnit)} />
              <SummaryRow
                label="Body fat %"
                value={profile?.body_fat_percentage != null ? `${profile.body_fat_percentage}%` : 'Not set'}
              />
              <SummaryRow
                label="Circumferences"
                value={recordedCircumferences || 'Not recorded'}
              />
            </div>
          ) : (
            <div className="space-y-3 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                    Current Weight ({weightUnit})
                  </label>
                  <NumericInput
                    min={weightUnit === 'lb' ? 44 : 20}
                    max={weightUnit === 'lb' ? 1102 : 500}
                    allowDecimal
                    placeholder={weightUnit === 'lb' ? 'e.g. 164.2' : 'e.g. 74.5'}
                    value={measDraft.weight_display}
                    onValueChange={(v) => setMeasDraft({ ...measDraft, weight_display: v })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                    Body Fat % (Optional)
                  </label>
                  <NumericInput
                    min={2}
                    max={70}
                    allowDecimal
                    placeholder="Optional"
                    value={measDraft.body_fat_percentage}
                    onValueChange={(v) => setMeasDraft({ ...measDraft, body_fat_percentage: v })}
                    className={inputClass}
                  />
                </div>
              </div>

              <HeightInput
                heightCm={measDraft.height_cm}
                unit={measDraft.height_unit}
                onChange={(nextCm, nextUnit, isValid) => {
                  setHeightValid(isValid);
                  setMeasDraft((prev) => ({
                    ...prev,
                    height_cm: nextCm,
                    height_unit: nextUnit,
                  }));
                }}
              />

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                <div>
                  <label className="block text-[10px] font-semibold text-zinc-400 mb-1">Chest (cm)</label>
                  <NumericInput
                    min={30}
                    max={250}
                    allowDecimal
                    placeholder="cm"
                    value={measDraft.chest_cm}
                    onValueChange={(v) => setMeasDraft({ ...measDraft, chest_cm: v })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-zinc-400 mb-1">Waist (cm)</label>
                  <NumericInput
                    min={30}
                    max={250}
                    allowDecimal
                    placeholder="cm"
                    value={measDraft.waist_cm}
                    onValueChange={(v) => setMeasDraft({ ...measDraft, waist_cm: v })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-zinc-400 mb-1">Hips (cm)</label>
                  <NumericInput
                    min={30}
                    max={250}
                    allowDecimal
                    placeholder="cm"
                    value={measDraft.hips_cm}
                    onValueChange={(v) => setMeasDraft({ ...measDraft, hips_cm: v })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-zinc-400 mb-1">Arms (cm)</label>
                  <NumericInput
                    min={10}
                    max={100}
                    allowDecimal
                    placeholder="cm"
                    value={measDraft.arms_cm}
                    onValueChange={(v) => setMeasDraft({ ...measDraft, arms_cm: v })}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* ===================================================================== */}
      {/* ROW 2: 3. FITNESS GOALS (Goal + Weight Target + Collapsible Progress) */}
      {/* ===================================================================== */}
      <section id="sec-goals" className={cardClass}>
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#E5E7EB] dark:border-zinc-800/80">
          <h2 className="text-sm font-bold text-[#111318] dark:text-white flex items-center gap-2">
            <Target className="h-4 w-4 text-[#4d7c0f] dark:text-brand shrink-0" />
            <span>Fitness Goals</span>
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowWeightProgress((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#D4D4D8] dark:border-zinc-800 bg-[#F8F9FA] dark:bg-zinc-950 text-xs font-semibold text-[#52525B] dark:text-zinc-300 hover:border-brand transition-colors"
            >
              <TrendingUp className="h-3.5 w-3.5 text-[#4d7c0f] dark:text-brand" />
              <span>Weight Progress</span>
              {showWeightProgress ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>

            {!editing.goals ? (
              <button
                type="button"
                onClick={() => setEditing((prev) => ({ ...prev, goals: true }))}
                className={editBtnClass}
              >
                <Edit3 className="h-3.5 w-3.5 text-[#4d7c0f] dark:text-brand" />
                <span>Edit</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => cancelSection('goals')}
                  className="px-2.5 py-1.5 rounded-xl border border-zinc-700 text-xs font-semibold text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={savingSection === 'goals'}
                  onClick={handleSaveGoals}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-brand text-xs font-extrabold text-black disabled:opacity-50 strap-primary"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>{savingSection === 'goals' ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {!editing.goals ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6">
            <SummaryRow label="Primary goal" value={primaryGoalLabel} accent />
            <SummaryRow
              label="Target weight"
              value={
                profile?.target_weight_kg != null
                  ? `${formatWeight(profile.target_weight_kg, weightUnit)}${
                      remainingKg !== null ? ` (${formatWeightDelta(remainingKg, weightUnit)})` : ''
                    }`
                  : 'Optional — not set'
              }
            />
            <SummaryRow label="Target timeline" value={profile?.target_date || 'Not set'} />
          </div>
        ) : (
          <div className="space-y-4 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {PRIMARY_GOALS.map((g) => {
                const selected = goalsDraft.fitness_goal === g.id;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setGoalsDraft({ ...goalsDraft, fitness_goal: g.id })}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      selected
                        ? 'border-brand bg-brand/15 shadow-glow'
                        : 'border-[#E1E4E8] dark:border-zinc-800 bg-[#F8F9FA] dark:bg-zinc-950 hover:border-zinc-600'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-extrabold text-[#111318] dark:text-white">
                        {g.label}
                      </span>
                      {selected && <Check className="h-3.5 w-3.5 text-brand shrink-0" />}
                    </div>
                    <p className="text-[11px] text-[#52525B] dark:text-zinc-400 mt-0.5">{g.desc}</p>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                  Target Weight ({weightUnit}, Optional)
                </label>
                <NumericInput
                  min={weightUnit === 'lb' ? 44 : 20}
                  max={weightUnit === 'lb' ? 1102 : 500}
                  allowDecimal
                  placeholder="Optional"
                  value={goalsDraft.target_weight_display}
                  onValueChange={(v) => setGoalsDraft({ ...goalsDraft, target_weight_display: v })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                  Remaining Change
                </label>
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-2.5 text-xs font-mono font-bold text-brand">
                  {liveDraftWeightDelta !== null
                    ? formatWeightDelta(liveDraftWeightDelta, weightUnit)
                    : '—'}
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                  Target Date (Optional)
                </label>
                <input
                  type="date"
                  value={goalsDraft.target_date}
                  onChange={(e) => setGoalsDraft({ ...goalsDraft, target_date: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        )}

        {/* Collapsible Historical Body Weight Progress & Check-In */}
        {showWeightProgress && weightProgress && (
          <div className="pt-3 border-t border-[#E5E7EB] dark:border-zinc-800/80">
            <GoalProgressCard
              progress={weightProgress}
              weightUnit={weightUnit}
              primaryGoalLabel={primaryGoalLabel}
              targetDate={profile?.target_date}
              onLogWeight={handleLogWeightCheckIn}
              onRecalculateTargets={() => {
                setShowCaloriePanel(true);
                scrollToSection('sec-calories');
              }}
            />
          </div>
        )}
      </section>

      {/* ===================================================================== */}
      {/* ROW 3: 4. TRAINING PREFERENCES & 5. NUTRITION PREFERENCES             */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {/* 4. Training Preferences */}
        <section id="sec-training" className={cardClass}>
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#E5E7EB] dark:border-zinc-800/80">
            <h2 className="text-sm font-bold text-[#111318] dark:text-white flex items-center gap-2">
              <Dumbbell className="h-4 w-4 text-[#4d7c0f] dark:text-brand shrink-0" />
              <span>Training Preferences</span>
            </h2>
            {!editing.training ? (
              <button
                type="button"
                onClick={() => setEditing((prev) => ({ ...prev, training: true }))}
                className={editBtnClass}
              >
                <Edit3 className="h-3.5 w-3.5 text-[#4d7c0f] dark:text-brand" />
                <span>Edit</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => cancelSection('training')}
                  className="px-2.5 py-1.5 rounded-xl border border-zinc-700 text-xs font-semibold text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={savingSection === 'training'}
                  onClick={handleSaveTraining}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-brand text-xs font-extrabold text-black disabled:opacity-50 strap-primary"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>{savingSection === 'training' ? 'Saving...' : 'Save'}</span>
                </button>
              </div>
            )}
          </div>

          {!editing.training ? (
            <div>
              <SummaryRow
                label="Training frequency"
                value={
                  profile?.weekly_workout_days
                    ? `${profile.weekly_workout_days} ${profile.weekly_workout_days === 1 ? 'day' : 'days'}/week`
                    : 'Not set'
                }
                accent={Boolean(profile?.weekly_workout_days)}
              />
              <SummaryRow
                label="Experience"
                value={<span className="capitalize">{profile?.experience_level || 'Not set'}</span>}
              />
              <SummaryRow
                label="Training style"
                value={
                  <span className="capitalize">
                    {String(profile?.training_style || 'muscle_building').replace(/_/g, ' ')}
                  </span>
                }
              />
              <SummaryRow
                label="Preferred split"
                value={
                  WORKOUT_SPLITS.find((s) => s.id === profile?.preferred_workout_split)?.label || 'Auto'
                }
              />
            </div>
          ) : (
            <div className="space-y-3 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                    Training Days / Week
                  </label>
                  <select
                    value={trainingDraft.weekly_workout_days}
                    onChange={(e) =>
                      setTrainingDraft({ ...trainingDraft, weekly_workout_days: Number(e.target.value) })
                    }
                    className={inputClass}
                  >
                    {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                      <option key={d} value={d}>
                        {d} {d === 1 ? 'Day' : 'Days'} / Week
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400 mb-1">Experience</label>
                  <select
                    value={trainingDraft.experience_level}
                    onChange={(e) =>
                      setTrainingDraft({ ...trainingDraft, experience_level: e.target.value })
                    }
                    className={inputClass}
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                    Training Style
                  </label>
                  <select
                    value={trainingDraft.training_style}
                    onChange={(e) =>
                      setTrainingDraft({
                        ...trainingDraft,
                        training_style: e.target.value as any,
                      })
                    }
                    className={inputClass}
                  >
                    <option value="muscle_building">Muscle Building</option>
                    <option value="powerlifting">Powerlifting</option>
                    <option value="general_fitness">General Fitness</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                    Preferred Split
                  </label>
                  <select
                    value={trainingDraft.preferred_workout_split}
                    onChange={(e) =>
                      setTrainingDraft({ ...trainingDraft, preferred_workout_split: e.target.value })
                    }
                    className={inputClass}
                  >
                    {WORKOUT_SPLITS.map((sp) => (
                      <option key={sp.id} value={sp.id}>
                        {sp.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400 mb-1">Location</label>
                  <select
                    value={trainingDraft.workout_location}
                    onChange={(e) =>
                      setTrainingDraft({ ...trainingDraft, workout_location: e.target.value })
                    }
                    className={inputClass}
                  >
                    <option value="gym">Commercial Gym</option>
                    <option value="home">Home Gym</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                    Workout Duration (mins)
                  </label>
                  <NumericInput
                    min={15}
                    max={240}
                    allowDecimal={false}
                    placeholder="e.g. 60"
                    value={trainingDraft.workout_duration_mins}
                    onValueChange={(v) =>
                      setTrainingDraft({ ...trainingDraft, workout_duration_mins: v })
                    }
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1.5">
                  Available Equipment
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {EQUIPMENT_OPTIONS.map((item) => {
                    const active = trainingDraft.equipment.includes(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() =>
                          setTrainingDraft((prev) => ({
                            ...prev,
                            equipment: active
                              ? prev.equipment.filter((x) => x !== item)
                              : [...prev.equipment, item],
                          }))
                        }
                        className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold ${
                          active
                            ? 'border-brand bg-brand/15 text-brand'
                            : 'border-zinc-800 bg-zinc-950 text-zinc-400'
                        }`}
                      >
                        {item}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                  Exercise Preferences (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Prefer dumbbells, focus on pull-ups"
                  value={trainingDraft.exercise_preferences}
                  onChange={(e) =>
                    setTrainingDraft({ ...trainingDraft, exercise_preferences: e.target.value })
                  }
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                  Limitations / Restrictions (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Avoid behind-the-neck press"
                  value={trainingDraft.limitations}
                  onChange={(e) =>
                    setTrainingDraft({ ...trainingDraft, limitations: e.target.value })
                  }
                  className={inputClass}
                />
              </div>
            </div>
          )}
        </section>

        {/* 5. Nutrition Preferences */}
        <section id="sec-nutrition-prefs" className={cardClass}>
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#E5E7EB] dark:border-zinc-800/80">
            <h2 className="text-sm font-bold text-[#111318] dark:text-white flex items-center gap-2">
              <Utensils className="h-4 w-4 text-[#4d7c0f] dark:text-brand shrink-0" />
              <span>Nutrition Preferences</span>
            </h2>
            {!editing.nutrition_prefs ? (
              <button
                type="button"
                onClick={() => setEditing((prev) => ({ ...prev, nutrition_prefs: true }))}
                className={editBtnClass}
              >
                <Edit3 className="h-3.5 w-3.5 text-[#4d7c0f] dark:text-brand" />
                <span>Edit</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => cancelSection('nutrition_prefs')}
                  className="px-2.5 py-1.5 rounded-xl border border-zinc-700 text-xs font-semibold text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={savingSection === 'nutrition_prefs'}
                  onClick={handleSaveNutritionPrefs}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-brand text-xs font-extrabold text-black disabled:opacity-50 strap-primary"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>{savingSection === 'nutrition_prefs' ? 'Saving...' : 'Save'}</span>
                </button>
              </div>
            )}
          </div>

          {!editing.nutrition_prefs ? (
            <div>
              <SummaryRow
                label="Diet"
                value={
                  <span className="capitalize">
                    {profile?.dietary_preference
                      ? String(profile.dietary_preference).replace(/_/g, ' ')
                      : 'Not set'}
                  </span>
                }
                accent={Boolean(profile?.dietary_preference)}
              />
              <SummaryRow
                label="Meals per day"
                value={
                  profile?.nutrition_preferences?.meals_per_day
                    ? `${profile.nutrition_preferences.meals_per_day} meals/day`
                    : 'Not specified'
                }
              />
              <SummaryRow
                label="Allergies"
                value={joinCommaList(profile?.nutrition_preferences?.food_allergies) || 'None'}
              />
              {profile?.nutrition_preferences?.nutrition_goal && (
                <SummaryRow
                  label="Nutrition focus"
                  value={profile.nutrition_preferences.nutrition_goal}
                />
              )}
            </div>
          ) : (
            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1.5">Diet</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {DIET_OPTIONS.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setNutritionDraft({ ...nutritionDraft, diet_preference: d.id })}
                      className={`py-2 px-2.5 rounded-xl border text-xs font-bold ${
                        nutritionDraft.diet_preference === d.id
                          ? 'border-brand bg-brand/15 text-brand'
                          : 'border-zinc-800 bg-zinc-950 text-zinc-400'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                    Meals / Day
                  </label>
                  <NumericInput
                    min={1}
                    max={10}
                    allowDecimal={false}
                    placeholder="e.g. 4"
                    value={nutritionDraft.meals_per_day}
                    onValueChange={(v) => setNutritionDraft({ ...nutritionDraft, meals_per_day: v })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                    Calorie Pref (Opt)
                  </label>
                  <NumericInput
                    min={800}
                    max={10000}
                    allowDecimal={false}
                    placeholder="Auto"
                    value={nutritionDraft.daily_calorie_preference}
                    onValueChange={(v) =>
                      setNutritionDraft({ ...nutritionDraft, daily_calorie_preference: v })
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                    Protein Pref (g)
                  </label>
                  <NumericInput
                    min={30}
                    max={500}
                    allowDecimal={false}
                    placeholder="Auto"
                    value={nutritionDraft.protein_target_preference_g}
                    onValueChange={(v) =>
                      setNutritionDraft({ ...nutritionDraft, protein_target_preference_g: v })
                    }
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                    Food Allergies
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Peanuts, Lactose"
                    value={nutritionDraft.food_allergies}
                    onChange={(e) =>
                      setNutritionDraft({ ...nutritionDraft, food_allergies: e.target.value })
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                    Food Restrictions
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Gluten-free, Low sodium"
                    value={nutritionDraft.food_restrictions}
                    onChange={(e) =>
                      setNutritionDraft({ ...nutritionDraft, food_restrictions: e.target.value })
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                    Preferred Foods
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Eggs, Paneer, Oats"
                    value={nutritionDraft.preferred_foods}
                    onChange={(e) =>
                      setNutritionDraft({ ...nutritionDraft, preferred_foods: e.target.value })
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                    Foods to Avoid
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Fried snacks, Soda"
                    value={nutritionDraft.foods_to_avoid}
                    onChange={(e) =>
                      setNutritionDraft({ ...nutritionDraft, foods_to_avoid: e.target.value })
                    }
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                  Nutrition Focus / Goal (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. High-protein whole foods"
                  value={nutritionDraft.nutrition_goal}
                  onChange={(e) =>
                    setNutritionDraft({ ...nutritionDraft, nutrition_goal: e.target.value })
                  }
                  className={inputClass}
                />
              </div>
            </div>
          )}
        </section>
      </div>

      {/* ===================================================================== */}
      {/* ROW 4: 6. DAILY NUTRITION TARGETS & CALORIE CALCULATOR                */}
      {/* ===================================================================== */}
      <section id="sec-calories" className={cardClass}>
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#E5E7EB] dark:border-zinc-800/80">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <h2 className="text-sm font-bold text-[#111318] dark:text-white flex items-center gap-2">
              <Flame className="h-4 w-4 text-[#4d7c0f] dark:text-brand shrink-0" />
              <span>Daily Nutrition Targets</span>
            </h2>
            {nutritionEngine?.isComplete && (
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  nutritionEngine.targetSource === 'custom'
                    ? 'bg-amber-500/15 border border-amber-500/40 text-amber-400'
                    : 'bg-brand/15 border border-brand/30 text-[#4d7c0f] dark:text-brand'
                }`}
              >
                {nutritionEngine.targetSource === 'custom'
                  ? 'Custom'
                  : nutritionEngine.selectedOption?.label || 'Calculated'}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowCaloriePanel((v) => !v)}
            className={editBtnClass}
          >
            <Sliders className="h-3.5 w-3.5 text-[#4d7c0f] dark:text-brand" />
            <span>{showCaloriePanel ? 'Close Calculator' : 'Adjust Pace & Targets'}</span>
          </button>
        </div>

        {/* Compact Summary Row when Calculator is Collapsed */}
        {!showCaloriePanel && (
          nutritionEngine?.isComplete && activeTargets ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6">
              <SummaryRow
                label="Daily calorie target"
                value={`${activeTargets.target_calories.toLocaleString()} kcal`}
                accent
              />
              <SummaryRow
                label="BMR / Maintenance"
                value={`${nutritionEngine.bmr?.toLocaleString()} / ${nutritionEngine.tdee?.toLocaleString()} kcal`}
              />
              <SummaryRow
                label="Protein / Carbs / Fat"
                value={`${activeTargets.protein_g}g • ${activeTargets.carbs_g}g • ${activeTargets.fats_g}g`}
              />
              <SummaryRow
                label="Fiber / Hydration"
                value={`${activeTargets.fiber_g}g • ${activeTargets.water_liters}L`}
              />
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-1 text-xs text-[#52525B] dark:text-zinc-400">
              <span>
                Add your age, height, and current body weight above to calculate personalized BMR, TDEE, and calorie pace options.
              </span>
              <button
                type="button"
                onClick={() => {
                  setEditing((prev) => ({ ...prev, personal: true, measurements: true }));
                  scrollToSection('sec-personal');
                }}
                className="text-xs font-bold text-[#4d7c0f] dark:text-brand hover:underline shrink-0 text-left"
              >
                Complete Biometrics →
              </button>
            </div>
          )
        )}

        {/* Full Calorie Calculator & Macro Customization Panel on Click */}
        {showCaloriePanel && (
          <div className="pt-1">
            <CalorieCalculatorPanel
              plan={nutritionEngine}
              saving={savingSection === 'calorie_targets'}
              onSelectOption={handleSelectCalorieOption}
              onSaveCustomTargets={handleSaveCustomTargets}
              onJumpToBiometrics={() => {
                setEditing((prev) => ({ ...prev, personal: true, measurements: true }));
                scrollToSection('sec-personal');
              }}
            />
          </div>
        )}
      </section>

      {/* ===================================================================== */}
      {/* ROW 5: 7. ACTIVITY & LIFESTYLE & 8. ACCOUNT SETTINGS                  */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {/* 7. Activity & Lifestyle */}
        <section id="sec-activity" className={cardClass}>
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#E5E7EB] dark:border-zinc-800/80">
            <h2 className="text-sm font-bold text-[#111318] dark:text-white flex items-center gap-2">
              <Activity className="h-4 w-4 text-[#4d7c0f] dark:text-brand shrink-0" />
              <span>Activity &amp; Lifestyle</span>
            </h2>
            {!editing.activity ? (
              <button
                type="button"
                onClick={() => setEditing((prev) => ({ ...prev, activity: true }))}
                className={editBtnClass}
              >
                <Edit3 className="h-3.5 w-3.5 text-[#4d7c0f] dark:text-brand" />
                <span>Edit</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => cancelSection('activity')}
                  className="px-2.5 py-1.5 rounded-xl border border-zinc-700 text-xs font-semibold text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={savingSection === 'activity'}
                  onClick={handleSaveActivity}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-brand text-xs font-extrabold text-black disabled:opacity-50 strap-primary"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>{savingSection === 'activity' ? 'Saving...' : 'Save'}</span>
                </button>
              </div>
            )}
          </div>

          {!editing.activity ? (
            <div>
              <SummaryRow
                label="Daily activity level"
                value={
                  <span className="capitalize">
                    {profile?.activity_level
                      ? String(profile.activity_level).replace(/_/g, ' ')
                      : 'Not set'}
                  </span>
                }
              />
              <SummaryRow
                label="Average daily steps"
                value={
                  profile?.daily_steps_avg != null
                    ? `${Number(profile.daily_steps_avg).toLocaleString()} steps`
                    : 'Not tracked'
                }
              />
              <SummaryRow
                label="Sleep duration"
                value={
                  latestSleep?.sleep_hours != null
                    ? `${latestSleep.sleep_hours} hrs (logged)`
                    : profile?.sleep_hours_avg != null
                    ? `${profile.sleep_hours_avg} hrs avg`
                    : 'Not tracked'
                }
              />
              {profile?.activity_notes && (
                <SummaryRow label="Outside workouts" value={profile.activity_notes} />
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                  Daily Activity Level
                </label>
                <select
                  value={activityDraft.activity_level}
                  onChange={(e) => setActivityDraft({ ...activityDraft, activity_level: e.target.value })}
                  className={inputClass}
                >
                  <option value="sedentary">Sedentary (Desk-bound)</option>
                  <option value="lightly_active">Lightly Active</option>
                  <option value="moderately_active">Moderately Active</option>
                  <option value="very_active">Very Active</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                  Avg Daily Steps (Opt)
                </label>
                <NumericInput
                  min={0}
                  max={100000}
                  allowDecimal={false}
                  placeholder="Optional"
                  value={activityDraft.daily_steps_avg}
                  onValueChange={(v) => setActivityDraft({ ...activityDraft, daily_steps_avg: v })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                  Typical Sleep (hrs, Opt)
                </label>
                <NumericInput
                  min={0}
                  max={24}
                  allowDecimal
                  placeholder="Optional"
                  value={activityDraft.sleep_hours_avg}
                  onValueChange={(v) => setActivityDraft({ ...activityDraft, sleep_hours_avg: v })}
                  className={inputClass}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                  Activity Outside Workouts (Opt)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Desk job + evening walks"
                  value={activityDraft.activity_notes}
                  onChange={(e) => setActivityDraft({ ...activityDraft, activity_notes: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>
          )}
        </section>

        {/* 8. Account Settings */}
        <section id="sec-account" className={cardClass}>
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#E5E7EB] dark:border-zinc-800/80">
            <h2 className="text-sm font-bold text-[#111318] dark:text-white flex items-center gap-2">
              <Shield className="h-4 w-4 text-[#4d7c0f] dark:text-brand shrink-0" />
              <span>Account Settings</span>
            </h2>
            {isPremium ? (
              <span className="text-[10px] font-bold text-brand bg-brand/10 border border-brand/30 px-2 py-0.5 rounded-full">
                PREMIUM
              </span>
            ) : (
              <span className="text-[10px] font-bold text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-full">
                FREE
              </span>
            )}
          </div>

          <div>
            <SummaryRow label="Email" value={profile?.email || 'Social login'} />
            <SummaryRow
              label="Membership"
              value={
                isPremium
                  ? `Premium${
                      subscription?.current_period_end
                        ? ` (until ${new Date(subscription.current_period_end).toLocaleDateString()})`
                        : ''
                    }`
                  : 'STRAP Free Plan'
              }
            />
            <SummaryRow
              label="Google Sign-In"
              value={profile?.google_linked ? 'Linked' : 'Not linked'}
              accent={Boolean(profile?.google_linked)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              disabled={linkingGoogle}
              onClick={handleToggleGoogleLink}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors ${
                profile?.google_linked
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-500 dark:text-emerald-400'
                  : 'border-[#D4D4D8] dark:border-zinc-700 bg-[#F4F4F5] dark:bg-zinc-900 text-[#111318] dark:text-zinc-200 hover:border-brand'
              }`}
            >
              {profile?.google_linked ? (
                <>
                  <Unlink className="h-3.5 w-3.5" />
                  <span>Unlink Google</span>
                </>
              ) : (
                <>
                  <Link2 className="h-3.5 w-3.5 text-[#4d7c0f] dark:text-brand" />
                  <span>Link Google</span>
                </>
              )}
            </button>

            {isPremium ? (
              <Link
                href="/payment-history"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#D4D4D8] dark:border-zinc-700 bg-[#F4F4F5] dark:bg-zinc-900 text-xs font-semibold text-[#111318] dark:text-white hover:border-brand transition-colors"
              >
                Payment History
              </Link>
            ) : (
              <Link
                href="/checkout"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-brand text-xs font-extrabold text-black hover:bg-brand-400 transition-colors shadow-glow strap-primary"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Upgrade to Premium</span>
              </Link>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
