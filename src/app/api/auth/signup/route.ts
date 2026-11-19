import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { persistStore, strapStore } from '@/lib/store';
import { ADMIN_EMAIL } from '@/lib/auth-helpers';
import { SESSION_COOKIE, sessionCookieOptions } from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, full_name } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    // Try Supabase Auth
    const supabase = createServerClient();
    if (supabase) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: full_name || email.split('@')[0],
          },
        },
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      if (data.user) {
        // Create initial profile in profiles table
        await supabase.from('profiles').upsert({
          id: data.user.id,
          email: data.user.email,
          full_name: full_name || email.split('@')[0],
          role: data.user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() ? 'admin' : 'user',
        });

        // Create default free subscription
        await supabase.from('subscriptions').upsert({
          user_id: data.user.id,
          plan: 'free',
          status: 'active',
          price_inr: 0,
        });

        const response = NextResponse.json({
          success: true,
          user: data.user,
          requiresEmailVerification: !data.session,
          redirectTo: '/onboarding',
        });

        response.cookies.set(SESSION_COOKIE, data.user.id, sessionCookieOptions);

        return response;
      }
    }

    // Fallback store signup
    const newId = 'user-' + Date.now();
    const isAdmin = email.toLowerCase() === ADMIN_EMAIL.toLowerCase();

    const newUser = {
      id: newId,
      email,
      full_name: full_name || email.split('@')[0],
      role: isAdmin ? ('admin' as const) : ('user' as const),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const existing = Array.from(strapStore.users.values()).find(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    );
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
    }

    strapStore.users.set(newId, newUser);
    strapStore.subscriptions.set(newId, {
      id: 'sub-' + newId,
      user_id: newId,
      plan: isAdmin ? 'premium' : 'free',
      status: 'active',
      price_inr: 0,
      current_period_start: new Date().toISOString(),
      current_period_end: isAdmin ? new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString() : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    persistStore();

    const response = NextResponse.json({
      success: true,
      user: newUser,
      requiresEmailVerification: false,
      redirectTo: '/onboarding',
    });

    response.cookies.set(SESSION_COOKIE, newId, sessionCookieOptions);

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Registration failed' }, { status: 500 });
  }
}
