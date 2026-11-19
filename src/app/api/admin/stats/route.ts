import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-helpers';
import { strapStore } from '@/lib/store';

export async function GET(req: NextRequest) {
  try {
    const { isAdmin, user } = await getAuthUser(req);

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin privileges required.' },
        { status: 403 }
      );
    }

    const allUsers = Array.from(strapStore.users.values());
    const allSubs = Array.from(strapStore.subscriptions.values());
    const allPayments = strapStore.payments;

    const totalUsers = allUsers.length;
    const premiumUsers = allSubs.filter((s) => s.plan === 'premium' && s.status === 'active').length;
    const freeUsers = Math.max(0, totalUsers - premiumUsers);

    const approvedPayments = allPayments.filter((p) => p.payment_status === 'approved');
    const pendingPayments = allPayments.filter((p) => p.payment_status === 'pending');
    const rejectedPayments = allPayments.filter((p) => p.payment_status === 'rejected');

    const totalRevenueINR = approvedPayments.reduce((acc, curr) => acc + (Number(curr.amount_inr) || 0), 0);

    return NextResponse.json({
      stats: {
        totalUsers,
        freeUsers,
        premiumUsers,
        totalRevenueINR,
        pendingPaymentsCount: pendingPayments.length,
        approvedPaymentsCount: approvedPayments.length,
        rejectedPaymentsCount: rejectedPayments.length,
      },
      currentAdmin: user?.email,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
