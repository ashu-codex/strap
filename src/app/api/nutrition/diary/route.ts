import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { handleError, HttpError, json, parseBody, requireUser } from '@/lib/api';
import { calculateNutritionTargets } from '@/lib/nutrition-calc';
import { SEED_FOODS, calculateFoodNutrition } from '@/lib/food-database';

export type MealCategory = 'breakfast' | 'lunch' | 'snacks' | 'dinner';

export interface DiaryEntry {
  id: string;
  date: string;
  meal_category: MealCategory;
  food_id: string;
  food_name: string;
  brand: string;
  is_supplement?: boolean;
  quantity: number;
  unit: string;
  total_grams: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  saturated_fat_g: number;
  unsaturated_fat_g: number;
  fiber_g: number;
  sugar_g: number;
  sodium_mg: number;
  cholesterol_mg: number;
  created_at: string;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

async function syncDailyNutritionRecord(
  userId: string,
  date: string,
  entries: DiaryEntry[],
  waterMl: number
) {
  const dayEntries = entries.filter((e) => e.date === date);
  const totals = dayEntries.reduce(
    (acc, cur) => {
      acc.calories += Number(cur.calories) || 0;
      acc.protein_g += Number(cur.protein_g) || 0;
      acc.carbs_g += Number(cur.carbs_g) || 0;
      acc.fats_g += Number(cur.fat_g) || 0;
      return acc;
    },
    { calories: 0, protein_g: 0, carbs_g: 0, fats_g: 0 }
  );

  try {
    const existing = await db.selectOne('nutrition_records', { eq: { user_id: userId, log_date: date } });
    const row = {
      user_id: userId,
      log_date: date,
      calories: Math.round(totals.calories),
      protein_g: Math.round(totals.protein_g),
      carbs_g: Math.round(totals.carbs_g),
      fats_g: Math.round(totals.fats_g),
      water_l: Math.round((waterMl / 1000) * 10) / 10,
      notes: JSON.stringify({ entries_count: dayEntries.length, water_ml: waterMl }),
    };
    if (existing?.id) {
      await db.update('nutrition_records', { id: existing.id }, row);
    } else {
      await db.insert('nutrition_records', row);
    }
  } catch {
    // non-fatal
  }
}

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireUser(req);
    const date = new URL(req.url).searchParams.get('date') || todayIso();

    const [prefRow, metrics, goal, profile] = await Promise.all([
      db.selectOne('user_preferences', { eq: { user_id: user.id } }).catch(() => null),
      db.selectOne('fitness_metrics', { eq: { user_id: user.id } }).catch(() => null),
      db.selectOne('fitness_goals', { eq: { user_id: user.id } }).catch(() => null),
      db.selectOne('user_profiles', { eq: { id: user.id } }).catch(() => null),
    ]);

    const prefs = prefRow?.preferences || {};
    const allEntries: DiaryEntry[] = Array.isArray(prefs.nutrition_diary_entries)
      ? prefs.nutrition_diary_entries
      : [];
    const dayEntries = allEntries.filter((e) => e.date === date);

    const waterByDate: Record<string, number> = prefs.water_by_date || {};
    const waterMl = Number(waterByDate[date]) || 0;

    const favoriteFoodIds: string[] = Array.isArray(prefs.favorite_food_ids) ? prefs.favorite_food_ids : [];
    const savedMeals: any[] = Array.isArray(prefs.saved_meals) ? prefs.saved_meals : [];

    // Compute recently & frequently consumed foods from allEntries
    const recentIds: string[] = [];
    const freqCount = new Map<string, number>();
    for (const e of [...allEntries].reverse()) {
      if (e.food_id && !recentIds.includes(e.food_id) && recentIds.length < 10) {
        recentIds.push(e.food_id);
      }
      if (e.food_id) {
        freqCount.set(e.food_id, (freqCount.get(e.food_id) || 0) + 1);
      }
    }
    const frequentFoodIds = Array.from(freqCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id]) => id);

    const targets = calculateNutritionTargets({
      age: metrics?.age ?? profile?.age,
      gender: metrics?.gender ?? profile?.gender,
      height_cm: metrics?.height_cm ?? profile?.height,
      weight_kg: metrics?.current_weight_kg ?? profile?.weight,
      activity_level: metrics?.daily_activity_level ?? profile?.activity_level,
      weekly_workout_days: goal?.weekly_workout_days ?? 4,
      experience_level: metrics?.experience_level ?? profile?.experience_level,
      primary_goal: goal?.primary_goal ?? profile?.fitness_goal,
      training_style: prefs.training_style || 'muscle_building',
      custom_overrides: prefs.custom_nutrition_targets || null,
    });

    const r1 = (n: number) => Math.round(n * 10) / 10;
    const summary = dayEntries.reduce(
      (acc, cur) => {
        acc.calories += Number(cur.calories) || 0;
        acc.protein_g = r1(acc.protein_g + (Number(cur.protein_g) || 0));
        acc.carbs_g = r1(acc.carbs_g + (Number(cur.carbs_g) || 0));
        acc.fat_g = r1(acc.fat_g + (Number(cur.fat_g) || 0));
        acc.saturated_fat_g = r1(acc.saturated_fat_g + (Number(cur.saturated_fat_g) || 0));
        acc.unsaturated_fat_g = r1(acc.unsaturated_fat_g + (Number(cur.unsaturated_fat_g) || 0));
        acc.fiber_g = r1(acc.fiber_g + (Number(cur.fiber_g) || 0));
        acc.sugar_g = r1(acc.sugar_g + (Number(cur.sugar_g) || 0));
        acc.sodium_mg += Number(cur.sodium_mg) || 0;
        acc.cholesterol_mg += Number(cur.cholesterol_mg) || 0;
        return acc;
      },
      {
        calories: 0,
        protein_g: 0,
        carbs_g: 0,
        fat_g: 0,
        saturated_fat_g: 0,
        unsaturated_fat_g: 0,
        fiber_g: 0,
        sugar_g: 0,
        sodium_mg: 0,
        cholesterol_mg: 0,
      }
    );

    return json({
      date,
      targets,
      summary: {
        ...summary,
        remaining_calories: targets.target_calories - summary.calories,
        water_ml: waterMl,
      },
      entries: dayEntries,
      favoriteFoodIds,
      recentFoodIds: recentIds,
      frequentFoodIds,
      savedMeals,
    });
  } catch (e) {
    return handleError(e);
  }
}

