import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { handleError, json, requireUser } from '@/lib/api';

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireUser(req);
    const payments = await db.select('payments', { eq: { user_id: user.id }, order: ['created_at', 'desc'], limit: 100 });
    return json({ payments });
  } catch (e) {
    return handleError(e);
  }
}
