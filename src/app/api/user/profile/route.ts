import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { handleError, json, parseBody, requireUser } from '@/lib/api';

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireUser(req);
    const row = await db.selectOne('user_profiles', { eq: { id: user.id } });
    return json({ profile: { ...user, ...(row ? { age: row.age, gender: row.gender, height: row.height, weight: row.weight } : {}) } });
  } catch (e) {
    return handleError(e);
  }
}

// Allow-list: role, email, id and subscription fields can NEVER be changed here.
const schema = z
  .object({
    full_name: z.string().trim().min(1).max(80).optional(),
    avatar_url: z.string().url().max(500).nullable().optional(),
    age: z.number().int().min(10).max(100).nullable().optional(),
    gender: z.string().max(30).nullable().optional(),
    height: z.number().min(50).max(272).nullable().optional(),
    weight: z.number().min(20).max(500).nullable().optional(),
    body_fat_percentage: z.number().min(2).max(70).nullable().optional(),
    fitness_goal: z.string().max(40).nullable().optional(),
    activity_level: z.string().max(40).nullable().optional(),
    experience_level: z.string().max(40).nullable().optional(),
    dietary_preference: z.string().max(40).nullable().optional(),
  })
  .strip();

export async function PUT(req: NextRequest) {
  try {
    const { user } = await requireUser(req);
    const patch = await parseBody(req, schema);
    const clean = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
    if (Object.keys(clean).length) await db.update('user_profiles', { id: user.id }, clean);
    const row = await db.selectOne('user_profiles', { eq: { id: user.id } });
    return json({ success: true, profile: { ...user, full_name: row?.full_name ?? user.full_name, avatar_url: row?.avatar_url ?? user.avatar_url } });
  } catch (e) {
    return handleError(e);
  }
}
