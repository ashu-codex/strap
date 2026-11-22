import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { handleError, json, parseBody, requireUser } from '@/lib/api';

const opt = (min: number, max: number) =>
  z.preprocess((v) => (v === '' || v == null ? undefined : v), z.coerce.number().min(min).max(max).optional());

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
    const measurements = await db.select('body_measurements', {
      eq: { user_id: user.id },
      order: ['recorded_date', 'asc'],
      limit: 365,
    });
    return json({ measurements });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireUser(req);
    const m = await parseBody(req, schema);
    const recordedDate = m.recorded_date || new Date().toISOString().slice(0, 10);
    const roundedWeight = Math.round(m.weight_kg * 10) / 10;

    // Preserve previous dates as history; update same-day entry if already logged today
    const existingSameDay = await db
      .selectOne('body_measurements', { eq: { user_id: user.id, recorded_date: recordedDate } })
      .catch(() => null);

    const payload = {
      weight_kg: roundedWeight,
      body_fat_pct: m.body_fat_pct ?? existingSameDay?.body_fat_pct ?? null,
      chest_cm: m.chest_cm ?? existingSameDay?.chest_cm ?? null,
      waist_cm: m.waist_cm ?? existingSameDay?.waist_cm ?? null,
      hips_cm: m.hips_cm ?? existingSameDay?.hips_cm ?? null,
      arms_cm: m.arms_cm ?? existingSameDay?.arms_cm ?? null,
      notes: m.notes ?? existingSameDay?.notes ?? null,
    };

    const entry = existingSameDay?.id
      ? (await db.update('body_measurements', { id: existingSameDay.id }, payload))[0] || {
          ...existingSameDay,
          ...payload,
        }
      : await db.insert('body_measurements', {
          user_id: user.id,
          recorded_date: recordedDate,
          ...payload,
        });

    // Sync latest weight to user_profiles and fitness_metrics so Dashboard/Profile/Nutrition stay aligned
    const allMeasurements = await db
      .select('body_measurements', {
        eq: { user_id: user.id },
        order: ['recorded_date', 'desc'],
        limit: 1,
      })
      .catch(() => []);
    const latestWeight = allMeasurements[0]?.weight_kg ?? roundedWeight;

    await db.update('user_profiles', { id: user.id }, { weight: latestWeight }).catch(() => null);
    const existingMetrics = await db.selectOne('fitness_metrics', { eq: { user_id: user.id } }).catch(() => null);
    if (existingMetrics) {
      await db
        .update('fitness_metrics', { user_id: user.id }, { current_weight_kg: latestWeight })
        .catch(() => null);
    }

    return json({ success: true, measurement: entry });
  } catch (e) {
    return handleError(e);
  }
}
