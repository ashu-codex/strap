import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import { db } from '@/lib/db';
import { activatePremium } from '@/lib/auth-helpers';
import { handleError, json, parseBody, requireUser } from '@/lib/api';

const schema = z.object({
  razorpay_order_id: z.string().min(5).max(64),
  razorpay_payment_id: z.string().min(5).max(64),
  razorpay_signature: z.string().min(10).max(200),
});

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireUser(req);
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) return json({ error: 'Online payments are not enabled. Use manual UPI verification.' }, 501);

    const b = await parseBody(req, schema);

    // The order MUST have been created by us for THIS user (amount comes from our row, never the client).
    const payment = await db.selectOne('payments', { eq: { gateway_order_id: b.razorpay_order_id, user_id: user.id } });
    if (!payment) return json({ error: 'Unknown payment order.' }, 404);
    if (payment.payment_status === 'approved') return json({ success: true, message: 'Payment already processed.' });

    const expected = crypto.createHmac('sha256', keySecret).update(`${b.razorpay_order_id}|${b.razorpay_payment_id}`).digest('hex');
    if (!safeEqual(expected, b.razorpay_signature)) return json({ error: 'Payment verification failed.' }, 400);

    await db.update('payments', { id: payment.id }, {
      payment_status: 'approved',
      gateway_payment_id: b.razorpay_payment_id,
      utr_reference: b.razorpay_payment_id,
      verified_by: 'razorpay_signature',
      verified_at: new Date().toISOString(),
      admin_notes: `Signature-verified Razorpay order ${b.razorpay_order_id}`,
    });
    const subscription = await activatePremium(user.id, Number(payment.amount_inr));
    return json({ success: true, message: 'Payment verified. STRAP Premium is now active!', subscription });
  } catch (e) {
    return handleError(e);
  }
}
