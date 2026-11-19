import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { handleError, json, parseBody, requirePremium } from '@/lib/api';

const schema = z.object({
  sleep_hours: z.coerce.number().min(0).max(24).optional(),
  sleep_quality: z.coerce.number().int().min(1).max(5).optional(),
  fatigue_level: z.coerce.number().int().min(1).max(5).optional(),
  muscle_soreness_score: z.coerce.number().int().min(1).max(5).optional(),
  log_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().max(500).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { user } = await requirePremium(req);
    const [sleepLogs, recoveryLogs] = await Promise.all([
      db.select('sleep_logs', { eq: { user_id: user.id }, order: ['log_date', 'desc'], limit: 14 }),
      db.select('recovery_logs', { eq: { user_id: user.id }, order: ['log_date', 'desc'], limit: 14 }),
    ]);
    return json({ sleepLogs, recoveryLogs });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await requirePremium(req);
    const b = await parseBody(req, schema);
    const date = b.log_date || new Date().toISOString().slice(0, 10);

    if (b.sleep_hours !== undefined) {
      await db.insert('sleep_logs', { user_id: user.id, log_date: date, sleep_hours: b.sleep_hours, sleep_quality: b.sleep_quality ?? 3, notes: b.notes ?? null });
    }
    if (b.fatigue_level !== undefined) {
      const soreness = b.muscle_soreness_score ?? 3;
      const sleepHours = b.sleep_hours ?? 7.5;
      let score = 100 - b.fatigue_level * 10 - soreness * 8;
      if (sleepHours >= 8) score += 8;
      else if (sleepHours < 6) score -= 15;
      score = Math.max(10, Math.min(100, Math.round(score)));
      const status = score < 50 ? 'rest_recommended' : score < 75 ? 'recovering' : 'ready';
      await db.insert('recovery_logs', { user_id: user.id, log_date: date, fatigue_level: b.fatigue_level, muscle_soreness_score: soreness, recovery_score_pct: score, readiness_status: status });
    }
    return json({ success: true, message: 'Recovery updated successfully' });
  } catch (e) {
    return handleError(e);
  }
}
