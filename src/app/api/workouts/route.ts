import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-helpers';
import { strapStore } from '@/lib/store';

export async function GET(req: NextRequest) {
  try {
    const { user, isPremium } = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const workouts = strapStore.workouts;
    const prs = strapStore.progressRecords.filter((p) => p.user_id === user.id);

    return NextResponse.json({
      workouts,
      prs,
      isPremium,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
