'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Utensils,
  Search,
  Plus,
  Droplet,
  Star,
  Copy,
  Trash2,
  Edit3,
  Bookmark,
  Calendar,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Pill,
  Scale,
  X,
  Info,
  Sliders,
  Globe,
  ScanBarcode,
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import ThreeDotMenu from '@/components/ui/ThreeDotMenu';
import NumericInput from '@/components/ui/NumericInput';
import {
  FoodItem,
  FoodCategory,
  ServingOption,
  calculateFoodNutrition,
} from '@/lib/food-database';

type MealCategory = 'breakfast' | 'lunch' | 'snacks' | 'dinner';

const MEAL_CONFIG: { key: MealCategory; label: string }[] = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'snacks', label: 'Snacks' },
  { key: 'dinner', label: 'Dinner' },
];

const FOOD_CATEGORY_TABS: (FoodCategory | 'All' | 'Favourites' | 'Recent' | 'Frequent' | 'Saved Meals')[] = [
  'All',
  'Supplements',
  'Indian Foods',
  'Favourites',
  'Recent',
  'Frequent',
  'Saved Meals',
  'Grains & Breads',
  'Dals & Curries',
  'Dairy & Eggs',
  'Poultry, Meat & Fish',
  'Fruits & Vegetables',
  'Nuts, Seeds & Spreads',
  'Snacks, Sweets & Street Food',
  'International & Packaged',
  'Beverages',
];

const SUPPLEMENT_BRANDS = [
  'Optimum Nutrition',
  'Myprotein',
  'MuscleBlaze',
  'AS-IT-IS Nutrition',
  'Nakpro',
  'Nutrabay',
  'GNC',
  'Dymatize',
  'Ultimate Nutrition',
  'HealthKart',
  'Fast&Up',
];

const STANDARD_UNITS: ServingOption[] = [
  { unit: 'serving', label: 'Serving (100g)', grams: 100 },
  { unit: 'g', label: 'Grams (g)', grams: 1 },
  { unit: 'kg', label: 'Kilograms (kg)', grams: 1000 },
  { unit: 'ml', label: 'Millilitres (ml)', grams: 1 },
  { unit: 'L', label: 'Litres (L)', grams: 1000 },
  { unit: 'piece', label: 'Piece / Roti / Egg (45g)', grams: 45 },
  { unit: 'katori', label: 'Katori (150g)', grams: 150 },
  { unit: 'bowl', label: 'Bowl (250g)', grams: 250 },
  { unit: 'cup', label: 'Cup (240g)', grams: 240 },
  { unit: 'plate', label: 'Plate (300g)', grams: 300 },
  { unit: 'glass', label: 'Glass (250ml)', grams: 250 },
  { unit: 'scoop', label: 'Scoop (32g)', grams: 32 },
  { unit: 'tbsp', label: 'Tablespoon (15g)', grams: 15 },
  { unit: 'tsp', label: 'Teaspoon (5g)', grams: 5 },
  { unit: 'slice', label: 'Slice (30g)', grams: 30 },
];

