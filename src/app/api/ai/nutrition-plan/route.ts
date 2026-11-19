import { NextRequest } from 'next/server';
import { handleError, json, requirePremium } from '@/lib/api';
import { aiGuard, latestAiPlan, loadFitnessContext, saveAiPlan } from '@/lib/ai-service';
import { generateNutritionPlanAI } from '@/lib/gemini';

async function build(userId: string) {
  const { metrics, goal } = await loadFitnessContext(userId);
  const { plan, isAiGenerated } = await generateNutritionPlanAI({ metrics, goal });
  await saveAiPlan(userId, 'nutrition', plan);
  return { plan, isAiGenerated };
}

export async function GET(req: NextRequest) {
  try {
    const { user } = await requirePremium(req);
    const cached = await latestAiPlan(user.id, 'nutrition');
    if (cached) return json({ nutritionPlan: cached, cached: true });
    await aiGuard(req, 'nutrition');
    const { plan, isAiGenerated } = await build(user.id);
    return json({ nutritionPlan: plan, isAiGenerated });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await aiGuard(req, 'nutrition');
    const { plan, isAiGenerated } = await build(user.id);
    return json({ success: true, nutritionPlan: plan, isAiGenerated });
  } catch (e) {
    return handleError(e);
  }
}
