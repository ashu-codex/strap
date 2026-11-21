import { NextRequest } from 'next/server';
import { z } from 'zod';
import { SEED_FOODS, FoodItem, FoodCategory } from '@/lib/food-database';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth-helpers';
import { handleError, json, parseBody, requireUser } from '@/lib/api';

const customFoodSchema = z.object({
  name: z.string().trim().min(2).max(120),
  brand: z.string().trim().max(80).default('Custom / Verified Label'),
  category: z.string().trim().max(60).default('Indian Foods'),
  is_supplement: z.boolean().default(false),
  serving_unit: z.string().trim().max(30).default('serving'),
  serving_label: z.string().trim().max(60).default('1 Serving (100g)'),
  serving_grams: z.coerce.number().min(0.5).max(5000).default(100),
  // User enters nutritional values for the specified serving size
  calories: z.coerce.number().min(0).max(5000),
  protein_g: z.coerce.number().min(0).max(500),
  carbs_g: z.coerce.number().min(0).max(1000),
  fat_g: z.coerce.number().min(0).max(500),
  saturated_fat_g: z.coerce.number().min(0).max(500).default(0),
  unsaturated_fat_g: z.coerce.number().min(0).max(500).default(0),
  fiber_g: z.coerce.number().min(0).max(200).default(0),
  sugar_g: z.coerce.number().min(0).max(500).default(0),
  sodium_mg: z.coerce.number().min(0).max(20000).default(0),
  cholesterol_mg: z.coerce.number().min(0).max(5000).default(0),
  ingredients: z.string().trim().max(500).optional(),
});

async function loadCustomFoods(userId?: string | null): Promise<FoodItem[]> {
  const out: FoodItem[] = [];
  try {
    const rows = await db.select('custom_foods', { limit: 500 }).catch(() => []);
    for (const r of rows) {
      if (!r.user_id || r.user_id === userId || r.is_global) {
        out.push(r as FoodItem);
      }
    }
  } catch {
    // ignore
  }

  if (userId) {
    try {
      const pref = await db.selectOne('user_preferences', { eq: { user_id: userId } }).catch(() => null);
      const userFoods: FoodItem[] = Array.isArray(pref?.preferences?.custom_foods)
        ? pref!.preferences.custom_foods
        : [];
      for (const f of userFoods) {
        if (!out.some((x) => x.id === f.id)) out.push(f);
      }
    } catch {
      // ignore
    }
  }
  return out;
}

