import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { handleError, json, parseBody, requireUser } from '@/lib/api';

const schema = z.object({
  primary_goal: z.enum(['fat_loss', 'muscle_gain', 'recomposition', 'strength', 'general_fitness', 'endurance', 'maintenance']),
  target_weight_kg: z.preprocess((v) => (v === '' || v == null ? undefined : v), z.coerce.number().min(20).max(500).optional()),
  weekly_workout_days: z.coerce.number().int().min(1).max(7).default(4),
  target_date: z.preprocess((v) => (v === '' || v == null ? undefined : v), z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
});

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireUser(req);
    return json({ goal: await db.selectOne('fitness_goals', { eq: { user_id: user.id } }) });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireUser(req);
    const g = await parseBody(req, schema);
    const saved = await db.upsert('fitness_goals', { user_id: user.id, ...g, target_weight_kg: g.target_weight_kg ?? null, target_date: g.target_date ?? null }, 'user_id');
    await db.update('user_profiles', { id: user.id }, { fitness_goal: g.primary_goal });
    return json({ success: true, goal: saved });
  } catch (e) {
    return handleError(e);
  }
}
