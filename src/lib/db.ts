import 'server-only';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { ConfigError, isDevFallbackAllowed, isServiceRoleConfigured } from '@/lib/config';

/**
 * Minimal data-access layer.
 *  - Production / configured: Supabase PostgreSQL (service-role client, server only).
 *  - Local development WITHOUT Supabase credentials: a JSON file (data/dev-db.json).
 *    This fallback is hard-disabled in production builds.
 * Every route authorizes the caller BEFORE touching this layer; RLS protects
 * direct browser access as a second wall.
 */

export type Row = Record<string, any>;

export interface Query {
  eq?: Row;
  gte?: Row;
  order?: [string, 'asc' | 'desc'];
  limit?: number;
}

export class DbError extends Error {
  constructor(public code: 'duplicate' | 'unavailable' | 'unknown', message: string) {
    super(message);
    this.name = 'DbError';
  }
}

// ---------------------------------------------------------------- local dev backend
const DEV_FILE = path.join(process.cwd(), 'data', 'dev-db.json');
type DevDb = Record<string, Row[]>;

function loadDev(): DevDb {
  try {
    if (fs.existsSync(DEV_FILE)) return JSON.parse(fs.readFileSync(DEV_FILE, 'utf8'));
  } catch {
    /* corrupted dev file -> start empty */
  }
  return {};
}
function saveDev(db: DevDb) {
  fs.mkdirSync(path.dirname(DEV_FILE), { recursive: true });
  fs.writeFileSync(DEV_FILE, JSON.stringify(db, null, 2), 'utf8');
}

function matches(row: Row, q: Query): boolean {
  for (const [k, v] of Object.entries(q.eq || {})) if (row[k] !== v) return false;
  for (const [k, v] of Object.entries(q.gte || {})) if (!(row[k] >= v)) return false;
  return true;
}

function localSelect(table: string, q: Query): Row[] {
  let rows = (loadDev()[table] || []).filter((r) => matches(r, q));
  if (q.order) {
    const [col, dir] = q.order;
    rows = [...rows].sort((a, b) => (a[col] > b[col] ? 1 : a[col] < b[col] ? -1 : 0) * (dir === 'desc' ? -1 : 1));
  }
  return q.limit ? rows.slice(0, q.limit) : rows;
}

const PK_TABLES = new Set(['fitness_metrics', 'fitness_goals', 'user_preferences']); // pk = user_id
const USER_UNIQUE_TABLES = new Set(['subscriptions']);

function localInsert(table: string, row: Row): Row {
  const db = loadDev();
  const rows = (db[table] ||= []);
  const now = new Date().toISOString();
  const full: Row = { id: crypto.randomUUID(), created_at: now, updated_at: now, ...row };
  if (table === 'payments' && full.utr_reference) {
    const dup = rows.find(
      (p) => p.utr_reference?.toUpperCase() === String(full.utr_reference).toUpperCase() && p.payment_status !== 'rejected'
    );
    if (dup) throw new DbError('duplicate', 'duplicate utr');
  }
  if (PK_TABLES.has(table) || USER_UNIQUE_TABLES.has(table)) {
    if (rows.some((r) => r.user_id === full.user_id)) throw new DbError('duplicate', 'duplicate user row');
  }
  rows.push(full);
  saveDev(db);
  return full;
}

function localUpdate(table: string, match: Row, patch: Row): Row[] {
  const db = loadDev();
  const out: Row[] = [];
  for (const r of db[table] || []) {
    if (matches(r, { eq: match })) {
      Object.assign(r, patch, { updated_at: new Date().toISOString() });
      out.push(r);
    }
  }
  saveDev(db);
  return out;
}

function localDelete(table: string, match: Row): number {
  const db = loadDev();
  const prev = db[table] || [];
  const next = prev.filter((r) => !matches(r, { eq: match }));
  db[table] = next;
  saveDev(db);
  return prev.length - next.length;
}

