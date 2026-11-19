import { NextRequest } from 'next/server';
import { getAuthUser } from '@/lib/auth-helpers';
import { handleError, json } from '@/lib/api';

export async function GET(req: NextRequest) {
  try {
    const ctx = await getAuthUser(req);
    return json(ctx);
  } catch (e) {
    return handleError(e);
  }
}
