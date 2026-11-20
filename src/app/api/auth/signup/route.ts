import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { ConfigError, getSiteUrl, isDevFallbackAllowed, isSupabaseConfigured } from '@/lib/config';
import { burstLimit, clientIp, emailSchema, handleError, json, parseBody, passwordSchema } from '@/lib/api';
import { ensureProfile, lookupAuthAccount } from '@/lib/auth-flow';
import { DEV_SESSION_COOKIE, devCreateUser, signSession } from '@/lib/dev-auth';
import { db } from '@/lib/db';

const schema = z.object({
  email: emailSchema,
  password: passwordSchema,
  full_name: z.string().trim().max(80).optional(),
  next: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    if (!burstLimit(`signup:${clientIp(req)}`, 10, 10 * 60_000)) {
      return json({ error: 'Too many attempts. Please wait a few minutes and try again.' }, 429);
    }
    const { email, password, full_name } = await parseBody(req, schema);
    const name = full_name || email.split('@')[0];

    // Check if the email is already registered BEFORE attempting signup (prevents duplicates)
    const existingAccount = await lookupAuthAccount(email);
    if (existingAccount.exists) {
      const hasEmail = existingAccount.providers.includes('email');
      const hasGoogle = existingAccount.providers.includes('google');
      const hasFacebook = existingAccount.providers.includes('facebook');
      let msg = 'This email is already registered. Please sign in to your existing account.';
      if (!hasEmail) {
        if (hasGoogle && hasFacebook) {
          msg = 'This email is already registered with Google / Facebook. Please sign in using your social account.';
        } else if (hasFacebook) {
          msg = 'This email is already registered with Facebook. Please click "Continue with Facebook" to sign in.';
        } else if (hasGoogle) {
          msg = 'This email is already registered with Google. Please click "Continue with Google" to sign in.';
        }
      }
      return json(
        {
          error: msg,
          code: 'ACCOUNT_EXISTS',
          providers: existingAccount.providers,
        },
        409
      );
    }

    // ---------------------------------------------------------------- Supabase
    if (isSupabaseConfigured()) {
      const supabase = createServerClient();
      if (!supabase) throw new ConfigError();

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
          emailRedirectTo: `${getSiteUrl(new URL(req.url).origin)}/auth/callback?next=/onboarding`,
        },
      });

      if (error) {
        const code = (error as any).code as string | undefined;
        if (code === 'user_already_exists' || /already registered/i.test(error.message)) {
          return json(
            { error: 'This email is already registered. Please sign in to your existing account.', code: 'ACCOUNT_EXISTS' },
            409
          );
        }
        if (code === 'weak_password') {
          return json({ error: 'That password is too weak. Use at least 8 characters with letters and numbers.', code: 'WEAK_PASSWORD' }, 400);
        }
        if (code === 'over_email_send_rate_limit' || (error as any).status === 429) {
          return json({ error: 'Too many emails requested. Please wait a few minutes and try again.', code: 'RATE_LIMITED' }, 429);
        }
        if (code === 'email_address_invalid') {
          return json({ error: 'Please enter a valid email address.', code: 'INVALID_EMAIL' }, 400);
        }
        if (code === 'signup_disabled') {
          return json({ error: 'Sign-ups are currently disabled.', code: 'SIGNUP_DISABLED' }, 403);
        }
        if (error.name === 'AuthRetryableFetchError' || (error as any).status === 0 || ((error as any).status ?? 0) >= 500) {
          return json({ error: 'Cannot reach the authentication service. Please try again shortly.', code: 'AUTH_UNAVAILABLE' }, 503);
        }
        console.error('[signup] supabase error:', code, error.message);
        return json({ error: 'Could not create your account. Please try again.', code: 'SIGNUP_FAILED' }, 400);
      }

      // Supabase returns an obfuscated user with empty identities if the email already exists.
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        return json(
          { error: 'This email is already registered. Please sign in to your existing account.', code: 'ACCOUNT_EXISTS' },
          409
        );
      }

      if (data.user) {
        try {
          await ensureProfile(data.user.id, email, { full_name: name });
        } catch {
          console.error('[signup] profile creation deferred');
        }
      }

      const needsVerification = !data.session;
      return json({
        success: true,
        requiresEmailVerification: needsVerification,
        message: needsVerification
          ? `We sent a verification link to ${email}. Open it (on any device) to activate your account, then sign in.`
          : 'Account created.',
        redirectTo: needsVerification ? null : '/onboarding',
      });
    }

    // ---------------------------------------------------------------- Dev fallback
    if (isDevFallbackAllowed()) {
      const id = await devCreateUser(email, password, name);
      if (!id) {
        return json(
          { error: 'This email is already registered. Please sign in to your existing account.', code: 'ACCOUNT_EXISTS' },
          409
        );
      }
      await db.selectOne('user_profiles', { eq: { id } });
      const res = json({ success: true, requiresEmailVerification: false, redirectTo: '/onboarding', devMode: true });
      res.cookies.set(DEV_SESSION_COOKIE, signSession(id), { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 7 });
      return res;
    }

    throw new ConfigError();
  } catch (e) {
    return handleError(e);
  }
}
