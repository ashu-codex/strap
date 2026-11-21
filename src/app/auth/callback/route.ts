import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { getSiteUrl, isDevFallbackAllowed, isSupabaseConfigured } from '@/lib/config';
import { safeNext } from '@/lib/api';
import { ensureProfile, lookupAuthAccount, postAuthDestination } from '@/lib/auth-flow';
import { db } from '@/lib/db';
import type { EmailOtpType } from '@supabase/supabase-js';

/**
 * Handles every Supabase redirect: Google OAuth, email confirmation,
 * and password recovery links. Enforces strict separation between
 * Email+Password accounts and Google Sign-In unless explicitly linked.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const site = getSiteUrl(url.origin);
  const fail = (code: string, extra = '') =>
    NextResponse.redirect(`${site}/login?error=${code}${extra}`);

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

  // Dev fallback guard: verify Google vs Email+Password separation without live OAuth tokens
  const testGoogleEmail = url.searchParams.get('google_email')?.trim().toLowerCase();
  if (testGoogleEmail && isDevFallbackAllowed() && !isSupabaseConfigured()) {
    const lookup = await lookupAuthAccount(testGoogleEmail);
    if (lookup.exists && lookup.hasEmailPassword && !lookup.googleLinked) {
      return fail('email_password_account', `&email=${encodeURIComponent(testGoogleEmail)}`);
    }
  }

  if (!isSupabaseConfigured()) return fail('auth_unavailable');

  const supabase = createServerClient();
  if (!supabase) return fail('auth_unavailable');

  const code = url.searchParams.get('code');
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type') as EmailOtpType | null;
  const next = safeNext(url.searchParams.get('next'), '');
  const linkMode = url.searchParams.get('link') === 'google';

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

      const existingPref = await db.selectOne('user_preferences', { eq: { user_id: userId } }).catch(() => null);
      const prefs = existingPref?.preferences || {};

      // Explicit Google account linking initiated by an authenticated Email+Password user
      if (linkMode || prefs.google_link_pending) {
        await db
          .upsert(
            'user_preferences',
            {
              user_id: userId,
              theme: existingPref?.theme || 'system',
              preferences: { ...prefs, google_linked: true, google_link_pending: false },
            },
            'user_id'
          )
          .catch(() => null);
        return NextResponse.redirect(`${site}/profile?linked=google`);
      }

      // Enforce Email+Password vs Google separation when not explicitly linked
      const identities = Array.isArray(data.user.identities) ? data.user.identities : [];
      const hasEmailIdentity =
        identities.some((i: any) => i.provider === 'email') ||
        (Array.isArray(data.user.app_metadata?.providers) && data.user.app_metadata.providers.includes('email')) ||
        prefs.auth_origin === 'email' ||
        meta?.auth_origin === 'email';
      const hasGoogleIdentity =
        identities.some((i: any) => i.provider === 'google') ||
        data.user.app_metadata?.provider === 'google' ||
        (Array.isArray(data.user.app_metadata?.providers) && data.user.app_metadata.providers.includes('google'));
      const isGoogleLinked = Boolean(prefs.google_linked || meta?.google_linked);

      // If this account was created with Email+Password and Google was NOT explicitly linked,
      // reject automatic Google Sign-In merge and require password authentication.
      if (hasEmailIdentity && hasGoogleIdentity && !isGoogleLinked && next !== '/reset-password') {
        await supabase.auth.signOut().catch(() => null);
        return fail('email_password_account', email ? `&email=${encodeURIComponent(email)}` : '');
      }
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
