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
  X,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import HeightInput from '@/components/ui/HeightInput';
import NumericInput from '@/components/ui/NumericInput';
import CalorieCalculatorPanel from '@/components/profile/CalorieCalculatorPanel';
import GoalProgressCard from '@/components/profile/GoalProgressCard';
import { HeightUnit } from '@/lib/height';
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
  | 'weight_goals'
  | 'training'
  | 'nutrition_prefs'
  | 'activity';

const PRIMARY_GOALS = [
  { id: 'muscle_gain', label: 'Muscle Gain', desc: 'Hypertrophy & lean mass building with modest surplus options' },
  { id: 'fat_loss', label: 'Fat Loss', desc: 'Sustainable body-fat reduction with 4 individualized pace tiers' },
  { id: 'weight_gain', label: 'Weight Gain', desc: 'Structured total body-weight increase calculated from TDEE' },
  { id: 'weight_loss', label: 'Weight Loss', desc: 'Calorie-deficit pace options calibrated to your physiology' },
  { id: 'recomposition', label: 'Body Recomposition', desc: 'Maintenance / conservative target with prioritized protein' },
  { id: 'maintenance', label: 'Maintain Weight', desc: 'Balanced maintenance calories without surplus or deficit' },
  { id: 'strength', label: 'Strength Development', desc: 'Performance fueling & recovery without forced deficits' },
  { id: 'general_fitness', label: 'General Fitness', desc: 'Sustainable maintenance nutrition and overall health' },
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
  { id: 'auto', label: 'Auto (Recommended for Training Days)' },
  { id: 'full_body', label: 'Full Body' },
  { id: 'upper_lower', label: 'Upper / Lower' },
  { id: 'push_pull_legs', label: 'Push / Pull / Legs (PPL)' },
  { id: 'upper_lower_ppl', label: 'Upper/Lower + PPL Hybrid' },
  { id: 'bro_split', label: 'Body-Part / Bro Split' },
  { id: 'powerlifting_sbd', label: 'Powerlifting SBD Periodization' },
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

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [editing, setEditing] = useState<Record<SectionKey, boolean>>({
    personal: false,
    measurements: false,
    goals: false,
    weight_goals: false,
    training: false,
    nutrition_prefs: false,
    activity: false,
  });

  const [linkingGoogle, setLinkingGoogle] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [heightValid, setHeightValid] = useState(true);

  const [profile, setProfile] = useState<any>(null);
  const [nutritionEngine, setNutritionEngine] = useState<PersonalizedNutritionPlan | null>(null);
  const [weightProgress, setWeightProgress] = useState<WeightProgressSummary | null>(null);
  const [latestSleep, setLatestSleep] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [isPremium, setIsPremium] = useState(false);

  // Per-section drafts (cleanly reset on Cancel)
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
  });

  const [weightGoalDraft, setWeightGoalDraft] = useState({
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
    rest_days_preferred: null as number | null,
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
    });

    setWeightGoalDraft({
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
      rest_days_preferred: p.rest_days_preferred ?? null,
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
      if (!res.ok) {
        throw new Error(data?.error || 'Could not save changes.');
      }
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
      hydrateDraftsFromBundle({
        profile,
        nutritionEngine,
        weightProgress,
        latestSleep,
      });
    }
    setEditing((prev) => ({ ...prev, [section]: false }));
  };

  // Section Save Handlers
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
      'Personal details & preferred units saved.'
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
      'Body measurements saved and calorie estimates updated.'
    );
  };

  const handleSaveGoals = () => {
    saveProfilePatch(
      'goals',
      {
        fitness_goal: goalsDraft.fitness_goal,
      },
      `Primary fitness goal updated to ${GOAL_LABELS[goalsDraft.fitness_goal] || goalsDraft.fitness_goal}. Calorie options & Nutrition targets synchronized.`
    );
  };

  const handleSaveWeightGoals = () => {
    const targetKg =
      weightGoalDraft.target_weight_display !== null && weightGoalDraft.target_weight_display > 0
        ? weightUnit === 'lb'
          ? Math.round(lbToKg(weightGoalDraft.target_weight_display) * 10) / 10
          : Math.round(weightGoalDraft.target_weight_display * 10) / 10
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
      'weight_goals',
      {
        target_weight_kg: targetKg,
        desired_weight_change_kg: desiredDelta,
        target_date: weightGoalDraft.target_date || null,
      },
      'Weight goal & timeline saved.'
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
      'Training preferences saved. AI Planner will sync with these settings.'
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
      'Nutrition preferences saved and synced with your Nutrition tracker.'
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
        rest_days_preferred: activityDraft.rest_days_preferred,
      },
      'Activity details saved and TDEE estimate updated.'
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
    showToast(`Logged ${formatWeight(weightKg, weightUnit)} check-in. Previous history preserved.`);
  };

  const handleSelectCalorieOption = async (optionId: string, clearCustom = false) => {
    const payload: Record<string, any> = {
      selected_calorie_option_id: optionId,
    };
    if (clearCustom) {
      payload.custom_nutrition_targets = null;
    }
    await saveProfilePatch(
      'calorie_targets',
      payload,
      clearCustom
        ? 'Switched to system-calculated calorie & macro targets.'
        : 'Calorie pace selection saved and synchronized with Nutrition.'
    );
  };

  const handleSaveCustomTargets = async (custom: CustomNutritionTargets | null) => {
    await saveProfilePatch(
      'calorie_targets',
      {
        custom_nutrition_targets: custom,
      },
      custom
        ? 'Custom daily calorie & macro targets saved. System recommendations remain available anytime.'
        : 'Reset to system-calculated calorie & macro targets.'
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
    if (profile?.weight == null || weightGoalDraft.target_weight_display == null) return null;
    const targetKg =
      weightUnit === 'lb'
        ? lbToKg(weightGoalDraft.target_weight_display)
        : weightGoalDraft.target_weight_display;
    return Math.round((targetKg - Number(profile.weight)) * 10) / 10;
  }, [profile?.weight, weightGoalDraft.target_weight_display, weightUnit]);

  if (loading) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center px-4">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent shadow-glow" />
          <span className="text-xs text-zinc-400 font-mono">Loading Athlete Profile Center...</span>
        </div>
      </div>
    );
  }

  const primaryGoalLabel =
    GOAL_LABELS[profile?.primary_goal || ''] || 'Not Set';

  const navPills = [
    { id: 'sec-personal', label: 'Personal' },
    { id: 'sec-measurements', label: 'Measurements' },
    { id: 'sec-goals', label: 'Fitness Goals' },
    { id: 'sec-weight-goals', label: 'Weight Progress' },
    { id: 'sec-training', label: 'Training' },
    { id: 'sec-nutrition-prefs', label: 'Diet Prefs' },
    { id: 'sec-calories', label: 'Calorie Calculator' },
    { id: 'sec-activity', label: 'Activity' },
    { id: 'sec-account', label: 'Account' },
  ];

  return (
    <div className="mx-auto max-w-6xl px-3 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 overflow-x-hidden">
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

      {/* Top Hero Header */}
      <div className="rounded-2xl border border-card-border bg-gradient-to-r from-card to-zinc-950 p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-glow">
        <div className="min-w-0 space-y-1">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-brand bg-brand/10 border border-brand/25 px-2.5 py-0.5 rounded-full">
            <Sparkles className="h-3 w-3" />
            STRAP Fitness Management Center
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-white break-words">
            {profile?.full_name || 'Athlete Profile'} — Complete Profile, Goals &amp; Nutrition
          </h1>
          <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
            Your single source of truth across Dashboard, Nutrition, AI Planner, and Workout Tracker. Edit any section independently—every change syncs immediately.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Link
            href="/nutrition"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-zinc-700 bg-zinc-900 text-xs font-bold text-white hover:border-brand transition-colors"
          >
            <Utensils className="h-3.5 w-3.5 text-brand" />
            <span>Nutrition Diary</span>
          </Link>
          <Link
            href="/workout-planner"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand text-xs font-extrabold text-black hover:bg-brand-400 transition-colors shadow-glow strap-primary"
          >
            <Dumbbell className="h-3.5 w-3.5" />
            <span>AI Planner</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Quick Jump Navigation Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {navPills.map((pill) => (
          <button
            key={pill.id}
            type="button"
            onClick={() => scrollToSection(pill.id)}
            className="shrink-0 px-3 py-1.5 rounded-xl border border-zinc-800 bg-card text-[11px] font-bold text-zinc-300 hover:border-brand hover:text-brand transition-colors"
          >
            {pill.label}
          </button>
        ))}
      </div>

      {/* ===================================================================== */}
      {/* SECTION 1: PERSONAL DETAILS                                           */}
      {/* ===================================================================== */}
      <section
        id="sec-personal"
        className="rounded-2xl border border-card-border bg-card p-5 sm:p-6 space-y-4 scroll-mt-20"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand/15 text-brand border border-brand/25">
              <User className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">1. Personal Details &amp; Units</h2>
              <p className="text-[11px] text-zinc-400">
                Identity, age or date of birth, gender, and preferred measurement units
              </p>
            </div>
          </div>

          {!editing.personal ? (
            <button
              type="button"
              onClick={() => setEditing((prev) => ({ ...prev, personal: true }))}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-700 bg-zinc-900 text-xs font-bold text-white hover:border-brand transition-colors"
            >
              <Edit3 className="h-3.5 w-3.5 text-brand" />
              <span>Edit</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => cancelSection('personal')}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-zinc-700 bg-zinc-900 text-xs font-semibold text-zinc-300 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
                <span>Cancel</span>
              </button>
              <button
                type="button"
                disabled={savingSection === 'personal'}
                onClick={handleSavePersonal}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-brand text-xs font-extrabold text-black hover:bg-brand-400 disabled:opacity-50 strap-primary"
              >
                <Save className="h-3.5 w-3.5" />
                <span>{savingSection === 'personal' ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          )}
        </div>

        {!editing.personal ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
            <div className="rounded-xl bg-zinc-950/70 border border-zinc-800/80 p-3 min-w-0">
              <span className="text-[10px] text-zinc-500 uppercase font-bold block">Full Name</span>
              <span className="font-bold text-white mt-0.5 block truncate">
                {profile?.full_name || 'Not set'}
              </span>
            </div>
            <div className="rounded-xl bg-zinc-950/70 border border-zinc-800/80 p-3 min-w-0">
              <span className="text-[10px] text-zinc-500 uppercase font-bold block">Age / DOB</span>
              <span className="font-bold text-white mt-0.5 block">
                {profile?.age != null ? `${profile.age} yrs` : 'Not set'}
              </span>
              {profile?.date_of_birth && (
                <span className="text-[10px] text-zinc-400 block">{profile.date_of_birth}</span>
              )}
            </div>
            <div className="rounded-xl bg-zinc-950/70 border border-zinc-800/80 p-3 min-w-0">
              <span className="text-[10px] text-zinc-500 uppercase font-bold block">Gender</span>
              <span className="font-bold text-white mt-0.5 block capitalize">
                {profile?.gender ? String(profile.gender).replace(/_/g, ' ') : 'Not set'}
              </span>
            </div>
            <div className="rounded-xl bg-zinc-950/70 border border-zinc-800/80 p-3 min-w-0">
              <span className="text-[10px] text-zinc-500 uppercase font-bold block">Weight Unit</span>
              <span className="font-bold text-brand mt-0.5 block uppercase">
                {weightUnit === 'lb' ? 'Pounds (lb)' : 'Kilograms (kg)'}
              </span>
            </div>
            <div className="rounded-xl bg-zinc-950/70 border border-zinc-800/80 p-3 min-w-0">
              <span className="text-[10px] text-zinc-500 uppercase font-bold block">Height Unit</span>
              <span className="font-bold text-brand mt-0.5 block">
                {profile?.height_unit === 'ft_in' ? 'Feet / Inches' : 'Centimeters (cm)'}
              </span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-300 mb-1">Full Name</label>
              <input
                type="text"
                value={personalDraft.full_name}
                onChange={(e) => setPersonalDraft({ ...personalDraft, full_name: e.target.value })}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-white focus:border-brand focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                Date of Birth (Optional — auto-calculates age)
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
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-white focus:border-brand focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-300 mb-1">Age (Years)</label>
              <NumericInput
                min={10}
                max={100}
                allowDecimal={false}
                placeholder="e.g. 25"
                value={personalDraft.age}
                onValueChange={(v) => setPersonalDraft({ ...personalDraft, age: v })}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-white focus:border-brand focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                Gender (Used in Mifflin-St Jeor BMR)
              </label>
              <select
                value={personalDraft.gender}
                onChange={(e) => setPersonalDraft({ ...personalDraft, gender: e.target.value })}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-white focus:border-brand focus:outline-none"
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other / Non-binary</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-300 mb-1">Preferred Weight Unit</label>
              <div className="grid grid-cols-2 gap-2">
                {(['kg', 'lb'] as WeightUnit[]).map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setPersonalDraft({ ...personalDraft, weight_unit: u })}
                    className={`py-2 rounded-xl border text-xs font-bold transition-colors ${
                      personalDraft.weight_unit === u
                        ? 'border-brand bg-brand/15 text-brand'
                        : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {u === 'kg' ? 'Kilograms (kg)' : 'Pounds (lb)'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-300 mb-1">Preferred Height Unit</label>
              <div className="grid grid-cols-2 gap-2">
                {(['cm', 'ft_in'] as HeightUnit[]).map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setPersonalDraft({ ...personalDraft, height_unit: u })}
                    className={`py-2 rounded-xl border text-xs font-bold transition-colors ${
                      personalDraft.height_unit === u
                        ? 'border-brand bg-brand/15 text-brand'
                        : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {u === 'cm' ? 'Centimeters (cm)' : 'Feet / Inches'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ===================================================================== */}
      {/* SECTION 2: BODY MEASUREMENTS                                          */}
      {/* ===================================================================== */}
      <section
        id="sec-measurements"
        className="rounded-2xl border border-card-border bg-card p-5 sm:p-6 space-y-4 scroll-mt-20"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand/15 text-brand border border-brand/25">
              <Scale className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">2. Body Measurements</h2>
              <p className="text-[11px] text-zinc-400">
                Current body weight, height ({profile?.height_unit === 'ft_in' ? 'ft/in' : 'cm'}), body fat %, and optional circumferences
              </p>
            </div>
          </div>

          {!editing.measurements ? (
            <button
              type="button"
              onClick={() => setEditing((prev) => ({ ...prev, measurements: true }))}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-700 bg-zinc-900 text-xs font-bold text-white hover:border-brand transition-colors"
            >
              <Edit3 className="h-3.5 w-3.5 text-brand" />
              <span>Edit</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => cancelSection('measurements')}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-zinc-700 bg-zinc-900 text-xs font-semibold text-zinc-300 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
                <span>Cancel</span>
              </button>
              <button
                type="button"
                disabled={savingSection === 'measurements'}
                onClick={handleSaveMeasurements}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-brand text-xs font-extrabold text-black hover:bg-brand-400 disabled:opacity-50 strap-primary"
              >
                <Save className="h-3.5 w-3.5" />
                <span>{savingSection === 'measurements' ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          )}
        </div>

        {!editing.measurements ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 text-xs">
            <div className="rounded-xl bg-zinc-950/70 border border-zinc-800/80 p-3">
              <span className="text-[10px] text-zinc-500 uppercase font-bold block">Body Weight</span>
              <span className="font-black text-white font-mono text-sm mt-0.5 block">
                {formatWeight(profile?.weight, weightUnit)}
              </span>
            </div>
            <div className="rounded-xl bg-zinc-950/70 border border-zinc-800/80 p-3">
              <span className="text-[10px] text-zinc-500 uppercase font-bold block">Height</span>
              <span className="font-black text-white font-mono text-sm mt-0.5 block">
                {profile?.height ? `${profile.height} cm` : 'Not set'}
              </span>
            </div>
            <div className="rounded-xl bg-zinc-950/70 border border-zinc-800/80 p-3">
              <span className="text-[10px] text-zinc-500 uppercase font-bold block">Body Fat</span>
              <span className="font-bold text-white font-mono mt-0.5 block">
                {profile?.body_fat_percentage != null ? `${profile.body_fat_percentage}%` : '—'}
              </span>
            </div>
            <div className="rounded-xl bg-zinc-950/70 border border-zinc-800/80 p-3">
              <span className="text-[10px] text-zinc-500 uppercase font-bold block">Chest</span>
              <span className="font-bold text-white font-mono mt-0.5 block">
                {profile?.chest_cm != null ? `${profile.chest_cm} cm` : '—'}
              </span>
            </div>
            <div className="rounded-xl bg-zinc-950/70 border border-zinc-800/80 p-3">
              <span className="text-[10px] text-zinc-500 uppercase font-bold block">Waist</span>
              <span className="font-bold text-white font-mono mt-0.5 block">
                {profile?.waist_cm != null ? `${profile.waist_cm} cm` : '—'}
              </span>
            </div>
            <div className="rounded-xl bg-zinc-950/70 border border-zinc-800/80 p-3">
              <span className="text-[10px] text-zinc-500 uppercase font-bold block">Hips</span>
              <span className="font-bold text-white font-mono mt-0.5 block">
                {profile?.hips_cm != null ? `${profile.hips_cm} cm` : '—'}
              </span>
            </div>
            <div className="rounded-xl bg-zinc-950/70 border border-zinc-800/80 p-3">
              <span className="text-[10px] text-zinc-500 uppercase font-bold block">Arms</span>
              <span className="font-bold text-white font-mono mt-0.5 block">
                {profile?.arms_cm != null ? `${profile.arms_cm} cm` : '—'}
              </span>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                  Current Body Weight ({weightUnit})
                </label>
                <NumericInput
                  min={weightUnit === 'lb' ? 44 : 20}
                  max={weightUnit === 'lb' ? 1102 : 500}
                  allowDecimal
                  placeholder={weightUnit === 'lb' ? 'e.g. 164.2' : 'e.g. 74.5'}
                  value={measDraft.weight_display}
                  onValueChange={(v) => setMeasDraft({ ...measDraft, weight_display: v })}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-white focus:border-brand focus:outline-none"
                />
                <span className="text-[10px] text-zinc-500 mt-1 block">
                  Stored canonically in kg so switching units never corrupts history.
                </span>
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

              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                  Body Fat % (Optional)
                </label>
                <NumericInput
                  min={2}
                  max={70}
                  allowDecimal
                  placeholder="Optional"
                  value={measDraft.body_fat_percentage}
                  onValueChange={(v) => setMeasDraft({ ...measDraft, body_fat_percentage: v })}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-white focus:border-brand focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div>
                <label className="block text-[10px] font-semibold text-zinc-400 mb-1">Chest (cm)</label>
                <NumericInput
                  min={30}
                  max={250}
                  allowDecimal
                  placeholder="Optional"
                  value={measDraft.chest_cm}
                  onValueChange={(v) => setMeasDraft({ ...measDraft, chest_cm: v })}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-zinc-400 mb-1">Waist (cm)</label>
                <NumericInput
                  min={30}
                  max={250}
                  allowDecimal
                  placeholder="Optional"
                  value={measDraft.waist_cm}
                  onValueChange={(v) => setMeasDraft({ ...measDraft, waist_cm: v })}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-zinc-400 mb-1">Hips (cm)</label>
                <NumericInput
                  min={30}
                  max={250}
                  allowDecimal
                  placeholder="Optional"
                  value={measDraft.hips_cm}
                  onValueChange={(v) => setMeasDraft({ ...measDraft, hips_cm: v })}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-zinc-400 mb-1">Arms (cm)</label>
                <NumericInput
                  min={10}
                  max={100}
                  allowDecimal
                  placeholder="Optional"
                  value={measDraft.arms_cm}
                  onValueChange={(v) => setMeasDraft({ ...measDraft, arms_cm: v })}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2 text-xs text-white"
                />
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ===================================================================== */}
      {/* SECTION 3: FITNESS GOALS                                              */}
      {/* ===================================================================== */}
      <section
        id="sec-goals"
        className="rounded-2xl border border-card-border bg-card p-5 sm:p-6 space-y-4 scroll-mt-20"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand/15 text-brand border border-brand/25">
              <Target className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">3. Primary Fitness Goal</h2>
              <p className="text-[11px] text-zinc-400">
                Drives your personalized Calorie Calculator options, Nutrition macros, and AI Workout Planner
              </p>
            </div>
          </div>

          {!editing.goals ? (
            <button
              type="button"
              onClick={() => setEditing((prev) => ({ ...prev, goals: true }))}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-700 bg-zinc-900 text-xs font-bold text-white hover:border-brand transition-colors"
            >
              <Edit3 className="h-3.5 w-3.5 text-brand" />
              <span>Change Goal</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => cancelSection('goals')}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-zinc-700 bg-zinc-900 text-xs font-semibold text-zinc-300 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
                <span>Cancel</span>
              </button>
              <button
                type="button"
                disabled={savingSection === 'goals'}
                onClick={handleSaveGoals}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-brand text-xs font-extrabold text-black hover:bg-brand-400 disabled:opacity-50 strap-primary"
              >
                <Save className="h-3.5 w-3.5" />
                <span>{savingSection === 'goals' ? 'Saving...' : 'Save Goal'}</span>
              </button>
            </div>
          )}
        </div>

        {!editing.goals ? (
          <div className="rounded-xl border border-brand/30 bg-brand/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand">
                Active Primary Goal
              </span>
              <h3 className="text-lg font-black text-white mt-0.5">{primaryGoalLabel}</h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                {PRIMARY_GOALS.find((g) => g.id === profile?.primary_goal)?.desc ||
                  'Select a goal to personalize calorie pace options and macro distribution.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => scrollToSection('sec-calories')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-brand/40 bg-brand/10 text-xs font-bold text-brand hover:bg-brand/20 transition-colors shrink-0 self-start sm:self-center"
            >
              <Flame className="h-3.5 w-3.5" />
              <span>View Calorie Options</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {PRIMARY_GOALS.map((g) => {
              const selected = goalsDraft.fitness_goal === g.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setGoalsDraft({ fitness_goal: g.id })}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    selected
                      ? 'border-brand bg-brand/15 shadow-glow'
                      : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-extrabold text-white">{g.label}</span>
                    {selected && <Check className="h-4 w-4 text-brand shrink-0" />}
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">{g.desc}</p>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* ===================================================================== */}
      {/* SECTION 4: WEIGHT GOALS & PROGRESS TRACKING                           */}
      {/* ===================================================================== */}
      <section
        id="sec-weight-goals"
        className="rounded-2xl border border-card-border bg-card p-5 sm:p-6 space-y-5 scroll-mt-20"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand/15 text-brand border border-brand/25">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">4. Weight Goal &amp; Progress Tracking</h2>
              <p className="text-[11px] text-zinc-400">
                Optional target body weight, auto-calculated remaining delta, and real historical weight trend
              </p>
            </div>
          </div>

          {!editing.weight_goals ? (
            <button
              type="button"
              onClick={() => setEditing((prev) => ({ ...prev, weight_goals: true }))}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-700 bg-zinc-900 text-xs font-bold text-white hover:border-brand transition-colors"
            >
              <Edit3 className="h-3.5 w-3.5 text-brand" />
              <span>Edit Weight Target</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => cancelSection('weight_goals')}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-zinc-700 bg-zinc-900 text-xs font-semibold text-zinc-300 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
                <span>Cancel</span>
              </button>
              <button
                type="button"
                disabled={savingSection === 'weight_goals'}
                onClick={handleSaveWeightGoals}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-brand text-xs font-extrabold text-black hover:bg-brand-400 disabled:opacity-50 strap-primary"
              >
                <Save className="h-3.5 w-3.5" />
                <span>{savingSection === 'weight_goals' ? 'Saving...' : 'Save Target'}</span>
              </button>
            </div>
          )}
        </div>

        {editing.weight_goals && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                Target Body Weight ({weightUnit}, Optional)
              </label>
              <NumericInput
                min={weightUnit === 'lb' ? 44 : 20}
                max={weightUnit === 'lb' ? 1102 : 500}
                allowDecimal
                placeholder="Leave blank if no weight target"
                value={weightGoalDraft.target_weight_display}
                onValueChange={(v) =>
                  setWeightGoalDraft({ ...weightGoalDraft, target_weight_display: v })
                }
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-2.5 text-xs text-white focus:border-brand focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                Calculated Weight Change
              </label>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-2.5 text-xs font-mono font-bold text-brand">
                {liveDraftWeightDelta !== null
                  ? formatWeightDelta(liveDraftWeightDelta, weightUnit)
                  : 'Enter current & target weight'}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                Target Timeline / Date (Optional)
              </label>
              <input
                type="date"
                value={weightGoalDraft.target_date}
                onChange={(e) =>
                  setWeightGoalDraft({ ...weightGoalDraft, target_date: e.target.value })
                }
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-2.5 text-xs text-white focus:border-brand focus:outline-none"
              />
            </div>
          </div>
        )}

        {weightProgress && (
          <GoalProgressCard
            progress={weightProgress}
            weightUnit={weightUnit}
            primaryGoalLabel={primaryGoalLabel}
            targetDate={profile?.target_date}
            onLogWeight={handleLogWeightCheckIn}
            onRecalculateTargets={() => scrollToSection('sec-calories')}
          />
        )}
      </section>

      {/* ===================================================================== */}
      {/* SECTION 5: TRAINING PREFERENCES (AI PLANNER SINGLE SOURCE OF TRUTH)   */}
      {/* ===================================================================== */}
      <section
        id="sec-training"
        className="rounded-2xl border border-card-border bg-card p-5 sm:p-6 space-y-4 scroll-mt-20"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand/15 text-brand border border-brand/25">
              <Dumbbell className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex flex-wrap items-center gap-2">
                <span>5. Training Preferences</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand/10 border border-brand/25 text-brand">
                  Synced with AI Planner
                </span>
              </h2>
              <p className="text-[11px] text-zinc-400">
                Frequency (1–7 days), experience, style, split, equipment, duration, preferences, and limitations
              </p>
            </div>
          </div>

          {!editing.training ? (
            <button
              type="button"
              onClick={() => setEditing((prev) => ({ ...prev, training: true }))}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-700 bg-zinc-900 text-xs font-bold text-white hover:border-brand transition-colors"
            >
              <Edit3 className="h-3.5 w-3.5 text-brand" />
              <span>Edit</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => cancelSection('training')}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-zinc-700 bg-zinc-900 text-xs font-semibold text-zinc-300 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
                <span>Cancel</span>
              </button>
              <button
                type="button"
                disabled={savingSection === 'training'}
                onClick={handleSaveTraining}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-brand text-xs font-extrabold text-black hover:bg-brand-400 disabled:opacity-50 strap-primary"
              >
                <Save className="h-3.5 w-3.5" />
                <span>{savingSection === 'training' ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          )}
        </div>

        {!editing.training ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
              <div className="rounded-xl bg-zinc-950/70 border border-zinc-800/80 p-3">
                <span className="text-[10px] text-zinc-500 uppercase font-bold block">Training Days</span>
                <span className="font-black text-brand font-mono text-sm mt-0.5 block">
                  {profile?.weekly_workout_days
                    ? `${profile.weekly_workout_days} ${profile.weekly_workout_days === 1 ? 'Day' : 'Days'}/wk`
                    : 'Not set'}
                </span>
              </div>
              <div className="rounded-xl bg-zinc-950/70 border border-zinc-800/80 p-3">
                <span className="text-[10px] text-zinc-500 uppercase font-bold block">Experience</span>
                <span className="font-bold text-white capitalize mt-0.5 block">
                  {profile?.experience_level || 'Not set'}
                </span>
              </div>
              <div className="rounded-xl bg-zinc-950/70 border border-zinc-800/80 p-3">
                <span className="text-[10px] text-zinc-500 uppercase font-bold block">Training Style</span>
                <span className="font-bold text-white capitalize mt-0.5 block">
                  {String(profile?.training_style || 'muscle_building').replace(/_/g, ' ')}
                </span>
              </div>
              <div className="rounded-xl bg-zinc-950/70 border border-zinc-800/80 p-3">
                <span className="text-[10px] text-zinc-500 uppercase font-bold block">Preferred Split</span>
                <span className="font-bold text-white mt-0.5 block truncate">
                  {WORKOUT_SPLITS.find((s) => s.id === profile?.preferred_workout_split)?.label || 'Auto'}
                </span>
              </div>
              <div className="rounded-xl bg-zinc-950/70 border border-zinc-800/80 p-3">
                <span className="text-[10px] text-zinc-500 uppercase font-bold block">Location</span>
                <span className="font-bold text-white capitalize mt-0.5 block">
                  {profile?.workout_location || 'Gym'}
                </span>
              </div>
              <div className="rounded-xl bg-zinc-950/70 border border-zinc-800/80 p-3">
                <span className="text-[10px] text-zinc-500 uppercase font-bold block">Duration</span>
                <span className="font-bold text-white font-mono mt-0.5 block">
                  {profile?.workout_duration_mins ? `${profile.workout_duration_mins} min` : 'Not set'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="rounded-xl bg-zinc-950/70 border border-zinc-800/80 p-3">
                <span className="text-[10px] text-zinc-500 uppercase font-bold block mb-1.5">
                  Available Equipment
                </span>
                {Array.isArray(profile?.equipment) && profile.equipment.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {profile.equipment.map((eq: string) => (
                      <span
                        key={eq}
                        className="px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-200"
                      >
                        {eq}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-zinc-500">Not specified</span>
                )}
              </div>
              <div className="rounded-xl bg-zinc-950/70 border border-zinc-800/80 p-3">
                <span className="text-[10px] text-zinc-500 uppercase font-bold block mb-1">
                  Exercise Preferences
                </span>
                <span className="text-zinc-300 break-words">
                  {profile?.exercise_preferences || 'None specified'}
                </span>
              </div>
              <div className="rounded-xl bg-zinc-950/70 border border-zinc-800/80 p-3">
                <span className="text-[10px] text-zinc-500 uppercase font-bold block mb-1">
                  Limitations / Restrictions
                </span>
                <span className="text-zinc-300 break-words">
                  {profile?.limitations || 'None reported'}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Training Style Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  id: 'muscle_building' as const,
                  title: 'Muscle Building',
                  desc: 'Hypertrophy volume, isolation & progressive overload splits',
                },
                {
                  id: 'powerlifting' as const,
                  title: 'Powerlifting',
                  desc: 'Squat, Bench & Deadlift focus, %1RM & peaking blocks',
                },
                {
                  id: 'general_fitness' as const,
                  title: 'General Fitness',
                  desc: 'Balanced strength, stamina, and functional conditioning',
                },
              ].map((style) => (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => setTrainingDraft({ ...trainingDraft, training_style: style.id })}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    trainingDraft.training_style === style.id
                      ? 'border-brand bg-brand/15 shadow-glow'
                      : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-extrabold text-white">
                    <span>{style.title}</span>
                    {trainingDraft.training_style === style.id && (
                      <Check className="h-4 w-4 text-brand" />
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-1">{style.desc}</p>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                  Training Days / Week (1–7)
                </label>
                <select
                  value={trainingDraft.weekly_workout_days}
                  onChange={(e) =>
                    setTrainingDraft({ ...trainingDraft, weekly_workout_days: Number(e.target.value) })
                  }
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-white focus:border-brand focus:outline-none"
                >
                  {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                    <option key={d} value={d}>
                      {d} {d === 1 ? 'Day' : 'Days'} / Week
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                  Training Experience
                </label>
                <select
                  value={trainingDraft.experience_level}
                  onChange={(e) =>
                    setTrainingDraft({ ...trainingDraft, experience_level: e.target.value })
                  }
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-white focus:border-brand focus:outline-none"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                  Preferred Split
                </label>
                <select
                  value={trainingDraft.preferred_workout_split}
                  onChange={(e) =>
                    setTrainingDraft({ ...trainingDraft, preferred_workout_split: e.target.value })
                  }
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-white focus:border-brand focus:outline-none"
                >
                  {WORKOUT_SPLITS.map((sp) => (
                    <option key={sp.id} value={sp.id}>
                      {sp.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                  Workout Location
                </label>
                <select
                  value={trainingDraft.workout_location}
                  onChange={(e) =>
                    setTrainingDraft({ ...trainingDraft, workout_location: e.target.value })
                  }
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-white focus:border-brand focus:outline-none"
                >
                  <option value="gym">Commercial Gym</option>
                  <option value="home">Home Gym</option>
                  <option value="hybrid">Hybrid (Gym + Home)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                  Session Duration (mins)
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
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-white focus:border-brand focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-300 mb-2">
                Available Equipment
              </label>
              <div className="flex flex-wrap gap-2">
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
                      className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors ${
                        active
                          ? 'border-brand bg-brand/15 text-brand'
                          : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                  Exercise Preferences (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Prefer dumbbell press over barbell, enjoy pull-ups & RDLs"
                  value={trainingDraft.exercise_preferences}
                  onChange={(e) =>
                    setTrainingDraft({ ...trainingDraft, exercise_preferences: e.target.value })
                  }
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-white focus:border-brand focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                  Training Limitations / Restrictions (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Avoid behind-the-neck press, lower-back sensitivity"
                  value={trainingDraft.limitations}
                  onChange={(e) =>
                    setTrainingDraft({ ...trainingDraft, limitations: e.target.value })
                  }
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-white focus:border-brand focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ===================================================================== */}
      {/* SECTION 6: NUTRITION PREFERENCES                                      */}
      {/* ===================================================================== */}
      <section
        id="sec-nutrition-prefs"
        className="rounded-2xl border border-card-border bg-card p-5 sm:p-6 space-y-4 scroll-mt-20"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand/15 text-brand border border-brand/25">
              <Utensils className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">6. Nutrition Preferences</h2>
              <p className="text-[11px] text-zinc-400">
                Dietary pattern, allergies, food preferences, meal cadence, and protein/calorie preferences
              </p>
            </div>
          </div>

          {!editing.nutrition_prefs ? (
            <button
              type="button"
              onClick={() => setEditing((prev) => ({ ...prev, nutrition_prefs: true }))}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-700 bg-zinc-900 text-xs font-bold text-white hover:border-brand transition-colors"
            >
              <Edit3 className="h-3.5 w-3.5 text-brand" />
              <span>Edit</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => cancelSection('nutrition_prefs')}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-zinc-700 bg-zinc-900 text-xs font-semibold text-zinc-300 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
                <span>Cancel</span>
              </button>
              <button
                type="button"
                disabled={savingSection === 'nutrition_prefs'}
                onClick={handleSaveNutritionPrefs}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-brand text-xs font-extrabold text-black hover:bg-brand-400 disabled:opacity-50 strap-primary"
              >
                <Save className="h-3.5 w-3.5" />
                <span>{savingSection === 'nutrition_prefs' ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          )}
        </div>

        {!editing.nutrition_prefs ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="rounded-xl bg-zinc-950/70 border border-zinc-800/80 p-3">
              <span className="text-[10px] text-zinc-500 uppercase font-bold block">Diet Preference</span>
              <span className="font-bold text-brand capitalize mt-0.5 block">
                {profile?.dietary_preference
                  ? String(profile.dietary_preference).replace(/_/g, ' ')
                  : 'Not set'}
              </span>
            </div>
            <div className="rounded-xl bg-zinc-950/70 border border-zinc-800/80 p-3">
              <span className="text-[10px] text-zinc-500 uppercase font-bold block">Meals / Day</span>
              <span className="font-bold text-white mt-0.5 block">
                {profile?.nutrition_preferences?.meals_per_day
                  ? `${profile.nutrition_preferences.meals_per_day} meals/day`
                  : 'Not specified'}
              </span>
            </div>
            <div className="rounded-xl bg-zinc-950/70 border border-zinc-800/80 p-3">
              <span className="text-[10px] text-zinc-500 uppercase font-bold block">Nutrition Focus</span>
              <span className="font-bold text-white mt-0.5 block">
                {profile?.nutrition_preferences?.nutrition_goal || 'Aligned with Primary Goal'}
              </span>
            </div>
            <div className="rounded-xl bg-zinc-950/70 border border-zinc-800/80 p-3">
              <span className="text-[10px] text-zinc-500 uppercase font-bold block">Protein / Calorie Pref</span>
              <span className="font-bold text-white mt-0.5 block">
                {profile?.nutrition_preferences?.protein_target_preference_g
                  ? `${profile.nutrition_preferences.protein_target_preference_g}g protein`
                  : 'Auto-calculated'}
                {profile?.nutrition_preferences?.daily_calorie_preference
                  ? ` • ${profile.nutrition_preferences.daily_calorie_preference} kcal`
                  : ''}
              </span>
            </div>
            <div className="rounded-xl bg-zinc-950/70 border border-zinc-800/80 p-3">
              <span className="text-[10px] text-zinc-500 uppercase font-bold block">Food Allergies</span>
              <span className="text-zinc-300 mt-0.5 block break-words">
                {joinCommaList(profile?.nutrition_preferences?.food_allergies) || 'None'}
              </span>
            </div>
            <div className="rounded-xl bg-zinc-950/70 border border-zinc-800/80 p-3">
              <span className="text-[10px] text-zinc-500 uppercase font-bold block">Food Restrictions</span>
              <span className="text-zinc-300 mt-0.5 block break-words">
                {joinCommaList(profile?.nutrition_preferences?.food_restrictions) || 'None'}
              </span>
            </div>
            <div className="rounded-xl bg-zinc-950/70 border border-zinc-800/80 p-3">
              <span className="text-[10px] text-zinc-500 uppercase font-bold block">Preferred Foods</span>
              <span className="text-zinc-300 mt-0.5 block break-words">
                {joinCommaList(profile?.nutrition_preferences?.preferred_foods) || 'Not specified'}
              </span>
            </div>
            <div className="rounded-xl bg-zinc-950/70 border border-zinc-800/80 p-3">
              <span className="text-[10px] text-zinc-500 uppercase font-bold block">Foods to Avoid</span>
              <span className="text-zinc-300 mt-0.5 block break-words">
                {joinCommaList(profile?.nutrition_preferences?.foods_to_avoid) || 'None'}
              </span>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-300 mb-2">
                Dietary Preference
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {DIET_OPTIONS.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setNutritionDraft({ ...nutritionDraft, diet_preference: d.id })}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-colors ${
                      nutritionDraft.diet_preference === d.id
                        ? 'border-brand bg-brand/15 text-brand'
                        : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                  Meals per Day (Optional)
                </label>
                <NumericInput
                  min={1}
                  max={10}
                  allowDecimal={false}
                  placeholder="e.g. 4"
                  value={nutritionDraft.meals_per_day}
                  onValueChange={(v) => setNutritionDraft({ ...nutritionDraft, meals_per_day: v })}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-white focus:border-brand focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                  Daily Calorie Preference (Optional)
                </label>
                <NumericInput
                  min={800}
                  max={10000}
                  allowDecimal={false}
                  placeholder="Auto from calculator"
                  value={nutritionDraft.daily_calorie_preference}
                  onValueChange={(v) =>
                    setNutritionDraft({ ...nutritionDraft, daily_calorie_preference: v })
                  }
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-white focus:border-brand focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                  Protein Target Preference (g, Optional)
                </label>
                <NumericInput
                  min={30}
                  max={500}
                  allowDecimal={false}
                  placeholder="Auto g/kg range"
                  value={nutritionDraft.protein_target_preference_g}
                  onValueChange={(v) =>
                    setNutritionDraft({ ...nutritionDraft, protein_target_preference_g: v })
                  }
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-white focus:border-brand focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                  Nutrition Goal / Style (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. High Protein Indian Home Meals"
                  value={nutritionDraft.nutrition_goal}
                  onChange={(e) =>
                    setNutritionDraft({ ...nutritionDraft, nutrition_goal: e.target.value })
                  }
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-white focus:border-brand focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                  Food Allergies (comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Peanuts, Shellfish, Lactose"
                  value={nutritionDraft.food_allergies}
                  onChange={(e) =>
                    setNutritionDraft({ ...nutritionDraft, food_allergies: e.target.value })
                  }
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-white focus:border-brand focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                  Food Restrictions (comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Gluten-free, Low sodium, Jain"
                  value={nutritionDraft.food_restrictions}
                  onChange={(e) =>
                    setNutritionDraft({ ...nutritionDraft, food_restrictions: e.target.value })
                  }
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-white focus:border-brand focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                  Preferred Foods (comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Eggs, Paneer, Oats, Chicken Breast, Dal"
                  value={nutritionDraft.preferred_foods}
                  onChange={(e) =>
                    setNutritionDraft({ ...nutritionDraft, preferred_foods: e.target.value })
                  }
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-white focus:border-brand focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                  Foods to Avoid (comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Deep-fried snacks, Sugary sodas"
                  value={nutritionDraft.foods_to_avoid}
                  onChange={(e) =>
                    setNutritionDraft({ ...nutritionDraft, foods_to_avoid: e.target.value })
                  }
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-white focus:border-brand focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ===================================================================== */}
      {/* SECTION 7: PERSONALIZED CALORIE CALCULATOR & DAILY NUTRITION TARGETS  */}
      {/* ===================================================================== */}
      <section
        id="sec-calories"
        className="rounded-2xl border border-card-border bg-card p-5 sm:p-6 space-y-4 scroll-mt-20"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand/15 text-brand border border-brand/25">
              <Flame className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">
                7. Personalized Calorie Calculator &amp; Daily Nutrition Targets
              </h2>
              <p className="text-[11px] text-zinc-400">
                Mifflin-St Jeor BMR/TDEE, goal-specific calorie options, safety checks, and macro customization
              </p>
            </div>
          </div>
          <Link
            href="/nutrition"
            className="text-xs font-bold text-brand hover:underline inline-flex items-center gap-1"
          >
            <span>Open Nutrition Tracker</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

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
      </section>

      {/* ===================================================================== */}
      {/* SECTION 8: ACTIVITY INFORMATION                                       */}
      {/* ===================================================================== */}
      <section
        id="sec-activity"
        className="rounded-2xl border border-card-border bg-card p-5 sm:p-6 space-y-4 scroll-mt-20"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand/15 text-brand border border-brand/25">
              <Activity className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">8. Activity &amp; Lifestyle Information</h2>
              <p className="text-[11px] text-zinc-400">
                Daily activity tier, optional steps, outside-gym movement, and tracked sleep duration
              </p>
            </div>
          </div>

          {!editing.activity ? (
            <button
              type="button"
              onClick={() => setEditing((prev) => ({ ...prev, activity: true }))}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-700 bg-zinc-900 text-xs font-bold text-white hover:border-brand transition-colors"
            >
              <Edit3 className="h-3.5 w-3.5 text-brand" />
              <span>Edit</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => cancelSection('activity')}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-zinc-700 bg-zinc-900 text-xs font-semibold text-zinc-300 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
                <span>Cancel</span>
              </button>
              <button
                type="button"
                disabled={savingSection === 'activity'}
                onClick={handleSaveActivity}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-brand text-xs font-extrabold text-black hover:bg-brand-400 disabled:opacity-50 strap-primary"
              >
                <Save className="h-3.5 w-3.5" />
                <span>{savingSection === 'activity' ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          )}
        </div>

        {!editing.activity ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
            <div className="rounded-xl bg-zinc-950/70 border border-zinc-800/80 p-3">
              <span className="text-[10px] text-zinc-500 uppercase font-bold block">Daily Activity Level</span>
              <span className="font-bold text-white capitalize mt-0.5 block">
                {profile?.activity_level
                  ? String(profile.activity_level).replace(/_/g, ' ')
                  : 'Not set'}
              </span>
            </div>
            <div className="rounded-xl bg-zinc-950/70 border border-zinc-800/80 p-3">
              <span className="text-[10px] text-zinc-500 uppercase font-bold block">Avg Daily Steps</span>
              <span className="font-bold text-white font-mono mt-0.5 block">
                {profile?.daily_steps_avg != null
                  ? `${Number(profile.daily_steps_avg).toLocaleString()} steps`
                  : 'Not tracked'}
              </span>
            </div>
            <div className="rounded-xl bg-zinc-950/70 border border-zinc-800/80 p-3">
              <span className="text-[10px] text-zinc-500 uppercase font-bold block">Training Frequency</span>
              <span className="font-bold text-brand font-mono mt-0.5 block">
                {profile?.weekly_workout_days ? `${profile.weekly_workout_days} days/wk` : 'Not set'}
              </span>
            </div>
            <div className="rounded-xl bg-zinc-950/70 border border-zinc-800/80 p-3">
              <span className="text-[10px] text-zinc-500 uppercase font-bold block">Sleep Duration</span>
              <span className="font-bold text-white font-mono mt-0.5 block">
                {latestSleep?.sleep_hours != null
                  ? `${latestSleep.sleep_hours} hrs (logged)`
                  : profile?.sleep_hours_avg != null
                  ? `${profile.sleep_hours_avg} hrs avg`
                  : 'Not tracked'}
              </span>
            </div>
            <div className="rounded-xl bg-zinc-950/70 border border-zinc-800/80 p-3 col-span-2 sm:col-span-1">
              <span className="text-[10px] text-zinc-500 uppercase font-bold block">Outside Workouts</span>
              <span className="text-zinc-300 mt-0.5 block break-words">
                {profile?.activity_notes || 'Not specified'}
              </span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                Daily Activity Level
              </label>
              <select
                value={activityDraft.activity_level}
                onChange={(e) => setActivityDraft({ ...activityDraft, activity_level: e.target.value })}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-white focus:border-brand focus:outline-none"
              >
                <option value="sedentary">Sedentary (Desk-bound)</option>
                <option value="lightly_active">Lightly Active (Light walking/standing)</option>
                <option value="moderately_active">Moderately Active (Regular daily movement)</option>
                <option value="very_active">Very Active (Physical job / high movement)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                Average Daily Steps (Optional)
              </label>
              <NumericInput
                min={0}
                max={100000}
                allowDecimal={false}
                placeholder="Leave blank if untracked"
                value={activityDraft.daily_steps_avg}
                onValueChange={(v) => setActivityDraft({ ...activityDraft, daily_steps_avg: v })}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-white focus:border-brand focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                Typical Sleep Duration (hrs, Optional)
              </label>
              <NumericInput
                min={0}
                max={24}
                allowDecimal
                placeholder="Leave blank if untracked"
                value={activityDraft.sleep_hours_avg}
                onValueChange={(v) => setActivityDraft({ ...activityDraft, sleep_hours_avg: v })}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-white focus:border-brand focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                General Activity Outside Workouts
              </label>
              <input
                type="text"
                placeholder="e.g. Desk work + evening walk, cycling"
                value={activityDraft.activity_notes}
                onChange={(e) => setActivityDraft({ ...activityDraft, activity_notes: e.target.value })}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-white focus:border-brand focus:outline-none"
              />
            </div>
          </div>
        )}
      </section>

      {/* ===================================================================== */}
      {/* SECTION 9: ACCOUNT SETTINGS                                           */}
      {/* ===================================================================== */}
      <section
        id="sec-account"
        className="rounded-2xl border border-card-border bg-card p-5 sm:p-6 space-y-4 scroll-mt-20"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand/15 text-brand border border-brand/25">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">9. Account Settings &amp; Membership</h2>
              <p className="text-[11px] text-zinc-400">
                Email identity, subscription plan, and Google Sign-In linking
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Email & Google Link */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4 space-y-3">
            <div>
              <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">
                Account Email (Read-Only)
              </label>
              <input
                type="email"
                disabled
                value={profile?.email || ''}
                placeholder="Connected via Social Login"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 p-2.5 text-xs text-zinc-400 cursor-not-allowed"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <span className="text-xs text-zinc-400">
                Google Sign-In:{' '}
                <strong className={profile?.google_linked ? 'text-emerald-400' : 'text-zinc-300'}>
                  {profile?.google_linked ? 'Linked' : 'Not Linked'}
                </strong>
              </span>
              <button
                type="button"
                disabled={linkingGoogle}
                onClick={handleToggleGoogleLink}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors ${
                  profile?.google_linked
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                    : 'border-zinc-700 bg-zinc-900 text-zinc-200 hover:border-brand'
                }`}
              >
                {profile?.google_linked ? (
                  <>
                    <Unlink className="h-3.5 w-3.5" />
                    <span>Unlink Google</span>
                  </>
                ) : (
                  <>
                    <Link2 className="h-3.5 w-3.5 text-brand" />
                    <span>Link Google Sign-In</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Membership Tier */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4 flex flex-col justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                Membership Tier
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-base font-black text-white">
                  {isPremium ? 'STRAP Premium Plan' : 'STRAP Free Plan'}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isPremium
                      ? 'text-brand bg-brand/10 border border-brand/30'
                      : 'text-zinc-400 bg-zinc-800'
                  }`}
                >
                  {isPremium ? 'ACTIVE' : 'BASIC'}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                {isPremium
                  ? `Valid until ${
                      subscription?.current_period_end
                        ? new Date(subscription.current_period_end).toLocaleDateString()
                        : 'Active'
                    }.`
                  : 'Upgrade to STRAP Premium for unlimited AI Workout Splits, complete exercise library, and advanced analytics.'}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {isPremium ? (
                <Link
                  href="/payment-history"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs font-semibold text-white hover:border-brand transition-colors"
                >
                  Payment History
                </Link>
              ) : (
                <Link
                  href="/checkout"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand text-xs font-bold text-black hover:bg-brand-400 transition-colors shadow-glow strap-primary"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Upgrade to Premium</span>
                </Link>
              )}
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-semibold text-zinc-300 hover:text-white transition-colors"
              >
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
