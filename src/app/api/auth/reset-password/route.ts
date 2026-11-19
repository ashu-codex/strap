import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { handleError, json, parseBody, passwordSchema } from '@/lib/api';
import { isSupabaseConfigured } from '@/lib/config';

const schema = z.object({ password: passwordSchema });

/** Requires the recovery session established by /auth/callback. */
export async function POST(req: NextRequest) {
  try {
    const { password } = await parseBody(req, schema);
    if (!isSupabaseConfigured()) return json({ error: 'Password reset requires Supabase to be configured.' }, 503);
    const supabase = createServerClient()!;
    const { data: sess } = await supabase.auth.getUser();
    if (!sess.user) {
      return json({ error: 'Your reset link has expired or was already used. Please request a new one.', code: 'LINK_EXPIRED' }, 401);
    }
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      const code = (error as any).code as string | undefined;
      if (code === 'weak_password') return json({ error: 'That password is too weak.', code: 'WEAK_PASSWORD' }, 400);
      if (code === 'same_password') return json({ error: 'Choose a password different from your current one.', code: 'SAME_PASSWORD' }, 400);
      if (error.name === 'AuthRetryableFetchError') return json({ error: 'Cannot reach the authentication service. Please try again.' }, 503);
      console.error('[reset-password]', code, error.message);
      return json({ error: 'Could not update your password. Please request a new link.' }, 400);
    }
    return json({ success: true, message: 'Password updated. You are signed in.', redirectTo: '/dashboard' });
  } catch (e) {
    return handleError(e);
  }
}
