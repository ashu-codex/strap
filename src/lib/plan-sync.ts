import crypto from 'crypto';
import { resolveEffectiveAge } from '@/lib/nutrition-calc';

export interface ProfilePlanSnapshot {
  weekly_workout_days: number | null;
  primary_goal: string | null;
  experience_level: string | null;
  training_style: 'powerlifting' | 'muscle_building' | 'general_fitness';
  preferred_workout_split: string;
  workout_location: string;
  equipment: string[];
  workout_duration_mins: number | null;
  exercise_preferences: string;
  limitations: string;
  age: number | null;
  gender: string | null;
  height_cm: number | null;
  current_weight_kg: number | null;
}

export interface ProfileCompletenessCheck {
  complete: boolean;
  missingFields: string[];
  snapshot: ProfilePlanSnapshot;
  hash: string;
}

/**
 * Build a deterministic, single-source-of-truth snapshot from the user's latest
 * Supabase Profile, Metrics, Goals, and Preferences records.
 *
 * Used by AI Planner to:
 *  1. Verify required profile preferences exist (never invent fake defaults).
 *  2. Detect when Profile changed (e.g., 6 days -> 4 days/week, goal, equipment, split, style, limitations)
 *     so outdated plans are NEVER presented as newly generated plans.
 */
export function buildProfilePlanSnapshot(ctx: {
  profile?: Record<string, any> | null;
  metrics?: Record<string, any> | null;
  goal?: Record<string, any> | null;
  preferences?: Record<string, any> | null;
  trainingStyle?: 'powerlifting' | 'muscle_building' | 'general_fitness' | null;
}): ProfileCompletenessCheck {
  const profile = ctx.profile || {};
  const metrics = ctx.metrics || {};
  const goal = ctx.goal || {};
  const prefs = ctx.preferences || {};

  const rawDays = goal.weekly_workout_days ?? goal.workout_days_per_week ?? null;
  const parsedDays = rawDays !== null && rawDays !== undefined ? Number(rawDays) : null;
  const weekly_workout_days =
    parsedDays !== null && Number.isInteger(parsedDays) && parsedDays >= 1 && parsedDays <= 7
      ? parsedDays
      : null;

  const primary_goal =
    (typeof goal.primary_goal === 'string' && goal.primary_goal.trim()) ||
    (typeof profile.fitness_goal === 'string' && profile.fitness_goal.trim()) ||
    null;

  const experience_level =
    (typeof metrics.experience_level === 'string' && metrics.experience_level.trim()) ||
    (typeof profile.experience_level === 'string' && profile.experience_level.trim()) ||
    null;

  const rawStyle = ctx.trainingStyle || prefs.training_style || 'muscle_building';
  const training_style: 'powerlifting' | 'muscle_building' | 'general_fitness' =
    rawStyle === 'powerlifting'
      ? 'powerlifting'
      : rawStyle === 'general_fitness'
      ? 'general_fitness'
      : 'muscle_building';

  const preferred_workout_split =
    typeof prefs.preferred_workout_split === 'string' && prefs.preferred_workout_split.trim()
      ? prefs.preferred_workout_split.trim()
      : 'auto';

  const workout_location =
    (typeof metrics.workout_location === 'string' && metrics.workout_location.trim()) || 'gym';

  const equipment = Array.isArray(metrics.equipment)
    ? [...metrics.equipment].map((e) => String(e).trim().toLowerCase()).filter(Boolean).sort()
    : [];

  const durationNum =
    metrics.workout_duration_mins != null ? Number(metrics.workout_duration_mins) : null;
  const workout_duration_mins =
    durationNum !== null && Number.isFinite(durationNum) && durationNum > 0 ? durationNum : null;

  const exercise_preferences =
    typeof prefs.exercise_preferences === 'string' ? prefs.exercise_preferences.trim() : '';

  const limitations =
    typeof metrics.limitations === 'string' ? metrics.limitations.trim() : '';

  const age = resolveEffectiveAge(metrics.age ?? profile.age ?? null, prefs.date_of_birth ?? profile.date_of_birth ?? null);

  const gender =
    (typeof metrics.gender === 'string' && metrics.gender.trim()) ||
    (typeof profile.gender === 'string' && profile.gender.trim()) ||
    null;

  const heightNum = metrics.height_cm ?? profile.height ?? null;
  const height_cm =
    heightNum !== null && Number.isFinite(Number(heightNum)) && Number(heightNum) > 0
      ? Number(heightNum)
      : null;

  const weightNum = metrics.current_weight_kg ?? profile.weight ?? null;
  const current_weight_kg =
    weightNum !== null && Number.isFinite(Number(weightNum)) && Number(weightNum) > 0
      ? Number(weightNum)
      : null;

  const missingFields: string[] = [];
  if (weekly_workout_days === null) missingFields.push('Training Days per Week');
  if (!primary_goal) missingFields.push('Primary Fitness Goal');
  if (!experience_level) missingFields.push('Training Experience Level');

  const snapshot: ProfilePlanSnapshot = {
    weekly_workout_days,
    primary_goal,
    experience_level,
    training_style,
    preferred_workout_split,
    workout_location,
    equipment,
    workout_duration_mins,
    exercise_preferences,
    limitations,
    age,
    gender,
    height_cm,
    current_weight_kg,
  };

  // Hash covers ALL training-plan-determining preferences from Profile
  const hashPayload = JSON.stringify({
    weekly_workout_days: snapshot.weekly_workout_days,
    primary_goal: snapshot.primary_goal,
    experience_level: snapshot.experience_level,
    training_style: snapshot.training_style,
    preferred_workout_split: snapshot.preferred_workout_split,
    workout_location: snapshot.workout_location,
    equipment: snapshot.equipment,
    workout_duration_mins: snapshot.workout_duration_mins,
    exercise_preferences: snapshot.exercise_preferences,
    limitations: snapshot.limitations,
  });

  const hash = crypto.createHash('sha256').update(hashPayload).digest('hex').slice(0, 16);

  return {
    complete: missingFields.length === 0,
    missingFields,
    snapshot,
    hash,
  };
}
