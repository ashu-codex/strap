import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { handleError, json, parseBody, requireUser } from '@/lib/api';
import { invalidateAuthCache } from '@/lib/auth-helpers';
import { MAX_HEIGHT_CM, MIN_HEIGHT_CM } from '@/lib/height';
import {
  calculateNutritionTargets,
  calculatePersonalizedNutritionPlan,
  resolveEffectiveAge,
} from '@/lib/nutrition-calc';
import { analyzeWeightProgress } from '@/lib/weight-progress';

export const dynamic = 'force-dynamic';

const VALID_GOALS = [
  'muscle_gain',
  'fat_loss',
  'weight_gain',
  'weight_loss',
  'recomposition',
  'maintenance',
  'strength',
  'general_fitness',
  'endurance',
] as const;

const VALID_DIETS = ['vegetarian', 'eggetarian', 'non_vegetarian', 'vegan', 'other'] as const;

async function buildUnifiedProfileResponse(user: any) {
  const [row, prefs, metrics, goal, measurements, latestSleepRows] = await Promise.all([
    db.selectOne('user_profiles', { eq: { id: user.id } }),
    db.selectOne('user_preferences', { eq: { user_id: user.id } }).catch(() => null),
    db.selectOne('fitness_metrics', { eq: { user_id: user.id } }).catch(() => null),
    db.selectOne('fitness_goals', { eq: { user_id: user.id } }).catch(() => null),
    db
      .select('body_measurements', {
        eq: { user_id: user.id },
        order: ['recorded_date', 'asc'],
        limit: 365,
      })
      .catch(() => []),
    db
      .select('sleep_logs', {
        eq: { user_id: user.id },
        order: ['log_date', 'desc'],
        limit: 1,
      })
      .catch(() => []),
  ]);

  const p = (prefs?.preferences || {}) as Record<string, any>;
  const heightUnit = row?.height_unit || p.height_unit || 'cm';
  const weightUnit = row?.weight_unit || p.weight_unit || 'kg';
  const dateOfBirth: string | null = row?.date_of_birth || p.date_of_birth || null;
  const trainingStyle =
    p.training_style === 'powerlifting'
      ? 'powerlifting'
      : p.training_style === 'general_fitness'
      ? 'general_fitness'
      : 'muscle_building';

  const customTargets = p.custom_nutrition_targets || null;
  const nutritionPrefs = (p.nutrition_preferences || {}) as Record<string, any>;
  const selectedCalorieOptionId: string | null = p.selected_calorie_option_id || null;

  const latestMeas =
    Array.isArray(measurements) && measurements.length > 0
      ? measurements[measurements.length - 1]
      : null;

  const realAge = resolveEffectiveAge(metrics?.age ?? row?.age ?? null, dateOfBirth);
  const realHeight = metrics?.height_cm ?? row?.height ?? null;
  const realWeight = metrics?.current_weight_kg ?? row?.weight ?? latestMeas?.weight_kg ?? null;
  const realGender = metrics?.gender ?? row?.gender ?? null;
  const realActivity = metrics?.daily_activity_level ?? row?.activity_level ?? null;
  const realExperience = metrics?.experience_level ?? row?.experience_level ?? null;
  const realGoal = goal?.primary_goal ?? row?.fitness_goal ?? null;
  const realDiet =
    nutritionPrefs.diet_preference ?? metrics?.diet_preference ?? row?.dietary_preference ?? null;
  const realWorkoutDays = goal?.weekly_workout_days ?? null;
  const realTargetWeight = goal?.target_weight_kg ?? null;

  const nutritionEngine = calculatePersonalizedNutritionPlan({
    age: realAge,
    date_of_birth: dateOfBirth,
    gender: realGender,
    height_cm: realHeight,
    weight_kg: realWeight,
    target_weight_kg: realTargetWeight,
    activity_level: realActivity,
    daily_steps_avg: metrics?.daily_steps_avg ?? null,
    weekly_workout_days: realWorkoutDays,
    experience_level: realExperience,
    primary_goal: realGoal,
    training_style: trainingStyle,
    selected_calorie_option_id: selectedCalorieOptionId,
    protein_target_preference_g: nutritionPrefs.protein_target_preference_g ?? null,
    custom_overrides: customTargets,
  });

  const calculatedTargets = nutritionEngine.isComplete
    ? calculateNutritionTargets({
        age: realAge,
        date_of_birth: dateOfBirth,
        gender: realGender,
        height_cm: realHeight,
        weight_kg: realWeight,
        target_weight_kg: realTargetWeight,
        activity_level: realActivity,
        daily_steps_avg: metrics?.daily_steps_avg ?? null,
        weekly_workout_days: realWorkoutDays,
        experience_level: realExperience,
        primary_goal: realGoal,
        training_style: trainingStyle,
        selected_calorie_option_id: selectedCalorieOptionId,
        protein_target_preference_g: nutritionPrefs.protein_target_preference_g ?? null,
        custom_overrides: customTargets,
      })
    : null;

  const weightProgress = analyzeWeightProgress({
    measurements: (Array.isArray(measurements) ? measurements : []) as any[],
    profileWeightKg: realWeight,
    targetWeightKg: realTargetWeight,
    primaryGoal: realGoal,
  });

  const latestSleep = Array.isArray(latestSleepRows) && latestSleepRows.length > 0 ? latestSleepRows[0] : null;

  return {
    profile: {
      ...user,
      full_name: row?.full_name ?? user.full_name ?? '',
      email: row?.email ?? user.email ?? '',
      avatar_url: row?.avatar_url ?? user.avatar_url ?? null,
      date_of_birth: dateOfBirth,
      age: realAge,
      gender: realGender,
      height: realHeight != null ? Number(realHeight) : null,
      weight: realWeight != null ? Number(realWeight) : null,
      body_fat_percentage: metrics?.body_fat_pct ?? row?.body_fat_percentage ?? null,
      height_unit: heightUnit,
      weight_unit: weightUnit,
      primary_goal: realGoal,
      target_weight_kg: realTargetWeight != null ? Number(realTargetWeight) : null,
      desired_weight_change_kg:
        realWeight != null && realTargetWeight != null
          ? Math.round((Number(realTargetWeight) - Number(realWeight)) * 10) / 10
          : p.desired_weight_change_kg ?? null,
      target_date: goal?.target_date ?? null,
      weekly_workout_days: realWorkoutDays,
      experience_level: realExperience,
      training_style: trainingStyle,
      preferred_workout_split: p.preferred_workout_split || 'auto',
      workout_location: metrics?.workout_location ?? null,
      workout_duration_mins: metrics?.workout_duration_mins ?? null,
      equipment: Array.isArray(metrics?.equipment) ? metrics.equipment : [],
      exercise_preferences: p.exercise_preferences || '',
      limitations: metrics?.limitations || '',
      dietary_preference: realDiet,
      nutrition_preferences: {
        diet_preference: realDiet,
        food_allergies: Array.isArray(nutritionPrefs.food_allergies) ? nutritionPrefs.food_allergies : [],
        food_restrictions: Array.isArray(nutritionPrefs.food_restrictions) ? nutritionPrefs.food_restrictions : [],
        preferred_foods: Array.isArray(nutritionPrefs.preferred_foods) ? nutritionPrefs.preferred_foods : [],
        foods_to_avoid: Array.isArray(nutritionPrefs.foods_to_avoid) ? nutritionPrefs.foods_to_avoid : [],
        meals_per_day: nutritionPrefs.meals_per_day ?? null,
        daily_calorie_preference: nutritionPrefs.daily_calorie_preference ?? null,
        protein_target_preference_g: nutritionPrefs.protein_target_preference_g ?? null,
        nutrition_goal: nutritionPrefs.nutrition_goal ?? null,
      },
      activity_level: realActivity,
      daily_steps_avg: metrics?.daily_steps_avg ?? null,
      activity_notes: p.activity_notes || '',
      sleep_hours_avg: metrics?.sleep_hours_avg ?? (latestSleep?.sleep_hours != null ? Number(latestSleep.sleep_hours) : null),
      rest_days_preferred: metrics?.rest_days_preferred ?? null,
      selected_calorie_option_id: nutritionEngine.selectedOptionId,
      custom_nutrition_targets: customTargets,
      calculated_targets: calculatedTargets,
      has_biometrics: nutritionEngine.isComplete,
      auth_origin: p.auth_origin || 'email',
      google_linked: Boolean(p.google_linked),
      // Circumferences
      chest_cm: metrics?.chest_cm ?? null,
      waist_cm: metrics?.waist_cm ?? null,
      hips_cm: metrics?.hips_cm ?? null,
      arms_cm: metrics?.arms_cm ?? null,
    },
    goal: goal || null,
    metrics: metrics ? { ...metrics, height_unit: heightUnit, weight_unit: weightUnit } : null,
    nutritionEngine,
    measurements: Array.isArray(measurements) ? measurements : [],
    weightProgress,
    latestSleep,
  };
}

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireUser(req, { bypassCache: true });
    const bundle = await buildUnifiedProfileResponse(user);
    return json(bundle);
  } catch (e) {
    return handleError(e);
  }
}

