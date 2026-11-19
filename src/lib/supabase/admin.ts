import 'server-only';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { getSupabaseServiceKey, getSupabaseUrl } from '@/lib/config';

/**
 * SERVER-ONLY privileged client (bypasses RLS). The `server-only` import makes the
 * build fail if this file is ever imported from client code.
 * Callers MUST verify the acting user before using it.
 */
export function createAdminClient() {
  const url = getSupabaseUrl();
  const key = getSupabaseServiceKey();
  if (!url || !key) return null;
  return createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