// ---------------------------------------------------------------- public API
function backend() {
  if (isServiceRoleConfigured()) return { kind: 'supabase' as const, client: createAdminClient()! };
  if (isDevFallbackAllowed()) return { kind: 'local' as const };
  throw new ConfigError('Database is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
}

function wrap(err: any): never {
  if (err?.code === '23505') throw new DbError('duplicate', 'duplicate');
  console.error('[db] error:', err?.code, err?.message);
  throw new DbError(err?.message?.includes('fetch') ? 'unavailable' : 'unknown', 'Database request failed');
}

export const db = {
  async select(table: string, q: Query = {}): Promise<Row[]> {
    const b = backend();
    if (b.kind === 'local') return localSelect(table, q);
    let query = b.client.from(table).select('*');
    for (const [k, v] of Object.entries(q.eq || {})) query = query.eq(k, v);
    for (const [k, v] of Object.entries(q.gte || {})) query = query.gte(k, v);
    if (q.order) query = query.order(q.order[0], { ascending: q.order[1] === 'asc' });
    if (q.limit) query = query.limit(q.limit);
    const { data, error } = await query;
    if (error) wrap(error);
    return data || [];
  },

  async selectOne(table: string, q: Query = {}): Promise<Row | null> {
    return (await db.select(table, { ...q, limit: 1 }))[0] || null;
  },

  async count(table: string, q: Query = {}): Promise<number> {
    const b = backend();
    if (b.kind === 'local') return localSelect(table, q).length;
    let query = b.client.from(table).select('*', { count: 'exact', head: true });
    for (const [k, v] of Object.entries(q.eq || {})) query = query.eq(k, v);
    for (const [k, v] of Object.entries(q.gte || {})) query = query.gte(k, v);
    const { count, error } = await query;
    if (error) wrap(error);
    return count || 0;
  },

  async insert(table: string, row: Row): Promise<Row> {
    const b = backend();
    if (b.kind === 'local') return localInsert(table, row);
    const { data, error } = await b.client.from(table).insert(row).select().single();
    if (error) wrap(error);
    return data!;
  },

  /** Insert or update on the given conflict column list (comma separated). */
  async upsert(table: string, row: Row, onConflict: string): Promise<Row> {
    const b = backend();
    if (b.kind === 'local') {
      const keys = onConflict.split(',').map((s) => s.trim());
      const existing = localSelect(table, { eq: Object.fromEntries(keys.map((k) => [k, row[k]])) })[0];
      if (existing) return localUpdate(table, Object.fromEntries(keys.map((k) => [k, row[k]])), row)[0];
      return localInsert(table, row);
    }
    const { data, error } = await b.client.from(table).upsert(row, { onConflict }).select().single();
    if (error) wrap(error);
    return data!;
  },

  /** Insert only if no matching row exists on `onConflict`; NEVER overwrites existing data. */
  async insertIfMissing(table: string, row: Row, onConflict: string): Promise<Row | null> {
    const b = backend();
    if (b.kind === 'local') {
      const keys = onConflict.split(',').map((s) => s.trim());
      const existing = localSelect(table, { eq: Object.fromEntries(keys.map((k) => [k, row[k]])) })[0];
      if (existing) return existing;
      return localInsert(table, row);
    }
    const { data, error } = await b.client
      .from(table)
      .upsert(row, { onConflict, ignoreDuplicates: true })
      .select()
      .maybeSingle();
    if (error) wrap(error);
    return data;
  },

  async update(table: string, match: Row, patch: Row): Promise<Row[]> {
    const b = backend();
    if (b.kind === 'local') return localUpdate(table, match, patch);
    let query = b.client.from(table).update(patch);
    for (const [k, v] of Object.entries(match)) query = query.eq(k, v);
    const { data, error } = await query.select();
    if (error) wrap(error);
    return data || [];
  },

  async delete(table: string, match: Row): Promise<number> {
    const b = backend();
    if (b.kind === 'local') return localDelete(table, match);
    let query = b.client.from(table).delete();
    for (const [k, v] of Object.entries(match)) query = query.eq(k, v);
    const { data, error } = await query.select();
    if (error) wrap(error);
    return (data || []).length;
  },
};

export function usingDevFallback(): boolean {
  return !isServiceRoleConfigured() && isDevFallbackAllowed();
}