export default function NutritionTrackerPage() {
  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [diaryData, setDiaryData] = useState<any>(null);
  const [allCatalogFoods, setAllCatalogFoods] = useState<FoodItem[]>([]);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Food Search & Add Modal state
  const [searchModalOpen, setSearchModalOpen] = useState<boolean>(false);
  const [activeMeal, setActiveMeal] = useState<MealCategory>('breakfast');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTab, setSelectedTab] = useState<string>('All');
  const [includeExternal, setIncludeExternal] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<FoodItem[]>([]);
  const [searchingFoods, setSearchingFoods] = useState<boolean>(false);

  // Selected Food for Live Calculation & Logging
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [selectedUnit, setSelectedUnit] = useState<string>('serving');
  const [submittingEntry, setSubmittingEntry] = useState<boolean>(false);

  // Editing an existing logged entry
  const [editingEntry, setEditingEntry] = useState<any | null>(null);
  const [editQuantity, setEditQuantity] = useState<number>(1);
  const [editUnit, setEditUnit] = useState<string>('serving');
  const [editMeal, setEditMeal] = useState<MealCategory>('breakfast');

  // Custom Food / Supplement Creator Modal
  const [customModalOpen, setCustomModalOpen] = useState<boolean>(false);
  const [customFoodForm, setCustomFoodForm] = useState({
    name: '',
    brand: 'Homemade / Custom',
    category: 'Indian Foods',
    is_supplement: false,
    serving_unit: 'serving',
    serving_label: '1 Serving (100g)',
    serving_grams: '100',
    calories: '',
    protein_g: '',
    carbs_g: '',
    fat_g: '',
    saturated_fat_g: '0',
    unsaturated_fat_g: '0',
    fiber_g: '0',
    sugar_g: '0',
    sodium_mg: '0',
    cholesterol_mg: '0',
    ingredients: '',
  });

  // Save Meal Template Modal
  const [saveMealModal, setSaveMealModal] = useState<{
    open: boolean;
    mealCategory: MealCategory;
    name: string;
  }>({
    open: false,
    mealCategory: 'breakfast',
    name: '',
  });

  // Water custom input
  const [customWaterMl, setCustomWaterMl] = useState<string>('250');

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchDiary = useCallback(async (targetDate: string) => {
    try {
      const res = await fetch(`/api/nutrition/diary?date=${targetDate}`);
      const data = await res.json();
      if (res.ok) {
        setDiaryData(data);
      }
    } catch (err) {
      console.error('Failed to load nutrition diary', err);
    }
  }, []);

  useEffect(() => {
    fetchDiary(date);
  }, [date, fetchDiary]);

  useEffect(() => {
    fetch('/api/nutrition/foods')
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.foods)) setAllCatalogFoods(d.foods);
      })
      .catch(() => {});
  }, []);

  // Search foods when modal is open or filters change:
  // Filter already-loaded local catalog instantaneously, and only hit /api/nutrition/foods
  // for barcode lookups, explicit global search, or sparse (<3) local matches with >=3 chars.
  const searchAbortRef = React.useRef<AbortController | null>(null);

  const filterLocalCatalog = useCallback(
    (trimmed: string, tab: string): FoodItem[] => {
      let results = [...allCatalogFoods];
      if (
        tab !== 'All' &&
        tab !== 'Favourites' &&
        tab !== 'Recent' &&
        tab !== 'Frequent' &&
        tab !== 'Saved Meals'
      ) {
        if (tab === 'Supplements') {
          results = results.filter((f) => f.category === 'Supplements' || f.is_supplement);
        } else {
          results = results.filter((f) => f.category.toLowerCase() === tab.toLowerCase());
        }
      }

      if (/^\d{8,14}$/.test(trimmed)) {
        results = results.filter((f) => f.barcode === trimmed);
      } else if (trimmed) {
        const q = trimmed.toLowerCase();
        results = results.filter(
          (f) =>
            f.name.toLowerCase().includes(q) ||
            f.brand.toLowerCase().includes(q) ||
            f.category.toLowerCase().includes(q) ||
            (f.subcategory && f.subcategory.toLowerCase().includes(q))
        );
      }
      return results;
    },
    [allCatalogFoods]
  );

  const performFoodSearch = useCallback(
    async (forceRemote = false) => {
      const trimmed = searchQuery.trim();
      const isBarcode = /^\d{8,14}$/.test(trimmed);
      const localResults = filterLocalCatalog(trimmed, selectedTab);

      const needsRemote =
        forceRemote ||
        allCatalogFoods.length === 0 ||
        isBarcode ||
        (includeExternal && trimmed.length >= 3) ||
        (trimmed.length >= 3 && localResults.length < 3);

      // Show instant local catalog matches immediately without waiting for network
      if (allCatalogFoods.length > 0) {
        setSearchResults(localResults);
      }

      if (!needsRemote) {
        searchAbortRef.current?.abort();
        setSearchingFoods(false);
        return;
      }

      searchAbortRef.current?.abort();
      const controller = new AbortController();
      searchAbortRef.current = controller;

      setSearchingFoods(true);
      try {
        const params = new URLSearchParams();
        if (isBarcode) {
          params.set('barcode', trimmed);
        } else if (trimmed) {
          params.set('search', trimmed);
        }
        if (
          selectedTab !== 'All' &&
          selectedTab !== 'Favourites' &&
          selectedTab !== 'Recent' &&
          selectedTab !== 'Frequent' &&
          selectedTab !== 'Saved Meals'
        ) {
          params.set('category', selectedTab);
        }
        if (includeExternal && trimmed.length >= 3) {
          params.set('external', '1');
        }

        const res = await fetch(`/api/nutrition/foods?${params.toString()}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        if (res.ok && Array.isArray(data.foods)) {
          setSearchResults(data.foods);
        }
      } catch (e: any) {
        if (e?.name !== 'AbortError') {
          console.error('Food search error', e);
        }
      } finally {
        if (searchAbortRef.current === controller) {
          setSearchingFoods(false);
        }
      }
    },
    [searchQuery, selectedTab, includeExternal, allCatalogFoods.length, filterLocalCatalog]
  );

  useEffect(() => {
    if (!searchModalOpen) return;

    const trimmed = searchQuery.trim();
    const isBarcode = /^\d{8,14}$/.test(trimmed);
    const localResults = filterLocalCatalog(trimmed, selectedTab);
    const needsRemote =
      allCatalogFoods.length === 0 ||
      isBarcode ||
      (includeExternal && trimmed.length >= 3) ||
      (trimmed.length >= 3 && localResults.length < 3);

    if (!needsRemote) {
      setSearchResults(localResults);
      setSearchingFoods(false);
      return;
    }

    // Show local matches immediately while debouncing remote global/barcode lookup
    if (allCatalogFoods.length > 0) {
      setSearchResults(localResults);
    }
    const timer = setTimeout(() => {
      performFoodSearch(false);
    }, 400);
    return () => {
      clearTimeout(timer);
      searchAbortRef.current?.abort();
    };
  }, [
    searchModalOpen,
    searchQuery,
    selectedTab,
    includeExternal,
    allCatalogFoods.length,
    filterLocalCatalog,
    performFoodSearch,
  ]);

  const handleSelectFood = (food: FoodItem) => {
    setSelectedFood(food);
    setQuantity(food.default_quantity || 1);
    setSelectedUnit(food.default_unit || food.servings?.[0]?.unit || 'serving');
  };

  // Merge food-specific units with universal units
  const availableUnitsForFood = useMemo((): ServingOption[] => {
    if (!selectedFood) return STANDARD_UNITS;
    const map = new Map<string, ServingOption>();
    for (const u of selectedFood.servings || []) {
      map.set(u.unit, u);
    }
    for (const std of STANDARD_UNITS) {
      if (!map.has(std.unit)) {
        map.set(std.unit, std);
      }
    }
    return Array.from(map.values());
  }, [selectedFood]);

  const liveCalculation = useMemo(() => {
    if (!selectedFood) return null;
    return calculateFoodNutrition(selectedFood, Number(quantity) || 0, selectedUnit);
  }, [selectedFood, quantity, selectedUnit]);

  const openAddFoodModal = (meal: MealCategory, initialTab = 'All') => {
    setActiveMeal(meal);
    setSelectedTab(initialTab);
    setSelectedFood(null);
    setSearchModalOpen(true);
  };

  const handleAddFoodToDiary = async () => {
    if (!selectedFood || !liveCalculation) return;
    if (!quantity || Number(quantity) <= 0) {
      showToast('Please enter a valid quantity greater than 0', 'error');
      return;
    }

    setSubmittingEntry(true);
    try {
      const res = await fetch('/api/nutrition/diary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_entry',
          date,
          meal_category: activeMeal,
          food_id: selectedFood.id,
          food_name: selectedFood.name,
          brand: selectedFood.brand,
          is_supplement: Boolean(selectedFood.is_supplement || selectedFood.category === 'Supplements'),
          quantity: Number(quantity),
          unit: selectedUnit,
          nutrition: liveCalculation,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        const mealLabel = MEAL_CONFIG.find((m) => m.key === activeMeal)?.label || activeMeal;
        showToast(`Added ${selectedFood.name} to ${mealLabel}`);
        setSelectedFood(null);
        await fetchDiary(date);
      } else {
        showToast(data.error || 'Could not log food item', 'error');
      }
    } catch {
      showToast('Network error logging food', 'error');
    } finally {
      setSubmittingEntry(false);
    }
  };

  const handleUpdateEntry = async () => {
    if (!editingEntry) return;
    try {
      const res = await fetch('/api/nutrition/diary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'edit_entry',
          date,
          entry_id: editingEntry.id,
          quantity: Number(editQuantity),
          unit: editUnit,
          meal_category: editMeal,
        }),
      });
      if (res.ok) {
        showToast('Updated food entry');
        setEditingEntry(null);
        await fetchDiary(date);
      } else {
        showToast('Failed to update entry', 'error');
      }
    } catch {
      showToast('Error updating entry', 'error');
    }
  };

  const handleDeleteEntry = async (entryId: string, foodName: string) => {
    try {
      const res = await fetch(`/api/nutrition/diary?id=${encodeURIComponent(entryId)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        showToast(`Removed ${foodName}`);
        await fetchDiary(date);
      }
    } catch {
      showToast('Failed to delete entry', 'error');
    }
  };

  const handleToggleFavorite = async (foodId: string, foodName?: string) => {
    try {
      const isCurrentlyFav = (diaryData?.favoriteFoodIds || []).includes(foodId);
      const res = await fetch('/api/nutrition/diary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_favorite', food_id: foodId }),
      });
      if (res.ok) {
        showToast(
          !isCurrentlyFav
            ? `${foodName || 'Food'} saved to Favourites`
            : `${foodName || 'Food'} removed from Favourites`
        );
        await fetchDiary(date);
      }
    } catch {
      showToast('Failed to update favourites', 'error');
    }
  };

  const handleAddWater = async (amountMl: number) => {
    try {
      const res = await fetch('/api/nutrition/diary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add_water', date, water_ml: amountMl }),
      });
      if (res.ok) {
        showToast(`+${amountMl} ml water logged`);
        await fetchDiary(date);
      }
    } catch {
      showToast('Failed to update water intake', 'error');
    }
  };

  const handleResetWater = async () => {
    try {
      const res = await fetch('/api/nutrition/diary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_water', date, water_ml: 0 }),
      });
      if (res.ok) {
        showToast('Water intake reset to 0 ml');
        await fetchDiary(date);
      }
    } catch {
      showToast('Failed to reset water', 'error');
    }
  };

  const handleCopyPreviousDay = async (mealCategory?: MealCategory) => {
    const prevDateObj = new Date(date + 'T00:00:00');
    prevDateObj.setDate(prevDateObj.getDate() - 1);
    const prevDateStr = prevDateObj.toISOString().split('T')[0];

    try {
      const res = await fetch('/api/nutrition/diary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'copy_previous_day',
          from_date: prevDateStr,
          date,
          meal_category: mealCategory,
        }),
      });
      if (res.ok) {
        showToast(`Copied entries from ${prevDateStr}`);
        await fetchDiary(date);
      } else {
        showToast('Could not copy entries from previous day', 'error');
      }
    } catch {
      showToast('Failed to copy previous day', 'error');
    }
  };

  const handleSaveMealTemplate = async () => {
    if (!saveMealModal.name.trim()) {
      showToast('Please enter a name for this saved meal', 'error');
      return;
    }
    try {
      const res = await fetch('/api/nutrition/diary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_meal',
          date,
          meal_name: saveMealModal.name.trim(),
          meal_category: saveMealModal.mealCategory,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Saved "${saveMealModal.name}" to Saved Meals`);
        setSaveMealModal({ open: false, mealCategory: 'breakfast', name: '' });
        await fetchDiary(date);
      } else {
        showToast(data.error || 'Log at least one food in this meal before saving', 'error');
      }
    } catch {
      showToast('Failed to save meal template', 'error');
    }
  };

  const handleLogSavedMeal = async (savedMealId: string, mealName: string) => {
    try {
      const res = await fetch('/api/nutrition/diary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'log_saved_meal',
          saved_meal_id: savedMealId,
          date,
          meal_category: activeMeal,
        }),
      });
      if (res.ok) {
        showToast(`Logged saved meal "${mealName}"`);
        setSearchModalOpen(false);
        await fetchDiary(date);
      }
    } catch {
      showToast('Failed to log saved meal', 'error');
    }
  };

  const handleCreateCustomFood = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customFoodForm.name.trim() || customFoodForm.calories === '') {
      showToast('Food name and calories are required', 'error');
      return;
    }
    try {
      const res = await fetch('/api/nutrition/foods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...customFoodForm,
          category: customFoodForm.is_supplement ? 'Supplements' : customFoodForm.category,
        }),
      });
      const data = await res.json();
      if (res.ok && data.food) {
        showToast(
          `Created custom ${customFoodForm.is_supplement ? 'supplement' : 'food'}: ${data.food.name}`
        );
        setCustomModalOpen(false);
        setAllCatalogFoods((prev) => [data.food, ...prev]);
        handleSelectFood(data.food);
        performFoodSearch();
      } else {
        showToast(data.error || 'Could not create custom food', 'error');
      }
    } catch {
      showToast('Error creating custom food', 'error');
    }
  };

  const shiftDate = (days: number) => {
    const d = new Date(date + 'T00:00:00');
    d.setDate(d.getDate() + days);
    setDate(d.toISOString().split('T')[0]);
  };

  const targets = diaryData?.targets || {
    bmr: 1750,
    tdee: 2450,
    target_calories: 2300,
    goal_label: 'General Fitness',
    protein_g: 150,
    carbs_g: 250,
    fats_g: 70,
    fiber_g: 32,
    water_ml: 3000,
    disclaimer:
      'Nutritional values and targets are calculated from your biometrics (Mifflin-St Jeor equation) for general fitness and educational guidance, not medical diagnosis.',
  };

  const summary = diaryData?.summary || {
    calories: 0,
    remaining_calories: targets.target_calories,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    saturated_fat_g: 0,
    unsaturated_fat_g: 0,
    fiber_g: 0,
    sugar_g: 0,
    sodium_mg: 0,
    cholesterol_mg: 0,
    water_ml: 0,
  };

  const entries: any[] = diaryData?.entries || [];
  const favoriteIds: string[] = diaryData?.favoriteFoodIds || [];
  const recentIds: string[] = diaryData?.recentFoodIds || [];
  const frequentIds: string[] = diaryData?.frequentFoodIds || [];

  const modalDisplayedFoods: FoodItem[] = useMemo(() => {
    const pool = allCatalogFoods.length > 0 ? allCatalogFoods : searchResults;
    if (selectedTab === 'Favourites') {
      return pool.filter((f) => favoriteIds.includes(f.id));
    }
    if (selectedTab === 'Recent') {
      return recentIds.map((id) => pool.find((f) => f.id === id)).filter(Boolean) as FoodItem[];
    }
    if (selectedTab === 'Frequent') {
      return frequentIds.map((id) => pool.find((f) => f.id === id)).filter(Boolean) as FoodItem[];
    }
    return searchResults;
  }, [selectedTab, allCatalogFoods, searchResults, favoriteIds, recentIds, frequentIds]);

  const caloriePct = Math.min(
    100,
    Math.round((summary.calories / Math.max(1, targets.target_calories)) * 100)
  );
  const proteinPct = Math.min(100, Math.round((summary.protein_g / Math.max(1, targets.protein_g)) * 100));
  const carbsPct = Math.min(100, Math.round((summary.carbs_g / Math.max(1, targets.carbs_g)) * 100));
  const fatPct = Math.min(100, Math.round((summary.fat_g / Math.max(1, targets.fats_g)) * 100));
  const fiberPct = Math.min(100, Math.round((summary.fiber_g / Math.max(1, targets.fiber_g)) * 100));
  const waterPct = Math.min(100, Math.round((summary.water_ml / Math.max(1, targets.water_ml)) * 100));

  return (
    <div className="min-h-screen bg-[#F5F6F8] dark:bg-[#111318] text-[#111318] dark:text-[#F3F4F6] py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Toast notification */}
        {toast && (
          <div
            className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium shadow-xl border ${
              toast.type === 'success'
                ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/40'
                : 'bg-red-950/90 text-red-200 border-red-500/40'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
            )}
            <span>{toast.text}</span>
          </div>
        )}

        {/* Header & Date Selector */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 rounded-2xl border border-[#E1E4E8] dark:border-[#2A2D35] bg-white dark:bg-[#1B1D22] p-5 shadow-sm">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/15 text-brand border border-brand/30">
                <Utensils className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                  STRAP Nutrition &amp; Supplement Tracker
                </h1>
                <p className="text-xs sm:text-sm text-[#5A6069] dark:text-[#9CA3AF]">
                  Search Indian &amp; international foods, log supplements, and track daily macros &amp; hydration
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Date navigation */}
            <div className="flex items-center rounded-xl border border-[#E1E4E8] dark:border-[#30333A] bg-[#F8F9FA] dark:bg-[#14161A] p-1">
              <button
                type="button"
                onClick={() => shiftDate(-1)}
                className="rounded-lg p-1.5 hover:bg-black/5 dark:hover:bg-white/5 transition"
                title="Previous Day"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-1.5 px-2.5">
                <Calendar className="h-3.5 w-3.5 text-brand" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="bg-transparent text-xs sm:text-sm font-semibold focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => shiftDate(1)}
                className="rounded-lg p-1.5 hover:bg-black/5 dark:hover:bg-white/5 transition"
                title="Next Day"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleCopyPreviousDay()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#E1E4E8] dark:border-[#30333A] bg-white dark:bg-[#22252C] px-3 py-2 text-xs font-semibold hover:border-brand/50 transition"
              title="Copy all meals from previous day"
            >
              <Copy className="h-3.5 w-3.5 text-brand" />
              <span>Copy Previous Day</span>
            </button>

            <button
              type="button"
              onClick={() => openAddFoodModal('snacks', 'Supplements')}
              className="inline-flex items-center gap-1.5 rounded-xl border border-brand/40 bg-brand/10 text-brand px-3 py-2 text-xs font-semibold hover:bg-brand/20 transition"
            >
              <Pill className="h-3.5 w-3.5" />
              <span>Log Supplement</span>
            </button>

            <Link
              href="/profile"
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#E1E4E8] dark:border-[#30333A] bg-white dark:bg-[#22252C] px-3 py-2 text-xs font-semibold hover:border-brand/50 transition"
            >
              <Sliders className="h-3.5 w-3.5 text-brand" />
              <span>Adjust Targets</span>
            </Link>
          </div>
        </div>

        {/* Personalized Daily Energy & Macro Summary Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 8 Cols: Calorie Equation + Macro Progress Bars */}
          <div className="lg:col-span-8 rounded-2xl border border-[#E1E4E8] dark:border-[#2A2D35] bg-white dark:bg-[#1B1D22] p-6 shadow-sm space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E1E4E8] dark:border-[#2A2D35] pb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-brand">
                  Daily Nutrition Summary
                </span>
                <h2 className="text-lg font-bold">
                  Calories &amp; Macronutrients ({targets.goal_label || 'Personalized Goal'})
                </h2>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="rounded-lg bg-[#F3F4F6] dark:bg-[#252830] px-2.5 py-1">
                  BMR: <strong>{targets.bmr}</strong> kcal
                </span>
                <span className="rounded-lg bg-[#F3F4F6] dark:bg-[#252830] px-2.5 py-1">
                  TDEE: <strong>{targets.tdee}</strong> kcal
                </span>
              </div>
            </div>

            {/* Calorie Equation Row (Goal - Food = Remaining) */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="rounded-xl bg-[#F8F9FA] dark:bg-[#14161A] p-4 border border-[#E1E4E8] dark:border-[#2A2D35]">
                <div className="text-xs text-[#5A6069] dark:text-[#9CA3AF] uppercase font-semibold">
                  Daily Target
                </div>
                <div className="mt-1 text-2xl sm:text-3xl font-extrabold">{targets.target_calories}</div>
                <div className="text-[11px] text-[#5A6069] dark:text-[#9CA3AF]">kcal goal</div>
              </div>

              <div className="rounded-xl bg-[#F8F9FA] dark:bg-[#14161A] p-4 border border-[#E1E4E8] dark:border-[#2A2D35]">
                <div className="text-xs text-[#5A6069] dark:text-[#9CA3AF] uppercase font-semibold">
                  Consumed
                </div>
                <div className="mt-1 text-2xl sm:text-3xl font-extrabold text-brand">
                  {Math.round(summary.calories)}
                </div>
                <div className="text-[11px] text-[#5A6069] dark:text-[#9CA3AF]">{caloriePct}% of target</div>
              </div>

              <div className="rounded-xl bg-[#F8F9FA] dark:bg-[#14161A] p-4 border border-[#E1E4E8] dark:border-[#2A2D35]">
                <div className="text-xs text-[#5A6069] dark:text-[#9CA3AF] uppercase font-semibold">
                  {summary.calories <= targets.target_calories ? 'Remaining' : 'Over Target'}
                </div>
                <div
                  className={`mt-1 text-2xl sm:text-3xl font-extrabold ${
                    summary.calories <= targets.target_calories ? 'text-emerald-500' : 'text-amber-500'
                  }`}
                >
                  {Math.abs(Math.round(targets.target_calories - summary.calories))}
                </div>
                <div className="text-[11px] text-[#5A6069] dark:text-[#9CA3AF]">kcal</div>
              </div>
            </div>

            {/* Calorie progress bar */}
            <div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-[#E5E7EB] dark:bg-[#2A2D35]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand to-emerald-500 transition-all duration-300"
                  style={{ width: `${caloriePct}%` }}
                />
              </div>
            </div>

            {/* 4 Primary Macro Bars */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Protein */}
              <div className="rounded-xl border border-[#E1E4E8] dark:border-[#2A2D35] p-3.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-rose-500">Protein</span>
                  <span>
                    <strong>{summary.protein_g}g</strong> / {targets.protein_g}g
                  </span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#E5E7EB] dark:bg-[#2A2D35]">
                  <div
                    className="h-full rounded-full bg-rose-500 transition-all"
                    style={{ width: `${proteinPct}%` }}
                  />
                </div>
                <div className="mt-1 text-[11px] text-[#5A6069] dark:text-[#9CA3AF]">
                  {Math.max(0, Math.round((targets.protein_g - summary.protein_g) * 10) / 10)}g remaining
                </div>
              </div>

              {/* Carbohydrates */}
              <div className="rounded-xl border border-[#E1E4E8] dark:border-[#2A2D35] p-3.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-sky-500">Carbohydrates</span>
                  <span>
                    <strong>{summary.carbs_g}g</strong> / {targets.carbs_g}g
                  </span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#E5E7EB] dark:bg-[#2A2D35]">
                  <div
                    className="h-full rounded-full bg-sky-500 transition-all"
                    style={{ width: `${carbsPct}%` }}
                  />
                </div>
                <div className="mt-1 text-[11px] text-[#5A6069] dark:text-[#9CA3AF]">
                  {Math.max(0, Math.round((targets.carbs_g - summary.carbs_g) * 10) / 10)}g remaining
                </div>
              </div>

              {/* Total Fat */}
              <div className="rounded-xl border border-[#E1E4E8] dark:border-[#2A2D35] p-3.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-amber-500">Total Fat</span>
                  <span>
                    <strong>{summary.fat_g}g</strong> / {targets.fats_g}g
                  </span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#E5E7EB] dark:bg-[#2A2D35]">
                  <div
                    className="h-full rounded-full bg-amber-500 transition-all"
                    style={{ width: `${fatPct}%` }}
                  />
                </div>
                <div className="mt-1 text-[11px] text-[#5A6069] dark:text-[#9CA3AF]">
                  {Math.max(0, Math.round((targets.fats_g - summary.fat_g) * 10) / 10)}g remaining
                </div>
              </div>

              {/* Dietary Fibre */}
              <div className="rounded-xl border border-[#E1E4E8] dark:border-[#2A2D35] p-3.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-emerald-500">Dietary Fibre</span>
                  <span>
                    <strong>{summary.fiber_g}g</strong> / {targets.fiber_g}g
                  </span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#E5E7EB] dark:bg-[#2A2D35]">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${fiberPct}%` }}
                  />
                </div>
                <div className="mt-1 text-[11px] text-[#5A6069] dark:text-[#9CA3AF]">
                  {Math.max(0, Math.round((targets.fiber_g - summary.fiber_g) * 10) / 10)}g remaining
                </div>
              </div>
            </div>

            {/* Detailed Lipid & Micronutrient Breakdown + Macro Calorie Chart */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-3 border-t border-[#E1E4E8] dark:border-[#2A2D35] items-center">
              <div className="md:col-span-8 grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                <div className="rounded-lg bg-[#F8F9FA] dark:bg-[#14161A] px-3 py-2">
                  <span className="text-[#5A6069] dark:text-[#9CA3AF] block">Saturated Fat</span>
                  <strong className="text-sm">{summary.saturated_fat_g} g</strong>
                </div>
                <div className="rounded-lg bg-[#F8F9FA] dark:bg-[#14161A] px-3 py-2">
                  <span className="text-[#5A6069] dark:text-[#9CA3AF] block">Unsaturated Fat</span>
                  <strong className="text-sm">{summary.unsaturated_fat_g} g</strong>
                </div>
                <div className="rounded-lg bg-[#F8F9FA] dark:bg-[#14161A] px-3 py-2">
                  <span className="text-[#5A6069] dark:text-[#9CA3AF] block">Total Sugar</span>
                  <strong className="text-sm">{summary.sugar_g} g</strong>
                </div>
                <div className="rounded-lg bg-[#F8F9FA] dark:bg-[#14161A] px-3 py-2">
                  <span className="text-[#5A6069] dark:text-[#9CA3AF] block">Sodium</span>
                  <strong className="text-sm">{summary.sodium_mg} mg</strong>
                </div>
                <div className="rounded-lg bg-[#F8F9FA] dark:bg-[#14161A] px-3 py-2">
                  <span className="text-[#5A6069] dark:text-[#9CA3AF] block">Cholesterol</span>
                  <strong className="text-sm">{summary.cholesterol_mg} mg</strong>
                </div>
                <div className="rounded-lg bg-[#F8F9FA] dark:bg-[#14161A] px-3 py-2">
                  <span className="text-[#5A6069] dark:text-[#9CA3AF] block">Macro Split</span>
                  <strong className="text-[11px]">
                    {(() => {
                      const pCal = (summary.protein_g || 0) * 4;
                      const cCal = (summary.carbs_g || 0) * 4;
                      const fCal = (summary.fat_g || 0) * 9;
                      const tot = pCal + cCal + fCal;
                      if (tot <= 0) return 'Target Ready';
                      return `P ${Math.round((pCal / tot) * 100)}% • C ${Math.round((cCal / tot) * 100)}% • F ${Math.round((fCal / tot) * 100)}%`;
                    })()}
                  </strong>
                </div>
              </div>

              <div className="md:col-span-4 h-36 rounded-xl bg-[#F8F9FA] dark:bg-[#14161A] border border-[#E1E4E8] dark:border-[#2A2D35] p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={
                        summary.protein_g + summary.carbs_g + summary.fat_g > 0
                          ? [
                              { name: 'Protein (kcal)', value: Math.round(summary.protein_g * 4), color: '#f43f5e' },
                              { name: 'Carbs (kcal)', value: Math.round(summary.carbs_g * 4), color: '#0ea5e9' },
                              { name: 'Fat (kcal)', value: Math.round(summary.fat_g * 9), color: '#f59e0b' },
                            ]
                          : [
                              { name: 'Protein Target', value: Math.round(targets.protein_g * 4), color: '#f43f5e' },
                              { name: 'Carbs Target', value: Math.round(targets.carbs_g * 4), color: '#0ea5e9' },
                              { name: 'Fat Target', value: Math.round(targets.fats_g * 9), color: '#f59e0b' },
                            ]
                      }
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={50}
                      paddingAngle={3}
                    >
                      {['#f43f5e', '#0ea5e9', '#f59e0b'].map((c, idx) => (
                        <Cell key={idx} fill={c} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1B1D22',
                        border: '1px solid #30333A',
                        borderRadius: '8px',
                        fontSize: '11px',
                        color: '#fff',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Right 4 Cols: Water Intake Tracker & Quick Actions */}
          <div className="lg:col-span-4 rounded-2xl border border-[#E1E4E8] dark:border-[#2A2D35] bg-white dark:bg-[#1B1D22] p-6 shadow-sm flex flex-col justify-between space-y-5">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/15 text-sky-400 border border-sky-500/30">
                    <Droplet className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base">Water Intake</h3>
                    <p className="text-xs text-[#5A6069] dark:text-[#9CA3AF]">
                      Daily hydration goal: {(targets.water_ml / 1000).toFixed(1)} L ({targets.water_ml} ml)
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleResetWater}
                  className="text-xs text-[#5A6069] dark:text-[#9CA3AF] hover:text-red-400 transition"
                >
                  Reset
                </button>
              </div>

              <div className="rounded-xl bg-[#F8F9FA] dark:bg-[#14161A] p-4 border border-[#E1E4E8] dark:border-[#2A2D35] text-center">
                <div className="text-3xl font-extrabold text-sky-500">
                  {summary.water_ml} <span className="text-base font-normal">ml</span>
                </div>
                <div className="text-xs text-[#5A6069] dark:text-[#9CA3AF] mt-0.5">
                  ({(summary.water_ml / 1000).toFixed(2)} Litres • {waterPct}% of daily goal)
                </div>
                <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-[#E5E7EB] dark:bg-[#2A2D35]">
                  <div
                    className="h-full rounded-full bg-sky-500 transition-all duration-300"
                    style={{ width: `${waterPct}%` }}
                  />
                </div>
              </div>

              {/* Quick hydration buttons */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleAddWater(250)}
                  className="rounded-xl border border-sky-500/30 bg-sky-500/10 py-2.5 text-xs font-bold text-sky-500 hover:bg-sky-500/20 transition"
                >
                  +250 ml Glass
                </button>
                <button
                  type="button"
                  onClick={() => handleAddWater(500)}
                  className="rounded-xl border border-sky-500/30 bg-sky-500/10 py-2.5 text-xs font-bold text-sky-500 hover:bg-sky-500/20 transition"
                >
                  +500 ml Bottle
                </button>
                <button
                  type="button"
                  onClick={() => handleAddWater(750)}
                  className="rounded-xl border border-sky-500/30 bg-sky-500/10 py-2.5 text-xs font-bold text-sky-500 hover:bg-sky-500/20 transition"
                >
                  +750 ml Shaker
                </button>
              </div>

              {/* Custom water amount */}
              <div className="flex items-center gap-2">
                <NumericInput
                  min={50}
                  max={5000}
                  allowDecimal={false}
                  value={customWaterMl === '' ? null : Number(customWaterMl)}
                  onValueChange={(v) => setCustomWaterMl(v === null ? '' : String(v))}
                  placeholder="Custom ml"
                  className="w-full rounded-xl border border-[#E1E4E8] dark:border-[#30333A] bg-[#F8F9FA] dark:bg-[#14161A] px-3 py-2 text-xs focus:border-sky-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleAddWater(Number(customWaterMl) || 250)}
                  className="shrink-0 rounded-xl bg-sky-500 px-3.5 py-2 text-xs font-bold text-white hover:bg-sky-600 transition"
                >
                  Add ml
                </button>
              </div>
            </div>

            <div className="rounded-xl bg-[#F8F9FA] dark:bg-[#14161A] p-3 text-[11px] text-[#5A6069] dark:text-[#9CA3AF] flex items-start gap-2 border border-[#E1E4E8] dark:border-[#2A2D35]">
              <Info className="h-4 w-4 text-brand shrink-0 mt-0.5" />
              <span>{targets.disclaimer}</span>
            </div>
          </div>
        </div>

        {/* 4 Meal Sections: Breakfast, Lunch, Snacks, Dinner */}
        <div className="space-y-5">
          {MEAL_CONFIG.map(({ key: mealKey, label: mealLabel }) => {
            const mealEntries = entries.filter((e) => e.meal_category === mealKey);
            const mealCalories = Math.round(
              mealEntries.reduce((acc, item) => acc + (Number(item.calories) || 0), 0)
            );
            const mealProtein =
              Math.round(
                mealEntries.reduce((acc, item) => acc + (Number(item.protein_g) || 0), 0) * 10
              ) / 10;
            const mealCarbs =
              Math.round(
                mealEntries.reduce((acc, item) => acc + (Number(item.carbs_g) || 0), 0) * 10
              ) / 10;
            const mealFat =
              Math.round(mealEntries.reduce((acc, item) => acc + (Number(item.fat_g) || 0), 0) * 10) /
              10;

            return (
              <div
                key={mealKey}
                className="rounded-2xl border border-[#E1E4E8] dark:border-[#2A2D35] bg-white dark:bg-[#1B1D22] shadow-sm overflow-hidden"
              >
                {/* Meal Card Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E1E4E8] dark:border-[#2A2D35] bg-[#F8F9FA] dark:bg-[#16181D] px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/15 text-brand font-bold text-sm">
                      {mealLabel[0]}
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h3 className="text-base font-bold">{mealLabel}</h3>
                        <span className="rounded-lg bg-brand/15 px-2.5 py-0.5 text-xs font-bold text-brand">
                          {mealCalories} kcal
                        </span>
                      </div>
                      <div className="text-xs text-[#5A6069] dark:text-[#9CA3AF] mt-0.5">
                        Protein: <strong>{mealProtein}g</strong> • Carbs: <strong>{mealCarbs}g</strong> • Fat:{' '}
                        <strong>{mealFat}g</strong>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openAddFoodModal(mealKey, 'All')}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-3.5 py-2 text-xs font-bold text-black hover:opacity-95 transition"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add Food</span>
                    </button>

                    <ThreeDotMenu
                      ariaLabel={`${mealLabel} options`}
                      actions={[
                        {
                          label: `Log Food to ${mealLabel}`,
                          icon: <Plus className="h-3.5 w-3.5" />,
                          onClick: () => openAddFoodModal(mealKey, 'All'),
                        },
                        {
                          label: `Log Supplement to ${mealLabel}`,
                          icon: <Pill className="h-3.5 w-3.5" />,
                          onClick: () => openAddFoodModal(mealKey, 'Supplements'),
                        },
                        {
                          label: `Save ${mealLabel} as Meal Template`,
                          icon: <Bookmark className="h-3.5 w-3.5" />,
                          onClick: () =>
                            setSaveMealModal({
                              open: true,
                              mealCategory: mealKey,
                              name: `My ${mealLabel} Combo`,
                            }),
                        },
                        {
                          label: `Copy Yesterday's ${mealLabel}`,
                          icon: <Copy className="h-3.5 w-3.5" />,
                          onClick: () => handleCopyPreviousDay(mealKey),
                        },
                      ]}
                    />
                  </div>
                </div>

                {/* Meal Entries List */}
                {mealEntries.length === 0 ? (
                  <div className="px-5 py-6 text-center text-xs text-[#5A6069] dark:text-[#9CA3AF]">
                    No foods or supplements logged for {mealLabel} yet. Click <strong>+ Add Food</strong> to search
                    Indian foods, global foods, or supplements.
                  </div>
                ) : (
                  <div className="divide-y divide-[#E1E4E8] dark:divide-[#2A2D35]">
                    {mealEntries.map((entry) => {
                      const isFav = favoriteIds.includes(entry.food_id);
                      return (
                        <div
                          key={entry.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5 hover:bg-black/[0.015] dark:hover:bg-white/[0.015] transition"
                        >
                          <div className="space-y-0.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-sm">{entry.food_name}</span>
                              {entry.brand && (
                                <span className="text-xs text-[#5A6069] dark:text-[#9CA3AF]">
                                  ({entry.brand})
                                </span>
                              )}
                              {entry.is_supplement && (
                                <span className="inline-flex items-center gap-1 rounded-md bg-purple-500/15 px-2 py-0.5 text-[10px] font-bold text-purple-400 border border-purple-500/30">
                                  <Pill className="h-2.5 w-2.5" />
                                  Supplement
                                </span>
                              )}
                              {isFav && (
                                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400 inline" />
                              )}
                            </div>
                            <div className="text-xs text-[#5A6069] dark:text-[#9CA3AF]">
                              Quantity: <strong>{entry.quantity}</strong> {entry.unit} ({entry.total_grams}g)
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-4">
                            <div className="flex items-center gap-3 text-xs">
                              <div className="text-right">
                                <span className="font-bold text-sm text-brand">{entry.calories} kcal</span>
                              </div>
                              <div className="hidden md:flex items-center gap-2 text-[11px] text-[#5A6069] dark:text-[#9CA3AF]">
                                <span className="rounded bg-rose-500/10 text-rose-400 px-1.5 py-0.5 font-medium">
                                  P: {entry.protein_g}g
                                </span>
                                <span className="rounded bg-sky-500/10 text-sky-400 px-1.5 py-0.5 font-medium">
                                  C: {entry.carbs_g}g
                                </span>
                                <span className="rounded bg-amber-500/10 text-amber-400 px-1.5 py-0.5 font-medium">
                                  F: {entry.fat_g}g
                                </span>
                                <span className="rounded bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 font-medium">
                                  Fib: {entry.fiber_g || 0}g
                                </span>
                              </div>
                            </div>

                            <ThreeDotMenu
                              ariaLabel={`Actions for ${entry.food_name}`}
                              actions={[
                                {
                                  label: 'Edit Quantity / Unit / Meal',
                                  icon: <Edit3 className="h-3.5 w-3.5" />,
                                  onClick: () => {
                                    setEditingEntry(entry);
                                    setEditQuantity(entry.quantity);
                                    setEditUnit(entry.unit);
                                    setEditMeal(entry.meal_category);
                                  },
                                },
                                {
                                  label: isFav ? 'Remove from Favourites' : 'Save as Favourite',
                                  icon: <Star className="h-3.5 w-3.5" />,
                                  onClick: () => handleToggleFavorite(entry.food_id, entry.food_name),
                                },
                                {
                                  label: 'Delete Entry',
                                  icon: <Trash2 className="h-3.5 w-3.5" />,
                                  destructive: true,
                                  onClick: () => handleDeleteEntry(entry.id, entry.food_name),
                                },
                              ]}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* FOOD & SUPPLEMENT SEARCH / LOGGING MODAL */}
      {searchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-6 overflow-y-auto">
          <div className="relative w-full max-w-5xl rounded-2xl border border-[#E1E4E8] dark:border-[#30333A] bg-white dark:bg-[#1B1D22] shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E1E4E8] dark:border-[#2A2D35] px-5 py-4 bg-[#F8F9FA] dark:bg-[#14161A]">
              <div className="flex items-center gap-3">
                <Utensils className="h-5 w-5 text-brand" />
                <div>
                  <h2 className="text-base sm:text-lg font-bold">
                    Log Food or Supplement to{' '}
                    <select
                      value={activeMeal}
                      onChange={(e) => setActiveMeal(e.target.value as MealCategory)}
                      className="ml-1 rounded-lg border border-brand/40 bg-brand/10 px-2.5 py-1 text-brand font-bold text-sm focus:outline-none"
                    >
                      {MEAL_CONFIG.map((m) => (
                        <option
                          key={m.key}
                          value={m.key}
                          className="bg-white dark:bg-[#1B1D22] text-[#111318] dark:text-white"
                        >
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCustomModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-brand/40 bg-brand/10 px-3 py-1.5 text-xs font-bold text-brand hover:bg-brand/20 transition"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Create Custom Food / Supplement</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSearchModalOpen(false)}
                  className="rounded-xl p-1.5 text-[#5A6069] hover:bg-black/5 dark:hover:bg-white/10"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Search Input & Tabs */}
            <div className="p-4 border-b border-[#E1E4E8] dark:border-[#2A2D35] space-y-3">
              <div className="flex flex-col sm:flex-row gap-2.5">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5A6069]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search Roti, Dal, Paneer, ON Whey, Creatine, or enter 8-13 digit Barcode..."
                    className="w-full rounded-xl border border-[#E1E4E8] dark:border-[#30333A] bg-[#F8F9FA] dark:bg-[#14161A] pl-10 pr-10 py-2.5 text-sm focus:border-brand focus:outline-none"
                  />
                  <ScanBarcode className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5A6069]" />
                </div>
                <label className="inline-flex items-center gap-2 rounded-xl border border-[#E1E4E8] dark:border-[#30333A] px-3 py-2 text-xs font-medium cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includeExternal}
                    onChange={(e) => setIncludeExternal(e.target.checked)}
                    className="rounded accent-brand"
                  />
                  <Globe className="h-3.5 w-3.5 text-brand" />
                  <span>Include Packaged / OpenFoodFacts</span>
                </label>
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {FOOD_CATEGORY_TABS.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setSelectedTab(tab)}
                    className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                      selectedTab === tab
                        ? 'bg-brand text-black font-bold'
                        : 'bg-[#F3F4F6] dark:bg-[#23262E] text-[#5A6069] dark:text-[#9CA3AF] hover:text-[#111318] dark:hover:text-white'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Body: Split View on Desktop, Step-Switch on Mobile */}
            <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden">
              {/* Left 7 Cols: Search Results or Saved Meals */}
              <div
                className={`${
                  selectedFood ? 'hidden lg:block' : 'block'
                } lg:col-span-7 overflow-y-auto divide-y divide-[#E1E4E8] dark:divide-[#2A2D35] max-h-[60vh] lg:max-h-[55vh]`}
              >
                {selectedTab === 'Saved Meals' ? (
                  (diaryData?.savedMeals || []).length === 0 ? (
                    <div className="p-8 text-center text-xs text-[#5A6069] dark:text-[#9CA3AF]">
                      No saved meal templates yet. Use the three-dot menu (⋮) on any meal card to save a
                      meal combo.
                    </div>
                  ) : (
                    (diaryData?.savedMeals || []).map((sm: any) => (
                      <div
                        key={sm.id}
                        className="flex items-center justify-between p-4 hover:bg-black/5 dark:hover:bg-white/5"
                      >
                        <div>
                          <div className="font-bold text-sm">{sm.name}</div>
                          <div className="text-xs text-[#5A6069] dark:text-[#9CA3AF]">
                            {sm.items?.length || 0} items
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleLogSavedMeal(sm.id, sm.name)}
                          className="rounded-xl bg-brand px-3 py-1.5 text-xs font-bold text-black"
                        >
                          Log Meal
                        </button>
                      </div>
                    ))
                  )
                ) : searchingFoods ? (
                  <div className="p-8 text-center text-xs text-[#5A6069] dark:text-[#9CA3AF]">
                    Searching food &amp; supplement database...
                  </div>
                ) : modalDisplayedFoods.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[#5A6069] dark:text-[#9CA3AF]">
                    No matching foods found. Try searching another term, enable Packaged/OpenFoodFacts, or click{' '}
                    <strong>Create Custom Food / Supplement</strong>.
                  </div>
                ) : (
                  modalDisplayedFoods.map((food) => {
                    const isSelected = selectedFood?.id === food.id;
                    const isFav = favoriteIds.includes(food.id);
                    const defServing = calculateFoodNutrition(
                      food,
                      food.default_quantity || 1,
                      food.default_unit || food.servings?.[0]?.unit || 'serving'
                    );
                    const defLabel =
                      food.servings?.find((s) => s.unit === food.default_unit)?.label ||
                      food.servings?.[0]?.label ||
                      '100g';

                    return (
                      <div
                        key={food.id}
                        onClick={() => handleSelectFood(food)}
                        className={`flex items-center justify-between gap-3 px-4 py-3 cursor-pointer transition ${
                          isSelected
                            ? 'bg-brand/15 border-l-4 border-brand'
                            : 'hover:bg-black/[0.03] dark:hover:bg-white/[0.03]'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-semibold text-sm">{food.name}</span>
                            {food.brand && (
                              <span className="text-xs text-[#5A6069] dark:text-[#9CA3AF]">
                                • {food.brand}
                              </span>
                            )}
                            {(food.is_supplement || food.category === 'Supplements') && (
                              <span className="rounded bg-purple-500/15 px-1.5 py-0.5 text-[10px] font-bold text-purple-400">
                                {food.subcategory || 'Supplement'}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-[#5A6069] dark:text-[#9CA3AF]">
                            {defLabel} • <strong className="text-brand">{defServing.calories} kcal</strong> • P:{' '}
                            {defServing.protein_g}g • C: {defServing.carbs_g}g • F: {defServing.fat_g}g
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleFavorite(food.id, food.name);
                          }}
                          className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10"
                          title="Toggle Favourite"
                        >
                          <Star
                            className={`h-4 w-4 ${
                              isFav ? 'fill-amber-400 text-amber-400' : 'text-[#5A6069]'
                            }`}
                          />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Right 5 Cols: Selected Food Live Macro & Quantity Calculator */}
              <div
                className={`${
                  selectedFood ? 'block' : 'hidden lg:block'
                } lg:col-span-5 border-t lg:border-t-0 lg:border-l border-[#E1E4E8] dark:border-[#2A2D35] bg-[#F8F9FA] dark:bg-[#14161A] p-4 sm:p-5 overflow-y-auto max-h-[65vh] lg:max-h-[55vh]`}
              >
                {!selectedFood ? (
                  <div className="h-full flex flex-col items-center justify-center text-center py-12 text-xs text-[#5A6069] dark:text-[#9CA3AF]">
                    <Scale className="h-8 w-8 text-brand mb-2 opacity-80" />
                    <p className="font-semibold text-sm text-[#111318] dark:text-white">
                      Select a Food or Supplement
                    </p>
                    <p className="mt-1 max-w-xs">
                      Choose any item on the left to adjust its quantity and serving unit (grams, pieces, bowls,
                      katoris, scoops) with real-time macro calculation.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <button
                      type="button"
                      onClick={() => setSelectedFood(null)}
                      className="lg:hidden inline-flex items-center gap-1 text-xs font-bold text-brand hover:underline"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span>Back to Search Results</span>
                    </button>
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-brand">
                          {selectedFood.category}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-500 font-semibold">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Verified Nutrition
                        </span>
                      </div>
                      <h3 className="text-base font-bold mt-0.5">{selectedFood.name}</h3>
                      {selectedFood.brand && (
                        <p className="text-xs text-[#5A6069] dark:text-[#9CA3AF]">Brand: {selectedFood.brand}</p>
                      )}
                    </div>

                    {/* Quantity & Unit Controls */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold mb-1">Quantity</label>
                        <NumericInput
                          min={0.1}
                          max={5000}
                          allowDecimal
                          defaultOnBlur={1}
                          value={quantity}
                          onValueChange={(v) => setQuantity(v ?? 0)}
                          className="w-full rounded-xl border border-[#E1E4E8] dark:border-[#30333A] bg-white dark:bg-[#1B1D22] px-3 py-2 text-sm font-bold focus:border-brand focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold mb-1">Serving Unit</label>
                        <select
                          value={selectedUnit}
                          onChange={(e) => setSelectedUnit(e.target.value)}
                          className="w-full rounded-xl border border-[#E1E4E8] dark:border-[#30333A] bg-white dark:bg-[#1B1D22] px-3 py-2 text-sm font-semibold focus:border-brand focus:outline-none"
                        >
                          {availableUnitsForFood.map((u) => (
                            <option key={u.unit} value={u.unit}>
                              {u.label} ({u.grams}g)
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Quick Quantity Presets */}
                    <div className="flex flex-wrap gap-1.5">
                      {[0.5, 1, 1.5, 2, 3, 100, 250].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => {
                            if (preset >= 100) {
                              setSelectedUnit('g');
                              setQuantity(preset);
                            } else {
                              setQuantity(preset);
                            }
                          }}
                          className="rounded-lg border border-[#E1E4E8] dark:border-[#30333A] bg-white dark:bg-[#1B1D22] px-2.5 py-1 text-xs font-semibold hover:border-brand"
                        >
                          {preset >= 100 ? `${preset}g` : `${preset}x`}
                        </button>
                      ))}
                    </div>

                    {/* Live Calculated Macros Box */}
                    {liveCalculation && (
                      <div className="rounded-xl border border-brand/30 bg-white dark:bg-[#1B1D22] p-4 space-y-3">
                        <div className="flex items-center justify-between border-b border-[#E1E4E8] dark:border-[#2A2D35] pb-2.5">
                          <span className="text-xs font-semibold text-[#5A6069] dark:text-[#9CA3AF]">
                            Calculated Total ({liveCalculation.total_grams}g)
                          </span>
                          <span className="text-xl font-extrabold text-brand">
                            {liveCalculation.calories} kcal
                          </span>
                        </div>

                        <div className="grid grid-cols-4 gap-2 text-center text-xs">
                          <div className="rounded-lg bg-rose-500/10 p-2">
                            <span className="block text-[10px] text-rose-400 font-semibold">Protein</span>
                            <strong className="text-sm">{liveCalculation.protein_g}g</strong>
                          </div>
                          <div className="rounded-lg bg-sky-500/10 p-2">
                            <span className="block text-[10px] text-sky-400 font-semibold">Carbs</span>
                            <strong className="text-sm">{liveCalculation.carbs_g}g</strong>
                          </div>
                          <div className="rounded-lg bg-amber-500/10 p-2">
                            <span className="block text-[10px] text-amber-400 font-semibold">Fat</span>
                            <strong className="text-sm">{liveCalculation.fat_g}g</strong>
                          </div>
                          <div className="rounded-lg bg-emerald-500/10 p-2">
                            <span className="block text-[10px] text-emerald-400 font-semibold">Fibre</span>
                            <strong className="text-sm">{liveCalculation.fiber_g}g</strong>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-[#5A6069] dark:text-[#9CA3AF] pt-1">
                          <div className="flex justify-between">
                            <span>Saturated Fat:</span>
                            <strong>{liveCalculation.saturated_fat_g}g</strong>
                          </div>
                          <div className="flex justify-between">
                            <span>Unsaturated Fat:</span>
                            <strong>{liveCalculation.unsaturated_fat_g}g</strong>
                          </div>
                          <div className="flex justify-between">
                            <span>Total Sugar:</span>
                            <strong>{liveCalculation.sugar_g}g</strong>
                          </div>
                          <div className="flex justify-between">
                            <span>Sodium:</span>
                            <strong>{liveCalculation.sodium_mg}mg</strong>
                          </div>
                          <div className="flex justify-between">
                            <span>Cholesterol:</span>
                            <strong>{liveCalculation.cholesterol_mg}mg</strong>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Supplement Active Ingredients & Notes */}
                    {(selectedFood.is_supplement ||
                      selectedFood.category === 'Supplements' ||
                      selectedFood.ingredients ||
                      selectedFood.micronutrients_note) && (
                      <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-3 text-xs space-y-1">
                        <div className="font-bold text-purple-300 flex items-center gap-1.5">
                          <Pill className="h-3.5 w-3.5" />
                          <span>{selectedFood.subcategory || 'Nutritional & Formulation Note'}</span>
                        </div>
                        {selectedFood.ingredients && (
                          <div className="text-[11px] text-purple-200">
                            <strong>Ingredients:</strong> {selectedFood.ingredients}
                          </div>
                        )}
                        {selectedFood.micronutrients_note && (
                          <div className="text-[11px] text-purple-200/90">
                            <strong>Note:</strong> {selectedFood.micronutrients_note}
                          </div>
                        )}
                      </div>
                    )}

                    <button
                      type="button"
                      disabled={submittingEntry}
                      onClick={handleAddFoodToDiary}
                      className="w-full rounded-xl bg-brand py-3 text-sm font-bold text-black hover:opacity-95 transition disabled:opacity-50"
                    >
                      {submittingEntry
                        ? 'Logging...'
                        : `Add to ${MEAL_CONFIG.find((m) => m.key === activeMeal)?.label || activeMeal}`}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT EXISTING ENTRY MODAL */}
      {editingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#E1E4E8] dark:border-[#30333A] bg-white dark:bg-[#1B1D22] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold">Edit {editingEntry.food_name}</h3>
              <button type="button" onClick={() => setEditingEntry(null)}>
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1">Meal Category</label>
                <select
                  value={editMeal}
                  onChange={(e) => setEditMeal(e.target.value as MealCategory)}
                  className="w-full rounded-xl border border-[#E1E4E8] dark:border-[#30333A] bg-[#F8F9FA] dark:bg-[#14161A] px-3 py-2 text-sm"
                >
                  {MEAL_CONFIG.map((m) => (
                    <option key={m.key} value={m.key}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Quantity</label>
                  <NumericInput
                    min={0.1}
                    max={5000}
                    allowDecimal
                    defaultOnBlur={1}
                    value={editQuantity}
                    onValueChange={(v) => setEditQuantity(v ?? 0)}
                    className="w-full rounded-xl border border-[#E1E4E8] dark:border-[#30333A] bg-[#F8F9FA] dark:bg-[#14161A] px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Unit</label>
                  <select
                    value={editUnit}
                    onChange={(e) => setEditUnit(e.target.value)}
                    className="w-full rounded-xl border border-[#E1E4E8] dark:border-[#30333A] bg-[#F8F9FA] dark:bg-[#14161A] px-3 py-2 text-sm"
                  >
                    {STANDARD_UNITS.map((u) => (
                      <option key={u.unit} value={u.unit}>
                        {u.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingEntry(null)}
                className="rounded-xl border border-[#E1E4E8] dark:border-[#30333A] px-4 py-2 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpdateEntry}
                className="rounded-xl bg-brand px-4 py-2 text-xs font-bold text-black"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SAVE MEAL TEMPLATE MODAL */}
      {saveMealModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#E1E4E8] dark:border-[#30333A] bg-white dark:bg-[#1B1D22] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold">
                Save {MEAL_CONFIG.find((m) => m.key === saveMealModal.mealCategory)?.label} as Meal Template
              </h3>
              <button
                type="button"
                onClick={() => setSaveMealModal({ open: false, mealCategory: 'breakfast', name: '' })}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Template Name</label>
              <input
                type="text"
                value={saveMealModal.name}
                onChange={(e) => setSaveMealModal({ ...saveMealModal, name: e.target.value })}
                placeholder="e.g., High Protein Post-Workout Breakfast"
                className="w-full rounded-xl border border-[#E1E4E8] dark:border-[#30333A] bg-[#F8F9FA] dark:bg-[#14161A] px-3 py-2 text-sm"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSaveMealModal({ open: false, mealCategory: 'breakfast', name: '' })}
                className="rounded-xl border border-[#E1E4E8] dark:border-[#30333A] px-4 py-2 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveMealTemplate}
                className="rounded-xl bg-brand px-4 py-2 text-xs font-bold text-black"
              >
                Save Meal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE CUSTOM FOOD / SUPPLEMENT MODAL */}
      {customModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 overflow-y-auto">
          <form
            onSubmit={handleCreateCustomFood}
            className="w-full max-w-lg rounded-2xl border border-[#E1E4E8] dark:border-[#30333A] bg-white dark:bg-[#1B1D22] p-6 space-y-4 my-auto"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold">Create Custom Food or Supplement</h3>
              <button type="button" onClick={() => setCustomModalOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex items-center gap-4">
              <label className="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={customFoodForm.is_supplement}
                  onChange={(e) =>
                    setCustomFoodForm({ ...customFoodForm, is_supplement: e.target.checked })
                  }
                  className="rounded accent-brand"
                />
                <span>This is a Supplement (Protein, Creatine, Vitamins, Pre-Workout, etc.)</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1">Name *</label>
                <input
                  type="text"
                  required
                  value={customFoodForm.name}
                  onChange={(e) => setCustomFoodForm({ ...customFoodForm, name: e.target.value })}
                  placeholder="e.g., Homemade Paneer Paratha or Custom Whey"
                  className="w-full rounded-xl border border-[#E1E4E8] dark:border-[#30333A] bg-[#F8F9FA] dark:bg-[#14161A] px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Brand</label>
                <input
                  type="text"
                  list="supplement-brands"
                  value={customFoodForm.brand}
                  onChange={(e) => setCustomFoodForm({ ...customFoodForm, brand: e.target.value })}
                  className="w-full rounded-xl border border-[#E1E4E8] dark:border-[#30333A] bg-[#F8F9FA] dark:bg-[#14161A] px-3 py-2 text-xs"
                />
                <datalist id="supplement-brands">
                  {SUPPLEMENT_BRANDS.map((b) => (
                    <option key={b} value={b} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1">Serving Label</label>
                <input
                  type="text"
                  value={customFoodForm.serving_label}
                  onChange={(e) =>
                    setCustomFoodForm({ ...customFoodForm, serving_label: e.target.value })
                  }
                  placeholder="1 scoop (32g)"
                  className="w-full rounded-xl border border-[#E1E4E8] dark:border-[#30333A] bg-[#F8F9FA] dark:bg-[#14161A] px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Default Unit</label>
                <select
                  value={customFoodForm.serving_unit}
                  onChange={(e) =>
                    setCustomFoodForm({ ...customFoodForm, serving_unit: e.target.value })
                  }
                  className="w-full rounded-xl border border-[#E1E4E8] dark:border-[#30333A] bg-[#F8F9FA] dark:bg-[#14161A] px-3 py-2 text-xs"
                >
                  {STANDARD_UNITS.map((u) => (
                    <option key={u.unit} value={u.unit}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Serving Grams (g)</label>
                <NumericInput
                  min={1}
                  max={5000}
                  allowDecimal
                  value={customFoodForm.serving_grams === '' ? null : Number(customFoodForm.serving_grams)}
                  onValueChange={(v) =>
                    setCustomFoodForm({ ...customFoodForm, serving_grams: v === null ? '' : String(v) })
                  }
                  className="w-full rounded-xl border border-[#E1E4E8] dark:border-[#30333A] bg-[#F8F9FA] dark:bg-[#14161A] px-3 py-2 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold mb-1">Calories (kcal)*</label>
                <NumericInput
                  min={0}
                  max={5000}
                  allowDecimal
                  required
                  value={customFoodForm.calories === '' ? null : Number(customFoodForm.calories)}
                  onValueChange={(v) =>
                    setCustomFoodForm({ ...customFoodForm, calories: v === null ? '' : String(v) })
                  }
                  className="w-full rounded-xl border border-[#E1E4E8] dark:border-[#30333A] bg-[#F8F9FA] dark:bg-[#14161A] px-2.5 py-1.5 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold mb-1">Protein (g)</label>
                <NumericInput
                  min={0}
                  max={500}
                  allowDecimal
                  value={customFoodForm.protein_g === '' ? null : Number(customFoodForm.protein_g)}
                  onValueChange={(v) =>
                    setCustomFoodForm({ ...customFoodForm, protein_g: v === null ? '' : String(v) })
                  }
                  className="w-full rounded-xl border border-[#E1E4E8] dark:border-[#30333A] bg-[#F8F9FA] dark:bg-[#14161A] px-2.5 py-1.5 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold mb-1">Carbs (g)</label>
                <NumericInput
                  min={0}
                  max={1000}
                  allowDecimal
                  value={customFoodForm.carbs_g === '' ? null : Number(customFoodForm.carbs_g)}
                  onValueChange={(v) =>
                    setCustomFoodForm({ ...customFoodForm, carbs_g: v === null ? '' : String(v) })
                  }
                  className="w-full rounded-xl border border-[#E1E4E8] dark:border-[#30333A] bg-[#F8F9FA] dark:bg-[#14161A] px-2.5 py-1.5 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold mb-1">Fat (g)</label>
                <NumericInput
                  min={0}
                  max={500}
                  allowDecimal
                  value={customFoodForm.fat_g === '' ? null : Number(customFoodForm.fat_g)}
                  onValueChange={(v) =>
                    setCustomFoodForm({ ...customFoodForm, fat_g: v === null ? '' : String(v) })
                  }
                  className="w-full rounded-xl border border-[#E1E4E8] dark:border-[#30333A] bg-[#F8F9FA] dark:bg-[#14161A] px-2.5 py-1.5 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold mb-1">Fibre (g)</label>
                <NumericInput
                  min={0}
                  max={200}
                  allowDecimal
                  value={customFoodForm.fiber_g === '' ? null : Number(customFoodForm.fiber_g)}
                  onValueChange={(v) =>
                    setCustomFoodForm({ ...customFoodForm, fiber_g: v === null ? '' : String(v) })
                  }
                  className="w-full rounded-xl border border-[#E1E4E8] dark:border-[#30333A] bg-[#F8F9FA] dark:bg-[#14161A] px-2.5 py-1.5 text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCustomModalOpen(false)}
                className="rounded-xl border border-[#E1E4E8] dark:border-[#30333A] px-4 py-2 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-xl bg-brand px-4 py-2 text-xs font-bold text-black"
              >
                Save Custom Item
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
