import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { handleError, json, parseBody } from '@/lib/api';
import { requireOwnerAdmin, writeAuditLog } from '@/lib/auth-helpers';
import { getSettings, invalidateSettingsCache } from '@/lib/settings';

export async function GET(req: NextRequest) {
  try {
    await requireOwnerAdmin(req);
    return json({
      settings: await getSettings({ bypassCache: true }),
      geminiKeyConfigured: Boolean(process.env.GEMINI_API_KEY?.trim()),
    });
  } catch (e) {
    return handleError(e);
  }
}

const schema = z.object({
  price_inr: z.coerce.number().min(1).max(100000).optional(),
  billing_period: z.enum(['monthly', 'yearly']).optional(),
  upi_id: z.string().trim().regex(/^[\w.\-]{2,64}@[\w.\-]{2,64}$/, 'Enter a valid UPI ID.').optional(),
  default_model: z.string().trim().regex(/^[\w.\-]{3,60}$/).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const admin = await requireOwnerAdmin(req);
    const patch = await parseBody(req, schema);
    const current = await getSettings({ bypassCache: true });
    const next = { ...current, ...Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)) };
    await db.upsert('app_settings', { id: 1, ...next }, 'id');
    invalidateSettingsCache();
    await writeAuditLog(admin.user, 'settings.update', 'app_settings', '1', patch);
    return json({ success: true, message: 'Admin settings updated successfully.', settings: next });
  } catch (e) {
    return handleError(e);
  }
}
