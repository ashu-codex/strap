import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-helpers';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { strapStore } from '@/lib/store';

export async function GET(req: NextRequest) {
  try {
    const { user } = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createServerClient();
    if (supabase) {
      const { data } = await supabase
        .from('body_measurements')
        .select('*')
        .eq('user_id', user.id)
        .order('recorded_date', { ascending: true });
      if (data && data.length > 0) return NextResponse.json({ measurements: data });
    }

    const fallback = strapStore.measurements.filter((m) => m.user_id === user.id);
    return NextResponse.json({ measurements: fallback });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const entry = {
      id: 'm-' + Date.now(),
      user_id: user.id,
      recorded_date: body.recorded_date || new Date().toISOString().split('T')[0],
      weight_kg: Number(body.weight_kg),
      body_fat_pct: body.body_fat_pct ? Number(body.body_fat_pct) : undefined,
      chest_cm: body.chest_cm ? Number(body.chest_cm) : undefined,
      waist_cm: body.waist_cm ? Number(body.waist_cm) : undefined,
      hips_cm: body.hips_cm ? Number(body.hips_cm) : undefined,
      arms_cm: body.arms_cm ? Number(body.arms_cm) : undefined,
      notes: body.notes || '',
    };

    const supabase = createServerClient();
    if (supabase) {
      await supabase.from('body_measurements').insert(entry);
    }

    strapStore.measurements.push(entry);

    return NextResponse.json({ success: true, measurement: entry });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
