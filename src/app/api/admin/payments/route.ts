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
    const status = searchParams.get('status');

    let payments = [...strapStore.payments];

    if (status && status !== 'all') {
      payments = payments.filter((p) => p.payment_status === status);
    }

    return NextResponse.json({ payments });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
