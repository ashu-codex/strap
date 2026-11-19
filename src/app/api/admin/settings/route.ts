import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-helpers';
import { persistStore, strapStore } from '@/lib/store';

export async function GET(req: NextRequest) {
  try {
    const { isAdmin } = await getAuthUser(req);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin privileges required.' }, { status: 403 });
    }

    return NextResponse.json({
      settings: strapStore.adminSettings,
      geminiKeyConfigured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your-google-gemini-api-key'),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { isAdmin } = await getAuthUser(req);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin privileges required.' }, { status: 403 });
    }

    const body = await req.json();
    const { price_inr, billing_period, upi_id, default_model } = body;

    strapStore.adminSettings = {
      price_inr: price_inr ? Number(price_inr) : strapStore.adminSettings.price_inr,
      billing_period: billing_period || strapStore.adminSettings.billing_period,
      upi_id: upi_id || strapStore.adminSettings.upi_id,
      default_model: default_model || strapStore.adminSettings.default_model,
    };
    persistStore();

    return NextResponse.json({
      success: true,
      message: 'Admin settings updated successfully.',
      settings: strapStore.adminSettings,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