const postSchema = z.object({
  action: z
    .enum([
      'add_entry',
      'edit_entry',
      'add_water',
      'set_water',
      'toggle_favorite',
      'save_meal',
      'log_saved_meal',
      'copy_previous_day',
    ])
    .default('add_entry'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  meal_category: z.enum(['breakfast', 'lunch', 'snacks', 'dinner']).optional(),
  entry_id: z.string().optional(),
  food_id: z.string().optional(),
  food_name: z.string().optional(),
  brand: z.string().optional(),
  is_supplement: z.boolean().optional(),
  quantity: z.coerce.number().min(0.05).max(10000).optional(),
  unit: z.string().optional(),
  nutrition: z
    .object({
      total_grams: z.number(),
      calories: z.number(),
      protein_g: z.number(),
      carbs_g: z.number(),
      fat_g: z.number(),
      saturated_fat_g: z.number().default(0),
      unsaturated_fat_g: z.number().default(0),
      fiber_g: z.number().default(0),
      sugar_g: z.number().default(0),
      sodium_mg: z.number().default(0),
      cholesterol_mg: z.number().default(0),
    })
    .optional(),
  water_ml: z.coerce.number().min(0).max(15000).optional(),
  meal_name: z.string().trim().max(100).optional(),
  saved_meal_id: z.string().optional(),
  from_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireUser(req);
    const body = await parseBody(req, postSchema);
    const date = body.date || todayIso();

    const existingPref = await db.selectOne('user_preferences', { eq: { user_id: user.id } }).catch(() => null);
    const prefs = existingPref?.preferences || {};
    let allEntries: DiaryEntry[] = Array.isArray(prefs.nutrition_diary_entries)
      ? [...prefs.nutrition_diary_entries]
      : [];
    const waterByDate: Record<string, number> = { ...(prefs.water_by_date || {}) };
    let favoriteFoodIds: string[] = Array.isArray(prefs.favorite_food_ids) ? [...prefs.favorite_food_ids] : [];
    let savedMeals: any[] = Array.isArray(prefs.saved_meals) ? [...prefs.saved_meals] : [];

    if (body.action === 'add_entry') {
      if (!body.meal_category || !body.quantity || !body.unit) {
        throw new HttpError(400, 'Meal category, quantity, and unit are required.');
      }

      let calc = body.nutrition;
      let foodName = body.food_name || 'Food Entry';
      let brand = body.brand || 'Verified Entry';
      let isSupp = Boolean(body.is_supplement);

      if (!calc && body.food_id) {
        const customFoods: any[] = Array.isArray(prefs.custom_foods) ? prefs.custom_foods : [];
        const matched = [...customFoods, ...SEED_FOODS].find((f) => f.id === body.food_id);
        if (!matched) throw new HttpError(404, 'Food item not found.');
        calc = calculateFoodNutrition(matched, body.quantity, body.unit);
        foodName = matched.name;
        brand = matched.brand;
        isSupp = Boolean(matched.is_supplement);
      }

      if (!calc) throw new HttpError(400, 'Nutritional values are required.');

      const entry: DiaryEntry = {
        id: `ne-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        date,
        meal_category: body.meal_category,
        food_id: body.food_id || `custom-${Date.now()}`,
        food_name: foodName,
        brand,
        is_supplement: isSupp,
        quantity: body.quantity,
        unit: body.unit,
        ...calc,
        created_at: new Date().toISOString(),
      };
      allEntries.push(entry);
    } else if (body.action === 'edit_entry' && body.entry_id) {
      allEntries = allEntries.map((item) => {
        if (item.id !== body.entry_id) return item;
        const customFoods: any[] = Array.isArray(prefs.custom_foods) ? prefs.custom_foods : [];
        const matched = [...customFoods, ...SEED_FOODS].find((f) => f.id === item.food_id);
        const nextQty = body.quantity ?? item.quantity;
        const nextUnit = body.unit ?? item.unit;
        const recalc = matched
          ? calculateFoodNutrition(matched, nextQty, nextUnit)
          : body.nutrition || {
              total_grams: item.total_grams,
              calories: item.calories,
              protein_g: item.protein_g,
              carbs_g: item.carbs_g,
              fat_g: item.fat_g,
              saturated_fat_g: item.saturated_fat_g,
              unsaturated_fat_g: item.unsaturated_fat_g,
              fiber_g: item.fiber_g,
              sugar_g: item.sugar_g,
              sodium_mg: item.sodium_mg,
              cholesterol_mg: item.cholesterol_mg,
            };
        return {
          ...item,
          meal_category: body.meal_category || item.meal_category,
          quantity: nextQty,
          unit: nextUnit,
          ...recalc,
        };
      });
    } else if (body.action === 'add_water') {
      waterByDate[date] = Math.min(15000, (Number(waterByDate[date]) || 0) + (Number(body.water_ml) || 250));
    } else if (body.action === 'set_water') {
      waterByDate[date] = Math.min(15000, Math.max(0, Number(body.water_ml) || 0));
    } else if (body.action === 'toggle_favorite' && body.food_id) {
      if (favoriteFoodIds.includes(body.food_id)) {
        favoriteFoodIds = favoriteFoodIds.filter((id) => id !== body.food_id);
      } else {
        favoriteFoodIds.push(body.food_id);
      }
    } else if (body.action === 'save_meal' && body.meal_category && body.meal_name) {
      const items = allEntries.filter((e) => e.date === date && e.meal_category === body.meal_category);
      if (items.length === 0) throw new HttpError(400, 'Log at least one food in this meal before saving.');
      savedMeals = [
        {
          id: `sm-${Date.now()}`,
          name: body.meal_name,
          meal_category: body.meal_category,
          items: items.map(({ id: _id, date: _d, created_at: _c, ...rest }) => rest),
        },
        ...savedMeals,
      ];
    } else if (body.action === 'log_saved_meal' && body.saved_meal_id) {
      const meal = savedMeals.find((m) => m.id === body.saved_meal_id);
      if (!meal) throw new HttpError(404, 'Saved meal not found.');
      const targetCat = body.meal_category || meal.meal_category || 'breakfast';
      for (const item of meal.items || []) {
        allEntries.push({
          ...item,
          id: `ne-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          date,
          meal_category: targetCat,
          created_at: new Date().toISOString(),
        });
      }
    } else if (body.action === 'copy_previous_day') {
      const prevDate =
        body.from_date || new Date(new Date(date).getTime() - 86400_000).toISOString().slice(0, 10);
      const sourceEntries = allEntries.filter(
        (e) => e.date === prevDate && (!body.meal_category || e.meal_category === body.meal_category)
      );
      for (const item of sourceEntries) {
        allEntries.push({
          ...item,
          id: `ne-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          date,
          created_at: new Date().toISOString(),
        });
      }
    }

    await db.upsert(
      'user_preferences',
      {
        user_id: user.id,
        theme: existingPref?.theme || 'system',
        preferences: {
          ...prefs,
          nutrition_diary_entries: allEntries,
          water_by_date: waterByDate,
          favorite_food_ids: favoriteFoodIds,
          saved_meals: savedMeals,
        },
      },
      'user_id'
    );

    await syncDailyNutritionRecord(user.id, date, allEntries, Number(waterByDate[date]) || 0);

    return json({ success: true });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { user } = await requireUser(req);
    const sp = new URL(req.url).searchParams;
    const entryId = sp.get('id');
    const savedMealId = sp.get('saved_meal_id');

    const existingPref = await db.selectOne('user_preferences', { eq: { user_id: user.id } }).catch(() => null);
    const prefs = existingPref?.preferences || {};
    let allEntries: DiaryEntry[] = Array.isArray(prefs.nutrition_diary_entries)
      ? prefs.nutrition_diary_entries
      : [];
    let savedMeals: any[] = Array.isArray(prefs.saved_meals) ? prefs.saved_meals : [];

    let affectedDate = todayIso();
    if (entryId) {
      const target = allEntries.find((e) => e.id === entryId);
      if (target) affectedDate = target.date;
      allEntries = allEntries.filter((e) => e.id !== entryId);
    }
    if (savedMealId) {
      savedMeals = savedMeals.filter((m) => m.id !== savedMealId);
    }

    await db.upsert(
      'user_preferences',
      {
        user_id: user.id,
        theme: existingPref?.theme || 'system',
        preferences: {
          ...prefs,
          nutrition_diary_entries: allEntries,
          saved_meals: savedMeals,
        },
      },
      'user_id'
    );

    const waterByDate: Record<string, number> = prefs.water_by_date || {};
    await syncDailyNutritionRecord(user.id, affectedDate, allEntries, Number(waterByDate[affectedDate]) || 0);

    return json({ success: true });
  } catch (e) {
    return handleError(e);
  }
}
