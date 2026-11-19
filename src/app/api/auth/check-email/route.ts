import { NextRequest } from 'next/server';
import { z } from 'zod';
import { burstLimit, clientIp, emailSchema, handleError, json, parseBody } from '@/lib/api';
import { lookupAuthAccount } from '@/lib/auth-flow';

const schema = z.object({
  email: emailSchema,
});

/**
 * Checks whether an email is already registered in Supabase Auth so the UI can
 * cleanly route existing users to Sign In and new users to Create Account.
 */
export async function POST(req: NextRequest) {
  try {
    if (!burstLimit(`check-email:${clientIp(req)}`, 30, 5 * 60_000)) {
      return json({ error: 'Too many requests. Please wait a moment and try again.' }, 429);
    }
    const { email } = await parseBody(req, schema);
    const result = await lookupAuthAccount(email);
    return json({
      email,
      exists: result.exists,
      emailVerified: result.emailVerified,
      providers: result.providers,
    });
  } catch (e) {
    return handleError(e);
  }
}
