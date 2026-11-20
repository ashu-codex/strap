import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { handleError, json, parseBody, requireUser } from '@/lib/api';
import { MAX_HEIGHT_CM, MIN_HEIGHT_CM, HeightUnit } from '@/lib/height';

const num = (min: number, max: number) => z.coerce.number().min(min).max(max);
const optNum = (min: number, max: number) =>
  z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? undefined : v),
    z.coerce.number().min(min).max(max).optional()
  );
const orDefault = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (v === null || v === undefined ? undefined : v), schema);

const schema = z.object({
  age: num(10, 100),
  gender: orDefault(z.enum(['male', 'female', 'other', 'prefer_not_to_say']).default('prefer_not_to_say')),
  height_cm: z.coerce
    .number({ invalid_type_error: 'Height must be a valid number.' })
    .min(MIN_HEIGHT_CM, 'Height must be between 90 cm (3 ft 0 in) and 250 cm (8 ft 2 in).')
    .max(MAX_HEIGHT_CM, 'Height must be between 90 cm (3 ft 0 in) and 250 cm (8 ft 2 in).'),
  height_unit: orDefault(z.enum(['cm', 'ft_in']).default('cm')),
  current_weight_kg: num(20, 500),
  body_fat_pct: optNum(2, 70),
  chest_cm: optNum(30, 250),
  waist_cm: optNum(30, 250),
  hips_cm: optNum(30, 250),
  arms_cm: optNum(10, 100),
  experience_level: orDefault(z.enum(['beginner', 'intermediate', 'advanced']).default('beginner')),
  workout_location: orDefault(z.enum(['gym', 'home', 'hybrid']).default('gym')),
  workout_duration_mins: orDefault(num(10, 240).default(60)),
  equipment: orDefault(z.array(z.string().max(40)).max(30).default([])),
  strength_levels: orDefault(z.record(z.coerce.number().min(0).max(1000)).default({})),
  limitations: orDefault(z.string().max(1000).default('')),
  diet_preference: orDefault(
    z.enum(['vegetarian', 'eggetarian', 'non_vegetarian', 'vegan', 'other']).default('non_vegetarian')
  ),
  sleep_hours_avg: orDefault(num(0, 24).default(7)),
  daily_activity_level: orDefault(
    z.enum(['sedentary', 'lightly_active', 'moderately_active', 'very_active']).default('moderately_active')
  ),
  daily_steps_avg: orDefault(num(0, 100000).default(6000)),
  rest_days_preferred: orDefault(num(0, 7).default(2)),
});

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireUser(req);
    const [metrics, prefs, profile] = await Promise.all([
      db.selectOne('fitness_metrics', { eq: { user_id: user.id } }),
      db.selectOne('user_preferences', { eq: { user_id: user.id } }).catch(() => null),
      db.selectOne('user_profiles', { eq: { id: user.id } }).catch(() => null),
    ]);

    const preferredUnit: HeightUnit =
      (metrics?.height_unit as HeightUnit) ||
      (profile?.height_unit as HeightUnit) ||
      (prefs?.preferences?.height_unit as HeightUnit) ||
      'cm';

    return json({
      metrics: metrics ? { ...metrics, height_unit: preferredUnit } : null,
      height_unit: preferredUnit,
    });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireUser(req);
    const m = await parseBody(req, schema);
    const standardizedCm = Math.round(m.height_cm * 10) / 10;

    const baseRow = {
      user_id: user.id,
      age: m.age,
      gender: m.gender,
      height_cm: standardizedCm,
      current_weight_kg: m.current_weight_kg,
      body_fat_pct: m.body_fat_pct ?? null,
      chest_cm: m.chest_cm ?? null,
      waist_cm: m.waist_cm ?? null,
      hips_cm: m.hips_cm ?? null,
      arms_cm: m.arms_cm ?? null,
      experience_level: m.experience_level,
      workout_location: m.workout_location,
      workout_duration_mins: m.workout_duration_mins,
      equipment: m.equipment,
      strength_levels: m.strength_levels,
      limitations: m.limitations,
      diet_preference: m.diet_preference,
      sleep_hours_avg: m.sleep_hours_avg,
      daily_activity_level: m.daily_activity_level,
      daily_steps_avg: m.daily_steps_avg,
      rest_days_preferred: m.rest_days_preferred,
    };

    let saved;
    try {
      saved = await db.upsert('fitness_metrics', { ...baseRow, height_unit: m.height_unit }, 'user_id');
    } catch {
      // Fallback if height_unit column migration hasn't been applied yet
      saved = await db.upsert('fitness_metrics', baseRow, 'user_id');
    }

    // Persist height_unit in user_preferences as durable cross-schema store
    try {
      const existingPref = await db.selectOne('user_preferences', { eq: { user_id: user.id } });
      await db.upsert(
        'user_preferences',
        {
          user_id: user.id,
          theme: existingPref?.theme || 'system',
          preferences: { ...(existingPref?.preferences || {}), height_unit: m.height_unit },
        },
        'user_id'
      );
    } catch {
      // Non-fatal
    }

    // Mirror headline numbers on user_profiles
    const profilePatch = {
      age: m.age,
      gender: m.gender,
      height: standardizedCm,
      weight: m.current_weight_kg,
      body_fat_percentage: m.body_fat_pct ?? null,
      experience_level: m.experience_level,
      dietary_preference: m.diet_preference,
      activity_level: m.daily_activity_level,
    };
    try {
      await db.update('user_profiles', { id: user.id }, { ...profilePatch, height_unit: m.height_unit });
    } catch {
      await db.update('user_profiles', { id: user.id }, profilePatch);
    }

    return json({ success: true, metrics: { ...saved, height_unit: m.height_unit } });
  } catch (e) {
    return handleError(e);
  }
}
