import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { handleError, json } from '@/lib/api';
import { isActivePremium, requireOwnerAdmin } from '@/lib/auth-helpers';

export async function GET(req: NextRequest) {
  try {
    const admin = await requireOwnerAdmin(req);
    const [users, subs, payments] = await Promise.all([
      db.count('user_profiles'),
      db.select('subscriptions'),
      db.select('payments'),
    ]);
    const premiumUsers = subs.filter((s) => isActivePremium(s as any)).length;
    const approved = payments.filter((p) => p.payment_status === 'approved');
    return json({
      stats: {
        totalUsers: users,
        premiumUsers,
        freeUsers: Math.max(0, users - premiumUsers),
        totalRevenueINR: approved.reduce((a, p) => a + Number(p.amount_inr || 0), 0),
        pendingPaymentsCount: payments.filter((p) => p.payment_status === 'pending').length,
        approvedPaymentsCount: approved.length,
        rejectedPaymentsCount: payments.filter((p) => p.payment_status === 'rejected').length,
      },
      currentAdmin: admin.user.email,
    });
  } catch (e) {
    return handleError(e);
  }
}
