import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { getSiteUrl, isSupabaseConfigured } from '@/lib/config';
import { safeNext } from '@/lib/api';
import { ensureProfile, postAuthDestination } from '@/lib/auth-flow';
import type { EmailOtpType } from '@supabase/supabase-js';

/**
 * Handles every Supabase redirect: Google OAuth (code), email-confirmation (code or token_hash),
 * and password-recovery links. Always redirects to the configured site URL, never an
 * attacker-supplied origin.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const site = getSiteUrl(url.origin);
  const fail = (code: string) => NextResponse.redirect(`${site}/login?error=${code}`);

  const providerError = url.searchParams.get('error');
  if (providerError) {
    return fail(providerError === 'access_denied' ? 'oauth_cancelled' : 'oauth_failed');
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
    let email: string | undefined;
    let meta: Record<string, any> | undefined;

    if (code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error || !data.user) {
        const expired = (error as any)?.code === 'flow_state_expired' || /expired|invalid/i.test(error?.message || '');
        return fail(expired ? 'link_expired' : 'oauth_failed');
      }
      userId = data.user.id; email = data.user.email?.toLowerCase(); meta = data.user.user_metadata;
    } else if (tokenHash && type) {
      const { data, error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
      if (error || !data.user) return fail('link_expired');
      userId = data.user.id; email = data.user.email?.toLowerCase(); meta = data.user.user_metadata;
    } else {
      return fail('oauth_failed');
    }

    if (!userId || !email) return fail('oauth_failed');

    // Password recovery goes straight to the reset form (session already established).
    if (next === '/reset-password') return NextResponse.redirect(`${site}/reset-password`);

    try {
      await ensureProfile(userId, email, meta); // no duplicates: ensureProfile checks first
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
