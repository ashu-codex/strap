import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-helpers';
import { strapStore } from '@/lib/store';

export async function GET(req: NextRequest) {
  try {
    const { isAdmin } = await getAuthUser(req);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin privileges required.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.toLowerCase();

    let users = Array.from(strapStore.users.values()).map((u) => {
      const sub = strapStore.subscriptions.get(u.id);
      const isNotExpired = !sub?.current_period_end || new Date(sub.current_period_end) > new Date();
      const isPrem = sub?.plan === 'premium' && sub?.status === 'active' && isNotExpired;

      return {
        id: u.id,
        email: u.email,
        full_name: u.full_name,
        role: u.role,
        created_at: u.created_at,
        subscriptionPlan: isPrem ? 'premium' : 'free',
        subscriptionStatus: sub?.status || 'active',
        expiresAt: sub?.current_period_end || null,
      };
    });

    if (search) {
      users = users.filter(
        (u) => u.email.toLowerCase().includes(search) || u.full_name.toLowerCase().includes(search)
      );
    }

    return NextResponse.json({ users });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
