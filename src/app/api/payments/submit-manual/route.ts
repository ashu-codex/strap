import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db, DbError } from '@/lib/db';
import { burstLimit, handleError, json, parseBody, requireUser } from '@/lib/api';
import { getSettings } from '@/lib/settings';

const schema = z.object({
  utr_reference: z
    .string({ required_error: 'UTR is required.' })
    .trim()
    .min(6, 'UTR must be 6-22 letters/numbers.')
    .max(22, 'UTR must be 6-22 letters/numbers.')
    .regex(/^[A-Za-z0-9]+$/, 'UTR can only contain letters and numbers.')
    .transform((s) => s.toUpperCase()),
  receipt_url: z.string().url().max(500).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireUser(req);
    if (!burstLimit(`utr:${user.id}`, 10, 60 * 60_000)) return json({ error: 'Too many submissions. Try again later.' }, 429);

    const { utr_reference, receipt_url } = await parseBody(req, schema);

    const pending = await db.count('payments', { eq: { user_id: user.id, payment_status: 'pending' } });
    if (pending >= 3) return json({ error: 'You already have pending payments awaiting verification.' }, 429);

    const settings = await getSettings();
    try {
      // Strictly PENDING. Premium is never granted here.
      const payment = await db.insert('payments', {
        user_id: user.id,
        user_email: user.email,
        user_name: user.full_name,
        amount_inr: settings.price_inr,
        currency: 'INR',
        payment_method: 'upi_manual',
        payment_status: 'pending',
        upi_id: settings.upi_id,
        utr_reference,
        receipt_url: receipt_url ?? null,
      });
      return json({
        success: true,
        activated: false,
        message: 'Payment reference submitted. It is PENDING verification by the administrator. Premium is activated only after approval.',
        payment,
      });
    } catch (e) {
      if (e instanceof DbError && e.code === 'duplicate') {
        return json({ error: 'This UTR / transaction reference has already been submitted.', code: 'DUPLICATE_UTR' }, 409);
      }
      throw e;
    }
  } catch (e) {
    return handleError(e);
  }
}
