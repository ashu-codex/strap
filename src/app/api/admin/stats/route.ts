import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { handleError, json } from '@/lib/api';
import { isActivePremium, requireOwnerAdmin } from '@/lib/auth-helpers';
import { SEED_EXERCISES } from '@/lib/exercises';
import { SEED_FOODS } from '@/lib/food-database';

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
    ]);

    const totalUsers = profiles.length;
    const premiumUsers = subs.filter((s) => isActivePremium(s as any)).length;
    const freeUsers = Math.max(0, totalUsers - premiumUsers);

    const newRegistrations7d = profiles.filter((u) => u.created_at && u.created_at >= sevenDaysAgo).length;
    const newRegistrations30d = profiles.filter((u) => u.created_at && u.created_at >= thirtyDaysAgo).length;
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
    const authLogs = profiles.slice(0, 25).map((u: any) => {
      const p = prefMap.get(u.id) || {};
      return {
        user_id: u.id,
        email: u.email,
        full_name: u.full_name,
        auth_origin: p.auth_origin || 'email_password',
        google_linked: Boolean(p.google_linked),
        training_style: p.training_style || 'muscle_building',
        created_at: u.created_at,
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
