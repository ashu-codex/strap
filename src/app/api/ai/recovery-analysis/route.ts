import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { handleError, json } from '@/lib/api';
import { aiGuard, saveAiPlan } from '@/lib/ai-service';
import { generateRecoveryAnalysisAI } from '@/lib/gemini';

const schema = z
  .object({
    sleep_hours: z.coerce.number().min(0).max(24).optional(),
    fatigue_level: z.coerce.number().int().min(1).max(5).optional(),
    soreness_score: z.coerce.number().int().min(1).max(5).optional(),
  })
  .partial();

export async function POST(req: NextRequest) {
  try {
    const { user } = await aiGuard(req, 'recovery');
    let body: z.infer<typeof schema> = {};
    try {
      body = schema.parse(await req.json());
    } catch {
      /* body optional */
    }

    const [sleep, rec, workouts] = await Promise.all([
      db.selectOne('sleep_logs', { eq: { user_id: user.id }, order: ['log_date', 'desc'] }),
      db.selectOne('recovery_logs', { eq: { user_id: user.id }, order: ['log_date', 'desc'] }),
      db.count('workout_logs', { eq: { user_id: user.id } }),
    ]);

    const { analysis, isAiGenerated } = await generateRecoveryAnalysisAI({
      sleepHours: body.sleep_hours ?? Number(sleep?.sleep_hours ?? 7.5),
      fatigueScore: body.fatigue_level ?? Number(rec?.fatigue_level ?? 2),
      sorenessScore: body.soreness_score ?? Number(rec?.muscle_soreness_score ?? 2),
      recentWorkoutCount: workouts,
    });
    await saveAiPlan(user.id, 'recovery', analysis);
    return json({ success: true, analysis, isAiGenerated });
  } catch (e) {
    return handleError(e);
  }
}
