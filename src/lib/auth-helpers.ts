import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { ConfigError, getOwnerEmail, isDevFallbackAllowed, isSupabaseConfigured } from '@/lib/config';
import { DEV_SESSION_COOKIE, readSession } from '@/lib/dev-auth';
import { Subscription, UserProfile } from '@/types';

/**
 * AUTHENTICATION + AUTHORIZATION (server-side source of truth)
 *  - Identity: Supabase Auth, validated with auth.getUser() (JWT checked by the
 *    Auth server — never the unverified cookie payload).
 *  - Owner admin: verified email == STRAP_ADMIN_EMAIL. Frontend roles and
 *    user_metadata are never consulted.
 *  - Premium: derived only from the subscriptions table / verified payments.
 */

export interface AuthContext {
  user: UserProfile | null;
  subscription: Subscription | null;
  isPremium: boolean;
  isAdmin: boolean;
  emailVerified: boolean;
}

const EMPTY: AuthContext = { user: null, subscription: null, isPremium: false, isAdmin: false, emailVerified: false };

export function normalizeEmail(email: unknown): string {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

export function isOwnerEmail(email?: string | null): boolean {
  const owner = getOwnerEmail();
  return Boolean(owner && email && email.trim().toLowerCase() === owner);
}

export function isActivePremium(sub?: Partial<Subscription> | null): boolean {
  if (!sub) return false;
  const notExpired = !sub.current_period_end || new Date(sub.current_period_end) > new Date();
  return sub.plan === 'premium' && sub.status === 'active' && notExpired;
}

function freeSub(userId: string): Subscription {
  const now = new Date().toISOString();
  return {
    id: 'sub-' + userId,
    user_id: userId,
    plan: 'free',
    status: 'active',
    price_inr: 0,
    current_period_start: now,
    current_period_end: null,
    created_at: now,
    updated_at: now,
  };
}

/** Load subscription; reconcile from an approved payment if the subscription row lags behind. */
export async function getUserSubscription(userId: string): Promise<Subscription> {
  let sub = (await db.selectOne('subscriptions', { eq: { user_id: userId } })) as Subscription | null;
  if (!isActivePremium(sub)) {
    const approved = await db.select('payments', {
      eq: { user_id: userId, payment_status: 'approved' },
      order: ['verified_at', 'desc'],
      limit: 1,
    });
    if (approved[0]) {
      const verifiedAt = new Date(approved[0].verified_at || approved[0].created_at).getTime();
      const expiry = new Date(verifiedAt + 30 * 86400000);
      if (expiry > new Date()) {
        sub = (await activatePremium(userId, Number(approved[0].amount_inr), 0, new Date(verifiedAt))) as Subscription;
      }
    }
  }
  return sub || freeSub(userId);
}

/** Activate/extend premium. Called ONLY after admin approval or verified gateway signature. */
export async function activatePremium(userId: string, priceInr: number, extraDays = 30, from?: Date) {
  const existing = (await db.selectOne('subscriptions', { eq: { user_id: userId } })) as Subscription | null;
  const base = existing && isActivePremium(existing) && existing.current_period_end ? new Date(existing.current_period_end) : from || new Date();
  const days = extraDays === 0 ? 30 : extraDays;
  const row = {
    user_id: userId,
    plan: 'premium',
    status: 'active',
    price_inr: priceInr,
    current_period_start: (existing && isActivePremium(existing) ? existing.current_period_start : base.toISOString()) as string,
    current_period_end: new Date(base.getTime() + days * 86400000).toISOString(),
  };
  return db.upsert('subscriptions', row, 'user_id');
}

function readDevUserId(req?: NextRequest): string | null {
  const tok = req?.cookies.get(DEV_SESSION_COOKIE)?.value ?? safeCookie(DEV_SESSION_COOKIE);
  return readSession(tok);
}
function safeCookie(name: string): string | undefined {
  try {
    return cookies().get(name)?.value;
  } catch {
    return undefined;
  }
}

/** Normalize OAuth name and avatar URL across Google, Facebook (nested picture.data.url), and Email. */
export function extractOAuthProfileMeta(
  email: string,
  meta?: Record<string, any>
): { fullName: string; avatarUrl: string | null } {
  const rawName = meta?.full_name || meta?.name;
  const trimmedEmail = (email || '').trim().toLowerCase();
  const fullName =
    (typeof rawName === 'string' && rawName.trim()) ||
    (trimmedEmail.includes('@') ? trimmedEmail.split('@')[0] : '') ||
    'Athlete';

  let avatarUrl: string | null = null;
  if (typeof meta?.avatar_url === 'string' && meta.avatar_url.trim()) {
    avatarUrl = meta.avatar_url.trim();
  } else if (typeof meta?.picture?.data?.url === 'string' && meta.picture.data.url.trim()) {
    avatarUrl = meta.picture.data.url.trim();
  } else if (typeof meta?.picture === 'string' && meta.picture.trim()) {
    avatarUrl = meta.picture.trim();
  }

  return { fullName, avatarUrl };
}

async function loadProfile(id: string, email: string, meta?: Record<string, any>): Promise<UserProfile> {
  const { fullName, avatarUrl } = extractOAuthProfileMeta(email, meta);
  const normalized = (email || '').trim().toLowerCase();
  let p = await db.selectOne('user_profiles', { eq: { id } });
  if (!p) {
    // Missing-profile recovery: trigger may have failed. Insert safely without ever overwriting existing rows.
    try {
      await db.insertIfMissing(
        'user_profiles',
        { id, email: normalized, full_name: fullName, avatar_url: avatarUrl, role: 'user' },
        'id'
      );
      await db.insertIfMissing('subscriptions', { user_id: id, plan: 'free', status: 'active', price_inr: 0 }, 'user_id').catch(() => null);
      p = (await db.selectOne('user_profiles', { eq: { id } })) || {
        id,
        email: normalized,
        full_name: fullName,
        avatar_url: avatarUrl,
        role: 'user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    } catch {
      p = {
        id,
        email: normalized,
        full_name: fullName,
        avatar_url: avatarUrl,
        role: 'user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }
  }
  return {
    id,
    email: p.email || email,
    full_name: p.full_name || '',
    avatar_url: p.avatar_url || undefined,
    // role is DERIVED below from verified email; stored value is informational only
    role: 'user',
    created_at: p.created_at,
    updated_at: p.updated_at,
  };
}

export async function getAuthUser(req?: NextRequest): Promise<AuthContext> {
  // 1) Supabase Auth (production path)
  if (isSupabaseConfigured()) {
    const supabase = createServerClient();
    if (!supabase) return EMPTY;
    let sbUser;
    try {
      const { data, error } = await supabase.auth.getUser(); // validates JWT with Supabase Auth
      if (error || !data.user) return EMPTY;
      sbUser = data.user;
    } catch {
      return EMPTY;
    }
    const email = normalizeEmail(sbUser.email);
    const verified = Boolean(sbUser.email_confirmed_at);
    const profile = await loadProfile(sbUser.id, email, sbUser.user_metadata);
    const isAdmin = verified && isOwnerEmail(email);
    profile.role = isAdmin ? 'admin' : 'user';
    const sub = await getUserSubscription(sbUser.id);
    return { user: profile, subscription: sub, isPremium: isAdmin || isActivePremium(sub), isAdmin, emailVerified: verified };
  }

  // 2) Dev fallback (disabled in production)
  if (isDevFallbackAllowed()) {
    const uid = readDevUserId(req);
    if (!uid) return EMPTY;
    const row = await db.selectOne('dev_auth_users', { eq: { id: uid } });
    if (!row) return EMPTY;
    const profile = await loadProfile(uid, row.email);
    const isAdmin = isOwnerEmail(row.email);
    profile.role = isAdmin ? 'admin' : 'user';
    const sub = await getUserSubscription(uid);
    return { user: profile, subscription: sub, isPremium: isAdmin || isActivePremium(sub), isAdmin, emailVerified: true };
  }

  throw new ConfigError();
}

export async function isPremium(userId: string): Promise<boolean> {
  return isActivePremium(await getUserSubscription(userId));
}

/** Owner-only guard for admin APIs. Returns the context or throws an AdminDenied. */
export class AdminDenied extends Error {
  constructor(public status: 401 | 403) {
    super(status === 401 ? 'Authentication required.' : 'Forbidden.');
  }
}

export async function requireOwnerAdmin(req?: NextRequest): Promise<AuthContext & { user: UserProfile }> {
  const ctx = await getAuthUser(req);
  if (!ctx.user) throw new AdminDenied(401);
  if (!ctx.isAdmin || !ctx.emailVerified) throw new AdminDenied(403);
  return ctx as AuthContext & { user: UserProfile };
}

export async function writeAuditLog(admin: UserProfile, action: string, targetType?: string, targetId?: string, details: Record<string, any> = {}) {
  try {
    await db.insert('admin_audit_logs', {
      admin_id: admin.id,
      admin_email: admin.email,
      action,
      target_type: targetType ?? null,
      target_id: targetId ?? null,
      details,
    });
  } catch (e) {
    console.error('[audit] failed to write audit log');
  }
}
