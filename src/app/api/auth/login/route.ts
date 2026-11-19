import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { persistStore, strapStore } from '@/lib/store';
import { ADMIN_EMAIL } from '@/lib/auth-helpers';
import { SESSION_COOKIE, sessionCookieOptions } from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, demoType } = body;

    // Handle Quick Demo Login for instant zero-config testing
    if (demoType === 'admin') {
      const response = NextResponse.json({
        success: true,
        user: strapStore.users.get('admin-demo-1'),
        redirectTo: '/admin',
      });
      response.cookies.set(SESSION_COOKIE, 'admin-demo-1', sessionCookieOptions);
      return response;
    }

    if (demoType === 'user' || demoType === 'alex') {
      const response = NextResponse.json({
        success: true,
        user: strapStore.users.get('user-demo-1'),
        redirectTo: '/dashboard',
      });
      response.cookies.set(SESSION_COOKIE, 'user-demo-1', sessionCookieOptions);
      return response;
    }

    // Standard email/password check
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // Try Supabase Auth
    const supabase = createServerClient();
    if (supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 401 });
      }

      const isAdmin = data.user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

      const response = NextResponse.json({
        success: true,
        user: data.user,
        redirectTo: isAdmin ? '/admin' : '/dashboard',
      });

      response.cookies.set(SESSION_COOKIE, data.user.id, sessionCookieOptions);

      return response;
    }

    // Fallback store login
    let matchedUser = Array.from(strapStore.users.values()).find(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    );

    if (!matchedUser) {
      return NextResponse.json({ error: 'Invalid credentials. Create an account first.' }, { status: 401 });
    }

    persistStore();

    const isAdmin = matchedUser.role === 'admin' || matchedUser.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();

    const response = NextResponse.json({
      success: true,
      user: matchedUser,
      redirectTo: isAdmin ? '/admin' : '/dashboard',
    });

    response.cookies.set(SESSION_COOKIE, matchedUser.id, sessionCookieOptions);

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Login failed' }, { status: 500 });
  }
}
