import { NextRequest } from 'next/server';
import { handleError, json, requirePremium } from '@/lib/api';
import { aiGuard, latestAiPlan, loadFitnessContext, saveAiPlan } from '@/lib/ai-service';
import { generateWorkoutPlanAI } from '@/lib/gemini';

export async function POST(req: NextRequest) {
  try {
    const { user } = await aiGuard(req, 'plan');
    const { metrics, goal, workouts } = await loadFitnessContext(user.id);
    const { plan, isAiGenerated } = await generateWorkoutPlanAI({ metrics, goal, recentWorkouts: workouts });
    await saveAiPlan(user.id, 'workout', plan);
    return json({ success: true, isAiGenerated, plan });
  } catch (e) {
    return handleError(e);
  }
}

export async function GET(req: NextRequest) {
  try {
    const { user } = await requirePremium(req);
    const cached = await latestAiPlan(user.id, 'workout');
    if (cached) return json({ plan: cached, cached: true });

    await aiGuard(req, 'plan');
    const { metrics, goal, workouts } = await loadFitnessContext(user.id);
    const { plan, isAiGenerated } = await generateWorkoutPlanAI({ metrics, goal, recentWorkouts: workouts });
    await saveAiPlan(user.id, 'workout', plan);
    return json({ plan, isAiGenerated });
  } catch (e) {
    return handleError(e);
  }
}