const optNullableNum = (min: number, max: number) =>
  z.preprocess(
    (v) => (v === '' ? null : v),
    z.coerce.number().min(min).max(max).nullable().optional()
  );

const stringListSchema = z
  .array(z.string().trim().min(1).max(60))
  .max(30)
  .optional();

// Allow-list: role, email, id and subscription fields can NEVER be changed here.
const schema = z
  .object({
    full_name: z.string().trim().min(1).max(80).optional(),
    avatar_url: z.string().url().max(500).nullable().optional(),
    age: optNullableNum(10, 100),
    date_of_birth: z
      .preprocess(
        (v) => (v === '' ? null : v),
        z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be YYYY-MM-DD').nullable().optional()
      ),
    gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).nullable().optional(),
    height: optNullableNum(MIN_HEIGHT_CM, MAX_HEIGHT_CM),
    height_unit: z.enum(['cm', 'ft_in']).optional(),
    weight: optNullableNum(20, 500),
    weight_unit: z.enum(['kg', 'lb']).optional(),
    body_fat_percentage: optNullableNum(2, 70),
    chest_cm: optNullableNum(30, 250),
    waist_cm: optNullableNum(30, 250),
    hips_cm: optNullableNum(30, 250),
    arms_cm: optNullableNum(10, 100),
    log_weight_entry: z.boolean().optional(),

    // Fitness Goals & Weight Goal
    fitness_goal: z.enum(VALID_GOALS).nullable().optional(),
    target_weight_kg: optNullableNum(20, 500),
    desired_weight_change_kg: optNullableNum(-250, 250),
    target_date: z
      .preprocess(
        (v) => (v === '' ? null : v),
        z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Target date must be YYYY-MM-DD').nullable().optional()
      ),

    // Training Preferences
    weekly_workout_days: z.coerce.number().int().min(1).max(7).optional(),
    experience_level: z.enum(['beginner', 'intermediate', 'advanced']).nullable().optional(),
    training_style: z.enum(['muscle_building', 'powerlifting', 'general_fitness']).optional(),
    preferred_workout_split: z.string().trim().max(60).nullable().optional(),
    workout_location: z.enum(['gym', 'home', 'hybrid']).nullable().optional(),
    workout_duration_mins: optNullableNum(10, 240),
    equipment: z.array(z.string().trim().max(40)).max(30).optional(),
    exercise_preferences: z.string().trim().max(600).optional(),
    limitations: z.string().trim().max(1000).optional(),

    // Nutrition Preferences & Calorie / Macro Engine
    dietary_preference: z.enum(VALID_DIETS).nullable().optional(),
    nutrition_preferences: z
      .object({
        diet_preference: z.enum(VALID_DIETS).nullable().optional(),
        food_allergies: stringListSchema,
        food_restrictions: stringListSchema,
        preferred_foods: stringListSchema,
        foods_to_avoid: stringListSchema,
        meals_per_day: optNullableNum(1, 10),
        daily_calorie_preference: optNullableNum(800, 10000),
        protein_target_preference_g: optNullableNum(30, 500),
        nutrition_goal: z.string().trim().max(80).nullable().optional(),
      })
      .optional(),
    selected_calorie_option_id: z.string().trim().max(60).nullable().optional(),
    custom_nutrition_targets: z
      .object({
        enabled: z.boolean().optional(),
        target_calories: optNullableNum(800, 10000),
        protein_g: optNullableNum(20, 600),
        carbs_g: optNullableNum(0, 1500),
        fats_g: optNullableNum(15, 400),
        fiber_g: optNullableNum(5, 150),
        water_ml: optNullableNum(1000, 10000),
      })
      .nullable()
      .optional(),

    // Activity Information
    activity_level: z
      .enum(['sedentary', 'lightly_active', 'moderately_active', 'very_active'])
      .nullable()
      .optional(),
    daily_steps_avg: optNullableNum(0, 100000),
    activity_notes: z.string().trim().max(500).optional(),
    sleep_hours_avg: optNullableNum(0, 24),
    rest_days_preferred: optNullableNum(0, 7),
  })
  .strip();

