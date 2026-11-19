import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { handleError, json, parseBody, requireUser } from '@/lib/api';

const opt = (min: number, max: number) => z.preprocess((v) => (v === '' || v == null ? undefined : v), z.coerce.number().min(min).max(max).optional());
const schema = z.object({
  weight_kg: z.coerce.number().min(20).max(500),
  body_fat_pct: opt(2, 70),
  chest_cm: opt(30, 250),
  waist_cm: opt(30, 250),
  hips_cm: opt(30, 250),
  arms_cm: opt(10, 100),
  recorded_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().max(500).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireUser(req);
    const measurements = await db.select('body_measurements', { eq: { user_id: user.id }, order: ['recorded_date', 'asc'], limit: 365 });
    return json({ measurements });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireUser(req);
    const m = await parseBody(req, schema);
    const entry = await db.insert('body_measurements', {
      user_id: user.id,
      recorded_date: m.recorded_date || new Date().toISOString().slice(0, 10),
      weight_kg: m.weight_kg,
      body_fat_pct: m.body_fat_pct ?? null, chest_cm: m.chest_cm ?? null, waist_cm: m.waist_cm ?? null,
      hips_cm: m.hips_cm ?? null, arms_cm: m.arms_cm ?? null, notes: m.notes ?? null,
    });
    await db.update('user_profiles', { id: user.id }, { weight: m.weight_kg });
    return json({ success: true, measurement: entry });
  } catch (e) {
    return handleError(e);
  }
}
