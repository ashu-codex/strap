import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { handleError, json } from '@/lib/api';
import { isActivePremium, isOwnerEmail, requireOwnerAdmin } from '@/lib/auth-helpers';
import { createAdminClient } from '@/lib/supabase/admin';
import { isServiceRoleConfigured } from '@/lib/config';

function resolveAuthAccountType(
  authUser: any | undefined,
  pref: Record<string, any>
): { auth_origin: 'google' | 'email'; providers: string[]; google_linked: boolean } {
  const identities: any[] = Array.isArray(authUser?.identities) ? authUser.identities : [];
  const metaProviders: string[] = Array.isArray(authUser?.app_metadata?.providers)
    ? authUser.app_metadata.providers
    : [];
  const primaryProvider = String(authUser?.app_metadata?.provider || '').toLowerCase();
  const providers = Array.from(
    new Set([
      ...metaProviders.map((p) => String(p).toLowerCase()),
      ...identities.map((i: any) => String(i.provider || '').toLowerCase()).filter(Boolean),
      ...(primaryProvider ? [primaryProvider] : []),
    ])
  );

  const sortedIdentities = [...identities].sort((a, b) =>
    String(a.created_at || '').localeCompare(String(b.created_at || ''))
  );
  const firstIdentityProvider = String(sortedIdentities[0]?.provider || '').toLowerCase();

  if (
    pref.auth_origin === 'google' ||
    primaryProvider === 'google' ||
    firstIdentityProvider === 'google' ||
    (providers.includes('google') && !providers.includes('email'))
  ) {
    return {
      auth_origin: 'google',
      providers: providers.length ? providers : ['google'],
      google_linked: true,
    };
  }

  return {
    auth_origin: 'email',
    providers: providers.length ? providers : ['email'],
    google_linked: Boolean(pref.google_linked || providers.includes('google')),
  };
}

export async function GET(req: NextRequest) {
  try {
    await requireOwnerAdmin(req);
    const search = new URL(req.url).searchParams.get('search')?.toLowerCase();

    const [profiles, subs, metrics, goals, prefs, workouts, authUsersList] = await Promise.all([
      db.select('user_profiles', { order: ['created_at', 'desc'], limit: 1000 }).catch(() => []),
      db.select('subscriptions').catch(() => []),
      db.select('fitness_metrics').catch(() => []),
      db.select('fitness_goals').catch(() => []),
      db.select('user_preferences').catch(() => []),
      db.select('workout_logs', { limit: 2000 }).catch(() => []),
      (async () => {
        if (!isServiceRoleConfigured()) return [];
        const adminClient = createAdminClient();
        if (!adminClient) return [];
        const { data } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 }).catch(() => ({ data: null }));
        return data?.users || [];
      })(),
    ]);

    const authById = new Map<string, any>();
    const authByEmail = new Map<string, any>();
    for (const au of authUsersList) {
      if (au.id) authById.set(au.id, au);
      if (au.email) authByEmail.set(String(au.email).toLowerCase(), au);
    }

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

    // Merge user_profiles and any auth.users not yet in user_profiles
    const combinedProfiles: any[] = [...profiles];
    const seenIds = new Set(profiles.map((p: any) => p.id));
    for (const au of authUsersList) {
      if (au.id && !seenIds.has(au.id)) {
        combinedProfiles.push({
          id: au.id,
          email: au.email || '',
          full_name:
            au.user_metadata?.full_name ||
            au.user_metadata?.name ||
            (au.email ? String(au.email).split('@')[0] : 'Athlete'),
          created_at: au.created_at,
        });
      }
    }

    let users = combinedProfiles.map((u: any) => {
      const sub = subByUser.get(u.id);
      const metric = metricByUser.get(u.id);
      const goal = goalByUser.get(u.id);
      const pref = prefByUser.get(u.id) || {};
      const authUser = authById.get(u.id) || (u.email ? authByEmail.get(String(u.email).toLowerCase()) : undefined);
      const authInfo = resolveAuthAccountType(authUser, pref);
      const prem = isActivePremium(sub as any);
      const diaryCount = Array.isArray(pref.nutrition_diary_entries)
        ? pref.nutrition_diary_entries.length
        : 0;

      return {
        id: u.id,
        email: u.email || authUser?.email || '',
        full_name:
          u.full_name ||
          authUser?.user_metadata?.full_name ||
          authUser?.user_metadata?.name ||
          'Athlete',
        role: isOwnerEmail(u.email || authUser?.email) ? 'admin' : 'user',
        created_at: u.created_at || authUser?.created_at,
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
        auth_origin: authInfo.auth_origin,
        providers: authInfo.providers,
        google_linked: authInfo.google_linked,
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
          String(u.training_style).toLowerCase().includes(search) ||
          String(u.auth_origin).toLowerCase().includes(search)
      );
    }
    return json({ users });
  } catch (e) {
    return handleError(e);
  }
}
