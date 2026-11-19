import { createBrowserClient } from '@supabase/ssr';

// NEXT_PUBLIC_* must be referenced literally so Next.js can inline them in the browser bundle.
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || /your-|placeholder|YOUR_/i.test(url + key)) return null;
  return createBrowserClient(url, key);
}
