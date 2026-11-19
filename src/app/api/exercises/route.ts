import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-helpers';
import { SEED_EXERCISES } from '@/lib/store';

export async function GET(req: NextRequest) {
  try {
    const { isPremium } = await getAuthUser(req);
    const { searchParams } = new URL(req.url);

    const category = searchParams.get('category');
    const difficulty = searchParams.get('difficulty');
    const equipment = searchParams.get('equipment');
    const search = searchParams.get('search')?.toLowerCase();

    // STRICT PREMIUM CHECK: Free users get locked preview only
    if (!isPremium) {
      return NextResponse.json({
        locked: true,
        isPremium: false,
        totalCount: SEED_EXERCISES.length,
        message: 'Exercise library is exclusively available to STRAP Premium members.',
        preview: SEED_EXERCISES.slice(0, 3).map((ex) => ({
          id: ex.id,
          name: ex.name,
          category: ex.category,
          target_muscle: ex.target_muscle,
          equipment: ex.equipment,
          difficulty: ex.difficulty,
          isLocked: true,
        })),
      });
    }

    let results = [...SEED_EXERCISES];

    if (category && category !== 'All') {
      results = results.filter((ex) => ex.category.toLowerCase() === category.toLowerCase());
    }

    if (difficulty && difficulty !== 'All') {
      results = results.filter((ex) => ex.difficulty.toLowerCase() === difficulty.toLowerCase());
    }

    if (equipment && equipment !== 'All') {
      results = results.filter((ex) => ex.equipment.toLowerCase() === equipment.toLowerCase());
    }

    if (search) {
      results = results.filter(
        (ex) =>
          ex.name.toLowerCase().includes(search) ||
          ex.target_muscle.toLowerCase().includes(search) ||
          ex.category.toLowerCase().includes(search)
      );
    }

    return NextResponse.json({
      locked: false,
      isPremium: true,
      count: results.length,
      exercises: results,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
