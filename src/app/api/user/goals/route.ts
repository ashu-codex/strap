import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-helpers';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { strapStore } from '@/lib/store';
import { UserGoal } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const { user } = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createServerClient();
    if (supabase) {
      const { data } = await supabase.from('user_goals').select('*').eq('user_id', user.id).single();
      if (data) return NextResponse.json({ goal: data });
    }

    const fallbackGoal = strapStore.goals.get(user.id) || {
      id: 'goal-' + user.id,
      user_id: user.id,
      primary_goal: 'muscle_gain',
      target_weight_kg: 78,
      weekly_workout_days: 4,
      target_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 60).toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return NextResponse.json({ goal: fallbackGoal });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { primary_goal, target_weight_kg, weekly_workout_days, target_date } = body;

    const supabase = createServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('user_goals').upsert({
        user_id: user.id,
        primary_goal,
        target_weight_kg: target_weight_kg ? Number(target_weight_kg) : null,
        weekly_workout_days: Number(weekly_workout_days) || 4,
        target_date: target_date || null,
        updated_at: new Date().toISOString(),
      }).select().single();

      if (!error && data) return NextResponse.json({ success: true, goal: data });
    }

    const updatedGoal: UserGoal = {
      id: 'goal-' + user.id,
      user_id: user.id,
      primary_goal: primary_goal || 'muscle_gain',
      target_weight_kg: target_weight_kg ? Number(target_weight_kg) : 75,
      weekly_workout_days: Number(weekly_workout_days) || 4,
      target_date: target_date || undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    strapStore.goals.set(user.id, updatedGoal);

    return NextResponse.json({ success: true, goal: updatedGoal });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
