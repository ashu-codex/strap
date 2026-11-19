import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-helpers';
import { strapStore } from '@/lib/store';
import { generateWeeklyAdaptationAI } from '@/lib/gemini';

export async function POST(req: NextRequest) {
  try {
    const { user, isPremium } = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!isPremium) {
      return NextResponse.json(
        {
          error: 'AI Weekly Adaptation is exclusively available to STRAP Premium members.',
          isPremium: false,
          upgradeRequired: true,
        },
        { status: 403 }
      );
    }

    const userPlans = strapStore.aiPlans.get(user.id);
    const currentPlan = userPlans?.workoutPlan || {
      split_name: '4-Day Upper / Lower',
      split_type: 'Upper / Lower' as const,
    };

    const completedWorkouts = strapStore.workouts;

    const { adaptation, isAiGenerated } = await generateWeeklyAdaptationAI({
      completedWorkoutsCount: completedWorkouts.length,
      averageRpe: 8.2,
      missedWorkouts: 0,
      currentSplit: currentPlan.split_name,
    });

    return NextResponse.json({ success: true, adaptation, isAiGenerated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
