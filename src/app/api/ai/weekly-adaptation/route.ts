import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { handleError, json } from '@/lib/api';
import { aiGuard, latestAiPlan, saveAiPlan } from '@/lib/ai-service';
import { generateWeeklyAdaptationAI } from '@/lib/gemini';

export async function POST(req: NextRequest) {
  try {
    const { user } = await aiGuard(req, 'adaptation');
    const plan: any = await latestAiPlan(user.id, 'workout');
    const logs = await db.select('workout_logs', { eq: { user_id: user.id }, order: ['completed_at', 'desc'], limit: 30 });

    const rpes: number[] = [];
    for (const l of logs) for (const ex of l.exercises || []) for (const s of ex.sets || []) if (s.is_completed && s.rpe) rpes.push(Number(s.rpe));
    const averageRpe = rpes.length ? Math.round((rpes.reduce((a, b) => a + b, 0) / rpes.length) * 10) / 10 : 8;

    const { adaptation, isAiGenerated } = await generateWeeklyAdaptationAI({
      completedWorkoutsCount: logs.length,
      averageRpe,
      missedWorkouts: 0,
      currentSplit: plan?.split_name || 'Current Split',
    });
    await saveAiPlan(user.id, 'adaptation', adaptation);
    return json({ success: true, adaptation, isAiGenerated });
  } catch (e) {
    return handleError(e);
  }
}