export async function PUT(req: NextRequest) {
  try {
    const { user } = await requireUser(req);
    const patch = await parseBody(req, schema);

    const [existingProfile, existingPref, existingMetrics, existingGoal] = await Promise.all([
      db.selectOne('user_profiles', { eq: { id: user.id } }),
      db.selectOne('user_preferences', { eq: { user_id: user.id } }).catch(() => null),
      db.selectOne('fitness_metrics', { eq: { user_id: user.id } }).catch(() => null),
      db.selectOne('fitness_goals', { eq: { user_id: user.id } }).catch(() => null),
    ]);

    const prevPrefs = (existingPref?.preferences || {}) as Record<string, any>;

    // Resolve age automatically if DOB was provided
    const effectiveDob =
      patch.date_of_birth !== undefined ? patch.date_of_birth : prevPrefs.date_of_birth ?? existingProfile?.date_of_birth ?? null;
    const computedAge = resolveEffectiveAge(
      patch.age !== undefined ? patch.age : existingMetrics?.age ?? existingProfile?.age ?? null,
      effectiveDob
    );

    const effectiveDiet =
      patch.nutrition_preferences?.diet_preference !== undefined
        ? patch.nutrition_preferences.diet_preference
        : patch.dietary_preference !== undefined
        ? patch.dietary_preference
        : existingMetrics?.diet_preference ?? existingProfile?.dietary_preference ?? null;

    // 1. Update user_preferences.preferences (durable JSONB store with RLS)
    const prevNutPrefs = (prevPrefs.nutrition_preferences || {}) as Record<string, any>;
    const nextNutPrefs =
      patch.nutrition_preferences !== undefined || patch.dietary_preference !== undefined
        ? {
            ...prevNutPrefs,
            ...(patch.nutrition_preferences || {}),
            ...(effectiveDiet !== undefined ? { diet_preference: effectiveDiet } : {}),
          }
        : prevNutPrefs;

    let nextCustomTargets = prevPrefs.custom_nutrition_targets ?? null;
    if (patch.custom_nutrition_targets !== undefined) {
      if (patch.custom_nutrition_targets === null || patch.custom_nutrition_targets.enabled === false) {
        nextCustomTargets = null;
      } else {
        nextCustomTargets = {
          ...(prevPrefs.custom_nutrition_targets || {}),
          ...patch.custom_nutrition_targets,
          enabled: true,
          updated_at: new Date().toISOString(),
        };
      }
    }

    const nextPrefs: Record<string, any> = {
      ...prevPrefs,
      ...(patch.height_unit ? { height_unit: patch.height_unit } : {}),
      ...(patch.weight_unit ? { weight_unit: patch.weight_unit } : {}),
      ...(patch.date_of_birth !== undefined ? { date_of_birth: patch.date_of_birth } : {}),
      ...(patch.training_style ? { training_style: patch.training_style } : {}),
      ...(patch.preferred_workout_split !== undefined
        ? { preferred_workout_split: patch.preferred_workout_split || 'auto' }
        : {}),
      ...(patch.exercise_preferences !== undefined
        ? { exercise_preferences: patch.exercise_preferences }
        : {}),
      ...(patch.activity_notes !== undefined ? { activity_notes: patch.activity_notes } : {}),
      ...(patch.desired_weight_change_kg !== undefined
        ? { desired_weight_change_kg: patch.desired_weight_change_kg }
        : {}),
      ...(patch.selected_calorie_option_id !== undefined
        ? { selected_calorie_option_id: patch.selected_calorie_option_id }
        : {}),
      nutrition_preferences: nextNutPrefs,
      custom_nutrition_targets: nextCustomTargets,
    };

    await db.upsert(
      'user_preferences',
      {
        user_id: user.id,
        theme: existingPref?.theme || 'system',
        preferences: nextPrefs,
      },
      'user_id'
    );

    // 2. Update fitness_goals when goal / target weight / workout days / target date changed
    const goalChanged =
      patch.fitness_goal !== undefined ||
      patch.target_weight_kg !== undefined ||
      patch.weekly_workout_days !== undefined ||
      patch.target_date !== undefined;

    if (goalChanged) {
      await db.upsert(
        'fitness_goals',
        {
          user_id: user.id,
          primary_goal:
            patch.fitness_goal ??
            existingGoal?.primary_goal ??
            existingProfile?.fitness_goal ??
            'general_fitness',
          target_weight_kg:
            patch.target_weight_kg !== undefined
              ? patch.target_weight_kg
              : existingGoal?.target_weight_kg ?? null,
          weekly_workout_days:
            patch.weekly_workout_days !== undefined
              ? patch.weekly_workout_days
              : existingGoal?.weekly_workout_days ?? 4,
          target_date:
            patch.target_date !== undefined ? patch.target_date : existingGoal?.target_date ?? null,
        },
        'user_id'
      );
    }

    // 3. Update fitness_metrics when any biometric / training / activity field changed
    const metricsChanged =
      patch.age !== undefined ||
      patch.date_of_birth !== undefined ||
      patch.gender !== undefined ||
      patch.height !== undefined ||
      patch.weight !== undefined ||
      patch.body_fat_percentage !== undefined ||
      patch.chest_cm !== undefined ||
      patch.waist_cm !== undefined ||
      patch.hips_cm !== undefined ||
      patch.arms_cm !== undefined ||
      patch.experience_level !== undefined ||
      patch.workout_location !== undefined ||
      patch.workout_duration_mins !== undefined ||
      patch.equipment !== undefined ||
      patch.limitations !== undefined ||
      patch.dietary_preference !== undefined ||
      patch.nutrition_preferences?.diet_preference !== undefined ||
      patch.activity_level !== undefined ||
      patch.daily_steps_avg !== undefined ||
      patch.sleep_hours_avg !== undefined ||
      patch.rest_days_preferred !== undefined ||
      patch.height_unit !== undefined;

    if (metricsChanged) {
      const nextHeightCm =
        patch.height !== undefined
          ? patch.height !== null
            ? Math.round(patch.height * 10) / 10
            : null
          : existingMetrics?.height_cm ?? existingProfile?.height ?? null;

      const nextWeightKg =
        patch.weight !== undefined
          ? patch.weight !== null
            ? Math.round(patch.weight * 10) / 10
            : null
          : existingMetrics?.current_weight_kg ?? existingProfile?.weight ?? null;

      const metricsRow: Record<string, any> = {
        user_id: user.id,
        age: computedAge,
        gender: patch.gender !== undefined ? patch.gender : existingMetrics?.gender ?? existingProfile?.gender ?? null,
        height_cm: nextHeightCm,
        current_weight_kg: nextWeightKg,
        body_fat_pct:
          patch.body_fat_percentage !== undefined
            ? patch.body_fat_percentage
            : existingMetrics?.body_fat_pct ?? null,
        chest_cm: patch.chest_cm !== undefined ? patch.chest_cm : existingMetrics?.chest_cm ?? null,
        waist_cm: patch.waist_cm !== undefined ? patch.waist_cm : existingMetrics?.waist_cm ?? null,
        hips_cm: patch.hips_cm !== undefined ? patch.hips_cm : existingMetrics?.hips_cm ?? null,
        arms_cm: patch.arms_cm !== undefined ? patch.arms_cm : existingMetrics?.arms_cm ?? null,
        experience_level:
          patch.experience_level !== undefined
            ? patch.experience_level
            : existingMetrics?.experience_level ?? existingProfile?.experience_level ?? null,
        workout_location:
          patch.workout_location !== undefined
            ? patch.workout_location
            : existingMetrics?.workout_location ?? null,
        workout_duration_mins:
          patch.workout_duration_mins !== undefined
            ? patch.workout_duration_mins
            : existingMetrics?.workout_duration_mins ?? null,
        equipment:
          patch.equipment !== undefined
            ? patch.equipment
            : Array.isArray(existingMetrics?.equipment)
            ? existingMetrics.equipment
            : [],
        strength_levels: existingMetrics?.strength_levels || {},
        limitations:
          patch.limitations !== undefined ? patch.limitations : existingMetrics?.limitations ?? null,
        diet_preference: effectiveDiet,
        sleep_hours_avg:
          patch.sleep_hours_avg !== undefined
            ? patch.sleep_hours_avg
            : existingMetrics?.sleep_hours_avg ?? null,
        daily_activity_level:
          patch.activity_level !== undefined
            ? patch.activity_level
            : existingMetrics?.daily_activity_level ?? existingProfile?.activity_level ?? null,
        daily_steps_avg:
          patch.daily_steps_avg !== undefined
            ? patch.daily_steps_avg
            : existingMetrics?.daily_steps_avg ?? null,
        rest_days_preferred:
          patch.rest_days_preferred !== undefined
            ? patch.rest_days_preferred
            : existingMetrics?.rest_days_preferred ?? null,
      };

      try {
        await db.upsert(
          'fitness_metrics',
          { ...metricsRow, height_unit: patch.height_unit || prevPrefs.height_unit || 'cm' },
          'user_id'
        );
      } catch {
        await db.upsert('fitness_metrics', metricsRow, 'user_id');
      }
    }

    // 4. Mirror core fields onto user_profiles (graceful fallback for optional columns)
    const coreProfilePatch: Record<string, any> = {};
    if (patch.full_name !== undefined) coreProfilePatch.full_name = patch.full_name;
    if (patch.avatar_url !== undefined) coreProfilePatch.avatar_url = patch.avatar_url;
    if (patch.age !== undefined || patch.date_of_birth !== undefined) coreProfilePatch.age = computedAge;
    if (patch.gender !== undefined) coreProfilePatch.gender = patch.gender;
    if (patch.height !== undefined) {
      coreProfilePatch.height = patch.height !== null ? Math.round(patch.height * 10) / 10 : null;
    }
    if (patch.weight !== undefined) {
      coreProfilePatch.weight = patch.weight !== null ? Math.round(patch.weight * 10) / 10 : null;
    }
    if (patch.body_fat_percentage !== undefined) {
      coreProfilePatch.body_fat_percentage = patch.body_fat_percentage;
    }
    if (patch.fitness_goal !== undefined) coreProfilePatch.fitness_goal = patch.fitness_goal;
    if (patch.activity_level !== undefined) coreProfilePatch.activity_level = patch.activity_level;
    if (patch.experience_level !== undefined) coreProfilePatch.experience_level = patch.experience_level;
    if (patch.dietary_preference !== undefined || patch.nutrition_preferences?.diet_preference !== undefined) {
      coreProfilePatch.dietary_preference = effectiveDiet;
    }

    const extendedProfilePatch: Record<string, any> = {
      ...coreProfilePatch,
      ...(patch.height_unit ? { height_unit: patch.height_unit } : {}),
      ...(patch.weight_unit ? { weight_unit: patch.weight_unit } : {}),
      ...(patch.date_of_birth !== undefined ? { date_of_birth: patch.date_of_birth } : {}),
    };

    if (Object.keys(extendedProfilePatch).length > 0) {
      try {
        await db.update('user_profiles', { id: user.id }, extendedProfilePatch);
      } catch {
        // Fallback if optional migration columns (weight_unit, date_of_birth, height_unit) aren't on user_profiles yet
        if (Object.keys(coreProfilePatch).length > 0) {
          await db.update('user_profiles', { id: user.id }, coreProfilePatch);
        }
      }
    }

    // 5. Preserve weight history in body_measurements when weight changes or explicit check-in requested
    const prevWeight = existingMetrics?.current_weight_kg ?? existingProfile?.weight ?? null;
    const newWeight = patch.weight;
    const shouldAppendHistory =
      newWeight != null &&
      Number.isFinite(Number(newWeight)) &&
      Number(newWeight) > 0 &&
      (patch.log_weight_entry === true ||
        prevWeight == null ||
        Math.abs(Number(newWeight) - Number(prevWeight)) >= 0.05);

    if (shouldAppendHistory) {
      try {
        const today = new Date().toISOString().slice(0, 10);
        const existingToday = await db.selectOne('body_measurements', {
          eq: { user_id: user.id, recorded_date: today },
        });
        const measPayload = {
          weight_kg: Math.round(Number(newWeight) * 10) / 10,
          body_fat_pct:
            patch.body_fat_percentage !== undefined
              ? patch.body_fat_percentage
              : existingToday?.body_fat_pct ?? null,
          chest_cm: patch.chest_cm !== undefined ? patch.chest_cm : existingToday?.chest_cm ?? null,
          waist_cm: patch.waist_cm !== undefined ? patch.waist_cm : existingToday?.waist_cm ?? null,
          hips_cm: patch.hips_cm !== undefined ? patch.hips_cm : existingToday?.hips_cm ?? null,
          arms_cm: patch.arms_cm !== undefined ? patch.arms_cm : existingToday?.arms_cm ?? null,
        };
        if (existingToday?.id) {
          await db.update('body_measurements', { id: existingToday.id }, measPayload);
        } else {
          await db.insert('body_measurements', {
            user_id: user.id,
            recorded_date: today,
            ...measPayload,
            notes: 'Profile weight update',
          });
        }
      } catch {
        // Non-fatal; never lose profile save if measurement history fails
      }
    }

    invalidateAuthCache(user.id);

    const refreshed = await buildUnifiedProfileResponse(user);
    return json({
      success: true,
      ...refreshed,
    });
  } catch (e) {
    return handleError(e);
  }
}
