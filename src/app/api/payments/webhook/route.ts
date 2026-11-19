import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';
import { activatePremium } from '@/lib/auth-helpers';
import { handleError, json } from '@/lib/api';

export async function POST(req: NextRequest) {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) return json({ error: 'Webhook not configured' }, 501);

    const signature = req.headers.get('x-razorpay-signature');
    if (!signature) return json({ error: 'Missing signature' }, 400);

    const raw = await req.text();
    const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex');
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return json({ error: 'Invalid signature' }, 400);

    const payload = JSON.parse(raw);
    if (payload.event === 'payment.captured' || payload.event === 'order.paid') {
      const p = payload.payload?.payment?.entity;
      const orderId: string | undefined = p?.order_id;
      if (orderId && p?.id) {
        const row = await db.selectOne('payments', { eq: { gateway_order_id: orderId } });
        // Only settle orders WE created, and only for the amount we expected.
        if (row && row.payment_status !== 'approved' && Number(p.amount) === Math.round(Number(row.amount_inr) * 100)) {
          await db.update('payments', { id: row.id }, {
            payment_status: 'approved',
            gateway_payment_id: p.id,
            utr_reference: p.id,
            verified_by: 'razorpay_webhook',
            verified_at: new Date().toISOString(),
            admin_notes: 'Webhook-verified payment capture',
          });
          await activatePremium(row.user_id, Number(row.amount_inr));
        }
      }
    }
    return json({ status: 'ok' });
  } catch (e) {
    return handleError(e);
  }
}
