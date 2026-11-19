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
      const { data: sleep } = await supabase
        .from('sleep_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('log_date', { ascending: false })
        .limit(14);
      const { data: rec } = await supabase
        .from('recovery_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('log_date', { ascending: false })
        .limit(14);

      if (sleep && rec) {
        return NextResponse.json({ sleepLogs: sleep, recoveryLogs: rec });
      }
    }

    const sleepLogs = strapStore.sleepLogs.filter((s) => s.user_id === user.id);
    const recoveryLogs = strapStore.recoveryLogs.filter((r) => r.user_id === user.id);

    return NextResponse.json({ sleepLogs, recoveryLogs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const today = new Date().toISOString().split('T')[0];

    // Log Sleep
    if (body.sleep_hours !== undefined) {
      const sleepEntry = {
        id: 'sl-' + Date.now(),
        user_id: user.id,
        log_date: body.log_date || today,
        sleep_hours: Number(body.sleep_hours),
        sleep_quality: Number(body.sleep_quality) || 3,
        notes: body.notes || '',
      };
      strapStore.sleepLogs.unshift(sleepEntry);
    }

    // Log Recovery
    if (body.fatigue_level !== undefined) {
      const fatigue = Number(body.fatigue_level);
      const soreness = Number(body.muscle_soreness_score) || 3;
      const sleepHours = Number(body.sleep_hours) || 7.5;

      // Calculate scientifically calibrated recovery score
      let score = 100 - (fatigue * 10) - (soreness * 8);
      if (sleepHours >= 8) score += 8;
      else if (sleepHours < 6) score -= 15;
      score = Math.max(10, Math.min(100, Math.round(score)));

      let readinessStatus: 'ready' | 'recovering' | 'rest_recommended' = 'ready';
      if (score < 50) readinessStatus = 'rest_recommended';
      else if (score < 75) readinessStatus = 'recovering';

      const recEntry = {
        id: 'rl-' + Date.now(),
        user_id: user.id,
        log_date: body.log_date || today,
        fatigue_level: fatigue,
        muscle_soreness_score: soreness,
        recovery_score_pct: score,
        readiness_status: readinessStatus,
      };
      strapStore.recoveryLogs.unshift(recEntry);
    }

    return NextResponse.json({ success: true, message: 'Recovery updated successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
