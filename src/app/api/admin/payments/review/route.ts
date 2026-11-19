import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-helpers';
import { activatePremiumForUser, persistStore, strapStore } from '@/lib/store';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  try {
    const { isAdmin, user } = await getAuthUser(req);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin privileges required.' }, { status: 403 });
    }

    const body = await req.json();
    const { payment_id, action, admin_notes } = body;

    if (!payment_id || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Payment ID and valid action (approve/reject) are required' }, { status: 400 });
    }

    const payment = strapStore.payments.find((p) => p.id === payment_id);
    if (!payment) {
      return NextResponse.json({ error: 'Payment record not found' }, { status: 404 });
    }

    if (payment.payment_status !== 'pending') {
      return NextResponse.json(
        { error: `Payment is already ${payment.payment_status} and cannot be reviewed again.` },
        { status: 409 }
      );
    }

    if (action === 'approve') {
      payment.payment_status = 'approved';
      payment.admin_notes = admin_notes || 'Verified against bank/UPI ledger.';
      payment.verified_by = user?.email || 'admin@strapfitness.com';
      payment.verified_at = new Date().toISOString();
      payment.updated_at = new Date().toISOString();

      if (!strapStore.users.get(payment.user_id) && payment.user_email) {
        strapStore.users.set(payment.user_id, {
          id: payment.user_id,
          email: payment.user_email,
          full_name: payment.user_name || payment.user_email.split('@')[0],
          role: 'user',
          created_at: payment.created_at,
          updated_at: new Date().toISOString(),
        });
      }

      const updatedSub = activatePremiumForUser(payment.user_id, payment.amount_inr, 30);
      persistStore();

      const supabaseAdmin = createAdminClient();
      if (supabaseAdmin) {
        try {
          await supabaseAdmin.from('subscriptions').upsert({
            id: updatedSub.id,
            user_id: updatedSub.user_id,
            plan: updatedSub.plan,
            status: updatedSub.status,
            price_inr: updatedSub.price_inr,
            current_period_start: updatedSub.current_period_start,
            current_period_end: updatedSub.current_period_end,
            updated_at: updatedSub.updated_at,
          });
        } catch {
          // Optional remote sync; local activation is source of truth for UPI.
        }
      }

      return NextResponse.json({
        success: true,
        message: `Payment ${payment.utr_reference} successfully approved. User ${payment.user_email || payment.user_id} now has active STRAP Premium until ${new Date(updatedSub.current_period_end || '').toLocaleDateString()}.`,
        payment,
        subscription: updatedSub,
      });
    }

    payment.payment_status = 'rejected';
    payment.admin_notes = admin_notes || 'Transaction reference not found in bank records.';
    payment.verified_by = user?.email || 'admin@strapfitness.com';
    payment.verified_at = new Date().toISOString();
    payment.updated_at = new Date().toISOString();
    persistStore();

    return NextResponse.json({
      success: true,
      message: `Payment ${payment.utr_reference} marked as rejected.`,
      payment,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
