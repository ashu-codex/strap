import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-helpers';
import { strapStore } from '@/lib/store';

export async function GET(req: NextRequest) {
  try {
    const { user, subscription, isPremium, isAdmin } = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const adminSettings = strapStore.adminSettings;

    return NextResponse.json(
      {
        subscription,
        isPremium,
        isAdmin,
        planConfig: {
          price_inr: adminSettings.price_inr,
          billing_period: adminSettings.billing_period,
          upi_id: adminSettings.upi_id,
        },
      },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
