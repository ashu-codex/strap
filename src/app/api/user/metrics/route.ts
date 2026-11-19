import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-helpers';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { strapStore } from '@/lib/store';
import { FitnessMetrics } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const { user } = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createServerClient();
    if (supabase) {
      const { data } = await supabase.from('fitness_metrics').select('*').eq('user_id', user.id).single();
      if (data) return NextResponse.json({ metrics: data });
    }

    const fallbackMetrics = strapStore.metrics.get(user.id) || {
      id: 'metrics-' + user.id,
      user_id: user.id,
      age: 26,
      gender: 'male',
      height_cm: 175,
      current_weight_kg: 72,
      body_fat_pct: 16,
      chest_cm: 98,
      waist_cm: 80,
      hips_cm: 94,
      arms_cm: 35,
      experience_level: 'beginner',
      workout_location: 'gym',
      workout_duration_mins: 60,
      equipment: ['Barbell', 'Dumbbell', 'Machine'],
      strength_levels: {},
      limitations: '',
      diet_preference: 'non_vegetarian',
      sleep_hours_avg: 7.5,
      daily_activity_level: 'moderately_active',
      daily_steps_avg: 8000,
      rest_days_preferred: 2,
      updated_at: new Date().toISOString(),
    };

    return NextResponse.json({ metrics: fallbackMetrics });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();

    const payload: Partial<FitnessMetrics> = {
      user_id: user.id,
      age: Number(body.age) || 25,
      gender: body.gender || 'male',
      height_cm: Number(body.height_cm) || 175,
      current_weight_kg: Number(body.current_weight_kg) || 70,
      body_fat_pct: body.body_fat_pct ? Number(body.body_fat_pct) : undefined,
      chest_cm: body.chest_cm ? Number(body.chest_cm) : undefined,
      waist_cm: body.waist_cm ? Number(body.waist_cm) : undefined,
      hips_cm: body.hips_cm ? Number(body.hips_cm) : undefined,
      arms_cm: body.arms_cm ? Number(body.arms_cm) : undefined,
      experience_level: body.experience_level || 'beginner',
      workout_location: body.workout_location || 'gym',
      workout_duration_mins: Number(body.workout_duration_mins) || 60,
      equipment: Array.isArray(body.equipment) ? body.equipment : ['Barbell', 'Dumbbell'],
      strength_levels: body.strength_levels || {},
      limitations: body.limitations || '',
      diet_preference: body.diet_preference || 'non_vegetarian',
      sleep_hours_avg: Number(body.sleep_hours_avg) || 7.5,
      daily_activity_level: body.daily_activity_level || 'moderately_active',
      daily_steps_avg: Number(body.daily_steps_avg) || 8000,
      rest_days_preferred: Number(body.rest_days_preferred) || 2,
      updated_at: new Date().toISOString(),
    };

    const supabase = createServerClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('fitness_metrics')
        .upsert(payload)
        .select()
        .single();
      if (!error && data) return NextResponse.json({ success: true, metrics: data });
    }

    const savedMetrics: FitnessMetrics = {
      id: 'metrics-' + user.id,
      ...(payload as any),
    };
    strapStore.metrics.set(user.id, savedMetrics);

    return NextResponse.json({ success: true, metrics: savedMetrics });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
