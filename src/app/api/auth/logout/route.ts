import { NextRequest } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/config';
import { getAuthUser } from '@/lib/auth-helpers';
import { json } from '@/lib/api';
import { DEV_SESSION_COOKIE } from '@/lib/dev-auth';

export async function POST(req: NextRequest) {
  let wasAdmin = false;
  try {
    wasAdmin = (await getAuthUser(req)).isAdmin;
  } catch {
    /* ignore: still log out */
  }
  try {
    if (isSupabaseConfigured()) {
      const supabase = createServerClient();
      // Admin: revoke ALL sessions on every device. Users: revoke this session.
      await supabase?.auth.signOut({ scope: wasAdmin ? 'global' : 'local' });
    }
  } catch {
    /* cookie clearing below still logs the browser out */
  }
  const res = json({ success: true, message: 'Logged out successfully' });
  res.cookies.set(DEV_SESSION_COOKIE, '', { path: '/', httpOnly: true, maxAge: 0 });
  return res;
}
