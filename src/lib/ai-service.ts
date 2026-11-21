import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { HttpError, requirePremium, requireUser } from '@/lib/api';
import { calculateNutritionTargets } from '@/lib/nutrition-calc';

const LIMITS: Record<string, { perHour: number; perDay: number }> = {
  chat: { perHour: 60, perDay: 250 },
  plan: { perHour: 12, perDay: 40 },
  nutrition: { perHour: 12, perDay: 40 },
  recovery: { perHour: 15, perDay: 50 },
  adaptation: { perHour: 10, perDay: 30 },
};

/**
 * Auth-gate + persistent (DB-backed, multi-instance safe) rate limit for AI endpoints.
 * Every successful guard call is logged so token spend can be audited and capped.
 */
export async function aiGuard(req: NextRequest, endpoint: keyof typeof LIMITS) {
  const ctx = endpoint === 'chat' ? await requireUser(req) : await requirePremium(req);
  const lim = LIMITS[endpoint];
  const now = Date.now();
  const hour = await db.count('ai_usage_log', {
    eq: { user_id: ctx.user.id, endpoint },
    gte: { created_at: new Date(now - 3600_000).toISOString() },
  });
  const day = await db.count('ai_usage_log', {
    eq: { user_id: ctx.user.id, endpoint },
    gte: { created_at: new Date(now - 86400_000).toISOString() },
  });
  if (hour >= lim.perHour || day >= lim.perDay) {
    throw new HttpError(429, 'Coach usage limit reached. Please try again later.', 'AI_RATE_LIMITED');
  }
  await db.insert('ai_usage_log', { user_id: ctx.user.id, endpoint }).catch(() => null);
  return ctx;
}

export async function saveAiPlan(
  userId: string,
  kind: 'workout' | 'nutrition' | 'recovery' | 'adaptation',
  content: unknown
) {
  return db.insert('ai_plans', { user_id: userId, kind, content });
}

export async function latestAiPlan(
  userId: string,
  kind: 'workout' | 'nutrition' | 'recovery' | 'adaptation'
) {
  const row = await db.selectOne('ai_plans', { eq: { user_id: userId, kind }, order: ['created_at', 'desc'] });
  return row?.content ?? null;
}

export async function loadFitnessContext(userId: string) {
  const today = new Date().toISOString().slice(0, 10);

  const [profile, metrics, goal, prefRow, workouts, prs, recoveryLogs] = await Promise.all([
    db.selectOne('user_profiles', { eq: { id: userId } }).catch(() => null),
    db.selectOne('fitness_metrics', { eq: { user_id: userId } }).catch(() => null),
    db.selectOne('fitness_goals', { eq: { user_id: userId } }).catch(() => null),
    db.selectOne('user_preferences', { eq: { user_id: userId } }).catch(() => null),
    db.select('workout_logs', { eq: { user_id: userId }, order: ['completed_at', 'desc'], limit: 10 }).catch(() => []),
    db.select('progress_records', { eq: { user_id: userId }, order: ['recorded_at', 'desc'], limit: 15 }).catch(() => []),
    db.select('recovery_logs', { eq: { user_id: userId }, order: ['log_date', 'desc'], limit: 5 }).catch(() => []),
  ]);

  const prefs = (prefRow?.preferences || {}) as Record<string, any>;
  const trainingStyle: 'powerlifting' | 'muscle_building' =
    prefs.training_style === 'powerlifting' ? 'powerlifting' : 'muscle_building';

  const actual1RMs = prefs.actual_1rms || {};

  const nutritionTargets = calculateNutritionTargets({
    age: metrics?.age ?? profile?.age,
    gender: metrics?.gender ?? profile?.gender,
    height_cm: metrics?.height_cm ?? profile?.height,
    weight_kg: metrics?.current_weight_kg ?? profile?.weight,
    activity_level: metrics?.daily_activity_level ?? profile?.activity_level,
    weekly_workout_days: goal?.workout_days_per_week ?? goal?.weekly_workout_days ?? 4,
    experience_level: metrics?.fitness_level ?? metrics?.experience_level ?? profile?.experience_level,
    primary_goal: goal?.primary_goal ?? profile?.fitness_goal,
    training_style: trainingStyle,
    custom_overrides: prefs.custom_nutrition_targets || null,
  });

  const allDiaryEntries: any[] = Array.isArray(prefs.nutrition_diary_entries)
    ? prefs.nutrition_diary_entries
    : [];
  const todayEntries = allDiaryEntries.filter((e) => e.date === today);
  const waterByDate: Record<string, number> = prefs.water_by_date || {};
  const todayWaterMl = Number(waterByDate[today]) || 0;

  const todayNutrition = todayEntries.reduce(
    (acc, cur) => {
      acc.calories += Number(cur.calories) || 0;
      acc.protein_g = Math.round((acc.protein_g + (Number(cur.protein_g) || 0)) * 10) / 10;
      acc.carbs_g = Math.round((acc.carbs_g + (Number(cur.carbs_g) || 0)) * 10) / 10;
      acc.fat_g = Math.round((acc.fat_g + (Number(cur.fat_g) || 0)) * 10) / 10;
      acc.fiber_g = Math.round((acc.fiber_g + (Number(cur.fiber_g) || 0)) * 10) / 10;
      return acc;
    },
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 }
  );

  return {
    profile: (profile || {}) as any,
    metrics: (metrics || {}) as any,
    goal: (goal || {}) as any,
    trainingStyle,
    actual1RMs,
    nutritionTargets,
    todayNutrition: {
      ...todayNutrition,
      water_ml: todayWaterMl,
      entries: todayEntries,
    },
    workouts: workouts || [],
    prs: prs || [],
    recoveryLogs: recoveryLogs || [],
  };
}
