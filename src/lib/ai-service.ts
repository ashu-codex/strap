import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { HttpError, requirePremium } from '@/lib/api';

const LIMITS: Record<string, { perHour: number; perDay: number }> = {
  chat: { perHour: 40, perDay: 150 },
  plan: { perHour: 8, perDay: 25 },
  nutrition: { perHour: 8, perDay: 25 },
  recovery: { perHour: 15, perDay: 50 },
  adaptation: { perHour: 6, perDay: 20 },
};

/**
 * Premium-gate + persistent (DB-backed, multi-instance safe) rate limit for AI endpoints.
 * Every successful guard call is logged so token spend can be audited and capped.
 */
export async function aiGuard(req: NextRequest, endpoint: keyof typeof LIMITS) {
  const ctx = await requirePremium(req);
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
    throw new HttpError(429, 'AI usage limit reached. Please try again later.', 'AI_RATE_LIMITED');
  }
  await db.insert('ai_usage_log', { user_id: ctx.user.id, endpoint });
  return ctx;
}

export async function saveAiPlan(userId: string, kind: 'workout' | 'nutrition' | 'recovery' | 'adaptation', content: unknown) {
  return db.insert('ai_plans', { user_id: userId, kind, content });
}

export async function latestAiPlan(userId: string, kind: 'workout' | 'nutrition' | 'recovery' | 'adaptation') {
  const row = await db.selectOne('ai_plans', { eq: { user_id: userId, kind }, order: ['created_at', 'desc'] });
  return row?.content ?? null;
}

export async function loadFitnessContext(userId: string) {
  const [metrics, goal, workouts] = await Promise.all([
    db.selectOne('fitness_metrics', { eq: { user_id: userId } }),
    db.selectOne('fitness_goals', { eq: { user_id: userId } }),
    db.select('workout_logs', { eq: { user_id: userId }, order: ['completed_at', 'desc'], limit: 5 }),
  ]);
  return { metrics: (metrics || {}) as any, goal: (goal || {}) as any, workouts };
}
