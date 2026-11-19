/**
 * Central, server/client-safe environment configuration.
 * Only NEXT_PUBLIC_* values are readable in browser code. Privileged secrets
 * (service role key, Gemini key) are read lazily and ONLY from server modules.
 */

export const isProduction = process.env.NODE_ENV === 'production';

const PLACEHOLDER = /your-|placeholder|YOUR_|xxx/i;

function clean(v: string | undefined): string | undefined {
  const t = v?.trim();
  return t && !PLACEHOLDER.test(t) ? t : undefined;
}

export function getSupabaseUrl(): string | undefined {
  return clean(process.env.NEXT_PUBLIC_SUPABASE_URL);
}

/** Publishable key (new) or legacy anon key. Safe for browser use under RLS. */
export function getSupabasePublicKey(): string | undefined {
  return (
    clean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ||
    clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  );
}

/** SERVER ONLY. Never import this in client components. */
export function getSupabaseServiceKey(): string | undefined {
  return clean(process.env.SUPABASE_SERVICE_ROLE_KEY) || clean(process.env.SUPABASE_SECRET_KEY);
}

export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabasePublicKey());
}

export function isServiceRoleConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseServiceKey());
}

/** Owner admin email, normalized. Server-only (no NEXT_PUBLIC prefix). */
export function getOwnerEmail(): string | undefined {
  const raw = clean(process.env.STRAP_ADMIN_EMAIL) || clean(process.env.ADMIN_EMAIL);
  return raw ? raw.toLowerCase() : undefined;
}

/**
 * Public site URL used to build auth redirect links.
 * Order: NEXT_PUBLIC_SITE_URL -> Vercel production URL -> Vercel deploy URL -> localhost (dev only).
 */
export function getSiteUrl(fallbackOrigin?: string): string {
  const explicit = clean(process.env.NEXT_PUBLIC_SITE_URL);
  if (explicit) return explicit.replace(/\/+$/, '');
  const vercelProd = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercelProd) return `https://${vercelProd}`;
  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  if (fallbackOrigin) return fallbackOrigin.replace(/\/+$/, '');
  return 'http://localhost:3000';
}

/**
 * The local JSON "dev database" exists only so the app can be explored with
 * no credentials. It is hard-disabled in production builds.
 */
export function isDevFallbackAllowed(): boolean {
  return !isProduction && !isSupabaseConfigured();
}

export class ConfigError extends Error {
  constructor(message = 'Service is not configured.') {
    super(message);
    this.name = 'ConfigError';
  }
}
