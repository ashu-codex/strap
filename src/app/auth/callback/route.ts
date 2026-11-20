import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { getSiteUrl, isSupabaseConfigured } from '@/lib/config';
import { safeNext } from '@/lib/api';
import { ensureProfile, postAuthDestination } from '@/lib/auth-flow';
import type { EmailOtpType } from '@supabase/supabase-js';

/**
 * Handles every Supabase redirect: Google OAuth, Facebook OAuth, email confirmation,
 * and password recovery links. Always redirects to the configured site URL and identifies
 * users strictly by Supabase Auth UUID (even when Facebook does not supply an email).
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const site = getSiteUrl(url.origin);
  const fail = (code: string) => NextResponse.redirect(`${site}/login?error=${code}`);

  const providerError = url.searchParams.get('error');
  const providerErrorCode = url.searchParams.get('error_code') || '';
  const providerErrorDesc = url.searchParams.get('error_description') || '';

  if (providerError) {
    const combined = `${providerError} ${providerErrorCode} ${providerErrorDesc}`;
    if (providerError === 'access_denied' || /cancel|denied/i.test(combined)) {
      return fail('oauth_cancelled');
    }
    if (/provider is not enabled|unsupported provider/i.test(combined)) {
      return fail('provider_disabled');
    }
    if (/email/i.test(providerErrorDesc)) {
      return fail('facebook_no_email');
    }
    return fail('oauth_failed');
  }

  if (!isSupabaseConfigured()) return fail('auth_unavailable');

  const supabase = createServerClient();
  if (!supabase) return fail('auth_unavailable');

  const code = url.searchParams.get('code');
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type') as EmailOtpType | null;
  const next = safeNext(url.searchParams.get('next'), '');

  try {
    let userId: string | undefined;
    let email = '';
    let meta: Record<string, any> | undefined;

    if (code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error || !data.user) {
        const msg = error?.message || '';
        if (/email/i.test(msg)) return fail('facebook_no_email');
        const expired = (error as any)?.code === 'flow_state_expired' || /expired|invalid/i.test(msg);
        return fail(expired ? 'link_expired' : 'oauth_failed');
      }
      userId = data.user.id;
      email = (data.user.email || data.user.user_metadata?.email || '').trim().toLowerCase();
      meta = data.user.user_metadata;
    } else if (tokenHash && type) {
      const { data, error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
      if (error || !data.user) return fail('link_expired');
      userId = data.user.id;
      email = (data.user.email || data.user.user_metadata?.email || '').trim().toLowerCase();
      meta = data.user.user_metadata;
    } else {
      return fail('oauth_failed');
    }

    if (!userId) return fail('oauth_failed');

    // Password recovery goes straight to the reset form (session already established).
    if (next === '/reset-password') return NextResponse.redirect(`${site}/reset-password`);

    try {
      // Idempotent by UUID: preserves existing profile/workouts/goals or creates 1 new profile
      await ensureProfile(userId, email, meta);
    } catch {
      console.error('[callback] profile recovery deferred');
    }

    const dest = await postAuthDestination(userId, email, next).catch(() => '/dashboard');
    return NextResponse.redirect(`${site}${dest}`);
  } catch (e) {
    console.error('[callback] unexpected', e instanceof Error ? e.message : e);
    return fail('oauth_failed');
  }
}
