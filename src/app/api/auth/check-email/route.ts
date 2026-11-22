import { json } from '@/lib/api';

/**
 * Unauthenticated pre-submit email enumeration is intentionally disabled.
 * Account registration conflicts and sign-in errors are handled directly by
 * POST /api/auth/signup and POST /api/auth/login upon form submission.
 */
export async function POST() {
  return json(
    {
      error: 'Direct email lookup is disabled. Use Sign In or Create Account directly.',
      code: 'ENDPOINT_DISABLED',
    },
    410
  );
}
