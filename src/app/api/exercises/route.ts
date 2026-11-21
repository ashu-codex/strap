import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getAuthUser } from '@/lib/auth-helpers';
import { SEED_EXERCISES, ExtendedExerciseItem } from '@/lib/exercises';
import { db } from '@/lib/db';
import { handleError, json, parseBody, requireUser } from '@/lib/api';

const customExerciseSchema = z.object({
  name: z.string().trim().min(2).max(100),
  target_muscle: z.string().trim().min(2).max(100),
  category: z.enum([
    'Chest',
    'Back',
    'Shoulders',
    'Biceps',
    'Triceps',
    'Forearms',
    'Quadriceps',
    'Hamstrings',
    'Glutes',
    'Calves',
    'Abs',
    'Full Body',
  ]),
  equipment: z.enum(['Barbell', 'Dumbbell', 'Machine', 'Cable', 'Bodyweight', 'Resistance Band']).default('Barbell'),
  difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced']).default('Intermediate'),
  exercise_type: z.enum(['Compound', 'Isolation', 'Bodyweight', 'Cardio']).default('Compound'),
  training_styles: z.array(z.enum(['powerlifting', 'muscle_building'])).optional(),
  competition_lift: z.enum(['squat', 'bench', 'deadlift', 'accessory']).optional(),
  instructions: z.string().trim().max(1000).default('Maintain controlled form and full range of motion.'),
  default_sets: z.coerce.number().int().min(1).max(15).default(3),
  default_reps: z.string().trim().max(30).default('8-12'),
  default_rest_sec: z.coerce.number().int().min(15).max(600).default(90),
});

async function loadAllExercises(userId?: string | null): Promise<ExtendedExerciseItem[]> {
  const list: ExtendedExerciseItem[] = [...SEED_EXERCISES];
  // 1. Load admin-added global exercises from app_settings or custom_exercises table if any
  try {
    const customGlobal = await db.select('custom_exercises', { limit: 500 }).catch(() => []);
    for (const row of customGlobal) {
      if (!row.user_id || row.user_id === userId || row.is_global) {
        list.push({
          id: row.id || `custom-${row.name}`,
          name: row.name,
          target_muscle: row.target_muscle || row.category,
          secondary_muscles: Array.isArray(row.secondary_muscles) ? row.secondary_muscles : [],
          category: row.category || 'Full Body',
          equipment: row.equipment || 'Barbell',
          difficulty: row.difficulty || 'Intermediate',
          exercise_type: row.exercise_type || 'Compound',
          training_styles: row.training_styles || ['powerlifting', 'muscle_building'],
          competition_lift: row.competition_lift || 'accessory',
          instructions: row.instructions || 'Perform with strict biomechanics.',
          default_sets: Number(row.default_sets) || 3,
          default_reps: row.default_reps || '8-12',
          default_rest_sec: Number(row.default_rest_sec) || 90,
          alternatives: Array.isArray(row.alternatives) ? row.alternatives : [],
        });
      }
    }
  } catch {
    // ignore
  }

  // 2. Load user-specific custom exercises from user_preferences
  if (userId) {
    try {
      const pref = await db.selectOne('user_preferences', { eq: { user_id: userId } }).catch(() => null);
      const userCustom: any[] = Array.isArray(pref?.preferences?.custom_exercises)
        ? pref!.preferences.custom_exercises
        : [];
      for (const ex of userCustom) {
        if (!list.some((item) => item.name.toLowerCase() === String(ex.name).toLowerCase())) {
          list.push(ex);
        }
      }
    } catch {
      // ignore
    }
  }

  return list;
}

export async function GET(req: NextRequest) {
  try {
    const { user, isPremium } = await getAuthUser(req);
    const sp = new URL(req.url).searchParams;
    const category = sp.get('category');
    const difficulty = sp.get('difficulty');
    const equipment = sp.get('equipment');
    const style = sp.get('style') as 'powerlifting' | 'muscle_building' | null;
    const search = sp.get('search')?.toLowerCase().slice(0, 80);

    const allExercises = await loadAllExercises(user?.id);
    let results = [...allExercises];
    if (category && category !== 'All') {
      results = results.filter((e) => e.category.toLowerCase() === category.toLowerCase());
    }
    if (difficulty && difficulty !== 'All') {
      results = results.filter((e) => e.difficulty.toLowerCase() === difficulty.toLowerCase());
    }
    if (equipment && equipment !== 'All') {
      results = results.filter((e) => e.equipment.toLowerCase() === equipment.toLowerCase());
    }
    if (style) {
      results = results.filter((e) => !e.training_styles || e.training_styles.includes(style));
    }
    if (search) {
      results = results.filter(
        (e) =>
          e.name.toLowerCase().includes(search) ||
          e.target_muscle.toLowerCase().includes(search) ||
          e.category.toLowerCase().includes(search)
      );
    }

    return json({
      locked: false,
      isPremium: Boolean(isPremium),
      totalCount: allExercises.length,
      count: results.length,
      exercises: results,
    });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, isAdmin } = await requireUser(req);
    const body = await parseBody(req, customExerciseSchema);
    const newEx: ExtendedExerciseItem = {
      id: `custom-${Date.now()}`,
      name: body.name,
      target_muscle: body.target_muscle,
      secondary_muscles: [],
      category: body.category,
      equipment: body.equipment,
      difficulty: body.difficulty,
      exercise_type: body.exercise_type,
      training_styles: body.training_styles || ['powerlifting', 'muscle_building'],
      competition_lift: body.competition_lift || 'accessory',
      instructions: body.instructions,
      default_sets: body.default_sets,
      default_reps: body.default_reps,
      default_rest_sec: body.default_rest_sec,
      alternatives: [],
    };

    // Save in user_preferences for immediate persistence
    const existingPref = await db.selectOne('user_preferences', { eq: { user_id: user.id } }).catch(() => null);
    const prefs = existingPref?.preferences || {};
    const currentList: any[] = Array.isArray(prefs.custom_exercises) ? prefs.custom_exercises : [];
    const updatedList = [
      newEx,
      ...currentList.filter((e) => String(e.name).toLowerCase() !== newEx.name.toLowerCase()),
    ];

    await db.upsert(
      'user_preferences',
      {
        user_id: user.id,
        theme: existingPref?.theme || 'system',
        preferences: { ...prefs, custom_exercises: updatedList },
      },
      'user_id'
    );

    // Also mirror in custom_exercises table if available
    await db
      .insert('custom_exercises', {
        ...newEx,
        user_id: user.id,
        is_global: Boolean(isAdmin),
      })
      .catch(() => null);

    return json({ success: true, exercise: newEx });
  } catch (e) {
    return handleError(e);
  }
}
