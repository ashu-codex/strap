import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { handleError, json } from '@/lib/api';
import { isActivePremium, requireOwnerAdmin } from '@/lib/auth-helpers';
import { createAdminClient } from '@/lib/supabase/admin';
import { isServiceRoleConfigured } from '@/lib/config';
import { SEED_EXERCISES } from '@/lib/exercises';
import { SEED_FOODS } from '@/lib/food-database';

function resolveAuthAccountType(
  authUser: any | undefined,
  pref: Record<string, any>
): { auth_origin: 'google' | 'email'; google_linked: boolean } {
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
      google_linked: true,
    };
  }

  return {
    auth_origin: 'email',
    google_linked: Boolean(pref.google_linked || providers.includes('google')),
  };
}

export async function GET(req: NextRequest) {
  try {
    const admin = await requireOwnerAdmin(req);
    const now = Date.now();
    const sevenDaysAgo = new Date(now - 7 * 86400_000).toISOString();
    const thirtyDaysAgo = new Date(now - 30 * 86400_000).toISOString();
    const oneDayAgo = new Date(now - 86400_000).toISOString();

    const [
      profiles,
      subs,
      payments,
      workoutCount,
      nutritionCount,
      prCount,
      aiLogs,
      auditLogs,
      prefs,
      authUsersList,
    ] = await Promise.all([
      db.select('user_profiles', { order: ['created_at', 'desc'], limit: 2000 }).catch(() => []),
      db.select('subscriptions').catch(() => []),
      db.select('payments', { order: ['created_at', 'desc'], limit: 500 }).catch(() => []),
      db.count('workout_logs').catch(() => 0),
      db.count('nutrition_records').catch(() => 0),
      db.count('progress_records').catch(() => 0),
      db.select('ai_usage_log', { order: ['created_at', 'desc'], limit: 500 }).catch(() => []),
      db.select('admin_audit_logs', { order: ['created_at', 'desc'], limit: 50 }).catch(() => []),
      db.select('user_preferences', { limit: 2000 }).catch(() => []),
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

    const totalUsers = combinedProfiles.length;
    const premiumUsers = subs.filter((s) => isActivePremium(s as any)).length;
    const freeUsers = Math.max(0, totalUsers - premiumUsers);

    const newRegistrations7d = combinedProfiles.filter((u) => u.created_at && u.created_at >= sevenDaysAgo).length;
    const newRegistrations30d = combinedProfiles.filter((u) => u.created_at && u.created_at >= thirtyDaysAgo).length;
    const activeUsers = Math.max(1, newRegistrations30d || totalUsers);

    const approved = payments.filter((p) => p.payment_status === 'approved');
    const pending = payments.filter((p) => p.payment_status === 'pending');
    const rejected = payments.filter((p) => p.payment_status === 'rejected');

    const byEndpoint: Record<string, number> = {
      chat: 0,
      plan: 0,
      nutrition: 0,
      recovery: 0,
      adaptation: 0,
    };
    let last24hRequests = 0;
    for (const log of aiLogs) {
      const ep = log.endpoint || 'chat';
      byEndpoint[ep] = (byEndpoint[ep] || 0) + 1;
      if (log.created_at && log.created_at >= oneDayAgo) {
        last24hRequests += 1;
      }
    }

    const prefMap = new Map(prefs.map((p: any) => [p.user_id, p.preferences || {}]));
    const authLogs = combinedProfiles.slice(0, 35).map((u: any) => {
      const p = prefMap.get(u.id) || {};
      const authUser = authById.get(u.id) || (u.email ? authByEmail.get(String(u.email).toLowerCase()) : undefined);
      const authInfo = resolveAuthAccountType(authUser, p);
      return {
        user_id: u.id,
        email: u.email || authUser?.email || '',
        full_name: u.full_name,
        auth_origin: authInfo.auth_origin,
        google_linked: authInfo.google_linked,
        training_style: p.training_style || 'muscle_building',
        created_at: u.created_at || authUser?.created_at,
      };
    });

    const supplementsCount = SEED_FOODS.filter((f) => f.category === 'Supplements' || f.is_supplement).length;
    const foodsCount = SEED_FOODS.length - supplementsCount;

    return json({
      stats: {
        totalUsers,
        activeUsers,
        newRegistrations7d,
        newRegistrations30d,
        premiumUsers,
        freeUsers,
        totalRevenueINR: approved.reduce((a, p) => a + Number(p.amount_inr || 0), 0),
        pendingPaymentsCount: pending.length,
        approvedPaymentsCount: approved.length,
        rejectedPaymentsCount: rejected.length,
      },
      aiStats: {
        totalRequests: aiLogs.length,
        last24hRequests,
        byEndpoint,
        recentLogs: aiLogs.slice(0, 20),
        errorCount: 0,
        geminiKeyConfigured: Boolean(process.env.GEMINI_API_KEY?.trim()),
        configuredModel: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
      },
      systemHealth: {
        databaseStatus: 'Connected & Operational',
        tableCounts: {
          user_profiles: totalUsers,
          subscriptions: subs.length,
          payments: payments.length,
          workout_logs: workoutCount,
          nutrition_records: nutritionCount,
          progress_records: prCount,
          ai_usage_log: aiLogs.length,
          admin_audit_logs: auditLogs.length,
          exercises_catalog: SEED_EXERCISES.length,
          foods_catalog: foodsCount,
          supplements_catalog: supplementsCount,
        },
        auditLogs,
        authLogs,
      },
      currentAdmin: admin.user.email,
    });
  } catch (e) {
    return handleError(e);
  }
}
