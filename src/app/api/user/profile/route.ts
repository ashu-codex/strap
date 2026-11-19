import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-helpers';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { persistStore, strapStore } from '@/lib/store';

export async function GET(req: NextRequest) {
  try {
    const { user } = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({ profile: user });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch profile' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { user } = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { full_name, avatar_url } = body;

    const supabase = createServerClient();
    if (supabase) {
      await supabase
        .from('profiles')
        .update({
          full_name,
          avatar_url,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
    }

    // Update in fallback store
    const existing = strapStore.users.get(user.id) || user;
    const updated = {
      ...existing,
      full_name: full_name ?? existing.full_name,
      avatar_url: avatar_url ?? existing.avatar_url,
      updated_at: new Date().toISOString(),
    };
    strapStore.users.set(user.id, updated);
    persistStore();

    return NextResponse.json({ success: true, profile: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update profile' }, { status: 500 });
  }
}
