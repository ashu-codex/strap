import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { getSiteUrl, isSupabaseConfigured } from '@/lib/config';
import { burstLimit, clientIp, emailSchema, handleError, json, parseBody } from '@/lib/api';

const schema = z.object({ email: emailSchema });

/** Always returns the same message so account existence is never revealed. */
export async function POST(req: NextRequest) {
  try {
    const { email } = await parseBody(req, schema);
    if (!burstLimit(`forgot:${clientIp(req)}`, 5, 15 * 60_000)) {
      return json({ error: 'Too many requests. Please wait a few minutes and try again.' }, 429);
    }
    const generic = { success: true, message: 'If an account exists for that email, a password reset link has been sent.' };

    if (!isSupabaseConfigured()) {
      return json({ ...generic, devMode: true, note: 'Password reset email needs Supabase configured.' });
    }
    const supabase = createServerClient();
    const { error } = await supabase!.auth.resetPasswordForEmail(email, {
      redirectTo: `${getSiteUrl(new URL(req.url).origin)}/auth/callback?next=/reset-password`,
    });
    if (error) {
      const status = (error as any).status as number | undefined;
      if (status === 429) return json({ error: 'Too many requests. Please wait a few minutes and try again.' }, 429);
      if (error.name === 'AuthRetryableFetchError' || (status ?? 0) >= 500) {
        return json({ error: 'Cannot reach the authentication service. Please try again shortly.' }, 503);
      }
      console.error('[forgot-password]', (error as any).code, error.message);
    }
    return json(generic);
  } catch (e) {
    return handleError(e);
  }
}
