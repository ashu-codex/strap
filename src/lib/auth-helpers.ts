import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createClient as createServerClient } from './supabase/server';
import { strapStore } from './store';
import { SESSION_COOKIE } from './session';
import { UserProfile, Subscription } from '@/types';

export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'ashutosh@strapfitness.com';

function isActivePremium(sub?: Subscription | null): boolean {
  if (!sub) return false;
  const notExpired = !sub.current_period_end || new Date(sub.current_period_end) > new Date();
  return sub.plan === 'premium' && sub.status === 'active' && notExpired;
}

function defaultFreeSub(userId: string): Subscription {
  return {
    id: 'sub-' + userId,
    user_id: userId,
    plan: 'free',
    status: 'active',
    price_inr: 0,
    current_period_start: new Date().toISOString(),
    current_period_end: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function pickSubscription(userId: string, remote?: Subscription | null): Subscription {
  const local = strapStore.subscriptions.get(userId) || null;
  if (isActivePremium(local)) return local!;
  if (isActivePremium(remote)) return remote!;
  return local || remote || defaultFreeSub(userId);
}

function readSessionUserId(req?: NextRequest): string | null {
  const fromReq = req?.cookies.get(SESSION_COOKIE)?.value;
  if (fromReq) return fromReq;
  try {
    const fromStore = cookies().get(SESSION_COOKIE)?.value;
    if (fromStore) return fromStore;
  } catch {
    // cookies() is unavailable outside a request context
  }
  return null;
}

function isAdminUser(user: UserProfile): boolean {
  return user.role === 'admin' || user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

export async function getAuthUser(req?: NextRequest): Promise<{
  user: UserProfile | null;
  subscription: Subscription | null;
  isPremium: boolean;
  isAdmin: boolean;
}> {
  const empty = {
    user: null as UserProfile | null,
    subscription: null as Subscription | null,
    isPremium: false,
    isAdmin: false,
  };

  try {
    const supabase = createServerClient();
    if (supabase) {
      const {
        data: { user: sbUser },
      } = await supabase.auth.getUser();

      if (sbUser) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', sbUser.id).single();

        const userObj: UserProfile = {
          id: sbUser.id,
          email: sbUser.email || '',
          full_name: profile?.full_name || sbUser.user_metadata?.full_name || 'Fitness Enthusiast',
          avatar_url: profile?.avatar_url || sbUser.user_metadata?.avatar_url,
          role: profile?.role === 'admin' || sbUser.email === ADMIN_EMAIL ? 'admin' : 'user',
          created_at: profile?.created_at || new Date().toISOString(),
          updated_at: profile?.updated_at || new Date().toISOString(),
        };

        const stored = strapStore.users.get(sbUser.id);
        if (!stored) {
          strapStore.users.set(sbUser.id, userObj);
        }

        const { data: subData } = await supabase.from('subscriptions').select('*').eq('user_id', sbUser.id).single();

        const subObj = pickSubscription(sbUser.id, subData || null);
        const isAdmin = isAdminUser(userObj);
        const isPremium = isActivePremium(subObj) || isAdmin;

        return {
          user: userObj,
          subscription: subObj,
          isPremium,
          isAdmin,
        };
      }
    }
  } catch {
    // Supabase auth failed or not configured, proceed to cookie session
  }

  const sessionUserId = readSessionUserId(req);
  if (!sessionUserId) {
    return empty;
  }

  const user = strapStore.users.get(sessionUserId);
  if (!user) {
    return empty;
  }

  const sub = pickSubscription(sessionUserId, null);
  const isAdmin = isAdminUser(user);
  const isPremium = isActivePremium(sub) || isAdmin;

  return {
    user,
    subscription: sub,
    isPremium,
    isAdmin,
  };
}
