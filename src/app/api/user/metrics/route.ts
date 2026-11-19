import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { handleError, json, parseBody, requireUser } from '@/lib/api';

const num = (min: number, max: number) => z.coerce.number().min(min).max(max);
const optNum = (min: number, max: number) =>
  z.preprocess((v) => (v === '' || v === null || v === undefined ? undefined : v), z.coerce.number().min(min).max(max).optional());

const schema = z.object({
  age: num(10, 100),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).default('prefer_not_to_say'),
  height_cm: num(50, 272),
  current_weight_kg: num(20, 500),
  body_fat_pct: optNum(2, 70),
  chest_cm: optNum(30, 250),
  waist_cm: optNum(30, 250),
  hips_cm: optNum(30, 250),
  arms_cm: optNum(10, 100),
  experience_level: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
  workout_location: z.enum(['gym', 'home', 'hybrid']).default('gym'),
  workout_duration_mins: num(10, 240).default(60),
  equipment: z.array(z.string().max(40)).max(30).default([]),
  strength_levels: z.record(z.coerce.number().min(0).max(1000)).default({}),
  limitations: z.string().max(1000).default(''),
  diet_preference: z.enum(['vegetarian', 'eggetarian', 'non_vegetarian', 'vegan', 'other']).default('non_vegetarian'),
  sleep_hours_avg: num(0, 24).default(7),
  daily_activity_level: z.enum(['sedentary', 'lightly_active', 'moderately_active', 'very_active']).default('moderately_active'),
  daily_steps_avg: num(0, 100000).default(6000),
  rest_days_preferred: num(0, 7).default(2),
});

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireUser(req);
    const metrics = await db.selectOne('fitness_metrics', { eq: { user_id: user.id } });
    return json({ metrics });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireUser(req);
    const m = await parseBody(req, schema);
    const row = { user_id: user.id, ...m, body_fat_pct: m.body_fat_pct ?? null, chest_cm: m.chest_cm ?? null, waist_cm: m.waist_cm ?? null, hips_cm: m.hips_cm ?? null, arms_cm: m.arms_cm ?? null };
    const saved = await db.upsert('fitness_metrics', row, 'user_id');

    // Mirror headline numbers on the profile and log a weight measurement.
    await db.update('user_profiles', { id: user.id }, {
      age: m.age, gender: m.gender, height: m.height_cm, weight: m.current_weight_kg,
      body_fat_percentage: m.body_fat_pct ?? null, experience_level: m.experience_level,
      dietary_preference: m.diet_preference, activity_level: m.daily_activity_level,
    });
    return json({ success: true, metrics: saved });
  } catch (e) {
    return handleError(e);
  }
}
