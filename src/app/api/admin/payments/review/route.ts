import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { handleError, json, parseBody } from '@/lib/api';
import { activatePremium, requireOwnerAdmin, writeAuditLog } from '@/lib/auth-helpers';
import { getSettings } from '@/lib/settings';

const schema = z.object({
  payment_id: z.string().min(1).max(64),
  action: z.enum(['approve', 'reject']),
  admin_notes: z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const admin = await requireOwnerAdmin(req); // 401/403 for anyone but the verified owner
    const { payment_id, action, admin_notes } = await parseBody(req, schema);

    const payment = await db.selectOne('payments', { eq: { id: payment_id } });
    if (!payment) return json({ error: 'Payment not found.' }, 404);

    if (payment.payment_status !== 'pending') {
      return json({ error: `This payment is already ${payment.payment_status}.`, payment }, 409);
    }

    if (action === 'reject') {
      const [updated] = await db.update('payments', { id: payment_id }, {
        payment_status: 'rejected',
        admin_notes: admin_notes || 'Rejected by administrator.',
        verified_by: admin.user.email,
        verified_at: new Date().toISOString(),
      });
      await writeAuditLog(admin.user, 'payment.reject', 'payment', payment_id, { user_id: payment.user_id, utr: payment.utr_reference });
      return json({ success: true, message: 'Payment rejected.', payment: updated });
    }

    // Approve: amount must cover the configured price.
    const settings = await getSettings();
    if (Number(payment.amount_inr) < Number(settings.price_inr)) {
      return json({ error: `Amount ₹${payment.amount_inr} is below the plan price ₹${settings.price_inr}.` }, 400);
    }

    const [updated] = await db.update('payments', { id: payment_id }, {
      payment_status: 'approved',
      admin_notes: admin_notes || 'Verified against bank credit ledger.',
      verified_by: admin.user.email,
      verified_at: new Date().toISOString(),
    });
    // Premium is activated for THE PAYMENT'S OWNER (payment.user_id), never the admin or caller.
    const subscription = await activatePremium(payment.user_id, Number(payment.amount_inr));
    await writeAuditLog(admin.user, 'payment.approve', 'payment', payment_id, {
      user_id: payment.user_id, utr: payment.utr_reference, amount: payment.amount_inr, expires: subscription.current_period_end,
    });
    return json({
      success: true,
      message: `Payment approved. Premium activated until ${new Date(subscription.current_period_end).toLocaleDateString()}.`,
      payment: updated,
      subscription,
    });
  } catch (e) {
    return handleError(e);
  }
}
