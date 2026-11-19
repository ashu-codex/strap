import { db } from '@/lib/db';

export interface AppSettings {
  price_inr: number;
  billing_period: string;
  upi_id: string;
  default_model: string;
}

export async function getSettings(): Promise<AppSettings> {
  const row = await db.selectOne('app_settings', { eq: { id: 1 } }).catch(() => null);
  return {
    price_inr: Number(row?.price_inr) || Number(process.env.NEXT_PUBLIC_PREMIUM_PRICE_INR) || 100,
    billing_period: row?.billing_period || 'monthly',
    upi_id: row?.upi_id || process.env.NEXT_PUBLIC_UPI_ID || '',
    default_model: row?.default_model || process.env.GEMINI_MODEL || 'gemini-3.8-flash',
  };
}
