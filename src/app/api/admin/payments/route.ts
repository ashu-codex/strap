import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { handleError, json } from '@/lib/api';
import { requireOwnerAdmin, writeAuditLog } from '@/lib/auth-helpers';

export async function GET(req: NextRequest) {
  try {
    await requireOwnerAdmin(req);
    const payments = await db.select('payments', { order: ['created_at', 'desc'], limit: 500 });
    return json({ payments });
  } catch (e) {
    return handleError(e);
  }
}
