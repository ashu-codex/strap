import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { db } from '@/lib/db';
import { handleError, json, requireUser } from '@/lib/api';

const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireUser(req);
    const admin = createAdminClient();
    if (!admin) {
      return json({ error: 'Profile image uploads require Supabase Storage to be configured.' }, 503);
    }

    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return json({ error: 'Please select an image file.' }, 400);
    }
    const ext = ALLOWED_TYPES[file.type];
    if (!ext) {
      return json({ error: 'Only JPEG, PNG, and WebP images are supported.' }, 400);
    }
    if (file.size > MAX_BYTES) {
      return json({ error: 'Image must be 5 MB or smaller.' }, 400);
    }

    const objectPath = `${user.id}/avatar.${ext}`;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { error: uploadErr } = await admin.storage
      .from('avatars')
      .upload(objectPath, bytes, { contentType: file.type, upsert: true });

    if (uploadErr) {
      console.error('[avatar] upload error:', uploadErr.message);
      return json({ error: 'Could not upload profile image. Please try again.' }, 502);
    }

    const { data: pub } = admin.storage.from('avatars').getPublicUrl(objectPath);
    const avatarUrl = `${pub.publicUrl}?t=${Date.now()}`;
    await db.update('user_profiles', { id: user.id }, { avatar_url: avatarUrl });

    return json({ success: true, avatar_url: avatarUrl });
  } catch (e) {
    return handleError(e);
  }
}
