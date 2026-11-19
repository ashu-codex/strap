import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { getSiteUrl, isSupabaseConfigured } from '@/lib/config';
import { burstLimit, clientIp, emailSchema, handleError, json, parseBody } from '@/lib/api';

const schema = z.object({ email: emailSchema });

export async function POST(req: NextRequest) {
  try {
    const { email } = await parseBody(req, schema);
    if (!burstLimit(`resend:${clientIp(req)}:${email}`, 3, 15 * 60_000)) {
      return json({ error: 'Too many requests. Please wait a few minutes.' }, 429);
    }
    if (!isSupabaseConfigured()) return json({ error: 'Email verification requires Supabase to be configured.' }, 503);
    const supabase = createServerClient()!;
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: `${getSiteUrl(new URL(req.url).origin)}/auth/callback?next=/onboarding` },
    });
    if (error && ((error as any).status === 429 || (error as any).code === 'over_email_send_rate_limit')) {
      return json({ error: 'Too many emails requested. Please wait a few minutes.' }, 429);
    }
    return json({ success: true, message: 'If that account is awaiting verification, a new link has been sent.' });
  } catch (e) {
    return handleError(e);
  }
}
