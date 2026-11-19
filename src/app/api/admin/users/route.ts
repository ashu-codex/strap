import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { handleError, json } from '@/lib/api';
import { isActivePremium, isOwnerEmail, requireOwnerAdmin } from '@/lib/auth-helpers';

export async function GET(req: NextRequest) {
  try {
    await requireOwnerAdmin(req);
    const search = new URL(req.url).searchParams.get('search')?.toLowerCase();
    const [profiles, subs] = await Promise.all([
      db.select('user_profiles', { order: ['created_at', 'desc'], limit: 1000 }),
      db.select('subscriptions'),
    ]);
    const subByUser = new Map(subs.map((s) => [s.user_id, s]));

    let users = profiles.map((u) => {
      const sub = subByUser.get(u.id);
      const prem = isActivePremium(sub as any);
      return {
        id: u.id,
        email: u.email,
        full_name: u.full_name,
        role: isOwnerEmail(u.email) ? 'admin' : 'user',
        created_at: u.created_at,
        subscriptionPlan: prem ? 'premium' : 'free',
        subscriptionStatus: sub?.status || 'active',
        expiresAt: sub?.current_period_end || null,
      };
    });
    if (search) users = users.filter((u) => u.email.toLowerCase().includes(search) || u.full_name.toLowerCase().includes(search));
    return json({ users });
  } catch (e) {
    return handleError(e);
  }
}
