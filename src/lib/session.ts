export const SESSION_COOKIE = 'strap_session_user';

export const sessionCookieOptions = {
  path: '/',
  httpOnly: true,
  sameSite: 'lax' as const,
  maxAge: 60 * 60 * 24 * 7,
};

export const clearSessionCookieOptions = {
  path: '/',
  httpOnly: true,
  sameSite: 'lax' as const,
  maxAge: 0,
};
