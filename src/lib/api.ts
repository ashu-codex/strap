import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError, ZodTypeAny } from 'zod';
import { ConfigError } from '@/lib/config';
import { DbError } from '@/lib/db';
import { AdminDenied, getAuthUser, type AuthContext } from '@/lib/auth-helpers';

export class HttpError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
  }
}

type AuthedContext = AuthContext & { user: NonNullable<AuthContext['user']> };

export async function requireUser(req: NextRequest): Promise<AuthedContext> {
  const ctx = await getAuthUser(req);
  if (!ctx.user) throw new HttpError(401, 'Please sign in to continue.', 'UNAUTHENTICATED');
  return ctx as AuthedContext;
}

export async function requirePremium(req: NextRequest): Promise<AuthedContext> {
  const ctx = await requireUser(req);
  if (!ctx.isPremium) throw new HttpError(403, 'This is a STRAP Premium feature. Upgrade to unlock it.', 'PREMIUM_REQUIRED');
  return ctx;
}

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' };

export function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

/** Maps any thrown error to a safe, non-leaking HTTP response. */
export function handleError(e: unknown) {
  if (e instanceof AdminDenied) return json({ error: e.message }, e.status);
  if (e instanceof HttpError) return json({ error: e.message, code: e.code }, e.status);
  if (e instanceof ConfigError) {
    console.error('[config]', e.message);
    return json({ error: 'The service is temporarily unavailable. Please try again later.' }, 503);
  }
  if (e instanceof DbError) {
    if (e.code === 'duplicate') return json({ error: 'This record already exists.' }, 409);
    return json({ error: 'The service is temporarily unavailable. Please try again later.' }, 503);
  }
  if (e instanceof ZodError) {
    return json({ error: e.issues[0]?.message || 'Invalid input.', fields: e.issues.map((i) => i.path.join('.')) }, 400);
  }
  console.error('[api] unexpected error:', e instanceof Error ? e.message : e);
  return json({ error: 'Something went wrong. Please try again.' }, 500);
}

export async function parseBody<T extends ZodTypeAny>(req: NextRequest, schema: T): Promise<z.infer<T>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new ZodError([{ code: 'custom', path: [], message: 'Request body must be valid JSON.' }]);
  }
  return schema.parse(raw);
}

// ---- lightweight in-memory burst limiter (per serverless instance) ----------
const buckets = new Map<string, { count: number; reset: number }>();
export function burstLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset < now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  b.count += 1;
  return b.count <= max;
}

export function clientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

/** Only allow same-site relative redirects. */
export function safeNext(next: string | null | undefined, fallback = '/dashboard'): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.includes('\\')) return fallback;
  return next;
}

export const emailSchema = z
  .string({ required_error: 'Email is required.' })
  .trim()
  .toLowerCase()
  .email('Please enter a valid email address.')
  .max(254);

export const passwordSchema = z
  .string({ required_error: 'Password is required.' })
  .min(8, 'Password must be at least 8 characters.')
  .max(72, 'Password must be at most 72 characters.')
  .refine((p) => /[A-Za-z]/.test(p) && /\d/.test(p), 'Password must contain at least one letter and one number.');
