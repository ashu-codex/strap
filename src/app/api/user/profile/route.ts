import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { handleError, json, parseBody, requireUser } from '@/lib/api';
import { MAX_HEIGHT_CM, MIN_HEIGHT_CM } from '@/lib/height';
import { calculateNutritionTargets } from '@/lib/nutrition-calc';

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireUser(req);
    const [row, prefs, metrics, goal] = await Promise.all([
      db.selectOne('user_profiles', { eq: { id: user.id } }),
      db.selectOne('user_preferences', { eq: { user_id: user.id } }).catch(() => null),
      db.selectOne('fitness_metrics', { eq: { user_id: user.id } }).catch(() => null),
      db.selectOne('fitness_goals', { eq: { user_id: user.id } }).catch(() => null),
    ]);
    const p = prefs?.preferences || {};
    const heightUnit = row?.height_unit || p.height_unit || 'cm';
    const trainingStyle = p.training_style || 'muscle_building';
    const customTargets = p.custom_nutrition_targets || null;

    const calculatedTargets = calculateNutritionTargets({
      age: metrics?.age ?? row?.age,
      gender: metrics?.gender ?? row?.gender,
      height_cm: metrics?.height_cm ?? row?.height,
      weight_kg: metrics?.current_weight_kg ?? row?.weight,
      activity_level: metrics?.daily_activity_level ?? row?.activity_level,
      weekly_workout_days: goal?.weekly_workout_days ?? 4,
      experience_level: metrics?.experience_level ?? row?.experience_level,
      primary_goal: goal?.primary_goal ?? row?.fitness_goal,
      training_style: trainingStyle,
      custom_overrides: customTargets,
    });

    return json({
      profile: {
        ...user,
        height_unit: heightUnit,
        training_style: trainingStyle,
        auth_origin: p.auth_origin || 'email',
        google_linked: Boolean(p.google_linked),
        custom_nutrition_targets: customTargets,
        calculated_targets: calculatedTargets,
        primary_goal: goal?.primary_goal || row?.fitness_goal || 'muscle_gain',
        weekly_workout_days: goal?.weekly_workout_days || 4,
        ...(row
          ? {
              age: row.age,
              gender: row.gender,
              height: row.height,
              weight: row.weight,
              experience_level: row.experience_level,
              activity_level: row.activity_level,
            }
          : {}),
      },
    });
  } catch (e) {
    return handleError(e);
  }
}

// Allow-list: role, email, id and subscription fields can NEVER be changed here.
const schema = z
  .object({
    full_name: z.string().trim().min(1).max(80).optional(),
    avatar_url: z.string().url().max(500).nullable().optional(),
    age: z.number().int().min(10).max(100).nullable().optional(),
    gender: z.string().max(30).nullable().optional(),
    height: z.number().min(MIN_HEIGHT_CM).max(MAX_HEIGHT_CM).nullable().optional(),
    height_unit: z.enum(['cm', 'ft_in']).optional(),
    training_style: z.enum(['powerlifting', 'muscle_building']).optional(),
    weight: z.number().min(20).max(500).nullable().optional(),
    body_fat_percentage: z.number().min(2).max(70).nullable().optional(),
    fitness_goal: z.string().max(40).nullable().optional(),
    activity_level: z.string().max(40).nullable().optional(),
    experience_level: z.string().max(40).nullable().optional(),
    dietary_preference: z.string().max(40).nullable().optional(),
    weekly_workout_days: z.number().int().min(1).max(7).optional(),
    custom_nutrition_targets: z
      .object({
        target_calories: z.number().min(800).max(10000).optional(),
        protein_g: z.number().min(20).max(600).optional(),
        carbs_g: z.number().min(20).max(1500).optional(),
        fats_g: z.number().min(15).max(400).optional(),
        fiber_g: z.number().min(5).max(150).optional(),
        water_ml: z.number().min(1000).max(10000).optional(),
      })
      .nullable()
      .optional(),
  })
  .strip();

export async function PUT(req: NextRequest) {
  try {
    const { user } = await requireUser(req);
    const patch = await parseBody(req, schema);
    const {
      training_style,
      weekly_workout_days,
      custom_nutrition_targets,
      ...profileFields
    } = patch;

    const clean = Object.fromEntries(Object.entries(profileFields).filter(([, v]) => v !== undefined));

    // Persist preferences (height_unit, training_style, custom_nutrition_targets)
    try {
      const existingPref = await db.selectOne('user_preferences', { eq: { user_id: user.id } });
      const prevPrefs = existingPref?.preferences || {};
      const nextPrefs = {
        ...prevPrefs,
        ...(clean.height_unit ? { height_unit: clean.height_unit } : {}),
        ...(training_style ? { training_style } : {}),
        ...(custom_nutrition_targets !== undefined ? { custom_nutrition_targets } : {}),
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
    } catch {
      // Non-fatal
    }

    if (clean.fitness_goal || weekly_workout_days) {
      try {
        const existingGoal = await db.selectOne('fitness_goals', { eq: { user_id: user.id } });
        await db.upsert(
          'fitness_goals',
          {
            user_id: user.id,
            primary_goal: (clean.fitness_goal as string) || existingGoal?.primary_goal || 'muscle_gain',
            target_weight_kg: existingGoal?.target_weight_kg ?? null,
            weekly_workout_days: weekly_workout_days || existingGoal?.weekly_workout_days || 4,
            target_date: existingGoal?.target_date ?? null,
          },
          'user_id'
        );
      } catch {
        // Non-fatal
      }
    }

    if (Object.keys(clean).length) {
      try {
        await db.update('user_profiles', { id: user.id }, clean);
      } catch {
        const { height_unit: _ignored, ...withoutUnit } = clean;
        if (Object.keys(withoutUnit).length) {
          await db.update('user_profiles', { id: user.id }, withoutUnit);
        }
      }
    }

    const row = await db.selectOne('user_profiles', { eq: { id: user.id } });
    return json({
      success: true,
      profile: {
        ...user,
        full_name: row?.full_name ?? user.full_name,
        avatar_url: row?.avatar_url ?? user.avatar_url,
        height_unit: clean.height_unit || row?.height_unit || 'cm',
        training_style: training_style || 'muscle_building',
      },
    });
  } catch (e) {
    return handleError(e);
  }
}
