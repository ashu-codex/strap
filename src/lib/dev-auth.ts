import 'server-only';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { db } from '@/lib/db';
import { isDevFallbackAllowed } from '@/lib/config';

/**
 * DEV-ONLY credential store used when Supabase is not configured and
 * NODE_ENV !== 'production'. Passwords are scrypt-hashed, sessions are
 * HMAC-signed and expiring. Every export refuses to run in production.
 */
export const DEV_SESSION_COOKIE = 'strap_dev_session';
const SECRET_FILE = path.join(process.cwd(), 'data', '.dev-session-secret');

function guard() {
  if (!isDevFallbackAllowed()) throw new Error('Dev auth is disabled.');
}

function secret(): string {
  if (!fs.existsSync(SECRET_FILE)) {
    fs.mkdirSync(path.dirname(SECRET_FILE), { recursive: true });
    fs.writeFileSync(SECRET_FILE, crypto.randomBytes(32).toString('hex'));
  }
  return fs.readFileSync(SECRET_FILE, 'utf8');
}

export function hashPassword(pw: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  return `${salt}:${crypto.scryptSync(pw, salt, 64).toString('hex')}`;
}

export function verifyPassword(pw: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const test = crypto.scryptSync(pw, salt, 64);
  const known = Buffer.from(hash, 'hex');
  return test.length === known.length && crypto.timingSafeEqual(test, known);
}

export function signSession(userId: string, ttlSeconds = 60 * 60 * 24 * 7): string {
  guard();
  const payload = `${userId}.${Math.floor(Date.now() / 1000) + ttlSeconds}`;
  const mac = crypto.createHmac('sha256', secret()).update(payload).digest('hex');
  return `${payload}.${mac}`;
}

export function readSession(token?: string | null): string | null {
  if (!token || !isDevFallbackAllowed()) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [uid, exp, mac] = parts;
  const expected = crypto.createHmac('sha256', secret()).update(`${uid}.${exp}`).digest('hex');
  if (mac.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null;
  if (Number(exp) < Date.now() / 1000) return null;
  return uid;
}

export async function devCreateUser(email: string, password: string, fullName: string) {
  guard();
  const existing = await db.selectOne('dev_auth_users', { eq: { email } });
  if (existing) return null;
  const id = crypto.randomUUID();
  await db.insert('dev_auth_users', { id, email, password_hash: hashPassword(password), email_confirmed: true });
  await db.insert('user_profiles', { id, email, full_name: fullName, role: 'user' });
  await db.insert('subscriptions', { user_id: id, plan: 'free', status: 'active', price_inr: 0 });
  return id;
}

export async function devCheckLogin(email: string, password: string): Promise<string | null> {
  guard();
  const u = await db.selectOne('dev_auth_users', { eq: { email } });
  if (!u || !verifyPassword(password, u.password_hash)) return null;
  return u.id;
}
