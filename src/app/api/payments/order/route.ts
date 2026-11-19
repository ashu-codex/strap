import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';
import { handleError, json, requireUser } from '@/lib/api';
import { getSettings } from '@/lib/settings';

/** Creates a gateway order (Razorpay) OR returns direct-UPI details. No fake orders. */
export async function POST(req: NextRequest) {
  try {
    const { user } = await requireUser(req);
    const settings = await getSettings();
    const price = settings.price_inr;

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (keyId && keySecret) {
      const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
      const receipt = `rc_${crypto.randomBytes(8).toString('hex')}`;
      const orderRes = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Math.round(price * 100), currency: 'INR', receipt, notes: { user_id: user.id, plan: 'STRAP Premium' } }),
      });
      const order = await orderRes.json();
      if (!orderRes.ok) {
        console.error('[order] razorpay error', order?.error?.code);
        return json({ error: 'Payment gateway is unavailable. Please use direct UPI or try again.' }, 502);
      }
      // Server-side record of what we expect to be paid; verify/webhook trust ONLY this row.
      await db.insert('payments', {
        user_id: user.id,
        user_email: user.email,
        user_name: user.full_name,
        amount_inr: price,
        currency: 'INR',
        payment_method: 'razorpay',
        payment_status: 'pending',
        upi_id: 'razorpay',
        gateway_order_id: order.id,
      });
      return json({ success: true, gateway: 'razorpay', key_id: keyId, order_id: order.id, amount: order.amount, currency: order.currency });
    }

    return json({
      success: true,
      gateway: 'manual_upi',
      amount: Math.round(price * 100),
      currency: 'INR',
      upi_id: settings.upi_id,
      message: 'Pay via UPI, then submit your transaction reference (UTR) for admin verification.',
    });
  } catch (e) {
    return handleError(e);
  }
}
