import { db } from '@/lib/db';
import { buildMissingProfilePatch, extractOAuthProfileMeta, isOwnerEmail } from '@/lib/auth-helpers';
import { safeNext } from '@/lib/api';
import { createAdminClient } from '@/lib/supabase/admin';
import { isDevFallbackAllowed, isServiceRoleConfigured } from '@/lib/config';

export { extractOAuthProfileMeta };

export interface AuthLookupResult {
  exists: boolean;
  emailVerified: boolean;
  providers: string[];
}

/**
 * Server-only lookup to check whether an email is already registered in Supabase Auth
 * (or dev_auth_users in local dev fallback). Never exposes service_role key to clients.
 */
export async function lookupAuthAccount(normalizedEmail: string): Promise<AuthLookupResult> {
  const email = normalizedEmail.trim().toLowerCase();
  if (!email) return { exists: false, emailVerified: false, providers: [] };

  if (isServiceRoleConfigured()) {
    const admin = createAdminClient();
    if (admin) {
      // 1. Primary: O(1) SECURITY DEFINER RPC against auth.users
      const { data: rpcData, error: rpcErr } = await admin.rpc('lookup_auth_user_by_email', {
        p_email: email,
      });
      if (!rpcErr && Array.isArray(rpcData)) {
        if (rpcData.length > 0) {
          return {
            exists: true,
            emailVerified: Boolean(rpcData[0].email_confirmed),
            providers: Array.isArray(rpcData[0].providers) ? rpcData[0].providers : ['email'],
          };
        }
        return { exists: false, emailVerified: false, providers: [] };
      }

      // 2. Fallback if RPC migration hasn't been run yet: check user_profiles
      const profile = await db.selectOne('user_profiles', { eq: { email } }).catch(() => null);
      if (profile) {
        return { exists: true, emailVerified: true, providers: ['email'] };
      }
      return { exists: false, emailVerified: false, providers: [] };
    }
  }

  if (isDevFallbackAllowed()) {
    const devUser = await db.selectOne('dev_auth_users', { eq: { email } });
    if (devUser) {
      return { exists: true, emailVerified: Boolean(devUser.email_confirmed), providers: ['email'] };
    }
  }

  return { exists: false, emailVerified: false, providers: [] };
}

/**
 * Ensure a profile + free subscription exist for an authenticated user UUID.
 * Strictly idempotent: NEVER overwrites an existing user's profile or subscription data.
 * Supports OAuth accounts (e.g. Facebook) where email may be empty.
 */
export async function ensureProfile(userId: string, email: string, meta?: Record<string, any>) {
  const normalizedEmail = (email || '').trim().toLowerCase();
  const { fullName, avatarUrl } = extractOAuthProfileMeta(normalizedEmail, meta);

  const existing = await db.selectOne('user_profiles', { eq: { id: userId } });
  if (!existing) {
    await db.insertIfMissing(
      'user_profiles',
      {
        id: userId,
        email: normalizedEmail,
        full_name: fullName,
        avatar_url: avatarUrl,
        role: 'user', // never derived from client input
      },
      'id'
    );
  } else {
    const patch = buildMissingProfilePatch(existing, normalizedEmail, meta);
    if (Object.keys(patch).length > 0) {
      await db.update('user_profiles', { id: userId }, patch).catch(() => null);
    }
  }
  const sub = await db.selectOne('subscriptions', { eq: { user_id: userId } });
  if (!sub) {
    await db.insertIfMissing(
      'subscriptions',
      { user_id: userId, plan: 'free', status: 'active', price_inr: 0 },
      'user_id'
    );
  }
}

/** Decide where to send a freshly authenticated user based on their UUID's existing data. */
export async function postAuthDestination(userId: string, email: string, next?: string | null): Promise<string> {
  const owner = isOwnerEmail(email);
  const requested = safeNext(next, '');
  const onboarded = await db.selectOne('fitness_metrics', { eq: { user_id: userId } });

  if (requested && !(requested.startsWith('/admin') && !owner)) {
    if (requested === '/onboarding' && onboarded) {
      return owner ? '/admin' : '/dashboard';
    }
    return requested;
  }
  if (owner) return '/admin';
  return onboarded ? '/dashboard' : '/onboarding';
}
