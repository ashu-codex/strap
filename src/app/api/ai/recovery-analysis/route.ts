import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-helpers';
import { strapStore } from '@/lib/store';
import { generateRecoveryAnalysisAI } from '@/lib/gemini';

export async function GET(req: NextRequest) {
  try {
    const { user, isPremium } = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!isPremium) {
      return NextResponse.json(
        {
          error: 'AI Recovery Analysis is exclusively available to STRAP Premium members.',
          isPremium: false,
          upgradeRequired: true,
        },
        { status: 403 }
      );
    }

    const latestSleep = strapStore.sleepLogs.find((s) => s.user_id === user.id);
    const latestRecovery = strapStore.recoveryLogs.find((r) => r.user_id === user.id);
    const recentWorkouts = strapStore.workouts;

    const { analysis, isAiGenerated } = await generateRecoveryAnalysisAI({
      sleepHours: latestSleep?.sleep_hours || 7.5,
      fatigueScore: latestRecovery?.fatigue_level || 2,
      sorenessScore: latestRecovery?.muscle_soreness_score || 2,
      recentWorkoutCount: recentWorkouts.length,
    });

    return NextResponse.json({ analysis, isAiGenerated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
