import crypto from 'crypto';

export interface ProfilePlanSnapshot {
  weekly_workout_days: number | null;
  primary_goal: string | null;
  experience_level: string | null;
  training_style: 'powerlifting' | 'muscle_building';
  workout_location: string;
  equipment: string[];
  workout_duration_mins: number | null;
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
 *  2. Detect when Profile changed (e.g., 4 days -> 6 days/week) so stale plans are never returned.
 */
export function buildProfilePlanSnapshot(ctx: {
  profile?: Record<string, any> | null;
  metrics?: Record<string, any> | null;
  goal?: Record<string, any> | null;
  trainingStyle?: 'powerlifting' | 'muscle_building' | null;
}): ProfileCompletenessCheck {
  const profile = ctx.profile || {};
  const metrics = ctx.metrics || {};
  const goal = ctx.goal || {};

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

  const training_style: 'powerlifting' | 'muscle_building' =
    ctx.trainingStyle === 'powerlifting' ? 'powerlifting' : 'muscle_building';

  const workout_location =
    (typeof metrics.workout_location === 'string' && metrics.workout_location.trim()) || 'gym';

  const equipment = Array.isArray(metrics.equipment)
    ? [...metrics.equipment].map((e) => String(e).trim().toLowerCase()).filter(Boolean).sort()
    : [];

  const durationNum =
    metrics.workout_duration_mins != null ? Number(metrics.workout_duration_mins) : null;
  const workout_duration_mins =
    durationNum !== null && Number.isFinite(durationNum) && durationNum > 0 ? durationNum : null;

  const limitations =
    typeof metrics.limitations === 'string' ? metrics.limitations.trim() : '';

  const ageNum = metrics.age ?? profile.age ?? null;
  const age = ageNum !== null && Number.isFinite(Number(ageNum)) && Number(ageNum) > 0 ? Number(ageNum) : null;

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
    workout_location,
    equipment,
    workout_duration_mins,
    limitations,
    age,
    gender,
    height_cm,
    current_weight_kg,
  };

  // Hash covers all training-plan-determining preferences
  const hashPayload = JSON.stringify({
    weekly_workout_days: snapshot.weekly_workout_days,
    primary_goal: snapshot.primary_goal,
    experience_level: snapshot.experience_level,
    training_style: snapshot.training_style,
    workout_location: snapshot.workout_location,
    equipment: snapshot.equipment,
    workout_duration_mins: snapshot.workout_duration_mins,
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
