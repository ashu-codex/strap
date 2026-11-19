import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { SESSION_COOKIE, clearSessionCookieOptions } from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient();
    if (supabase) {
      await supabase.auth.signOut();
    }

    const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
    response.cookies.set(SESSION_COOKIE, '', clearSessionCookieOptions);
    return response;
  } catch (error: any) {
    const response = NextResponse.json({ success: true });
    response.cookies.set(SESSION_COOKIE, '', clearSessionCookieOptions);
    return response;
  }
}
