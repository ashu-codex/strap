import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { ConfigError, isDevFallbackAllowed, isSupabaseConfigured } from '@/lib/config';
import { burstLimit, clientIp, emailSchema, handleError, json, parseBody } from '@/lib/api';
import { ensureProfile, lookupAuthAccount, postAuthDestination } from '@/lib/auth-flow';
import { DEV_SESSION_COOKIE, devCheckLogin, signSession } from '@/lib/dev-auth';

const schema = z.object({
  email: emailSchema,
  password: z.string({ required_error: 'Password is required.' }).min(1, 'Password is required.').max(200),
  next: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const { email, password, next } = await parseBody(req, schema);

    if (!burstLimit(`login:${clientIp(req)}:${email}`, 8, 5 * 60_000)) {
      return json({ error: 'Too many sign-in attempts. Please wait a few minutes and try again.', code: 'RATE_LIMITED' }, 429);
    }

    // ---------------------------------------------------------------- Supabase
    if (isSupabaseConfigured()) {
      const supabase = createServerClient();
      if (!supabase) throw new ConfigError();

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        const code = (error as any).code as string | undefined;
        const status = (error as any).status as number | undefined;

        if (code === 'email_not_confirmed') {
          return json(
            { error: 'Your email is not verified yet. Check your inbox for the verification link, or request a new one.', code: 'EMAIL_NOT_VERIFIED' },
            403
          );
        }

        if (code === 'invalid_credentials' || /invalid login credentials/i.test(error.message)) {
          // Distinguish unregistered account vs. Google-only account vs. wrong password
          const lookup = await lookupAuthAccount(email).catch(() => ({ exists: true, emailVerified: true, providers: ['email'] }));
          if (!lookup.exists) {
            return json(
              { error: 'No account found with this email. Create a new STRAP account to get started.', code: 'ACCOUNT_NOT_FOUND' },
              404
            );
          }
          if (lookup.providers.includes('google') && !lookup.providers.includes('email')) {
            return json(
              { error: 'This account was created with Google. Click "Continue with Google" to sign in.', code: 'OAUTH_ONLY' },
              400
            );
          }
          return json(
            { error: 'Incorrect password. Please try again or use Forgot Password.', code: 'INVALID_CREDENTIALS' },
            401
          );
        }

        if (code === 'over_request_rate_limit' || status === 429) {
          return json({ error: 'Too many attempts. Please wait a few minutes and try again.', code: 'RATE_LIMITED' }, 429);
        }
        if (code === 'user_banned') {
          return json({ error: 'This account has been suspended.', code: 'BANNED' }, 403);
        }
        if (error.name === 'AuthRetryableFetchError' || status === 0 || (status ?? 0) >= 500) {
          return json({ error: 'Cannot reach the authentication service. Please try again shortly.', code: 'AUTH_UNAVAILABLE' }, 503);
        }
        console.error('[login] supabase error:', code, error.message);
        return json({ error: 'Sign-in failed. Please try again.', code: 'SIGNIN_FAILED' }, 400);
      }

      const user = data.user;
      // Preserve existing user profile by UUID; only create if missing (never overwrites).
      try {
        await ensureProfile(user.id, email, user.user_metadata);
      } catch {
        console.error('[login] profile recovery deferred');
      }
      const redirectTo = await postAuthDestination(user.id, email, next).catch(() => '/dashboard');
      return json({ success: true, redirectTo });
    }

    // ---------------------------------------------------------------- Dev fallback
    if (isDevFallbackAllowed()) {
      const lookup = await lookupAuthAccount(email);
      if (!lookup.exists) {
        return json(
          { error: 'No account found with this email. Create a new STRAP account to get started.', code: 'ACCOUNT_NOT_FOUND' },
          404
        );
      }
      const id = await devCheckLogin(email, password);
      if (!id) {
        return json(
          { error: 'Incorrect password. Please try again or use Forgot Password.', code: 'INVALID_CREDENTIALS' },
          401
        );
      }
      const redirectTo = await postAuthDestination(id, email, next);
      const res = json({ success: true, redirectTo, devMode: true });
      res.cookies.set(DEV_SESSION_COOKIE, signSession(id), { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 7 });
      return res;
    }

    throw new ConfigError();
  } catch (e) {
    return handleError(e);
  }
}
