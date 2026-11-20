import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

/**
 * Edge middleware:
 *  1. Refreshes the Supabase session cookies (keeps users logged in across devices/tabs).
 *  2. Gatekeeps /admin and /api/admin: only the verified owner email passes.
 *     (Route handlers re-verify independently — middleware is defense in depth.)
 *  3. Gatekeeps authenticated app pages.
 */

const PROTECTED_PAGES = [
  '/dashboard', '/workout-planner', '/workout-tracker', '/exercise-library', '/nutrition',
  '/recovery', '/analytics', '/ai-assistant', '/profile', '/goals', '/onboarding',
  '/payment-history', '/checkout',
];

function configured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && key && !/your-|placeholder|YOUR_/i.test(url + key) ? { url, key } : null;
}

export async function middleware(request: NextRequest) {
  const cfg = configured();
  // Dev fallback mode (no Supabase): route handlers enforce auth; nothing to refresh here.
  if (!cfg) return NextResponse.next({ request });

  let response = NextResponse.next({ request });
  const supabase = createServerClient(cfg.url, cfg.key, {
    cookies: {
      get: (name: string) => request.cookies.get(name)?.value,
      set: (name: string, value: string, options: CookieOptions) => {
        request.cookies.set({ name, value, ...options });
        response = NextResponse.next({ request });
        response.cookies.set({ name, value, ...options });
      },
      remove: (name: string, options: CookieOptions) => {
        request.cookies.set({ name, value: '', ...options });
        response = NextResponse.next({ request });
        response.cookies.set({ name, value: '', ...options, maxAge: 0 });
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  const user = data.user;
  const path = request.nextUrl.pathname;
  const owner = (process.env.STRAP_ADMIN_EMAIL || process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const userEmail = (user?.email || user?.user_metadata?.email || '').trim().toLowerCase();
  const isOwner = Boolean(user && user.email_confirmed_at && owner && userEmail === owner);

  const isAdminApi = path.startsWith('/api/admin');
  const isAdminPage = path === '/admin' || path.startsWith('/admin/');

  if (isAdminApi && !isOwner) {
    return NextResponse.json(
      { error: user ? 'Forbidden.' : 'Authentication required.' },
      { status: user ? 403 : 401, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  if (isAdminPage && !isOwner) {
    const url = request.nextUrl.clone();
    url.pathname = user ? '/dashboard' : '/login';
    url.search = user ? '' : `?next=${encodeURIComponent(path)}`;
    return NextResponse.redirect(url);
  }

  if (!user && PROTECTED_PAGES.some((p) => path === p || path.startsWith(p + '/'))) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = `?next=${encodeURIComponent(path)}`;
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
