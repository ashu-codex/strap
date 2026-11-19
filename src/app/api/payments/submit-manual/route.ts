import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-helpers';
import { persistStore, strapStore } from '@/lib/store';
import { PaymentRecord } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const { user } = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { utr_reference, receipt_url } = body;

    if (!utr_reference || typeof utr_reference !== 'string' || utr_reference.trim().length < 6) {
      return NextResponse.json(
        { error: 'A valid 6-16 character UTR or UPI Transaction Reference ID is required.' },
        { status: 400 }
      );
    }

    const trimmedUTR = utr_reference.trim().toUpperCase();

    // Check for duplicate UTR
    const existing = strapStore.payments.find(
      (p) => p.utr_reference?.toUpperCase() === trimmedUTR && p.payment_status !== 'rejected'
    );
    if (existing) {
      return NextResponse.json(
        { error: 'This UTR / Transaction Reference has already been submitted and is in process.' },
        { status: 400 }
      );
    }

    const price = strapStore.adminSettings.price_inr || 100;
    const upiId = strapStore.adminSettings.upi_id || 'ashutosh-k82@ptyes';

    // Strictly save as PENDING. Never activate premium here!
    const newPayment: PaymentRecord = {
      id: 'pay-' + Date.now(),
      user_id: user.id,
      user_email: user.email,
      user_name: user.full_name,
      amount_inr: price,
      currency: 'INR',
      payment_method: 'upi_manual',
      payment_status: 'pending', // Awaiting admin bank verification
      upi_id: upiId,
      utr_reference: trimmedUTR,
      receipt_url: receipt_url || undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    strapStore.payments.unshift(newPayment);
    persistStore();

    return NextResponse.json({
      success: true,
      message: 'Payment reference submitted successfully. Your payment is currently PENDING verification by the administrator. Premium access is not granted until an admin approves this UTR.',
      payment: newPayment,
      activated: false,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
