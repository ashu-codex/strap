import { NextRequest } from 'next/server';
import { handleError, json, requireUser } from '@/lib/api';
import { getSettings } from '@/lib/settings';

export async function GET(req: NextRequest) {
  try {
    // Always bypass in-memory auth cache here so admin payment approvals reflect immediately across instances
    const { user, subscription, isPremium, isAdmin } = await requireUser(req, { bypassCache: true });
    const s = await getSettings();
    return json({
      user,
      subscription,
      isPremium,
      isAdmin,
      planConfig: { price_inr: s.price_inr, billing_period: s.billing_period, upi_id: s.upi_id },
    });
  } catch (e) {
    return handleError(e);
  }
}
