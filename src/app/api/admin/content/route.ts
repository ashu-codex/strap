import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { handleError, HttpError, json, parseBody } from '@/lib/api';
import { requireOwnerAdmin } from '@/lib/auth-helpers';
import { SEED_EXERCISES } from '@/lib/exercises';
import { SEED_FOODS, FoodItem } from '@/lib/food-database';

export async function GET(req: NextRequest) {
  try {
    const admin = await requireOwnerAdmin(req);
    const adminPref = await db
      .selectOne('user_preferences', { eq: { user_id: admin.user.id } })
      .catch(() => null);
    const prefs = adminPref?.preferences || {};

    const customExercises: any[] = Array.isArray(prefs.admin_exercises) ? prefs.admin_exercises : [];
    const customFoods: FoodItem[] = Array.isArray(prefs.admin_foods) ? prefs.admin_foods : [];
    const deletedIds: string[] = Array.isArray(prefs.admin_deleted_content_ids)
      ? prefs.admin_deleted_content_ids
      : [];

    const allExercises = [...customExercises, ...SEED_EXERCISES].filter(
      (ex) => !deletedIds.includes(ex.id)
    );
    const allFoodsAndSupps = [...customFoods, ...SEED_FOODS].filter(
      (f) => !deletedIds.includes(f.id)
    );

    const foods = allFoodsAndSupps.filter((f) => f.category !== 'Supplements' && !f.is_supplement);
    const supplements = allFoodsAndSupps.filter(
      (f) => f.category === 'Supplements' || Boolean(f.is_supplement)
    );

    const brands = Array.from(new Set(allFoodsAndSupps.map((f) => f.brand).filter(Boolean))).sort();
    const categories = Array.from(
      new Set([
        ...allExercises.map((e) => `Exercise: ${e.category}`),
        ...allFoodsAndSupps.map((f) => `Nutrition: ${f.category}`),
      ])
    );

    return json({
      exercises: allExercises,
      foods,
      supplements,
      brands,
      categories,
    });
  } catch (e) {
    return handleError(e);
  }
}

const contentPostSchema = z.object({
  type: z.enum(['exercise', 'food', 'supplement', 'delete']),
  id: z.string().optional(),
  name: z.string().trim().max(140).optional(),
  brand: z.string().trim().max(100).optional(),
  category: z.string().trim().max(80).optional(),
  equipment: z.string().trim().max(80).optional(),
  difficulty: z.string().trim().max(40).optional(),
  calories: z.coerce.number().min(0).max(5000).optional(),
  protein_g: z.coerce.number().min(0).max(500).optional(),
  carbs_g: z.coerce.number().min(0).max(1000).optional(),
  fat_g: z.coerce.number().min(0).max(500).optional(),
  serving_label: z.string().trim().max(60).optional(),
  serving_grams: z.coerce.number().min(1).max(5000).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const admin = await requireOwnerAdmin(req);
    const body = await parseBody(req, contentPostSchema);

    const existingPref = await db
      .selectOne('user_preferences', { eq: { user_id: admin.user.id } })
      .catch(() => null);
    const prefs = existingPref?.preferences || {};
    const adminExercises: any[] = Array.isArray(prefs.admin_exercises) ? [...prefs.admin_exercises] : [];
    const adminFoods: any[] = Array.isArray(prefs.admin_foods) ? [...prefs.admin_foods] : [];
    let deletedIds: string[] = Array.isArray(prefs.admin_deleted_content_ids)
      ? [...prefs.admin_deleted_content_ids]
      : [];

    if (body.type === 'delete') {
      if (!body.id) throw new HttpError(400, 'Item ID is required to delete.');
      if (!deletedIds.includes(body.id)) deletedIds.push(body.id);
    } else if (body.type === 'exercise') {
      if (!body.name) throw new HttpError(400, 'Exercise name is required.');
      const newEx = {
        id: body.id || `admin-ex-${Date.now()}`,
        name: body.name,
        category: body.category || 'Chest',
        primary_muscles: [body.category || 'Full Body'],
        secondary_muscles: [],
        equipment: body.equipment || 'Barbell',
        difficulty: body.difficulty || 'Intermediate',
        instructions: ['Maintain strict biomechanical control throughout the full range of motion.'],
        form_cues: ['Brace core', 'Control eccentric tempo'],
        common_mistakes: ['Using excessive momentum'],
        alternatives: [],
      };
      adminExercises.unshift(newEx);
    } else if (body.type === 'food' || body.type === 'supplement') {
      if (!body.name) throw new HttpError(400, 'Item name is required.');
      const isSupp = body.type === 'supplement';
      const grams = Number(body.serving_grams) || 100;
      const factor = 100 / grams;
      const newFood = {
        id: body.id || `admin-${body.type}-${Date.now()}`,
        name: body.name,
        brand: body.brand || (isSupp ? 'Optimum Nutrition' : 'Verified Catalog'),
        category: isSupp ? 'Supplements' : body.category || 'Indian Foods',
        is_supplement: isSupp,
        default_unit: isSupp ? 'scoop' : 'serving',
        default_quantity: 1,
        servings: [
          {
            unit: isSupp ? 'scoop' : 'serving',
            label: body.serving_label || (isSupp ? `1 Scoop (${grams}g)` : `1 Serving (${grams}g)`),
            grams,
          },
          { unit: 'g', label: 'Gram (g)', grams: 1 },
        ],
        per100g: {
          calories: Math.round((Number(body.calories) || 0) * factor),
          protein_g: Math.round((Number(body.protein_g) || 0) * factor * 10) / 10,
          carbs_g: Math.round((Number(body.carbs_g) || 0) * factor * 10) / 10,
          fat_g: Math.round((Number(body.fat_g) || 0) * factor * 10) / 10,
          saturated_fat_g: 0,
          unsaturated_fat_g: 0,
          fiber_g: 0,
          sugar_g: 0,
          sodium_mg: 0,
          cholesterol_mg: 0,
        },
      };
      adminFoods.unshift(newFood);
    }

    await db.upsert(
      'user_preferences',
      {
        user_id: admin.user.id,
        theme: existingPref?.theme || 'system',
        preferences: {
          ...prefs,
          admin_exercises: adminExercises,
          admin_foods: adminFoods,
          admin_deleted_content_ids: deletedIds,
        },
      },
      'user_id'
    );

    await db
      .insert('admin_audit_logs', {
        admin_email: admin.user.email,
        action: `content_${body.type}`,
        target_id: body.id || body.name || 'catalog',
        details: { type: body.type, name: body.name, category: body.category },
      })
      .catch(() => null);

    return json({ success: true });
  } catch (e) {
    return handleError(e);
  }
}
