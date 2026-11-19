import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-helpers';
import { strapStore } from '@/lib/store';
import { generateNutritionPlanAI } from '@/lib/gemini';

export async function GET(req: NextRequest) {
  try {
    const { user, isPremium } = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!isPremium) {
      return NextResponse.json(
        {
          error: 'Personalized Nutrition Engine is exclusively available to STRAP Premium members.',
          isPremium: false,
          upgradeRequired: true,
        },
        { status: 403 }
      );
    }

    const userPlans = strapStore.aiPlans.get(user.id);
    if (userPlans?.nutritionPlan) {
      return NextResponse.json({ nutritionPlan: userPlans.nutritionPlan, cached: true });
    }

    const metrics = strapStore.metrics.get(user.id) || {
      age: 26,
      gender: 'male',
      height_cm: 178,
      current_weight_kg: 74.5,
      diet_preference: 'non_vegetarian',
      daily_activity_level: 'moderately_active',
    };

    const goal = strapStore.goals.get(user.id) || {
      primary_goal: 'muscle_gain',
      target_weight_kg: 80,
    };

    const { plan, isAiGenerated } = await generateNutritionPlanAI({ metrics, goal });

    strapStore.aiPlans.set(user.id, {
      ...userPlans,
      nutritionPlan: plan,
    });

    return NextResponse.json({ nutritionPlan: plan, isAiGenerated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, isPremium } = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!isPremium) {
      return NextResponse.json(
        { error: 'STRAP Premium required for AI Nutrition Planner.' },
        { status: 403 }
      );
    }

    const metrics = strapStore.metrics.get(user.id) || {};
    const goal = strapStore.goals.get(user.id) || {};

    const { plan, isAiGenerated } = await generateNutritionPlanAI({ metrics, goal });

    const userPlans = strapStore.aiPlans.get(user.id) || {};
    strapStore.aiPlans.set(user.id, {
      ...userPlans,
      nutritionPlan: plan,
    });

    return NextResponse.json({ success: true, nutritionPlan: plan, isAiGenerated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