/** Optional Open Food Facts live lookup when searching packaged products or barcodes */
async function searchOpenFoodFacts(query: string, barcode?: string | null): Promise<FoodItem[]> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2800);
    const url = barcode
      ? `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`
      : `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(
          query
        )}&search_simple=1&action=process&json=1&page_size=6`;

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'STRAP-Fitness-Tracker/1.0' },
    });
    clearTimeout(timer);
    if (!res.ok) return [];
    const data = await res.json();

    const products: any[] = barcode ? (data?.product ? [data.product] : []) : data?.products || [];
    const parsed: FoodItem[] = [];

    for (const prod of products) {
      const name = (prod.product_name || prod.product_name_en || '').trim();
      const nut = prod.nutriments || {};
      const kcal100 = Number(nut['energy-kcal_100g'] ?? nut['energy-kcal']);
      if (!name || !Number.isFinite(kcal100)) continue;

      const servingGrams = parseFloat(String(prod.serving_quantity || '100')) || 100;
      parsed.push({
        id: `off-${prod.code || name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        name,
        brand: (prod.brands || 'Open Food Facts Verified').split(',')[0].trim(),
        category: 'International & Packaged',
        barcode: prod.code ? String(prod.code) : undefined,
        default_unit: 'g',
        default_quantity: 100,
        servings: [
          { unit: 'g', label: 'Gram (g)', grams: 1 },
          { unit: 'serving', label: `1 Label Serving (${servingGrams}g)`, grams: servingGrams },
        ],
        per100g: {
          calories: Math.round(kcal100),
          protein_g: Math.round((Number(nut.proteins_100g) || 0) * 10) / 10,
          carbs_g: Math.round((Number(nut.carbohydrates_100g) || 0) * 10) / 10,
          fat_g: Math.round((Number(nut.fat_100g) || 0) * 10) / 10,
          saturated_fat_g: Math.round((Number(nut['saturated-fat_100g']) || 0) * 10) / 10,
          unsaturated_fat_g: Math.max(
            0,
            Math.round(((Number(nut.fat_100g) || 0) - (Number(nut['saturated-fat_100g']) || 0)) * 10) / 10
          ),
          fiber_g: Math.round((Number(nut.fiber_100g) || 0) * 10) / 10,
          sugar_g: Math.round((Number(nut.sugars_100g) || 0) * 10) / 10,
          sodium_mg: Math.round((Number(nut.sodium_100g) || 0) * 1000),
          cholesterol_mg: 0,
        },
        ingredients: typeof prod.ingredients_text === 'string' ? prod.ingredients_text.slice(0, 260) : undefined,
      });
    }
    return parsed;
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest) {
  try {
    const { user } = await getAuthUser(req);
    const sp = new URL(req.url).searchParams;
    const search = (sp.get('search') || '').trim().toLowerCase();
    const category = sp.get('category') || 'All';
    const barcode = sp.get('barcode')?.trim();
    const includeExternal = sp.get('external') === '1' || Boolean(barcode);

    const customFoods = await loadCustomFoods(user?.id);
    let results: FoodItem[] = [...customFoods, ...SEED_FOODS];

    if (category && category !== 'All') {
      if (category === 'Supplements') {
        results = results.filter((f) => f.category === 'Supplements' || f.is_supplement);
      } else {
        results = results.filter((f) => f.category.toLowerCase() === category.toLowerCase());
      }
    }

    if (barcode) {
      results = results.filter((f) => f.barcode === barcode);
    } else if (search) {
      results = results.filter(
        (f) =>
          f.name.toLowerCase().includes(search) ||
          f.brand.toLowerCase().includes(search) ||
          f.category.toLowerCase().includes(search) ||
          (f.subcategory && f.subcategory.toLowerCase().includes(search))
      );
    }

    if ((includeExternal || results.length < 3) && (search.length >= 3 || barcode)) {
      const offItems = await searchOpenFoodFacts(search, barcode);
      for (const item of offItems) {
        if (!results.some((r) => r.id === item.id || r.name.toLowerCase() === item.name.toLowerCase())) {
          results.push(item);
        }
      }
    }

    return json({
      count: results.length,
      foods: results,
    });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, isAdmin } = await requireUser(req);
    const body = await parseBody(req, customFoodSchema);
    const factor = 100 / (body.serving_grams || 100);
    const r1 = (n: number) => Math.round(n * 10) / 10;

    const newFood: FoodItem = {
      id: `custom-fd-${Date.now()}`,
      name: body.name,
      brand: body.brand || 'Custom Label',
      category: (body.is_supplement ? 'Supplements' : body.category) as FoodCategory,
      is_supplement: body.is_supplement,
      default_unit: body.serving_unit,
      default_quantity: 1,
      servings: [
        { unit: body.serving_unit, label: body.serving_label, grams: body.serving_grams },
        { unit: 'g', label: 'Gram (g)', grams: 1 },
      ],
      per100g: {
        calories: Math.round(body.calories * factor),
        protein_g: r1(body.protein_g * factor),
        carbs_g: r1(body.carbs_g * factor),
        fat_g: r1(body.fat_g * factor),
        saturated_fat_g: r1(body.saturated_fat_g * factor),
        unsaturated_fat_g: r1(body.unsaturated_fat_g * factor),
        fiber_g: r1(body.fiber_g * factor),
        sugar_g: r1(body.sugar_g * factor),
        sodium_mg: Math.round(body.sodium_mg * factor),
        cholesterol_mg: Math.round(body.cholesterol_mg * factor),
      },
      ingredients: body.ingredients,
    };

    const existingPref = await db.selectOne('user_preferences', { eq: { user_id: user.id } }).catch(() => null);
    const prefs = existingPref?.preferences || {};
    const list: FoodItem[] = Array.isArray(prefs.custom_foods) ? prefs.custom_foods : [];
    const updated = [newFood, ...list.filter((f) => f.name.toLowerCase() !== newFood.name.toLowerCase())];

    await db.upsert(
      'user_preferences',
      {
        user_id: user.id,
        theme: existingPref?.theme || 'system',
        preferences: { ...prefs, custom_foods: updated },
      },
      'user_id'
    );

    await db
      .insert('custom_foods', {
        ...newFood,
        user_id: user.id,
        is_global: Boolean(isAdmin),
      })
      .catch(() => null);

    return json({ success: true, food: newFood });
  } catch (e) {
    return handleError(e);
  }
}
