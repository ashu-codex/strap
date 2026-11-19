import { db } from '@/lib/db';
import { isOwnerEmail } from '@/lib/auth-helpers';
import { safeNext } from '@/lib/api';

/** Ensure a profile + free subscription exist for an authenticated user (idempotent, never overwrites). */
export async function ensureProfile(userId: string, email: string, meta?: Record<string, any>) {
  const existing = await db.selectOne('user_profiles', { eq: { id: userId } });
  if (!existing) {
    await db.upsert(
      'user_profiles',
      {
        id: userId,
        email,
        full_name: meta?.full_name || meta?.name || email.split('@')[0],
        avatar_url: meta?.avatar_url ?? null,
        role: 'user', // never derived from client input
      },
      'id'
    );
  }
  const sub = await db.selectOne('subscriptions', { eq: { user_id: userId } });
  if (!sub) {
    await db.upsert('subscriptions', { user_id: userId, plan: 'free', status: 'active', price_inr: 0 }, 'user_id');
  }
}

/** Decide where to send a freshly authenticated user. */
export async function postAuthDestination(userId: string, email: string, next?: string | null): Promise<string> {
  const owner = isOwnerEmail(email);
  const requested = safeNext(next, '');
  if (requested && !(requested.startsWith('/admin') && !owner)) return requested;
  if (owner) return '/admin';
  const onboarded = await db.selectOne('fitness_metrics', { eq: { user_id: userId } });
  return onboarded ? '/dashboard' : '/onboarding';
}
