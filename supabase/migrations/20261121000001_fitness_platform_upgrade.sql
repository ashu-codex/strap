-- =====================================================================================
-- STRAP – Complete Fitness Platform Upgrade (Phase 9 Database Architecture Migration)
-- Non-destructive, idempotent schema extensions with Row Level Security (RLS) & Indexes
-- =====================================================================================

-- 1. Extend user_profiles safely
ALTER TABLE IF EXISTS public.user_profiles
  ADD COLUMN IF NOT EXISTS age integer,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS height numeric,
  ADD COLUMN IF NOT EXISTS weight numeric,
  ADD COLUMN IF NOT EXISTS fitness_goal text,
  ADD COLUMN IF NOT EXISTS experience_level text,
  ADD COLUMN IF NOT EXISTS preferred_training_type text DEFAULT 'muscle_building',
  ADD COLUMN IF NOT EXISTS auth_origin text DEFAULT 'email_password',
  ADD COLUMN IF NOT EXISTS google_linked boolean DEFAULT false;

-- 2. Authentication Providers Separation Table
CREATE TABLE IF NOT EXISTS public.authentication_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('email_password', 'google')),
  provider_email text NOT NULL,
  explicitly_linked boolean NOT NULL DEFAULT false,
  linked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider)
);

-- 3. Training Preferences (Powerlifting vs Muscle Building + 1RMs + Custom Macro Overrides)
CREATE TABLE IF NOT EXISTS public.training_preferences (
  user_id uuid PRIMARY KEY REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  training_style text NOT NULL DEFAULT 'muscle_building' CHECK (training_style IN ('powerlifting', 'muscle_building')),
  squat_1rm_kg numeric DEFAULT 0,
  bench_1rm_kg numeric DEFAULT 0,
  deadlift_1rm_kg numeric DEFAULT 0,
  custom_calorie_target integer,
  custom_protein_g numeric,
  custom_carbs_g numeric,
  custom_fats_g numeric,
  custom_fiber_g numeric,
  custom_water_ml integer,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Custom Exercises & Workout Templates
CREATE TABLE IF NOT EXISTS public.custom_exercises (
  id text PRIMARY KEY,
  user_id uuid REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL,
  primary_muscles text[] DEFAULT '{}',
  secondary_muscles text[] DEFAULT '{}',
  equipment text NOT NULL DEFAULT 'Barbell',
  difficulty text NOT NULL DEFAULT 'Intermediate',
  is_powerlifting boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.workout_templates (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  split_type text NOT NULL,
  training_style text NOT NULL DEFAULT 'muscle_building',
  exercises jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 5. Food Brands, Food Items & Supplements Catalog
CREATE TABLE IF NOT EXISTS public.food_brands (
  id text PRIMARY KEY,
  name text NOT NULL UNIQUE,
  is_supplement_brand boolean NOT NULL DEFAULT false,
  verified boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.food_items (
  id text PRIMARY KEY,
  user_id uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  name text NOT NULL,
  brand text NOT NULL DEFAULT 'Verified Catalog',
  category text NOT NULL,
  subcategory text,
  barcode text,
  default_unit text NOT NULL DEFAULT 'serving',
  default_quantity numeric NOT NULL DEFAULT 1,
  servings jsonb NOT NULL DEFAULT '[]'::jsonb,
  per100g jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_global boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.supplements (
  id text PRIMARY KEY,
  user_id uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  name text NOT NULL,
  brand text NOT NULL,
  supplement_type text NOT NULL,
  default_unit text NOT NULL DEFAULT 'scoop',
  serving_grams numeric NOT NULL DEFAULT 32,
  servings jsonb NOT NULL DEFAULT '[]'::jsonb,
  per100g jsonb NOT NULL DEFAULT '{}'::jsonb,
  ingredients text,
  micronutrients_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 6. Nutrition Diary Entries, Saved Meals, Daily Summaries & Water Logs
CREATE TABLE IF NOT EXISTS public.nutrition_entries (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  meal_category text NOT NULL CHECK (meal_category IN ('breakfast', 'lunch', 'snacks', 'dinner')),
  food_id text NOT NULL,
  food_name text NOT NULL,
  brand text,
  is_supplement boolean NOT NULL DEFAULT false,
  quantity numeric NOT NULL,
  unit text NOT NULL,
  total_grams numeric NOT NULL DEFAULT 100,
  calories numeric NOT NULL DEFAULT 0,
  protein_g numeric NOT NULL DEFAULT 0,
  carbs_g numeric NOT NULL DEFAULT 0,
  fat_g numeric NOT NULL DEFAULT 0,
  saturated_fat_g numeric NOT NULL DEFAULT 0,
  unsaturated_fat_g numeric NOT NULL DEFAULT 0,
  fiber_g numeric NOT NULL DEFAULT 0,
  sugar_g numeric NOT NULL DEFAULT 0,
  sodium_mg numeric NOT NULL DEFAULT 0,
  cholesterol_mg numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.saved_meals (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  meal_category text NOT NULL DEFAULT 'breakfast',
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.daily_nutrition_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  log_date date NOT NULL,
  target_calories integer NOT NULL,
  consumed_calories numeric NOT NULL DEFAULT 0,
  protein_g numeric NOT NULL DEFAULT 0,
  carbs_g numeric NOT NULL DEFAULT 0,
  fat_g numeric NOT NULL DEFAULT 0,
  fiber_g numeric NOT NULL DEFAULT 0,
  water_ml integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, log_date)
);

CREATE TABLE IF NOT EXISTS public.water_intake_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  water_ml integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, log_date)
);

-- 7. Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_nutrition_entries_user_date ON public.nutrition_entries(user_id, log_date);
CREATE INDEX IF NOT EXISTS idx_food_items_name ON public.food_items(name);
CREATE INDEX IF NOT EXISTS idx_supplements_brand ON public.supplements(brand);
CREATE INDEX IF NOT EXISTS idx_custom_exercises_user ON public.custom_exercises(user_id);

-- 8. Enable Row Level Security (RLS)
ALTER TABLE public.authentication_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_nutrition_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.water_intake_logs ENABLE ROW LEVEL SECURITY;

-- 9. RLS Policies (Users manage their own records)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'training_preferences' AND policyname = 'Users manage own training_preferences') THEN
    CREATE POLICY "Users manage own training_preferences" ON public.training_preferences FOR ALL USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'nutrition_entries' AND policyname = 'Users manage own nutrition_entries') THEN
    CREATE POLICY "Users manage own nutrition_entries" ON public.nutrition_entries FOR ALL USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'saved_meals' AND policyname = 'Users manage own saved_meals') THEN
    CREATE POLICY "Users manage own saved_meals" ON public.saved_meals FOR ALL USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'water_intake_logs' AND policyname = 'Users manage own water_intake_logs') THEN
    CREATE POLICY "Users manage own water_intake_logs" ON public.water_intake_logs FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;
