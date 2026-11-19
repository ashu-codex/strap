import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-helpers';
import { strapStore } from '@/lib/store';
import { generateWorkoutPlanAI } from '@/lib/gemini';

export async function POST(req: NextRequest) {
  try {
    const { user, isPremium } = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Strict premium gating
    if (!isPremium) {
      return NextResponse.json(
        {
          error: 'AI Workout Plan Generation is exclusively available to STRAP Premium members.',
          isPremium: false,
          upgradeRequired: true,
        },
        { status: 403 }
      );
    }

    const metrics = strapStore.metrics.get(user.id) || {
      age: 26,
      gender: 'male',
      height_cm: 175,
      current_weight_kg: 72,
      experience_level: 'intermediate',
      workout_location: 'gym',
      workout_duration_mins: 60,
      equipment: ['barbell', 'dumbbell', 'cable', 'machine'],
      strength_levels: {},
    };

    const goal = strapStore.goals.get(user.id) || {
      primary_goal: 'muscle_gain',
      target_weight_kg: 78,
      weekly_workout_days: 4,
    };

    const recentWorkouts = strapStore.workouts.slice(0, 5);

    const { plan, isAiGenerated } = await generateWorkoutPlanAI({
      metrics,
      goal,
      recentWorkouts,
    });

    const userPlans = strapStore.aiPlans.get(user.id) || {};
    strapStore.aiPlans.set(user.id, {
      ...userPlans,
      workoutPlan: plan,
    });

    return NextResponse.json({
      success: true,
      isAiGenerated,
      plan,
    });
  } catch (error: any) {
    console.error('AI generate plan error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate AI workout plan' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { user, isPremium } = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!isPremium) {
      return NextResponse.json(
        {
          error: 'AI Workout Plan is locked for free users.',
          isPremium: false,
          upgradeRequired: true,
        },
        { status: 403 }
      );
    }

    const userPlans = strapStore.aiPlans.get(user.id);
    if (userPlans?.workoutPlan) {
      return NextResponse.json({ plan: userPlans.workoutPlan, cached: true });
    }

    // If none yet, generate one automatically
    const metrics = strapStore.metrics.get(user.id) || {};
    const goal = strapStore.goals.get(user.id) || {};
    const { plan, isAiGenerated } = await generateWorkoutPlanAI({ metrics, goal });

    strapStore.aiPlans.set(user.id, {
      ...userPlans,
      workoutPlan: plan,
    });

    return NextResponse.json({ plan, isAiGenerated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
