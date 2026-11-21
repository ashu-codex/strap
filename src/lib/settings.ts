import { db } from '@/lib/db';

export interface AppSettings {
  price_inr: number;
  billing_period: string;
  upi_id: string;
  default_model: string;
}

const SETTINGS_TTL_MS = 60_000;
let settingsCache: { value: AppSettings; expiresAt: number } | null = null;

export function invalidateSettingsCache() {
  settingsCache = null;
}

export async function getSettings(options?: { bypassCache?: boolean }): Promise<AppSettings> {
  const now = Date.now();
  if (!options?.bypassCache && settingsCache && settingsCache.expiresAt > now) {
    return settingsCache.value;
  }

  const row = await db.selectOne('app_settings', { eq: { id: 1 } }).catch(() => null);
  const value: AppSettings = {
    price_inr: Number(row?.price_inr) || Number(process.env.NEXT_PUBLIC_PREMIUM_PRICE_INR) || 100,
    billing_period: row?.billing_period || 'monthly',
    upi_id: row?.upi_id || process.env.NEXT_PUBLIC_UPI_ID || 'ashutosh-k82@ptyes',
    default_model: row?.default_model || process.env.GEMINI_MODEL || 'gemini-3.8-flash',
  };
  settingsCache = { value, expiresAt: now + SETTINGS_TTL_MS };
  return value;
}
