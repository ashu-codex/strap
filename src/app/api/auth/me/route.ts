import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-helpers';

export async function GET(req: NextRequest) {
  try {
    const authData = await getAuthUser(req);
    return NextResponse.json(authData, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to get auth status' }, { status: 500 });
  }
}
