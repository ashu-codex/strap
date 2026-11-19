import { NextRequest } from 'next/server';
import { getAuthUser } from '@/lib/auth-helpers';
import { SEED_EXERCISES } from '@/lib/exercises';
import { handleError, json } from '@/lib/api';

export async function GET(req: NextRequest) {
  try {
    const { isPremium } = await getAuthUser(req); // anonymous visitors => not premium => locked preview
    const sp = new URL(req.url).searchParams;
    const category = sp.get('category');
    const difficulty = sp.get('difficulty');
    const equipment = sp.get('equipment');
    const search = sp.get('search')?.toLowerCase().slice(0, 80);

    if (!isPremium) {
      return json({
        locked: true,
        isPremium: false,
        totalCount: SEED_EXERCISES.length,
        message: 'Exercise library is exclusively available to STRAP Premium members.',
        preview: SEED_EXERCISES.slice(0, 3).map((ex) => ({
          id: ex.id, name: ex.name, category: ex.category, target_muscle: ex.target_muscle,
          equipment: ex.equipment, difficulty: ex.difficulty, isLocked: true,
        })),
      });
    }

    let results = [...SEED_EXERCISES];
    if (category && category !== 'All') results = results.filter((e) => e.category.toLowerCase() === category.toLowerCase());
    if (difficulty && difficulty !== 'All') results = results.filter((e) => e.difficulty.toLowerCase() === difficulty.toLowerCase());
    if (equipment && equipment !== 'All') results = results.filter((e) => e.equipment.toLowerCase() === equipment.toLowerCase());
    if (search) results = results.filter((e) => e.name.toLowerCase().includes(search) || e.target_muscle.toLowerCase().includes(search) || e.category.toLowerCase().includes(search));

    return json({ locked: false, isPremium: true, count: results.length, exercises: results });
  } catch (e) {
    return handleError(e);
  }
}
