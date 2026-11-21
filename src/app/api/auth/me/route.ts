import { NextRequest } from 'next/server';
import { getAuthUser } from '@/lib/auth-helpers';
import { handleError, json } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const bypassCache = req.nextUrl.searchParams.get('fresh') === '1';
    const ctx = await getAuthUser(req, { bypassCache });
    return json(ctx);
  } catch (e) {
    return handleError(e);
  }
}
