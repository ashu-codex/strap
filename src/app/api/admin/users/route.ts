import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { handleError, json } from '@/lib/api';
import { isActivePremium, isOwnerEmail, requireOwnerAdmin } from '@/lib/auth-helpers';

export async function GET(req: NextRequest) {
  try {
    await requireOwnerAdmin(req);
    const search = new URL(req.url).searchParams.get('search')?.toLowerCase();
    const [profiles, subs, metrics, goals, prefs, workouts] = await Promise.all([
      db.select('user_profiles', { order: ['created_at', 'desc'], limit: 1000 }).catch(() => []),
      db.select('subscriptions').catch(() => []),
      db.select('fitness_metrics').catch(() => []),
      db.select('fitness_goals').catch(() => []),
      db.select('user_preferences').catch(() => []),
      db.select('workout_logs', { limit: 2000 }).catch(() => []),
    ]);

    const subByUser = new Map(subs.map((s: any) => [s.user_id, s]));
    const metricByUser = new Map(metrics.map((m: any) => [m.user_id, m]));
    const goalByUser = new Map(goals.map((g: any) => [g.user_id, g]));
    const prefByUser = new Map(prefs.map((p: any) => [p.user_id, p.preferences || {}]));

    const workoutCountByUser = new Map<string, number>();
    for (const w of workouts) {
      if (w.user_id) {
        workoutCountByUser.set(w.user_id, (workoutCountByUser.get(w.user_id) || 0) + 1);
      }
    }

    let users = profiles.map((u: any) => {
      const sub = subByUser.get(u.id);
      const metric = metricByUser.get(u.id);
      const goal = goalByUser.get(u.id);
      const pref = prefByUser.get(u.id) || {};
      const prem = isActivePremium(sub as any);
      const diaryCount = Array.isArray(pref.nutrition_diary_entries)
        ? pref.nutrition_diary_entries.length
        : 0;

      return {
        id: u.id,
        email: u.email || '',
        full_name: u.full_name || 'Athlete',
        role: isOwnerEmail(u.email) ? 'admin' : 'user',
        created_at: u.created_at,
        subscriptionPlan: prem ? 'premium' : 'free',
        subscriptionStatus: sub?.status || 'active',
        expiresAt: sub?.current_period_end || null,
        age: metric?.age ?? u.age ?? null,
        gender: metric?.gender ?? u.gender ?? null,
        height_cm: metric?.height_cm ?? u.height ?? null,
        weight_kg: metric?.current_weight_kg ?? u.weight ?? null,
        primary_goal: goal?.primary_goal ?? u.fitness_goal ?? 'general_fitness',
        experience_level: metric?.fitness_level ?? u.experience_level ?? 'beginner',
        training_style: pref.training_style || 'muscle_building',
        auth_origin: pref.auth_origin || 'email_password',
        google_linked: Boolean(pref.google_linked),
        workouts_logged: workoutCountByUser.get(u.id) || 0,
        nutrition_entries_logged: diaryCount,
      };
    });

    if (search) {
      users = users.filter(
        (u) =>
          u.email.toLowerCase().includes(search) ||
          u.full_name.toLowerCase().includes(search) ||
          String(u.primary_goal).toLowerCase().includes(search) ||
          String(u.training_style).toLowerCase().includes(search)
      );
    }
    return json({ users });
  } catch (e) {
    return handleError(e);
  }
}
