import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { isDevFallbackAllowed } from '@/lib/config';
import { handleError, json, parseBody, requireUser } from '@/lib/api';
import { lookupAuthAccount } from '@/lib/auth-flow';

const schema = z.object({
  action: z.enum(['prepare_link', 'link', 'unlink']),
});

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireUser(req);
    const [lookup, prefRow] = await Promise.all([
      lookupAuthAccount(user.email),
      db.selectOne('user_preferences', { eq: { user_id: user.id } }).catch(() => null),
    ]);
    const prefs = prefRow?.preferences || {};
    const authOrigin = prefs.auth_origin || (lookup.hasEmailPassword ? 'email' : 'google');
    const googleLinked = Boolean(prefs.google_linked || lookup.googleLinked || authOrigin === 'google');

    return json({
      authOrigin,
      hasEmailPassword: Boolean(lookup.hasEmailPassword || authOrigin === 'email'),
      googleLinked,
      providers: lookup.providers,
    });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireUser(req);
    const { action } = await parseBody(req, schema);
    const existingPref = await db.selectOne('user_preferences', { eq: { user_id: user.id } }).catch(() => null);
    const prefs = existingPref?.preferences || {};

    const nextPrefs = { ...prefs };
    if (action === 'prepare_link') {
      nextPrefs.google_link_pending = true;
    } else if (action === 'link') {
      nextPrefs.google_linked = true;
      nextPrefs.google_link_pending = false;
    } else if (action === 'unlink') {
      nextPrefs.google_linked = false;
      nextPrefs.google_link_pending = false;
    }

    await db.upsert(
      'user_preferences',
      {
        user_id: user.id,
        theme: existingPref?.theme || 'system',
        preferences: nextPrefs,
      },
      'user_id'
    );

    if (isDevFallbackAllowed()) {
      const devUser = await db.selectOne('dev_auth_users', { eq: { id: user.id } }).catch(() => null);
      if (devUser) {
        await db
          .update('dev_auth_users', { id: user.id }, { google_linked: Boolean(nextPrefs.google_linked) })
          .catch(() => null);
      }
    }

    return json({
      success: true,
      googleLinked: Boolean(nextPrefs.google_linked),
      googleLinkPending: Boolean(nextPrefs.google_link_pending),
      message:
        action === 'unlink'
          ? 'Google Sign-In has been disconnected from your password account.'
          : 'Google Account linking updated.',
    });
  } catch (e) {
    return handleError(e);
  }
}
